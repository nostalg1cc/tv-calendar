import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Plus, Check } from 'lucide-react';
import { TVShow } from '../types';
import { getCollection, getImageUrl, getBackdropUrl } from '../services/tmdb';
import { useAppContext } from '../context/AppContext';
import ShowDetailsModal from './ShowDetailsModal';

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
  const [selectedItem, setSelectedItem] = useState<TVShow | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { allTrackedShows, addToWatchlist, setReminderCandidate } = useAppContext();

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
    if (scrollTop + clientHeight >= scrollHeight - 300) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadMore(nextPage);
    }
  };

  const handleAdd = async (e: React.MouseEvent, show: TVShow) => {
      e.stopPropagation();
      await addToWatchlist(show);
      setReminderCandidate(show);
  };

  if (!isOpen) return null;

  // Header Backdrop Logic: Use first item's backdrop if available
  const headerBackdrop = items.length > 0 ? getBackdropUrl(items[0].backdrop_path) : '';

  return (
    <>
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-zinc-950 border border-zinc-800 w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh] relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Cinematic Header */}
        <div className="relative h-40 shrink-0 overflow-hidden">
            {headerBackdrop && (
                <div className="absolute inset-0 bg-cover bg-center blur-sm scale-105 opacity-50" style={{ backgroundImage: `url(${headerBackdrop})` }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-zinc-950/30" />
            
            <div className="absolute bottom-6 left-8 z-10">
                <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-xl">{title}</h2>
                <p className="text-zinc-300 text-sm font-medium drop-shadow-md mt-1">{mediaType === 'tv' ? 'TV Series' : 'Movies'} • {items.length} loaded</p>
            </div>

            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/30 hover:bg-white/10 backdrop-blur-md rounded-full text-white transition-colors border border-white/10 z-20">
                <X className="w-6 h-6" />
            </button>
        </div>
        
        <div 
            className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-zinc-950" 
            ref={containerRef}
            onScroll={handleScroll}
        >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
                {items.map((show) => {
                    const isAdded = allTrackedShows.some(s => s.id === show.id);
                    return (
                        <div 
                            key={`${show.id}-${show.media_type}`} 
                            className="flex flex-col gap-2 group relative cursor-pointer"
                            onClick={() => setSelectedItem(show)}
                        >
                            <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-zinc-900 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-indigo-500/20 group-hover:ring-2 group-hover:ring-indigo-500/50">
                                <img 
                                    src={getImageUrl(show.poster_path)} 
                                    alt={show.name} 
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                    <p className="text-xs font-bold text-white mb-2">{show.vote_average.toFixed(1)} ★</p>
                                    <button 
                                        onClick={(e) => handleAdd(e, show)}
                                        disabled={isAdded}
                                        className={`
                                            w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all
                                            ${isAdded 
                                                ? 'bg-emerald-600/80 text-white cursor-default' 
                                                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30'}
                                        `}
                                    >
                                        {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                        {isAdded ? 'Tracking' : 'Add'}
                                    </button>
                                </div>
                            </div>
                            <div className="px-1">
                                <h3 className="font-bold text-zinc-200 text-sm leading-tight truncate group-hover:text-indigo-400 transition-colors" title={show.name}>{show.name}</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">{show.first_air_date ? show.first_air_date.split('-')[0] : 'Unknown'}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {loading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                </div>
            )}
            
            {!loading && !hasMore && items.length > 0 && (
                 <div className="text-center py-12 text-zinc-600 text-sm font-medium">
                    You've reached the end of the list.
                 </div>
            )}
        </div>
      </div>
    </div>

    {selectedItem && (
        <ShowDetailsModal 
            isOpen={!!selectedItem} 
            onClose={() => setSelectedItem(null)} 
            showId={selectedItem.id} 
            mediaType={mediaType} 
        />
    )}
    </>
  );
};

export default DiscoverModal;