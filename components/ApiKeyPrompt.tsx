
import React, { useState } from 'react';
import { Key, ChevronRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store';
import { setApiToken } from '../services/tmdb';

const ApiKeyPrompt: React.FC = () => {
    const { user, login, settings } = useStore();
    const [key, setKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // If key exists in user object, don't show
    if (user?.tmdb_key) return null;

    const handleSave = () => {
        if (!key.trim()) return;

        // Update Store
        if (user) {
            const updatedUser = { ...user, tmdb_key: key.trim() };
            login(updatedUser);
            setApiToken(key.trim());
            setIsSaved(true);
            
            // Allow animation to play before unmounting (controlled by parent or state check)
        }
    };

    if (isSaved) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-fade-in">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                
                <div className="p-8">
                    <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6 mx-auto border border-zinc-700 shadow-inner">
                        <Key className="w-8 h-8 text-indigo-500" />
                    </div>

                    <h2 className="text-2xl font-black text-white text-center mb-2">Access Required</h2>
                    <p className="text-sm text-zinc-400 text-center mb-8 leading-relaxed">
                        To fetch the latest show data, the calendar needs a TMDB API Key. It's free and takes 30 seconds to get.
                    </p>

                    <div className="space-y-4">
                        <div className="relative">
                            <input 
                                type={showKey ? "text" : "password"} 
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="Enter TMDB API Key"
                                className="w-full bg-black/50 border border-zinc-700 rounded-xl pl-4 pr-12 py-4 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono shadow-inner"
                                autoFocus
                            />
                            <button 
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                            >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <button 
                            onClick={handleSave}
                            disabled={!key.trim()}
                            className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Connect Calendar <ChevronRight className="w-4 h-4" />
                        </button>

                        <div className="pt-4 border-t border-zinc-800 text-center">
                            <a 
                                href="https://www.themoviedb.org/settings/api" 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] font-bold text-zinc-500 hover:text-indigo-400 uppercase tracking-widest transition-colors"
                            >
                                Get a free key here
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyPrompt;
