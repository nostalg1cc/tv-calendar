
import React, { useState } from 'react';
import { Settings, User, X, LogOut } from 'lucide-react';
import { useStore } from '../store';

interface V2SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const V2SettingsModal: React.FC<V2SettingsModalProps> = ({ isOpen, onClose }) => {
    const { settings, updateSettings, user, logout } = useStore();
    const [activeTab, setActiveTab] = useState<'general' | 'account'>('general');

    if (!isOpen) return null;

    const Toggle = ({ active, onToggle, label, description }: { active: boolean; onToggle: () => void; label: string; description?: string }) => (
        <div className="flex items-center justify-between py-4 cursor-pointer" onClick={onToggle}>
            <div className="flex-1 pr-4">
                <h4 className="text-sm font-bold text-zinc-200">{label}</h4>
                {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
            </div>
            <button className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${active ? 'bg-indigo-600' : 'bg-zinc-800'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-lg transition-transform ${active ? 'translate-x-6' : ''}`} />
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-0 md:p-12" onClick={onClose}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in" />
            <div className="relative bg-[#080808] border border-white/5 w-full md:w-full md:max-w-4xl h-full md:h-full md:max-h-[700px] flex flex-col md:flex-row overflow-hidden md:rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
                
                <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 bg-zinc-950/30 flex-col shrink-0 h-full hidden md:flex">
                    <div className="p-8"><h2 className="text-xl font-black text-white uppercase tracking-tighter">System</h2></div>
                    <nav className="flex-1 px-4 space-y-2">
                        <button onClick={() => setActiveTab('general')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-sm font-bold ${activeTab === 'general' ? 'bg-indigo-600/10 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}><Settings className="w-5 h-5" /> General</button>
                        <button onClick={() => setActiveTab('account')} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-sm font-bold ${activeTab === 'account' ? 'bg-indigo-600/10 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}><User className="w-5 h-5" /> Account</button>
                    </nav>
                </div>

                <div className="flex-1 flex flex-col h-full bg-[#080808] p-8 overflow-y-auto custom-scrollbar">
                    <button onClick={onClose} className="md:hidden absolute top-4 right-4 p-2 text-zinc-400"><X className="w-5 h-5" /></button>
                    
                    {activeTab === 'general' && (
                        <div className="space-y-8">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Preferences</h3>
                            <div className="space-y-2 divide-y divide-white/5">
                                <Toggle label="Compact Calendar" description="FIT more rows on the grid." active={!!settings.compactCalendar} onToggle={() => updateSettings({ compactCalendar: !settings.compactCalendar })} />
                                <Toggle label="Ignore Specials" description="Hide Season 0 content." active={!!settings.ignoreSpecials} onToggle={() => updateSettings({ ignoreSpecials: !settings.ignoreSpecials })} />
                                <Toggle label="Hide Theatrical" description="Only show streaming releases." active={!!settings.hideTheatrical} onToggle={() => updateSettings({ hideTheatrical: !settings.hideTheatrical })} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="space-y-8">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Identity</h3>
                            <div className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5 flex gap-6 items-center">
                                <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-3xl">{user?.username.charAt(0).toUpperCase()}</div>
                                <div>
                                    <h4 className="text-lg font-black text-white">{user?.username}</h4>
                                    <p className="text-sm text-zinc-500">{user?.is_cloud ? 'Cloud Synced' : 'Local Storage'}</p>
                                </div>
                                <button onClick={logout} className="ml-auto p-3 bg-red-500/10 text-red-500 rounded-2xl"><LogOut className="w-5 h-5" /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default V2SettingsModal;
