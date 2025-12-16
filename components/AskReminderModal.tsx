
import React from 'react';
import { Bell, X, CheckCircle, CalendarClock, Ban, CheckCheck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { TVShow, Episode } from '../types';

interface AskReminderModalProps {
    isOpen: boolean;
    item: TVShow | Episode | null;
    onClose: () => void;
    onConfirm: () => void;
}

const AskReminderModal: React.FC<AskReminderModalProps> = ({ isOpen, item, onClose, onConfirm }) => {
    const { updateSettings } = useAppContext();

    if (!isOpen || !item) return null;

    const name = 'show_name' in item ? item.show_name : 'name' in item ? item.name : 'this item';
    const isMovie = 'media_type' in item ? item.media_type === 'movie' : item.is_movie;

    const handleAlways = () => {
        updateSettings({ reminderStrategy: 'always' });
        onConfirm(); 
    };

    const handleNever = () => {
        updateSettings({ reminderStrategy: 'never' });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-zinc-950 border border-zinc-800 w-full max-w-sm rounded-3xl shadow-2xl p-6 relative overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/20">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Added to Library</h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                        <strong className="text-white">{name}</strong> is now being tracked.
                    </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 shrink-0">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white">Enable Notifications?</h4>
                            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                {isMovie 
                                    ? "Notify me when released." 
                                    : "Notify me when new episodes air."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={() => { onClose(); onConfirm(); }}
                        className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 text-sm"
                    >
                        Configure Reminder
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleAlways}
                            className="py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-colors text-xs flex items-center justify-center gap-2"
                        >
                            <CheckCheck className="w-3.5 h-3.5" /> Always Add
                        </button>
                        <button 
                            onClick={handleNever}
                            className="py-3 rounded-xl bg-zinc-800 text-zinc-300 font-medium hover:bg-zinc-700 transition-colors text-xs flex items-center justify-center gap-2"
                        >
                            <Ban className="w-3.5 h-3.5" /> Never Ask
                        </button>
                    </div>

                    <button 
                        onClick={onClose} 
                        className="w-full py-2 text-zinc-500 hover:text-white text-xs font-medium transition-colors"
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AskReminderModal;
