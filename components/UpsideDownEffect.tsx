
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
            <div className="fixed inset-0 z-[9990] pointer-events-none overflow-hidden font-sans select-none">
                
                {/* SVG Filters for Organic Textures */}
                <svg className="hidden">
                    <filter id="cloud-noise">
                        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="5" />
                        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.4 0" />
                        <feComposite operator="in" in2="SourceGraphic" result="monoNoise"/>
                        <feBlend in="SourceGraphic" in2="monoNoise" mode="screen" />
                    </filter>
                </svg>

                {/* 1. Base Atmosphere: Dark, cold, oppressive blue-grey */}
                <div className="absolute inset-0 bg-[#080b14] opacity-95" />

                {/* 2. Procedural Fog/Clouds Layer */}
                <div className="absolute inset-0 opacity-60 mix-blend-overlay animate-drift">
                     {/* We use a large div with the SVG filter applied to create the cloudy texture */}
                    <div className="w-[120%] h-[120%] -top-[10%] -left-[10%] absolute bg-[#2a3b55]" style={{ filter: 'url(#cloud-noise)' }} />
                </div>
                
                {/* 3. Red Lightning (Emitting FROM the clouds) */}
                {/* Using Color Dodge on the cloud texture creates the "internal lighting" look */}
                <div className="absolute inset-0 mix-blend-color-dodge opacity-80">
                     {/* Primary Bolt Source */}
                     <div className="absolute top-[-10%] left-[20%] w-[80vw] h-[80vw] bg-[radial-gradient(circle,rgba(255,50,50,0.8)_0%,transparent_60%)] animate-flash opacity-0 blur-3xl" />
                     {/* Secondary Distant Bolt */}
                     <div className="absolute bottom-[10%] right-[-10%] w-[60vw] h-[60vw] bg-[radial-gradient(circle,rgba(220,20,20,0.6)_0%,transparent_70%)] animate-flash-delayed opacity-0 blur-2xl" />
                </div>

                {/* 4. Film Grain / Static overlay for grittiness */}
                <div className="absolute inset-0 bg-transparent opacity-10 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }} />

                {/* 5. Heavy Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(0,0,0,0.9)_90%)]" />

                {/* 6. Ash Particles */}
                {/* Less round, varying opacity, rotation */}
                <div className="absolute inset-0 perspective-[500px]">
                    {[...Array(60)].map((_, i) => (
                        <div 
                            key={i}
                            className="absolute bg-slate-400/40 animate-ash"
                            style={{
                                width: Math.random() * 4 + 2 + 'px',
                                height: Math.random() * 4 + 2 + 'px',
                                left: Math.random() * 100 + '%',
                                top: Math.random() * 100 + '%',
                                borderRadius: Math.random() > 0.6 ? '1px' : '0px', // Almost squares
                                transform: `rotate(${Math.random() * 360}deg)`,
                                animationDuration: Math.random() * 8 + 12 + 's', // Slower fall
                                animationDelay: -Math.random() * 20 + 's',
                                opacity: Math.random() * 0.4 + 0.1
                            }}
                        />
                    ))}
                </div>

                {/* CSS styles inline for portability */}
                <style>{`
                    @keyframes flash {
                        0% { opacity: 0; }
                        2% { opacity: 1; filter: brightness(1.5); } 
                        4% { opacity: 0.1; }
                        6% { opacity: 0.8; } 
                        40% { opacity: 0; }
                        100% { opacity: 0; }
                    }
                    
                    @keyframes flash-delayed {
                        0%, 50% { opacity: 0; }
                        52% { opacity: 0.6; }
                        54% { opacity: 0.1; }
                        56% { opacity: 0.4; }
                        70% { opacity: 0; }
                        100% { opacity: 0; }
                    }

                    @keyframes ash {
                        0% { 
                            transform: translateY(0) translateX(0) rotate(0deg) scale(1); 
                            opacity: 0; 
                        }
                        10% { opacity: 1; }
                        100% { 
                            transform: translateY(-110vh) translateX(-40px) rotate(720deg) scale(0.5); 
                            opacity: 0; 
                        }
                    }

                    @keyframes drift {
                        0%, 100% { transform: scale(1) translate(0, 0); }
                        50% { transform: scale(1.05) translate(-10px, 5px); }
                    }
                    
                    .animate-flash {
                        animation: flash 7s infinite linear;
                    }

                    .animate-flash-delayed {
                        animation: flash-delayed 7s infinite linear;
                    }
                    
                    .animate-ash {
                        animation-name: ash;
                        animation-timing-function: linear;
                        animation-iteration-count: infinite;
                    }

                    .animate-drift {
                        animation: drift 20s ease-in-out infinite;
                    }
                `}</style>
            </div>
        </>
    );
};

export default UpsideDownEffect;
