
import React from 'react';
import { Bell, X, CheckCircle, CalendarClock, Settings2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { TVShow, Episode } from '../types';

interface AskReminderModalProps {
    isOpen: boolean;
    item: TVShow | Episode | null;
    onClose: () => void;
    onConfirm: () => void;
}

const AskReminderModal: React.FC<AskReminderModalProps> = ({ isOpen, item, onClose, onConfirm }) => {
    const { updateSettings, addReminder } = useAppContext();

    if (!isOpen || !item) return null;

    const name = 'show_name' in item ? item.show_name : 'name' in item ? item.name : 'this item';
    const isMovie = 'media_type' in item ? item.media_type === 'movie' : item.is_movie;

    const handleAlways = async () => {
        // Set setting
        updateSettings({ reminderStrategy: 'always' });
        // Set Reminder for current
        onConfirm();
    };

    const handleNever = () => {
        // Set setting
        updateSettings({ reminderStrategy: 'never' });
        // Close modal without setting reminder
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-[var(--bg-panel)] border border-[var(--border-color)] w-full max-w-sm rounded-3xl shadow-2xl p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-center w-12 h-12 bg-emerald-500/10 rounded-full mb-4 mx-auto text-emerald-500">
                    <CheckCircle className="w-6 h-6" />
                </div>
                
                <h3 className="text-xl font-bold text-[var(--text-main)] text-center mb-2">Added to Library</h3>
                <p className="text-[var(--text-muted)] text-center text-sm mb-6">
                    <strong className="text-[var(--text-main)]">{name}</strong> is now being tracked.
                </p>

                <div className="bg-[var(--bg-main)]/50 rounded-xl p-4 mb-6 border border-[var(--border-color)]">
                    <div className="flex items-start gap-3">
                        <Bell className="w-5 h-5 text-indigo-500 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-[var(--text-main)]">Enable Reminders?</h4>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                {isMovie 
                                    ? "Get notified for theatrical or digital release." 
                                    : "Get notified when new episodes air."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            className="flex-1 py-3 rounded-xl font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors"
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
                    
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)] mt-2">
                        <button onClick={handleNever} className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] uppercase tracking-wide">
                            Don't ask again
                        </button>
                        <button onClick={handleAlways} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 uppercase tracking-wide">
                            Always Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AskReminderModal;
