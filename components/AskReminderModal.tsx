import React from 'react';
import { Bell, X, CheckCircle, CalendarClock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { TVShow, Episode } from '../types';

interface AskReminderModalProps {
    isOpen: boolean;
    item: TVShow | Episode | null;
    onClose: () => void;
    onConfirm: () => void;
}

const AskReminderModal: React.FC<AskReminderModalProps> = ({ isOpen, item, onClose, onConfirm }) => {
    if (!isOpen || !item) return null;

    const name = 'show_name' in item ? item.show_name : 'name' in item ? item.name : 'this item';
    const isMovie = 'media_type' in item ? item.media_type === 'movie' : item.is_movie;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-zinc-950 border border-zinc-800 w-full max-w-sm rounded-3xl shadow-2xl p-8 relative overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-indigo-500" />
                
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
                                    ? "We can notify you when this movie releases in theaters or on digital platforms." 
                                    : "Get push notifications on your device when new episodes air."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={onClose} 
                        className="flex-1 py-3.5 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors text-sm"
                    >
                        Skip
                    </button>
                    <button 
                        onClick={() => {
                            onClose();
                            onConfirm();
                        }}
                        className="flex-1 py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20 text-sm"
                    >
                        Set Reminder
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AskReminderModal;