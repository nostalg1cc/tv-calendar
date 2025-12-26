
import React, { useState, useEffect } from 'react';
import { Settings, User, X, LogOut, Palette, EyeOff, Database, Key, Download, Upload, RefreshCw, Smartphone, Monitor, Check, FileJson, Layout, Image, Edit3, Globe, ShieldCheck, AlertCircle, Wrench, Link as LinkIcon, ExternalLink, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { setApiToken } from '../services/tmdb';
import { supabase } from '../services/supabase';
import { getDeviceCode, pollToken, getTraktProfile } from '../services/trakt';
import toast from 'react-hot-toast';
import LegacyImportModal from '../components/LegacyImportModal';
import RebuildModal from '../components/RebuildModal';

interface V2SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabId = 'general' | 'appearance' | 'spoilers' | 'integrations' | 'data' | 'account';

const THEMES = [
    { id: 'cosmic', name: 'Cosmic', color: '#18181b' },
    { id: 'oled', name: 'OLED', color: '#000000' },
    { id: 'midnight', name: 'Midnight', color: '#0f172a' },
    { id: 'forest', name: 'Forest', color: '#05190b' },
    { id: 'dawn', name: 'Dawn', color: '#3f3f46' },
    { id: 'light', name: 'Light', color: '#f4f4f5' },
];

const FONTS = [
    { id: 'inter', name: 'Inter' },
    { id: 'outfit', name: 'Outfit' },
    { id: 'space', name: 'Space Grotesk' },
    { id: 'lora', name: 'Lora' },
    { id: 'system', name: 'System' },
];

const COUNTRIES = [
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CA', name: 'Canada' },
    { code: 'AU', name: 'Australia' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'ES', name: 'Spain' },
    { code: 'IT', name: 'Italy' },
    { code: 'JP', name: 'Japan' },
    { code: 'KR', name: 'South Korea' },
    { code: 'BR', name: 'Brazil' },
    { code: 'MX', name: 'Mexico' },
    { code: 'IN', name: 'India' },
    { code: 'RU', name: 'Russia' },
    { code: 'CN', name: 'China' },
    { code: 'NL', name: 'Netherlands' },
    { code: 'SE', name: 'Sweden' },
    { code: 'NZ', name: 'New Zealand' },
    { code: 'IE', name: 'Ireland' },
    { code: 'CH', name: 'Switzerland' }
];

const V2SettingsModal: React.FC<V2SettingsModalProps> = ({ isOpen, onClose }) => {
    const { settings, updateSettings, user, login, logout, triggerCloudSync, isSyncing, importBackup, traktToken, traktProfile, setTraktToken, setTraktProfile } = useStore();
    const [activeTab, setActiveTab] = useState<TabId>('general');
    
    // Local state for API key
    const [localApiKey, setLocalApiKey] = useState(user?.tmdb_key || '');
    const [showKey, setShowKey] = useState(false);
    const [isSavingKey, setIsSavingKey] = useState(false);
    
    // Custom Theme State
    const [customColor, setCustomColor] = useState(settings.customThemeColor || '#6366f1');
    
    // Legacy Import Modal State
    const [showLegacyImport, setShowLegacyImport] = useState(false);
    const [showRebuild, setShowRebuild] = useState(false);
    
    // Trakt Auth State
    const [traktCode, setTraktCode] = useState<string | null>(null);
    const [traktUrl, setTraktUrl] = useState<string | null>(null);
    const [isPollingTrakt, setIsPollingTrakt] = useState(false);

    // Status Checks
    const hasSupabase = !!supabase;
    const hasTmdbKey = !!user?.tmdb_key;
    const hasTrakt = !!traktToken;

    useEffect(() => {
        setLocalApiKey(user?.tmdb_key || '');
    }, [user?.tmdb_key]);

    const handleSaveKey = async () => {
        if (!user) return;
        setIsSavingKey(true);
        
        try {
            const cleanKey = localApiKey.trim();
            const updatedUser = { ...user, tmdb_key: cleanKey };
            login(updatedUser); 
            setApiToken(cleanKey); 
            
            if (user.is_cloud && supabase) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ tmdb_key: cleanKey })
                    .eq('id', user.id);
                
                if (error) {
                    console.error("Cloud save failed:", error);
                    toast.error("Saved locally, but cloud sync failed.");
                } else {
                    toast.success("API Key saved to cloud!");
                }
            } else {
                toast.success("API Key saved locally!");
            }
        } catch (e) {
            console.error("Error saving key", e);
        } finally {
            setIsSavingKey(false);
        }
    };

    const handleExport = () => {
        const { watchlist, history, reminders } = useStore.getState();
        const data = {
            user: { username: user?.username },
            settings,
            watchlist,
            history,
            reminders,
            exported_at: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tv-calendar-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const handleImportClick = () => fileInputRef.current?.click();
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (data.watchlist && Array.isArray(data.watchlist)) {
                    importBackup(data);
                    toast.success('Backup restored successfully.');
                } else {
                    toast.error('Format not recognized. Try "Import Legacy Profile" instead.');
                }
            } catch (err) {
                toast.error('Invalid backup file.');
            }
        };
        reader.readAsText(file);
    };

    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const color = e.target.value;
        setCustomColor(color);
        updateSettings({ 
            baseTheme: 'custom', 
            customThemeColor: color 
        });
    };
    
    // --- TRAKT LOGIC ---
    
    const startTraktAuth = async () => {
        setIsPollingTrakt(true);
        try {
            const data = await getDeviceCode();
            setTraktCode(data.user_code);
            setTraktUrl(data.verification_url);
            
            // Start Polling
            const interval = setInterval(async () => {
                const poll = await pollToken(data.device_code);
                if (poll.status === 200) {
                    clearInterval(interval);
                    setTraktToken(poll.data.access_token);
                    const profile = await getTraktProfile(poll.data.access_token);
                    setTraktProfile(profile);
                    setIsPollingTrakt(false);
                    setTraktCode(null);
                    setTraktUrl(null);
                    toast.success("Trakt account connected!");
                    
                    // Force refresh to update dates
                    setTimeout(() => window.location.reload(), 1500);
                } else if (poll.status === 404 || poll.status === 409 || poll.status === 410) {
                    clearInterval(interval);
                    setIsPollingTrakt(false);
                    setTraktCode(null);
                    toast.error("Trakt connection timed out.");
                }
            }, data.interval * 1000);
            
        } catch (e) {
            console.error(e);
            setIsPollingTrakt(false);
            toast.error("Could not reach Trakt.tv");
        }
    };

    const disconnectTrakt = () => {
        setTraktToken(undefined);
        setTraktProfile(undefined);
        toast.success("Disconnected Trakt account");
    };

    if (!isOpen) return null;

    const TabButton = ({ id, label, icon: Icon }: { id: TabId, label: string, icon: any }) => (
        <button 
            onClick={() => setActiveTab(id)} 
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-sm font-bold ${activeTab === id ? 'bg-indigo-600/10 text-indigo-400' : 'text-text-muted hover:text-text-main hover:bg-white/[0.02]'}`}
        >
            <Icon className="w-5 h-5" /> {label}
        </button>
    );

    const Toggle = ({ active, onToggle, label, description }: { active: boolean; onToggle: () => void; label: string; description?: string }) => (
        <div className="flex items-center justify-between py-4 cursor-pointer group" onClick={onToggle}>
            <div className="flex-1 pr-4">
                <h4 className="text-sm font-bold text-text-main group-hover:text-indigo-400 transition-colors">{label}</h4>
                {description && <p className="text-xs text-text-muted mt-1">{description}</p>}
            </div>
            <button className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${active ? 'bg-indigo-600' : 'bg-card border border-border'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-lg transition-transform ${active ? 'translate-x-6' : ''}`} />
            </button>
        </div>
    );

    const ConnectionStatus = ({ label, active }: { label: string, active: boolean }) => (
        <div className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border ${active ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            {active ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {label}: {active ? 'Connected' : 'Missing'}
        </div>
    );

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-0 md:p-12" onClick={onClose}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in" />
            <div className="relative bg-background border border-border w-full md:w-full md:max-w-5xl h-full md:h-full md:max-h-[800px] flex flex-col md:flex-row overflow-hidden md:rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()}>
                
                {/* Sidebar */}
                <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border bg-panel flex-col shrink-0 hidden md:flex">
                    <div className="p-8 pb-4">
                        <h2 className="text-2xl font-black text-text-main uppercase tracking-tighter">Settings</h2>
                        <p className="text-xs text-text-muted font-medium mt-1">Configure your experience</p>
                    </div>
                    <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
                        <TabButton id="general" label="General" icon={Settings} />
                        <TabButton id="appearance" label="Appearance" icon={Palette} />
                        <TabButton id="spoilers" label="Spoilers" icon={EyeOff} />
                        <TabButton id="integrations" label="Integrations" icon={LinkIcon} />
                        <TabButton id="data" label="Data & API" icon={Database} />
                        <TabButton id="account" label="Account" icon={User} />
                    </nav>
                    <div className="p-4 border-t border-border">
                        <p className="text-[10px] text-text-muted text-center font-mono">v2.1.0 • Stable</p>
                    </div>
                </div>

                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-panel">
                     <h2 className="text-lg font-black text-text-main uppercase">Settings</h2>
                     <button onClick={onClose} className="p-2 text-text-muted"><X className="w-5 h-5" /></button>
                </div>
                <div className="md:hidden flex overflow-x-auto border-b border-border p-2 gap-2 hide-scrollbar bg-background">
                     {['general', 'appearance', 'spoilers', 'integrations', 'data', 'account'].map(t => (
                         <button 
                            key={t} 
                            onClick={() => setActiveTab(t as TabId)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === t ? 'bg-indigo-600 text-white' : 'bg-card text-text-muted border border-border'}`}
                        >
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                     ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
                    <button onClick={onClose} className="hidden md:block absolute top-6 right-6 p-2 rounded-full bg-card hover:bg-border text-text-muted hover:text-text-main transition-colors z-20"><X className="w-5 h-5" /></button>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 pb-24">
                        
                        {/* GENERAL */}
                        {activeTab === 'general' && (
                            <div className="space-y-8 max-w-2xl animate-fade-in">
                                <div>
                                    <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500" /> Preferences</h3>
                                    
                                    {/* REGION SETTING */}
                                    <div className="mb-6 bg-card/40 p-4 rounded-xl border border-border">
                                        <label className="text-sm font-bold text-text-main mb-2 block flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-indigo-400" /> Region / Country
                                        </label>
                                        <div className="relative">
                                            <select 
                                                value={settings.country || 'US'} 
                                                onChange={(e) => updateSettings({ country: e.target.value })}
                                                className="w-full bg-black/40 border border-border rounded-lg px-4 py-3 text-sm text-text-main focus:outline-none focus:border-indigo-500 appearance-none transition-colors"
                                            >
                                                {COUNTRIES.map(c => (
                                                    <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted text-xs">▼</div>
                                        </div>
                                        <p className="text-xs text-text-muted mt-2 leading-relaxed">
                                            Determines which release dates are shown for movies in the calendar. If a release date for your country isn't available, we'll show the earliest global release.
                                        </p>
                                    </div>

                                    <div className="space-y-1 divide-y divide-border border-y border-border">
                                        <Toggle label="Compact Calendar" description="Fit more rows on the calendar grid." active={!!settings.compactCalendar} onToggle={() => updateSettings({ compactCalendar: !settings.compactCalendar })} />
                                        <Toggle label="Ignore Specials" description="Hide 'Season 0' content from lists and calendar." active={!!settings.ignoreSpecials} onToggle={() => updateSettings({ ignoreSpecials: !settings.ignoreSpecials })} />
                                        <Toggle label="Hide Theatrical" description="Only show movies available on digital/streaming." active={!!settings.hideTheatrical} onToggle={() => updateSettings({ hideTheatrical: !settings.hideTheatrical })} />
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-text-main mb-4">Timezone</h3>
                                    <div className="relative">
                                        <select 
                                            value={settings.timezone} 
                                            onChange={(e) => updateSettings({ timezone: e.target.value })}
                                            className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-indigo-500 appearance-none"
                                        >
                                            {(Intl as any).supportedValuesOf('timeZone').map((tz: string) => (
                                                <option key={tz} value={tz}>{tz}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">▼</div>
                                    </div>
                                    <p className="text-xs text-text-muted mt-2 ml-1">Used for accurate release date calculations.</p>
                                </div>
                            </div>
                        )}

                        {/* APPEARANCE */}
                        {activeTab === 'appearance' && (
                            <div className="space-y-10 max-w-2xl animate-fade-in">
                                <div>
                                    <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2"><Palette className="w-5 h-5 text-indigo-500" /> Interface Theme</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {/* Preset Themes */}
                                        {THEMES.map(theme => (
                                            <button 
                                                key={theme.id}
                                                onClick={() => updateSettings({ baseTheme: theme.id as any })}
                                                className={`
                                                    relative p-4 rounded-2xl border transition-all flex flex-col items-center gap-3
                                                    ${settings.baseTheme === theme.id ? 'bg-card border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-card/50 border-border hover:bg-card'}
                                                `}
                                            >
                                                <div className="w-8 h-8 rounded-full shadow-lg border border-white/10" style={{ backgroundColor: theme.color }} />
                                                <span className={`text-xs font-bold uppercase tracking-wider ${settings.baseTheme === theme.id ? 'text-text-main' : 'text-text-muted'}`}>{theme.name}</span>
                                            </button>
                                        ))}
                                        
                                        {/* Custom Theme Picker */}
                                        <label 
                                            className={`
                                                relative p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 cursor-pointer group
                                                ${settings.baseTheme === 'custom' ? 'bg-card border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-card/50 border-border hover:bg-card'}
                                            `}
                                        >
                                            <div className="w-8 h-8 rounded-full shadow-lg border border-white/10 flex items-center justify-center overflow-hidden relative">
                                                <div className="absolute inset-0" style={{ backgroundColor: customColor }} />
                                                <input 
                                                    type="color" 
                                                    value={customColor}
                                                    onChange={handleCustomColorChange}
                                                    className="absolute -top-10 -left-10 w-40 h-40 opacity-0 cursor-pointer"
                                                />
                                                <Edit3 className="w-3 h-3 text-white/50 relative z-10 pointer-events-none" />
                                            </div>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${settings.baseTheme === 'custom' ? 'text-text-main' : 'text-text-muted'}`}>Custom</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-text-main mb-6">Typography</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {FONTS.map(font => (
                                            <button 
                                                key={font.id}
                                                onClick={() => updateSettings({ appFont: font.id as any })}
                                                className={`
                                                    p-4 rounded-2xl border text-left transition-all
                                                    ${settings.appFont === font.id ? 'bg-card border-indigo-500' : 'bg-card/50 border-border hover:bg-card'}
                                                `}
                                            >
                                                <div className="text-sm font-bold text-text-main mb-1">{font.name}</div>
                                                <div className="text-xs text-text-muted">The quick brown fox jumps over the lazy dog.</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SPOILERS */}
                        {activeTab === 'spoilers' && (
                            <div className="space-y-8 max-w-2xl animate-fade-in">
                                <div>
                                    <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2"><EyeOff className="w-5 h-5 text-red-500" /> Spoiler Protection</h3>
                                    <div className="bg-card/50 rounded-2xl border border-border p-6 mb-6">
                                        <p className="text-sm text-text-muted leading-relaxed">
                                            These settings apply to unwatched content in your library. You can reveal hidden content by clicking on it.
                                        </p>
                                    </div>
                                    
                                    <div className="mb-6">
                                         <h4 className="text-sm font-bold text-text-muted mb-3">Episode Preview Style</h4>
                                         <div className="grid grid-cols-2 gap-4">
                                             <button 
                                                onClick={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, replacementMode: 'blur' } })}
                                                className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${settings.spoilerConfig.replacementMode === 'blur' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-card border-border hover:border-text-muted'}`}
                                             >
                                                 <div className={`w-full aspect-video rounded bg-zinc-800 flex items-center justify-center overflow-hidden ${settings.spoilerConfig.replacementMode === 'blur' ? 'ring-2 ring-indigo-500' : ''}`}>
                                                     <div className="w-full h-full bg-zinc-700 blur-md opacity-50" />
                                                 </div>
                                                 <span className={`text-xs font-bold uppercase tracking-wide ${settings.spoilerConfig.replacementMode === 'blur' ? 'text-text-main' : 'text-text-muted'}`}>Blur Preview</span>
                                             </button>
                                             
                                             <button 
                                                onClick={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, replacementMode: 'banner' } })}
                                                className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${settings.spoilerConfig.replacementMode === 'banner' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-card border-border hover:border-text-muted'}`}
                                             >
                                                 <div className={`w-full aspect-video rounded bg-zinc-800 flex items-center justify-center overflow-hidden relative ${settings.spoilerConfig.replacementMode === 'banner' ? 'ring-2 ring-indigo-500' : ''}`}>
                                                      <Layout className="w-8 h-8 text-zinc-600" />
                                                 </div>
                                                 <span className={`text-xs font-bold uppercase tracking-wide ${settings.spoilerConfig.replacementMode === 'banner' ? 'text-text-main' : 'text-text-muted'}`}>Use Show Banner</span>
                                             </button>
                                         </div>
                                    </div>

                                    <div className="space-y-1 divide-y divide-border border-y border-border">
                                        <Toggle 
                                            label="Hide Images" 
                                            description="Applies selected preview style to unwatched episodes." 
                                            active={settings.spoilerConfig.images} 
                                            onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, images: !settings.spoilerConfig.images } })} 
                                        />
                                        <Toggle 
                                            label="Hide Descriptions" 
                                            description="Mask episode overviews/synopses." 
                                            active={settings.spoilerConfig.overview} 
                                            onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, overview: !settings.spoilerConfig.overview } })} 
                                        />
                                        <Toggle 
                                            label="Hide Titles" 
                                            description="Mask episode names (e.g. 'Episode 5')." 
                                            active={settings.spoilerConfig.title} 
                                            onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, title: !settings.spoilerConfig.title } })} 
                                        />
                                        <Toggle 
                                            label="Exclude Movies" 
                                            description="Never hide spoilers for movies, even if unwatched." 
                                            active={!settings.spoilerConfig.includeMovies} 
                                            onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, includeMovies: !settings.spoilerConfig.includeMovies } })} 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* INTEGRATIONS */}
                        {activeTab === 'integrations' && (
                            <div className="space-y-8 max-w-2xl animate-fade-in">
                                <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2">
                                    <LinkIcon className="w-5 h-5 text-indigo-500" /> External Accounts
                                </h3>

                                {/* Trakt Card */}
                                <div className="bg-card/40 border border-border rounded-3xl overflow-hidden">
                                    <div className="p-6 border-b border-border flex items-start justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-red-900/20">T</div>
                                            <div>
                                                <h4 className="text-lg font-bold text-text-main">Trakt.tv</h4>
                                                <p className="text-xs text-text-muted mt-1">Sync your personalized release schedule.</p>
                                            </div>
                                        </div>
                                        {hasTrakt && (
                                            <div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Connected
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="p-6 bg-black/20">
                                        {!hasTrakt ? (
                                            !traktCode ? (
                                                <button 
                                                    onClick={startTraktAuth}
                                                    disabled={isPollingTrakt}
                                                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                                                >
                                                    {isPollingTrakt ? <Loader2 className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />}
                                                    Connect Trakt Account
                                                </button>
                                            ) : (
                                                <div className="text-center space-y-4 animate-enter">
                                                    <p className="text-sm text-text-muted">Enter this code at <span className="text-white font-mono">{traktUrl}</span></p>
                                                    <div className="text-3xl font-black text-white font-mono bg-zinc-900 p-4 rounded-xl border border-border inline-block tracking-widest">
                                                        {traktCode}
                                                    </div>
                                                    <div className="flex justify-center">
                                                         <a href={traktUrl!} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-400 hover:text-white text-sm font-bold">
                                                             Open Link <ExternalLink className="w-4 h-4" />
                                                         </a>
                                                    </div>
                                                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                                                        <Loader2 className="w-3 h-3 animate-spin" /> Waiting for authorization...
                                                    </div>
                                                </div>
                                            )
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-zinc-400">Connected Account</span>
                                                    <span className="text-sm font-bold text-white">{traktProfile?.username || 'Trakt User'}</span>
                                                </div>
                                                <button 
                                                    onClick={disconnectTrakt}
                                                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold transition-all border border-white/5"
                                                >
                                                    Disconnect
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* DATA & API */}
                        {activeTab === 'data' && (
                            <div className="space-y-10 max-w-2xl animate-fade-in">
                                <div>
                                    <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2"><Key className="w-5 h-5 text-amber-500" /> API Configuration</h3>
                                    <div className="bg-card/50 p-6 rounded-2xl border border-border">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 block">TMDB API Key</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <input 
                                                    type={showKey ? "text" : "password"} 
                                                    value={localApiKey}
                                                    onChange={(e) => setLocalApiKey(e.target.value)}
                                                    className="w-full bg-black/50 border border-border rounded-xl px-4 py-3 text-sm text-text-main font-mono focus:border-indigo-500 focus:outline-none transition-all"
                                                    placeholder="Enter your TMDB API Key"
                                                />
                                                <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main text-xs font-bold uppercase">
                                                    {showKey ? 'Hide' : 'Show'}
                                                </button>
                                            </div>
                                            <button 
                                                onClick={handleSaveKey} 
                                                disabled={isSavingKey}
                                                className="px-4 rounded-xl bg-white/5 hover:bg-white/10 text-text-main font-bold text-xs border border-border flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isSavingKey ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                Save
                                            </button>
                                        </div>
                                        <p className="text-xs text-text-muted mt-3">
                                            Required for fetching show data. Get one at <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">themoviedb.org</a>. Accepts v3 (short) or v4 (long) keys.
                                        </p>
                                    </div>
                                    
                                    <div className="mt-6">
                                        <h4 className="text-sm font-bold text-text-main mb-3">Connection Status</h4>
                                        <div className="flex flex-wrap gap-2">
                                            <ConnectionStatus label="Supabase" active={hasSupabase} />
                                            <ConnectionStatus label="TMDB" active={hasTmdbKey} />
                                            <ConnectionStatus label="Trakt" active={hasTrakt} />
                                            <ConnectionStatus label="TVMaze" active={true} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2"><Database className="w-5 h-5 text-indigo-500" /> Data Management</h3>
                                    
                                    {/* Troubleshooting Section */}
                                    <div className="mb-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                                                    <Wrench className="w-4 h-4" /> Troubleshooting
                                                </h4>
                                                <p className="text-xs text-text-muted mt-1 max-w-sm">
                                                    Seeing incorrect dates or missing episodes? Force a complete calendar rebuild.
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => setShowRebuild(true)}
                                                className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Rebuild Calendar
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button onClick={handleExport} className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3 hover:bg-card/80 transition-colors text-left group">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"><Download className="w-5 h-5" /></div>
                                            <div>
                                                <div className="text-sm font-bold text-text-main">Export Backup</div>
                                                <div className="text-xs text-text-muted">Save local JSON file</div>
                                            </div>
                                        </button>
                                        <button onClick={handleImportClick} className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3 hover:bg-card/80 transition-colors text-left group">
                                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform"><Upload className="w-5 h-5" /></div>
                                            <div>
                                                <div className="text-sm font-bold text-text-main">Import Backup</div>
                                                <div className="text-xs text-text-muted">Restore from standard JSON</div>
                                            </div>
                                        </button>
                                        <button onClick={() => setShowLegacyImport(true)} className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3 hover:bg-card/80 transition-colors text-left group">
                                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform"><FileJson className="w-5 h-5" /></div>
                                            <div>
                                                <div className="text-sm font-bold text-text-main">Import Legacy Profile</div>
                                                <div className="text-xs text-text-muted">Manual selection from old format</div>
                                            </div>
                                        </button>
                                        {user?.is_cloud && (
                                            <button onClick={() => triggerCloudSync()} disabled={isSyncing} className="col-span-full p-4 bg-card border border-border rounded-2xl flex items-center gap-3 hover:bg-card/80 transition-colors text-left group disabled:opacity-50">
                                                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform"><RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} /></div>
                                                <div>
                                                    <div className="text-sm font-bold text-text-main">Force Cloud Sync</div>
                                                    <div className="text-xs text-text-muted">{isSyncing ? 'Syncing...' : 'Push local changes to cloud'}</div>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                                </div>
                            </div>
                        )}

                        {/* ACCOUNT */}
                        {activeTab === 'account' && (
                            <div className="space-y-8 max-w-2xl animate-fade-in">
                                <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2"><User className="w-5 h-5 text-indigo-500" /> Identity</h3>
                                <div className="bg-card/40 p-6 rounded-3xl border border-border flex gap-6 items-center">
                                    <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-3xl shrink-0">{user?.username.charAt(0).toUpperCase()}</div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-lg font-black text-text-main truncate">{user?.username}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            {user?.is_cloud ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wide border border-emerald-500/20"><Database className="w-3 h-3" /> Cloud Synced</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-bold uppercase tracking-wide border border-orange-500/20"><Database className="w-3 h-3" /> Local Storage</span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={logout} className="ml-auto p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-colors"><LogOut className="w-5 h-5" /></button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                     <div className="p-6 rounded-3xl bg-card/30 border border-border flex flex-col items-center text-center">
                                         <Monitor className="w-8 h-8 text-text-muted mb-3" />
                                         <h5 className="font-bold text-text-main text-sm">Desktop</h5>
                                         <p className="text-xs text-text-muted mt-1">Best for management</p>
                                     </div>
                                     <div className="p-6 rounded-3xl bg-card/30 border border-border flex flex-col items-center text-center">
                                         <Smartphone className="w-8 h-8 text-text-muted mb-3" />
                                         <h5 className="font-bold text-text-main text-sm">Mobile</h5>
                                         <p className="text-xs text-text-muted mt-1">Best for tracking</p>
                                     </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {showLegacyImport && <LegacyImportModal isOpen={showLegacyImport} onClose={() => setShowLegacyImport(false)} />}
            {showRebuild && <RebuildModal isOpen={showRebuild} onClose={() => setShowRebuild(false)} />}
        </div>
    );
};

export default V2SettingsModal;
