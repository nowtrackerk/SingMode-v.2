export enum ParticipantStatus {
  READY = 'ready to sing',
  STANDBY = 'standby'
}

export enum RequestType {
  SINGING = 'Singing',
  LISTENING = 'Listening'
}

export enum RequestStatus {
  PENDING = 'Pending Approval',
  APPROVED = 'Approved',
  DONE = 'Done'
}

export interface VerifiedSong {
  id: string;
  songName: string;
  artist: string;
  youtubeUrl: string;
  type: RequestType;
  addedAt: number;
}

export interface FavoriteSong {
  id: string;
  songName: string;
  artist: string;
  youtubeUrl?: string;
  type: RequestType;
}

export interface UserProfile {
  id: string;
  name: string;
  password?: string;
  favorites: FavoriteSong[];
  personalHistory: SongRequest[];
  createdAt: number;
}

export interface Participant {
  id: string;
  name: string;
  status: ParticipantStatus;
  joinedAt: number;
  micEnabled?: boolean;
  micRequested?: boolean;
}

export interface SongRequest {
  id: string;
  participantId: string;
  participantName: string;
  songName: string;
  artist: string;
  youtubeUrl?: string;
  type: RequestType;
  status: RequestStatus;
  createdAt: number;
  isInRound?: boolean;
  playedAt?: number;
  aiIntro?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface TickerMessage {
  id: string;
  text: string;
  color: string;
  fontSize: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  repeatDays: string[];
  expiresAt: number | null;
  createdAt: number;
  isActive: boolean;
}

export interface KaraokeSession {
  id: string;
  participants: Participant[];
  requests: SongRequest[];
  currentRound: SongRequest[] | null;
  history: SongRequest[];
  messages: ChatMessage[];
  tickerMessages: TickerMessage[];
  verifiedSongbook: VerifiedSong[];
  isPlayingVideo?: boolean;
}

export type ViewRole = 'DJ' | 'PARTICIPANT' | 'STAGE' | 'SELECT' | 'FEATURES';

// P2P Sync Types
export type RemoteActionType =
  | 'ADD_REQUEST'
  | 'JOIN_SESSION'
  | 'TOGGLE_STATUS'
  | 'TOGGLE_MIC'
  | 'DELETE_REQUEST'
  | 'UPDATE_REQUEST'
  | 'ADD_CHAT';

export interface RemoteAction {
  type: RemoteActionType;
  payload: any;
  senderId: string;
}
