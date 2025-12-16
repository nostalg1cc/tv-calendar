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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-2xl shadow-2xl p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-center w-12 h-12 bg-indigo-500/10 rounded-full mb-4 mx-auto text-indigo-400">
                    <CheckCircle className="w-6 h-6" />
                </div>
                
                <h3 className="text-xl font-bold text-white text-center mb-2">Added to Library</h3>
                <p className="text-zinc-400 text-center text-sm mb-6">
                    <strong className="text-white">{name}</strong> is now being tracked in your calendar.
                </p>

                <div className="bg-zinc-800/50 rounded-xl p-4 mb-6 border border-zinc-800">
                    <div className="flex items-start gap-3">
                        <Bell className="w-5 h-5 text-amber-400 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-white">Enable Reminders?</h4>
                            <p className="text-xs text-zinc-400 mt-1">
                                {isMovie 
                                    ? "Get notified when it hits theaters or digital." 
                                    : "Get notified when new episodes air."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={onClose} 
                        className="flex-1 py-3 rounded-xl font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                        No Thanks
                    </button>
                    <button 
                        onClick={() => {
                            onClose();
                            onConfirm();
                        }}
                        className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        Set Reminder
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AskReminderModal;
