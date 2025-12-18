
import React, { useState, useEffect } from 'react';
import { X, Loader2, Video as VideoIcon, ExternalLink, Play } from 'lucide-react';
import { Video, Episode } from '../types';
import { getVideos } from '../services/tmdb';

interface V2TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  showId: number;
  mediaType: 'tv' | 'movie';
  episode?: Episode;
}

const V2TrailerModal: React.FC<V2TrailerModalProps> = ({ isOpen, onClose, showId, mediaType, episode }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
        loadVideos();
    }
  }, [isOpen, showId, mediaType, episode]);

  const loadVideos = async () => {
      setLoading(true);
      try {
          let results: Video[] = [];
          if (episode) {
              results = await getVideos(mediaType, showId, episode.season_number, episode.episode_number);
          } else {
              results = await getVideos(mediaType, showId);
          }
          
          setVideos(results);
          if (results.length > 0) {
              const best = results.find(v => v.type === 'Trailer') || results[0];
              setSelectedVideo(best);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12 bg-black/95 backdrop-blur-3xl animate-fade-in" onClick={onClose}>
        <div 
            className="bg-black border border-white/5 w-full max-w-6xl aspect-video rounded-[3rem] shadow-[0_0_120px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden relative group/modal"
            onClick={e => e.stopPropagation()}
        >
            {/* Minimal Close Handle */}
            <button 
                onClick={onClose} 
                className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 backdrop-blur-2xl rounded-full text-white transition-all z-50 opacity-0 group-hover/modal:opacity-100"
            >
                <X className="w-6 h-6" />
            </button>

            <div className="flex-1 bg-[#020202] flex items-center justify-center">
                {loading ? (
                    <div className="flex flex-col items-center gap-6">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                        <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-700 animate-pulse">Establishing Link</span>
                    </div>
                ) : selectedVideo ? (
                    <div className="w-full h-full relative">
                         <iframe 
                            src={`https://www.youtube.com/embed/${selectedVideo.key}?autoplay=1&rel=0&modestbranding=1&origin=${window.location.origin}`}
                            className="w-full h-full border-none"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={selectedVideo.name}
                        />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 opacity-10">
                        <VideoIcon className="w-20 h-20 text-white stroke-[0.5px]" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No Transmissions Found</p>
                    </div>
                )}
            </div>

            {/* Clean Selector Strip */}
            {videos.length > 1 && !loading && (
                <div className="absolute bottom-10 left-10 right-10 flex gap-3 overflow-x-auto hide-scrollbar z-40 bg-black/40 backdrop-blur-3xl p-3 rounded-3xl border border-white/5 opacity-0 group-hover/modal:opacity-100 transition-opacity">
                    {videos.map(v => (
                        <button 
                            key={v.id}
                            onClick={() => setSelectedVideo(v)}
                            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-3 ${selectedVideo?.id === v.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-600/20' : 'bg-white/5 text-zinc-500 border-white/5 hover:bg-white/10 hover:text-zinc-300'}`}
                        >
                            <Play className={`w-3 h-3 ${selectedVideo?.id === v.id ? 'fill-current' : ''}`} />
                            {v.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default V2TrailerModal;
