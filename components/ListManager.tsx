
import React, { useState } from 'react';
import { ListPlus, X, Trash2, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { getListDetails } from '../services/tmdb';

interface ListManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

const ListManager: React.FC<ListManagerProps> = ({ isOpen, onClose }) => {
  const addToWatchlist = useStore(state => state.addToWatchlist);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputVal.trim()) return;

      setLoading(true);
      setError('');
      setSuccess('');

      try {
          let listId = inputVal.trim();
          if (listId.includes('themoviedb.org')) {
              const matches = listId.match(/list\/(\d+)/);
              if (matches && matches[1]) {
                  listId = matches[1];
              }
          }

          const { items, name } = await getListDetails(listId);
          items.forEach(item => addToWatchlist(item));
          setSuccess(`Imported ${items.length} items from "${name}"`);
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
        <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><ListPlus className="w-5 h-5 text-indigo-400" /> Import List</h2>
                <p className="text-xs text-zinc-400 mt-1">One-time import from TMDB lists.</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar bg-zinc-950/30">
            <form onSubmit={handleSubscribe} className="mb-4">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 ml-1">TMDB List ID or URL</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input type="text" value={inputVal} onChange={(e) => setInputVal(e.target.value)} placeholder="e.g. 8254729" className="w-full bg-black/40 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder:text-zinc-600" />
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    </div>
                    <button type="submit" disabled={loading || !inputVal.trim()} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Import'}
                    </button>
                </div>
                {error && <p className="text-red-400 text-xs mt-2 ml-1">{error}</p>}
                {success && <p className="text-emerald-400 text-xs mt-2 ml-1">{success}</p>}
            </form>
        </div>
        </div>
    </div>
  );
};

export default ListManager;
