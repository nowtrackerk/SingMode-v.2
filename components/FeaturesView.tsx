import React from 'react';
import { SingModeLogo } from './common/SingModeLogo';

interface FeaturesViewProps {
    onBack: () => void;
}

const FeatureCard: React.FC<{ title: string; icon: string; description: string; items: string[] }> = ({ title, icon, description, items }) => (
    <div className="bg-black/40 border border-white/5 p-10 rounded-[3.5rem] hover:neon-border-pink transition-all backdrop-blur-xl group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-pink-500/10 transition-colors" />
        <div className="w-20 h-20 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center text-4xl mb-8 group-hover:scale-110 group-hover:bg-pink-500 group-hover:text-white transition-all shadow-2xl relative z-10">
            {icon}
        </div>
        <h3 className="text-3xl font-black text-white font-bungee uppercase mb-4 tracking-tighter group-hover:text-pink-500 transition-colors relative z-10 leading-none">{title}</h3>
        <p className="text-slate-500 mb-8 font-black uppercase text-[10px] tracking-[0.2em] font-righteous leading-relaxed relative z-10 opacity-70 group-hover:opacity-100 transition-opacity">{description}</p>
        <ul className="space-y-4 relative z-10">
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-[11px] text-white/50 font-black uppercase tracking-widest font-righteous group-hover:text-cyan-400 transition-colors">
                    <span className="text-cyan-400 font-black">»</span>
                    {item}
                </li>
            ))}
        </ul>
    </div>
);

const FeaturesView: React.FC<FeaturesViewProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-black text-slate-200 p-8 md:p-16 relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 z-50"></div>
            <div className="absolute -top-[500px] -right-[500px] w-[1000px] h-[1000px] bg-pink-500/5 blur-[200px] rounded-full"></div>
            <div className="absolute -bottom-[500px] -left-[500px] w-[1000px] h-[1000px] bg-cyan-500/5 blur-[200px] rounded-full"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-24 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div onClick={onBack} className="cursor-pointer hover:scale-105 transition-transform">
                        <SingModeLogo size="sm" />
                    </div>
                    <button
                        onClick={onBack}
                        className="px-8 py-3 bg-black border border-white/10 hover:neon-border-pink text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] font-righteous transition-all"
                    >
                        RETURN TO HUB
                    </button>
                </div>

                {/* Hero Section */}
                <div className="text-center max-w-4xl mx-auto mb-32 animate-in fade-in zoom-in duration-700 delay-100">
                    <h1 className="text-6xl md:text-8xl font-black font-bungee text-white mb-8 tracking-tighter uppercase leading-none neon-glow-pink">
                        The ultimate <span className="text-cyan-400">karaoke</span> os
                    </h1>
                    <p className="text-[12px] md:text-sm text-cyan-400/60 font-black uppercase tracking-[0.5em] font-righteous leading-relaxed max-w-2xl mx-auto">
                        SingMode transforms any arena into a high-fidelity visual theater.
                        Connect instantly, dominate the queue, and emit your signal.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 mb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    <FeatureCard
                        title="DJ Console"
                        icon="🎧"
                        description="The command center for your sessions. Maintain signal flow."
                        items={[
                            "Real-time Queue Logic",
                            "Drag & Drop Sequencer",
                            "Instant Signal Auth",
                            "Master Output Control"
                        ]}
                    />
                    <FeatureCard
                        title="Singer Web"
                        icon="🎤"
                        description="A personal terminal for every guest. Eliminate analog friction."
                        items={[
                            "Identity Transmission",
                            "Smart Vector Search",
                            "High-Speed Requests",
                            "Live Sync Lyrics"
                        ]}
                    />
                    <FeatureCard
                        title="Theater Box"
                        icon="🎭"
                        description="A stunning visual matrix for the main screen. Pure aesthetics."
                        items={[
                            "Ultra-HD Playback",
                            "Generative Backgrounds",
                            "Active HUD Overlays",
                            "QR Signal Entrance"
                        ]}
                    />
                    <FeatureCard
                        title="Hybrid AI"
                        icon="✨"
                        description="Gemini integration enhances the arena with predictive logic."
                        items={[
                            "Vibe-Matched Vectors",
                            "Dynamic Visual Synthesis",
                            "Automated Interstitials",
                            "Identity Verification"
                        ]}
                    />
                    <FeatureCard
                        title="Sync Matrix"
                        icon="⚡"
                        description="Real-time P2P technology keeps the cluster in perfect sync."
                        items={[
                            "Zero-Latency State",
                            "Decentralized Design",
                            "Instant Node Creation",
                            "Omni-Device Support"
                        ]}
                    />
                    <FeatureCard
                        title="Prime Suite"
                        icon="💎"
                        description="Unlock premium protocols for venues and power units."
                        items={[
                            "Broadcast Protocols",
                            "Branding Overlays",
                            "Logic Routing",
                            "Priority Channel"
                        ]}
                    />
                </div>

                {/* CTA */}
                <div className="text-center animate-in fade-in duration-700 delay-500 pb-32">
                    <button
                        onClick={onBack}
                        className="px-16 py-8 bg-cyan-400 hover:bg-cyan-300 text-black rounded-[3rem] font-black text-2xl uppercase tracking-[0.3em] font-righteous shadow-[0_0_50px_rgba(34,211,238,0.3)] hover:scale-105 transition-all"
                    >
                        INITIATE SESSION
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeaturesView;
