
import React, { useState, useEffect } from 'react';
import { Zap, X } from 'lucide-react';

const UpsideDownEffect: React.FC = () => {
    const [enabled, setEnabled] = useState(false);

    // Inject transparency styles into the document when enabled
    useEffect(() => {
        if (enabled) {
            document.body.classList.add('upside-down-mode');
        } else {
            document.body.classList.remove('upside-down-mode');
        }
        return () => document.body.classList.remove('upside-down-mode');
    }, [enabled]);

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
                className="fixed bottom-6 left-6 z-[9999] flex items-center justify-center w-12 h-12 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-all border border-white/10 backdrop-blur-md shadow-lg"
                title="Exit Reality"
            >
                <X className="w-5 h-5" />
            </button>

            {/* --- GLOBAL CSS OVERRIDES FOR TRANSPARENCY --- */}
            <style>{`
                /* Darken base background to blend with effect */
                body.upside-down-mode {
                    background-color: #050505 !important;
                }

                /* Make main layout containers semi-transparent */
                body.upside-down-mode .bg-background,
                body.upside-down-mode .bg-panel,
                body.upside-down-mode .bg-card,
                body.upside-down-mode .bg-\[\#020202\],
                body.upside-down-mode .bg-\[\#050505\],
                body.upside-down-mode .bg-\[\#09090b\],
                body.upside-down-mode .bg-zinc-950,
                body.upside-down-mode .bg-zinc-900 {
                    background-color: rgba(0, 2, 10, 0.45) !important;
                    backdrop-filter: blur(3px);
                    border-color: rgba(255,255,255,0.08) !important;
                }

                /* Sidebar and Agenda specific handling for readability */
                body.upside-down-mode nav, 
                body.upside-down-mode aside {
                    background-color: rgba(0, 0, 0, 0.6) !important;
                    backdrop-filter: blur(12px);
                    box-shadow: 10px 0 30px -10px rgba(0,0,0,0.5);
                }

                /* Reduce opacity of overlay gradients in posters to see effect */
                body.upside-down-mode .bg-gradient-to-t,
                body.upside-down-mode .bg-gradient-to-r {
                    opacity: 0.6;
                }
                
                /* Animation Definitions */
                @keyframes flash-deep {
                    0%, 100% { opacity: 0; }
                    2% { opacity: 0.4; } 
                    3% { opacity: 0.1; }
                    5% { opacity: 0.3; } 
                    40% { opacity: 0; }
                }
                
                @keyframes flash-burst {
                    0%, 90% { opacity: 0; }
                    92% { opacity: 0.6; filter: brightness(2); }
                    93% { opacity: 0.2; }
                    94% { opacity: 0.4; }
                    96% { opacity: 0; }
                }

                @keyframes ash-fall {
                    0% { 
                        transform: translateY(-10vh) translateX(0) rotate(0deg) scale(1); 
                        opacity: 0; 
                    }
                    10% { opacity: 0.8; }
                    50% { transform: translateY(50vh) translateX(20px) rotate(180deg); }
                    90% { opacity: 0.8; }
                    100% { 
                        transform: translateY(110vh) translateX(-20px) rotate(360deg) scale(0.8); 
                        opacity: 0; 
                    }
                }

                @keyframes fog-drift {
                    0% { background-position: 0% 0%; }
                    100% { background-position: 200% 0%; }
                }
            `}</style>

            {/* --- BACKGROUND LAYER (Atmosphere & Lighting) --- */}
            {/* z-index -1 to sit BEHIND the app content */}
            <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden select-none">
                
                {/* 1. Deep Base with Vignette */}
                <div className="absolute inset-0 bg-[#02040a]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_90%)] z-10" />

                {/* 2. Red Lightning (Behind Clouds) */}
                <div className="absolute inset-0 z-0">
                     {/* Distant reddish glow pulsing */}
                     <div className="absolute top-[-20%] left-[10%] w-[100vw] h-[100vw] bg-[radial-gradient(circle,rgba(150,0,0,0.15)_0%,transparent_60%)] animate-[pulse_4s_ease-in-out_infinite]" />
                     
                     {/* Sharp Lightning Bursts */}
                     <div className="absolute top-[10%] right-[20%] w-[60vw] h-[60vw] bg-[radial-gradient(circle,rgba(255,50,50,0.4)_0%,transparent_70%)] animate-[flash-burst_9s_infinite_linear]" style={{ mixBlendMode: 'color-dodge' }} />
                     <div className="absolute bottom-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-[radial-gradient(circle,rgba(200,20,20,0.3)_0%,transparent_70%)] animate-[flash-deep_14s_infinite_linear]" style={{ mixBlendMode: 'color-dodge' }} />
                </div>

                {/* 3. Moving Fog/Clouds (SVG Noise Texture) */}
                <div className="absolute inset-0 z-10 opacity-40 mix-blend-overlay">
                    <svg className="hidden">
                        <filter id="fog-noise">
                            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" seed="1" result="noise" />
                            <feDiffuseLighting in="noise" lightingColor="#fff" surfaceScale="2">
                                <feDistantLight azimuth="45" elevation="60" />
                            </feDiffuseLighting>
                        </filter>
                    </svg>
                    {/* Applying the filter to a div that moves */}
                    <div 
                        className="absolute inset-0 w-[200%] h-full animate-[fog-drift_60s_linear_infinite]"
                        style={{ 
                            background: '#1a2333',
                            filter: 'url(#fog-noise)',
                            opacity: 0.6
                        }} 
                    />
                </div>

                {/* 4. Film Grain / Static */}
                <div className="absolute inset-0 z-20 opacity-[0.08] mix-blend-overlay pointer-events-none" 
                     style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }} 
                />
            </div>


            {/* --- FOREGROUND LAYER (Particles) --- */}
            {/* z-index 9999 to sit ON TOP of the app content */}
            <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden select-none">
                
                {/* Ash Particles */}
                {/* Using a perspective container for depth feeling if needed, mostly 2D drift */}
                {[...Array(50)].map((_, i) => {
                    // Randomize initial positions and sizes
                    const left = Math.random() * 100;
                    const duration = Math.random() * 10 + 10; // 10-20s
                    const delay = Math.random() * -20;
                    const size = Math.random() * 4 + 2;
                    const rotation = Math.random() * 360;
                    
                    return (
                        <div 
                            key={i}
                            className="absolute bg-slate-400/50 shadow-[0_0_5px_rgba(255,255,255,0.2)] animate-[ash-fall_linear_infinite]"
                            style={{
                                width: size + 'px',
                                height: (Math.random() > 0.5 ? size : size * 1.5) + 'px', // Some rectangular
                                left: left + '%',
                                top: '-5%',
                                borderRadius: Math.random() > 0.7 ? '50%' : '1px', // Mostly sharp/square shards
                                transform: `rotate(${rotation}deg)`,
                                animationDuration: duration + 's',
                                animationDelay: delay + 's',
                            }}
                        />
                    );
                })}
            </div>
        </>
    );
};

export default UpsideDownEffect;
