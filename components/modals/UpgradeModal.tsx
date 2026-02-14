import React from 'react';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpgrade: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[1000] backdrop-blur-2xl">
            <div className="max-w-md w-full bg-slate-900 border border-teal-400/30 rounded-[3rem] p-10 lg:p-14 text-center shadow-3xl">
                <div className="w-24 h-24 bg-teal-400 text-slate-950 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-5xl font-black shadow-2xl shadow-teal-400/20">
                    SM
                </div>
                <h2 className="text-4xl font-black text-white font-outfit uppercase mb-3 tracking-tighter">SingMode Pro</h2>
                <p className="text-slate-400 mb-10 text-base font-medium leading-relaxed">
                    Unlock the ultimate theater experience. Stage mode, visual vibrance, and custom broadcasts.
                </p>

                <div className="space-y-5 mb-12">
                    <div className="flex items-center gap-4 text-left p-4 bg-white/5 rounded-2xl">
                        <span className="text-teal-400 text-xl font-bold">✓</span>
                        <span className="text-sm font-bold text-slate-200">Stage View (Theater Mode)</span>
                    </div>
                    <div className="flex items-center gap-4 text-left p-4 bg-white/5 rounded-2xl">
                        <span className="text-teal-400 text-xl font-bold">✓</span>
                        <span className="text-sm font-bold text-slate-200">Custom Broadcast Tickers</span>
                    </div>
                    <div className="flex items-center gap-4 text-left p-4 bg-white/5 rounded-2xl">
                        <span className="text-teal-400 text-xl font-bold">✓</span>
                        <span className="text-sm font-bold text-slate-200">AI Visual Vibe Generator</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={onUpgrade}
                        className="w-full py-5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-black rounded-2xl text-xl transition-all shadow-2xl shadow-teal-900/40 uppercase tracking-widest active:scale-95"
                    >
                        Upgrade Now
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-4 text-slate-500 hover:text-white font-black text-xs uppercase tracking-widest"
                    >
                        Not Today
                    </button>
                </div>
            </div>
        </div>
    );
};
