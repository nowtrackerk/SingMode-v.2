

import React, { useState, useEffect, useRef } from 'react';
import { Participant, KaraokeSession, ParticipantStatus, RequestType, RequestStatus, SongRequest, UserProfile, FavoriteSong } from '../types';
// Fixed: Removed non-existent 'isFavorite' from imports.
import { getSession, joinSession, updateParticipantStatus, addRequest, deleteRequest, updateRequest, getUserProfile, toggleFavorite, saveUserProfile, registerUser, loginUser, logoutUser, updateParticipantMic } from '../services/sessionManager';
import SongRequestForm from './SongRequestForm';
import { syncService } from '../services/syncService';
import { getNetworkUrl } from '../services/networkUtils';


type Tab = 'ROTATION' | 'REQUESTS' | 'FAVORITES' | 'HISTORY';

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
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
    </a>
  );
};



const ParticipantView: React.FC = () => {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authError, setAuthError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState<KaraokeSession | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<SongRequest | null>(null);
  const [prefillData, setPrefillData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>('ROTATION');

  const [showQrModal, setShowQrModal] = useState(false);
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');

  const roomId = syncService.getRoomId();
  const roomJoinUrl = getNetworkUrl() + (roomId ? `?room=${roomId}` : '');

  useEffect(() => {
    const init = async () => {
      const profile = await getUserProfile();
      if (profile) {
        setUserProfile(profile);
        const sess = await getSession();
        setSession(sess);
        const found = sess.participants.find(p => p.id === profile.id);
        if (found) setParticipant(found);
      } else {
        const sess = await getSession();
        setSession(sess);
      }
    };
    init();
  }, []);

  const refresh = async () => {
    const sess = await getSession();
    setSession(sess);
    const up = await getUserProfile();
    setUserProfile(up);
    if (!up) {
      setParticipant(null);
    } else {
      const found = sess.participants.find(p => p.id === up.id);
      if (found) setParticipant(found);
    }
  };

  useEffect(() => {
    window.addEventListener('kstar_sync', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('kstar_sync', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    try {
      if (isLoginMode) {
        const result = await loginUser(name, password);
        if (result.success && result.profile) {
          const newPart = await joinSession(result.profile.id);
          setParticipant(newPart);
          setUserProfile(result.profile);
        } else {
          setAuthError(result.error || "Authorization failed.");
        }
      } else {
        const result = await registerUser({ name, password: password || undefined }, true);
        if (result.success && result.profile) {
          const newPart = await joinSession(result.profile.id);
          setParticipant(newPart);
          setUserProfile(result.profile);
        } else {
          setAuthError(result.error || "Initialization failed.");
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "An unexpected error occurred.");
    }
  };

  const toggleStatus = async () => {
    if (!participant) return;
    const newStatus = participant.status === ParticipantStatus.READY ? ParticipantStatus.STANDBY : ParticipantStatus.READY;
    await updateParticipantStatus(participant.id, newStatus);
    if (newStatus === ParticipantStatus.STANDBY && micStream) {
      stopMic();
      await updateParticipantMic(participant.id, false);
    }
    await refresh();
  };

  const handleRequest = async (data: any) => {
    if (!participant) return;
    if (editingRequest) {
      await updateRequest(editingRequest.id, { songName: data.songName, artist: data.artist, youtubeUrl: data.youtubeUrl, type: data.type });
      setEditingRequest(null);
    } else {
      await addRequest({ participantId: participant.id, participantName: participant.name, songName: data.songName, artist: data.artist, youtubeUrl: data.youtubeUrl, type: data.type });
      setShowRequestForm(false);
    }
    setPrefillData(null);
    await refresh();
  };

  const closeModals = () => { setShowRequestForm(false); setEditingRequest(null); setPrefillData(null); };

  if (!participant) {
    return (
      <div className="max-w-md mx-auto p-8 flex flex-col items-center justify-center min-h-[85vh] text-center animate-in fade-in duration-700">
        <div className="w-24 h-24 bg-teal-400 rounded-3xl flex items-center justify-center mb-10 shadow-2xl shadow-teal-400/20">
          <span className="text-5xl font-black text-slate-950">SM</span>
        </div>
        <h1 className="text-4xl font-black font-outfit text-white mb-3 uppercase tracking-tighter">
          Activate <span className="text-teal-400">SingMode</span>
        </h1>
        <p className="text-slate-500 font-medium mb-10 uppercase tracking-widest text-[10px] font-bold">Claim your session handle.</p>

        <form onSubmit={handleAuth} className="w-full space-y-5 bg-slate-900/40 p-8 rounded-3xl border border-white/5 shadow-3xl">
          {authError && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 text-[10px] py-3 px-4 rounded-xl font-black uppercase tracking-widest">{authError}</div>}
          <div>
            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 text-left">Your Handle</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. VocalistPrime" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold focus:border-teal-400 outline-none transition-all" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-600 uppercase tracking-widest mb-3 text-left">Passkey (Optional)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold focus:border-teal-400 outline-none transition-all" />
          </div>
          <button type="submit" className="w-full py-5 mt-4 bg-teal-400 text-slate-950 rounded-2xl font-black text-lg shadow-2xl shadow-teal-900/40 active:scale-95 transition-all uppercase tracking-widest">
            {isLoginMode ? 'Authorize' : 'Initialize'}
          </button>
          <button type="button" onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }} className="text-slate-600 hover:text-white text-[10px] font-black uppercase tracking-[0.2em] pt-6 block mx-auto">{isLoginMode ? "New User?" : "Back to Auth"}</button>
        </form>
      </div>
    );
  }

  if (!session) return null;

  const myRequests = session.requests.filter(r => r.participantId === participant.id);

  return (
    <div className="max-w-md mx-auto p-6 space-y-8 relative">
      <header className="bg-slate-900/40 rounded-3xl p-8 border border-white/5 relative shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 p-6">
          <button onClick={async () => { await logoutUser(); await refresh(); }} className="text-rose-500 hover:text-rose-400 text-[10px] font-black uppercase tracking-widest py-2 px-4 bg-rose-500/5 hover:bg-rose-500/10 rounded-xl transition-all border border-rose-500/10">Log Out</button>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="text-[10px] text-teal-400 font-black uppercase tracking-[0.4em] mb-2 px-4 py-1 bg-teal-400/5 rounded-full border border-teal-400/10">Secure Connection</div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mt-2">{participant.name}</h2>
          <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-4">Authorized Performer Account</div>
        </div>
      </header>



      {/* Persistent On Stage Now Section */}
      {session.currentRound && session.currentRound.length > 0 && (
        <section className="animate-in fade-in slide-in-from-top-2 space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-ping"></div>
            <h3 className="text-white font-black uppercase tracking-widest text-[10px]">On Stage Now</h3>
          </div>
          <div className="grid gap-4">
            {session.currentRound.map((song, i) => (
              <div key={song.id} className={`bg-slate-900/60 border p-6 rounded-3xl shadow-2xl transition-all ${i === 0 ? 'border-teal-400 ring-1 ring-teal-400/20' : 'border-white/5'}`}>
                <div className="flex justify-between items-start">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`font-black tracking-tight uppercase truncate ${i === 0 ? 'text-white text-lg' : 'text-slate-300'}`}>{song.songName}</div>
                      <VideoLink url={song.youtubeUrl} />
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{song.artist}</div>
                    <div className="mt-3 text-[11px] font-black text-teal-400 uppercase tracking-tighter">{song.participantName}</div>
                  </div>
                  {i === 0 && (
                    <div className="px-3 py-1 bg-teal-400 text-slate-950 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg shadow-teal-400/20">LIVE</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex bg-slate-950/60 p-1.5 rounded-2xl border border-white/5 shadow-inner">
        {(['ROTATION', 'REQUESTS', 'FAVORITES', 'HISTORY'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === tab ? 'bg-teal-400 text-slate-950 shadow-xl shadow-teal-900/20' : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            {tab === 'ROTATION' ? 'Rotation' :
              tab === 'REQUESTS' ? 'Requests' :
                tab === 'FAVORITES' ? 'Library' :
                  tab === 'HISTORY' ? 'History' : tab}
          </button>
        ))}
      </div>

      <button
        onClick={() => { setPrefillData(null); setShowRequestForm(true); }}
        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-3xl shadow-indigo-900/40 uppercase tracking-widest active:scale-95 transition-all"
      >
        + Queue Track
      </button>

      <div className="pt-4 space-y-8">
        <section className="flex justify-center">
          <button
            onClick={toggleStatus}
            className={`w-full py-8 rounded-[2.5rem] font-black text-2xl uppercase tracking-[0.2em] transition-all border-2 flex flex-col items-center justify-center gap-2 group shadow-2xl relative overflow-hidden ${participant.status === ParticipantStatus.READY
              ? 'bg-teal-400 text-slate-950 border-teal-300 shadow-teal-900/40 scale-105'
              : 'bg-slate-900 text-slate-500 border-white/5 hover:border-slate-700'
              }`}
          >
            {participant.status === ParticipantStatus.READY && (
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent opacity-50 group-hover:opacity-80 transition-opacity" />
            )}
            <span className="relative z-10">{participant.status === ParticipantStatus.READY ? 'IM READY' : 'CLICK TO START'}</span>
            <span className="relative z-10 text-[10px] tracking-[0.4em] font-black ${participant.status === ParticipantStatus.READY ? 'opacity-60' : 'opacity-30'}">
              {participant.status === ParticipantStatus.READY ? 'BROADCASTING STATUS' : 'CURRENTLY STANDBY'}
            </span>
          </button>
        </section>


      </div>

      {(showRequestForm || editingRequest) && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-6 z-50 overflow-y-auto backdrop-blur-2xl">
          <div className="w-full max-w-md space-y-6 py-10">
            <SongRequestForm
              key={editingRequest?.id || 'new-request'}
              title={editingRequest ? "Modify Request" : "Request Mode"}
              submitLabel={editingRequest ? "Save Update" : "Add to Rotation"}
              initialSongName={editingRequest?.songName || prefillData?.songName || ''}
              initialArtist={editingRequest?.artist || prefillData?.artist || ''}
              initialYoutubeUrl={editingRequest?.youtubeUrl || prefillData?.youtubeUrl || ''}
              initialType={editingRequest?.type || prefillData?.type || RequestType.SINGING}
              onSubmit={handleRequest}
              onCancel={closeModals}
            />
          </div>
        </div>
      )}

      <main className="min-h-[300px]">
        {activeTab === 'ROTATION' && (
          <section className="animate-in fade-in slide-in-from-bottom-2 space-y-8">
            {/* Rotation Queue Section */}
            <div className="space-y-4">
              <h3 className="text-slate-500 font-black uppercase tracking-widest text-[10px] px-2">Performance Queue</h3>
              <div className="space-y-3">
                {session.requests.filter(r => r.status === RequestStatus.APPROVED && !r.isInRound).length > 0 ? (
                  session.requests.filter(r => r.status === RequestStatus.APPROVED && !r.isInRound).map(req => (
                    <div key={req.id} className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl flex justify-between items-center group">
                      <div className="min-w-0 pr-2">
                        <div className="text-white font-bold uppercase truncate text-sm">{req.songName}</div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                          {req.artist} • <span className="text-teal-400/60">{req.participantName}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest bg-slate-800 text-slate-500 border border-white/5">Approved</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 opacity-20 bg-slate-900/20 rounded-3xl border border-dashed border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest">No tracks in queue</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'REQUESTS' && (
          <section className="animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-4">
              {myRequests.map(req => (
                <div key={req.id} className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl shadow-2xl transition-all hover:border-teal-400/20">
                  <div className="flex justify-between items-start mb-4">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-black text-white tracking-tight uppercase truncate">{req.songName}</div>
                        <VideoLink url={req.youtubeUrl} />
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{req.artist} • <span className={req.type === RequestType.SINGING ? 'text-teal-400' : 'text-indigo-400'}>{req.type}</span></div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2 shrink-0">
                      <div className={`text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] border ${req.status === RequestStatus.APPROVED ? 'bg-teal-400/10 text-teal-400 border-teal-400/20' : 'bg-slate-800 text-slate-600 border-white/5'}`}>{req.status === RequestStatus.APPROVED ? 'LIVE' : 'QUEUE'}</div>
                      {req.status === RequestStatus.PENDING && (
                        <div className="flex gap-4">
                          <button onClick={() => setEditingRequest(req)} className="text-[9px] font-black text-teal-400 hover:text-teal-300 uppercase tracking-widest underline underline-offset-4">Edit</button>
                          <button onClick={async () => { await deleteRequest(req.id); await refresh(); }} className="text-[9px] font-black text-rose-500/60 hover:text-rose-500 uppercase tracking-widest px-2">Cancel</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {myRequests.length === 0 && (
                <div className="text-center py-20 opacity-20">
                  <p className="text-xs font-bold uppercase italic">Your rotation is empty</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'FAVORITES' && userProfile && (
          <section className="animate-in fade-in slide-in-from-bottom-2 space-y-6">
            {/* Search Bar */}
            <div className="sticky top-0 z-20 pb-2">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="SEARCH SONGBOOK..."
                  value={librarySearchQuery}
                  onChange={(e) => setLibrarySearchQuery(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-black uppercase tracking-widest text-white placeholder:text-slate-600 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/20 transition-all backdrop-blur-xl"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors">🔍</span>
              </div>
            </div>

            <div className="space-y-4">
              {(() => {
                const combined = [
                  ...userProfile.favorites.map(f => ({ ...f, isFavorite: true })),
                  ...(session?.verifiedSongbook || [])
                    .filter(v => !userProfile.favorites.some(f => f.songName === v.songName && f.artist === v.artist))
                    .map(v => ({ ...v, isFavorite: false }))
                ].filter(song => {
                  if (!librarySearchQuery) return true;
                  const query = librarySearchQuery.toLowerCase();
                  return song.songName.toLowerCase().includes(query) || song.artist.toLowerCase().includes(query);
                });

                if (combined.length === 0) {
                  return (
                    <div className="text-center py-20 opacity-20">
                      <p className="text-xs font-bold uppercase italic">{librarySearchQuery ? 'No matching tracks' : 'Library is empty'}</p>
                    </div>
                  );
                }

                return combined.map(song => (
                  <div key={song.id} className="bg-slate-900/40 border border-white/5 p-5 rounded-3xl flex justify-between items-center group hover:border-white/10 transition-all">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <div className="text-white font-bold uppercase truncate">{song.songName}</div>
                        {song.isFavorite && <span className="text-[10px]" title="Personal Favorite">⭐️</span>}
                      </div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest">{song.artist}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setPrefillData({ ...song }); setShowRequestForm(true); }}
                        className="bg-teal-400 text-slate-950 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-teal-400/10 active:scale-95 transition-all"
                      >
                        Add
                      </button>
                      {song.isFavorite ? (
                        <button
                          onClick={async () => { await toggleFavorite(song); await refresh(); }}
                          className="text-slate-600 hover:text-rose-500 px-2 transition-colors"
                          title="Remove from Favorites"
                        >
                          ✕
                        </button>
                      ) : (
                        <button
                          onClick={async () => { await toggleFavorite(song); await refresh(); }}
                          className="text-slate-600 hover:text-teal-400 px-2 transition-colors"
                          title="Add to Favorites"
                        >
                          +⭐️
                        </button>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </section>
        )}

        {activeTab === 'HISTORY' && userProfile && (
          <section className="animate-in fade-in slide-in-from-bottom-2 space-y-4">
            {userProfile.personalHistory.map((h, i) => (
              <div key={i} className="bg-slate-900/40 border border-white/5 p-5 rounded-3xl flex justify-between items-center group">
                <div className="min-w-0 pr-2">
                  <div className="text-white font-bold uppercase truncate">{h.songName}</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-widest">{h.artist}</div>
                </div>
                <button
                  onClick={() => { setPrefillData({ ...h, type: RequestType.SINGING }); setShowRequestForm(true); }}
                  className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest border border-white/5 transition-all"
                >
                  Repeat
                </button>
              </div>
            ))}
            {userProfile.personalHistory.length === 0 && (
              <div className="text-center py-20 opacity-20">
                <p className="text-xs font-bold uppercase italic">No performance history found</p>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="pt-8 pb-12">
        <button
          onClick={() => setShowQrModal(true)}
          className="w-full bg-slate-900/60 backdrop-blur-xl border border-white/5 hover:border-indigo-400/30 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 transition-all group shadow-2xl"
        >
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-400/20 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">📱</div>
          <div className="text-center">
            <h4 className="text-xl font-black text-white uppercase tracking-tight">Invite Friends to Sing</h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 group-hover:text-teal-400 transition-colors">Tap to show session QR code</p>
          </div>
        </button>
      </footer>

      {showQrModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 z-[200] animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-slate-900 border border-teal-400/30 rounded-[3rem] p-10 shadow-3xl text-center relative overflow-hidden">
            <button onClick={() => setShowQrModal(false)} className="absolute top-8 right-8 text-slate-500 hover:text-white font-black">✕</button>
            <div className="bg-white p-6 rounded-[2rem] inline-block mb-8 shadow-2xl">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(roomJoinUrl)}&bgcolor=ffffff`} alt="Room QR" className="w-56 h-56" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 leading-none">Invite Others</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-8">Scan to join this SingMode session</p>
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-4 bg-teal-400 text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-teal-900/20"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantView;
