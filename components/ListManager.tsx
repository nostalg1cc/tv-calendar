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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div 
        className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" 
        onClick={e => e.stopPropagation()}
        >
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ListPlus className="w-5 h-5 text-indigo-400" />
                    List Subscriptions
                </h2>
                <p className="text-xs text-zinc-400 mt-1">Sync your calendar with curated TMDB lists.</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
            </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar bg-zinc-950/30">
            
            {/* Input Form */}
            <form onSubmit={handleSubscribe} className="mb-8">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">
                    Add New List (ID or URL)
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            placeholder="e.g. 8254729"
                            className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-zinc-600"
                        />
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    </div>
                    <button 
                        type="submit"
                        disabled={loading || !inputVal.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Subscribe'}
                    </button>
                </div>
                {error && <p className="text-red-400 text-xs mt-2 ml-1 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-400 inline-block" /> {error}</p>}
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
                        <p className="text-zinc-400 text-sm font-medium">No lists subscribed yet.</p>
                        <p className="text-zinc-600 text-xs mt-1">Add a TMDB List ID to start syncing.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {subscribedLists.map(list => (
                            <div key={list.id} className="bg-zinc-900 rounded-xl p-3 flex items-center justify-between border border-zinc-800 hover:border-zinc-700 transition-colors group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                        <span className="font-bold text-xs">#{list.id}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-white text-sm truncate group-hover:text-indigo-300 transition-colors">{list.name}</h4>
                                        <p className="text-xs text-zinc-500">{list.item_count} items synced</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => unsubscribeFromList(list.id)}
                                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Unsubscribe"
                                >
                                    <Trash2 className="w-4 h-4" />
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