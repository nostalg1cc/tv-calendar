
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
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [dragDirection, setDragDirection] = useState<ActionType | null>(null);
    
    // Session Algorithm State
    const [sessionLikes, setSessionLikes] = useState<number[]>([]); // IDs of things liked THIS session
    const [historyStack, setHistoryStack] = useState<ActionHistory[]>([]); // For Undo
    const fetchedIds = useRef<Set<number>>(new Set());
    const isFetching = useRef(false);

    // --- ALGORITHM: LOAD CARDS ---
    const fetchMoreCards = useCallback(async () => {
        if (isFetching.current) return;
        isFetching.current = true;
        
        try {
            let seedIds: number[] = [];
            
            // 1. Prioritize Session Rhythm (what did I just like?)
            if (sessionLikes.length > 0) {
                // Pick random from last 5 likes to keep it somewhat focused but diverse
                const recentLikes = sessionLikes.slice(-5);
                seedIds = [recentLikes[Math.floor(Math.random() * recentLikes.length)]];
            } 
            // 2. Fallback to Library
            else if (watchlist.length > 0) {
                const randomWatchlist = watchlist[Math.floor(Math.random() * watchlist.length)];
                seedIds = [randomWatchlist.id];
            }

            let newItems: TVShow[] = [];

            // Fetch based on seeds or trending if empty
            if (seedIds.length > 0) {
                const seedId = seedIds[0];
                // We don't know the type easily here if it comes from sessionLikes (just IDs), 
                // but getRecommendations usually handles ID lookup or we try both.
                // Optimistically assuming generic recommendations or try Movie then TV.
                // To be safe, let's find the object in watchlist for type, or default to movie.
                const knownItem = watchlist.find(i => i.id === seedId);
                const type = knownItem?.media_type || 'movie'; 
                
                newItems = await getRecommendations(seedId, type);
            } else {
                // Cold start: Fetch both Trending Movies and TV to ensure mixed variety with correct types
                const [movies, tvs] = await Promise.all([
                    getCollection('/trending/movie/day', 'movie', 1),
                    getCollection('/trending/tv/day', 'tv', 1)
                ]);
                newItems = [...movies, ...tvs].sort(() => 0.5 - Math.random());
            }

            // Filter duplicates (Global history + Current session)
            const validItems = newItems.filter(item => {
                if (fetchedIds.current.has(item.id)) return false;
                if (historyStack.some(h => h.item.id === item.id)) return false;
                // Optional: Don't show things ALREADY in library? 
                // Tinder style usually hides what you already have.
                if (watchlist.some(w => w.id === item.id)) return false; 
                return true;
            });

            validItems.forEach(i => fetchedIds.current.add(i.id));

            // Add to Stack
            // We PREPEND items so they sit "under" the current top card (which is at the end of the array)
            // Wait, standard react state update:
            // If stack is [A, B, C] (C is top).
            // We want [D, E, A, B, C] (C is still top, D and E are bottom).
            if (validItems.length > 0) {
                setStack(prev => [...validItems.slice(0, 20), ...prev]); 
            } else if (stack.length === 0) {
                 // Emergency fallback if filter removed everything
                 const fallback = await getCollection('/movie/popular', 'movie', Math.floor(Math.random() * 10) + 1);
                 const cleanFallback = fallback.filter(t => !fetchedIds.current.has(t.id));
                 fetchedIds.current.add(cleanFallback[0]?.id); // Prevent immediate re-fetch loop
                 setStack(cleanFallback);
            }

        } catch (e) {
            console.error("Match algo failed", e);
        } finally {
            setIsInitialLoad(false);
            isFetching.current = false;
        }
    }, [sessionLikes, watchlist, stack.length]); // Dependencies

    // Initial Load
    useEffect(() => {
        fetchMoreCards();
    }, []);

    // Infinite Scroll trigger
    useEffect(() => {
        if (!isInitialLoad && stack.length < 5) {
            fetchMoreCards();
        }
    }, [stack.length, isInitialLoad, fetchMoreCards]);

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
                setSessionLikes(prev => [...prev, current.id]);
                toast.success('Added to Library', { icon: '👍', style: { background: '#18181b', color: '#fff' } });
            } 
            else if (direction === 'up') {
                // Seen -> Add to Library
                if (!wasInLibrary) addToWatchlist(current);
                
                setSessionLikes(prev => [...prev, current.id]); // Liking a seen movie is still a strong signal

                if (current.media_type === 'movie') {
                    // Movie: Mark Watched Immediately
                    toggleWatched({ tmdb_id: current.id, media_type: 'movie', is_watched: false });
                    toast.success('Marked as Watched', { icon: '👁️', style: { background: '#18181b', color: '#fff' } });
                } else {
                    // TV: Trigger Question (Seen all? Progress?)
                    // We set the candidate, which V2Dashboard listens to and opens the modal
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
            // If it wasn't tracked before, remove it. If it was, leave it alone.
            if (!wasPreviouslyTracked) removeFromWatchlist(item.id);
            setSessionLikes(prev => prev.filter(id => id !== item.id));
        } 
        else if (action === 'up') {
            // Un-mark watched
            if (item.media_type === 'movie') {
                toggleWatched({ tmdb_id: item.id, media_type: 'movie', is_watched: true }); // Toggle back to false
            } else {
                // For TV, simply remove from watchlist is usually enough as we can't easily undo "mark all episodes" 
                // without complex tracking. If the modal was cancelled, this cleans up the add.
            }
            
            if (!wasPreviouslyTracked) removeFromWatchlist(item.id);
            setSessionLikes(prev => prev.filter(id => id !== item.id));
        }

        toast('Action Undone', { icon: 'Hz', style: { background: '#18181b', color: '#fff', fontSize: '12px' } });
    };

    // --- RENDER ---

    if (stack.length === 0 && isInitialLoad) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#020202] text-white">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">Curating for you...</p>
            </div>
        );
    }

    if (stack.length === 0 && !isInitialLoad) {
         return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#020202] text-white p-8 text-center">
                <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
                    <Sparkles className="w-10 h-10 text-indigo-500" />
                </div>
                <h2 className="text-2xl font-black mb-2">That's all for now</h2>
                <p className="text-zinc-500 mb-8 max-w-xs mx-auto">We've run out of recommendations based on your current library.</p>
                <button 
                    onClick={() => { fetchedIds.current.clear(); fetchMoreCards(); }}
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
            <div className="absolute top-0 left-0 right-0 z-30 p-6 flex justify-between items-start bg-gradient-to-b from-black/90 to-transparent h-32">
                 <button onClick={() => navigate(-1)} className="p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                     <ChevronLeft className="w-6 h-6" />
                 </button>
                 
                 <div className="flex flex-col items-center">
                     <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600/20 backdrop-blur-md rounded-full border border-indigo-500/30 mb-1">
                         <Flame className="w-3 h-3 text-indigo-400 fill-current" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Match Mode</span>
                     </div>
                     {sessionLikes.length > 0 && (
                         <span className="text-[9px] text-zinc-500 font-medium">Adapted to {sessionLikes.length} likes</span>
                     )}
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
                                 <h3 className="text-xl font-bold text-white mb-2">Refilling Deck...</h3>
                                 <p className="text-sm text-zinc-500">Finding more gems based on your taste.</p>
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
