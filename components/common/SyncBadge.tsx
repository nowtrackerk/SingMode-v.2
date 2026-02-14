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
        if (status === 'connected') return 'bg-teal-400';
        if (status === 'connecting') return 'bg-amber-400';
        return 'bg-rose-500';
    };

    const getStatusText = () => {
        if (role === 'DJ') return `Hub Active: ${roomId || '...'}`;
        if (status === 'connected') return 'Linked to Hub';
        if (status === 'connecting') return 'Reconnecting...';
        return 'Offline';
    };

    return (
        <div className="fixed bottom-4 left-4 z-[60] flex items-center gap-2 bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-full border border-white/5 shadow-2xl">
            <div className="relative flex h-2 w-2">
                <div className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getStatusColor()}`}></div>
                <div className={`relative inline-flex rounded-full h-2 w-2 ${getStatusColor()}`}></div>
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest ${status === 'connecting' ? 'text-amber-400' : 'text-slate-300'}`}>
                {getStatusText()}
            </span>
        </div>
    );
};
