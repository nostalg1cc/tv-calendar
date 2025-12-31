
import React, { useState, useEffect } from 'react';
import { Zap, X } from 'lucide-react';

const UpsideDownEffect: React.FC = () => {
    const [enabled, setEnabled] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Inject transparency styles into the document when enabled
    useEffect(() => {
        if (enabled) {
            document.body.classList.add('upside-down-mode');
            const handleMouseMove = (e: MouseEvent) => {
                // Calculate normalized mouse position (-1 to 1)
                const x = (e.clientX / window.innerWidth) * 2 - 1;
                const y = (e.clientY / window.innerHeight) * 2 - 1;
                setMousePos({ x, y });
            };
            window.addEventListener('mousemove', handleMouseMove);
            return () => {
                document.body.classList.remove('upside-down-mode');
                window.removeEventListener('mousemove', handleMouseMove);
            };
        } else {
            document.body.classList.remove('upside-down-mode');
        }
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
                /* 1. Base Transparency */
                body.upside-down-mode {
                    background-color: #020202 !important;
                }

                /* 2. Force Main Containers Transparent */
                body.upside-down-mode .bg-background,
                body.upside-down-mode .bg-panel,
                body.upside-down-mode .bg-card,
                body.upside-down-mode .bg-\[\#020202\],
                body.upside-down-mode .bg-\[\#09090b\],
                body.upside-down-mode .bg-zinc-950,
                body.upside-down-mode .bg-zinc-900,
                body.upside-down-mode .bg-black {
                    background-color: rgba(5, 10, 20, 0.65) !important; /* Slight dark tint to keep text readable */
                    backdrop-filter: blur(0px); /* Reduce blur so we can see the particles clearly */
                    border-color: rgba(255,255,255,0.08) !important;
                }

                /* 3. Specific Component Overrides */
                
                /* Sidebar */
                body.upside-down-mode nav {
                    background-color: rgba(0, 0, 0, 0.4) !important;
                    border-right: 1px solid rgba(255,255,255,0.05) !important;
                }

                /* Agenda / Right Sidebar */
                body.upside-down-mode aside {
                    background-color: rgba(0, 0, 0, 0.5) !important;
                    border-left: 1px solid rgba(255,255,255,0.05) !important;
                }

                /* Calendar Headers */
                body.upside-down-mode header,
                body.upside-down-mode .sticky {
                    background-color: rgba(0, 0, 0, 0.6) !important;
                    backdrop-filter: blur(8px) !important;
                }

                /* Calendar Empty Cells */
                body.upside-down-mode .bg-white\/\[0\.01\] {
                    background-color: transparent !important;
                }

                /* Reduce gradient opacities on posters so effects bleed through images slightly less, 
                   but we want the UI background to be the main transparent element */
                
                /* --- ANIMATIONS --- */
                
                @keyframes flash-internal {
                    0%, 90% { opacity: 0; }
                    92% { opacity: 0.6; filter: brightness(1.5); } 
                    93% { opacity: 0.2; }
                    94% { opacity: 0.4; }
                    96% { opacity: 0; }
                }

                @keyframes spore-drift {
                    0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
                    10% { opacity: 1; }
                    25% { transform: translate(20px, 20vh) rotate(90deg); }
                    50% { transform: translate(-15px, 40vh) rotate(180deg); }
                    75% { transform: translate(10px, 60vh) rotate(270deg); }
                    90% { opacity: 0.8; }
                    100% { transform: translate(-5px, 80vh) rotate(360deg); opacity: 0; }
                }

                @keyframes fog-roll {
                    0% { background-position: 0% 0%; }
                    100% { background-position: 100% 0%; }
                }
            `}</style>

            {/* --- BACKGROUND LAYER (Atmosphere & Lighting) --- */}
            {/* z-index -1 to sit BEHIND the app content */}
            <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden select-none">
                
                {/* 1. Deep Void Base */}
                <div className="absolute inset-0 bg-[#02050c]" />

                {/* 2. Red Internal Lightning (Behind the fog to look volumetric) */}
                <div className="absolute inset-0">
                     <div className="absolute top-[-20%] left-[20%] w-[60vw] h-[60vw] bg-[radial-gradient(circle,rgba(200,20,20,0.6)_0%,transparent_70%)] animate-[flash-internal_8s_infinite_ease-in-out] mix-blend-screen opacity-60" />
                     <div className="absolute bottom-[10%] right-[-10%] w-[80vw] h-[80vw] bg-[radial-gradient(circle,rgba(255,0,0,0.4)_0%,transparent_60%)] animate-[flash-internal_11s_infinite_linear] mix-blend-screen opacity-50" style={{ animationDelay: '2s' }} />
                </div>

                {/* 3. Rolling Fog / Clouds Texture */}
                <div className="absolute inset-0 opacity-40 mix-blend-overlay">
                     <svg className="hidden">
                        <filter id="cloud-texture">
                            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="5" />
                            <feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.3  0 0 0 0 0.4  0 0 0 1 0" />
                        </filter>
                    </svg>
                    <div 
                        className="absolute inset-0 w-[200%] h-full animate-[fog-roll_80s_linear_infinite]"
                        style={{ filter: 'url(#cloud-texture)' }} 
                    />
                </div>

                {/* 4. Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,#000000_100%)] opacity-80" />
            </div>


            {/* --- FOREGROUND LAYER (Particles) --- */}
            {/* z-index 9999 to sit ON TOP of the app content */}
            <div 
                className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden select-none transition-transform duration-200 ease-out"
                style={{
                    transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px)` // Parallax effect against mouse
                }}
            >
                {[...Array(60)].map((_, i) => {
                    const left = Math.random() * 100;
                    const duration = Math.random() * 20 + 20; // 20s - 40s (Very Slow)
                    const delay = Math.random() * -40;
                    const size = Math.random() * 3 + 2;
                    const isRound = Math.random() > 0.3; // 70% round spores
                    
                    return (
                        <div 
                            key={i}
                            className={`
                                absolute bg-slate-400/60 animate-[spore-drift_linear_infinite] shadow-[0_0_8px_rgba(200,200,255,0.2)]
                                ${isRound ? 'rounded-full' : 'rounded-sm'} blur-[1px]
                            `}
                            style={{
                                width: size + 'px',
                                height: (isRound ? size : size * 1.2) + 'px', 
                                left: left + '%',
                                top: '-10%', // Start above screen
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
