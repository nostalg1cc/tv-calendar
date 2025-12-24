
import React, { useState, useMemo, useEffect } from 'react';
import { 
    MessageSquare, Users, Hash, Shield, Eye, EyeOff, 
    MoreHorizontal, Send, Pin, AlertTriangle, Filter, 
    Search, Plus, Calendar, Film, Tv, Play, CheckCircle2, X 
} from 'lucide-react';
import { useStore } from '../store';
import { TVShow, Episode, WatchedItem } from '../types';
import { getImageUrl, getBackdropUrl, getVideos } from '../services/tmdb';
import { formatDistanceToNow } from 'date-fns';

// --- MOCK TYPES ---

type SpoilerScope = 'episode' | 'season' | 'show' | 'news';

interface CommunityPost {
    id: string;
    userId: string;
    username: string;
    avatarColor: string;
    content: string;
    timestamp: number;
    scope: SpoilerScope;
    seasonNumber?: number;
    episodeNumber?: number;
    likes: number;
    comments: number;
    isPinned?: boolean;
    videoKey?: string; // For pinned trailers
}

// --- HELPER COMPONENTS ---

const SpoilerBadge = ({ scope, s, e }: { scope: SpoilerScope, s?: number, e?: number }) => {
    let label = '';
    let color = '';

    switch (scope) {
        case 'episode':
            label = `S${s} E${e}`;
            color = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
            break;
        case 'season':
            label = `Season ${s}`;
            color = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            break;
        case 'show':
            label = 'Full Show';
            color = 'bg-red-500/10 text-red-400 border-red-500/20';
            break;
        case 'news':
            label = 'News / Upcoming';
            color = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            break;
    }

    return (
        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${color}`}>
            {label}
        </span>
    );
};

// --- MAIN COMPONENT ---

const V2Community: React.FC = () => {
    const { watchlist, history, user } = useStore();
    const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [viewFilter, setViewFilter] = useState<'safe' | 'all'>('safe');
    const [isPosting, setIsPosting] = useState(false);
    
    // Posting Form State
    const [postContent, setPostContent] = useState('');
    const [postScope, setPostScope] = useState<SpoilerScope>('episode');
    const [postS, setPostS] = useState(1);
    const [postE, setPostE] = useState(1);

    const selectedShow = useMemo(() => 
        watchlist.find(s => s.id === selectedShowId) || watchlist[0], 
    [selectedShowId, watchlist]);

    // Initial Selection
    useEffect(() => {
        if (!selectedShowId && watchlist.length > 0) {
            setSelectedShowId(watchlist[0].id);
        }
    }, [watchlist]);

    // Mock Data Generator & Pinned Trailer Fetcher
    useEffect(() => {
        if (!selectedShow) return;

        const generateMockPosts = async () => {
            const mockPosts: CommunityPost[] = [];

            // 1. Fetch Official Trailer for Pin
            try {
                const videos = await getVideos(selectedShow.media_type, selectedShow.id);
                const trailer = videos.find(v => v.type === 'Trailer') || videos[0];
                if (trailer) {
                    mockPosts.push({
                        id: 'pinned-trailer',
                        userId: 'System',
                        username: 'Official Updates',
                        avatarColor: 'bg-zinc-800',
                        content: `Watch the latest trailer for ${selectedShow.name}. Discussion below!`,
                        timestamp: Date.now(),
                        scope: 'news',
                        likes: 1240,
                        comments: 45,
                        isPinned: true,
                        videoKey: trailer.key
                    });
                }
            } catch (e) {}

            // 2. Generate Random User Posts
            const users = ['Cinephile99', 'ShowRunner', 'SpoilerKing', 'NewbieWatcher'];
            const comments = [
                "Just finished this episode. My mind is blown!",
                "Does anyone else think the pacing is weird?",
                "The cinematography in this season is next level.",
                "I can't believe they killed him off...",
                "Waiting for the next season is torture."
            ];

            for (let i = 0; i < 15; i++) {
                const scopeRand = Math.random();
                let scope: SpoilerScope = 'episode';
                let s = 1, e = 1;

                if (scopeRand > 0.8) scope = 'show';
                else if (scopeRand > 0.6) scope = 'season';
                else if (scopeRand > 0.5) scope = 'news';

                if (scope === 'episode' || scope === 'season') {
                    s = Math.floor(Math.random() * 4) + 1;
                    e = Math.floor(Math.random() * 10) + 1;
                }

                mockPosts.push({
                    id: `post-${i}`,
                    userId: `user-${i}`,
                    username: users[Math.floor(Math.random() * users.length)],
                    avatarColor: ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500'][Math.floor(Math.random() * 4)],
                    content: comments[Math.floor(Math.random() * comments.length)],
                    timestamp: Date.now() - Math.floor(Math.random() * 1000000000),
                    scope,
                    seasonNumber: s,
                    episodeNumber: e,
                    likes: Math.floor(Math.random() * 50),
                    comments: Math.floor(Math.random() * 10)
                });
            }

            setPosts(mockPosts);
        };

        generateMockPosts();
    }, [selectedShow]);

    // --- SPOILER CHECKER ---
    const isSpoiler = (post: CommunityPost) => {
        if (!selectedShow || post.scope === 'news' || post.isPinned) return false;
        
        // Find user progress for this show
        // We iterate history keys to find the max watched episode
        // This is a simplified check. A robust backend would return "last_watched" directly.
        let maxWatchedS = 0;
        let maxWatchedE = 0;

        // Scan local history for this show
        Object.values(history).forEach((item: WatchedItem) => {
            if (item.tmdb_id === selectedShow.id && item.is_watched) {
                if ((item.season_number || 0) > maxWatchedS) {
                    maxWatchedS = item.season_number || 0;
                    maxWatchedE = item.episode_number || 0;
                } else if ((item.season_number || 0) === maxWatchedS && (item.episode_number || 0) > maxWatchedE) {
                    maxWatchedE = item.episode_number || 0;
                }
            }
        });

        // "Whole Show" scope -> Spoiler if not fully watched (assuming show isn't endless, but for safety let's say if you haven't watched anything recently it warns)
        if (post.scope === 'show') {
            // Simplified: If you haven't watched at least Season 1, it's a spoiler. 
            // In a real app, compare against total seasons.
            return maxWatchedS < 1; 
        }

        if (post.scope === 'season') {
            return (post.seasonNumber || 0) > maxWatchedS;
        }

        if (post.scope === 'episode') {
            if ((post.seasonNumber || 0) > maxWatchedS) return true;
            if ((post.seasonNumber || 0) === maxWatchedS && (post.episodeNumber || 0) > maxWatchedE) return true;
        }

        return false;
    };

    if (watchlist.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                <Users className="w-12 h-12 mb-4 opacity-50" />
                <h2 className="text-lg font-bold text-white">Join Communities</h2>
                <p className="text-xs">Add shows to your library to access their circles.</p>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-[#020202]">
            
            {/* 1. COMMUNITY SELECTOR (LEFT SIDEBAR) */}
            <div className="w-20 md:w-64 border-r border-white/5 flex flex-col bg-zinc-950/30 shrink-0">
                <div className="p-4 border-b border-white/5 h-16 flex items-center">
                    <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest hidden md:block">Circles</h2>
                    <Users className="w-5 h-5 text-zinc-500 md:hidden mx-auto" />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {watchlist.map(show => (
                        <button
                            key={show.id}
                            onClick={() => setSelectedShowId(show.id)}
                            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all group ${selectedShowId === show.id ? 'bg-indigo-600/10 border border-indigo-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                            <div className="relative w-10 h-10 shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                                <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover" alt="" />
                                {selectedShowId === show.id && <div className="absolute inset-0 bg-indigo-500/20 ring-1 ring-inset ring-indigo-500" />}
                            </div>
                            <div className="hidden md:block text-left min-w-0">
                                <h4 className={`text-xs font-bold truncate ${selectedShowId === show.id ? 'text-indigo-200' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{show.name}</h4>
                                <span className="text-[9px] text-zinc-600 font-mono uppercase">2.4k Members</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. MAIN FEED */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                
                {/* Header */}
                <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#020202]/90 backdrop-blur-md sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 overflow-hidden border border-white/10 hidden sm:block">
                            <img src={getImageUrl(selectedShow?.poster_path)} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                            <h1 className="text-base font-black text-white leading-none mb-0.5">{selectedShow?.name}</h1>
                            <p className="text-[10px] text-zinc-500 font-medium">Community Feed</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                         <div className="hidden sm:flex bg-zinc-900 rounded-lg p-0.5 border border-white/5">
                             <button onClick={() => setViewFilter('safe')} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${viewFilter === 'safe' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                 Spoiler Free
                             </button>
                             <button onClick={() => setViewFilter('all')} className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${viewFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                                 All Posts
                             </button>
                         </div>
                         <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />
                         <button onClick={() => setIsPosting(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg text-xs font-bold transition-colors">
                             <Plus className="w-4 h-4" /> <span className="hidden sm:inline">New Post</span>
                         </button>
                    </div>
                </header>

                {/* Posts Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-6">
                    {posts.map(post => {
                        const blocked = isSpoiler(post) && viewFilter === 'safe';
                        
                        // Render Pinned Trailer Special Card
                        if (post.isPinned && post.videoKey) {
                            return (
                                <div key={post.id} className="relative w-full aspect-video md:aspect-[3/1] rounded-2xl overflow-hidden group shadow-2xl border border-indigo-500/30">
                                    <div className="absolute inset-0 bg-black">
                                         <iframe 
                                            src={`https://www.youtube.com/embed/${post.videoKey}?autoplay=0&mute=0&controls=0&showinfo=0&rel=0&modestbranding=1`}
                                            className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity"
                                            allowFullScreen
                                            title="Trailer"
                                        />
                                    </div>
                                    <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start pointer-events-none">
                                        <div className="flex items-center gap-2">
                                            <div className="bg-indigo-600 text-white px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg">
                                                <Pin className="w-3 h-3 fill-current" /> Pinned
                                            </div>
                                            <SpoilerBadge scope="news" />
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // Standard Post
                        return (
                            <div key={post.id} className={`relative bg-zinc-900/40 border ${blocked ? 'border-red-500/20' : 'border-white/5'} rounded-2xl p-4 transition-all hover:bg-zinc-900/60`}>
                                {/* Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full ${post.avatarColor} flex items-center justify-center text-[10px] font-black text-white/50`}>
                                            {post.username.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-zinc-200">{post.username}</span>
                                                <span className="text-[10px] text-zinc-600">• {formatDistanceToNow(post.timestamp)} ago</span>
                                            </div>
                                            <div className="flex gap-2 mt-0.5">
                                                <SpoilerBadge scope={post.scope} s={post.seasonNumber} e={post.episodeNumber} />
                                            </div>
                                        </div>
                                    </div>
                                    <button className="text-zinc-600 hover:text-white"><MoreHorizontal className="w-4 h-4" /></button>
                                </div>

                                {/* Content */}
                                <div className={`relative rounded-lg overflow-hidden ${blocked ? 'bg-black/40 p-4 border border-red-900/20 cursor-pointer group/spoiler' : ''}`}>
                                    <p className={`text-sm text-zinc-300 leading-relaxed ${blocked ? 'blur-sm opacity-30 select-none group-hover/spoiler:blur-md transition-all' : ''}`}>
                                        {post.content}
                                    </p>
                                    
                                    {blocked && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-wide backdrop-blur-md shadow-lg">
                                                <EyeOff className="w-3.5 h-3.5" /> Spoiler Risk
                                            </div>
                                            <p className="text-[9px] text-zinc-500 mt-2 font-mono">Click to reveal at your own risk</p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
                                    <button className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-indigo-400 transition-colors">
                                        <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[8px]">▲</div>
                                        {post.likes}
                                    </button>
                                    <button className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-white transition-colors">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        {post.comments} Comments
                                    </button>
                                    <button className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-white transition-colors ml-auto">
                                        Share
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 3. RIGHT PANEL (INFO & SETTINGS) - Desktop Only */}
            <div className="hidden xl:flex w-80 border-l border-white/5 bg-zinc-950/30 flex-col p-6">
                 <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                     <Shield className="w-4 h-4" /> Protection Level
                 </h3>
                 
                 <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 mb-6">
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-bold text-white">Smart Shield</span>
                         <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                     </div>
                     <p className="text-xs text-zinc-500 leading-relaxed">
                         Active. Posts about episodes you haven't watched yet will be blurred automatically.
                     </p>
                 </div>

                 <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">About Circle</h3>
                 <div className="text-sm text-zinc-400 space-y-2 mb-6">
                     <p>Discussion for <strong className="text-white">{selectedShow?.name}</strong>.</p>
                     <div className="flex gap-2 flex-wrap">
                         <span className="text-[10px] bg-white/5 px-2 py-1 rounded border border-white/5">TV-MA</span>
                         <span className="text-[10px] bg-white/5 px-2 py-1 rounded border border-white/5">{selectedShow?.first_air_date?.split('-')[0]}</span>
                     </div>
                 </div>

                 <div className="mt-auto bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-xl">
                     <h4 className="text-indigo-300 font-bold text-xs mb-1">Community Rules</h4>
                     <ul className="text-[10px] text-zinc-500 list-disc pl-3 space-y-1">
                         <li>Respect spoiler tags.</li>
                         <li>Be kind and courteous.</li>
                         <li>No illegal streams.</li>
                     </ul>
                 </div>
            </div>

            {/* CREATE POST MODAL */}
            {isPosting && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#09090b] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
                            <h3 className="font-bold text-white">New Post in {selectedShow?.name}</h3>
                            <button onClick={() => setIsPosting(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Scope Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Scope Tag (Required)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {['episode', 'season', 'show', 'news'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setPostScope(s as any)}
                                            className={`px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${postScope === s ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dynamic Selectors */}
                            {postScope === 'episode' && (
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block mb-2">Season</label>
                                        <input type="number" min={1} value={postS} onChange={e => setPostS(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono text-sm focus:border-indigo-500 outline-none" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block mb-2">Episode</label>
                                        <input type="number" min={1} value={postE} onChange={e => setPostE(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono text-sm focus:border-indigo-500 outline-none" />
                                    </div>
                                </div>
                            )}

                            {postScope === 'season' && (
                                <div>
                                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block mb-2">Season</label>
                                    <input type="number" min={1} value={postS} onChange={e => setPostS(Number(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono text-sm focus:border-indigo-500 outline-none" />
                                </div>
                            )}

                            {/* Content */}
                            <div>
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest block mb-2">Discussion</label>
                                <textarea 
                                    value={postContent}
                                    onChange={e => setPostContent(e.target.value)}
                                    placeholder="Share your thoughts... (Keep it spoiler-safe for the selected scope!)"
                                    className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none resize-none placeholder:text-zinc-600"
                                />
                            </div>
                        </div>

                        <div className="p-4 border-t border-white/10 bg-zinc-900/30 flex justify-end gap-3">
                             <button onClick={() => setIsPosting(false)} className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                             <button 
                                onClick={() => { 
                                    setPosts(prev => [{
                                        id: Math.random().toString(),
                                        userId: 'me',
                                        username: user?.username || 'Me',
                                        avatarColor: 'bg-indigo-600',
                                        content: postContent,
                                        scope: postScope,
                                        seasonNumber: postS,
                                        episodeNumber: postE,
                                        timestamp: Date.now(),
                                        likes: 0,
                                        comments: 0
                                    }, ...prev]);
                                    setIsPosting(false);
                                    setPostContent('');
                                }} 
                                disabled={!postContent.trim()}
                                className="px-6 py-2 bg-white text-black rounded-lg text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition-colors disabled:opacity-50"
                             >
                                 Post
                             </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default V2Community;
