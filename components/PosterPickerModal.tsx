
import React, { useState, useEffect } from 'react';
import { X, Image, Loader2, Check } from 'lucide-react';
import { getShowImages, getImageUrl, getShowDetails } from '../services/tmdb';
import { useStore } from '../store';
import { TVShow } from '../types';

interface PosterPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    showId: number;
    mediaType: 'tv' | 'movie';
}

type Tab = 'seasons' | 'posters' | 'logos';

const PosterPickerModal: React.FC<PosterPickerModalProps> = ({ isOpen, onClose, showId, mediaType }) => {
    const { setCustomPoster, watchlist } = useStore();
    const [loading, setLoading] = useState(false);
    const [images, setImages] = useState<{ posters: any[], backdrops: any[], logos: any[] }>({ posters: [], backdrops: [], logos: [] });
    const [seasons, setSeasons] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>(mediaType === 'tv' ? 'seasons' : 'posters');
    
    // Get current poster path from watchlist to highlight selection
    const currentShow = watchlist.find(s => s.id === showId);
    const currentPosterPath = currentShow?.custom_poster_path || currentShow?.poster_path;

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            const fetchData = async () => {
                try {
                    // Fetch Images
                    const imgs = await getShowImages(mediaType, showId);
                    setImages(imgs);

                    // Fetch Seasons if TV to get season posters
                    if (mediaType === 'tv') {
                        const details = await getShowDetails(showId);
                        if (details.seasons) {
                            setSeasons(details.seasons.filter(s => s.poster_path));
                        }
                    }
                } catch (e) {
                    console.error("Failed to load images", e);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [isOpen, showId, mediaType]);

    const handleSelect = (path: string | null) => {
        setCustomPoster(showId, path);
        onClose();
    };

    if (!isOpen) return null;

    const TabButton = ({ id, label }: { id: Tab, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === id ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fade-in" onClick={onClose}>
            <div 
                className="bg-[#09090b] border border-white/10 w-full max-w-4xl h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-zinc-950/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <Image className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-wide">Select Poster</h2>
                            <p className="text-xs text-zinc-500">Customize appearance in your library & calendar</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/5 overflow-x-auto hide-scrollbar max-w-full">
                        {mediaType === 'tv' && <TabButton id="seasons" label="Seasons" />}
                        <TabButton id="posters" label="All Posters" />
                        <TabButton id="logos" label="Textless" />
                    </div>
                    
                    <button onClick={onClose} className="absolute top-4 right-4 md:static p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#09090b]">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {/* Reset Option */}
                            <div 
                                onClick={() => handleSelect(null)}
                                className="aspect-[2/3] rounded-xl border-2 border-dashed border-zinc-800 hover:border-zinc-600 flex flex-col items-center justify-center cursor-pointer transition-colors group"
                            >
                                <span className="text-xs font-bold text-zinc-500 group-hover:text-zinc-300">Default</span>
                            </div>

                            {/* Seasons Tab */}
                            {activeTab === 'seasons' && seasons.map((season) => (
                                <div 
                                    key={season.id} 
                                    onClick={() => handleSelect(season.poster_path)}
                                    className={`relative group cursor-pointer rounded-xl overflow-hidden bg-zinc-900 border-2 transition-all ${currentPosterPath === season.poster_path ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-transparent hover:border-white/20'}`}
                                >
                                    <img src={getImageUrl(season.poster_path)} className="w-full h-full object-cover" alt={season.name} loading="lazy" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold">Select</span>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 text-center">
                                        <span className="text-[10px] font-bold text-white uppercase">{season.name}</span>
                                    </div>
                                    {currentPosterPath === season.poster_path && (
                                        <div className="absolute top-2 right-2 bg-indigo-500 rounded-full p-1 shadow-lg"><Check className="w-3 h-3 text-white" /></div>
                                    )}
                                </div>
                            ))}

                            {/* Posters Tab */}
                            {activeTab === 'posters' && images.posters.map((poster, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => handleSelect(poster.file_path)}
                                    className={`relative group cursor-pointer rounded-xl overflow-hidden bg-zinc-900 border-2 transition-all ${currentPosterPath === poster.file_path ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-transparent hover:border-white/20'}`}
                                >
                                    <img src={getImageUrl(poster.file_path)} className="w-full h-full object-cover" alt="" loading="lazy" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold">Select</span>
                                    </div>
                                    {currentPosterPath === poster.file_path && (
                                        <div className="absolute top-2 right-2 bg-indigo-500 rounded-full p-1 shadow-lg"><Check className="w-3 h-3 text-white" /></div>
                                    )}
                                </div>
                            ))}

                            {/* Textless / Logos Tab (Just showing logos/images that look clean) */}
                            {activeTab === 'logos' && images.posters.filter((p: any) => p.iso_639_1 === null).map((poster, idx) => (
                                <div 
                                    key={`logo-${idx}`} 
                                    onClick={() => handleSelect(poster.file_path)}
                                    className={`relative group cursor-pointer rounded-xl overflow-hidden bg-zinc-900 border-2 transition-all ${currentPosterPath === poster.file_path ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-transparent hover:border-white/20'}`}
                                >
                                    <img src={getImageUrl(poster.file_path)} className="w-full h-full object-cover" alt="" loading="lazy" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold">Select</span>
                                    </div>
                                    {currentPosterPath === poster.file_path && (
                                        <div className="absolute top-2 right-2 bg-indigo-500 rounded-full p-1 shadow-lg"><Check className="w-3 h-3 text-white" /></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PosterPickerModal;
