
import React, { useState, useEffect } from 'react';
import { X, Loader2, Video as VideoIcon, ExternalLink } from 'lucide-react';
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl animate-fade-in" onClick={onClose}>
        <div 
            className="bg-[#050505] border border-white/5 w-full max-w-6xl aspect-video rounded-[2rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden relative"
            onClick={e => e.stopPropagation()}
        >
            <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-black/50 hover:bg-white/10 backdrop-blur-md rounded-full text-white transition-all z-50">
                <X className="w-6 h-6" />
            </button>

            <div className="flex-1 bg-black flex items-center justify-center">
                {loading ? (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Accessing Vault</span>
                    </div>
                ) : selectedVideo ? (
                    <iframe 
                        src={`https://www.youtube.com/embed/${selectedVideo.key}?autoplay=1&rel=0&modestbranding=1&origin=${window.location.origin}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={selectedVideo.name}
                    />
                ) : (
                    <div className="flex flex-col items-center gap-4 opacity-20">
                        <VideoIcon className="w-16 h-16 text-white stroke-[1px]" />
                        <p className="text-xs font-black uppercase tracking-widest">No Transmissions Found</p>
                    </div>
                )}
            </div>

            {videos.length > 1 && !loading && (
                <div className="absolute bottom-6 left-6 right-6 flex gap-2 overflow-x-auto hide-scrollbar z-40 bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/5">
                    {videos.map(v => (
                        <button 
                            key={v.id}
                            onClick={() => setSelectedVideo(v)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${selectedVideo?.id === v.id ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 text-zinc-500 border-white/5 hover:bg-white/10'}`}
                        >
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
