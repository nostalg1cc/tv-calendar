import React, { useState, useEffect } from 'react';
import { X, Play, Loader2, Film, Tv, Video as VideoIcon, ExternalLink } from 'lucide-react';
import { Video, Episode } from '../types';
import { getVideos } from '../services/tmdb';

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Episode | null;
}

interface VideoGroup {
    title: string;
    videos: Video[];
}

const TrailerModal: React.FC<TrailerModalProps> = ({ isOpen, onClose, item }) => {
  const [videoGroups, setVideoGroups] = useState<VideoGroup[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
        loadVideos();
    } else {
        setVideoGroups([]);
        setSelectedVideo(null);
    }
  }, [isOpen, item]);

  const loadVideos = async () => {
      if (!item) return;
      setLoading(true);
      
      const groups: VideoGroup[] = [];
      const showId = item.show_id || item.id; // item.id is fallback if show_id missing (e.g. watchlist movie)
      
      try {
          if (item.is_movie) {
              const videos = await getVideos('movie', showId);
              if (videos.length > 0) groups.push({ title: 'Trailers & Clips', videos });
          } else {
              // Hierarchy Fetching for TV
              const promises = [];
              
              // 1. Episode Videos
              if (item.season_number && item.episode_number) {
                  promises.push(
                      getVideos('tv', showId, item.season_number, item.episode_number)
                        .then(v => v.length ? { title: `Episode ${item.episode_number} Extras`, videos: v } : null)
                  );
              }

              // 2. Season Videos
              if (item.season_number) {
                  promises.push(
                      getVideos('tv', showId, item.season_number)
                        .then(v => v.length ? { title: `Season ${item.season_number} Trailers`, videos: v } : null)
                  );
              }

              // 3. Show Videos
              promises.push(
                  getVideos('tv', showId)
                    .then(v => v.length ? { title: 'Series Trailers', videos: v } : null)
              );

              const results = await Promise.all(promises);
              results.forEach(g => { if (g) groups.push(g); });
          }

          setVideoGroups(groups);

          // Auto-select best video
          if (groups.length > 0) {
              // Try to find a "Trailer" in the first available group
              const firstGroup = groups[0];
              const trailer = firstGroup.videos.find(v => v.type === 'Trailer') || firstGroup.videos[0];
              setSelectedVideo(trailer);
          }

      } catch (e) {
          console.error("Failed to load videos", e);
      } finally {
          setLoading(false);
      }
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fade-in" onClick={onClose}>
        <div 
            className="bg-zinc-950 border border-zinc-800 w-full max-w-6xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] relative"
            onClick={e => e.stopPropagation()}
        >
            {/* Minimal Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 pointer-events-none">
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 pointer-events-auto">
                    <h2 className="text-sm font-bold text-white leading-tight flex items-center gap-2">
                        {item.is_movie ? <Film className="w-4 h-4 text-zinc-400" /> : <Tv className="w-4 h-4 text-zinc-400" />}
                        {item.show_name || item.name}
                    </h2>
                </div>
                <button onClick={onClose} className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors pointer-events-auto border border-white/10">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Main Player Area */}
                <div className="flex-1 bg-black flex flex-col justify-center relative min-h-[300px] lg:min-h-0">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        </div>
                    ) : selectedVideo ? (
                        <>
                            <iframe 
                                src={`https://www.youtube.com/embed/${selectedVideo.key}?autoplay=1&rel=0&modestbranding=1&origin=${window.location.origin}`}
                                className="w-full h-full aspect-video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                referrerPolicy="strict-origin-when-cross-origin"
                                title={selectedVideo.name}
                            />
                            {/* Fallback Link Overlay */}
                            <a 
                                href={`https://www.youtube.com/watch?v=${selectedVideo.key}`}
                                target="_blank"
                                rel="noreferrer"
                                className="absolute bottom-6 right-6 px-4 py-2 bg-red-600 hover:bg-red-500 backdrop-blur-md rounded-xl text-white shadow-lg shadow-red-900/50 flex items-center gap-2 text-xs font-bold transition-all opacity-0 hover:opacity-100 group-hover:opacity-100"
                                title="Open in YouTube"
                            >
                                <ExternalLink className="w-3 h-3" /> YouTube
                            </a>
                        </>
                    ) : (
                        <div className="text-zinc-500 flex flex-col items-center">
                            <VideoIcon className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-zinc-600">No videos available</p>
                        </div>
                    )}
                </div>

                {/* Sidebar Playlist */}
                <div className="w-full lg:w-80 bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
                    <div className="p-6 pb-2 sticky top-0 z-10 bg-zinc-950/95 backdrop-blur">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                            Queue
                        </h3>
                    </div>
                    
                    <div className="p-4 space-y-6">
                        {videoGroups.map((group, idx) => (
                            <div key={idx} className="space-y-2">
                                <h4 className="px-2 text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">{group.title}</h4>
                                {group.videos.map(video => (
                                    <button
                                        key={video.id}
                                        onClick={() => setSelectedVideo(video)}
                                        className={`
                                            w-full p-2 rounded-xl flex items-start gap-3 text-left transition-all group border
                                            ${selectedVideo?.id === video.id 
                                                ? 'bg-zinc-900 border-zinc-700 shadow-lg' 
                                                : 'bg-transparent border-transparent hover:bg-zinc-900 hover:border-zinc-800'}
                                        `}
                                    >
                                        <div className="relative w-24 aspect-video bg-zinc-900 rounded-lg overflow-hidden shrink-0 mt-0.5 border border-white/5">
                                            <img 
                                                src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`} 
                                                className={`w-full h-full object-cover transition-opacity ${selectedVideo?.id === video.id ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}
                                                alt=""
                                            />
                                            {selectedVideo?.id === video.id && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 py-0.5">
                                            <p className={`text-xs font-medium leading-snug line-clamp-2 ${selectedVideo?.id === video.id ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                                                {video.name}
                                            </p>
                                            <span className="text-[9px] text-zinc-600 block mt-1.5 uppercase font-bold tracking-wide">{video.type}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default TrailerModal;