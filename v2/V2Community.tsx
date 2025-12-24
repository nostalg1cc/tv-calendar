
import React, { useState, useMemo, useEffect } from 'react';
import { 
    MessageSquare, Users, Shield, Eye, EyeOff, 
    MoreHorizontal, Pin, Filter, Search, Plus, 
    Flame, Layout, Star, ChevronRight, Hash,
    AlertCircle, Check, Heart, Share2, Play, X
} from 'lucide-react';
import { useStore } from '../store';
import { getImageUrl, getVideos } from '../services/tmdb';
import { formatDistanceToNow } from 'date-fns';
import { WatchedItem, TVShow } from '../types';

// --- TYPES ---

type SpoilerScope = 'episode' | 'season' | 'show' | 'news';

interface CommunityPost {
    id: string;
    showId: number;
    showName: string;
    userId: string;
    username: string;
    userColor: string;
    content: string;
    timestamp: number;
    scope: SpoilerScope;
    seasonNumber?: number;
    episodeNumber?: number;
    likes: number;
    comments: number;
    isPinned?: boolean;
    videoKey?: string;
    tags?: string[];
}

// --- SUB-COMPONENTS ---

const SpoilerBadge = ({ scope, s, e }: { scope: SpoilerScope, s?: number, e?: number }) => {
    const config = {
        episode: { label: `S${s} E${e}`, bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
        season: { label: `Season ${s}`, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
        show: { label: 'Full Series', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
        news: { label: 'News', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    };
    const c = config[scope];
    return (
        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${c.bg} ${c.text} ${c.border}`}>
            {c.label}
        </span>
    );
};

const CreatePostBox = ({ 
    onClick, 
    activeShowName 
}: { 
    onClick: () => void, 
    activeShowName?: string 
}) => (
    <div 
        onClick={onClick}
        className="bg-[#09090b] border border-white/10 p-4 mb-6 cursor-pointer group transition-all hover:border-white/20"
    >
        <div className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold">
                ME
            </div>
            <div className="flex-1 bg-zinc-900/50 h-10 rounded border border-white/5 flex items-center px-4 text-sm text-zinc-500 group-hover:bg-zinc-900 group-hover:text-zinc-400 transition-colors">
                {activeShowName ? `Discuss ${activeShowName}...` : "Start a discussion..."}
            </div>
            <button className="w-10 h-10 bg-white text-black rounded flex items-center justify-center hover:bg-zinc-200 transition-colors">
                <Plus className="w-5 h-5" />
            </button>
        </div>
    </div>
);

// --- MAIN COMPONENT ---

const V2Community: React.FC = () => {
    const { watchlist, history, user } = useStore();
    
    // UI State
    const [selectedShowId, setSelectedShowId] = useState<number | 'all'>('all');
    const [pinnedCommunities, setPinnedCommunities] = useState<Set<number>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    
    // Data State
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    
    // Computed
    const selectedShow = useMemo(() => 
        selectedShowId === 'all' ? null : watchlist.find(s => s.id === selectedShowId), 
    [selectedShowId, watchlist]);

    // --- MOCK DATA GENERATOR ---
    useEffect(() => {
        // Generate consistent mock posts based on user's watchlist
        const mockPosts: CommunityPost[] = [];
        const users = ['Cinephile', 'ShowRunner', 'SpoilerKing', 'Newbie', 'TVAddict', 'Critic_01'];
        const comments = [
            "Just finished the latest ep. My mind is blown!",
            "Unpopular opinion: The pacing is actually perfect.",
            "Can we talk about that cliffhanger?",
            "I'm worried about where this character arc is going.",
            "Visuals are stunning this season.",
            "Wait, did I miss something in the intro?"
        ];

        // 1. Generate Posts for Watchlist Items
        watchlist.forEach(show => {
            // Add a Trailer Post (News)
            mockPosts.push({
                id: `trailer-${show.id}`,
                showId: show.id,
                showName: show.name,
                userId: 'system',
                username: 'Official Updates',
                userColor: 'bg-zinc-800',
                content: `Latest trailer released for ${show.name}. Thoughts?`,
                timestamp: Date.now() - Math.random() * 86400000 * 2, // Recent
                scope: 'news',
                likes: Math.floor(Math.random() * 500) + 100,
                comments: Math.floor(Math.random() * 50),
                isPinned: true
            });

            // Add Random User Posts
            const postCount = Math.floor(Math.random() * 3) + 1;
            for(let i=0; i<postCount; i++) {
                const scopeRand = Math.random();
                let scope: SpoilerScope = 'episode';
                let s = 1, e = 1;

                if (scopeRand > 0.8) scope = 'show';
                else if (scopeRand > 0.6) scope = 'season';
                else if (scopeRand > 0.5) scope = 'news';

                if (scope === 'episode' || scope === 'season') {
                    s = Math.floor(Math.random() * 3) + 1;
                    e = Math.floor(Math.random() * 8) + 1;
                }

                mockPosts.push({
                    id: `${show.id}-${i}`,
                    showId: show.id,
                    showName: show.name,
                    userId: `u-${i}`,
                    username: users[Math.floor(Math.random() * users.length)],
                    userColor: ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-indigo-500'][Math.floor(Math.random() * 4)],
                    content: comments[Math.floor(Math.random() * comments.length)],
                    timestamp: Date.now() - Math.floor(Math.random() * 1000000000),
                    scope,
                    seasonNumber: s,
                    episodeNumber: e,
                    likes: Math.floor(Math.random() * 100),
                    comments: Math.floor(Math.random() * 20)
                });
            }
        });

        setPosts(mockPosts.sort((a, b) => b.timestamp - a.timestamp));
    }, [watchlist]);

    // --- LOGIC ---

    const togglePin = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setPinnedCommunities(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const isSpoiler = (post: CommunityPost) => {
        if (post.scope === 'news' || post.isPinned) return false;
        
        // Find progress for the specific show of the post
        let maxWatchedS = 0;
        let maxWatchedE = 0;

        Object.values(history).forEach((item: WatchedItem) => {
            if (item.tmdb_id === post.showId && item.is_watched) {
                if ((item.season_number || 0) > maxWatchedS) {
                    maxWatchedS = item.season_number || 0;
                    maxWatchedE = item.episode_number || 0;
                } else if ((item.season_number || 0) === maxWatchedS && (item.episode_number || 0) > maxWatchedE) {
                    maxWatchedE = item.episode_number || 0;
                }
            }
        });

        // "Whole Show" -> Spoiler if not started
        if (post.scope === 'show') return maxWatchedS < 1;
        // Season -> Spoiler if season > watched
        if (post.scope === 'season') return (post.seasonNumber || 0) > maxWatchedS;
        // Episode -> Spoiler if beyond progress
        if (post.scope === 'episode') {
            if ((post.seasonNumber || 0) > maxWatchedS) return true;
            if ((post.seasonNumber || 0) === maxWatchedS && (post.episodeNumber || 0) > maxWatchedE) return true;
        }

        return false;
    };

    const filteredPosts = useMemo(() => {
        let current = posts;
        if (selectedShowId !== 'all') {
            current = current.filter(p => p.showId === selectedShowId);
        }
        return current;
    }, [posts, selectedShowId]);

    const sortedCommunities = useMemo(() => {
        let list = [...watchlist];
        if (searchTerm) {
            list = list.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        return list.sort((a, b) => {
            const aPinned = pinnedCommunities.has(a.id);
            const bPinned = pinnedCommunities.has(b.id);
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [watchlist, pinnedCommunities, searchTerm]);

    // --- RENDER HELPERS ---

    const CommunityItem = ({ show }: { show: TVShow }) => {
        const isSelected = selectedShowId === show.id;
        const isPinned = pinnedCommunities.has(show.id);

        return (
            <button
                onClick={() => setSelectedShowId(show.id)}
                className={`
                    w-full flex items-center gap-3 p-2 rounded-lg transition-all group relative
                    ${isSelected ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}
                `}
            >
                <div className={`relative w-8 h-8 rounded overflow-hidden shrink-0 border ${isSelected ? 'border-white/20' : 'border-white/5 group-hover:border-white/10'}`}>
                    <img src={getImageUrl(show.poster_path)} className="w-full h-full object-cover" alt="" />
                </div>
                <span className="text-xs font-bold truncate flex-1 text-left">{show.name}</span>
                
                {/* Pin Action (Visible on Hover or if Pinned) */}
                <div 
                    onClick={(e) => togglePin(e, show.id)}
                    className={`p-1.5 rounded-md transition-all ${isPinned ? 'text-indigo-400 opacity-100' : 'text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10'}`}
                >
                    <Star className={`w-3 h-3 ${isPinned ? 'fill-current' : ''}`} />
                </div>
            </button>
        );
    };

    const FeedPost = ({ post }: { post: CommunityPost }) => {
        const blocked = isSpoiler(post);
        return (
            <div className="bg-[#09090b] border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-colors group">
                {/* Context Header */}
                {(selectedShowId === 'all' || post.isPinned) && (
                    <div className="px-4 py-2 border-b border-white/5 bg-zinc-900/30 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            {post.isPinned && <Pin className="w-3 h-3 text-indigo-400 fill-current" />}
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                {post.isPinned ? 'Pinned Post' : post.showName}
                            </span>
                         </div>
                         <SpoilerBadge scope={post.scope} s={post.seasonNumber} e={post.episodeNumber} />
                    </div>
                )}
                
                <div className="p-4">
                    {/* User Info */}
                    <div className="flex justify-between items-start mb-3">
                         <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded ${post.userColor} flex items-center justify-center text-[10px] font-black text-white/70`}>
                                 {post.username.charAt(0)}
                             </div>
                             <div>
                                 <div className="flex items-center gap-2">
                                     <span className="text-xs font-bold text-white">{post.username}</span>
                                     <span className="text-[10px] text-zinc-600 font-medium">{formatDistanceToNow(post.timestamp)} ago</span>
                                 </div>
                             </div>
                         </div>
                    </div>

                    {/* Content */}
                    <div className={`relative ${blocked ? 'cursor-pointer group/spoiler' : ''}`}>
                         <p className={`text-sm text-zinc-300 leading-relaxed ${blocked ? 'blur-sm opacity-20 select-none transition-all duration-500 group-hover/spoiler:opacity-40' : ''}`}>
                             {post.content}
                         </p>
                         {blocked && (
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="bg-red-500/10 border border-red-500/30 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2">
                                     <EyeOff className="w-3.5 h-3.5 text-red-400" />
                                     <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Spoiler</span>
                                 </div>
                             </div>
                         )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/5">
                        <button className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-white transition-colors">
                            <Heart className="w-3.5 h-3.5" /> {post.likes}
                        </button>
                        <button className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-white transition-colors">
                            <MessageSquare className="w-3.5 h-3.5" /> {post.comments}
                        </button>
                        <button className="ml-auto text-zinc-600 hover:text-white transition-colors">
                            <Share2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full bg-[#020202] text-zinc-100 overflow-hidden font-sans">
            
            {/* --- COLUMN 1: NAVIGATION & CIRCLES --- */}
            <div className="w-64 shrink-0 border-r border-white/5 flex flex-col bg-[#050505]">
                {/* Header */}
                <div className="h-16 flex items-center px-4 border-b border-white/5">
                    <h1 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-500" /> Communities
                    </h1>
                </div>

                {/* Main Nav */}
                <div className="p-3 border-b border-white/5">
                    <button 
                        onClick={() => setSelectedShowId('all')}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-all ${selectedShowId === 'all' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <Layout className="w-4 h-4" />
                        <span className="text-xs tracking-wide">Global Feed</span>
                    </button>
                </div>

                {/* Search */}
                <div className="p-3 pb-0">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
                        <input 
                            type="text" 
                            placeholder="Find circle..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none placeholder:text-zinc-600"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
                    <div className="flex items-center justify-between px-1 py-2">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">My Circles</span>
                        <span className="text-[9px] text-zinc-600 font-mono">{watchlist.length}</span>
                    </div>
                    {sortedCommunities.map(show => <CommunityItem key={show.id} show={show} />)}
                </div>
            </div>

            {/* --- COLUMN 2: MAIN FEED --- */}
            <div className="flex-1 min-w-0 flex flex-col bg-[#020202] border-r border-white/5 relative">
                {/* Header */}
                <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#020202]/80 backdrop-blur-md sticky top-0 z-30">
                    <div>
                         <h2 className="text-lg font-black text-white leading-none mb-1">
                             {selectedShow ? selectedShow.name : 'Global Feed'}
                         </h2>
                         <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">
                             {selectedShow ? 'Community Discussion' : 'All Activity'}
                         </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-900 rounded-lg border border-white/5">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="max-w-3xl mx-auto">
                        <CreatePostBox onClick={() => setIsPosting(true)} activeShowName={selectedShow?.name} />
                        
                        <div className="space-y-4">
                            {filteredPosts.map(post => <FeedPost key={post.id} post={post} />)}
                            
                            {filteredPosts.length === 0 && (
                                <div className="text-center py-20 opacity-50">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
                                    <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No Posts Yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- COLUMN 3: CONTEXT PANEL --- */}
            <div className="w-80 shrink-0 bg-[#050505] flex-col hidden xl:flex">
                <div className="p-6 border-b border-white/5">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 mb-4">
                        {selectedShow ? 'About Circle' : 'Trending Now'}
                    </h3>
                    
                    {selectedShow ? (
                        <div className="space-y-6">
                            <div className="aspect-video rounded-xl overflow-hidden bg-zinc-900 relative group">
                                <img src={getImageUrl(selectedShow.backdrop_path)} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Play className="w-10 h-10 text-white opacity-80" />
                                </div>
                            </div>
                            
                            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Shield className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Smart Shield Active</span>
                                </div>
                                <p className="text-[10px] text-zinc-500 leading-relaxed">
                                    Posts discussing episodes you haven't watched yet are automatically blurred.
                                </p>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-bold text-zinc-400 mb-2 uppercase tracking-wide">Community Rules</h4>
                                <ul className="text-xs text-zinc-500 space-y-2 list-disc pl-4">
                                    <li>Tag spoilers appropriately.</li>
                                    <li>Be respectful to other fans.</li>
                                    <li>Keep discussions on topic.</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {[1,2,3].map(i => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-zinc-900/30 rounded-xl border border-white/5">
                                    <span className="text-lg font-black text-zinc-700">0{i}</span>
                                    <div>
                                        <h4 className="text-xs font-bold text-white">House of the Dragon</h4>
                                        <span className="text-[10px] text-indigo-400 font-medium">1.2k Active Users</span>
                                    </div>
                                </div>
                            ))}
                            
                            <div className="mt-8 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                                <h4 className="text-xs font-bold text-indigo-300 mb-1 flex items-center gap-2">
                                    <Flame className="w-3 h-3" /> Hot Topic
                                </h4>
                                <p className="text-[10px] text-zinc-400 leading-relaxed">
                                    Season finales are airing this week. Expect high spoiler traffic in global feeds.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal remains mostly same, just styled to match V2 */}
            {isPosting && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#09090b] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900/50">
                            <h3 className="font-bold text-white">New Discussion</h3>
                            <button onClick={() => setIsPosting(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-12 text-center text-zinc-500 text-sm">
                            Posting Mockup UI
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default V2Community;
