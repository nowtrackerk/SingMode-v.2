import { Peer, DataConnection } from 'peerjs';
import { KaraokeSession, RemoteAction } from '../types';
import { db } from './firebaseConfig';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc } from "firebase/firestore";

class SyncService {
  private peer: Peer | null = null;
  private lockPeer: Peer | null = null; // Separate peer to "hold" the network lock
  private connections: Map<string, DataConnection> = new Map();
  private hostId: string | null = null;
  private isHost: boolean = false;
  private heartbeatInterval: number | null = null;
  private retryCount: number = 0;
  private maxRetries: number = 20;
  private actionQueue: RemoteAction[] = [];
  private initializationParams: { role: 'DJ' | 'PARTICIPANT', room?: string } | null = null;
  private unsubscribeActions: (() => void) | null = null;

  public onStateReceived: ((state: KaraokeSession) => void) | null = null;
  public onActionReceived: ((action: RemoteAction) => void) | null = null;
  public onConnectionStatus: ((status: 'connected' | 'disconnected' | 'connecting') => void) | null = null;
  public onPeerConnected: (() => void) | null = null;

  // New Event for Device Tracking
  public onDeviceConnected: ((peerId: string) => void) | null = null;
  public onDeviceDisconnected: ((peerId: string) => void) | null = null;

  constructor() {
    this.loadQueue();
  }

  private loadQueue() {
    try {
      const saved = localStorage.getItem('singmode_pending_actions');
      if (saved) {
        this.actionQueue = JSON.parse(saved);
        console.log(`[Sync] Loaded ${this.actionQueue.length} pending actions from storage.`);
      }
    } catch (e) {
      console.warn('[Sync] Failed to load pending actions:', e);
    }
  }

  private persistQueue() {
    try {
      localStorage.setItem('singmode_pending_actions', JSON.stringify(this.actionQueue));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('kstar_sync'));
      }
    } catch (e) {
      console.warn('[Sync] Failed to persist pending actions:', e);
    }
  }

  private async getPublicIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown-network';
    } catch (e) {
      console.warn('[Sync] Could not fetch public IP for lock, using fallback', e);
      return 'local-fallback';
    }
  }

  private sanitizeID(id: string): string {
    return id.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
  }

  async initialize(role: 'DJ' | 'PARTICIPANT', room?: string): Promise<string> {
    if (this.peer && !this.peer.destroyed && !this.peer.disconnected && this.initializationParams?.role === role && this.initializationParams?.room === room) {
      console.log(`[Sync] Already connected as ${role} to ${room || 'host'}. Skipping redundant init.`);
      return this.peer.id || 'initializing';
    }

    if (this.peer && this.peer.disconnected && !this.peer.destroyed && this.initializationParams?.role === role && this.initializationParams?.room === room) {
      console.log(`[Sync] Peer is disconnected, attempting to reconnect...`);
      this.peer.reconnect();
      return this.peer.id || 'reconnecting';
    }

    if (this.peer && !this.peer.destroyed) {
      console.log("[Sync] Parameters changed or peer state invalid, destroying old peer...");
      this.destroy();
    }

    this.initializationParams = { role, room };
    this.isHost = role === 'DJ';
    if (!this.isHost && room) {
      this.hostId = this.sanitizeID(room);
    }

    if (this.isHost && !room) {
      const ip = await this.getPublicIP();
      const lockId = this.sanitizeID(`singmode-lock-${btoa(ip).replace(/=/g, '').substr(0, 12)}`);

      const lockAcquired = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(true), 10000);
        const tempLock = new Peer(lockId, { debug: 1 });
        tempLock.on('open', () => {
          clearTimeout(timeout);
          this.lockPeer = tempLock;
          resolve(true);
        });
        tempLock.on('error', (err) => {
          clearTimeout(timeout);
          resolve(err.type !== 'unavailable-id');
          tempLock.destroy();
        });
      });

      if (!lockAcquired) {
        throw new Error('COLLISION: A SingMode DJ session is already active on this network.');
      }
    }

    return new Promise((resolve, reject) => {
      const id = this.isHost ? (room ? this.sanitizeID(room) : `singmode-${Math.random().toString(36).substr(2, 6)}`) : undefined;

      const timeout = setTimeout(() => {
        const fallbackId = this.isHost ? (room || 'fallback-host') : 'fallback-peer';
        if (this.isHost) this.hostId = fallbackId;
        resolve(fallbackId);
      }, 20000);

      this.peer = new Peer(id, {
        debug: 3,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' }
          ]
        }
      });

      this.peer.on('open', (peerId) => {
        clearTimeout(timeout);
        console.log(`[Sync] Peer opened with ID: ${peerId}`);
        if (this.isHost) {
          this.hostId = peerId;
          this.subscribeToPendingActions(peerId);
        }
        this.retryCount = 0;
        this.startHeartbeat();

        if (!this.isHost && room) {
          this.connectToHost(room);
        }

        if (this.onConnectionStatus && (!room || this.connections.size > 0)) {
          this.onConnectionStatus('connected');
        }

        resolve(peerId);
      });

      this.peer.on('disconnected', () => {
        console.warn('[Sync] Peer disconnected. Reconnecting...');
        if (this.onConnectionStatus) this.onConnectionStatus('connecting');
        this.peer?.reconnect();
      });

      this.peer.on('connection', (conn) => {
        this.handleConnection(conn);
      });

      this.peer.on('error', (err: any) => {
        console.error('[Sync] Peer error:', err.type);
        if (err.type === 'unavailable-id') {
          if (room) {
            reject(new Error(`Session "${room}" is in use.`));
          } else {
            this.destroy();
            this.initialize(role).then(resolve).catch(reject);
          }
        } else if (err.type === 'network' || err.type === 'server-error' || err.message?.includes('Lost connection')) {
          if (this.onConnectionStatus) this.onConnectionStatus('disconnected');
          this.handleNetworkError(role, room);
        }
      });
    });
  }

  private handleNetworkError(role: 'DJ' | 'PARTICIPANT', room?: string) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
      setTimeout(() => this.initialize(role, room), delay);
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = window.setInterval(() => {
      if (this.peer?.disconnected && !this.peer?.destroyed) this.peer?.reconnect();
      if (this.lockPeer?.disconnected && !this.lockPeer?.destroyed) this.lockPeer?.reconnect();
    }, 5000);
  }

  private connectToHost(hostId: string) {
    if (!this.peer || this.isHost || this.peer.destroyed) return;
    if (this.onConnectionStatus) this.onConnectionStatus('connecting');
    const conn = this.peer.connect(hostId, { reliable: true });
    this.handleConnection(conn);
  }

  private handleConnection(conn: DataConnection) {
    conn.on('open', () => {
      console.log(`[Sync] Connected to: ${conn.peer}`);
      this.connections.set(conn.peer, conn);
      if (!this.isHost && this.actionQueue.length > 0) {
        this.actionQueue.forEach(a => conn.send(a));
      }
      if (this.onConnectionStatus) this.onConnectionStatus('connected');
      if (this.isHost && this.onPeerConnected) this.onPeerConnected();
      if (this.isHost && this.onDeviceConnected) this.onDeviceConnected(conn.peer);
    });

    conn.on('data', (data: any) => {
      if (data && typeof data === 'object') {
        if ('type' in data && this.onActionReceived) {
          this.onActionReceived({ ...data, senderId: conn.peer });
        } else if ('participants' in data && this.onStateReceived) {
          this.applyIncomingState(data as KaraokeSession);
        }
      }
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      if (this.connections.size === 0 && this.onConnectionStatus && !this.isHost) {
        this.onConnectionStatus('disconnected');
      }
      if (this.isHost && this.onDeviceDisconnected) this.onDeviceDisconnected(conn.peer);
    });

    conn.on('error', (err) => {
      console.error('[Sync] Connection error:', err);
      this.connections.delete(conn.peer);
    });
  }

  broadcastState(state: KaraokeSession) {
    if (!this.isHost) return;
    this.connections.forEach(conn => { if (conn.open) conn.send(state); });
  }

  broadcastAction(action: RemoteAction) {
    if (!this.isHost) return;
    this.connections.forEach(conn => { if (conn.open) conn.send(action); });
  }

  async sendAction(action: RemoteAction) {
    if (this.isHost) return;

    const alreadyQueued = this.actionQueue.some(q => q.type === action.type && JSON.stringify(q.payload) === JSON.stringify(action.payload));

    if (!alreadyQueued) {
      this.actionQueue.push(action);
      this.persistQueue();

      if (this.hostId) {
        addDoc(collection(db, "sessions", this.hostId, "pending_actions"), {
          ...action,
          bufferedAt: Date.now()
        }).catch(e => console.warn('[Sync] Firestore buffer delayed:', e.message));
      }
    }

    let sentDirectly = false;
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(action);
        sentDirectly = true;
      }
    });
    console.log(sentDirectly ? '[Sync] Action sent via PeerJS' : '[Sync] Action relied on Firestore buffer');
  }

  getRoomId(): string | null { return this.peer?.id || null; }
  getMyPeerId(): string | null { return this.peer?.id || null; }
  getHostId(): string | null { return this.hostId; }
  getPendingActions(): RemoteAction[] { return this.actionQueue; }

  private subscribeToPendingActions(hostId: string) {
    if (this.unsubscribeActions) this.unsubscribeActions();
    console.log(`[Sync] Monitoring Firestore: sessions/${hostId}/pending_actions`);
    const q = query(collection(db, "sessions", hostId, "pending_actions"));
    this.unsubscribeActions = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const action = change.doc.data() as RemoteAction;
          if (this.onActionReceived) this.onActionReceived(action);
          deleteDoc(doc(db, "sessions", hostId, "pending_actions", change.doc.id))
            .catch(e => console.warn("[Sync] Cleanup failed:", e.message));
        }
      });
    });
  }

  applyIncomingState(state: KaraokeSession) {
    if (!this.isHost && this.actionQueue.length > 0) {
      const initialLen = this.actionQueue.length;
      this.actionQueue = this.actionQueue.filter(q => {
        if (q.type === 'ADD_REQUEST') {
          const p = q.payload as any;
          return !state.requests.some(r => r.participantId === p.participantId && r.songName.toLowerCase().trim() === p.songName.toLowerCase().trim() && r.artist.toLowerCase().trim() === p.artist.toLowerCase().trim());
        }
        return true;
      });
      if (this.actionQueue.length !== initialLen) {
        this.persistQueue();
      }
    }
    if (this.onStateReceived) this.onStateReceived(state);
  }

  destroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.connections.forEach(c => c.close());
    this.connections.clear();
    if (this.unsubscribeActions) { this.unsubscribeActions(); this.unsubscribeActions = null; }
    if (this.peer) { this.peer.destroy(); this.peer = null; }
    if (this.lockPeer) { this.lockPeer.destroy(); this.lockPeer = null; }
  }
}

export const syncService = new SyncService();