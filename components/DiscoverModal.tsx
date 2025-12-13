import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Plus, Check } from 'lucide-react';
import { TVShow } from '../types';
import { getCollection, getImageUrl } from '../services/tmdb';
import { useAppContext } from '../context/AppContext';

interface DiscoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fetchEndpoint: string;
  mediaType: 'tv' | 'movie';
  fetchParams?: Record<string, string>;
}

const DiscoverModal: React.FC<DiscoverModalProps> = ({ isOpen, onClose, title, fetchEndpoint, mediaType, fetchParams }) => {
  const [items, setItems] = useState<TVShow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const { allTrackedShows, addToWatchlist } = useAppContext();

  useEffect(() => {
    if (isOpen) {
      setItems([]);
      setPage(1);
      setHasMore(true);
      setLoading(false);
      loadMore(1);
    }
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
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadMore(nextPage);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="glass-panel w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
          <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div 
            className="flex-1 overflow-y-auto p-6 custom-scrollbar" 
            ref={containerRef}
            onScroll={handleScroll}
        >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {items.map((show) => {
                    const isAdded = allTrackedShows.some(s => s.id === show.id);
                    return (
                        <div key={`${show.id}-${show.media_type}`} className="flex flex-col gap-2 group relative">
                            <div className="relative aspect-[2/3] rounded-xl overflow-hidden shadow-lg border border-white/5 bg-white/5 transition-all duration-300 group-hover:border-indigo-500/30">
                                <img 
                                    src={getImageUrl(show.poster_path)} 
                                    alt={show.name} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                    <p className="text-xs font-bold text-white mb-2">{show.vote_average.toFixed(1)} ★</p>
                                    <button 
                                        onClick={() => addToWatchlist(show)}
                                        disabled={isAdded}
                                        className={`
                                            w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all
                                            ${isAdded 
                                                ? 'bg-green-600/80 text-white cursor-default' 
                                                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30'}
                                        `}
                                    >
                                        {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                        {isAdded ? 'Tracking' : 'Add'}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-sm leading-tight truncate group-hover:text-indigo-400 transition-colors" title={show.name}>{show.name}</h3>
                                <p className="text-xs text-slate-400">{show.first_air_date ? show.first_air_date.split('-')[0] : 'Unknown'}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {loading && (
                <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
            )}
            
            {!loading && !hasMore && items.length > 0 && (
                 <div className="text-center py-8 text-slate-500 text-sm">
                    You've reached the end of the list.
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default DiscoverModal;