
import React, { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';

const UpsideDownEffect: React.FC = () => {
    const { settings } = useStore();
    // Check activeTheme property
    const enabled = settings.activeTheme === 'upside-down' || !!settings.upsideDownMode;
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | null>(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });
    
    // --- CONFIG ---
    const PARTICLE_COUNT = 50; 
    const MOUSE_RADIUS = 300; 
    const PUSH_FORCE = 20; 
    const DRAG_SPEED = 0.02;

    // --- TYPES ---
    type Particle = {
        originX: number; 
        originY: number; 
        x: number;       
        y: number;
        offX: number;    
        offY: number;
        size: number;
        opacity: number;
        fallSpeed: number;
    };
    
    const particles = useRef<Particle[]>([]);

    const initParticles = useCallback((width: number, height: number) => {
        particles.current = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.current.push({
                originX: Math.random() * width,
                originY: Math.random() * height,
                x: 0,
                y: 0,
                offX: 0,
                offY: 0,
                size: Math.random() * 3 + 1, // Smaller, ash-like
                opacity: Math.random() * 0.5 + 0.2,
                fallSpeed: Math.random() * 0.3 + 0.1
            });
        }
    }, []);

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const mouse = mouseRef.current;

        particles.current.forEach(p => {
            // 1. Environmental Drift 
            p.originY += p.fallSpeed;
            if (p.originY > canvas.height + 50) p.originY = -50;
            
            // 2. Mouse Interaction
            const dx = p.originX - mouse.x;
            const dy = p.originY - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            let targetOffX = 0;
            let targetOffY = 0;

            if (dist < MOUSE_RADIUS) {
                const angle = Math.atan2(dy, dx);
                const force = Math.pow((MOUSE_RADIUS - dist) / MOUSE_RADIUS, 2); 
                const moveDist = force * PUSH_FORCE;
                
                targetOffX = Math.cos(angle) * moveDist;
                targetOffY = Math.sin(angle) * moveDist;
            }

            // 3. Smooth Interpolation
            p.offX += (targetOffX - p.offX) * DRAG_SPEED;
            p.offY += (targetOffY - p.offY) * DRAG_SPEED;

            // 4. Calculate Final Position
            p.x = p.originX + p.offX;
            p.y = p.originY + p.offY;

            // 5. Draw (Soft Ash)
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(180, 180, 190, ${p.opacity})`;
            ctx.shadowBlur = 8;
            ctx.shadowColor = `rgba(200, 200, 210, 0.5)`;
            ctx.fill();
        });

        requestRef.current = requestAnimationFrame(animate);
    }, []);

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
            
            handleResize(); 
            requestRef.current = requestAnimationFrame(animate);
            // We don't add the class anymore, we rely on data-base-theme attribute which is set by store

            return () => {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('mousemove', handleMouseMove);
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
            };
        }
    }, [enabled, animate, initParticles]);

    if (!enabled) return null;

    return (
        <>
            {/* THEME SPECIFIC STYLES */}
            <style>{`
                @import url('https://fonts.cdnfonts.com/css/itc-benguiat');

                /* Upside Down Theme Overrides */
                body[data-base-theme="upside-down"] {
                    /* Ensure font override works if enabled */
                    ${settings.themeFontOverride ? `font-family: 'ITC Benguiat', 'Benguiat', serif !important;` : ''}
                    
                    /* Transparency for particles */
                    --bg-main: rgba(0, 0, 0, 0.05) !important;
                    --bg-panel: rgba(20, 20, 25, 0.2) !important;
                    --bg-card: rgba(30, 30, 35, 0.2) !important;
                    background-color: #050505 !important;
                }

                ${settings.themeFontOverride ? `
                body[data-base-theme="upside-down"] * {
                     font-family: 'ITC Benguiat', 'Benguiat', serif !important;
                }` : ''}

                /* Container Overrides for Visibility */
                body[data-base-theme="upside-down"] #root,
                body[data-base-theme="upside-down"] nav,
                body[data-base-theme="upside-down"] aside,
                body[data-base-theme="upside-down"] main,
                body[data-base-theme="upside-down"] header {
                    background-color: transparent !important;
                    border-color: rgba(255, 255, 255, 0.1) !important;
                    backdrop-filter: none !important; 
                }
                
                body[data-base-theme="upside-down"] .bg-background,
                body[data-base-theme="upside-down"] .bg-panel,
                body[data-base-theme="upside-down"] .bg-black,
                body[data-base-theme="upside-down"] .bg-zinc-950,
                body[data-base-theme="upside-down"] .bg-zinc-900 {
                    background-color: rgba(10, 10, 15, 0.3) !important;
                    backdrop-filter: blur(2px) !important; 
                }

                /* Animations */
                @keyframes flash-red {
                    0%, 100% { opacity: 0; }
                    2% { opacity: 0.8; filter: brightness(1.5); }
                    3% { opacity: 0.2; }
                    6% { opacity: 0.5; }
                    15% { opacity: 0; }
                }
                
                @keyframes fog-move {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>

            {/* BACKGROUND ATMOSPHERE (Fixed z-index -1) */}
            <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden select-none bg-[#03050a]">
                
                {/* 1. Base Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a12] to-[#020205]" />

                {/* 2. Lightning Flashes (Behind Fog) */}
                <div className="absolute inset-0 z-0 mix-blend-screen">
                     <div className="absolute top-[-20%] left-[10%] w-[90vw] h-[90vw] bg-[radial-gradient(circle,rgba(220,40,40,0.4)_0%,transparent_70%)] animate-[flash-red_12s_infinite_linear]" />
                     <div className="absolute bottom-[-10%] right-[-10%] w-[80vw] h-[80vw] bg-[radial-gradient(circle,rgba(180,30,30,0.3)_0%,transparent_60%)] animate-[flash-red_18s_infinite_linear]" style={{ animationDelay: '7s' }} />
                </div>

                {/* 3. Rolling Fog (SVG Noise - Stronger Opacity) */}
                <div className="absolute inset-0 z-10 opacity-40 mix-blend-overlay">
                    <div 
                        className="absolute inset-0 w-[200%] h-full animate-[fog-move_80s_linear_infinite]"
                        style={{ 
                            background: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.005\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'1\'/%3E%3C/svg%3E")',
                            backgroundSize: 'cover'
                        }} 
                    />
                </div>

                {/* 4. Vignette */}
                <div className="absolute inset-0 z-20 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_120%)] opacity-80" />
            </div>

            {/* FOREGROUND PARTICLES (Canvas z-index 9999) */}
            <canvas 
                ref={canvasRef}
                className="fixed inset-0 z-[9999] pointer-events-none"
            />
        </>
    );
};

export default UpsideDownEffect;
