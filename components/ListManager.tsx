import React, { useState } from 'react';
import { ListPlus, X, Trash2, Link as LinkIcon, Loader2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div 
        className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]" 
        onClick={e => e.stopPropagation()}
        >
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ListPlus className="w-5 h-5 text-indigo-400" />
                    List Subscriptions
                </h2>
                <p className="text-xs text-slate-400 mt-1">Sync your calendar with curated TMDB lists.</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
            </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
            
            {/* Input Form */}
            <form onSubmit={handleSubscribe} className="mb-8">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Add New List (ID or URL)
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            value={inputVal}
                            onChange={(e) => setInputVal(e.target.value)}
                            placeholder="e.g. 8254729"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    </div>
                    <button 
                        type="submit"
                        disabled={loading || !inputVal.trim()}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Subscribe'}
                    </button>
                </div>
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </form>

            <div className="h-px bg-white/5 mb-6" />

            {/* Subscribed Lists */}
            <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Active Subscriptions</h3>
                
                {subscribedLists.length === 0 ? (
                    <div className="text-center py-8 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
                        <ListPlus className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">No lists subscribed yet.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {subscribedLists.map(list => (
                            <div key={list.id} className="bg-slate-800 rounded-lg p-3 flex items-center justify-between border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                        <span className="font-bold text-xs">#{list.id}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-white text-sm truncate">{list.name}</h4>
                                        <p className="text-xs text-slate-400">{list.item_count} items synced</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => unsubscribeFromList(list.id)}
                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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