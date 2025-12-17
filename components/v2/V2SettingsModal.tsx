
import React, { useState } from 'react';
import { X, Palette, Layout, Eye, Monitor, Smartphone, Check } from 'lucide-react';
import { useAppContext, THEMES } from '../../context/AppContext';

interface V2SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const V2SettingsModal: React.FC<V2SettingsModalProps> = ({ isOpen, onClose }) => {
    const { settings, updateSettings } = useAppContext();
    const [activeTab, setActiveTab] = useState<'visuals' | 'layout'>('visuals');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in" onClick={onClose}>
            <div 
                className="bg-[var(--bg-main)] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 pb-2 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Experience Settings</h2>
                        <p className="text-sm text-zinc-400">Customize your V2 dashboard.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex px-6 gap-6 border-b border-white/5 mt-4">
                    <button 
                        onClick={() => setActiveTab('visuals')}
                        className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'visuals' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Visuals
                        {activeTab === 'visuals' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400 rounded-full" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('layout')}
                        className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'layout' ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Layout & Grid
                        {activeTab === 'layout' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-400 rounded-full" />}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                    
                    {activeTab === 'visuals' && (
                        <div className="space-y-8 animate-fade-in">
                            <section>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Palette className="w-5 h-5 text-indigo-400" /> Accent Color
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {Object.keys(THEMES).map((themeKey) => (
                                        <button 
                                            key={themeKey} 
                                            onClick={() => updateSettings({ theme: themeKey })} 
                                            className={`
                                                w-12 h-12 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center
                                                ${settings.theme === themeKey ? 'border-white scale-110 shadow-lg shadow-white/10' : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'}
                                            `}
                                            style={{ backgroundColor: `rgb(${THEMES[themeKey]['500']})` }} 
                                        >
                                            {settings.theme === themeKey && <Check className="w-5 h-5 text-white drop-shadow-md" />}
                                        </button>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Eye className="w-5 h-5 text-emerald-400" /> Spoiler Protection
                                </h3>
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-1 flex">
                                    <button 
                                        onClick={() => updateSettings({ useSeason1Art: true })}
                                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${settings.useSeason1Art ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        Use Season 1 Art
                                    </button>
                                    <button 
                                        onClick={() => updateSettings({ useSeason1Art: false })}
                                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${!settings.useSeason1Art ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        Use Current Season
                                    </button>
                                </div>
                                <p className="text-xs text-zinc-500 mt-2 px-1">
                                    "Season 1 Art" hides current season posters to avoid visual spoilers.
                                </p>
                            </section>
                        </div>
                    )}

                    {activeTab === 'layout' && (
                        <div className="space-y-8 animate-fade-in">
                            <section>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Layout className="w-5 h-5 text-pink-400" /> Grid Style
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => updateSettings({ v2GridStyle: 'modern' })}
                                        className={`
                                            p-4 rounded-2xl border-2 transition-all text-left group
                                            ${settings.v2GridStyle === 'modern' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-white/5 border-transparent hover:bg-white/10'}
                                        `}
                                    >
                                        <div className="flex gap-2 mb-3 opacity-80">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/40" />
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/40" />
                                        </div>
                                        <div className="font-bold text-white">Modern Cards</div>
                                        <div className="text-xs text-zinc-400 mt-1">Rounded corners, floating effect.</div>
                                    </button>

                                    <button 
                                        onClick={() => updateSettings({ v2GridStyle: 'classic' })}
                                        className={`
                                            p-4 rounded-2xl border-2 transition-all text-left group
                                            ${settings.v2GridStyle === 'classic' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-white/5 border-transparent hover:bg-white/10'}
                                        `}
                                    >
                                        <div className="flex mb-3 opacity-80 border border-indigo-500/30 w-fit">
                                            <div className="w-8 h-8 bg-indigo-500/20 border-r border-indigo-500/30" />
                                            <div className="w-8 h-8 bg-indigo-500/20" />
                                        </div>
                                        <div className="font-bold text-white">Classic Grid</div>
                                        <div className="text-xs text-zinc-400 mt-1">Sharp corners, connected cells.</div>
                                    </button>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Monitor className="w-5 h-5 text-amber-400" /> Poster Fill Mode
                                </h3>
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-1 flex">
                                    <button 
                                        onClick={() => updateSettings({ calendarPosterFillMode: 'cover' })}
                                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${settings.calendarPosterFillMode === 'cover' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        Cover (Fill)
                                    </button>
                                    <button 
                                        onClick={() => updateSettings({ calendarPosterFillMode: 'contain' })}
                                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${settings.calendarPosterFillMode === 'contain' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        Contain (Full Ratio)
                                    </button>
                                </div>
                                <p className="text-xs text-zinc-500 mt-2 px-1">
                                    Determines how images behave in "Single Event" day cards. "Contain" adds a blurred background.
                                </p>
                            </section>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default V2SettingsModal;
