
import React from 'react';
import { Bell, CheckCircle } from 'lucide-react';
import { useStore } from '../store';
import { TVShow, Episode } from '../types';

interface AskReminderModalProps {
    isOpen: boolean;
    item: TVShow | Episode | null;
    onClose: () => void;
    onConfirm: () => void;
}

const AskReminderModal: React.FC<AskReminderModalProps> = ({ isOpen, item, onClose, onConfirm }) => {
    const updateSettings = useStore(state => state.updateSettings);

    if (!isOpen || !item) return null;

    const name = 'show_name' in item ? item.show_name : 'name' in item ? item.name : 'this item';
    const isMovie = 'media_type' in item ? item.media_type === 'movie' : item.is_movie;

    const handleAlways = async () => {
        updateSettings({ reminderStrategy: 'always' });
        onConfirm();
    };

    const handleNever = () => {
        updateSettings({ reminderStrategy: 'never' });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-[#18181b] border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-center w-12 h-12 bg-emerald-500/10 rounded-full mb-4 mx-auto text-emerald-500"><CheckCircle className="w-6 h-6" /></div>
                <h3 className="text-xl font-bold text-white text-center mb-2">Added to Library</h3>
                <p className="text-zinc-400 text-center text-sm mb-6"><strong className="text-white">{name}</strong> is now being tracked.</p>
                <div className="bg-black/20 rounded-xl p-4 mb-6 border border-white/5">
                    <div className="flex items-start gap-3">
                        <Bell className="w-5 h-5 text-indigo-500 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-white">Enable Reminders?</h4>
                            <p className="text-xs text-zinc-400 mt-1">{isMovie ? "Get notified for theatrical or digital release." : "Get notified when new episodes air."}</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-3 rounded-xl font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">No Thanks</button>
                        <button onClick={() => { onClose(); onConfirm(); }} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors shadow-lg">Set Reminder</button>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-2">
                        <button onClick={handleNever} className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-wide">Don't ask again</button>
                        <button onClick={handleAlways} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 uppercase tracking-wide">Always Add</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AskReminderModal;
