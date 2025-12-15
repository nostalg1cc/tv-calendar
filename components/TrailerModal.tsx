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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in" onClick={onClose}>
        <div 
            className="bg-zinc-950 border border-zinc-800 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
            onClick={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-full text-indigo-400">
                        {item.is_movie ? <Film className="w-5 h-5" /> : <Tv className="w-5 h-5" />}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white leading-tight">
                            {item.show_name || item.name}
                        </h2>
                        {!item.is_movie && (
                            <p className="text-xs text-zinc-400">
                                S{item.season_number} E{item.episode_number} • {item.name}
                            </p>
                        )}
                    </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Main Player Area */}
                <div className="flex-1 bg-black flex flex-col justify-center relative min-h-[300px] md:min-h-0">
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
                            {/* Fallback Link Overlay (Hidden unless needed, but accessible) */}
                            <a 
                                href={`https://www.youtube.com/watch?v=${selectedVideo.key}`}
                                target="_blank"
                                rel="noreferrer"
                                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-600/80 backdrop-blur-md rounded-lg text-white opacity-0 hover:opacity-100 transition-opacity flex items-center gap-2 text-xs font-bold"
                                title="Open in YouTube"
                            >
                                <ExternalLink className="w-4 h-4" /> Watch on YouTube
                            </a>
                        </>
                    ) : (
                        <div className="text-zinc-500 flex flex-col items-center">
                            <VideoIcon className="w-12 h-12 mb-2 opacity-50" />
                            <p>No videos available</p>
                        </div>
                    )}
                </div>

                {/* Sidebar Playlist */}
                <div className="w-full md:w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
                    <div className="p-4 border-b border-zinc-800 bg-zinc-900 sticky top-0 z-10">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                            Available Clips
                        </h3>
                    </div>
                    
                    <div className="p-2 space-y-6">
                        {videoGroups.map((group, idx) => (
                            <div key={idx} className="space-y-1">
                                <h4 className="px-2 text-xs font-bold text-indigo-400 mb-2 mt-2">{group.title}</h4>
                                {group.videos.map(video => (
                                    <button
                                        key={video.id}
                                        onClick={() => setSelectedVideo(video)}
                                        className={`
                                            w-full p-2 rounded-lg flex items-start gap-3 text-left transition-all group
                                            ${selectedVideo?.id === video.id ? 'bg-zinc-800 ring-1 ring-zinc-700' : 'hover:bg-zinc-800/50'}
                                        `}
                                    >
                                        <div className="relative w-24 aspect-video bg-black rounded overflow-hidden shrink-0 mt-0.5">
                                            <img 
                                                src={`https://img.youtube.com/vi/${video.key}/mqdefault.jpg`} 
                                                className={`w-full h-full object-cover transition-opacity ${selectedVideo?.id === video.id ? 'opacity-50' : 'opacity-80 group-hover:opacity-100'}`}
                                                alt=""
                                            />
                                            {selectedVideo?.id === video.id && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-xs font-medium leading-snug line-clamp-2 ${selectedVideo?.id === video.id ? 'text-white' : 'text-zinc-300 group-hover:text-white'}`}>
                                                {video.name}
                                            </p>
                                            <span className="text-[10px] text-zinc-500 block mt-1">{video.type}</span>
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