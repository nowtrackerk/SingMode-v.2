import { Peer, DataConnection } from 'peerjs';
import { KaraokeSession, RemoteAction } from '../types';

class SyncService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private hostId: string | null = null;
  private isHost: boolean = false;
  private heartbeatInterval: number | null = null;
  private retryCount: number = 0;
  private maxRetries: number = 10;

  public onStateReceived: ((state: KaraokeSession) => void) | null = null;
  public onActionReceived: ((action: RemoteAction) => void) | null = null;
  public onConnectionStatus: ((status: 'connected' | 'disconnected' | 'connecting') => void) | null = null;

  async initialize(role: 'DJ' | 'PARTICIPANT', room?: string): Promise<string> {
    this.isHost = role === 'DJ';

    if (this.peer) {
      this.destroy();
    }

    return new Promise((resolve, reject) => {
      const id = this.isHost ? (room || `singmode-${Math.random().toString(36).substr(2, 6)}`) : undefined;

      this.peer = new Peer(id, {
        debug: 1,
      });

      this.peer.on('open', (peerId) => {
        console.log(`[Sync] Peer opened with ID: ${peerId}`);
        this.hostId = peerId;
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
        console.warn('[Sync] Peer disconnected from signaling server. Attempting reconnect...');
        if (this.onConnectionStatus) this.onConnectionStatus('connecting');
        this.peer?.reconnect();
      });

      this.peer.on('connection', (conn) => {
        this.handleConnection(conn);
      });

      this.peer.on('error', (err: any) => {
        console.error('[Sync] Peer error:', err.type, err);

        if (err.type === 'unavailable-id') {
          console.warn('[Sync] ID unavailable, retrying as random...');
          this.destroy();
          this.initialize(role).then(resolve).catch(reject);
        } else if (err.type === 'network' || err.type === 'server-error' || err.message?.includes('Lost connection')) {
          if (this.onConnectionStatus) this.onConnectionStatus('disconnected');
          this.handleNetworkError(role, room);
        } else if (err.type === 'peer-unavailable') {
          if (this.onConnectionStatus) this.onConnectionStatus('disconnected');
        }
      });
    });
  }

  private handleNetworkError(role: 'DJ' | 'PARTICIPANT', room?: string) {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
      console.log(`[Sync] Network failure. Retrying in ${delay}ms... (Attempt ${this.retryCount})`);
      setTimeout(() => {
        this.initialize(role, room);
      }, delay);
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

    this.heartbeatInterval = window.setInterval(() => {
      if (this.peer && this.peer.disconnected && !this.peer.destroyed) {
        this.peer.reconnect();
      }
    }, 5000);
  }

  private connectToHost(hostId: string) {
    if (!this.peer || this.isHost || this.peer.destroyed) return;

    if (this.onConnectionStatus) this.onConnectionStatus('connecting');

    const conn = this.peer.connect(hostId, {
      reliable: true
    });

    this.handleConnection(conn);
  }

  private handleConnection(conn: DataConnection) {
    conn.on('open', () => {
      console.log(`[Sync] Data connection established with: ${conn.peer}`);
      this.connections.set(conn.peer, conn);
      if (this.onConnectionStatus) this.onConnectionStatus('connected');
    });

    conn.on('data', (data: unknown) => {
      if (this.isHost && data && typeof data === 'object' && 'type' in data) {
        if (this.onActionReceived) this.onActionReceived(data as RemoteAction);
      }
      else if (!this.isHost && data && typeof data === 'object' && 'participants' in data) {
        if (this.onStateReceived) this.onStateReceived(data as KaraokeSession);
      }
    });

    conn.on('close', () => {
      console.log(`[Sync] Connection closed: ${conn.peer}`);
      this.connections.delete(conn.peer);
      if (this.connections.size === 0 && this.onConnectionStatus) {
        if (!this.isHost) this.onConnectionStatus('disconnected');
      }
    });

    conn.on('error', (err) => {
      console.error('[Sync] Connection error:', err);
      this.connections.delete(conn.peer);
    });
  }

  broadcastState(state: KaraokeSession) {
    if (!this.isHost) return;
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(state);
      }
    });
  }

  sendAction(action: RemoteAction) {
    if (this.isHost || !this.peer) return;
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send(action);
      }
    });
  }

  getRoomId(): string | null {
    return this.hostId;
  }

  destroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.connections.forEach(c => c.close());
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

export const syncService = new SyncService();