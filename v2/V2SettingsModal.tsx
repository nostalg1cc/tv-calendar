
import React, { useState } from 'react';
import { Settings, ShieldCheck, Palette, User, Globe, EyeOff, Layout, Bell, Monitor, Cloud, LogOut, RefreshCw, X, ChevronLeft } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface V2SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabId = 'general' | 'account' | 'design' | 'spoiler';

const V2SettingsModal: React.FC<V2SettingsModalProps> = ({ isOpen, onClose }) => {
    const { settings, updateSettings, user, logout, hardRefreshCalendar, isSyncing } = useAppContext();
    const [activeTab, setActiveTab] = useState<TabId>('general');
    
    // Mobile View State: 'menu' | 'content'
    const [mobileView, setMobileView] = useState<'menu' | 'content'>('menu');

    if (!isOpen) return null;

    const Toggle = ({ active, onToggle, label, description }: { active: boolean; onToggle: () => void; label: string; description?: string }) => (
        <div className="flex items-center justify-between py-4 group/toggle cursor-pointer" onClick={onToggle}>
            <div className="flex-1 pr-4">
                <h4 className="text-sm font-bold text-zinc-200 group-hover/toggle:text-white transition-colors">{label}</h4>
                {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
            </div>
            <button className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${active ? 'bg-indigo-600' : 'bg-zinc-800'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-lg transition-transform ${active ? 'translate-x-6' : ''}`} />
            </button>
        </div>
    );

    const TABS: { id: TabId; label: string; icon: any }[] = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'account', label: 'Account', icon: User },
        { id: 'design', label: 'Design', icon: Palette },
        { id: 'spoiler', label: 'Spoilers', icon: ShieldCheck },
    ];

    const handleTabSelect = (id: TabId) => {
        setActiveTab(id);
        setMobileView('content');
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-0 md:p-12" onClick={onClose}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in" />
            <div 
                className="relative bg-[#080808] border border-white/5 w-full md:w-full md:max-w-4xl h-full md:h-full md:max-h-[700px] flex flex-col md:flex-row overflow-hidden md:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-enter" 
                onClick={e => e.stopPropagation()}
            >
                {/* Sidebar (Desktop: Always Visible, Mobile: Visible only in 'menu' view) */}
                <div className={`
                    w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 bg-zinc-950/30 flex-col shrink-0 h-full
                    ${mobileView === 'menu' ? 'flex' : 'hidden md:flex'}
                `}>
                    <div className="p-6 md:p-8 flex justify-between items-center md:block">
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">System</h2>
                            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-1">Version 2.5.0</p>
                        </div>
                        <button onClick={onClose} className="md:hidden p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-full">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                        {TABS.map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => handleTabSelect(tab.id)} 
                                className={`
                                    w-full flex items-center gap-4 px-4 py-4 md:py-3 rounded-2xl transition-all text-sm font-bold
                                    ${activeTab === tab.id 
                                        ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' 
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] border border-transparent'}
                                `}
                            >
                                <tab.icon className="w-5 h-5" />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                    <div className="p-6 hidden md:block">
                        <button onClick={onClose} className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold rounded-2xl transition-all text-sm">Close</button>
                    </div>
                </div>

                {/* Content Area (Desktop: Always Visible, Mobile: Visible only in 'content' view) */}
                <div className={`
                    flex-1 flex flex-col h-full bg-[#080808]
                    ${mobileView === 'content' ? 'flex' : 'hidden md:flex'}
                `}>
                    {/* Mobile Header for Content View */}
                    <div className="md:hidden p-4 border-b border-white/5 flex items-center gap-3">
                        <button onClick={() => setMobileView('menu')} className="p-2 -ml-2 text-zinc-400 hover:text-white">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <h3 className="font-bold text-white text-lg">{TABS.find(t => t.id === activeTab)?.label}</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
                        {activeTab === 'general' && (
                            <div className="animate-fade-in space-y-8">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-6 hidden md:block">Core Preferences</h3>
                                    <div className="space-y-2 divide-y divide-white/5">
                                        <Toggle label="Automatic Calendar Sync" description="Fetch new episodes on load." active={!!settings.autoSync} onToggle={() => updateSettings({ autoSync: !settings.autoSync })} />
                                        <Toggle label="Smart Timezone Shift" description="Adjust release dates based on origin broadcast times." active={!!settings.timeShift} onToggle={() => updateSettings({ timeShift: !settings.timeShift })} />
                                        <Toggle label="Ignore Specials" description="Hide Season 0 content." active={!!settings.ignoreSpecials} onToggle={() => updateSettings({ ignoreSpecials: !settings.ignoreSpecials })} />
                                        <Toggle label="Hide Theatrical" description="Only show streaming releases for movies." active={!!settings.hideTheatrical} onToggle={() => updateSettings({ hideTheatrical: !settings.hideTheatrical })} />
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t border-white/5">
                                    <h3 className="text-sm font-black text-zinc-600 uppercase tracking-widest mb-4">Data Management</h3>
                                    <button 
                                        onClick={() => { if(confirm("This will delete your local cache and re-download all calendar data. Continue?")) hardRefreshCalendar(); }}
                                        disabled={isSyncing}
                                        className="w-full bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 hover:text-white p-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-between group"
                                    >
                                        <span className="flex items-center gap-3">
                                            <RefreshCw className={`w-4 h-4 text-indigo-500 ${isSyncing ? 'animate-spin' : ''}`} />
                                            Force Refresh Calendar
                                        </span>
                                        <span className="text-xs text-zinc-600 group-hover:text-zinc-500">Rebuild Database</span>
                                    </button>
                                </div>

                                <div>
                                    <h3 className="text-sm font-black text-zinc-600 uppercase tracking-widest mb-4">Region</h3>
                                    <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3"><Globe className="w-4 h-4 text-zinc-500" /><span className="text-sm font-bold text-zinc-300">System Timezone</span></div>
                                        <span className="text-xs font-mono text-indigo-400 uppercase">{settings.timezone}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'account' && (
                            <div className="animate-fade-in space-y-8">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight hidden md:block">Identity</h3>
                                <div className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                                    <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-3xl shadow-inner border border-indigo-500/20">{user?.username.charAt(0).toUpperCase()}</div>
                                    <div className="flex-1">
                                        <h4 className="text-lg font-black text-white">{user?.username}</h4>
                                        <p className="text-sm text-zinc-500">{user?.email || 'Local Profile'}</p>
                                        <div className="mt-2">{user?.isCloud ? <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Cloud Synced</span> : <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2 py-1 rounded">Local Storage</span>}</div>
                                    </div>
                                    <button onClick={logout} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all"><LogOut className="w-5 h-5" /></button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5"><div className="flex items-center gap-2 text-zinc-500 mb-2"><Monitor className="w-3 h-3" /><span className="text-[10px] font-black uppercase tracking-widest">Active Device</span></div><p className="text-sm font-bold text-white">Browser / PWA</p></div>
                                    <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5"><div className="flex items-center gap-2 text-zinc-500 mb-2"><Cloud className="w-3 h-3" /><span className="text-[10px] font-black uppercase tracking-widest">Data Health</span></div><p className="text-sm font-bold text-emerald-400">100% Synced</p></div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'design' && (
                            <div className="animate-fade-in space-y-8">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight hidden md:block">Interface</h3>
                                <div>
                                    <label className="text-sm font-black text-zinc-600 uppercase tracking-widest mb-4 block">Visual Mode</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['cosmic', 'oled', 'light'].map(t => <button key={t} onClick={() => updateSettings({ baseTheme: t as any })} className={`p-4 rounded-2xl border-2 transition-all text-center ${settings.baseTheme === t ? 'border-indigo-500 bg-zinc-900 text-indigo-400' : 'border-white/5 bg-zinc-950 text-zinc-600 hover:text-zinc-300'}`}><span className="text-xs font-black uppercase tracking-widest">{t}</span></button>)}
                                    </div>
                                </div>
                                <div className="space-y-2 divide-y divide-white/5">
                                    <Toggle label="Compact Calendar" description="FIT more rows on the grid." active={!!settings.compactCalendar} onToggle={() => updateSettings({ compactCalendar: !settings.compactCalendar })} />
                                    <Toggle label="Season 1 Art" description="Show non-spoiler art." active={!!settings.useSeason1Art} onToggle={() => updateSettings({ useSeason1Art: !settings.useSeason1Art })} />
                                    <Toggle label="Monochrome UI" description="Remove accent colors." active={settings.theme === 'zinc'} onToggle={() => updateSettings({ theme: settings.theme === 'zinc' ? 'default' : 'zinc' })} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'spoiler' && (
                            <div className="animate-fade-in space-y-8">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2 hidden md:block">Safe View</h3>
                                    <p className="text-sm text-zinc-500">Hide content for episodes you haven't watched.</p>
                                </div>
                                <div className="space-y-2 divide-y divide-white/5">
                                    <Toggle 
                                        label="Protect Episode Images" 
                                        description="Hide stills until watched." 
                                        active={!!settings.spoilerConfig.images} 
                                        onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, images: !settings.spoilerConfig.images } })} 
                                    />
                                    
                                    {settings.spoilerConfig.images && (
                                        <div className="py-4 px-2 animate-enter">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-4">Thumbnail Protection Mode</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button 
                                                    onClick={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, replacementMode: 'blur' } })}
                                                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${settings.spoilerConfig.replacementMode === 'blur' ? 'border-indigo-500 bg-zinc-900 text-indigo-400 shadow-lg shadow-indigo-500/10' : 'border-white/5 text-zinc-500 hover:text-zinc-300'}`}
                                                >
                                                    <EyeOff className="w-4 h-4" />
                                                    <div className="text-left">
                                                        <div className="text-xs font-bold uppercase tracking-tight">Blur Original</div>
                                                        <div className="text-[9px] opacity-60">Heavy Pixel Filter</div>
                                                    </div>
                                                </button>
                                                <button 
                                                    onClick={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, replacementMode: 'banner' } })}
                                                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${settings.spoilerConfig.replacementMode === 'banner' ? 'border-indigo-500 bg-zinc-900 text-indigo-400 shadow-lg shadow-indigo-500/10' : 'border-white/5 text-zinc-500 hover:text-zinc-300'}`}
                                                >
                                                    <Layout className="w-4 h-4" />
                                                    <div className="text-left">
                                                        <div className="text-xs font-bold uppercase tracking-tight">Series Banner</div>
                                                        <div className="text-[9px] opacity-60">Generic Show Art</div>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <Toggle label="Censor Titles" description="Replace names with generic labels." active={!!settings.spoilerConfig.title} onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, title: !settings.spoilerConfig.title } })} />
                                    <Toggle label="Redact Overviews" description="Hide episode descriptions." active={!!settings.spoilerConfig.overview} onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, overview: !settings.spoilerConfig.overview } })} />
                                    <Toggle label="Protect Movies" description="Apply filters to movie releases." active={!!settings.spoilerConfig.includeMovies} onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, includeMovies: !settings.spoilerConfig.includeMovies } })} />
                                </div>
                                <div className="bg-indigo-500/10 p-6 rounded-3xl border border-indigo-500/10 flex gap-4"><Bell className="w-5 h-5 text-indigo-400 shrink-0" /><p className="text-xs text-indigo-300 leading-relaxed">Dynamic filters are automatically removed once an item is marked as watched.</p></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default V2SettingsModal;
