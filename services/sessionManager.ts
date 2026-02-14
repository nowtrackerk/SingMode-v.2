import { KaraokeSession, Participant, SongRequest, ParticipantStatus, RequestStatus, UserProfile, FavoriteSong, RequestType, ChatMessage, TickerMessage, RemoteAction, VerifiedSong } from '../types';
import { syncService } from './syncService';

const STORAGE_KEY = 'kstar_karaoke_session';
const PROFILE_KEY = 'kstar_active_user';
const ACCOUNTS_KEY = 'kstar_user_accounts';

let isRemoteClient = false;

const INITIAL_SESSION: KaraokeSession = {
  id: 'current-session',
  participants: [],
  requests: [],
  currentRound: null,
  history: [],
  messages: [],
  tickerMessages: [],
  verifiedSongbook: [],
  isPlayingVideo: false
};

const isExtension = typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.storage;

const storage = {
  get: async (key: string): Promise<any> => {
    if (isExtension) {
      const result = await (window as any).chrome.storage.local.get([key]);
      return result[key];
    }
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  set: async (key: string, value: any): Promise<void> => {
    if (isExtension) {
      await (window as any).chrome.storage.local.set({ [key]: value });
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
    // Always dispatch sync event for both extension and localStorage
    // This ensures DJ console sees updates from local participants
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('kstar_sync'));
      window.dispatchEvent(new Event('storage'));
    }
  }
};

syncService.onStateReceived = (state) => {
  if (isRemoteClient) {
    storage.set(STORAGE_KEY, state);
  }
};

syncService.onActionReceived = (action) => {
  handleRemoteAction(action);
};

async function handleRemoteAction(action: RemoteAction) {
  switch (action.type) {
    case 'ADD_REQUEST':
      await addRequest(action.payload);
      break;
    case 'JOIN_SESSION': {
      const { id, profile } = action.payload;
      if (profile) {
        const accounts = await getAllAccounts();
        const existingIdx = accounts.findIndex(a => a.id === id);
        if (existingIdx === -1) {
          accounts.push(profile);
          await storage.set(ACCOUNTS_KEY, accounts);
        } else {
          accounts[existingIdx] = { ...accounts[existingIdx], ...profile };
          await storage.set(ACCOUNTS_KEY, accounts);
        }
      }
      await joinSession(id);
      break;
    }
    case 'TOGGLE_STATUS':
      await updateParticipantStatus(action.payload.id, action.payload.status);
      break;
    case 'TOGGLE_MIC':
      await updateParticipantMic(action.payload.id, action.payload.enabled);
      break;
    case 'DELETE_REQUEST':
      await deleteRequest(action.payload);
      break;
    case 'UPDATE_REQUEST':
      await updateRequest(action.payload.id, action.payload.updates);
      break;
    case 'ADD_CHAT':
      await addChatMessage(action.senderId, action.payload.name, action.payload.text);
      break;
  }
}

export const initializeSync = async (role: 'DJ' | 'PARTICIPANT', room?: string) => {
  isRemoteClient = role === 'PARTICIPANT' && !!room;
  await syncService.initialize(role, room);
};

export const getSession = async (): Promise<KaraokeSession> => {
  const session = await storage.get(STORAGE_KEY) || { ...INITIAL_SESSION };
  if (!session.history) session.history = [];
  if (!session.messages) session.messages = [];
  if (!session.tickerMessages) session.tickerMessages = [];
  if (!session.verifiedSongbook) session.verifiedSongbook = [];
  if (session.isPlayingVideo === undefined) session.isPlayingVideo = false;
  return session;
};

export const saveSession = async (session: KaraokeSession) => {
  await storage.set(STORAGE_KEY, session);
  syncService.broadcastState(session);
};

const updateVerifiedSongbook = (session: KaraokeSession, song: { songName: string, artist: string, youtubeUrl?: string, type: RequestType }) => {
  if (song.youtubeUrl && song.youtubeUrl.trim() !== "") {
    const existing = session.verifiedSongbook.find(s =>
      s.songName.toLowerCase() === song.songName.toLowerCase() &&
      s.artist.toLowerCase() === song.artist.toLowerCase()
    );
    if (!existing) {
      const verified: VerifiedSong = {
        id: Math.random().toString(36).substr(2, 9),
        songName: song.songName,
        artist: song.artist,
        youtubeUrl: song.youtubeUrl,
        type: song.type,
        addedAt: Date.now()
      };
      session.verifiedSongbook.push(verified);
    } else if (existing.youtubeUrl !== song.youtubeUrl) {
      existing.youtubeUrl = song.youtubeUrl;
    }
  }
};

export const addVerifiedSong = async (song: Omit<VerifiedSong, 'id' | 'addedAt'>) => {
  const session = await getSession();
  const newSong: VerifiedSong = {
    ...song,
    id: Math.random().toString(36).substr(2, 9),
    addedAt: Date.now()
  };
  session.verifiedSongbook.push(newSong);
  await saveSession(session);
};

export const updateVerifiedSong = async (songId: string, updates: Partial<VerifiedSong>) => {
  const session = await getSession();
  const index = session.verifiedSongbook.findIndex(s => s.id === songId);
  if (index !== -1) {
    session.verifiedSongbook[index] = { ...session.verifiedSongbook[index], ...updates };
    await saveSession(session);
  }
};

export const deleteVerifiedSong = async (songId: string) => {
  const session = await getSession();
  session.verifiedSongbook = session.verifiedSongbook.filter(s => s.id !== songId);
  await saveSession(session);
};

export const resetSession = async () => {
  const current = await getSession();
  const emptySession = {
    ...INITIAL_SESSION,
    id: `session-${Date.now()}`,
    verifiedSongbook: current.verifiedSongbook // Persist the songbook
  };
  await saveSession(emptySession);
};

export const setStageVideoPlaying = async (active: boolean) => {
  const session = await getSession();
  session.isPlayingVideo = active;
  await saveSession(session);
};

export const getAllAccounts = async (): Promise<UserProfile[]> => {
  const accounts = await storage.get(ACCOUNTS_KEY);
  if (!accounts) {
    const seededAccounts: UserProfile[] = Array.from({ length: 5 }, (_, i) => ({
      id: `singer-${i + 1}`,
      name: `Singer${i + 1}`,
      favorites: [],
      personalHistory: [],
      createdAt: Date.now()
    }));
    await storage.set(ACCOUNTS_KEY, seededAccounts);
    return seededAccounts;
  }
  return accounts;
};

export const updateAccount = async (profileId: string, updates: Partial<UserProfile>) => {
  const accounts = await getAllAccounts();
  const idx = accounts.findIndex(a => a.id === profileId);
  if (idx > -1) {
    accounts[idx] = { ...accounts[idx], ...updates };
    await storage.set(ACCOUNTS_KEY, accounts);
    const active = await getUserProfile();
    if (active && active.id === profileId) {
      await storage.set(PROFILE_KEY, accounts[idx]);
    }
  }
};

export const removeUserFavorite = async (profileId: string, favoriteId: string) => {
  const accounts = await getAllAccounts();
  const idx = accounts.findIndex(a => a.id === profileId);
  if (idx > -1) {
    accounts[idx].favorites = accounts[idx].favorites.filter(f => f.id !== favoriteId);
    await storage.set(ACCOUNTS_KEY, accounts);
    const active = await getUserProfile();
    if (active && active.id === profileId) {
      await storage.set(PROFILE_KEY, accounts[idx]);
    }
  }
};

export const updateUserFavorite = async (profileId: string, favoriteId: string, updates: Partial<FavoriteSong>) => {
  const accounts = await getAllAccounts();
  const idx = accounts.findIndex(a => a.id === profileId);
  if (idx > -1) {
    const fIdx = accounts[idx].favorites.findIndex(f => f.id === favoriteId);
    if (fIdx > -1) {
      accounts[idx].favorites[fIdx] = { ...accounts[idx].favorites[fIdx], ...updates };
      await storage.set(ACCOUNTS_KEY, accounts);
      const active = await getUserProfile();
      if (active && active.id === profileId) {
        await storage.set(PROFILE_KEY, accounts[idx]);
      }
    }
  }
};

export const addUserFavorite = async (profileId: string, song: Omit<FavoriteSong, 'id'>) => {
  const accounts = await getAllAccounts();
  const idx = accounts.findIndex(a => a.id === profileId);
  if (idx > -1) {
    const newFav = { ...song, id: Math.random().toString(36).substr(2, 9) };
    accounts[idx].favorites.push(newFav);
    await storage.set(ACCOUNTS_KEY, accounts);
    const active = await getUserProfile();
    if (active && active.id === profileId) {
      await storage.set(PROFILE_KEY, accounts[idx]);
    }
  }
};

export const removeUserHistoryItem = async (profileId: string, historyId: string) => {
  const accounts = await getAllAccounts();
  const idx = accounts.findIndex(a => a.id === profileId);
  if (idx > -1) {
    accounts[idx].personalHistory = accounts[idx].personalHistory.filter(h => h.id !== historyId);
    await storage.set(ACCOUNTS_KEY, accounts);
    const active = await getUserProfile();
    if (active && active.id === profileId) {
      await storage.set(PROFILE_KEY, accounts[idx]);
    }
  }
};

export const updateUserHistoryItem = async (profileId: string, historyId: string, updates: Partial<SongRequest>) => {
  const accounts = await getAllAccounts();
  const idx = accounts.findIndex(a => a.id === profileId);
  if (idx > -1) {
    const hIdx = accounts[idx].personalHistory.findIndex(h => h.id === historyId);
    if (hIdx > -1) {
      accounts[idx].personalHistory[hIdx] = { ...accounts[idx].personalHistory[hIdx], ...updates };
      await storage.set(ACCOUNTS_KEY, accounts);
      const active = await getUserProfile();
      if (active && active.id === profileId) {
        await storage.set(PROFILE_KEY, accounts[idx]);
      }
    }
  }
};

export const deleteAccount = async (profileId: string) => {
  await removeParticipant(profileId);
  let accounts = await getAllAccounts();
  accounts = accounts.filter(a => a.id !== profileId);
  await storage.set(ACCOUNTS_KEY, accounts);
  const active = await getUserProfile();
  if (active && active.id === profileId) {
    if (isExtension) await (window as any).chrome.storage.local.remove([PROFILE_KEY]);
    else localStorage.removeItem(PROFILE_KEY);
  }
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
  return await storage.get(PROFILE_KEY);
};

export const saveUserProfile = async (profile: UserProfile) => {
  await storage.set(PROFILE_KEY, profile);
  const accounts = await getAllAccounts();
  const existingIdx = accounts.findIndex(a => a.id === profile.id);
  if (existingIdx > -1) {
    accounts[existingIdx] = profile;
  } else {
    accounts.push(profile);
  }
  await storage.set(ACCOUNTS_KEY, accounts);
};

export const registerUser = async (data: Partial<UserProfile>, autoLogin = false): Promise<{ success: boolean, error?: string, profile?: UserProfile }> => {
  const accounts = await getAllAccounts();
  const existing = accounts.find(a => a.name.toLowerCase() === data.name?.toLowerCase());
  if (existing && existing.password) {
    return { success: false, error: "Username is registered. Please login with password." };
  }
  const profile: UserProfile = {
    id: data.id || Math.random().toString(36).substr(2, 9),
    name: data.name || '',
    password: data.password || undefined,
    favorites: data.favorites || [],
    personalHistory: data.personalHistory || [],
    createdAt: Date.now()
  };
  accounts.push(profile);
  await storage.set(ACCOUNTS_KEY, accounts);
  if (autoLogin) {
    await storage.set(PROFILE_KEY, profile);
  }
  return { success: true, profile };
};

export const loginUser = async (name: string, password?: string): Promise<{ success: boolean, error?: string, profile?: UserProfile }> => {
  const accounts = await getAllAccounts();
  const found = accounts.find(a => a.name.toLowerCase() === name.toLowerCase());
  if (!found) {
    if (!password) {
      return await registerUser({ name }, true);
    }
    return { success: false, error: "User handle not found." };
  }
  if (found.password && found.password !== password) {
    return { success: false, error: "This handle is protected. Incorrect passkey." };
  }
  await storage.set(PROFILE_KEY, found);
  return { success: true, profile: found };
};

export const logoutUser = async () => {
  if (isExtension) await (window as any).chrome.storage.local.remove([PROFILE_KEY]);
  else localStorage.removeItem(PROFILE_KEY);
  window.dispatchEvent(new Event('kstar_sync'));
};

export const joinSession = async (profileId: string): Promise<Participant> => {
  if (isRemoteClient) {
    const existingProfile = await getUserProfile();
    syncService.sendAction({
      type: 'JOIN_SESSION',
      payload: {
        id: profileId,
        profile: existingProfile
      },
      senderId: profileId
    });
    return {
      id: profileId,
      name: existingProfile?.name || 'Joining...',
      status: ParticipantStatus.STANDBY,
      joinedAt: Date.now()
    };
  }
  const session = await getSession();
  const accounts = await getAllAccounts();
  const profile = accounts.find(a => a.id === profileId);
  if (!profile) {
    const active = await getUserProfile();
    if (active && active.id === profileId) {
      return await addParticipantToSession(session, active);
    }
    throw new Error("Profile not found");
  }
  return await addParticipantToSession(session, profile);
};

const addParticipantToSession = async (session: KaraokeSession, profile: UserProfile): Promise<Participant> => {
  const newParticipant: Participant = {
    id: profile.id,
    name: profile.name,
    status: ParticipantStatus.STANDBY,
    micEnabled: false,
    joinedAt: Date.now()
  };
  const existingIdx = session.participants.findIndex(p => p.id === profile.id);
  if (existingIdx > -1) {
    session.participants[existingIdx] = {
      ...session.participants[existingIdx],
      ...newParticipant,
      status: session.participants[existingIdx].status
    };
  } else {
    session.participants.push(newParticipant);
  }
  await saveSession(session);
  return newParticipant;
};

export const toggleFavorite = async (song: Omit<FavoriteSong, 'id'>) => {
  const profile = await getUserProfile();
  if (!profile) return;
  const existingIndex = profile.favorites.findIndex(f =>
    f.songName === song.songName && f.artist === song.artist
  );
  if (existingIndex > -1) {
    profile.favorites.splice(existingIndex, 1);
  } else {
    profile.favorites.push({ ...song, id: Math.random().toString(36).substr(2, 9) });
  }
  await saveUserProfile(profile);
};

export const addParticipantByDJ = async (name: string, status: ParticipantStatus = ParticipantStatus.STANDBY): Promise<Participant> => {
  const session = await getSession();
  const newParticipant: Participant = {
    id: 'dj-added-' + Math.random().toString(36).substr(2, 5),
    name,
    status,
    micEnabled: false,
    joinedAt: Date.now()
  };
  session.participants.push(newParticipant);
  await saveSession(session);
  return newParticipant;
};

export const removeParticipant = async (participantId: string) => {
  const session = await getSession();
  session.participants = session.participants.filter(p => p.id !== participantId);
  session.requests = session.requests.filter(r => r.participantId !== participantId);
  if (session.currentRound) {
    session.currentRound = session.currentRound.filter(r => r.participantId !== participantId);
    if (session.currentRound.length === 0) session.currentRound = null;
  }
  await saveSession(session);
};

export const updateParticipantStatus = async (participantId: string, status: ParticipantStatus) => {
  if (isRemoteClient) {
    syncService.sendAction({ type: 'TOGGLE_STATUS', payload: { id: participantId, status }, senderId: participantId });
    return;
  }
  const session = await getSession();
  const p = session.participants.find(p => p.id === participantId);
  if (p) {
    p.status = status;
    await saveSession(session);
  }
};

export const updateParticipantMic = async (participantId: string, enabled: boolean) => {
  if (isRemoteClient) {
    syncService.sendAction({ type: 'TOGGLE_MIC', payload: { id: participantId, enabled }, senderId: participantId });
    return;
  }
  const session = await getSession();
  const p = session.participants.find(p => p.id === participantId);
  if (p) {
    p.micEnabled = enabled;
    await saveSession(session);
  }
};

export const addRequest = async (request: Omit<SongRequest, 'id' | 'createdAt' | 'status' | 'isInRound'>): Promise<SongRequest | null> => {
  if (isRemoteClient) {
    syncService.sendAction({ type: 'ADD_REQUEST', payload: request, senderId: request.participantId });
    return null;
  }
  const session = await getSession();
  const newRequest: SongRequest = {
    ...request,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: Date.now(),
    status: RequestStatus.PENDING,
    isInRound: false
  };
  session.requests.push(newRequest);
  updateVerifiedSongbook(session, newRequest);
  const profile = await getUserProfile();
  if (profile && profile.id === request.participantId) {
    profile.personalHistory = [newRequest, ...profile.personalHistory].slice(0, 50);
    await saveUserProfile(profile);
  }
  await saveSession(session);
  return newRequest;
};

export const updateRequest = async (requestId: string, updates: Partial<SongRequest>) => {
  if (isRemoteClient) {
    syncService.sendAction({ type: 'UPDATE_REQUEST', payload: { id: requestId, updates }, senderId: 'client' });
    return;
  }
  const session = await getSession();
  const index = session.requests.findIndex(r => r.id === requestId);
  let participantId = '';
  if (index !== -1) {
    session.requests[index] = { ...session.requests[index], ...updates };
    participantId = session.requests[index].participantId;
    updateVerifiedSongbook(session, session.requests[index]);
  }
  if (session.currentRound) {
    const roundIndex = session.currentRound.findIndex(r => r.id === requestId);
    if (roundIndex !== -1) {
      session.currentRound[roundIndex] = { ...session.currentRound[roundIndex], ...updates };
      participantId = session.currentRound[roundIndex].participantId;
    }
  }
  const profile = await getUserProfile();
  if (profile && profile.id === participantId) {
    const hIdx = profile.personalHistory.findIndex(h => h.id === requestId);
    if (hIdx !== -1) {
      profile.personalHistory[hIdx] = { ...profile.personalHistory[hIdx], ...updates };
      await saveUserProfile(profile);
    }
  }
  await saveSession(session);
};

export const approveRequest = async (requestId: string) => {
  const session = await getSession();
  const req = session.requests.find(r => r.id === requestId);
  if (req) {
    req.status = RequestStatus.APPROVED;
    await saveSession(session);
  }
};

export const promoteToStage = async (requestId: string) => {
  const session = await getSession();
  const index = session.requests.findIndex(r => r.id === requestId);
  if (index === -1) return;
  const req = session.requests[index];
  req.status = RequestStatus.APPROVED;
  req.isInRound = true;
  if (!session.currentRound) {
    session.currentRound = [{ ...req }];
  } else {
    session.currentRound.push({ ...req });
  }
  await saveSession(session);
};

export const deleteRequest = async (requestId: string) => {
  if (isRemoteClient) {
    syncService.sendAction({ type: 'DELETE_REQUEST', payload: requestId, senderId: 'client' });
    return;
  }
  const session = await getSession();
  session.requests = session.requests.filter(r => r.id !== requestId);
  if (session.currentRound) {
    session.currentRound = session.currentRound.filter(r => r.id !== requestId);
    if (session.currentRound.length === 0) session.currentRound = null;
  }
  await saveSession(session);
};

export const reorderRequest = async (requestId: string, direction: 'up' | 'down') => {
  const session = await getSession();
  const index = session.requests.findIndex(r => r.id === requestId);
  if (index === -1) return;
  const newIndex = direction === 'up' ? index - 1 : index + 1;
  if (newIndex >= 0 && newIndex < session.requests.length) {
    const temp = session.requests[index];
    session.requests[index] = session.requests[newIndex];
    session.requests[newIndex] = temp;
    await saveSession(session);
  }
};

export const generateRound = async () => {
  const session = await getSession();
  const readyParticipants = session.participants
    .filter(p => p.status === ParticipantStatus.READY)
    .sort((a, b) => b.joinedAt - a.joinedAt);
  const roundSongs: SongRequest[] = [];
  readyParticipants.forEach(p => {
    const songRef = session.requests.find(r =>
      r.participantId === p.id &&
      r.status === RequestStatus.APPROVED &&
      r.type === RequestType.SINGING &&
      !r.isInRound
    );
    if (songRef) {
      songRef.isInRound = true;
      roundSongs.push({ ...songRef });
    }
  });
  if (roundSongs.length > 0) {
    session.currentRound = roundSongs;
    await saveSession(session);
  }
};

export const rotateStageSong = async (requestId: string) => {
  const session = await getSession();
  if (!session.currentRound) return;
  const index = session.currentRound.findIndex(r => r.id === requestId);
  if (index !== -1) {
    const [song] = session.currentRound.splice(index, 1);
    const historicalCopy = { ...song, playedAt: Date.now(), isInRound: false };
    session.history = [historicalCopy, ...session.history].slice(0, 100);
    session.currentRound.push(song);
    await saveSession(session);
  }
};

export const completeStageSong = async (requestId: string) => {
  const session = await getSession();
  if (!session.currentRound) return;
  const index = session.currentRound.findIndex(r => r.id === requestId);
  if (index !== -1) {
    const [song] = session.currentRound.splice(index, 1);
    const finishedSong = { ...song, playedAt: Date.now(), isInRound: false, status: RequestStatus.DONE };
    session.history = [finishedSong, ...session.history].slice(0, 100);
    session.requests = session.requests.filter(r => r.id !== requestId);

    // Update performer's personal history
    const accounts = await getAllAccounts();
    const accountIdx = accounts.findIndex(a => a.id === song.participantId);
    if (accountIdx !== -1) {
      accounts[accountIdx].personalHistory = [finishedSong, ...accounts[accountIdx].personalHistory].slice(0, 50);
      await storage.set(ACCOUNTS_KEY, accounts);
      const active = await getUserProfile();
      if (active && active.id === song.participantId) {
        await storage.set(PROFILE_KEY, accounts[accountIdx]);
      }
    }
    if (session.currentRound.length === 0) {
      session.currentRound = null;
      session.isPlayingVideo = false;
    }
    await saveSession(session);
  }
};

export const finishRound = async () => {
  const session = await getSession();
  if (!session.currentRound) return;
  const roundIds = session.currentRound.map(r => r.id);
  const finishedSongs = session.currentRound.map(r => ({
    ...r,
    playedAt: Date.now(),
    isInRound: false,
    status: RequestStatus.DONE
  }));
  session.history = [...finishedSongs, ...session.history].slice(0, 100);
  session.requests = session.requests.filter(r => !roundIds.includes(r.id));

  // Update personal histories for all performers in the round
  const accounts = await getAllAccounts();
  for (const song of finishedSongs) {
    const accountIdx = accounts.findIndex(a => a.id === song.participantId);
    if (accountIdx !== -1) {
      accounts[accountIdx].personalHistory = [song, ...accounts[accountIdx].personalHistory].slice(0, 50);
    }
  }
  await storage.set(ACCOUNTS_KEY, accounts);
  const active = await getUserProfile();
  if (active) {
    const updatedActive = accounts.find(a => a.id === active.id);
    if (updatedActive) await storage.set(PROFILE_KEY, updatedActive);
  }

  session.currentRound = null;
  session.isPlayingVideo = false;
  await saveSession(session);
};

export const reAddFromHistory = async (historyItem: SongRequest, asApproved: boolean) => {
  const session = await getSession();
  const newRequest: SongRequest = {
    ...historyItem,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: Date.now(),
    status: asApproved ? RequestStatus.APPROVED : RequestStatus.PENDING,
    isInRound: false,
    playedAt: undefined,
    aiIntro: undefined
  };
  session.requests.push(newRequest);
  await saveSession(session);
};

export const clearHistory = async () => {
  const session = await getSession();
  session.history = [];
  await saveSession(session);
};

export const addChatMessage = async (senderId: string, senderName: string, text: string) => {
  if (isRemoteClient) {
    syncService.sendAction({ type: 'ADD_CHAT', payload: { name: senderName, text }, senderId });
    return;
  }
  const session = await getSession();
  const newMessage: ChatMessage = {
    id: Math.random().toString(36).substr(2, 9),
    senderId,
    senderName,
    text,
    timestamp: Date.now()
  };
  if (!session.messages) session.messages = [];
  session.messages.push(newMessage);
  await saveSession(session);
};

export const addTickerMessage = async (msg: Omit<TickerMessage, 'id' | 'createdAt'>) => {
  const session = await getSession();
  const newMsg: TickerMessage = {
    ...msg,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: Date.now()
  };
  session.tickerMessages.push(newMsg);
  await saveSession(session);
};

export const updateTickerMessage = async (id: string, updates: Partial<TickerMessage>) => {
  const session = await getSession();
  const idx = session.tickerMessages.findIndex(m => m.id === id);
  if (idx > -1) {
    session.tickerMessages[idx] = { ...session.tickerMessages[idx], ...updates };
    await saveSession(session);
  }
};

export const deleteTickerMessage = async (id: string) => {
  const session = await getSession();
  session.tickerMessages = session.tickerMessages.filter(m => m.id !== id);
  await saveSession(session);
};

export const cleanupExpiredGuestAccounts = async () => {
  const accounts = await getAllAccounts();
  const now = Date.now();
  const cutoff = 24 * 60 * 60 * 1000; // 24 hours

  const toDelete = accounts.filter(a => !a.password && a.createdAt && (now - a.createdAt > cutoff));

  if (toDelete.length > 0) {
    for (const user of toDelete) {
      await deleteAccount(user.id);
    }
    console.log(`Cleaned up ${toDelete.length} expired guest accounts.`);
  }
};
