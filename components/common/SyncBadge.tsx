import React, { useState, useEffect } from 'react';
import { ViewRole } from '../../types';
import { syncService } from '../../services/syncService';

export const SyncBadge: React.FC<{ role: ViewRole }> = ({ role }) => {
    const [status, setStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
    const [roomId, setRoomId] = useState<string | null>(null);

    useEffect(() => {
        syncService.onConnectionStatus = setStatus;
        const interval = setInterval(() => {
            setRoomId(syncService.getRoomId());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (role === 'SELECT') return null;

    const getStatusColor = () => {
        if (status === 'connected') return 'bg-cyan-400';
        if (status === 'connecting') return 'bg-purple-500';
        return 'bg-pink-500';
    };

    const getStatusText = () => {
        if (role === 'DJ') return `HUB: ${roomId || '...'}`;
        if (status === 'connected') return 'LINKED';
        if (status === 'connecting') return 'SYNCING...';
        return 'OFFLINE';
    };

    return (
        <div className="fixed bottom-6 left-6 z-[60] flex items-center gap-3 bg-black/80 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] group hover:border-pink-500/50 transition-all">
            <div className="relative flex h-2 w-2">
                <div className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${getStatusColor()}`}></div>
                <div className={`relative inline-flex rounded-full h-2 w-2 ${getStatusColor()} shadow-[0_0_8px_currentColor]`}></div>
            </div>
            <span className={`text-[9px] font-black uppercase tracking-[0.3em] font-righteous ${status === 'connecting' ? 'text-purple-400' : (status === 'connected' ? 'text-cyan-400' : 'text-pink-500')}`}>
                {getStatusText()}
            </span>
        </div>
    );
};
