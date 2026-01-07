
import React from 'react';
import { Link } from 'react-router-dom';
import { Tv, ArrowLeft, SignalHigh, WifiOff } from 'lucide-react';

const V2NotFound: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#020202] relative overflow-hidden h-full w-full font-sans text-white">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(50,50,55,0.4)_0%,transparent_70%)]" />
                <div 
                    className="absolute inset-0 opacity-30" 
                    style={{ 
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` 
                    }} 
                />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center p-8 max-w-lg animate-fade-in-up">
                <div className="relative mb-8">
                    <div className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl relative z-10">
                        <Tv className="w-10 h-10 text-zinc-500" />
                    </div>
                    {/* Glitch/Signal Effect behind icon */}
                    <div className="absolute -inset-2 bg-indigo-500/20 blur-xl rounded-full animate-pulse" />
                </div>

                <h1 className="text-8xl font-black text-white tracking-tighter leading-none mb-2 select-none" style={{ textShadow: '0 0 30px rgba(255,255,255,0.1)' }}>
                    404
                </h1>
                
                <div className="flex items-center gap-2 mb-6 px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Signal Lost</span>
                </div>

                <p className="text-zinc-400 text-sm md:text-base font-medium leading-relaxed mb-8">
                    The frequency you are trying to reach is currently off-air or does not exist in this timeline.
                </p>

                <Link 
                    to="/calendar" 
                    className="group relative px-8 py-4 bg-white text-black rounded-xl font-bold uppercase tracking-wider text-xs overflow-hidden transition-all hover:scale-105 active:scale-95"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-zinc-200 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="relative flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" /> Return to Grid
                    </span>
                </Link>
            </div>

            {/* Footer Tech Decor */}
            <div className="absolute bottom-8 flex gap-4 opacity-30 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                <span className="flex items-center gap-1"><WifiOff className="w-3 h-3" /> OFFLINE</span>
                <span>::</span>
                <span>ERR_NO_SIGNAL</span>
            </div>
        </div>
    );
};

export default V2NotFound;
