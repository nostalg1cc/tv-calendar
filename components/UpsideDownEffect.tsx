
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, X } from 'lucide-react';

const UpsideDownEffect: React.FC = () => {
    const [enabled, setEnabled] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const mouseRef = useRef({ x: -1000, y: -1000 });
    
    // --- PARTICLE SYSTEM CONFIG ---
    const PARTICLE_COUNT = 150;
    const REPULSION_RADIUS = 150;
    const REPULSION_STRENGTH = 2; // Gentle push
    const DRAG = 0.95; // Friction

    // --- TYPES ---
    type Particle = {
        x: number;
        y: number;
        vx: number;
        vy: number;
        size: number;
        angle: number;
        spin: number;
        alpha: number;
        baseVx: number;
        baseVy: number;
    };
    
    const particles = useRef<Particle[]>([]);

    // Initialize Particles
    const initParticles = useCallback((width: number, height: number) => {
        particles.current = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.current.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: 0,
                vy: 0,
                baseVx: (Math.random() - 0.5) * 0.5, // Very slow horizontal drift
                baseVy: Math.random() * 0.5 + 0.2,   // Slow downward fall
                size: Math.random() * 3 + 1,         // Small ash flakes
                angle: Math.random() * 360,
                spin: (Math.random() - 0.5) * 2,
                alpha: Math.random() * 0.6 + 0.2
            });
        }
    }, []);

    // Animation Loop
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.current.forEach(p => {
            // 1. Calculate Distance to Mouse
            const dx = p.x - mouseRef.current.x;
            const dy = p.y - mouseRef.current.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 2. Repulsion Physics (Push away if close)
            if (distance < REPULSION_RADIUS) {
                const forceDirectionX = dx / distance;
                const forceDirectionY = dy / distance;
                const force = (REPULSION_RADIUS - distance) / REPULSION_RADIUS;
                const strength = force * REPULSION_STRENGTH;
                
                p.vx += forceDirectionX * strength;
                p.vy += forceDirectionY * strength;
            }

            // 3. Apply Velocity & Drag (Return to natural drift)
            p.x += p.vx + p.baseVx;
            p.y += p.vy + p.baseVy;
            p.vx *= DRAG;
            p.vy *= DRAG;
            
            p.angle += p.spin;

            // 4. Wrap around screen
            if (p.y > canvas.height) p.y = -10;
            if (p.x > canvas.width) p.x = 0;
            if (p.x < 0) p.x = canvas.width;

            // 5. Draw Particle (Ash Shard)
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.angle * Math.PI) / 180);
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = '#b0b8c4'; // Blue-ish grey ash
            // Draw irregular shape (diamond/shard)
            ctx.beginPath();
            ctx.moveTo(0, -p.size);
            ctx.lineTo(p.size / 2, 0);
            ctx.lineTo(0, p.size);
            ctx.lineTo(-p.size / 2, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });

        requestRef.current = requestAnimationFrame(animate);
    }, []);

    // Setup Canvas & Listeners
    useEffect(() => {
        if (enabled) {
            const handleResize = () => {
                if (canvasRef.current) {
                    canvasRef.current.width = window.innerWidth;
                    canvasRef.current.height = window.innerHeight;
                    initParticles(window.innerWidth, window.innerHeight);
                }
            };

            const handleMouseMove = (e: MouseEvent) => {
                mouseRef.current = { x: e.clientX, y: e.clientY };
            };

            window.addEventListener('resize', handleResize);
            window.addEventListener('mousemove', handleMouseMove);
            
            handleResize(); // Init
            requestRef.current = requestAnimationFrame(animate);

            document.body.classList.add('upside-down-mode');

            return () => {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('mousemove', handleMouseMove);
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
                document.body.classList.remove('upside-down-mode');
            };
        } else {
            document.body.classList.remove('upside-down-mode');
        }
    }, [enabled, animate, initParticles]);

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

            {/* --- GLOBAL CSS OVERRIDES FOR EXTREME TRANSPARENCY --- */}
            <style>{`
                /* 1. Force Backgrounds to be visible through content */
                body.upside-down-mode {
                    background-color: #000000 !important;
                }

                /* 2. Target specific structure elements to be transparent */
                body.upside-down-mode nav, 
                body.upside-down-mode aside,
                body.upside-down-mode header,
                body.upside-down-mode main {
                    background-color: rgba(0, 0, 0, 0.1) !important; /* 10% opacity as requested */
                    backdrop-filter: blur(2px) !important;
                    border-color: rgba(255, 255, 255, 0.05) !important;
                }

                /* 3. Target Tailwind Utility Classes used in V2 Components */
                body.upside-down-mode .bg-background,
                body.upside-down-mode .bg-panel,
                body.upside-down-mode .bg-card,
                body.upside-down-mode .bg-zinc-950,
                body.upside-down-mode .bg-zinc-900,
                body.upside-down-mode .bg-zinc-800,
                body.upside-down-mode .bg-black {
                    background-color: rgba(0, 0, 0, 0.15) !important;
                    box-shadow: none !important;
                }
                
                /* 4. Calendar specific transparency */
                body.upside-down-mode .bg-white\\/\\[0\\.01\\], 
                body.upside-down-mode .bg-white\\/\\[0\\.04\\] {
                    background-color: transparent !important;
                }

                /* 5. Reduce Text Contrast slightly to blend */
                body.upside-down-mode .text-zinc-900 { color: #ccc !important; }

                /* 6. Animations */
                @keyframes deep-flash {
                    0%, 100% { opacity: 0; }
                    2% { opacity: 0.8; filter: brightness(1.2); }
                    3% { opacity: 0.1; }
                    6% { opacity: 0.4; }
                    50% { opacity: 0; }
                }

                @keyframes slow-fog {
                    0% { background-position: 0% 0%; }
                    100% { background-position: 100% 0%; }
                }
            `}</style>

            {/* --- BACKGROUND LAYER (Atmosphere & Lighting) --- */}
            {/* z-index -1 to sit BEHIND the app content */}
            <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden select-none">
                
                {/* 1. Deep Void Base */}
                <div className="absolute inset-0 bg-[#03050a]" />

                {/* 2. Red Internal Lightning (Behind the fog to look volumetric) */}
                <div className="absolute inset-0 mix-blend-screen">
                     {/* Giant distant glow */}
                     <div className="absolute -top-[20%] -left-[10%] w-[80vw] h-[80vw] bg-[radial-gradient(circle,rgba(255,0,0,0.15)_0%,transparent_70%)] animate-[pulse_8s_infinite]" />
                     
                     {/* Sharp flashes */}
                     <div className="absolute top-[10%] left-[30%] w-[60vw] h-[60vw] bg-[radial-gradient(circle,rgba(255,50,50,0.5)_0%,transparent_60%)] animate-[deep-flash_12s_infinite_linear]" />
                     <div className="absolute bottom-[0%] right-[10%] w-[50vw] h-[50vw] bg-[radial-gradient(circle,rgba(200,20,20,0.4)_0%,transparent_60%)] animate-[deep-flash_19s_infinite_linear]" style={{ animationDelay: '5s' }} />
                </div>

                {/* 3. Rolling Fog / Clouds Texture */}
                <div className="absolute inset-0 opacity-50 mix-blend-overlay">
                     <svg className="hidden">
                        <filter id="cloud-texture">
                            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="5" seed="10" />
                            <feColorMatrix type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.3  0 0 0 0 0.4  0 0 0 1 0" />
                        </filter>
                    </svg>
                    <div 
                        className="absolute inset-0 w-[200%] h-full animate-[slow-fog_60s_linear_infinite]"
                        style={{ filter: 'url(#cloud-texture)' }} 
                    />
                </div>

                {/* 4. Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_100%)] opacity-90" />
            </div>

            {/* --- FOREGROUND LAYER (Canvas Particles) --- */}
            {/* z-index 9999 to sit ON TOP of everything */}
            <canvas 
                ref={canvasRef}
                className="fixed inset-0 z-[9999] pointer-events-none"
            />
        </>
    );
};

export default UpsideDownEffect;
