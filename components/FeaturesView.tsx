import React from 'react';
import { SingModeLogo } from './common/SingModeLogo';

interface FeaturesViewProps {
    onBack: () => void;
}

const FeatureCard: React.FC<{ title: string; icon: string; description: string; items: string[] }> = ({ title, icon, description, items }) => (
    <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] hover:border-teal-400/30 transition-all hover:bg-slate-800/40 group">
        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 group-hover:bg-teal-400 group-hover:text-slate-950 transition-all shadow-xl">
            {icon}
        </div>
        <h3 className="text-2xl font-black text-white font-outfit uppercase mb-3 tracking-tight">{title}</h3>
        <p className="text-slate-400 mb-6 font-medium leading-relaxed">{description}</p>
        <ul className="space-y-3">
            {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300 font-medium">
                    <span className="text-teal-400 mt-1">ok</span>
                    {item}
                </li>
            ))}
        </ul>
    </div>
);

const FeaturesView: React.FC<FeaturesViewProps> = ({ onBack }) => {
    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 p-6 md:p-12">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div onClick={onBack} className="cursor-pointer hover:opacity-80 transition-opacity">
                        <SingModeLogo size="sm" />
                    </div>
                    <button
                        onClick={onBack}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-xs uppercase tracking-widest border border-white/10 transition-all"
                    >
                        Back to Home
                    </button>
                </div>

                {/* Hero Section */}
                <div className="text-center max-w-3xl mx-auto mb-20 animate-in fade-in zoom-in duration-700 delay-100">
                    <h1 className="text-5xl md:text-7xl font-black font-outfit text-white mb-6 tracking-tighter uppercase">
                        The Ultimate <span className="text-teal-400">Karaoke</span> OS
                    </h1>
                    <p className="text-xl text-slate-400 font-medium leading-relaxed">
                        SingMode transforms any room into a high-end karaoke theater.
                        Connect devices instantly, manage the queue, and perform like a superstar.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                    <FeatureCard
                        title="DJ Console"
                        icon="🎧"
                        description="The command center for your karaoke session. Maintain flow and manage the energy."
                        items={[
                            "Real-time Queue Management",
                            "Drag & Drop Reordering",
                            "Instant Track Approvals",
                            "Volume & Playback Control"
                        ]}
                    />
                    <FeatureCard
                        title="Singer Interface"
                        icon="🎤"
                        description="A personal remote for every guest. No more passing around sticky sticky books."
                        items={[
                            "Personal Song History",
                            "Smart Search with AI",
                            "One-Tap Requests",
                            "Live Lyrics on Device"
                        ]}
                    />
                    <FeatureCard
                        title="Theater Mode"
                        icon="🎭"
                        description="A stunning visual experience for the main screen. Lyrics, videos, and vibes."
                        items={[
                            "4K Video Playback",
                            "Dynamic Ambient Backgrounds",
                            "Next Up Tickers",
                            "QR Code Joining"
                        ]}
                    />
                    <FeatureCard
                        title="AI Powered"
                        icon="✨"
                        description="Gemini AI integration enhances the party with smart suggestions and visuals."
                        items={[
                            "Vibe-Based Song Search",
                            "Generative Visual Themes",
                            "Smart DJ Intros",
                            "Artist Verification"
                        ]}
                    />
                    <FeatureCard
                        title="Sync Core"
                        icon="⚡"
                        description="Real-time P2P technology keeps everyone in perfect sync without a server."
                        items={[
                            "Zero-Latency State Sync",
                            "No Login Required",
                            "Instant Room Creation",
                            "Cross-Device Compatible"
                        ]}
                    />
                    <FeatureCard
                        title="Pro Suite"
                        icon="💎"
                        description="Unlock premium tools for venues and power users."
                        items={[
                            "Custom Broadcast Messages",
                            "Venue Branding",
                            "Advanced Audio Routing",
                            "Priority Support"
                        ]}
                    />
                </div>

                {/* CTA */}
                <div className="text-center animate-in fade-in duration-700 delay-500">
                    <button
                        onClick={onBack}
                        className="px-12 py-6 bg-teal-400 hover:bg-teal-300 text-slate-950 rounded-[2rem] font-black text-xl uppercase tracking-widest shadow-2xl shadow-teal-400/20 hover:scale-105 transition-all"
                    >
                        Start Singing
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeaturesView;
