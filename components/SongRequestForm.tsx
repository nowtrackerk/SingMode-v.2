

import React, { useState } from 'react';
import { RequestType } from '../types';

interface SongRequestFormProps {
  onSubmit: (data: { singerName?: string, songName: string, artist: string, youtubeUrl?: string, type: RequestType }) => void;
  onCancel: () => void;
  title?: string;
  showSingerName?: boolean;
  initialSingerName?: string;
  initialSongName?: string;
  initialArtist?: string;
  initialYoutubeUrl?: string;
  initialType?: RequestType;
  submitLabel?: string;
}

const SongRequestForm: React.FC<SongRequestFormProps> = ({
  onSubmit,
  onCancel,
  title = "Global Track Input",
  showSingerName = false,
  initialSingerName = '',
  initialSongName = '',
  initialArtist = '',
  initialYoutubeUrl = '',
  initialType = RequestType.SINGING,
  submitLabel = "Process Request"
}) => {
  const [singerName, setSingerName] = useState(initialSingerName);
  const displayTitle = singerName ? `${title}: ${singerName}` : title;
  const [songName, setSongName] = useState(initialSongName);
  const [artist, setArtist] = useState(initialArtist);
  const [youtubeUrl, setYoutubeUrl] = useState(initialYoutubeUrl);
  const [type, setType] = useState<RequestType>(initialType);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!songName || !artist) && !youtubeUrl) return;
    if (showSingerName && !singerName) return;
    onSubmit({ singerName, songName, artist, youtubeUrl, type });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-black/80 p-10 rounded-3xl shadow-3xl neon-border-pink animate-in fade-in zoom-in-95 duration-300 backdrop-blur-md">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-3xl font-black text-white font-bungee-shade uppercase tracking-tighter leading-none neon-glow-pink">{displayTitle}</h3>
          <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-[0.3em] mt-2 font-space-mono neon-glow-cyan">SingMode Operations</p>
        </div>
      </div>

      {showSingerName && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3 ml-2 font-space-mono">Performer Alias</label>
          <input
            type="text"
            required
            value={singerName}
            onChange={(e) => setSingerName(e.target.value)}
            placeholder="Handle"
            className="w-full bg-black border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold focus:neon-border-cyan outline-none transition-all uppercase shadow-inner"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3 ml-2 font-space-mono">Track Title</label>
          <input
            type="text"
            value={songName}
            onChange={(e) => setSongName(e.target.value)}
            placeholder="Title"
            className="w-full bg-black border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold focus:neon-border-cyan outline-none transition-all uppercase shadow-inner"
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3 ml-2 font-space-mono">Artist</label>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist"
            className="w-full bg-black border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold focus:neon-border-cyan outline-none transition-all uppercase shadow-inner"
          />
        </div>
      </div>

      <div className="relative pt-2">
        <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3 ml-2 font-space-mono">Source URL (Override)</label>
        <input
          type="url"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full bg-black border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold focus:neon-border-cyan outline-none transition-all text-xs shadow-inner"
        />
      </div>

      <div>
        <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3 ml-2 font-space-mono">Mode</label>
        <div className="flex bg-black p-1.5 rounded-2xl border border-slate-800 shadow-inner">
          {(Object.values(RequestType)).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all font-space-mono ${type === t
                ? 'bg-cyan-400 text-black shadow-2xl shadow-cyan-900/40 neon-border-cyan'
                : 'text-slate-600 hover:text-cyan-400'
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-5 bg-black hover:bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-white/10 font-space-mono"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-[2] py-5 bg-pink-500 hover:bg-pink-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-3xl shadow-pink-900/40 transition-all active:scale-95 neon-border-pink font-space-mono"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

export default SongRequestForm;
