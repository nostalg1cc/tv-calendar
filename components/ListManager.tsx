import React, { useState } from 'react';
import { ListPlus, X, Trash2, Link as LinkIcon, Loader2, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface ListManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

const ListManager: React.FC<ListManagerProps> = ({ isOpen, onClose }) => {
  const { subscribeToList, subscribedLists, unsubscribeFromList } = useAppContext();
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputVal.trim()) return;

      setLoading(true);
      setError('');

      try {
          // Extract ID from URL if full URL is provided (e.g. https://www.themoviedb.org/list/12345)
          let listId = inputVal.trim();
          if (listId.includes('themoviedb.org')) {
              const matches = listId.match(/list\/(\d+)/);
              if (matches && matches[1]) {
                  listId = matches[1];
              }
          }

          await subscribeToList(listId);
          setInputVal('');
      } catch (err) {
          setError('Failed to find list. Make sure the ID is correct and the list is public.');
      } finally {
          setLoading(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div 
        className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative" 
        onClick={e => e.stopPropagation()}
        >
        {/* Header */}
        <div className="relative h-28 shrink-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/40 to-teal-900/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
            
            <div className="absolute bottom-4 left-6 z-10">
                <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-md flex items-center gap-2">
                    <ListPlus className="w-6 h-6 text-emerald-400" /> Lists
                </h2>
                <p className="text-emerald-200/80 text-sm font-medium">Sync curated collections</p>
            </div>

            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-white/10 backdrop-blur-md rounded-full text-white transition-colors border border-white/5 z-20"
            >
               <X className="w-5 h-5" />
            </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar bg-zinc-950 flex-1">
            
            {/* Input Form */}
            <form onSubmit={handleSubscribe} className="mb-8">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 ml-1">
                    Subscribe to TMDB List
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            placeholder="List ID or URL..."
                            className="w-full bg-black/40 border border-zinc-800 rounded-xl pl-10 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-zinc-600 shadow-inner"
                        />
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    </div>
                    <button 
                        type="submit"
                        disabled={loading || !inputVal.trim()}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add'}
                    </button>
                </div>
                {error && <p className="text-red-400 text-xs mt-3 ml-1 flex items-center gap-1 bg-red-500/10 p-2 rounded-lg border border-red-500/20"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> {error}</p>}
            </form>

            <div className="h-px bg-zinc-800 mb-6" />

            {/* Subscribed Lists */}
            <div>
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 ml-1">Active Subscriptions</h3>
                
                {subscribedLists.length === 0 ? (
                    <div className="text-center py-10 bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800">
                        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3">
                             <ListPlus className="w-6 h-6 text-zinc-600" />
                        </div>
                        <p className="text-zinc-400 text-sm font-medium">No lists synced.</p>
                        <p className="text-zinc-600 text-xs mt-1">Paste a List ID above to start.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {subscribedLists.map(list => (
                            <div key={list.id} className="bg-zinc-900/80 rounded-2xl p-4 flex items-center justify-between border border-zinc-800 hover:border-emerald-500/30 transition-colors group">
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 font-mono text-xs font-bold">
                                        LIST
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-white text-base truncate group-hover:text-emerald-400 transition-colors">{list.name}</h4>
                                        <p className="text-xs text-zinc-500 font-mono">ID: {list.id} • {list.item_count} items</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => unsubscribeFromList(list.id)}
                                    className="p-3 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                    title="Unsubscribe"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        </div>
    </div>
  );
};

export default ListManager;