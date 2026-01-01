
import React, { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';

const UpsideDownEffect: React.FC = () => {
    const { settings } = useStore();
    const enabled = settings.upsideDownMode || false;
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
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
        aspect: number; 
        rotation: number;
        rotSpeed: number;
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
                size: Math.random() * 5 + 3,
                aspect: Math.random() * 0.5 + 0.5,
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.4 + 0.1,
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
            
            p.rotation += p.rotSpeed;

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

            // 5. Draw 
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.scale(1, p.aspect); 
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = '#9ca3af'; 
            
            ctx.beginPath();
            ctx.moveTo(0, -p.size);
            ctx.lineTo(p.size * 0.5, 0);
            ctx.lineTo(0, p.size);
            ctx.lineTo(-p.size * 0.5, 0);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
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

    if (!enabled) return null;

    return (
        <>
            {/* GLOBAL TRANSPARENCY OVERRIDES & FONT */}
            <style>{`
                /* Import Benguiat or similar if not local */
                @import url('https://fonts.cdnfonts.com/css/itc-benguiat');

                /* 
                   OVERRIDE STRATEGY:
                   1. Redefine CSS Variables to be transparent.
                   2. Force specific classes to be transparent with !important.
                   3. Force Font Family
                */

                body.upside-down-mode {
                    /* Redefine theme variables to transparency */
                    --bg-main: rgba(0, 0, 0, 0.05) !important;
                    --bg-panel: rgba(20, 20, 25, 0.2) !important;
                    --bg-card: rgba(30, 30, 35, 0.2) !important;
                    background-color: #050505 !important;
                    
                    /* Force Font */
                    font-family: 'ITC Benguiat', 'Benguiat Bold', 'Benguiat', serif !important;
                }

                /* Override all text elements to use the font */
                body.upside-down-mode * {
                     font-family: 'ITC Benguiat', 'Benguiat Bold', 'Benguiat', serif !important;
                }

                /* Specific Container Overrides */
                body.upside-down-mode #root,
                body.upside-down-mode nav,
                body.upside-down-mode aside,
                body.upside-down-mode main,
                body.upside-down-mode header {
                    background-color: transparent !important;
                    border-color: rgba(255, 255, 255, 0.1) !important;
                    backdrop-filter: none !important; 
                }
                
                /* Force transparency on common background utilities */
                body.upside-down-mode .bg-background,
                body.upside-down-mode .bg-panel,
                body.upside-down-mode .bg-black,
                body.upside-down-mode .bg-zinc-950,
                body.upside-down-mode .bg-zinc-900,
                body.upside-down-mode .bg-\[\#050505\],
                body.upside-down-mode .bg-\[\#09090b\],
                body.upside-down-mode .bg-\[\#020202\] {
                    background-color: rgba(10, 10, 15, 0.3) !important;
                    backdrop-filter: blur(2px) !important; 
                }

                /* Calendar Specifics */
                body.upside-down-mode .bg-white\\/\\[0\\.01\\], 
                body.upside-down-mode .bg-white\\/\\[0\\.04\\] {
                    background-color: transparent !important;
                }
                
                /* Text Contrast Bump */
                body.upside-down-mode .text-zinc-900 { color: #ddd !important; }
                body.upside-down-mode .text-text-main { text-shadow: 0 1px 3px rgba(0,0,0,0.8); }

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
