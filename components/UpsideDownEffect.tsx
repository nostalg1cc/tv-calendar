
import React, { useState } from 'react';
import { Zap, X } from 'lucide-react';

const UpsideDownEffect: React.FC = () => {
    const [enabled, setEnabled] = useState(false);

    if (!enabled) {
        return (
            <button 
                onClick={() => setEnabled(true)}
                className="fixed bottom-6 left-6 z-[9999] group flex items-center justify-center w-12 h-12 bg-red-900/20 hover:bg-red-900/80 text-red-500 hover:text-red-100 rounded-full transition-all duration-500 border border-red-900/50 backdrop-blur-sm shadow-[0_0_20px_rgba(153,27,27,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]"
                title="Enter the Upside Down"
            >
                <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
        );
    }

    return (
        <>
            <button 
                onClick={() => setEnabled(false)}
                className="fixed bottom-6 left-6 z-[9999] flex items-center justify-center w-12 h-12 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-all border border-white/10 backdrop-blur-md"
                title="Exit Reality"
            >
                <X className="w-5 h-5" />
            </button>

            {/* Container for the effect, ensuring it doesn't block clicks on underlying elements */}
            <div className="fixed inset-0 z-[9990] pointer-events-none overflow-hidden font-sans">
                
                {/* 1. Base Atmosphere: Cold blue tint, slightly desaturated */}
                <div className="absolute inset-0 bg-[#0f172a]/40 mix-blend-hard-light animate-pulse-slow" />
                <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay" />
                
                {/* Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />

                {/* 2. Red Lightning Flash (7s loop) */}
                <div className="absolute inset-0 bg-red-600/30 mix-blend-color-dodge animate-flash opacity-0" />

                {/* 3. Ash Particles */}
                <div className="absolute inset-0 opacity-80">
                    {[...Array(50)].map((_, i) => (
                        <div 
                            key={i}
                            className="absolute rounded-full bg-slate-300/60 blur-[0.5px] animate-ash"
                            style={{
                                width: Math.random() * 3 + 1 + 'px',
                                height: Math.random() * 3 + 1 + 'px',
                                left: Math.random() * 100 + '%',
                                top: Math.random() * 100 + '%',
                                animationDuration: Math.random() * 15 + 10 + 's',
                                animationDelay: -Math.random() * 20 + 's',
                                opacity: Math.random() * 0.6 + 0.2
                            }}
                        />
                    ))}
                </div>

                {/* CSS styles inline for portability */}
                <style>{`
                    @keyframes flash {
                        0%, 88%, 100% { opacity: 0; background-color: rgba(220, 38, 38, 0.1); }
                        90% { opacity: 0.8; background-color: rgba(220, 38, 38, 0.4); } 
                        91% { opacity: 0; }
                        93% { opacity: 0.4; background-color: rgba(220, 38, 38, 0.2); } 
                        94% { opacity: 0; }
                    }

                    @keyframes ash {
                        0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
                        10% { opacity: 1; }
                        50% { transform: translateY(-50vh) translateX(20px) rotate(180deg); }
                        90% { opacity: 1; }
                        100% { transform: translateY(-100vh) translateX(-20px) rotate(360deg); opacity: 0; }
                    }

                    @keyframes pulse-slow {
                        0%, 100% { opacity: 0.8; }
                        50% { opacity: 0.6; }
                    }
                    
                    .animate-flash {
                        animation: flash 7s infinite linear;
                    }
                    
                    .animate-ash {
                        animation-name: ash;
                        animation-timing-function: linear;
                        animation-iteration-count: infinite;
                    }
                    
                    .animate-pulse-slow {
                        animation: pulse-slow 4s ease-in-out infinite;
                    }
                `}</style>
            </div>
        </>
    );
};

export default UpsideDownEffect;
