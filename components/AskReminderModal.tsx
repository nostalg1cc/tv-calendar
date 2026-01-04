import React from 'react';
import { Bell, CheckCircle, Eye, X, Calendar } from 'lucide-react';
import { useStore } from '../store';
import { TVShow, Episode } from '../types';
import toast from 'react-hot-toast';

interface AskReminderModalProps {
    isOpen: boolean;
    item: TVShow | Episode | null;
    onClose: () => void;
    onConfirm: () => void; // Used for "Set Reminder" flow
}

const AskReminderModal: React.FC<AskReminderModalProps> = ({ isOpen, item, onClose, onConfirm }) => {
    const { updateSettings, toggleWatched, markManyWatched } = useStore();

    if (!isOpen || !item) return null;

    const name = 'show_name' in item ? item.show_name : 'name' in item ? item.name : 'this item';
    const isMovie = 'media_type' in item ? item.media_type === 'movie' : item.is_movie;
    const tmdbId = 'show_id' in item && item.show_id ? item.show_id : item.id;

    // Handler for "I've seen this"
    const handleMarkWatched = () => {
        if (isMovie) {
            toggleWatched({ tmdb_id: tmdbId, media_type: 'movie', is_watched: false }); // false passed to toggle -> becomes true
            toast.success("Marked as watched");
        } else {
            // For TV, simply mark the show as watched in the toggle logic (which usually just toggles specific episode or creates record)
            // A more complex implementation would fetch all episodes and mark them. 
            // For now, let's toggle the generic 'tv' entity if possible, or just close and let them manage in library.
            // Since our store `toggleWatched` handles `tv` media_type by marking it in history (often used for show-level status):
            toggleWatched({ tmdb_id: tmdbId, media_type: 'tv', is_watched: false });
            toast.success("Added to watched history");
        }
        onClose();
    };

    const handleReminder = () => {
        onConfirm(); // Opens the Reminder Config Modal
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-[#18181b] border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
                
                <div className="flex items-center justify-center w-14 h-14 bg-indigo-600/10 rounded-full mb-4 mx-auto text-indigo-500 ring-1 ring-indigo-500/20">
                    <CheckCircle className="w-7 h-7" />
                </div>
                
                <h3 className="text-xl font-bold text-white text-center mb-1">Added to Library</h3>
                <p className="text-zinc-400 text-center text-xs mb-8">
                    <strong className="text-white">{name}</strong> is now being tracked.
                </p>

                <div className="space-y-3">
                    <button 
                        onClick={handleMarkWatched}
                        className="w-full py-3.5 px-4 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-600/20 text-emerald-400 font-bold text-sm transition-all flex items-center justify-center gap-3 group"
                    >
                        <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        I've already seen this
                    </button>

                    <button 
                        onClick={handleReminder}
                        className="w-full py-3.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-3 group"
                    >
                        <Bell className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                        Notify me of new releases
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <button onClick={onClose} className="text-xs font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AskReminderModal;