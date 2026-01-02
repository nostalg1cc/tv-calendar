
import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Plus, Check, ArrowUpRight } from 'lucide-react';
import { TVShow } from '../types';
import { getCollection, getImageUrl } from '../services/tmdb';
import { useStore } from '../store';
import ShowDetailsModal from '../components/ShowDetailsModal';
import V2ShowDetailsModal from './V2ShowDetailsModal';

interface V2DiscoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fetchEndpoint: string;
  mediaType: 'tv' | 'movie';
  fetchParams?: Record<string, string>;
}

const V2DiscoverModal: React.FC<V2DiscoverModalProps> = ({ isOpen, onClose, title, fetchEndpoint, mediaType, fetchParams }) => {
  const [items, setItems] = useState<TVShow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [detailsId, setDetailsId] = useState<number | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { watchlist, addToWatchlist, setReminderCandidate, settings } = useStore();

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setPage(1);
      setHasMore(true);
      setLoading(false);
      loadMore(1);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, fetchEndpoint, mediaType]);

  const loadMore = async (pageNum: number) => {
    if (loading) return;
    setLoading(true);
    try {
      const newItems = await getCollection(fetchEndpoint, mediaType, pageNum, fetchParams);
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems(prev => {
           const existingIds = new Set(prev.map(i => i.id));
           const filteredNew = newItems.filter(i => !existingIds.has(i.id));
           return [...prev, ...filteredNew];
        });
      }
    } catch (e) {
      console.error(e);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = () => {
    if (!containerRef.current || loading || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 400) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadMore(nextPage);
    }
  };

  const handleAdd = async (e: React.MouseEvent, show: TVShow) => {
      e.stopPropagation();
      addToWatchlist(show);
      setReminderCandidate(show);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-[#020202] animate-fade-in flex flex-col">
        {/* Header */}
        <div className="shrink-0 h-24 px-6 md:px-12 flex items-center justify-between border-b border-white/5 bg-[#050505]">
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase">{title}</h2>
                    <span className="px-2 py-1 rounded border border-white/10 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-white/5">
                        {mediaType === 'tv' ? 'Series' : 'Cinema'}
                    </span>
                </div>
            </div>
            <button 
                onClick={onClose} 
                className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all text-white"
            >
                <X className="w-6 h-6" />
            </button>
        </div>
        
        {/* Grid */}
        <div 
            className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12" 
            ref={containerRef}
            onScroll={handleScroll}
        >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8 pb-20">
                {items.map((show, idx) => {
                    const isAdded = watchlist.some(s => s.id === show.id);
                    return (
                        <div 
                            key={`${show.id}-${idx}`} 
                            className="group relative cursor-pointer flex flex-col gap-3"
                            onClick={() => setDetailsId(show.id)}
                        >
                            <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900 border border-white/5 grayscale group-hover:grayscale-0 transition-all duration-500 ease-out">
                                <img 
                                    src={getImageUrl(show.poster_path)} 
                                    alt={show.name} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    loading="lazy"
                                />
                                
                                <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity mix-blend-overlay" />
                                
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                    <button 
                                        onClick={(e) => handleAdd(e, show)}
                                        disabled={isAdded}
                                        className={`w-8 h-8 flex items-center justify-center rounded-full shadow-xl ${isAdded ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:scale-110 transition-transform'}`}
                                    >
                                        {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                    </button>
                                </div>
                                
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                     <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/80">
                                         <span>Details</span>
                                         <ArrowUpRight className="w-3 h-3" />
                                     </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col">
                                <h3 className="text-sm font-bold text-zinc-400 group-hover:text-white transition-colors leading-tight line-clamp-1">{show.name}</h3>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] text-zinc-600 font-mono">{show.first_air_date?.split('-')[0] || 'TBA'}</span>
                                    <span className="text-[10px] font-bold text-zinc-700 group-hover:text-indigo-500 transition-colors">{show.vote_average.toFixed(1)} ★</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {loading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
            )}
        </div>

        {detailsId && (
            settings.useBetaLayouts ? (
                <V2ShowDetailsModal 
                    isOpen={!!detailsId}
                    onClose={() => setDetailsId(null)}
                    showId={detailsId}
                    mediaType={mediaType}
                />
            ) : (
                <ShowDetailsModal 
                    isOpen={!!detailsId}
                    onClose={() => setDetailsId(null)}
                    showId={detailsId}
                    mediaType={mediaType}
                />
            )
        )}
    </div>
  );
};

export default V2DiscoverModal;
