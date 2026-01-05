
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, PanInfo, AnimatePresence } from 'framer-motion';
import { X, Check, Eye, RefreshCw, Loader2, Sparkles, Star, ChevronLeft, RotateCcw, Zap, Flame, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { getRecommendations, getImageUrl, getShowDetails, getCollection } from '../services/tmdb';
import { TVShow, WatchedItem } from '../types';
import toast from 'react-hot-toast';

// Helper to track history for Undo
type ActionType = 'left' | 'right' | 'up';
interface ActionHistory {
    item: TVShow;
    action: ActionType;
    wasPreviouslyTracked: boolean; // To know if we should fully remove or just un-toggle
}

const V2Matches: React.FC = () => {
    const navigate = useNavigate();
    const { 
        watchlist, 
        history, 
        addToWatchlist, 
        removeFromWatchlist,
        toggleWatched, 
        setReminderCandidate 
    } = useStore();
    
    // --- STATE ---
    const [stack, setStack] = useState<TVShow[]>([]);
    const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading');
    const [dragDirection, setDragDirection] = useState<ActionType | null>(null);
    const [sourceLabel, setSourceLabel] = useState<string>('Trending');
    
    // Session Algorithm State
    const [sessionLikes, setSessionLikes] = useState<TVShow[]>([]); 
    const [historyStack, setHistoryStack] = useState<ActionHistory[]>([]); 
    const fetchedIds = useRef<Set<number>>(new Set());
    const isFetching = useRef(false);

    // --- ALGORITHM: LOAD CARDS ---
    const fetchMoreCards = useCallback(async (reset = false) => {
        if (isFetching.current) return;
        isFetching.current = true;
        if (reset) setStatus('loading');
        
        try {
            let seedItem: TVShow | undefined;
            let newItems: TVShow[] = [];
            let label = "Trending Now";
            
            // 1. Prioritize Session Rhythm (The "Rabbit Hole")
            // If user liked something recently in this session, dig deeper into that.
            if (sessionLikes.length > 0) {
                // 70% chance to use the most recent like, 30% to use a random recent like
                const useRecent = Math.random() > 0.3;
                seedItem = useRecent 
                    ? sessionLikes[sessionLikes.length - 1] 
                    : sessionLikes[Math.floor(Math.random() * sessionLikes.length)];
                
                label = `Based on ${seedItem.name}`;
            } 
            // 2. Fallback to Library (Personalized)
            else if (watchlist.length > 0) {
                seedItem = watchlist[Math.floor(Math.random() * watchlist.length)];
                label = `Because you track ${seedItem.name}`;
            }

            // Execute Fetch
            if (seedItem) {
                newItems = await getRecommendations(seedItem.id, seedItem.media_type);
                // If recommendations are exhausted or empty, fallback to popular
                if (newItems.length < 5) {
                     const fallback = await getCollection('/trending/all/day', 'movie');
                     newItems = [...newItems, ...fallback];
                     label = "Trending Mix";
                }
            } else {
                // Cold start: Fetch both Trending Movies and TV to ensure mixed variety
                const [movies, tvs] = await Promise.all([
                    getCollection('/trending/movie/day', 'movie', 1),
                    getCollection('/trending/tv/day', 'tv', 1)
                ]);
                // Interleave them for variety
                newItems = [];
                const maxLen = Math.max(movies.length, tvs.length);
                for (let i = 0; i < maxLen; i++) {
                    if (movies[i]) newItems.push(movies[i]);
                    if (tvs[i]) newItems.push(tvs[i]);
                }
                label = "Global Trending";
            }

            // Filter duplicates (Global history + Current session + Watchlist)
            // We want to show things the user hasn't seen/added yet usually
            const validItems = newItems.filter(item => {
                if (fetchedIds.current.has(item.id)) return false;
                if (historyStack.some(h => h.item.id === item.id)) return false;
                if (watchlist.some(w => w.id === item.id)) return false;
                
                // Also filter out things marked as watched in history
                const watchedKey = item.media_type === 'movie' ? `movie-${item.id}` : `episode-${item.id}`; // Simple check
                // Deep check for history existence (rough)
                if (Object.keys(history).some(k => k.includes(`-${item.id}`))) return false;

                return true;
            });

            validItems.forEach(i => fetchedIds.current.add(i.id));

            if (validItems.length > 0) {
                // Prepend to stack (so they appear "behind" current if we are just refilling)
                // If it's a reset, just set.
                setStack(prev => reset ? validItems.slice(0, 15) : [...validItems.slice(0, 10), ...prev]); 
                setSourceLabel(label);
                setStatus('ready');
            } else {
                 if (stack.length === 0) setStatus('empty');
            }

        } catch (e) {
            console.error("Match algo failed", e);
            setStatus('empty');
        } finally {
            isFetching.current = false;
        }
    }, [sessionLikes, watchlist, history, stack.length]);

    // Initial Load
    useEffect(() => {
        if (stack.length === 0) fetchMoreCards(true);
    }, []);

    // Infinite Scroll / Refill
    useEffect(() => {
        if (status === 'ready' && stack.length < 5) {
            fetchMoreCards(false);
        }
    }, [stack.length, status, fetchMoreCards]);

    // --- ACTIONS ---

    const handleSwipe = async (direction: ActionType) => {
        const current = stack[stack.length - 1];
        if (!current) return;

        setDragDirection(direction);

        // 1. Determine current state for Undo
        const wasInLibrary = watchlist.some(w => w.id === current.id);
        
        // 2. Perform Action (Optimistic UI)
        setTimeout(async () => {
            // Add to Undo Stack
            setHistoryStack(prev => [...prev, { item: current, action: direction, wasPreviouslyTracked: wasInLibrary }]);
            
            // Remove from visual stack (Pop from end)
            setStack(prev => prev.slice(0, -1));
            setDragDirection(null);

            // Execute Logic
            if (direction === 'left') {
                // Pass (Do nothing to store)
            } 
            else if (direction === 'right') {
                // Like -> Add to Library
                if (!wasInLibrary) addToWatchlist(current);
                setSessionLikes(prev => [...prev, current]); // Add full object to session likes
                toast.success('Added to Library', { icon: '👍', style: { background: '#18181b', color: '#fff' } });
            } 
            else if (direction === 'up') {
                // Seen -> Add to Library
                if (!wasInLibrary) addToWatchlist(current);
                setSessionLikes(prev => [...prev, current]);

                if (current.media_type === 'movie') {
                    // Movie: Mark Watched Immediately
                    toggleWatched({ tmdb_id: current.id, media_type: 'movie', is_watched: false });
                    toast.success('Marked as Watched', { icon: '👁️', style: { background: '#18181b', color: '#fff' } });
                } else {
                    // TV: Trigger Question (Seen all? Progress?)
                    // Crucial: Use setReminderCandidate to trigger the global modal in Dashboard
                    setReminderCandidate(current);
                }
            }
        }, 200); // Wait for animation
    };

    const handleUndo = () => {
        if (historyStack.length === 0) return;

        const lastAction = historyStack[historyStack.length - 1];
        const { item, action, wasPreviouslyTracked } = lastAction;

        // 1. Restore Visual Stack (Push to end)
        setStack(prev => [...prev, item]);
        setHistoryStack(prev => prev.slice(0, -1));

        // 2. Revert Store Logic
        if (action === 'right') {
            if (!wasPreviouslyTracked) removeFromWatchlist(item.id);
            setSessionLikes(prev => prev.filter(i => i.id !== item.id));
        } 
        else if (action === 'up') {
            if (item.media_type === 'movie') {
                toggleWatched({ tmdb_id: item.id, media_type: 'movie', is_watched: true }); 
            } else {
                // TV logic implies we might have marked episodes. 
                // A true "Undo" for TV bulk marking is complex. 
                // We'll just remove from watchlist if it wasn't there.
            }
            
            if (!wasPreviouslyTracked) removeFromWatchlist(item.id);
            setSessionLikes(prev => prev.filter(i => i.id !== item.id));
        }

        toast('Action Undone', { icon: 'Hz', style: { background: '#18181b', color: '#fff', fontSize: '12px' } });
    };

    // --- RENDER ---

    if (status === 'loading' && stack.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#020202] text-white">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-500 animate-pulse">Curating your deck...</p>
            </div>
        );
    }

    if (status === 'empty' && stack.length === 0) {
         return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#020202] text-white p-8 text-center">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
                    <Sparkles className="w-10 h-10 text-indigo-500" />
                </div>
                <h2 className="text-2xl font-black mb-2">That's all for now</h2>
                <p className="text-zinc-500 mb-8 max-w-xs mx-auto">We've run out of recommendations based on your current filters.</p>
                <button 
                    onClick={() => { fetchedIds.current.clear(); fetchMoreCards(true); }}
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

    // Top card is always the LAST in the array for rendering order (z-index)
    const topCard = stack[stack.length - 1];
    const nextCard = stack[stack.length - 2];

    return (
        <div className="flex-1 flex flex-col bg-[#050505] relative overflow-hidden h-full">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-30 p-6 flex justify-between items-start bg-gradient-to-b from-black/90 to-transparent h-32 pointer-events-none">
                 <button onClick={() => navigate(-1)} className="pointer-events-auto p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                     <ChevronLeft className="w-6 h-6" />
                 </button>
                 
                 <div className="flex flex-col items-center">
                     <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600/20 backdrop-blur-md rounded-full border border-indigo-500/30 mb-1">
                         <Flame className="w-3 h-3 text-indigo-400 fill-current" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Match Mode</span>
                     </div>
                     <span className="text-[9px] text-zinc-400 font-medium bg-black/40 px-2 py-0.5 rounded backdrop-blur-md border border-white/5">
                        {sourceLabel}
                     </span>
                 </div>

                 <div className="w-12" /> {/* Spacer */}
            </div>

            {/* Background Atmosphere */}
            <div className="absolute inset-0 z-0">
                {topCard && (
                    <img 
                        key={topCard.id} // Re-render on change
                        src={getImageUrl(topCard.poster_path)} 
                        className="w-full h-full object-cover blur-3xl opacity-20 scale-110 transition-all duration-1000" 
                        alt="" 
                    />
                )}
                <div className="absolute inset-0 bg-[#050505]/80" />
            </div>

            {/* Main Stage */}
            <div className="flex-1 flex items-center justify-center relative z-10 p-6 pb-32 overflow-hidden">
                 <div className="relative w-full max-w-sm aspect-[2/3]">
                     <AnimatePresence>
                         {/* Card Underneath */}
                         {nextCard && (
                             <div 
                                className="absolute inset-0 bg-zinc-900 rounded-[2rem] overflow-hidden scale-95 translate-y-4 opacity-50 shadow-2xl pointer-events-none border border-white/5"
                            >
                                  <img src={getImageUrl(nextCard.poster_path)} className="w-full h-full object-cover" alt="" />
                             </div>
                         )}

                         {/* Active Card */}
                         {topCard ? (
                             <Card 
                                key={topCard.id}
                                item={topCard}
                                onSwipe={handleSwipe}
                                forcedDirection={dragDirection}
                             />
                         ) : (
                             <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-zinc-900/50 rounded-[2rem] border border-white/5">
                                 <RefreshCw className="w-12 h-12 text-zinc-600 mb-4 animate-spin-slow" />
                                 <h3 className="text-xl font-bold text-white mb-2">Finding Gems...</h3>
                             </div>
                         )}
                     </AnimatePresence>
                 </div>
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-40 p-8 pb-10 bg-gradient-to-t from-[#020202] via-[#020202]/90 to-transparent">
                <div className="flex justify-center items-center gap-6 max-w-md mx-auto">
                     {/* Undo - Small */}
                     <button 
                        onClick={handleUndo}
                        disabled={historyStack.length === 0}
                        className="w-10 h-10 rounded-full bg-zinc-800/80 backdrop-blur-md border border-white/5 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:hover:bg-zinc-800 transition-all active:scale-95"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>

                     {/* NOPE */}
                     <button 
                        onClick={() => handleSwipe('left')}
                        className="w-14 h-14 bg-zinc-900 border border-zinc-800 text-red-500 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-red-500 hover:text-white transition-all duration-300 ring-4 ring-black"
                    >
                        <X className="w-6 h-6 stroke-[3px]" />
                    </button>
                    
                    {/* SEEN (Main Action) */}
                    <button 
                        onClick={() => handleSwipe('up')}
                        className="w-12 h-12 bg-blue-600/20 border border-blue-500/50 text-blue-400 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-blue-500 hover:text-white transition-all duration-300 transform -translate-y-4 ring-4 ring-black"
                    >
                        <Eye className="w-5 h-5 stroke-[3px]" />
                    </button>

                    {/* LIKE */}
                     <button 
                        onClick={() => handleSwipe('right')}
                        className="w-14 h-14 bg-white text-emerald-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-emerald-500 hover:text-white transition-all duration-300 ring-4 ring-black"
                    >
                        <Check className="w-6 h-6 stroke-[3px]" />
                    </button>

                    {/* Info - Small */}
                     <button 
                        onClick={() => navigate(`/discover`)} // Or open details modal
                        className="w-10 h-10 rounded-full bg-zinc-800/80 backdrop-blur-md border border-white/5 text-zinc-400 flex items-center justify-center hover:bg-zinc-700 hover:text-white transition-all active:scale-95"
                    >
                        <Info className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- DRAGGABLE CARD COMPONENT ---

interface CardProps {
    item: TVShow;
    onSwipe: (dir: ActionType) => void;
    forcedDirection: ActionType | null;
}

const Card: React.FC<CardProps> = ({ item, onSwipe, forcedDirection }) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    
    // Rotations based on X
    const rotate = useTransform(x, [-200, 200], [-15, 15]);
    
    // Opacity overlays
    const opacityRight = useTransform(x, [50, 150], [0, 1]);
    const opacityLeft = useTransform(x, [-150, -50], [1, 0]);
    const opacityUp = useTransform(y, [-150, -50], [1, 0]);

    const handleDragEnd = (_: any, info: PanInfo) => {
        const threshold = 100;
        const vThreshold = 100;
        
        if (info.offset.y < -vThreshold) {
            onSwipe('up');
        } else if (info.offset.x > threshold) {
            onSwipe('right');
        } else if (info.offset.x < -threshold) {
            onSwipe('left');
        }
    };

    // Animation variants for forced programmatic swipes
    const variants = {
        left: { x: -500, y: 50, rotate: -20, opacity: 0 },
        right: { x: 500, y: 50, rotate: 20, opacity: 0 },
        up: { y: -500, opacity: 0, scale: 0.8 },
        initial: { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 },
        exit: { opacity: 0 }
    };

    return (
        <motion.div
            style={{ x, y, rotate, touchAction: 'none' }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.6}
            onDragEnd={handleDragEnd}
            initial="initial"
            animate={forcedDirection ? forcedDirection : 'initial'}
            exit="exit"
            variants={variants}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="absolute inset-0 bg-zinc-900 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-grab active:cursor-grabbing border border-white/10"
        >
            <img 
                src={getImageUrl(item.poster_path)} 
                className="w-full h-full object-cover pointer-events-none select-none" 
                alt={item.name} 
                draggable={false}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 pointer-events-none" />

            {/* Info */}
            <div className="absolute bottom-0 left-0 right-0 p-8 pointer-events-none select-none">
                 <div className="flex items-center gap-2 mb-3">
                     <span className="text-[10px] font-black bg-white text-black px-2 py-0.5 rounded uppercase tracking-wider">
                         {item.media_type === 'movie' ? 'Movie' : 'TV'}
                     </span>
                     <span className="text-yellow-400 font-bold text-xs flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded backdrop-blur-md">
                         <Star className="w-3 h-3 fill-current" /> {item.vote_average.toFixed(1)}
                     </span>
                 </div>
                 <h2 className="text-4xl font-black text-white leading-[0.9] mb-3 shadow-black drop-shadow-md">{item.name}</h2>
                 <p className="text-sm text-zinc-300 line-clamp-3 leading-relaxed drop-shadow-md font-medium">{item.overview}</p>
            </div>

            {/* SWIPE OVERLAYS */}
            
            {/* LIKE (Right) */}
            <motion.div 
                style={{ opacity: opacityRight }}
                className="absolute top-8 left-8 border-[6px] border-emerald-500 rounded-xl px-4 py-2 -rotate-12 pointer-events-none bg-emerald-500/20 backdrop-blur-md z-50"
            >
                <span className="text-5xl font-black text-emerald-500 uppercase tracking-widest">LIKE</span>
            </motion.div>

            {/* NOPE (Left) */}
            <motion.div 
                style={{ opacity: opacityLeft }}
                className="absolute top-8 right-8 border-[6px] border-red-500 rounded-xl px-4 py-2 rotate-12 pointer-events-none bg-red-500/20 backdrop-blur-md z-50"
            >
                <span className="text-5xl font-black text-red-500 uppercase tracking-widest">NOPE</span>
            </motion.div>

            {/* SEEN (Up) */}
            <motion.div 
                style={{ opacity: opacityUp }}
                className="absolute bottom-40 left-0 right-0 flex justify-center pointer-events-none z-50"
            >
                 <div className="border-[6px] border-blue-500 rounded-xl px-6 py-2 bg-blue-500/20 backdrop-blur-md">
                    <span className="text-5xl font-black text-blue-500 uppercase tracking-widest">SEEN</span>
                 </div>
            </motion.div>

        </motion.div>
    );
};

export default V2Matches;
