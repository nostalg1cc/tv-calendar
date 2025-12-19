
import React, { useState, useRef, useMemo } from 'react';
import { X, Upload, CheckCircle2, Film, Tv, Calendar, Search, ArrowUpDown, Loader2, FileJson } from 'lucide-react';
import { useStore } from '../store';
import { TVShow } from '../types';
import { getImageUrl } from '../services/tmdb';
import toast from 'react-hot-toast';

interface LegacyImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LegacyImportModal: React.FC<LegacyImportModalProps> = ({ isOpen, onClose }) => {
    const { watchlist, addToWatchlist } = useStore();
    const [step, setStep] = useState<'upload' | 'select'>('upload');
    const [candidates, setCandidates] = useState<TVShow[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [sortMode, setSortMode] = useState<'name' | 'newest' | 'oldest'>('name');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    // Recursive search for media items in any JSON structure
    const findMediaItems = (data: any, existingIds: Set<number>): TVShow[] => {
        const found: TVShow[] = [];
        const seen = new Set<number>();

        const traverse = (obj: any) => {
            if (!obj || typeof obj !== 'object') return;

            // Check if object matches our media shape
            if (obj.id && obj.name && (obj.media_type === 'tv' || obj.media_type === 'movie')) {
                if (!existingIds.has(obj.id) && !seen.has(obj.id)) {
                    found.push({
                        id: obj.id,
                        name: obj.name,
                        media_type: obj.media_type,
                        poster_path: obj.poster_path || null,
                        backdrop_path: obj.backdrop_path || null,
                        overview: obj.overview || '',
                        first_air_date: obj.first_air_date || obj.release_date || '',
                        vote_average: obj.vote_average || 0
                    });
                    seen.add(obj.id);
                }
                return; // Found a leaf node of interest, stop digging this branch
            }

            // If array, iterate
            if (Array.isArray(obj)) {
                obj.forEach(item => traverse(item));
                return;
            }

            // If generic object, iterate values
            Object.values(obj).forEach(val => traverse(val));
        };

        traverse(data);
        return found;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                const existingIds = new Set(watchlist.map(i => i.id));
                const found = findMediaItems(json, existingIds);
                
                if (found.length === 0) {
                    toast.error("No new TV shows or movies found in this file.");
                    setIsProcessing(false);
                    return;
                }

                setCandidates(found);
                // Auto-select all by default
                setSelectedIds(new Set(found.map(i => i.id)));
                setStep('select');
            } catch (err) {
                console.error(err);
                toast.error("Failed to parse JSON file.");
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
    };

    const sortedCandidates = useMemo(() => {
        return [...candidates].sort((a, b) => {
            if (sortMode === 'name') return a.name.localeCompare(b.name);
            const dateA = a.first_air_date || '0000';
            const dateB = b.first_air_date || '0000';
            if (sortMode === 'newest') return dateB.localeCompare(dateA);
            return dateA.localeCompare(dateB);
        });
    }, [candidates, sortMode]);

    const toggleSelection = (id: number) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const toggleAll = () => {
        if (selectedIds.size === candidates.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(candidates.map(i => i.id)));
    };

    const performImport = () => {
        let count = 0;
        candidates.forEach(item => {
            if (selectedIds.has(item.id)) {
                addToWatchlist(item);
                count++;
            }
        });
        toast.success(`Successfully imported ${count} items.`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div 
                className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col h-[85vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <FileJson className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Legacy Import</h2>
                            <p className="text-xs text-zinc-400">Migrate data from other profiles or backups</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden relative min-h-0">
                    {step === 'upload' && (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
                            <div className="w-20 h-20 rounded-3xl bg-zinc-900 flex items-center justify-center border border-zinc-800 shadow-xl">
                                <Upload className="w-10 h-10 text-zinc-600" />
                            </div>
                            <div className="max-w-md">
                                <h3 className="text-xl font-bold text-white mb-2">Upload Legacy JSON</h3>
                                <p className="text-sm text-zinc-500 leading-relaxed">
                                    Select a JSON file containing your old watchlist or profile data. We will scan it for TV shows and movies that aren't in your current library.
                                </p>
                            </div>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isProcessing}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                            >
                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                {isProcessing ? 'Scanning File...' : 'Select File'}
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                accept=".json" 
                                className="hidden" 
                                onChange={handleFileChange} 
                            />
                        </div>
                    )}

                    {step === 'select' && (
                        <div className="flex flex-col h-full">
                            {/* Toolbar */}
                            <div className="px-6 py-3 border-b border-white/5 bg-zinc-900/30 flex flex-wrap items-center justify-between gap-4 shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={toggleAll}
                                            className="w-5 h-5 rounded border border-zinc-600 flex items-center justify-center transition-colors hover:border-zinc-400"
                                        >
                                            {selectedIds.size === candidates.length && <div className="w-3 h-3 bg-indigo-500 rounded-sm" />}
                                            {selectedIds.size > 0 && selectedIds.size < candidates.length && <div className="w-3 h-0.5 bg-indigo-500" />}
                                        </button>
                                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
                                            {selectedIds.size} Selected
                                        </span>
                                    </div>
                                    <div className="h-4 w-px bg-white/10" />
                                    <span className="text-xs text-zinc-500">
                                        Found {candidates.length} new items
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Sort By:</span>
                                    <select 
                                        value={sortMode} 
                                        onChange={(e) => setSortMode(e.target.value as any)}
                                        className="bg-zinc-800 border border-zinc-700 text-white text-xs rounded px-2 py-1 outline-none focus:border-indigo-500"
                                    >
                                        <option value="name">Name (A-Z)</option>
                                        <option value="newest">Year (Newest)</option>
                                        <option value="oldest">Year (Oldest)</option>
                                    </select>
                                </div>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20 min-h-0">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {sortedCandidates.map(item => {
                                        const isSelected = selectedIds.has(item.id);
                                        return (
                                            <div 
                                                key={item.id} 
                                                onClick={() => toggleSelection(item.id)}
                                                className={`
                                                    relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer group
                                                    ${isSelected ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-zinc-900 border-white/5 hover:border-white/10'}
                                                `}
                                            >
                                                <div className="w-16 aspect-[2/3] bg-zinc-800 rounded-lg overflow-hidden shrink-0 shadow-sm relative">
                                                    <img src={getImageUrl(item.poster_path)} className="w-full h-full object-cover" loading="lazy" alt="" />
                                                    {isSelected && (
                                                        <div className="absolute inset-0 bg-indigo-500/40 flex items-center justify-center backdrop-blur-[1px]">
                                                            <CheckCircle2 className="w-6 h-6 text-white drop-shadow-md" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`text-sm font-bold leading-tight mb-1 line-clamp-2 ${isSelected ? 'text-indigo-200' : 'text-zinc-200'}`}>
                                                        {item.name}
                                                    </h4>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-[10px] font-bold text-zinc-500 border border-zinc-700 px-1.5 rounded uppercase">
                                                            {item.media_type === 'movie' ? 'Movie' : 'TV'}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-500 font-mono">
                                                            {item.first_air_date ? item.first_air_date.split('-')[0] : 'TBA'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">
                                                        {item.overview}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'select' && (
                    <div className="px-6 py-4 border-t border-white/5 bg-zinc-900/80 backdrop-blur-md flex justify-end gap-3 shrink-0">
                        <button 
                            onClick={() => { setStep('upload'); setCandidates([]); }}
                            className="px-6 py-3 rounded-xl font-bold text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={performImport}
                            disabled={selectedIds.size === 0}
                            className="px-8 py-3 bg-white hover:bg-zinc-200 disabled:opacity-50 disabled:hover:bg-white text-black rounded-xl font-bold text-xs transition-all shadow-lg flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Import {selectedIds.size} Items
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LegacyImportModal;
