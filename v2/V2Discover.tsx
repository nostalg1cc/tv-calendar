
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Plus, Check, Info, ChevronRight, Star, Ticket, MonitorPlay, Sparkles, TrendingUp, FlaskConical, LayoutGrid, Newspaper } from 'lucide-react';
import { useStore } from '../store';
import { getCollection, getBackdropUrl, getImageUrl, getRecommendations } from '../services/tmdb';
import { TVShow } from '../types';
import ShowDetailsModal from '../components/ShowDetailsModal';
import V2TrailerModal from './V2TrailerModal';
import RatingBadge from '../components/RatingBadge';

const V2Discover: React.FC = () => {
    const { watchlist, addToWatchlist, setReminderCandidate } = useStore();
    const [isBeta, setIsBeta] = useState(false);
    
    // Data State
    const [heroItems, setHeroItems] = useState<TVShow[]>([]);
    const [trending, setTrending] = useState<TVShow[]>([]);
    const [topHorror, setTopHorror] = useState<TVShow[]>([]);
    const [topAction, setTopAction] = useState<TVShow[]>([]);
    const [inTheaters, setInTheaters] = useState<TVShow[]>([]);
    
    // Personalized
    const [recSource, setRecSource] = useState<TVShow | null>(null);
    const [recommendations, setRecommendations] = useState<TVShow[]>([]);

    // Modals
    const [detailsId, setDetailsId] = useState<{id: number, type: 'tv'|'movie'} | null>(null);
    const [trailerId, setTrailerId] = useState<{id: number, type: 'tv'|'movie'} | null>(null);

    useEffect(() => {
        // Initial Data Fetch
        getCollection('/trending/all/week', 'movie').then(data => {
            setHeroItems(data.slice(0, 5));
            setTrending(data);
        });

        if (watchlist.length > 0) {
            const random = watchlist[Math.floor(Math.random() * watchlist.length)];
            setRecSource(random);
            getRecommendations(random.id, random.media_type).then(setRecommendations);
        }

        getCollection('/discover/movie', 'movie', 1, { with_genres: '27', sort_by: 'vote_average.desc', 'vote_count.gte': '300' }).then(setTopHorror);
        getCollection('/discover/movie', 'movie', 1, { with_genres: '28', sort_by: 'popularity.desc' }).then(setTopAction);
        getCollection('/movie/now_playing', 'movie', 1).then(setInTheaters);
    }, []);

    const handleAdd = (e: React.MouseEvent, show: TVShow) => {
        e.stopPropagation();
        addToWatchlist(show);
        setReminderCandidate(show);
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#020202] relative">
            {/* Header / Toggle */}
            <div className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-end pointer-events-none">
                 <div className="pointer-events-auto bg-black/50 backdrop-blur-xl border border-white/10 p-1 rounded-full flex gap-1 items-center">
                     <button 
                        onClick={() => setIsBeta(false)} 
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${!isBeta ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                     >
                         Classic
                     </button>
                     <button 
                        onClick={() => setIsBeta(true)} 
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isBeta ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50' : 'text-zinc-500 hover:text-white'}`}
                     >
                         <FlaskConical className="w-3 h-3" /> Beta
                     </button>
                 </div>
            </div>

            {isBeta ? (
                <BetaView 
                    heroItems={heroItems}
                    trending={trending}
                    recSource={recSource}
                    recommendations={recommendations}
                    inTheaters={inTheaters}
                    topHorror={topHorror}
                    topAction={topAction}
                    onOpenDetails={(id, type) => setDetailsId({id, type})}
                    onAdd={handleAdd}
                    watchlist={watchlist}
                />
            ) : (
                <ClassicView 
                    heroItems={heroItems}
                    trending={trending}
                    recSource={recSource}
                    recommendations={recommendations}
                    inTheaters={inTheaters}
                    topHorror={topHorror}
                    topAction={topAction}
                    onOpenDetails={(id, type) => setDetailsId({id, type})}
                    onOpenTrailer={(id, type) => setTrailerId({id, type})}
                    onAdd={handleAdd}
                    watchlist={watchlist}
                />
            )}

            {detailsId && (
                <ShowDetailsModal 
                    isOpen={!!detailsId}
                    onClose={() => setDetailsId(null)}
                    showId={detailsId.id}
                    mediaType={detailsId.type}
                />
            )}
            
            {trailerId && (
                 <V2TrailerModal 
                    isOpen={!!trailerId}
                    onClose={() => setTrailerId(null)}
                    showId={trailerId.id}
                    mediaType={trailerId.type}
                 />
            )}
        </div>
    );
};

// --- BETA LAYOUT (Mosaic / Editorial) ---
const BetaView = ({ heroItems, trending, recSource, recommendations, inTheaters, topHorror, topAction, onOpenDetails, onAdd, watchlist }: any) => {
    const hero = heroItems[0];
    if (!hero) return <div className="h-screen bg-black" />;

    return (
        <div className="pb-32 font-sans">
            {/* 1. HERO EDITORIAL */}
            <div className="relative w-full h-[85vh] flex flex-col justify-end p-6 md:p-12 overflow-hidden group">
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear scale-105 group-hover:scale-100" style={{ backgroundImage: `url(${getBackdropUrl(hero.backdrop_path)})` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/20 to-transparent" />
                    <div className="absolute inset-0 bg-[#020202]/10" /> 
                </div>
                
                <div className="relative z-10 max-w-4xl animate-fade-in-up">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="bg-white text-black text-[10px] font-black uppercase tracking-widest px-2 py-1">Editor's Choice</span>
                        <div className="h-px w-10 bg-white/50" />
                        <span className="text-white/80 text-xs font-mono uppercase tracking-widest">Trending #1</span>
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black text-white leading-[0.85] tracking-tighter mb-6 mix-blend-overlay opacity-90">
                        {hero.name}
                    </h1>
                    <p className="text-zinc-300 text-sm md:text-lg font-medium max-w-xl leading-relaxed mb-8 line-clamp-3">
                        {hero.overview}
                    </p>
                    <div className="flex gap-4">
                        <button onClick={() => onOpenDetails(hero.id, hero.media_type)} className="h-12 px-8 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-zinc-200 transition-colors">
                            Explore
                        </button>
                        <button onClick={(e) => onAdd(e, hero)} className="h-12 w-12 border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. THE TICKER */}
            <div className="border-y border-white/10 bg-black py-3 overflow-hidden whitespace-nowrap">
                <div className="inline-block animate-marquee">
                    {trending.slice(0,10).map((t: any) => (
                        <span key={t.id} className="text-xs font-black text-zinc-600 uppercase tracking-[0.2em] mx-8">
                            <span className="text-indigo-500 mr-2">↑</span> {t.name} <span className="ml-2 text-zinc-800">/</span>
                        </span>
                    ))}
                    {trending.slice(0,10).map((t: any) => (
                        <span key={t.id + 'dup'} className="text-xs font-black text-zinc-600 uppercase tracking-[0.2em] mx-8">
                            <span className="text-indigo-500 mr-2">↑</span> {t.name} <span className="ml-2 text-zinc-800">/</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* 3. BENTO GRID */}
            <div className="max-w-[1800px] mx-auto p-4 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[300px]">
                    
                    {/* Tall Card: Recommendations */}
                    {recommendations.length > 0 && (
                        <div className="md:col-span-1 md:row-span-2 relative group overflow-hidden rounded-none border border-white/10 bg-zinc-900 cursor-pointer" onClick={() => onOpenDetails(recommendations[0].id, recommendations[0].media_type)}>
                            <img src={getImageUrl(recommendations[0].poster_path)} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" alt="" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent p-6 flex flex-col justify-end">
                                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">For You</div>
                                <h3 className="text-2xl font-bold text-white leading-none mb-2">{recommendations[0].name}</h3>
                                <p className="text-xs text-zinc-400 line-clamp-2">Because you watched {recSource?.name}</p>
                            </div>
                        </div>
                    )}

                    {/* Wide Card: In Theaters */}
                    {inTheaters.length > 0 && (
                        <div className="md:col-span-2 md:row-span-1 relative group overflow-hidden border border-white/10 bg-zinc-900 cursor-pointer" onClick={() => onOpenDetails(inTheaters[0].id, inTheaters[0].media_type)}>
                            <img src={getBackdropUrl(inTheaters[0].backdrop_path)} className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-all duration-700" alt="" />
                            <div className="absolute inset-0 p-8 flex flex-col justify-center items-start">
                                <div className="bg-white text-black text-[10px] font-black uppercase px-2 py-0.5 mb-3">Now In Cinema</div>
                                <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-2">{inTheaters[0].name}</h3>
                                <div className="flex gap-2">
                                     <span className="text-xs font-bold text-white border border-white/30 px-2 py-1">Movie</span>
                                     <span className="text-xs font-bold text-white border border-white/30 px-2 py-1">{inTheaters[0].vote_average.toFixed(1)} ★</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Square Card: Action */}
                    {topAction.length > 0 && (
                        <div className="md:col-span-1 md:row-span-1 relative group overflow-hidden border border-white/10 bg-zinc-900 cursor-pointer" onClick={() => onOpenDetails(topAction[0].id, topAction[0].media_type)}>
                             <img src={getImageUrl(topAction[0].poster_path)} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                             <div className="absolute top-4 left-4 border border-white/20 bg-black/50 backdrop-blur-md px-3 py-1 text-xs font-bold text-white uppercase">Action Pick</div>
                        </div>
                    )}

                    {/* Wide Card: Horror */}
                    {topHorror.length > 0 && (
                        <div className="md:col-span-2 md:row-span-1 relative group overflow-hidden border border-white/10 bg-zinc-900 cursor-pointer" onClick={() => onOpenDetails(topHorror[0].id, topHorror[0].media_type)}>
                            <div className="absolute inset-0 bg-red-900/20 z-10 mix-blend-overlay pointer-events-none" />
                            <img src={getBackdropUrl(topHorror[0].backdrop_path)} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="" />
                             <div className="absolute inset-0 p-8 flex flex-col justify-end items-end text-right z-20">
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">{topHorror[0].name}</h3>
                                <p className="text-xs font-bold text-red-500 uppercase tracking-widest">Top Rated Horror</p>
                            </div>
                        </div>
                    )}

                    {/* Small Card: Action 2 */}
                    {topAction.length > 1 && (
                         <div className="md:col-span-1 md:row-span-1 relative group overflow-hidden border border-white/10 bg-zinc-900 cursor-pointer" onClick={() => onOpenDetails(topAction[1].id, topAction[1].media_type)}>
                             <img src={getImageUrl(topAction[1].poster_path)} className="w-full h-full object-cover opacity-70 group-hover:scale-110 transition-transform duration-500" alt="" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60">
                                  <Info className="w-8 h-8 text-white" />
                              </div>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
            `}</style>
        </div>
    );
};

// --- CLASSIC LAYOUT (Netflix Style) ---
const ClassicView = ({ heroItems, trending, recSource, recommendations, inTheaters, topHorror, topAction, onOpenDetails, onOpenTrailer, onAdd, watchlist }: any) => {
    // Standard Horizontal Scroll Component
    const Section = ({ title, items, isTop10, icon: Icon }: any) => {
        if (!items || items.length === 0) return null;
        return (
            <div className="py-6 group/section">
                <div className="px-6 md:px-16 flex items-end justify-between mb-4">
                    <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                         {Icon && <Icon className="w-5 h-5 text-indigo-500" />} {title}
                    </h3>
                </div>
                <div className="overflow-x-auto hide-scrollbar px-6 md:px-16 pb-8 -mx-0 w-full">
                    <div className="flex gap-3 md:gap-4 w-max items-end">
                        {items.slice(0, 15).map((show: TVShow, idx: number) => {
                            const isAdded = watchlist.some((w: any) => w.id === show.id);
                            return (
                                <div 
                                    key={show.id} 
                                    className={`relative ${isTop10 ? 'w-[130px] -mr-4 z-0 hover:z-20 origin-bottom' : 'w-[150px] z-0 hover:z-20'} cursor-pointer group/card transition-transform duration-300 hover:scale-105`}
                                    onClick={() => onOpenDetails(show.id, show.media_type)}
                                >
                                     {isTop10 && <span className="absolute -left-8 bottom-0 text-[160px] leading-[0.8] font-black text-[#1a1a1a] stroke-white tracking-tighter pointer-events-none z-[-1]" style={{ WebkitTextStroke: '2px #333' }}>{idx + 1}</span>}
                                     <div className="aspect-[2/3] rounded-md overflow-hidden bg-zinc-900 shadow-lg relative border border-white/5">
                                         <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover" loading="lazy" alt="" />
                                         {isAdded && <div className="absolute top-1 left-1 bg-emerald-500/20 p-1 rounded-full backdrop-blur-md border border-emerald-500/30"><Check className="w-3 h-3 text-emerald-500" /></div>}
                                     </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    // Hero Carousel Component
    const [heroIndex, setHeroIndex] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setHeroIndex(prev => (prev + 1) % heroItems.length), 8000);
        return () => clearInterval(interval);
    }, [heroItems]);

    const hero = heroItems[heroIndex];

    return (
        <div className="pb-20">
            {hero && (
                <div className="relative w-full h-[65vh] group">
                     <div className="absolute inset-0 bg-cover bg-center transition-all duration-1000" style={{ backgroundImage: `url(${getBackdropUrl(hero.backdrop_path)})` }}>
                        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/40 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#020202] to-transparent" />
                    </div>
                    <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-16 max-w-3xl pt-20">
                        <h1 className="text-4xl md:text-7xl font-bold text-white tracking-tighter mb-4 drop-shadow-2xl">{hero.name}</h1>
                        <p className="text-zinc-200 text-sm md:text-base line-clamp-3 mb-8 font-medium drop-shadow-md">{hero.overview}</p>
                        <div className="flex gap-4">
                            <button onClick={() => onOpenTrailer(hero.id, hero.media_type)} className="px-6 py-3 bg-white text-black font-bold rounded-lg flex items-center gap-2 hover:bg-zinc-200 transition-colors"><Play className="w-5 h-5 fill-current" /> Play Trailer</button>
                            <button onClick={(e) => onAdd(e, hero)} className="px-6 py-3 bg-zinc-800/80 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-zinc-700 transition-colors backdrop-blur-md"><Plus className="w-5 h-5" /> My List</button>
                        </div>
                    </div>
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                        {heroItems.map((_: any, idx: number) => (
                            <button key={idx} onClick={() => setHeroIndex(idx)} className={`w-1.5 rounded-full transition-all duration-300 ${idx === heroIndex ? 'h-8 bg-white' : 'h-2 bg-white/20'}`} />
                        ))}
                    </div>
                </div>
            )}

            <div className="relative z-10 -mt-16 space-y-2">
                <Section title="Top 10 Today" items={trending} isTop10 />
                {recSource && <Section title={`Because you watch ${recSource.name}`} items={recommendations} icon={Sparkles} />}
                <Section title="Now In Cinemas" items={inTheaters} icon={Ticket} />
                <Section title="Top Rated Horror" items={topHorror} />
                <Section title="Action & Adventure" items={topAction} />
            </div>
        </div>
    );
};

export default V2Discover;
