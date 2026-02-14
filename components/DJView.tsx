import React, { useState, useEffect, useCallback, useRef } from 'react';
import { KaraokeSession, RequestStatus, ParticipantStatus, SongRequest, Participant, RequestType, UserProfile, FavoriteSong, VerifiedSong } from '../types';
import {
  getSession, approveRequest, promoteToStage, deleteRequest, reorderRequest,
  generateRound, finishRound, addRequest, updateRequest,
  updateParticipantStatus, updateParticipantMic, removeParticipant,
  reAddFromHistory, clearHistory, getAllAccounts, updateAccount,
  deleteAccount, registerUser, joinSession, removeUserFavorite, updateUserFavorite,
  addUserFavorite, getUserProfile, setStageVideoPlaying, rotateStageSong, completeStageSong,
  resetSession, removeUserHistoryItem, updateUserHistoryItem,
  addVerifiedSong, updateVerifiedSong, deleteVerifiedSong
} from '../services/sessionManager';
import SongRequestForm from './SongRequestForm';
import { syncService } from '../services/syncService';
import { getNetworkUrl, setNetworkIp, getStoredNetworkIp } from '../services/networkUtils';

interface DJViewProps {
  // No props needed after removing stage/pro features
}

type DJTab = 'COMMAND' | 'ROTATION' | 'PERFORMERS' | 'LIBRARY';

const QUICK_SET_POOL = [
  { songName: "Bohemian Rhapsody", artist: "Queen" },
  { songName: "Toxic", artist: "Britney Spears" },
  { songName: "Someone Like You", artist: "Adele" },
  { songName: "Sweet Caroline", artist: "Neil Diamond" },
  { songName: "Wonderwall", artist: "Oasis" },
  { songName: "Dancing Queen", artist: "ABBA" },
  { songName: "I Will Survive", artist: "Gloria Gaynor" },
  { songName: "Don't Stop Believin'", artist: "Journey" },
  { songName: "Livin' on a Prayer", artist: "Bon Jovi" },
  { songName: "My Way", artist: "Frank Sinatra" }
];

const VideoLink: React.FC<{ url?: string }> = ({ url }) => {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Open Video Link"
      className="p-1.5 rounded-lg text-slate-500 hover:text-teal-400 hover:bg-teal-400/10 transition-all"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
    </a>
  );
};

const CopyUrlButton: React.FC<{ url?: string }> = ({ url }) => {
  const [copied, setCopied] = useState(false);
  if (!url) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy Video URL"
      className={`p-1.5 rounded-lg transition-all ${copied ? 'text-teal-400 bg-teal-400/10' : 'text-slate-500 hover:text-teal-400 hover:bg-teal-400/10'}`}
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1-2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      )}
    </button>
  );
};

const CopyButton: React.FC<{ request: SongRequest | VerifiedSong }> = ({ request }) => {
  const [copied, setCopied] = useState(false);

  const songName = (request as SongRequest).songName || (request as VerifiedSong).songName;
  const youtubeUrl = (request as any).youtubeUrl;

  if (youtubeUrl && !copied) return null;

  const handleCopy = () => {
    const type = (request as SongRequest).type || (request as VerifiedSong).type || RequestType.SINGING;
    const suffix = type === RequestType.LISTENING ? ' Lyrics' : ' Karaoke';
    const text = `${songName} - ${request.artist}${suffix}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy search string"
      className={`p-1.5 rounded-lg transition-all ${copied ? 'text-teal-400 bg-teal-400/10' : 'text-slate-500 hover:text-teal-400 hover:bg-teal-400/10'}`}
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
      )}
    </button>
  );
};

const DJView: React.FC<DJViewProps> = () => {
  const [session, setSession] = useState<KaraokeSession | null>(null);
  const [accounts, setAccounts] = useState<UserProfile[]>([]);
  const [isAddingRequest, setIsAddingRequest] = useState(false);


  const [isAddingVerifiedSong, setIsAddingVerifiedSong] = useState(false);
  const [verifiedSongToEdit, setVerifiedSongToEdit] = useState<VerifiedSong | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showRoundConfirm, setShowRoundConfirm] = useState(false);
  const [showUserManager, setShowUserManager] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [previewSongs, setPreviewSongs] = useState<SongRequest[]>([]);
  const [requestToEdit, setRequestToEdit] = useState<SongRequest | null>(null);
  const [profileItemToEdit, setProfileItemToEdit] = useState<{ type: 'favorite' | 'history', itemId: string } | null>(null);
  const [prefilledSinger, setPrefilledSinger] = useState<Participant | null>(null);

  const [intro, setIntro] = useState<{ [key: string]: string }>({});
  const [showNetworkConfig, setShowNetworkConfig] = useState(false);
  const [networkIpInput, setNetworkIpInput] = useState(getStoredNetworkIp() || '');
  const [directorySearch, setDirectorySearch] = useState('');
  const [micActive, setMicActive] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [lastDoneId, setLastDoneId] = useState<string | null>(null);
  const [doneRequests, setDoneRequests] = useState<Set<string>>(new Set());

  // Smart Library State - AI features removed
  const [pickingSongForUser, setPickingSongForUser] = useState<Participant | UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<DJTab>('COMMAND');
  const [pickerSearch, setPickerSearch] = useState('');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');

  // Audio Refs for Monitoring
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // User Manager States
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [managedProfile, setManagedProfile] = useState<UserProfile | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', password: '' });

  const refresh = useCallback(async () => {
    const currentSession = await getSession();
    setSession(currentSession);
    const allAccounts = await getAllAccounts();
    setAccounts(allAccounts);
  }, []);

  useEffect(() => {
    if (managedProfile && accounts.length > 0) {
      const updated = accounts.find(a => a.id === managedProfile.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(managedProfile)) {
        setManagedProfile(updated);
      }
    }
  }, [accounts, managedProfile]);

  useEffect(() => {
    refresh();
    window.addEventListener('kstar_sync', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('kstar_sync', refresh);
      window.removeEventListener('storage', refresh);
      stopMicMonitoring();
    };
  }, [refresh]);

  // Reset doneRequests when a new round starts
  useEffect(() => {
    if (!session?.currentRound || session.currentRound.length === 0) {
      setDoneRequests(new Set());
    }
  }, [session?.currentRound]);

  const stopMicMonitoring = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicActive(false);
    setMicVolume(0);
  };

  const startMicMonitoring = async (stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 256;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    micStreamRef.current = stream;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVolume = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const normalized = Math.min(1, (average / 128) * 1.5);
      setMicVolume(normalized);
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    updateVolume();
  };


  const handleGenerateIntro = async (singer: string, song: string, id: string) => {
    const result = `Taking the stage now, it's ${singer} with "${song}"!`;
    await updateRequest(id, { aiIntro: result });
    setIntro(prev => ({ ...prev, [id]: result }));
    await refresh();
  };

  const handleManualRequestSubmit = async (data: any) => {
    if (profileItemToEdit && managedProfile) {
      if (profileItemToEdit.type === 'favorite') {
        await updateUserFavorite(managedProfile.id, profileItemToEdit.itemId, {
          songName: data.songName,
          artist: data.artist,
          youtubeUrl: data.youtubeUrl,
          type: data.type
        });
      } else {
        await updateUserHistoryItem(managedProfile.id, profileItemToEdit.itemId, {
          songName: data.songName,
          artist: data.artist,
          youtubeUrl: data.youtubeUrl,
          type: data.type
        });
      }
      setProfileItemToEdit(null);
    } else if (requestToEdit) {
      await updateRequest(requestToEdit.id, {
        participantName: data.singerName || requestToEdit.participantName,
        songName: data.songName,
        artist: data.artist,
        youtubeUrl: data.youtubeUrl,
        type: data.type
      });
      setRequestToEdit(null);
    } else if (verifiedSongToEdit) {
      await updateVerifiedSong(verifiedSongToEdit.id, {
        songName: data.songName,
        artist: data.artist,
        youtubeUrl: data.youtubeUrl,
        type: data.type
      });
      setVerifiedSongToEdit(null);
    } else if (isAddingVerifiedSong) {
      await addVerifiedSong({
        songName: data.songName,
        artist: data.artist,
        youtubeUrl: data.youtubeUrl,
        type: data.type
      });
      setIsAddingVerifiedSong(false);
    } else {
      await addRequest({
        participantId: prefilledSinger?.id || 'DJ-MANUAL',
        participantName: data.singerName || prefilledSinger?.name || 'Guest',
        songName: data.songName,
        artist: data.artist,
        youtubeUrl: data.youtubeUrl,
        type: data.type
      });
      setIsAddingRequest(false);
      setPrefilledSinger(null);
    }
    await refresh();
  };

  const handleQuickSet = async (user: UserProfile) => {
    await joinSession(user.id);
    const pool = [...QUICK_SET_POOL];
    for (let i = 0; i < 3; i++) {
      if (pool.length === 0) break;
      const randIdx = Math.floor(Math.random() * pool.length);
      const song = pool.splice(randIdx, 1)[0];
      const newRequest = await addRequest({
        participantId: user.id,
        participantName: user.name,
        songName: song.songName,
        artist: song.artist,
        type: RequestType.SINGING
      });
      if (newRequest) {
        await approveRequest(newRequest.id);
      }
    }
    await updateParticipantStatus(user.id, ParticipantStatus.READY);
    await refresh();
  };

  // AI library generation removed

  const handleSongSearch = (songName: string, artist: string, type: RequestType) => {
    const query = type === RequestType.SINGING
      ? `${songName} ${artist} karaoke`
      : `${songName} ${artist} Lyrics Letra`;
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
  };

  const handlePromoteToStage = async (requestId: string) => {
    await promoteToStage(requestId);
    await refresh();
    // Auto-generate simple intro when promoting to stage
    const currentSession = await getSession();
    const song = currentSession.currentRound?.find(r => r.id === requestId);
    if (song) {
      handleGenerateIntro(song.participantName, song.songName, song.id);
    }
  };

  const handlePlayOnStage = (song: SongRequest) => {
    if (song.youtubeUrl) {
      window.open(song.youtubeUrl, '_blank');
    } else {
      handleSongSearch(song.songName, song.artist, song.type);
    }
  };



  const handleProfileFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: profileForm.name,
      password: profileForm.password || undefined,
    };

    if (editingProfile) {
      await updateAccount(editingProfile.id, data);
    } else {
      await registerUser(data);
    }

    setEditingProfile(null);
    setIsCreatingProfile(false);
    setProfileForm({ name: '', password: '' });
    await refresh();
  };

  const startEditProfile = (user: UserProfile) => {
    setEditingProfile(user);
    setIsCreatingProfile(true);
    setProfileForm({
      name: user.name,
      password: user.password || '',
    });
  };

  const closeModals = () => {
    setIsAddingRequest(false);

    setRequestToEdit(null);
    setProfileItemToEdit(null);
    setPrefilledSinger(null);
    setShowQrModal(false);
    setShowRoundConfirm(false);
    setShowUserManager(false);
    setShowLibrary(false);
    setShowResetConfirm(false);
    setIsCreatingProfile(false);
    setEditingProfile(null);
    setManagedProfile(null);
    setShowNetworkConfig(false);
  };

  const handleSaveNetworkIp = () => {
    setNetworkIp(networkIpInput);
    setShowNetworkConfig(false);
    refresh();
  };

  const handleConfirmRound = async () => {
    await generateRound();
    setShowRoundConfirm(false);
    await refresh();

    const updatedSession = await getSession();
    if (updatedSession.currentRound) {
      updatedSession.currentRound.forEach(song => {
        if (!song.aiIntro) {
          handleGenerateIntro(song.participantName, song.songName, song.id);
        }
      });
    }
  };

  const handleConfirmReset = async () => {
    await resetSession();
    setShowResetConfirm(false);
    await refresh();
  };

  const viewPerformerProfile = (userId: string) => {
    const user = accounts.find(a => a.id === userId);
    if (user) {
      setManagedProfile(user);
      setShowUserManager(true);
    }
  };

  const handleRotateSong = async (requestId: string) => {
    setDoneRequests(prev => new Set(prev).add(requestId));
    setLastDoneId(requestId);
    await completeStageSong(requestId);
    await refresh();
    setTimeout(() => {
      setLastDoneId(null);
    }, 4000);
  };

  if (!session) return (
    <div className="flex items-center justify-center p-20 min-h-screen">
      <div className="w-12 h-12 border-4 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const pendingRequests = session.requests.filter(r => r.status === RequestStatus.PENDING && !r.isInRound);
  const approvedSinging = session.requests.filter(r => r.status === RequestStatus.APPROVED && r.type === RequestType.SINGING && !r.isInRound);
  const approvedListening = session.requests.filter(r => r.status === RequestStatus.APPROVED && r.type === RequestType.LISTENING && !r.isInRound);
  const liveMicCount = session.participants.filter(p => p.status === ParticipantStatus.READY).length;
  const verifiedSongs = session.verifiedSongbook || [];

  const roomId = syncService.getRoomId();
  const roomJoinUrl = getNetworkUrl() + (roomId ? `?room=${roomId}` : '');

  const UserAvatar = ({ name, isActive }: { name: string, isActive?: boolean }) => {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const colors = [
      'from-teal-400 to-indigo-500',
      'from-rose-400 to-orange-500',
      'from-amber-400 to-rose-500',
      'from-indigo-400 to-purple-500',
      'from-emerald-400 to-teal-500'
    ];
    const colorIndex = name.length % colors.length;

    return (
      <div className="relative">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors[colorIndex]} p-[2px] shadow-lg shadow-black/20`}>
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <span className="text-sm font-black text-white tracking-widest">{initials}</span>
          </div>
        </div>
        {isActive && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-teal-400 rounded-full border-4 border-slate-950 animate-pulse" />
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8 space-y-8 relative">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-4xl font-black font-outfit text-white flex items-center gap-2 uppercase">
              SINGMODE <span className="text-teal-400">COMMAND</span>
            </h1>
            <p className="text-slate-500 uppercase tracking-widest text-[10px] font-bold opacity-60">Control Center / {session.participants.length} Performers</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => setShowQrModal(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 border border-slate-700">
            <span>📱</span> Entry QR
          </button>


          <button onClick={() => setShowUserManager(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-400 rounded-xl font-bold transition-all flex items-center gap-2 border border-slate-700">
            <span>👥</span> User Directory
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl font-bold transition-all flex items-center gap-2 border border-rose-500/20"
            title="Wipe Session & Kick Everyone"
          >
            <span>🧹</span> New Session
          </button>



          <div className="flex gap-2">

            <button onClick={() => setIsAddingRequest(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all">
              + Add
            </button>
          </div>

          <button
            onClick={() => {
              setShowRoundConfirm(true);
              refresh(); // Refresh to ensure latest participants
            }}
            className="px-6 py-2 bg-teal-400 hover:bg-teal-300 text-slate-950 rounded-xl font-black transition-all shadow-xl shadow-teal-900/30 uppercase tracking-widest text-xs"
          >
            Launch Round
          </button>
        </div>
      </header>

      <div className="flex bg-slate-950/60 p-1.5 rounded-2xl border border-white/5 shadow-inner mb-10 overflow-x-auto no-scrollbar">
        {(['COMMAND', 'ROTATION', 'PERFORMERS', 'LIBRARY'] as DJTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); }}
            className={`flex-1 py-3 px-6 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all whitespace-nowrap ${activeTab === tab
              ? 'bg-teal-400 text-slate-950 shadow-xl shadow-teal-900/20'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
          >
            {tab === 'COMMAND' ? '🎚️ Console' : tab === 'ROTATION' ? '🔄 Rotation' : tab === 'PERFORMERS' ? '👥 Performers' : '✨ Library'}
          </button>
        ))}
      </div>

      <main className="min-h-[600px] animate-in fade-in duration-500">
        {activeTab === 'COMMAND' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-2">
            <div className="lg:col-span-8 space-y-8">
              {session.currentRound && (
                <section className="bg-teal-400/5 border border-teal-400/20 rounded-3xl p-6 shadow-3xl relative overflow-hidden animate-in fade-in zoom-in duration-500">
                  <div className="absolute top-0 left-0 w-full h-1 bg-teal-400"></div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-black text-white uppercase flex items-center gap-3">
                      <div className="w-2 h-2 bg-teal-400 rounded-full animate-ping"></div>
                      On Stage Now
                    </h2>
                    <button onClick={async () => { await finishRound(); await refresh(); }} className="px-4 py-1.5 bg-white text-slate-950 rounded-lg font-black text-[10px] uppercase hover:bg-teal-400 transition-all shadow-lg">End Performance</button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {session.currentRound.map((song, i) => {
                      const participant = session.participants.find(p => p.id === song.participantId);
                      const isReady = participant?.status === ParticipantStatus.READY;
                      const isActive = i === 0;
                      const isDoneHighlight = song.id === lastDoneId;
                      const hasBeenDone = doneRequests.has(song.id);

                      return (
                        <div
                          key={song.id}
                          className={`p-5 rounded-2xl relative group transition-all duration-700 border ${isActive
                            ? 'bg-slate-950 border-teal-400 shadow-[0_0_25px_rgba(45,212,191,0.15)] ring-1 ring-teal-400/30'
                            : isDoneHighlight
                              ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-success-pulse'
                              : 'bg-slate-900 border-slate-800 opacity-60 hover:opacity-100 transition-opacity'
                            }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-teal-400' : isDoneHighlight ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {isActive ? 'Singing Now' : isDoneHighlight ? 'Just Finished' : 'In Rotation'}
                              </div>
                            </div>
                            <div className="flex gap-2 items-center">
                              <VideoLink url={song.youtubeUrl} />
                              <CopyUrlButton url={song.youtubeUrl} />
                              <CopyButton request={song} />

                              <button onClick={() => setRequestToEdit(song)} className="text-slate-600 hover:text-white p-1">✏️</button>
                              <button onClick={async () => { await deleteRequest(song.id); await refresh(); }} className="text-rose-500 hover:text-rose-400 transition-colors p-2 px-3 font-bold">✕</button>
                            </div>
                          </div>
                          <button
                            onClick={() => handlePlayOnStage(song)}
                            className="block w-full text-left group/play"
                          >
                            <div className={`text-xl font-black truncate uppercase tracking-tight transition-colors ${isActive ? 'text-white group-hover/play:text-teal-400' : 'text-slate-400 group-hover/play:text-white'}`}>
                              {song.songName}
                            </div>
                          </button>
                          <div className="text-slate-500 text-[10px] uppercase font-bold opacity-60 mb-4">{song.artist}</div>
                          <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                            <button
                              onClick={() => viewPerformerProfile(song.participantId)}
                              className={`text-xs font-black uppercase truncate transition-colors hover:text-teal-400 ${isReady ? 'text-white' : 'text-slate-500'}`}
                            >
                              {song.participantName}
                            </button>
                            <div className="flex gap-2">
                              {!hasBeenDone && !isDoneHighlight && (
                                <button
                                  onClick={() => handleRotateSong(song.id)}
                                  title="Done & Move to Last"
                                  className={`px-3 py-1.5 border text-[9px] font-black rounded-lg uppercase transition-all flex items-center gap-1.5 ${isActive
                                    ? 'bg-teal-400/20 text-teal-400 border-teal-400/30 hover:bg-teal-400 hover:text-slate-950'
                                    : 'bg-slate-800 text-slate-500 border-slate-700'
                                    }`}
                                >
                                  Done
                                </button>
                              )}

                              <button onClick={() => handleGenerateIntro(song.participantName, song.songName, song.id)} className="text-[9px] font-black bg-white/5 text-slate-400 px-3 py-1.5 rounded-lg border border-white/10 uppercase">
                                {song.aiIntro ? 'Regen' : 'Intro'}
                              </button>
                            </div>
                          </div>
                          {song.aiIntro && (
                            <p className="mt-3 text-[10px] italic text-slate-400 bg-black/40 p-3 rounded-xl border border-slate-800 leading-relaxed">
                              "{song.aiIntro}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-black text-white uppercase tracking-widest">Incoming Requests</h2>
                  <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] text-slate-500 font-black">{pendingRequests.length} Pending</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl flex flex-col justify-between hover:border-teal-500/20 transition-all group">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[8px] font-black text-teal-400 uppercase tracking-widest">{req.type}</div>
                          <div className="flex gap-2">
                            <VideoLink url={req.youtubeUrl} />
                            <CopyButton request={req} />
                            <button onClick={() => setRequestToEdit(req)} className="text-slate-600 hover:text-white text-xs">✏️</button>
                          </div>
                        </div>
                        <div className="text-lg font-black text-white uppercase truncate tracking-tight">{req.songName}</div>
                        <div className="text-slate-500 text-[10px] uppercase font-bold opacity-60">{req.artist}</div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                        <button onClick={() => viewPerformerProfile(req.participantId)} className="text-xs font-black text-white uppercase truncate hover:text-teal-400 transition-colors">{req.participantName}</button>
                        <div className="flex gap-2">
                          <button onClick={async () => { await approveRequest(req.id); await refresh(); }} className="px-3 py-1.5 bg-slate-800 text-teal-400 border border-slate-700 text-[9px] font-black rounded-lg uppercase transition-all">Approve</button>
                          <button onClick={() => handlePromoteToStage(req.id)} className="px-4 py-1.5 bg-teal-400 text-slate-950 text-[9px] font-black rounded-lg uppercase transition-all shadow-md">Stage Now</button>
                          <button onClick={async () => { await deleteRequest(req.id); await refresh(); }} className="p-2 px-3 text-rose-500 hover:text-rose-400 transition-colors font-bold">✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {pendingRequests.length === 0 && <div className="col-span-full py-16 text-center bg-slate-900/20 border-2 border-dashed border-slate-800 rounded-3xl opacity-20"><p className="text-xs font-bold uppercase italic">No pending validation</p></div>}
                </div>
              </section>

              <div className="grid md:grid-cols-2 gap-8">
                <section className="bg-slate-900/40 rounded-3xl p-6 border border-slate-800">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Ready to Sing</h3>
                  <div className="space-y-2">
                    {approvedSinging.map((req) => (
                      <div key={req.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between group">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex flex-col">
                            <button onClick={async () => { await reorderRequest(req.id, 'up'); await refresh(); }} className="text-slate-700 hover:text-teal-400 transition-colors"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                            <button onClick={async () => { await reorderRequest(req.id, 'down'); await refresh(); }} className="text-slate-700 hover:text-teal-400 transition-colors"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                          </div>
                          <div
                            className="min-w-0 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
                            onClick={() => handleSongSearch(req.songName, req.artist, req.type)}
                          >
                            <div className="text-xs font-bold text-white truncate uppercase">{req.songName}</div>
                            <div className="text-[9px] text-slate-500 uppercase truncate"><button onClick={(e) => { e.stopPropagation(); viewPerformerProfile(req.participantId); }} className="text-teal-400 hover:underline">{req.participantName}</button> • {req.artist}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CopyUrlButton url={req.youtubeUrl} />
                          <CopyButton request={req} />
                          <button onClick={() => handlePromoteToStage(req.id)} className="px-2 py-1 bg-teal-400/10 text-teal-400 border border-teal-400/20 text-[8px] font-black rounded uppercase hover:bg-teal-400 hover:text-slate-950 transition-all">Stage</button>
                          <button onClick={() => setRequestToEdit(req)} className="text-slate-600 hover:text-white p-1">✏️</button>
                          <button onClick={async () => { await deleteRequest(req.id); await refresh(); }} className="text-rose-500 hover:text-rose-400 transition-colors px-3 font-black">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="bg-slate-900/40 rounded-3xl p-6 border border-slate-800 flex flex-col">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Atmosphere</h3>

                  <div className="space-y-4 flex-1">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 px-1">Active Background</h4>
                      <div className="space-y-2">
                        {approvedListening.map((req) => (
                          <div key={req.id} className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between group">
                            <div
                              className="min-w-0 cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
                              onClick={() => handleSongSearch(req.songName, req.artist, req.type)}
                            >
                              <div className="text-xs font-bold text-white truncate uppercase">{req.songName}</div>
                              <div className="text-[9px] text-slate-500 uppercase tracking-widest">{req.artist}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <VideoLink url={req.youtubeUrl} />
                              <CopyButton request={req} />
                              <button onClick={() => handlePromoteToStage(req.id)} className="px-2 py-1 bg-indigo-400/10 text-indigo-400 border border-indigo-400/20 text-[8px] font-black rounded uppercase hover:bg-indigo-400 hover:text-white transition-all">Stage</button>
                              <button onClick={() => setRequestToEdit(req)} className="text-slate-600 hover:text-white p-1">✏️</button>
                              <button onClick={async () => { await deleteRequest(req.id); await refresh(); }} className="text-rose-500 hover:text-rose-400 transition-colors px-3 font-black">✕</button>
                            </div>
                          </div>
                        ))}
                        {approvedListening.length === 0 && <p className="text-[9px] text-slate-700 italic px-2">No background tracks active.</p>}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-800/50">
                      <h4 className="text-[10px] font-black text-teal-400/60 uppercase tracking-widest mb-3 px-1 flex justify-between items-center">
                        Verified Songbook
                        <div className="flex gap-2">
                          <span className="text-[8px] bg-teal-400/10 text-teal-400 px-1.5 py-0.5 rounded">{verifiedSongs.length}</span>
                          <button
                            onClick={() => setIsAddingVerifiedSong(true)}
                            className="text-[8px] font-black bg-teal-400 text-slate-950 px-2 py-0.5 rounded uppercase hover:bg-teal-300 transition-colors"
                          >
                            + Add
                          </button>
                        </div>
                      </h4>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {verifiedSongs.map(v => (
                          <div key={v.id} className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/40 flex justify-between items-center group hover:border-teal-400/20 transition-all">
                            <div className="min-w-0 pr-2">
                              <div className="text-[11px] font-bold text-slate-300 uppercase truncate">{v.songName}</div>
                              <div className="text-[8px] text-slate-600 font-bold uppercase truncate">{v.artist}</div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => handleSongSearch(v.songName, v.artist, v.type)}
                                className="p-1.5 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 rounded-lg text-[8px] font-black uppercase transition-all"
                              >
                                Play
                              </button>
                              <button
                                onClick={() => {
                                  setIsAddingRequest(true);
                                  // Manual add prefill helper
                                }}
                                className="p-1.5 bg-teal-400/10 text-teal-400 hover:bg-teal-400/20 rounded-lg text-[8px] font-black uppercase transition-all"
                              >
                                Queue
                              </button>
                              <CopyUrlButton url={v.youtubeUrl} />
                              <button onClick={() => setVerifiedSongToEdit(v)} className="text-slate-600 hover:text-white p-1">✏️</button>
                              <button onClick={async () => { if (confirm('Delete verified song?')) { await deleteVerifiedSong(v.id); await refresh(); } }} className="text-rose-500 hover:text-rose-400 transition-colors px-1 font-bold">✕</button>
                            </div>
                          </div>
                        ))}
                        {verifiedSongs.length === 0 && <p className="text-[9px] text-slate-700 italic px-2">No persistent links found yet.</p>}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <section className="bg-slate-900/40 rounded-3xl p-6 border border-slate-800 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Connected Performers</h2>
                  <div className="flex items-center gap-2 px-2 py-1 bg-slate-950 border border-slate-800 rounded-full">
                    <span className="text-[8px] font-black text-teal-400 uppercase tracking-widest">{liveMicCount} READY</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  {session.participants.map(p => {
                    const isReady = p.status === ParticipantStatus.READY;
                    const requests = session.requests.filter(r => r.participantId === p.id);
                    const approvedCount = requests.filter(r => r.status === RequestStatus.APPROVED && r.type === RequestType.SINGING).length;

                    return (
                      <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl transition-all border ${isReady ? 'bg-teal-400/5 border-teal-400/30' : 'bg-slate-950/40 border-slate-800'}`}>
                        <div className="min-w-0 flex items-center gap-4">
                          <button
                            onClick={async () => { await updateParticipantStatus(p.id, isReady ? ParticipantStatus.STANDBY : ParticipantStatus.READY); await refresh(); }}
                            className={`w-5 h-5 rounded-full shrink-0 ${isReady ? 'bg-teal-400 animate-pulse shadow-[0_0_15px_rgba(45,212,191,0.6)]' : 'bg-slate-700'}`}
                            title={isReady ? "Set to Standby" : "Set to Ready"}
                          />
                          <button
                            onClick={() => viewPerformerProfile(p.id)}
                            className={`font-bold text-sm uppercase truncate text-left hover:text-teal-400 transition-colors ${isReady ? 'text-white' : 'text-slate-500'}`}
                          >
                            {p.name}
                          </button>
                          {approvedCount > 0 && <span className="text-[7px] bg-teal-400 text-slate-950 px-1.5 py-0.5 rounded font-black">{approvedCount}S</span>}
                        </div>
                        <div className="flex gap-1 items-center">
                          <button
                            onClick={() => setPrefilledSinger(p)}
                            title={`Manual Search Add for ${p.name}`}
                            className="p-1.5 hover:text-indigo-400 transition-colors text-slate-600"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          </button>

                          <button
                            onClick={() => setPickingSongForUser(p)}
                            title={`Add Song from Verified Book for ${p.name}`}
                            className="p-1.5 hover:text-teal-400 transition-colors text-slate-600"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                              <line x1="12" y1="19" x2="12" y2="22" />
                            </svg>
                          </button>

                          <button
                            onClick={() => { const user = accounts.find(a => a.id === p.id); if (user) setManagedProfile(user); else setPrefilledSinger(p); }}
                            title="Manage Account"
                            className="p-1.5 hover:text-teal-400 transition-colors text-slate-600"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                              <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                          </button>

                          <button onClick={async () => { await removeParticipant(p.id); await refresh(); }} className="p-1.5 text-rose-500/40 hover:text-rose-500 transition-colors px-2 font-black">✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="bg-slate-900/40 rounded-3xl p-6 border border-slate-800 shadow-xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">History Log</h2>
                  {session.history.length > 0 && <button onClick={async () => { await clearHistory(); await refresh(); }} className="text-[8px] font-black text-rose-500 hover:text-rose-400 uppercase">Clear</button>}
                </div>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {session.history.map((item, i) => (
                    <div key={i} className="bg-slate-950/40 p-3 rounded-xl border border-slate-800 flex flex-col group hover:border-teal-400/20 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 pr-2">
                          <div className="text-[11px] font-bold text-white uppercase truncate">{item.songName}</div>
                          <div className="text-[8px] text-slate-600 font-bold uppercase truncate">{item.artist}</div>
                        </div>
                        <VideoLink url={item.youtubeUrl} />
                      </div>
                      <div className="flex items-center justify-between mt-2 border-t border-slate-800/50 pt-2">
                        <button onClick={() => viewPerformerProfile(item.participantId)} className="text-[9px] font-black text-teal-400/60 uppercase truncate hover:text-teal-400">{item.participantName}</button>
                        <button onClick={async () => { await reAddFromHistory(item, true); await refresh(); }} className="opacity-0 group-hover:opacity-100 text-[8px] font-black bg-teal-400/10 text-teal-400 px-1.5 py-0.5 rounded transition-opacity">Retry</button>
                      </div>
                    </div>
                  ))}
                  {session.history.length === 0 && <div className="text-center py-10 opacity-20"><p className="text-[10px] italic">No past sessions recorded</p></div>}
                </div>
              </section>
            </div>
          </div>
        )
        }

        {
          activeTab === 'ROTATION' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-2">
              {session.currentRound && session.currentRound.length > 0 && (
                <section className="bg-teal-400/5 border border-teal-400/20 rounded-3xl p-8 shadow-3xl">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-ping"></div>
                    <h3 className="text-white font-black uppercase tracking-widest text-xs">On Stage Now</h3>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {session.currentRound.map((song, i) => (
                      <div
                        key={song.id}
                        className={`p-6 rounded-[2rem] border transition-all duration-500 ${i === 0
                          ? 'bg-slate-950 border-teal-400 ring-2 ring-teal-400/20 shadow-2xl'
                          : 'bg-slate-900 border-white/5 opacity-60'
                          }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="min-w-0 pr-4">
                            <div className={`text-xl font-black uppercase truncate tracking-tight mb-1 ${i === 0 ? 'text-white' : 'text-slate-300'}`}>{song.songName}</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{song.artist}</div>
                            <div className="mt-4 text-xs font-black text-teal-400 uppercase tracking-tighter">{song.participantName}</div>
                          </div>
                          {i === 0 && <div className="px-3 py-1 bg-teal-400 text-slate-950 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-teal-400/20">LIVE</div>}
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-white/5">
                          <button onClick={() => handlePlayOnStage(song)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase transition-all">Play</button>
                          <button onClick={() => handleRotateSong(song.id)} className="flex-1 py-2 bg-teal-400/10 text-teal-400 hover:bg-teal-400 text-slate-950 rounded-xl text-[9px] font-black uppercase transition-all">Done</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="bg-slate-900/40 rounded-3xl p-8 border border-white/5">
                <h3 className="text-slate-500 font-black uppercase tracking-widest text-[10px] mb-8">Performance Queue (Approved)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {approvedSinging.map((req) => (
                    <div key={req.id} className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-teal-400/30 transition-all">
                      <div className="min-w-0 pr-4">
                        <div className="text-white font-bold uppercase truncate text-sm">{req.songName}</div>
                        <div className="text-[10px] text-slate-500 uppercase flex items-center gap-2 mt-1">
                          <span className="text-teal-400/60 font-black">{req.participantName}</span> • {req.artist}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handlePromoteToStage(req.id)} className="px-4 py-2 bg-teal-400 text-slate-950 text-[10px] font-black rounded-xl uppercase shadow-xl shadow-teal-900/10 transition-all active:scale-95">Stage</button>
                        <button onClick={async () => { await deleteRequest(req.id); await refresh(); }} className="text-rose-500 hover:bg-rose-500/10 p-2 rounded-xl transition-all">✕</button>
                      </div>
                    </div>
                  ))}
                  {approvedSinging.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-slate-950/20 rounded-3xl border border-dashed border-slate-800 opacity-20">
                      <p className="text-xs font-bold uppercase italic">Queue is empty</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )
        }

        {
          activeTab === 'PERFORMERS' && (
            <div className="grid md:grid-cols-12 gap-8 animate-in slide-in-from-bottom-2">
              <section className="md:col-span-7 bg-slate-900/40 rounded-3xl p-8 border border-slate-800 shadow-xl">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Connected Performers</h2>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-full">
                    <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">{liveMicCount} READY</span>
                  </div>
                </div>
                <div className="grid gap-3">
                  {session.participants.map(p => {
                    const isReady = p.status === ParticipantStatus.READY;
                    const requests = session.requests.filter(r => r.participantId === p.id);
                    const approvedCount = requests.filter(r => r.status === RequestStatus.APPROVED && r.type === RequestType.SINGING).length;

                    return (
                      <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl transition-all border ${isReady ? 'bg-teal-400/10 border-teal-400/30' : 'bg-slate-950/60 border-slate-800'}`}>
                        <div className="min-w-0 flex items-center gap-4 text-left">
                          <button
                            onClick={async () => { await updateParticipantStatus(p.id, isReady ? ParticipantStatus.STANDBY : ParticipantStatus.READY); await refresh(); }}
                            className={`w-6 h-6 rounded-full shrink-0 ${isReady ? 'bg-teal-400 animate-pulse shadow-[0_0_15px_rgba(45,212,191,0.6)]' : 'bg-slate-700'}`}
                          />
                          <div className="min-w-0">
                            <button
                              onClick={() => viewPerformerProfile(p.id)}
                              className={`font-bold text-sm uppercase truncate hover:text-teal-400 transition-colors ${isReady ? 'text-white' : 'text-slate-500'}`}
                            >
                              {p.name}
                            </button>
                            {approvedCount > 0 && <div className="text-[8px] font-black text-teal-400 uppercase mt-1">{approvedCount} Tracks Approved</div>}
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <button onClick={() => setPrefilledSinger(p)} className="p-2 hover:text-indigo-400 transition-colors text-slate-600">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          </button>
                          <button onClick={async () => { await removeParticipant(p.id); await refresh(); }} className="text-rose-500 hover:text-rose-400 p-2 text-lg">✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="md:col-span-5 bg-slate-900/40 rounded-3xl p-8 border border-slate-800 shadow-xl">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">History Log</h2>
                  {session.history.length > 0 && <button onClick={async () => { await clearHistory(); await refresh(); }} className="text-[8px] font-black text-rose-500 hover:text-rose-400 uppercase">Clear All</button>}
                </div>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {session.history.map((item, i) => (
                    <div key={i} className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 group hover:border-teal-400/20 transition-all">
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0 pr-4">
                          <div className="text-xs font-bold text-white uppercase truncate">{item.songName}</div>
                          <div className="text-[10px] text-slate-600 font-bold uppercase truncate">{item.artist}</div>
                        </div>
                        <VideoLink url={item.youtubeUrl} />
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-800/50 pt-3">
                        <button onClick={() => viewPerformerProfile(item.participantId)} className="text-[10px] font-black text-teal-400/60 uppercase truncate hover:text-teal-400">{item.participantName}</button>
                        <button onClick={async () => { await reAddFromHistory(item, true); await refresh(); }} className="opacity-0 group-hover:opacity-100 text-[9px] font-black bg-teal-400 text-slate-950 px-3 py-1 rounded-lg transition-all">Retry</button>
                      </div>
                    </div>
                  ))}
                  {session.history.length === 0 && <div className="text-center py-20 opacity-20"><p className="text-[10px] italic">No past sessions recorded</p></div>}
                </div>
              </section>
            </div>
          )
        }

        {
          activeTab === 'LIBRARY' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 space-y-8 pb-32">
              {/* Search Bar - Aesthetic match with Participant UI */}
              <div className="sticky top-0 z-30 pt-2 -mt-2">
                <div className="relative group">
                  <input
                    type="text"
                    placeholder="Search Global Songbook & Verified Links..."
                    value={librarySearchQuery}
                    onChange={(e) => setLibrarySearchQuery(e.target.value)}
                    className="w-full bg-slate-900/90 border border-white/10 rounded-[2rem] py-6 pl-14 pr-6 text-sm font-bold tracking-widest text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20 transition-all backdrop-blur-2xl shadow-2xl"
                  />
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors pointer-events-none">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </span>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-3">
                    <button
                      onClick={() => setIsAddingVerifiedSong(true)}
                      className="px-4 py-2 bg-teal-400 text-slate-950 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-teal-900/20 active:scale-95 transition-all"
                    >
                      + Add Link
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {(() => {
                  const verified = (session?.verifiedSongbook || []).map(v => ({
                    ...v,
                    isVerified: true,
                    title: v.songName,
                    source: 'VERIFIED'
                  }));

                  // AI suggestions removed - only showing verified songbook
                  const combined = verified.filter(song => {
                    if (!librarySearchQuery) return true;
                    const query = librarySearchQuery.toLowerCase();
                    return song.title.toLowerCase().includes(query) || song.artist.toLowerCase().includes(query);
                  });

                  if (combined.length === 0) {
                    return (
                      <div className="col-span-full text-center py-32 opacity-20 border-2 border-dashed border-white/5 rounded-[3rem]">
                        <div className="text-6xl mb-6 truncate">{librarySearchQuery ? '🚫' : '✨'}</div>
                        <p className="text-sm font-black uppercase tracking-[0.3em]">{librarySearchQuery ? 'No tracks matching your search' : 'Songbook is empty. Run AI Sync or Add Links.'}</p>
                      </div>
                    );
                  }

                  return combined.map((song, idx) => (
                    <div key={idx} className="bg-slate-900/40 border border-white/5 p-6 rounded-[2.5rem] flex flex-col justify-between group hover:bg-slate-900/60 transition-all relative overflow-hidden backdrop-blur-sm shadow-xl hover:shadow-2xl">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-teal-400/10 transition-colors" />

                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-2 items-center">
                            {song.isVerified ? (
                              <div className="px-2 py-0.5 bg-teal-400 text-slate-950 rounded-lg text-[8px] font-black uppercase tracking-tighter">Verified</div>
                            ) : (
                              <div className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-[8px] font-black uppercase tracking-tighter">Hit #{idx + 1}</div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <VideoLink url={(song as any).youtubeUrl} />
                            <CopyUrlButton url={(song as any).youtubeUrl} />
                          </div>
                        </div>

                        <div className="min-w-0 mb-6">
                          <h4 className="text-xl font-black text-white uppercase truncate tracking-tight">{song.title}</h4>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{song.artist}</p>
                        </div>
                      </div>

                      <div className="relative z-10 flex gap-2 border-t border-white/5 pt-4 mt-auto">
                        <div className="relative group/assign flex-1">
                          <button className="w-full py-3 bg-teal-400 text-slate-950 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-teal-900/20 hover:bg-teal-300 transition-all active:scale-95">
                            Inject Song
                          </button>
                          <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-950 border border-slate-800 rounded-2xl shadow-3xl opacity-0 invisible group-hover/assign:opacity-100 group-hover/assign:visible transition-all p-3 z-50">
                            <p className="text-[8px] text-slate-500 font-black uppercase mb-2 border-b border-slate-800 pb-2">Assign to Performer:</p>
                            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                              {session.participants.map(p => (
                                <button
                                  key={p.id}
                                  onClick={async () => { const req = await addRequest({ participantId: p.id, participantName: p.name, songName: song.title, artist: song.artist, youtubeUrl: (song as any).youtubeUrl, type: RequestType.SINGING }); if (req) await approveRequest(req.id); await refresh(); }}
                                  className="w-full text-left p-2 rounded-lg hover:bg-teal-400/10 hover:text-teal-400 text-[10px] font-bold text-slate-400 uppercase truncate"
                                >
                                  {p.name}
                                </button>
                              ))}
                              <button
                                onClick={async () => { const req = await addRequest({ participantId: 'DJ-MANUAL', participantName: 'Guest', songName: song.title, artist: song.artist, youtubeUrl: (song as any).youtubeUrl, type: RequestType.SINGING }); if (req) await approveRequest(req.id); await refresh(); }}
                                className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-[10px] font-black text-white uppercase mt-2 border-t border-slate-800 pt-2"
                              >
                                + Add as Guest
                              </button>
                            </div>
                          </div>
                        </div>

                        {song.isVerified && (
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => setVerifiedSongToEdit(song as any)} className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                            </button>
                            <button onClick={async () => { if (confirm('Delete verified song?')) { await deleteVerifiedSong((song as any).id); await refresh(); } }} className="p-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-colors">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </section>
          )
        }
      </main >

      {showRoundConfirm && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[90] backdrop-blur-3xl">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-3xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Review Lineup</h2>
              <button onClick={() => setShowRoundConfirm(false)} className="text-slate-500 hover:text-white font-black text-xl px-2">✕</button>
            </div>
            <div className="mb-6 text-[10px] text-teal-400 font-bold uppercase tracking-[0.3em] opacity-60">Finalize rotation statuses before performance</div>

            <div className="space-y-3 mb-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {[...session.participants].sort((a, b) => (b.joinedAt || 0) - (a.joinedAt || 0)).map(p => {
                const isReady = p.status === ParticipantStatus.READY;
                const song = session.requests?.find(r =>
                  r.participantId === p.id &&
                  r.status === RequestStatus.APPROVED &&
                  r.type === RequestType.SINGING &&
                  !r.isInRound
                );

                return (
                  <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${isReady ? 'bg-teal-400/5 border-teal-400/30' : 'bg-slate-950/40 border-slate-800/50 opacity-50'}`}>
                    <div className="flex items-center gap-4 min-w-0">
                      <button
                        onClick={async () => { await updateParticipantStatus(p.id, isReady ? ParticipantStatus.STANDBY : ParticipantStatus.READY); await refresh(); }}
                        className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all ${isReady ? 'bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.4)]' : 'bg-slate-700 hover:bg-slate-600'}`}
                        title={isReady ? "Set to Standby" : "Set to Ready"}
                      >
                        {isReady && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-950"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                      </button>
                      <div className="min-w-0">
                        <div className={`font-black uppercase text-sm truncate tracking-tight ${isReady ? 'text-white' : 'text-slate-500'}`}>{p.name}</div>
                        {isReady ? (
                          song ? (
                            <div className="text-teal-400 text-[10px] font-bold uppercase tracking-widest truncate">{song.songName}</div>
                          ) : (
                            <div className="text-rose-500 text-[10px] font-bold uppercase tracking-widest">⚠️ No Approved Track</div>
                          )
                        ) : (
                          <div className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Ready to Standby</div>
                        )}
                      </div>
                    </div>
                    {isReady && song && <div className="shrink-0 text-[8px] bg-teal-400 text-slate-950 px-2 py-0.5 rounded font-black uppercase tracking-tighter shadow-lg shadow-teal-400/20 animate-in fade-in zoom-in">Lining Up</div>}
                  </div>
                );
              })}

              {session.participants.length === 0 && (
                <div className="text-center py-20 bg-slate-950/30 rounded-3xl border border-dashed border-slate-800 animate-in fade-in duration-700">
                  <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.3em]">No connected performers detected</p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button onClick={() => setShowRoundConfirm(false)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase text-xs tracking-widest transition-all">Cancel</button>
              {(() => {
                const eligibleCount = session.participants.filter(p =>
                  p.status === ParticipantStatus.READY &&
                  session.requests?.some(r => r.participantId === p.id && r.status === RequestStatus.APPROVED && r.type === RequestType.SINGING && !r.isInRound)
                ).length;

                return (
                  <button
                    onClick={handleConfirmRound}
                    disabled={eligibleCount === 0}
                    className={`flex-[2] py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 shadow-2xl ${eligibleCount > 0 ? 'bg-teal-400 hover:bg-teal-300 text-slate-950 shadow-teal-900/40' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700 opacity-50'}`}
                  >
                    {eligibleCount > 0 ? `Activate Round (${eligibleCount} Singers)` : 'No Eligible Singers'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}


      {
        showResetConfirm && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[200] backdrop-blur-3xl">
            <div className="w-full max-w-md bg-slate-900 border border-rose-500/30 rounded-[3rem] p-10 text-center shadow-3xl animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-rose-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl font-black">🧹</div>
              <h2 className="text-3xl font-black text-white uppercase mb-3 tracking-tighter">New Session?</h2>
              <p className="text-slate-400 text-sm mb-10 leading-relaxed font-medium">
                This will <span className="text-rose-500 font-bold underline">kick everyone out</span>, clear all requests, history, and chat messages. This cannot be undone.
              </p>
              <div className="flex gap-4">
                <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-4 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase">Cancel</button>
                <button onClick={handleConfirmReset} className="flex-[2] py-4 bg-rose-500 text-white rounded-xl text-xs font-black uppercase shadow-2xl shadow-rose-900/40">Reset Session</button>
              </div>
            </div>
          </div>
        )
      }

      {
        (showUserManager || managedProfile) && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[70] backdrop-blur-xl">
            <div className="w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div>
                  <h2 className="text-2xl font-black text-white font-outfit uppercase tracking-tight">User Directory</h2>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest opacity-60">Registered Performers & Historical Data</p>
                </div>
                <div className="flex gap-2">
                  {managedProfile && (
                    <button onClick={() => setManagedProfile(null)} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase">← All Accounts</button>
                  )}
                  <button
                    onClick={() => setIsCreatingProfile(true)}
                    className="px-4 py-2 bg-teal-400 text-slate-950 rounded-xl text-xs font-black uppercase"
                  >
                    + New Account
                  </button>
                  <button onClick={closeModals} className="text-slate-500 hover:text-white p-2 ml-2 font-black">✕</button>
                </div>
              </div>

              <div className="p-6 border-b border-white/5 bg-slate-900/30">
                <input
                  type="text"
                  placeholder="Search Account Directory (Name or ID)..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold placeholder:text-slate-600 outline-none focus:border-teal-400/50 transition-all shadow-inner"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {managedProfile ? (
                  <div className="animate-in slide-in-from-right-4 duration-300 grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                      <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
                          <div className="relative z-10 flex flex-col items-center text-center">
                            <UserAvatar name={managedProfile.name} isActive={session.participants.some(p => p.id === managedProfile.id)} />
                            <div className="mt-4">
                              <div className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em] mb-1">Authenticated Identity</div>
                              <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{managedProfile.name}</h3>
                            </div>

                            <div className="w-full mt-8 space-y-3 pt-6 border-t border-white/5">
                              <div className="flex justify-between items-center text-[10px] uppercase font-black">
                                <span className="text-slate-500">System ID</span>
                                <span className="text-slate-300 font-mono tracking-tighter">{managedProfile.id}</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] uppercase font-black">
                                <span className="text-slate-500">Security</span>
                                <span className={`px-2 py-0.5 rounded ${managedProfile.password ? 'bg-teal-400/10 text-teal-400' : 'bg-slate-800 text-slate-500'}`}>
                                  {managedProfile.password ? 'PIN PROTECTED' : 'OPEN ACCESS'}
                                </span>
                              </div>
                            </div>

                            <div className="w-full mt-10 space-y-2">
                              <button onClick={() => startEditProfile(managedProfile)} className="w-full py-4 bg-slate-800/80 hover:bg-slate-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700/50">Modify Security</button>
                              <button onClick={async () => { await joinSession(managedProfile.id); await refresh(); }} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-900/20">Force Join Session</button>
                              <button onClick={async () => { if (confirm('Permanently delete this account?')) { await deleteAccount(managedProfile.id); setManagedProfile(null); await refresh(); } }} className="w-full py-4 bg-rose-500/5 hover:bg-rose-500 text-rose-500/40 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent hover:border-rose-500/30">Destroy Account</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-md">
                          <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-6">Library Stars ({managedProfile.favorites.length})</h4>
                          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {managedProfile.favorites.map(fav => (
                              <div key={fav.id} className="bg-slate-950/60 border border-slate-800/50 p-4 rounded-2xl flex justify-between items-center group hover:border-indigo-400/30 transition-all">
                                <div className="min-w-0 pr-4">
                                  <div className="text-sm font-black text-white truncate uppercase tracking-tight group-hover:text-indigo-400 transition-colors">{fav.songName}</div>
                                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{fav.artist}</div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <button onClick={async () => { await addRequest({ participantId: managedProfile!.id, participantName: managedProfile!.name, songName: fav.songName, artist: fav.artist, youtubeUrl: fav.youtubeUrl, type: fav.type }); await refresh(); }} className="px-4 py-2 bg-teal-400 text-slate-950 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-teal-400/10 hover:bg-teal-300 transition-all">Add</button>
                                  <button onClick={() => setProfileItemToEdit({ type: 'favorite', itemId: fav.id })} className="p-2 text-slate-500 hover:text-white transition-colors">✏️</button>
                                  <button onClick={async () => { await removeUserFavorite(managedProfile!.id, fav.id); await refresh(); }} className="p-2 text-slate-500 hover:text-rose-500 transition-colors">✕</button>
                                </div>
                              </div>
                            ))}
                            {managedProfile.favorites.length === 0 && <div className="flex flex-col items-center py-20 opacity-20"><span className="text-3xl mb-2">⭐</span><p className="text-[9px] font-black uppercase tracking-widest">No favorites yet</p></div>}
                          </div>
                        </div>

                        <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-md">
                          <h4 className="text-[10px] font-black text-teal-400 uppercase tracking-[0.4em] mb-6">Performance Log ({managedProfile.personalHistory.length})</h4>
                          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {managedProfile.personalHistory.map((h, i) => (
                              <div key={i} className="bg-slate-950/60 border border-slate-800/50 p-4 rounded-2xl group hover:border-teal-400/30 transition-all">
                                <div className="flex justify-between items-start">
                                  <div className="min-w-0 pr-4">
                                    <div className="text-sm font-black text-white truncate uppercase tracking-tight group-hover:text-teal-400 transition-colors">{h.songName}</div>
                                    <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{h.artist}</div>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                    <button onClick={() => setProfileItemToEdit({ type: 'history', itemId: h.id })} className="p-2 text-slate-500 hover:text-white transition-colors">✏️</button>
                                    <button onClick={async () => { await removeUserHistoryItem(managedProfile!.id, h.id); await refresh(); }} className="p-2 text-slate-500 hover:text-rose-500 transition-colors">✕</button>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5">
                                  <span className="text-[8px] text-slate-600 font-black uppercase">Performed {new Date(h.createdAt).toLocaleDateString()}</span>
                                  <button
                                    onClick={async () => { await reAddFromHistory(h, true); await refresh(); }}
                                    className="text-[9px] font-black text-teal-400 hover:text-teal-300 uppercase underline decoration-teal-400/30 underline-offset-4"
                                  >
                                    Re-Queue
                                  </button>
                                </div>
                              </div>
                            ))}
                            {managedProfile.personalHistory.length === 0 && <div className="flex flex-col items-center py-20 opacity-20"><span className="text-3xl mb-2">🎤</span><p className="text-[9px] font-black uppercase tracking-widest">No sets recorded yet</p></div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : isCreatingProfile ? (
                  <form onSubmit={handleProfileFormSubmit} className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
                    <h3 className="text-xl font-black text-teal-400 uppercase">{editingProfile ? 'Modify Profile' : 'New User Account'}</h3>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Handle</label>
                      <input required type="text" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Keycode (Optional)</label>
                      <input type="password" value={profileForm.password} onChange={e => setProfileForm({ ...profileForm, password: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white outline-none focus:border-teal-400" />
                    </div>
                    <div className="flex gap-4">
                      <button type="button" onClick={() => { setIsCreatingProfile(false); setEditingProfile(null); }} className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase">Cancel</button>
                      <button type="submit" className="flex-[2] py-3 bg-teal-400 text-slate-950 rounded-xl text-xs font-black uppercase shadow-lg shadow-teal-900/20">Save Account</button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-12">
                    {(() => {
                      const connectedGuests = accounts.filter(user =>
                        !user.password &&
                        session.participants.some(p => p.id === user.id) &&
                        (user.name.toLowerCase().includes(directorySearch.toLowerCase()) || user.id.toLowerCase().includes(directorySearch.toLowerCase()))
                      );
                      const others = accounts.filter(user =>
                        (user.password || !session.participants.some(p => p.id === user.id)) &&
                        (user.name.toLowerCase().includes(directorySearch.toLowerCase()) || user.id.toLowerCase().includes(directorySearch.toLowerCase()))
                      );

                      return (
                        <>
                          {connectedGuests.length > 0 && (
                            <div className="space-y-6">
                              <div className="flex items-center gap-4">
                                <h3 className="text-[10px] font-black text-teal-400 uppercase tracking-[0.4em] whitespace-nowrap">Active Performers</h3>
                                <div className="h-[1px] w-full bg-gradient-to-r from-teal-400/30 to-transparent"></div>
                              </div>
                              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {connectedGuests.map(user => (
                                  <div key={user.id} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[2rem] p-5 flex flex-col justify-between hover:bg-white/10 transition-all shadow-2xl group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-400/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-teal-400/10 transition-colors" />
                                    <div className="flex items-start gap-4 mb-6 relative z-10">
                                      <UserAvatar name={user.name} isActive={true} />
                                      <div className="min-w-0">
                                        <button
                                          onClick={() => setManagedProfile(user)}
                                          className="text-white font-black text-lg uppercase truncate tracking-tight text-left block hover:text-teal-400 transition-colors"
                                        >
                                          {user.name}
                                        </button>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[7px] bg-teal-400 text-slate-950 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Guest Link</span>
                                          <span className="text-[7px] text-slate-500 uppercase font-black">{user.favorites.length} Stars • {user.personalHistory.length} Sets</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 relative z-10">
                                      <div className="flex gap-2">
                                        <button onClick={() => setManagedProfile(user)} className="flex-[2] h-10 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-indigo-600/30">Set History</button>
                                        <button onClick={() => startEditProfile(user)} className="flex-1 h-10 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-[9px] font-bold uppercase transition-all border border-slate-700/50">Edit</button>
                                      </div>
                                      <button
                                        onClick={() => handleQuickSet(user)}
                                        className="w-full h-10 bg-teal-400/10 hover:bg-teal-400 text-teal-400 hover:text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border border-teal-400/20 shadow-lg shadow-teal-400/5 group/btn"
                                      >
                                        ⚡ Quick Set (3 Random)
                                      </button>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => setPickingSongForUser(user)}
                                          className="flex-[4] h-10 bg-indigo-400/10 hover:bg-indigo-400 text-indigo-400 hover:text-white rounded-xl flex items-center justify-center gap-2 transition-all border border-indigo-400/20 text-[9px] font-black uppercase"
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
                                          From Songbook
                                        </button>
                                        <button onClick={async () => { if (confirm('Delete Guest Account?')) { await deleteAccount(user.id); await refresh(); } }} className="flex-1 h-10 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-xl transition-all flex items-center justify-center">
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-6">
                            <div className="flex items-center gap-4">
                              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] whitespace-nowrap">Historical Accounts</h3>
                              <div className="h-[1px] w-full bg-white/5"></div>
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {others.map(user => {
                                const isActive = session.participants.some(p => p.id === user.id);
                                return (
                                  <div key={user.id} className={`bg-slate-900/40 border ${isActive ? 'border-teal-400/20 bg-teal-400/5' : 'border-slate-800'} rounded-[2rem] p-5 flex flex-col justify-between hover:border-slate-600 transition-all group`}>
                                    <div className="flex items-start gap-4 mb-6">
                                      <UserAvatar name={user.name} isActive={isActive} />
                                      <div className="min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                          <button
                                            onClick={() => setManagedProfile(user)}
                                            className="text-white font-black text-lg uppercase truncate tracking-tight text-left block hover:text-teal-400 transition-colors"
                                          >
                                            {user.name}
                                          </button>
                                        </div>
                                        <p className="text-[7px] text-slate-500 uppercase font-black tracking-widest mt-1">
                                          {user.password ? '🔐 Auth Account' : 'Guest Identity'} • {user.favorites.length} Stars
                                        </p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                      <div className="flex gap-2">
                                        <button onClick={() => setManagedProfile(user)} className="flex-1 h-10 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-[9px] font-black uppercase transition-all">Log</button>
                                        <button onClick={() => startEditProfile(user)} className="flex-1 h-10 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-[9px] font-black uppercase transition-all">Edit</button>
                                        <button
                                          onClick={() => handleQuickSet(user)}
                                          className="flex-[2] h-10 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl text-[9px] font-black uppercase transition-all border border-indigo-600/20"
                                        >
                                          Auto-Set
                                        </button>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => setPickingSongForUser(user)}
                                          className="flex-[4] h-10 bg-slate-800/80 hover:bg-teal-400/20 hover:text-teal-400 text-slate-400 rounded-xl flex items-center justify-center gap-2 transition-all border border-slate-700 text-[9px] font-black uppercase"
                                        >
                                          Manual Select
                                        </button>
                                        <button onClick={async () => { if (confirm('Erase Account?')) { await deleteAccount(user.id); await refresh(); } }} className="flex-1 h-10 bg-rose-500/5 text-rose-500/30 hover:text-rose-500 border border-transparent hover:border-rose-500/20 rounded-xl transition-all flex items-center justify-center">✕</button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {others.length === 0 && connectedGuests.length === 0 && (
                              <div className="text-center py-20 opacity-20">
                                <p className="text-xs font-black uppercase tracking-[0.5em] text-slate-600">No profile matches found</p>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }



      {
        (isAddingRequest || requestToEdit || profileItemToEdit || prefilledSinger || isAddingVerifiedSong || verifiedSongToEdit) && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] backdrop-blur-xl">
            <div className="w-full max-w-md">
              {(() => {
                let initialData = { singerName: '', songName: '', artist: '', youtubeUrl: '', type: RequestType.SINGING };
                let title = "Global Track Input";

                if (profileItemToEdit && managedProfile) {
                  if (profileItemToEdit.type === 'favorite') {
                    const fav = managedProfile.favorites.find(f => f.id === profileItemToEdit.itemId);
                    if (fav) {
                      initialData = { singerName: managedProfile.name, songName: fav.songName, artist: fav.artist, youtubeUrl: fav.youtubeUrl || '', type: fav.type };
                      title = `Edit Permanent Favorite for ${managedProfile.name}`;
                    }
                  } else {
                    const hist = managedProfile.personalHistory.find(h => h.id === profileItemToEdit.itemId);
                    if (hist) {
                      initialData = { singerName: managedProfile.name, songName: hist.songName, artist: hist.artist, youtubeUrl: hist.youtubeUrl || '', type: hist.type };
                      title = `Edit History Entry for ${managedProfile.name}`;
                    }
                  }
                } else if (requestToEdit) {
                  initialData = { singerName: requestToEdit.participantName, songName: requestToEdit.songName, artist: requestToEdit.artist, youtubeUrl: requestToEdit.youtubeUrl || '', type: requestToEdit.type };
                  title = "Modify Track";
                } else if (verifiedSongToEdit) {
                  initialData = { singerName: '', songName: verifiedSongToEdit.songName, artist: verifiedSongToEdit.artist, youtubeUrl: verifiedSongToEdit.youtubeUrl || '', type: verifiedSongToEdit.type };
                  title = "Edit Verified Song";
                } else if (isAddingVerifiedSong) {
                  initialData = { singerName: '', songName: '', artist: '', youtubeUrl: '', type: RequestType.SINGING };
                  title = "Add to Verified Songbook";
                } else if (prefilledSinger) {
                  initialData.singerName = prefilledSinger.name;
                  title = `Song for ${prefilledSinger.name}`;
                }

                return (
                  <SongRequestForm
                    key={requestToEdit?.id || profileItemToEdit?.itemId || prefilledSinger?.id || verifiedSongToEdit?.id || (isAddingVerifiedSong ? 'new-verified' : 'new-request')}
                    title={title}
                    showSingerName={!profileItemToEdit && !verifiedSongToEdit && !isAddingVerifiedSong}
                    initialSingerName={initialData.singerName}
                    initialSongName={initialData.songName}
                    initialArtist={initialData.artist}
                    initialYoutubeUrl={initialData.youtubeUrl}
                    initialType={initialData.type}
                    submitLabel={(requestToEdit || profileItemToEdit || verifiedSongToEdit) ? "Save Update" : (isAddingVerifiedSong ? "Add to Library" : "Queue Track")}
                    onSubmit={handleManualRequestSubmit}
                    onCancel={closeModals}
                  />
                );
              })()}
            </div>
          </div>
        )
      }

      {
        showQrModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] backdrop-blur-xl">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl text-center">
              <h3 className="text-xl font-black text-white uppercase mb-4">Access Entry</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Point Guest cameras at the code below</p>
              <div className="bg-white p-6 rounded-2xl inline-block shadow-2xl mb-8">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(roomJoinUrl)}&bgcolor=ffffff`} alt="Room QR" className="w-56 h-56" />
              </div>
              <div className="text-[10px] text-slate-500 font-mono break-all mb-8 opacity-40 px-6">{roomJoinUrl}</div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setShowQrModal(false); setShowNetworkConfig(true); }}
                  className="w-full py-4 bg-teal-400/10 text-teal-400 rounded-xl text-xs font-bold uppercase transition-all border border-teal-400/20 hover:bg-teal-400/20"
                >
                  ⚙️ Configure Network IP
                </button>
                <button onClick={closeModals} className="w-full py-4 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase transition-all border border-slate-700">Close Panel</button>
              </div>
            </div>
          </div>
        )
      }

      {
        showNetworkConfig && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[200] backdrop-blur-2xl">
            <div className="w-full max-w-md bg-slate-900 border border-teal-400/30 p-8 rounded-[2rem] shadow-2xl">
              <h3 className="text-xl font-black text-white uppercase mb-2 tracking-tight">Network Host Configuration</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-6">Set the IP guest devices should connect to</p>

              <div className="space-y-6">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase font-black mb-2 tracking-widest">Local Detection Hint</p>
                  <div className="text-xs text-teal-400 font-mono">
                    {window.location.hostname} (Current Origin)
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Network Address / Public URL</label>
                  <input
                    type="text"
                    value={networkIpInput}
                    onChange={(e) => setNetworkIpInput(e.target.value)}
                    placeholder="e.g. 192.168.1.15 OR https://....ngrok.io"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono outline-none focus:border-teal-400 transition-all"
                  />
                </div>

                <div className="bg-amber-400/5 border border-amber-400/10 p-4 rounded-xl">
                  <p className="text-[9px] text-amber-400/80 font-bold leading-relaxed uppercase italic">
                    Tip: Use ngrok or similar tunnels if devices are on different WiFi networks (Public/Private).
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowNetworkConfig(false)}
                    className="flex-1 py-4 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase transition-all border border-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNetworkIp}
                    className="flex-[2] py-4 bg-teal-400 text-slate-950 rounded-xl text-xs font-black uppercase shadow-lg shadow-teal-400/20"
                  >
                    Save Config
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }
      {
        pickingSongForUser && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[200] backdrop-blur-2xl">
            <div className="w-full max-w-2xl bg-slate-950 border border-teal-400/20 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-teal-950/20">
                <div>
                  <h2 className="text-2xl font-black text-white font-outfit uppercase tracking-tighter leading-none">Pick Verified Song</h2>
                  <p className="text-[10px] text-teal-400 font-bold uppercase tracking-[0.3em] mt-2">Assigning to: {pickingSongForUser.name}</p>
                </div>
                <button onClick={() => setPickingSongForUser(null)} className="text-slate-500 hover:text-white p-2 font-black">✕</button>
              </div>

              <div className="p-6 bg-slate-900/50 border-b border-white/5">
                <input
                  type="text"
                  placeholder="Search Verified Book..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold placeholder:text-slate-600 outline-none focus:border-teal-400/50 transition-all"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-2">
                {verifiedSongs
                  .filter(s =>
                    s.songName.toLowerCase().includes(pickerSearch.toLowerCase()) ||
                    s.artist.toLowerCase().includes(pickerSearch.toLowerCase())
                  )
                  .map(v => (
                    <button
                      key={v.id}
                      onClick={async () => {
                        const newRequest = await addRequest({
                          participantId: pickingSongForUser.id,
                          participantName: pickingSongForUser.name,
                          songName: v.songName,
                          artist: v.artist,
                          youtubeUrl: v.youtubeUrl,
                          type: v.type
                        });
                        if (newRequest) {
                          await approveRequest(newRequest.id);
                        }
                        setPickingSongForUser(null);
                        setPickerSearch('');
                        await refresh();
                      }}
                      className="w-full flex justify-between items-center p-4 bg-slate-900/40 hover:bg-teal-400/10 border border-slate-800 hover:border-teal-400/30 rounded-2xl transition-all group text-left"
                    >
                      <div className="min-w-0 pr-4">
                        <div className="text-sm font-black text-white uppercase truncate group-hover:text-teal-400">{v.songName}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{v.artist}</div>
                      </div>
                      <div className="text-[9px] font-black text-teal-400 bg-teal-400/10 px-3 py-1 rounded-full uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        Confirm Selection
                      </div>
                    </button>
                  ))}
                {verifiedSongs.length === 0 && (
                  <div className="text-center py-20 opacity-30">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">No Verified Songs Available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }
    </div >

  );
};

export default DJView;