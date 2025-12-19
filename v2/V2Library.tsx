
import React, { useState, useMemo } from 'react';
import { List, Trash2, LayoutGrid, Search, Star, AlertCircle, MoreHorizontal, X } from 'lucide-react';
import { useStore } from '../store';
import { getImageUrl } from '../services/tmdb';
import { Episode, TVShow } from '../types';
import ShowDetailsModal from '../components/ShowDetailsModal';
import { format, parseISO } from 'date-fns';
import { useCalendarEpisodes } from '../hooks/useQueries';

type SortMode = 'name' | 'next_up' | 'added';
type FilterMode = 'all' | 'tv' | 'movie' | 'ended' | 'returning';

const V2Library: React.FC = () => {
    const { watchlist, history, removeFromWatchlist, settings, updateSettings } = useStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterMode>('all');
    const [sort, setSort] = useState<SortMode>('name');
    const [layout, setLayout] = useState<'grid' | 'list'>(settings.v2LibraryLayout || 'grid');
    const [selectedItem, setSelectedItem] = useState<TVShow | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Fetch episodes for all watchlist items to calculate next episode
    const { episodes } = useCalendarEpisodes(new Date());

    const getNextEpisodeDate = (showId: number): string | null => {
        const today = new Date().toISOString().split('T')[0];
        const upcoming = episodes.filter(ep => ep.show_id === showId && ep.air_date && ep.air_date >= today);
        upcoming.sort((a, b) => a.air_date.localeCompare(b.air_date));
        return upcoming.length > 0 ? upcoming[0].air_date : null;
    };

    const filteredItems = useMemo(() => {
        let items = watchlist;

        if (searchQuery) {
            items = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        if (filter === 'tv') items = items.filter(i => i.media_type === 'tv');
        if (filter === 'movie') items = items.filter(i => i.media_type === 'movie');
        if (filter === 'returning') items = items.filter(i => i.media_type === 'tv' && getNextEpisodeDate(i.id));
        if (filter === 'ended') items = items.filter(i => i.media_type === 'tv' && !getNextEpisodeDate(i.id));

        return items.sort((a, b) => {
            if (sort === 'name') return a.name.localeCompare(b.name);
            if (sort === 'next_up') {
                const dateA = getNextEpisodeDate(a.id) || '9999-99-99';
                const dateB = getNextEpisodeDate(b.id) || '9999-99-99';
                return dateA.localeCompare(dateB);
            }
            return a.name.localeCompare(b.name);
        });
    }, [watchlist, searchQuery, filter, sort, episodes]);

    const handleLayoutChange = (newLayout: 'grid' | 'list') => {
        setLayout(newLayout);
        updateSettings({ v2LibraryLayout: newLayout });
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020202] overflow-hidden">
            <header className="px-6 md:px-12 py-8 shrink-0 border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl z-20 flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">Collection</h1>
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                            {filteredItems.length} Items • {watchlist.filter(i => i.media_type === 'tv').length} Series • {watchlist.filter(i => i.media_type === 'movie').length} Movies
                        </p>
                    </div>
                    <div className="flex items-center gap-3 bg-zinc-900/50 p-1 rounded-xl border border-white/5 w-full md:w-auto">
                        <Search className="w-4 h-4 text-zinc-500 ml-3" />
                        <input type="text" placeholder="Filter library..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none outline-none text-sm text-white placeholder:text-zinc-600 w-full md:w-64 py-2" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="mr-2 text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>}
                    </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 md:pb-0">
                        {[{ id: 'all', label: 'All Items' }, { id: 'tv', label: 'Series' }, { id: 'movie', label: 'Movies' }, { id: 'returning', label: 'Airing' }, { id: 'ended', label: 'Ended' }].map((f) => (
                            <button key={f.id} onClick={() => setFilter(f.id as FilterMode)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap border transition-all ${filter === f.id ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-500 border-white/10 hover:border-white/30 hover:text-zinc-300'}`}>{f.label}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-4 ml-auto">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider"><span className="hidden md:inline">Sort:</span><select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} className="bg-transparent text-white outline-none cursor-pointer hover:text-indigo-400 transition-colors"><option value="name">Name (A-Z)</option><option value="next_up">Next Episode</option></select></div>
                        <div className="w-px h-4 bg-white/10" />
                        <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-white/5">
                            <button onClick={() => handleLayoutChange('grid')} className={`p-1.5 rounded-md transition-all ${layout === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}><LayoutGrid className="w-4 h-4" /></button>
                            <button onClick={() => handleLayoutChange('list')} className={`p-1.5 rounded-md transition-all ${layout === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}><List className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-30"><LayoutGrid className="w-16 h-16 text-zinc-500 mb-4 stroke-1" /><p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Library Empty</p></div>
                ) : (
                    layout === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-20">
                            {filteredItems.map(item => {
                                const nextEp = getNextEpisodeDate(item.id);
                                const isWatched = history[`${item.media_type}-${item.id}`]?.is_watched;
                                return (
                                    <div key={item.id} onClick={() => setSelectedItem(item)} className="group relative flex flex-col gap-2 cursor-pointer">
                                        <div className="relative aspect-[2/3] w-full bg-zinc-900 rounded-xl overflow-hidden shadow-lg border border-white/5 transition-all duration-300 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:border-white/20">
                                            <img src={getImageUrl(item.poster_path)} alt={item.name} className={`w-full h-full object-cover transition-all duration-500 ${isWatched ? 'grayscale opacity-50' : 'opacity-80 group-hover:opacity-100'}`} loading="lazy" />
                                            {item.media_type === 'tv' && nextEp && (<div className="absolute top-2 left-2 px-1.5 py-0.5 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest rounded shadow-lg">New</div>)}
                                            <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"><button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:bg-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button></div>
                                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent pt-10"><h4 className={`text-xs font-bold leading-tight line-clamp-2 ${isWatched ? 'text-zinc-500 line-through' : 'text-white'}`}>{item.name}</h4><div className="flex items-center justify-between mt-1"><span className={`text-[9px] font-bold uppercase tracking-wider ${nextEp ? 'text-emerald-400' : 'text-zinc-500'}`}>{nextEp ? format(parseISO(nextEp), 'MMM d') : (item.media_type === 'movie' ? item.first_air_date?.split('-')[0] : 'Ended')}</span>{item.vote_average > 0 && <span className="text-[8px] font-bold text-yellow-500 flex items-center gap-0.5"><Star className="w-2 h-2 fill-current" /> {item.vote_average.toFixed(1)}</span>}</div></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 pb-20 max-w-4xl mx-auto">
                            {filteredItems.map(item => {
                                const nextEp = getNextEpisodeDate(item.id);
                                const isWatched = history[`${item.media_type}-${item.id}`]?.is_watched;
                                return (
                                    <div key={item.id} onClick={() => setSelectedItem(item)} className="flex items-center gap-4 p-3 rounded-xl bg-zinc-900/40 border border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer group">
                                        <div className="w-12 h-16 bg-zinc-800 rounded-lg overflow-hidden shrink-0"><img src={getImageUrl(item.poster_path)} className={`w-full h-full object-cover ${isWatched ? 'grayscale opacity-50' : ''}`} alt="" /></div>
                                        <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><h4 className={`text-sm font-bold text-white truncate ${isWatched ? 'line-through text-zinc-500' : ''}`}>{item.name}</h4>{item.media_type === 'movie' && <span className="text-[8px] px-1.5 py-0.5 rounded border border-white/10 text-zinc-400 font-black uppercase tracking-wider">Movie</span>}</div><div className="flex items-center gap-4 mt-1 text-xs text-zinc-500"><span className={`font-medium ${nextEp ? 'text-emerald-400' : ''}`}>{nextEp ? `Next: ${format(parseISO(nextEp), 'MMM d')}` : (item.media_type === 'movie' ? `Released: ${item.first_air_date}` : 'Status: Ended')}</span><span className="hidden sm:inline">•</span><span className="hidden sm:inline">{item.vote_average.toFixed(1)} Rating</span></div></div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => { e.stopPropagation(); setDeleteId(item.id); }} className="p-2 text-zinc-500 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button><button className="p-2 text-zinc-500 hover:text-white transition-colors"><MoreHorizontal className="w-4 h-4" /></button></div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>

            {selectedItem && (
                <ShowDetailsModal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} showId={selectedItem.id} mediaType={selectedItem.media_type} />
            )}

            {deleteId && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteId(null)}>
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500"><AlertCircle className="w-5 h-5" /></div><h3 className="text-lg font-bold text-white">Confirm Removal</h3></div>
                        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">Are you sure you want to remove this from your library?</p>
                        <div className="flex justify-end gap-3"><button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg text-sm font-bold text-zinc-400 hover:text-white">Cancel</button><button onClick={() => { if(deleteId) removeFromWatchlist(deleteId); setDeleteId(null); }} className="px-4 py-2 rounded-lg text-sm font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg">Remove</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default V2Library;
