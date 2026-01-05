
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Check, Eye, RefreshCw, Loader2, Sparkles, Star, Info, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { getRecommendations, getImageUrl, getBackdropUrl } from '../services/tmdb';
import { TVShow } from '../types';
import toast from 'react-hot-toast';

const V2Matches: React.FC = () => {
    const navigate = useNavigate();
    const { watchlist, history, addToWatchlist, setReminderCandidate } = useStore();
    
    const [stack, setStack] = useState<TVShow[]>([]);
    const [loading, setLoading] = useState(true);
    const [dragDirection, setDragDirection] = useState<'left' | 'right' | 'up' | null>(null);

    // --- DATA FETCHING ---
    const fetchStack = async () => {
        setLoading(true);
        try {
            // 1. Pick random seeds from user's library/history
            const sources = watchlist.length > 0 ? watchlist : []; // Fallback if empty, maybe fetch trending?
            
            // If library is totally empty, we can't recommend based on it easily without fetching trending. 
            // Assuming AppContext has popular/trending loaded elsewhere, but let's just use empty check.
            let seeds: TVShow[] = [];
            
            if (sources.length > 0) {
                // Shuffle and pick 3
                const shuffled = [...sources].sort(() => 0.5 - Math.random());
                seeds = shuffled.slice(0, 3);
            }

            // 2. Fetch recommendations
            const newStack: TVShow[] = [];
            const processedIds = new Set(watchlist.map(i => i.id)); // Don't show what we already track
            
            // Add history ids to processed to avoid showing what we've seen (if tracked in history but not watchlist)
            Object.values(history).forEach(h => processedIds.add(h.tmdb_id));

            if (seeds.length === 0) {
                 // Fallback for new users: Fetch trending (simulated by just returning, infinite loader will handle empty state)
                 // Ideally we'd import getCollection but let's rely on user having at least 1 item or just generic recs
            }

            for (const seed of seeds) {
                const recs = await getRecommendations(seed.id, seed.media_type);
                for (const rec of recs) {
                    if (!processedIds.has(rec.id)) {
                        newStack.push(rec);
                        processedIds.add(rec.id);
                    }
                }
            }

            // Shuffle results
            setStack(newStack.sort(() => 0.5 - Math.random()).slice(0, 20));
        } catch (e) {
            console.error(e);
            toast.error("Could not find matches");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStack();
    }, []);

    // --- INTERACTION ---
    const popCard = (direction: 'left' | 'right' | 'up') => {
        setDragDirection(direction);
        const current = stack[stack.length - 1];
        
        setTimeout(() => {
            if (direction === 'right') {
                addToWatchlist(current);
                toast.success('Added to Library', { icon: '👍', style: { background: '#09090b', color: '#fff', border: '1px solid #27272a' } });
            } else if (direction === 'up') {
                // "Seen" logic -> Trigger global modal
                // We add to watchlist first to ensure tracking, then trigger modal
                if (!watchlist.some(w => w.id === current.id)) {
                    addToWatchlist(current);
                }
                setReminderCandidate(current);
            }
            
            setStack(prev => prev.slice(0, -1));
            setDragDirection(null);
        }, 200); // Wait for animation trigger
    };

    if (loading && stack.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#020202] text-white">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Finding Matches...</p>
            </div>
        );
    }

    if (stack.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#020202] text-white p-8 text-center">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
                    <Sparkles className="w-10 h-10 text-indigo-500" />
                </div>
                <h2 className="text-2xl font-black mb-2">That's all for now</h2>
                <p className="text-zinc-500 mb-8 max-w-xs mx-auto">We've run out of recommendations based on your current library.</p>
                <button 
                    onClick={fetchStack}
                    className="px-8 py-4 bg-white text-black rounded-2xl font-bold uppercase tracking-wider text-xs hover:bg-zinc-200 transition-colors flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" /> Refresh Stack
                </button>
                 <button 
                    onClick={() => navigate(-1)}
                    className="mt-4 text-zinc-600 font-bold text-xs uppercase tracking-wider hover:text-white"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const currentCard = stack[stack.length - 1];
    const nextCard = stack[stack.length - 2]; // For background preview

    return (
        <div className="flex-1 flex flex-col bg-[#050505] relative overflow-hidden">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                 <button onClick={() => navigate(-1)} className="p-2 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                     <ChevronLeft className="w-6 h-6" />
                 </button>
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/5">
                     <Sparkles className="w-3 h-3 text-indigo-400" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-white">For You</span>
                 </div>
                 <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Background Blur */}
            <div className="absolute inset-0 z-0">
                <img 
                    src={getImageUrl(currentCard.poster_path)} 
                    className="w-full h-full object-cover blur-3xl opacity-30" 
                    alt="" 
                />
                <div className="absolute inset-0 bg-black/60" />
            </div>

            {/* Card Stack */}
            <div className="flex-1 flex items-center justify-center relative z-10 p-4 pb-24 md:pb-8">
                 <div className="relative w-full max-w-sm aspect-[2/3]">
                     {/* Backup Card (Next in stack) */}
                     {nextCard && (
                         <div className="absolute inset-0 bg-zinc-900 rounded-3xl overflow-hidden scale-95 translate-y-4 opacity-50 shadow-2xl pointer-events-none">
                              <img src={getImageUrl(nextCard.poster_path)} className="w-full h-full object-cover" alt="" />
                         </div>
                     )}

                     {/* Top Card */}
                     <Card 
                        key={currentCard.id}
                        item={currentCard}
                        onSwipe={popCard}
                        forcedDirection={dragDirection}
                     />
                 </div>
            </div>

            {/* Controls (Desktop/Accessibility) */}
            <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center items-center gap-6">
                 <button 
                    onClick={() => popCard('left')}
                    className="w-14 h-14 bg-zinc-900 border border-zinc-800 text-red-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-red-500 hover:text-white transition-all duration-300"
                >
                    <X className="w-6 h-6" />
                 </button>
                 
                 <button 
                    onClick={() => popCard('up')}
                    className="w-12 h-12 bg-zinc-900 border border-zinc-800 text-blue-400 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-blue-500 hover:text-white transition-all duration-300 transform -translate-y-4"
                >
                    <Eye className="w-5 h-5" />
                </button>

                 <button 
                    onClick={() => popCard('right')}
                    className="w-14 h-14 bg-white text-emerald-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-emerald-500 hover:text-white transition-all duration-300"
                >
                    <Check className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

// --- CARD COMPONENT ---

interface CardProps {
    item: TVShow;
    onSwipe: (dir: 'left' | 'right' | 'up') => void;
    forcedDirection: 'left' | 'right' | 'up' | null;
}

const Card: React.FC<CardProps> = ({ item, onSwipe, forcedDirection }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    const opacityRight = useTransform(x, [50, 150], [0, 1]);
    const opacityLeft = useTransform(x, [-150, -50], [1, 0]);
    const opacityUp = useTransform(y, [-150, -50], [1, 0]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        const threshold = 100;
        if (info.offset.x > threshold) {
            onSwipe('right');
        } else if (info.offset.x < -threshold) {
            onSwipe('left');
        } else if (info.offset.y < -threshold) {
            onSwipe('up');
        }
    };

    // Animation variants for forced programmatic swipes
    const variants = {
        left: { x: -1000, rotate: -30, opacity: 0 },
        right: { x: 1000, rotate: 30, opacity: 0 },
        up: { y: -1000, opacity: 0 },
        initial: { x: 0, y: 0, rotate: 0, opacity: 1 }
    };

    return (
        <motion.div
            style={{ x, y, rotate, touchAction: 'none' }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            onDragEnd={handleDragEnd}
            animate={forcedDirection ? forcedDirection : 'initial'}
            variants={variants}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing border border-white/10"
        >
            <img 
                src={getImageUrl(item.poster_path)} 
                className="w-full h-full object-cover pointer-events-none" 
                alt={item.name} 
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 pointer-events-none" />

            {/* Info */}
            <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
                 <div className="flex items-center gap-2 mb-2">
                     <span className="text-[10px] font-black bg-white text-black px-2 py-0.5 rounded uppercase tracking-wider">
                         {item.media_type === 'movie' ? 'Movie' : 'TV'}
                     </span>
                     <span className="text-yellow-400 font-bold text-xs flex items-center gap-1">
                         <Star className="w-3 h-3 fill-current" /> {item.vote_average.toFixed(1)}
                     </span>
                 </div>
                 <h2 className="text-3xl font-black text-white leading-none mb-2 shadow-black drop-shadow-md">{item.name}</h2>
                 <p className="text-sm text-zinc-300 line-clamp-3 leading-relaxed drop-shadow-md">{item.overview}</p>
            </div>

            {/* SWIPE OVERLAYS */}
            
            {/* LIKE (Right) */}
            <motion.div 
                style={{ opacity: opacityRight }}
                className="absolute top-8 left-8 border-4 border-emerald-500 rounded-lg px-4 py-2 -rotate-12 pointer-events-none bg-emerald-500/20 backdrop-blur-sm"
            >
                <span className="text-4xl font-black text-emerald-500 uppercase tracking-widest">LIKE</span>
            </motion.div>

            {/* NOPE (Left) */}
            <motion.div 
                style={{ opacity: opacityLeft }}
                className="absolute top-8 right-8 border-4 border-red-500 rounded-lg px-4 py-2 rotate-12 pointer-events-none bg-red-500/20 backdrop-blur-sm"
            >
                <span className="text-4xl font-black text-red-500 uppercase tracking-widest">NOPE</span>
            </motion.div>

            {/* SEEN (Up) */}
            <motion.div 
                style={{ opacity: opacityUp }}
                className="absolute bottom-32 left-0 right-0 flex justify-center pointer-events-none"
            >
                 <div className="border-4 border-blue-500 rounded-lg px-4 py-2 bg-blue-500/20 backdrop-blur-sm">
                    <span className="text-4xl font-black text-blue-500 uppercase tracking-widest">SEEN IT</span>
                 </div>
            </motion.div>

        </motion.div>
    );
};

export default V2Matches;
