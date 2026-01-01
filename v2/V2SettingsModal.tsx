
import React, { useState, useEffect, useRef } from 'react';
import { Settings, User, X, LogOut, Palette, EyeOff, Database, Key, Download, Upload, RefreshCw, Smartphone, Monitor, Check, FileJson, Layout, Image, Edit3, Globe, ShieldCheck, AlertCircle, Wrench, Link as LinkIcon, ExternalLink, Loader2, ChevronDown, ChevronUp, QrCode, Star, Zap, Type, Moon, Sun, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { setApiToken } from '../services/tmdb';
import { supabase } from '../services/supabase';
import { getDeviceCode, pollToken, getTraktProfile } from '../services/trakt';
import toast from 'react-hot-toast';
import LegacyImportModal from '../components/LegacyImportModal';
import RebuildModal from '../components/RebuildModal';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';

interface V2SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabId = 'general' | 'appearance' | 'spoilers' | 'integrations' | 'data' | 'account';

// Distinct Color Palettes (Removed Upside Down from here)
const COLOR_MODES = [
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
    
    // API Keys State
    const [localTmdbKey, setLocalTmdbKey] = useState(user?.tmdb_key || '');
    const [showKey, setShowKey] = useState(false);
    const [isSavingKey, setIsSavingKey] = useState(false);
    
    // QR Export/Import State
    const [showQrExport, setShowQrExport] = useState(false);
    const [showQrScanner, setShowQrScanner] = useState(false);
    
    // Custom Theme State
    const [customColor, setCustomColor] = useState(settings.customThemeColor || '#6366f1');
    
    // Legacy Import Modal State
    const [showLegacyImport, setShowLegacyImport] = useState(false);
    const [showRebuild, setShowRebuild] = useState(false);
    
    // Trakt Auth State
    const [traktCode, setTraktCode] = useState<string | null>(null);
    const [traktUrl, setTraktUrl] = useState<string | null>(null);
    const [isPollingTrakt, setIsPollingTrakt] = useState(false);
    
    // Trakt Secrets State
    const [showTraktConfig, setShowTraktConfig] = useState(false);
    const [traktClientId, setTraktClientId] = useState(settings.traktClient?.id || localStorage.getItem('trakt_client_id') || '');
    const [traktClientSecret, setTraktClientSecret] = useState(settings.traktClient?.secret || localStorage.getItem('trakt_client_secret') || '');

    // Status Checks
    const hasSupabase = !!supabase;
    const hasTmdbKey = !!user?.tmdb_key;
    const hasTrakt = !!traktToken;
    
    // Theme Checks
    const isUpsideDown = settings.activeTheme === 'upside-down';

    useEffect(() => {
        setLocalTmdbKey(user?.tmdb_key || '');
    }, [user?.tmdb_key]);

    // ... (Keep existing handlers: handleSaveKeys, handleQrScan, getQrData, handleExport, handleFileChange, handleCustomColorChange, saveTraktSecrets, startTraktAuth, disconnectTrakt)
    const handleSaveKeys = async () => {
        if (!user) return;
        setIsSavingKey(true);
        
        try {
            const cleanTmdb = localTmdbKey.trim();
            const updatedUser = { ...user, tmdb_key: cleanTmdb };
            login(updatedUser); 
            if(cleanTmdb) setApiToken(cleanTmdb); 
            if (user.is_cloud && supabase) {
                const newSettings = { ...settings }; 
                updateSettings(newSettings);
                const { error } = await supabase.from('profiles').update({ tmdb_key: cleanTmdb, settings: newSettings }).eq('id', user.id);
                if (error) { console.error("Cloud save failed:", error); toast.error("Saved locally, cloud sync issue."); } else { toast.success("Keys saved to cloud!"); }
            } else { toast.success("Keys saved locally!"); }
        } catch (e) { console.error("Error saving keys", e); } finally { setIsSavingKey(false); }
    };

    const handleQrScan = (result: any) => {
        if (result?.[0]?.rawValue) {
            try {
                const data = JSON.parse(result[0].rawValue);
                if (data.type === 'tv_cal_keys') {
                    setLocalTmdbKey(data.tmdb || '');
                    setTraktClientId(data.traktId || '');
                    setTraktClientSecret(data.traktSecret || '');
                    if (data.traktId && data.traktSecret) { updateSettings({ traktClient: { id: data.traktId, secret: data.traktSecret } }); }
                    toast.success("Keys imported! Click 'Save Keys' to apply TMDB key.");
                    setShowQrScanner(false);
                }
            } catch (e) { toast.error("Invalid QR Code"); }
        }
    };
    
    const getQrData = () => { return JSON.stringify({ type: 'tv_cal_keys', tmdb: localTmdbKey, traktId: traktClientId, traktSecret: traktClientSecret }); };

    const handleExport = () => {
        const { watchlist, history, reminders } = useStore.getState();
        const data = { user: { username: user?.username }, settings, watchlist, history, reminders, exported_at: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `tv-calendar-backup-${new Date().toISOString().split('T')[0]}.json`; a.click();
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const handleImportClick = () => fileInputRef.current?.click();
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (data.watchlist && Array.isArray(data.watchlist)) { importBackup(data); toast.success('Backup restored successfully.'); } else { toast.error('Format not recognized. Try "Import Legacy Profile" instead.'); }
            } catch (err) { toast.error('Invalid backup file.'); }
        }; reader.readAsText(file);
    };

    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const color = e.target.value; setCustomColor(color); updateSettings({ baseTheme: 'custom', customThemeColor: color });
    };
    
    const saveTraktSecrets = () => { const id = traktClientId.trim(); const secret = traktClientSecret.trim(); updateSettings({ traktClient: { id, secret } }); toast.success("Trakt secrets saved"); };
    const startTraktAuth = async () => {
        if (!traktClientId || !traktClientSecret) { toast.error("Please configure Client ID & Secret first"); setShowTraktConfig(true); return; }
        saveTraktSecrets(); setIsPollingTrakt(true);
        try {
            const data = await getDeviceCode(); setTraktCode(data.user_code); setTraktUrl(data.verification_url);
            const interval = setInterval(async () => {
                const poll = await pollToken(data.device_code);
                if (poll.status === 200) {
                    clearInterval(interval); setTraktToken(poll.data.access_token);
                    const profile = await getTraktProfile(poll.data.access_token); setTraktProfile(profile);
                    setIsPollingTrakt(false); setTraktCode(null); setTraktUrl(null); toast.success("Trakt account connected!"); setTimeout(() => window.location.reload(), 1500);
                } else if (poll.status === 404 || poll.status === 409 || poll.status === 410) { clearInterval(interval); setIsPollingTrakt(false); setTraktCode(null); toast.error("Trakt connection timed out."); }
            }, data.interval * 1000);
        } catch (e: any) { console.error(e); setIsPollingTrakt(false); toast.error(e.message || "Could not reach Trakt.tv"); }
    };
    const disconnectTrakt = () => { setTraktToken(undefined); setTraktProfile(undefined); toast.success("Disconnected Trakt account"); };

    if (!isOpen) return null;

    const TabButton = ({ id, label, icon: Icon }: { id: TabId, label: string, icon: any }) => (
        <button onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all text-sm font-bold ${activeTab === id ? 'bg-indigo-600/10 text-indigo-400' : 'text-text-muted hover:text-text-main hover:bg-white/[0.02]'}`}><Icon className="w-5 h-5" /> {label}</button>
    );

    const Toggle = ({ active, onToggle, label, description, icon: Icon }: { active: boolean; onToggle: () => void; label: string; description?: string, icon?: any }) => (
        <div className="flex items-center justify-between py-4 cursor-pointer group" onClick={onToggle}>
            <div className="flex-1 pr-4 flex items-start gap-3">
                {Icon && <div className={`p-2 rounded-lg ${active ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}><Icon className="w-5 h-5" /></div>}
                <div>
                    <h4 className="text-sm font-bold text-text-main group-hover:text-indigo-400 transition-colors">{label}</h4>
                    {description && <p className="text-xs text-text-muted mt-1">{description}</p>}
                </div>
            </div>
            <button className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${active ? 'bg-indigo-600' : 'bg-card border border-border'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-lg transition-transform ${active ? 'translate-x-6' : ''}`} />
            </button>
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
                </div>

                {/* Mobile Header & Tabs */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-panel">
                     <h2 className="text-lg font-black text-text-main uppercase">Settings</h2>
                     <button onClick={onClose} className="p-2 text-text-muted"><X className="w-5 h-5" /></button>
                </div>
                <div className="md:hidden flex overflow-x-auto border-b border-border p-2 gap-2 hide-scrollbar bg-background">
                     {['general', 'appearance', 'spoilers', 'integrations', 'data', 'account'].map(t => (
                         <button key={t} onClick={() => setActiveTab(t as TabId)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === t ? 'bg-indigo-600 text-white' : 'bg-card text-text-muted border border-border'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
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
                                    <div className="mb-6 bg-card/40 p-4 rounded-xl border border-border">
                                        <label className="text-sm font-bold text-text-main mb-2 block flex items-center gap-2"><Globe className="w-4 h-4 text-indigo-400" /> Region / Country</label>
                                        <div className="relative">
                                            <select value={settings.country || 'US'} onChange={(e) => updateSettings({ country: e.target.value })} className="w-full bg-black/40 border border-border rounded-lg px-4 py-3 text-sm text-text-main focus:outline-none focus:border-indigo-500 appearance-none transition-colors">
                                                {COUNTRIES.map(c => (<option key={c.code} value={c.code}>{c.name} ({c.code})</option>))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted text-xs">▼</div>
                                        </div>
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
                                        <select value={settings.timezone} onChange={(e) => updateSettings({ timezone: e.target.value })} className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-indigo-500 appearance-none">
                                            {(Intl as any).supportedValuesOf('timeZone').map((tz: string) => (<option key={tz} value={tz}>{tz}</option>))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">▼</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* APPEARANCE */}
                        {activeTab === 'appearance' && (
                            <div className="space-y-12 max-w-3xl animate-fade-in">
                                
                                {/* 1. Visual Theme (Big Cards) */}
                                <div>
                                    <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2"><Palette className="w-5 h-5 text-indigo-500" /> Visual Theme</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => updateSettings({ activeTheme: 'standard' })}
                                            className={`relative h-32 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${!isUpsideDown ? 'bg-indigo-600/10 border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-card border-border hover:border-text-muted hover:bg-card/80'}`}
                                        >
                                            <div className="flex flex-col items-center gap-2">
                                                <div className={`p-2 rounded-full ${!isUpsideDown ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                                    <Sparkles className="w-6 h-6" />
                                                </div>
                                                <span className={`text-sm font-bold uppercase tracking-wider ${!isUpsideDown ? 'text-indigo-400' : 'text-text-muted'}`}>Standard</span>
                                            </div>
                                            {!isUpsideDown && <div className="absolute top-3 right-3 bg-indigo-500 text-white rounded-full p-1"><Check className="w-3 h-3" /></div>}
                                        </button>

                                        <button 
                                            onClick={() => updateSettings({ activeTheme: 'upside-down' })}
                                            className={`relative h-32 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all overflow-hidden ${isUpsideDown ? 'bg-red-900/20 border-red-600 ring-2 ring-red-600/20' : 'bg-card border-border hover:border-text-muted hover:bg-card/80'}`}
                                        >
                                            <div className="flex flex-col items-center gap-2 relative z-10">
                                                <div className={`p-2 rounded-full ${isUpsideDown ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                                    <Zap className="w-6 h-6" />
                                                </div>
                                                <span className={`text-sm font-bold uppercase tracking-wider ${isUpsideDown ? 'text-red-500' : 'text-text-muted'}`}>Upside Down</span>
                                            </div>
                                            {isUpsideDown && (
                                                <>
                                                    <div className="absolute inset-0 bg-gradient-to-t from-red-900/20 to-transparent pointer-events-none" />
                                                    <div className="absolute top-3 right-3 bg-red-600 text-white rounded-full p-1"><Check className="w-3 h-3" /></div>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    
                                    {/* Sub-setting for Theme Font */}
                                    <div className="mt-4 bg-card/30 p-1 rounded-xl border border-border">
                                        <Toggle 
                                            label="Apply Theme Font" 
                                            description="Allow specific themes (like Upside Down) to override the application font."
                                            active={settings.themeFontOverride}
                                            icon={Type}
                                            onToggle={() => updateSettings({ themeFontOverride: !settings.themeFontOverride })}
                                        />
                                    </div>
                                </div>

                                {/* 2. Color Palette (Conditional) */}
                                <div className={`transition-opacity duration-300 ${isUpsideDown ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold text-text-main flex items-center gap-2"><Moon className="w-5 h-5 text-indigo-500" /> Color Palette</h3>
                                        {isUpsideDown && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/30 uppercase font-bold">Controlled by Theme</span>}
                                    </div>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {COLOR_MODES.map(theme => (
                                            <button key={theme.id} onClick={() => updateSettings({ baseTheme: theme.id as any })} className={`relative p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${settings.baseTheme === theme.id ? 'bg-card border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-card/50 border-border hover:bg-card'}`}>
                                                <div className="w-8 h-8 rounded-full shadow-lg border border-white/10" style={{ backgroundColor: theme.color }} />
                                                <span className={`text-xs font-bold uppercase tracking-wider ${settings.baseTheme === theme.id ? 'text-text-main' : 'text-text-muted'}`}>{theme.name}</span>
                                            </button>
                                        ))}
                                        <label className={`relative p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 cursor-pointer group ${settings.baseTheme === 'custom' ? 'bg-card border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'bg-card/50 border-border hover:bg-card'}`}>
                                            <div className="w-8 h-8 rounded-full shadow-lg border border-white/10 flex items-center justify-center overflow-hidden relative">
                                                <div className="absolute inset-0" style={{ backgroundColor: customColor }} />
                                                <input type="color" value={customColor} onChange={handleCustomColorChange} className="absolute -top-10 -left-10 w-40 h-40 opacity-0 cursor-pointer" />
                                                <Edit3 className="w-3 h-3 text-white/50 relative z-10 pointer-events-none" />
                                            </div>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${settings.baseTheme === 'custom' ? 'text-text-main' : 'text-text-muted'}`}>Custom</span>
                                        </label>
                                    </div>
                                </div>

                                {/* 3. Typography */}
                                <div>
                                    <h3 className="text-xl font-bold text-text-main mb-6">Typography</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {FONTS.map(font => (
                                            <button key={font.id} onClick={() => updateSettings({ appFont: font.id as any })} className={`p-4 rounded-2xl border text-left transition-all ${settings.appFont === font.id ? 'bg-card border-indigo-500' : 'bg-card/50 border-border hover:bg-card'}`}>
                                                <div className="text-sm font-bold text-text-main mb-1">{font.name}</div>
                                                <div className="text-xs text-text-muted">The quick brown fox jumps over the lazy dog.</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 4. Display Options */}
                                <div>
                                     <h3 className="text-xl font-bold text-text-main mb-6">Display Options</h3>
                                     <div className="space-y-4">
                                         <Toggle label="Show Calendar Ratings" description="Display rating score badges on the calendar views." active={!!settings.showCalendarRatings} onToggle={() => updateSettings({ showCalendarRatings: !settings.showCalendarRatings })} />
                                     </div>
                                </div>
                            </div>
                        )}

                        {/* SPOILERS, INTEGRATIONS, DATA, ACCOUNT ... (unchanged content blocks) */}
                        {activeTab === 'spoilers' && (
                             <div className="space-y-8 max-w-2xl animate-fade-in">
                                <div>
                                    <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2"><EyeOff className="w-5 h-5 text-red-500" /> Spoiler Protection</h3>
                                    <div className="bg-card/50 rounded-2xl border border-border p-6 mb-6"><p className="text-sm text-text-muted leading-relaxed">These settings apply to unwatched content in your library. You can reveal hidden content by clicking on it.</p></div>
                                    <div className="mb-6"><h4 className="text-sm font-bold text-text-muted mb-3">Episode Preview Style</h4><div className="grid grid-cols-2 gap-4"><button onClick={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, replacementMode: 'blur' } })} className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${settings.spoilerConfig.replacementMode === 'blur' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-card border-border hover:border-text-muted'}`}><div className={`w-full aspect-video rounded bg-zinc-800 flex items-center justify-center overflow-hidden ${settings.spoilerConfig.replacementMode === 'blur' ? 'ring-2 ring-indigo-500' : ''}`}><div className="w-full h-full bg-zinc-700 blur-md opacity-50" /></div><span className={`text-xs font-bold uppercase tracking-wide ${settings.spoilerConfig.replacementMode === 'blur' ? 'text-text-main' : 'text-text-muted'}`}>Blur Preview</span></button><button onClick={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, replacementMode: 'banner' } })} className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${settings.spoilerConfig.replacementMode === 'banner' ? 'bg-indigo-600/10 border-indigo-500' : 'bg-card border-border hover:border-text-muted'}`}><div className={`w-full aspect-video rounded bg-zinc-800 flex items-center justify-center overflow-hidden relative ${settings.spoilerConfig.replacementMode === 'banner' ? 'ring-2 ring-indigo-500' : ''}`}><Layout className="w-8 h-8 text-zinc-600" /></div><span className={`text-xs font-bold uppercase tracking-wide ${settings.spoilerConfig.replacementMode === 'banner' ? 'text-text-main' : 'text-text-muted'}`}>Use Show Banner</span></button></div></div>
                                    <div className="space-y-1 divide-y divide-border border-y border-border">
                                        <Toggle label="Hide Images" description="Applies selected preview style to unwatched episodes." active={settings.spoilerConfig.images} onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, images: !settings.spoilerConfig.images } })} />
                                        <Toggle label="Hide Descriptions" description="Mask episode overviews/synopses." active={settings.spoilerConfig.overview} onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, overview: !settings.spoilerConfig.overview } })} />
                                        <Toggle label="Hide Titles" description="Mask episode names (e.g. 'Episode 5')." active={settings.spoilerConfig.title} onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, title: !settings.spoilerConfig.title } })} />
                                        <Toggle label="Exclude Movies" description="Never hide spoilers for movies, even if unwatched." active={!settings.spoilerConfig.includeMovies} onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, includeMovies: !settings.spoilerConfig.includeMovies } })} />
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'integrations' && (
                             <div className="space-y-8 max-w-2xl animate-fade-in">
                                <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2"><LinkIcon className="w-5 h-5 text-indigo-500" /> External Accounts</h3>
                                <div className="bg-card/40 border border-border rounded-3xl overflow-hidden">
                                    <div className="p-6 border-b border-border flex items-start justify-between bg-zinc-900/50">
                                        <div className="flex items-center gap-4"><div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-red-900/20">T</div><div><h4 className="text-lg font-bold text-text-main">Trakt.tv</h4><p className="text-xs text-text-muted mt-1">Sync your personalized release schedule.</p></div></div>
                                        {hasTrakt && (<div className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Check className="w-3 h-3" /> Connected</div>)}
                                    </div>
                                    <div className="p-6 bg-black/20">
                                        {!hasTrakt ? (
                                            !traktCode ? (
                                                <div className="space-y-4">
                                                    <button onClick={startTraktAuth} disabled={isPollingTrakt} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2">{isPollingTrakt ? <Loader2 className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />} Connect Trakt Account</button>
                                                    <button onClick={() => setShowTraktConfig(!showTraktConfig)} className="w-full flex items-center justify-between text-xs font-bold text-zinc-500 hover:text-white px-2 py-2 rounded hover:bg-white/5 transition-colors"><span>Configuration</span>{showTraktConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                                                    {showTraktConfig && (
                                                        <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-white/5 animate-enter">
                                                            <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Client ID</label><input type="password" value={traktClientId} onChange={(e) => setTraktClientId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500 outline-none font-mono" placeholder="Enter Client ID from Trakt API"/></div>
                                                            <div className="space-y-1"><label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Client Secret</label><input type="password" value={traktClientSecret} onChange={(e) => setTraktClientSecret(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500 outline-none font-mono" placeholder="Enter Client Secret"/></div>
                                                            <button onClick={saveTraktSecrets} className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-colors border border-white/5">Save Secrets</button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-center space-y-4 animate-enter">
                                                    <p className="text-sm text-text-muted">Enter this code at <span className="text-white font-mono">{traktUrl}</span></p>
                                                    <div className="text-3xl font-black text-white font-mono bg-zinc-900 p-4 rounded-xl border border-border inline-block tracking-widest">{traktCode}</div>
                                                    <div className="flex justify-center"><a href={traktUrl!} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-indigo-400 hover:text-white text-sm font-bold">Open Link <ExternalLink className="w-4 h-4" /></a></div>
                                                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-500"><Loader2 className="w-3 h-3 animate-spin" /> Waiting for authorization...</div>
                                                </div>
                                            )
                                        ) : (
                                            <div className="space-y-4"><div className="flex items-center justify-between"><span className="text-sm font-medium text-zinc-400">Connected Account</span><span className="text-sm font-bold text-white">{traktProfile?.username || 'Trakt User'}</span></div><button onClick={disconnectTrakt} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-bold transition-all border border-white/5">Disconnect</button></div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'data' && (
                             <div className="space-y-10 max-w-2xl animate-fade-in">
                                <div>
                                    <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2"><Key className="w-5 h-5 text-amber-500" /> API Keys</h3>
                                    <div className="bg-card/50 p-6 rounded-2xl border border-border space-y-4">
                                        <div className="space-y-2"><label className="text-[10px] font-black text-text-muted uppercase tracking-widest block">Metadata Provider (TMDB)</label><div className="relative"><input type={showKey ? "text" : "password"} value={localTmdbKey} onChange={(e) => setLocalTmdbKey(e.target.value)} className="w-full bg-black/50 border border-border rounded-xl px-4 py-3 text-sm text-text-main font-mono focus:border-indigo-500 focus:outline-none transition-all pr-12" placeholder="Required for show data"/><div className="absolute right-3 top-1/2 -translate-y-1/2">{hasTmdbKey ? <Check className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-red-500" />}</div></div></div>
                                        <div className="flex gap-2 pt-2"><button onClick={() => setShowKey(!showKey)} className="px-4 py-2 bg-zinc-800 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors">{showKey ? 'Hide Keys' : 'Show Keys'}</button><button onClick={handleSaveKeys} disabled={isSavingKey} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 ml-auto">{isSavingKey ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save Keys</button></div>
                                    </div>
                                    <div className="mt-4 flex gap-3"><button onClick={() => setShowQrExport(true)} className="flex-1 py-3 bg-zinc-800 border border-white/5 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"><QrCode className="w-4 h-4" /> Share Keys via QR</button><button onClick={() => setShowQrScanner(true)} className="flex-1 py-3 bg-zinc-800 border border-white/5 rounded-xl text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"><Smartphone className="w-4 h-4" /> Scan Key QR</button></div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2"><Database className="w-5 h-5 text-indigo-500" /> Data Management</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button onClick={handleExport} className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3 hover:bg-card/80 transition-colors text-left group"><div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"><Download className="w-5 h-5" /></div><div><div className="text-sm font-bold text-text-main">Export Backup</div><div className="text-xs text-text-muted">Save local JSON file</div></div></button>
                                        <button onClick={handleImportClick} className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3 hover:bg-card/80 transition-colors text-left group"><div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform"><Upload className="w-5 h-5" /></div><div><div className="text-sm font-bold text-text-main">Import Backup</div><div className="text-xs text-text-muted">Restore from standard JSON</div></div></button>
                                        <button onClick={() => setShowLegacyImport(true)} className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3 hover:bg-card/80 transition-colors text-left group"><div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform"><FileJson className="w-5 h-5" /></div><div><div className="text-sm font-bold text-text-main">Legacy Import</div><div className="text-xs text-text-muted">Manual selection</div></div></button>
                                        <button onClick={() => setShowRebuild(true)} className="p-4 bg-card border border-border rounded-2xl flex items-center gap-3 hover:bg-card/80 transition-colors text-left group"><div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform"><Wrench className="w-5 h-5" /></div><div><div className="text-sm font-bold text-text-main">Rebuild Calendar</div><div className="text-xs text-text-muted">Fix sync issues</div></div></button>
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'account' && (
                             <div className="space-y-8 max-w-2xl animate-fade-in">
                                <h3 className="text-xl font-bold text-text-main mb-6 flex items-center gap-2"><User className="w-5 h-5 text-indigo-500" /> Identity</h3>
                                <div className="bg-card/40 p-6 rounded-3xl border border-border flex gap-6 items-center">
                                    <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-3xl shrink-0">{user?.username.charAt(0).toUpperCase()}</div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-lg font-black text-text-main truncate">{user?.username}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            {user?.is_cloud ? (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wide border border-emerald-500/20"><Database className="w-3 h-3" /> Cloud Synced</span>) : (<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 text-[10px] font-bold uppercase tracking-wide border border-orange-500/20"><Database className="w-3 h-3" /> Local Storage</span>)}
                                        </div>
                                    </div>
                                    <button onClick={logout} className="ml-auto p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500/20 transition-colors"><LogOut className="w-5 h-5" /></button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {showLegacyImport && <LegacyImportModal isOpen={showLegacyImport} onClose={() => setShowLegacyImport(false)} />}
            {showRebuild && <RebuildModal isOpen={showRebuild} onClose={() => setShowRebuild(false)} />}
            {showQrExport && (<div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in" onClick={() => setShowQrExport(false)}><div className="bg-white p-8 rounded-3xl text-center max-w-sm w-full" onClick={e => e.stopPropagation()}><h3 className="text-black font-black text-xl mb-4">Scan to Import Keys</h3><div className="bg-white p-2 rounded-xl mb-6 inline-block"><QRCode value={getQrData()} size={200} /></div><p className="text-zinc-500 text-xs mb-6">Open TV Calendar on your mobile device, go to Settings, and select "Scan Key QR" to transfer your API keys instantly.</p><button onClick={() => setShowQrExport(false)} className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold">Done</button></div></div>)}
            {showQrScanner && (<div className="fixed inset-0 z-[250] bg-black flex flex-col animate-fade-in"><div className="flex justify-between items-center p-6 absolute top-0 w-full z-10 bg-gradient-to-b from-black/80 to-transparent"><h2 className="text-white font-bold">Scan Settings QR</h2><button onClick={() => setShowQrScanner(false)} className="p-3 bg-white/10 rounded-full text-white backdrop-blur-md"><X className="w-6 h-6" /></button></div><div className="flex-1 flex items-center justify-center"><Scanner onScan={handleQrScan} /></div></div>)}
        </div>
    );
};

export default V2SettingsModal;
