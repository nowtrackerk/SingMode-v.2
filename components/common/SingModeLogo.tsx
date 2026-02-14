import React from 'react';

export const SingModeLogo: React.FC<{ size?: 'sm' | 'md' | 'lg', className?: string }> = ({ size = 'md', className = '' }) => {
    const sizes = {
        sm: 'w-8 h-8 text-sm',
        md: 'w-12 h-12 text-xl',
        lg: 'w-24 h-24 text-4xl'
    };

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className={`${sizes[size]} bg-teal-400 rounded-xl flex items-center justify-center font-black text-slate-950 shadow-lg shadow-teal-400/20 transition-transform hover:scale-105`}>
                SM
            </div>
            <div className="font-outfit font-black tracking-tighter flex flex-col leading-none">
                <span className="text-teal-400 text-[0.6em] uppercase tracking-[0.4em] mb-1">Enter</span>
                <span className="text-white uppercase">SingMode</span>
            </div>
        </div>
    );
};
