
import React, { useRef, useState, useEffect } from 'react';
import { X, Eye, EyeOff, Film, Ban, Sparkles, Key, Check, Globe, Download, Upload, RefreshCw, AlertTriangle, ShieldAlert, Monitor, Moon, Sun, Smartphone, User, Palette, Layers, Database, Lock, LogOut, ChevronRight, Type, CheckCircle2, QrCode, Scan, Merge, ArrowRight, Loader2, Link as LinkIcon, Zap, Bell, PenTool, CalendarClock, History } from 'lucide-react';
import { useAppContext, THEMES } from '../context/AppContext';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'appearance' | 'account' | 'preferences' | 'data';

const FONTS = [
    { id: 'inter', name: 'Inter', family: 'Inter, sans-serif' },
    { id: 'outfit', name: 'Outfit', family: 'Outfit, sans-serif' },
    { id: 'space', name: 'Space', family: 'Space Grotesk, sans-serif' },
    { id: 'lora', name: 'Lora', family: 'Lora, serif' },
];

const BASE_THEMES = [
    { id: 'auto', name: 'Auto', color: '#52525b', icon: Sparkles },
    { id: 'cosmic', name: 'Cosmic', color: '#18181b', icon: Moon },
    { id: 'oled', name: 'OLED', color: '#000000', icon: Moon },
    { id: 'midnight', name: 'Midnight', color: '#0f172a', icon: Moon },
    { id: 'forest', name: 'Forest', color: '#05190b', icon: Moon },
    { id: 'dawn', name: 'Dawn', color: '#3f3f46', icon: Moon },
    { id: 'light', name: 'Light', color: '#f4f4f5', icon: Sun },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, user, updateUserKey, importBackup, batchAddShows, batchSubscribe, processSyncPayload, getSyncPayload, reloadAccount, traktAuth, traktPoll, saveTraktToken, disconnectTrakt, syncTraktData, watchlist, subscribedLists, reminders, interactions, unhideShow } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<TabId>('appearance');
  const [keyInput, setKeyInput] = useState(user?.tmdbKey || '');
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [customColor, setCustomColor] = useState(settings.customThemeColor || '#6366f1');
  
  // Export/Import State
  const [showExportWarning, setShowExportWarning] = useState(false);
  const [hasAcknowledgedRisk, setHasAcknowledgedRisk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mergePreview, setMergePreview] = useState<any>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Trakt State
  const [traktClientId, setTraktClientId] = useState(localStorage.getItem('trakt_client_id') || '');
  const [traktCode, setTraktCode] = useState<{ user_code: string; verification_url: string; device_code: string, interval: number } | null>(null);

  useEffect(() => {
      if (settings.customThemeColor) setCustomColor(settings.customThemeColor);
  }, [settings.customThemeColor]);

  // Helpers
  const handleCustomColorChange = (hex: string) => { setCustomColor(hex); updateSettings({ customThemeColor: hex, theme: 'custom' }); };
  const toggleSpoiler = (key: 'images' | 'overview' | 'title' | 'includeMovies') => {
      const newConfig = { ...settings.spoilerConfig, [key]: !settings.spoilerConfig[key] };
      updateSettings({ spoilerConfig: newConfig });
  };
  const saveKey = () => { if (keyInput.trim()) { updateUserKey(keyInput.trim()); setIsEditingKey(false); } };
  const downloadJson = (data: any, filename: string) => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${filename}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
  const handleExportProfile = () => { const data = { version: '2.1', exportDate: new Date().toISOString(), user, watchlist, subscribedLists, settings, reminders, interactions }; downloadJson(data, `tv-calendar-backup-${new Date().toISOString().split('T')[0]}`); setShowExportWarning(false); };
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { try { const data = JSON.parse(event.target?.result as string); let incomingShows = Array.isArray(data) ? data : (data.watchlist || []); let incomingLists = Array.isArray(data) ? [] : (data.subscribedLists || []); const currentShowIds = new Set(watchlist.map(s => s.id)); const currentListIds = new Set(subscribedLists.map(l => l.id)); const newShows = incomingShows.filter((s: any) => !currentShowIds.has(s.id)); const newLists = incomingLists.filter((l: any) => !currentListIds.has(l.id)); setMergePreview({ matchCount: incomingShows.length - newShows.length, newShows, newLists, totalNew: newShows.length + newLists.length, fullData: data }); } catch { alert('Invalid file.'); } }; reader.readAsText(file); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const confirmMerge = () => { if (mergePreview) { setIsProcessingImport(true); if (mergePreview.newShows.length > 0) batchAddShows(mergePreview.newShows); if (mergePreview.newLists.length > 0) batchSubscribe(mergePreview.newLists); setTimeout(() => { setIsProcessingImport(false); setMergePreview(null); onClose(); }, 1000); } };
  const handleScan = (result: any) => { if (result?.[0]?.rawValue) { setShowScanner(false); setIsProcessingImport(true); processSyncPayload(result[0].rawValue); } };
  
  const handleTraktConnect = async () => {
    if (!traktClientId) { alert("Please enter a Client ID"); return; }
    localStorage.setItem('trakt_client_id', traktClientId);
    try {
        const codeData = await traktAuth(traktClientId); 
        setTraktCode(codeData);
        const interval = setInterval(async () => {
            const pollRes = await traktPoll(codeData.device_code, traktClientId, '');
            if (pollRes.status === 200) { clearInterval(interval); setTraktCode(null); await saveTraktToken(pollRes.data); } 
            else if (pollRes.status >= 400 && pollRes.status !== 429) { clearInterval(interval); setTraktCode(null); }
        }, codeData.interval * 1000);
    } catch (e) { alert("Failed to connect to Trakt."); }
  };

  const TABS = [
      { id: 'appearance', label: 'Appearance', icon: Palette },
      { id: 'preferences', label: 'Preferences', icon: Layers },
      { id: 'account', label: 'Account & Sync', icon: User },
      { id: 'data', label: 'Data & Storage', icon: Database },
  ];

  if (!isOpen && !isProcessingImport) return null;
  if (isProcessingImport) return (<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" /><h2 className="text-xl font-bold text-white">Processing...</h2></div>);
  if (showQr) return (<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl" onClick={() => setShowQr(false)}><div className="bg-white rounded-3xl p-8 max-w-sm w-full flex flex-col items-center" onClick={e => e.stopPropagation()}><QRCode value={getSyncPayload()} size={240} /><button onClick={() => setShowQr(false)} className="w-full mt-6 py-3 rounded-xl bg-slate-900 text-white font-bold">Done</button></div></div>);
  if (showScanner) return (<div className="fixed inset-0 z-[100] bg-black flex flex-col"><div className="flex justify-between items-center p-4 absolute top-0 w-full z-10"><h2 className="text-white font-bold">Scan QR</h2><button onClick={() => setShowScanner(false)} className="p-2 bg-white/10 rounded-full text-white"><X className="w-6 h-6" /></button></div><div className="flex-1 flex items-center justify-center"><Scanner onScan={handleScan} /></div></div>);
  if (mergePreview) return (<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"><div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm"><div className="text-center mb-6"><Merge className="w-12 h-12 text-indigo-500 mx-auto mb-3" /><h2 className="text-xl font-bold text-white">Import Data</h2><p className="text-zinc-400">Found {mergePreview.totalNew} new items.</p></div><div className="flex gap-3"><button onClick={() => setMergePreview(null)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300">Cancel</button><button onClick={confirmMerge} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold">Import</button></div></div></div>);
  if (showExportWarning) return (<div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-red-950/90 backdrop-blur-md"><div className="bg-zinc-900 border-2 border-red-500/50 rounded-3xl p-6 w-full max-w-md"><div className="flex items-center gap-3 mb-4 text-red-400"><ShieldAlert className="w-8 h-8" /><h2 className="text-2xl font-bold text-white">Warning</h2></div><p className="text-zinc-300 mb-6">This file contains your <strong>API Key</strong>. Do not share it publicly.</p><div className="flex items-center gap-3 mb-6 p-3 bg-zinc-800/50 rounded-lg cursor-pointer" onClick={() => setHasAcknowledgedRisk(!hasAcknowledgedRisk)}><div className={`w-5 h-5 rounded border flex items-center justify-center ${hasAcknowledgedRisk ? 'bg-red-600 border-red-500' : 'border-zinc-500'}`}>{hasAcknowledgedRisk && <Check className="w-3.5 h-3.5 text-white" />}</div><p className="text-sm text-zinc-400">I understand.</p></div><div className="flex gap-3"><button onClick={() => setShowExportWarning(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-300">Cancel</button><button onClick={handleExportProfile} disabled={!hasAcknowledgedRisk} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50">Download</button></div></div></div>);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[var(--bg-main)] border border-[var(--border-color)] rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col md:flex-row overflow-hidden relative" 
        onClick={e => e.stopPropagation()}
      >
        <div className="hidden md:flex w-64 border-r border-[var(--border-color)] flex-col bg-[var(--bg-panel)]">
            <div className="p-6 border-b border-[var(--border-color)]">
                <h2 className="text-xl font-bold text-[var(--text-main)]">Settings</h2>
                <p className="text-xs text-[var(--text-muted)]">Customize your experience</p>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabId)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-sm font-medium ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-[var(--text-muted)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--text-main)]'}`}
                    >
                        <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : ''}`} />
                        <span>{tab.label}</span>
                        {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto text-white/50" />}
                    </button>
                ))}
            </nav>
            <div className="p-4 border-t border-[var(--border-color)]">
                <button onClick={onClose} className="w-full py-3 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-zinc-800 transition-colors text-sm font-medium">Close Settings</button>
            </div>
        </div>

        <div className="md:hidden flex flex-col bg-[var(--bg-panel)] border-b border-[var(--border-color)]">
            <div className="flex items-center justify-between p-4 pb-2">
                <h2 className="text-lg font-bold text-[var(--text-main)]">Settings</h2>
                <button onClick={onClose} className="p-2 -mr-2 text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex overflow-x-auto px-4 pb-0 gap-4 hide-scrollbar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabId)}
                        className={`flex flex-col items-center gap-1 pb-3 px-1 border-b-2 transition-colors shrink-0 ${activeTab === tab.id ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-[var(--text-muted)]'}`}
                    >
                        <tab.icon className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                    </button>
                ))}
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[var(--bg-main)] p-6 md:p-10 relative">
            <button onClick={onClose} className="absolute top-6 right-6 hidden md:block p-2 rounded-full bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)]"><X className="w-5 h-5" /></button>

            {activeTab === 'appearance' && (
                <div className="space-y-10 animate-fade-in max-w-3xl">
                    <section>
                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-[var(--text-main)] mb-1">Typography</h3>
                            <p className="text-[var(--text-muted)] text-sm">Choose a font that suits your style.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {FONTS.map(font => (
                                <button
                                    key={font.id}
                                    onClick={() => updateSettings({ appFont: font.id as any })}
                                    className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${settings.appFont === font.id ? 'bg-indigo-600/10 border-indigo-500' : 'bg-[var(--bg-panel)] border-[var(--border-color)] hover:border-zinc-500'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-sm font-medium ${settings.appFont === font.id ? 'text-indigo-500 dark:text-indigo-400' : 'text-[var(--text-muted)]'}`}>{font.name}</span>
                                        {settings.appFont === font.id && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
                                    </div>
                                    <div style={{ fontFamily: font.family }} className="text-2xl text-[var(--text-main)]">The quick brown fox</div>
                                </button>
                            ))}
                        </div>
                    </section>
                    <div className="h-px bg-[var(--border-color)]" />
                    <section>
                         <div className="mb-6">
                            <h3 className="text-2xl font-bold text-[var(--text-main)] mb-1">Theme & Color</h3>
                            <p className="text-[var(--text-muted)] text-sm">Customize the interface colors.</p>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 block">Base Theme</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {BASE_THEMES.map(theme => (
                                        <button
                                            key={theme.id}
                                            onClick={() => updateSettings({ baseTheme: theme.id as any })}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${settings.baseTheme === theme.id ? 'border-indigo-500 bg-[var(--bg-panel)]' : 'border-[var(--border-color)] bg-[var(--bg-panel)] opacity-60 hover:opacity-100'}`}
                                        >
                                            <div className="w-8 h-8 rounded-full shadow-lg border border-white/10 flex items-center justify-center" style={{ backgroundColor: theme.color }}>
                                                {theme.id === 'auto' && <Sparkles className="w-4 h-4 text-white" />}
                                                {theme.id === 'light' && <Sun className="w-4 h-4 text-zinc-900" />}
                                                {['cosmic', 'oled', 'midnight', 'forest', 'dawn'].includes(theme.id) && <Moon className="w-4 h-4 text-white/50" />}
                                            </div>
                                            <span className="text-xs font-medium text-[var(--text-main)]">{theme.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3 block">Accent Color</label>
                                <div className="flex flex-wrap gap-3">
                                    {Object.keys(THEMES).map((themeKey) => (
                                        <button key={themeKey} onClick={() => updateSettings({ theme: themeKey, customThemeColor: undefined })} className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 ${settings.theme === themeKey ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-transparent'}`} style={{ backgroundColor: `rgb(${THEMES[themeKey]['500']})` }} />
                                    ))}
                                    <div className="relative group">
                                        <button className={`w-10 h-10 rounded-full border-2 flex items-center justify-center overflow-hidden bg-zinc-800 ${settings.theme === 'custom' ? 'border-white scale-110' : 'border-zinc-700'}`}>
                                            <div className="w-full h-full" style={{ backgroundColor: customColor }} />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors"><PenTool className="w-4 h-4 text-white drop-shadow-md" /></div>
                                        </button>
                                        <input type="color" value={customColor} onChange={(e) => handleCustomColorChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'preferences' && (
                <div className="space-y-8 animate-fade-in max-w-3xl">
                     <section>
                         <h3 className="text-2xl font-bold text-[var(--text-main)] mb-6">Content Settings</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] p-5 rounded-2xl">
                                 <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-red-500/10 text-red-400 rounded-lg"><EyeOff className="w-5 h-5" /></div><h4 className="font-bold text-[var(--text-main)]">Spoiler Protection</h4></div>
                                 <div className="space-y-3">
                                     {[['images', 'Blur Images'], ['overview', 'Hide Descriptions'], ['title', 'Hide Titles']].map(([key, label]) => (
                                         <div key={key} className="flex items-center justify-between"><span className="text-sm text-[var(--text-muted)]">{label}</span><button onClick={() => toggleSpoiler(key as any)} className={`w-10 h-6 rounded-full transition-colors relative ${settings.spoilerConfig[key as keyof typeof settings.spoilerConfig] ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.spoilerConfig[key as keyof typeof settings.spoilerConfig] ? 'translate-x-4' : ''}`} /></button></div>
                                     ))}
                                 </div>
                             </div>
                             <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] p-5 rounded-2xl">
                                 <div className="flex items-center gap-3 mb-4"><div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Layers className="w-5 h-5" /></div><h4 className="font-bold text-[var(--text-main)]">General</h4></div>
                                 <div className="space-y-3">
                                     <div className="flex items-center justify-between"><span className="text-sm text-[var(--text-muted)]">Ignore Specials (S0)</span><button onClick={() => updateSettings({ ignoreSpecials: !settings.ignoreSpecials })} className={`w-10 h-6 rounded-full transition-colors relative ${settings.ignoreSpecials ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.ignoreSpecials ? 'translate-x-4' : ''}`} /></button></div>
                                     <div className="flex items-center justify-between"><span className="text-sm text-[var(--text-muted)]">Hide Theatrical Movies</span><button onClick={() => updateSettings({ hideTheatrical: !settings.hideTheatrical })} className={`w-10 h-6 rounded-full transition-colors relative ${settings.hideTheatrical ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.hideTheatrical ? 'translate-x-4' : ''}`} /></button></div>
                                 </div>
                             </div>
                         </div>
                     </section>
                </div>
            )}

            {activeTab === 'account' && (
                <div className="space-y-10 animate-fade-in max-w-3xl">
                    <section>
                        <h3 className="text-2xl font-bold text-[var(--text-main)] mb-6">Profile</h3>
                        <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] p-6 rounded-2xl flex items-center gap-6">
                            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-indigo-900/20">{user?.username.charAt(0).toUpperCase()}</div>
                            <div className="flex-1">
                                <h4 className="text-lg font-bold text-white">{user?.username}</h4>
                                <p className="text-sm text-zinc-500">{user?.isCloud ? 'Cloud Synced Account' : 'Local Mode Profile'}</p>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'data' && (
                <div className="space-y-6 animate-fade-in max-w-3xl">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button onClick={() => setShowExportWarning(true)} className="p-6 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:border-indigo-500/50 rounded-2xl text-left group transition-all"><Download className="w-8 h-8 text-indigo-500 mb-3 group-hover:-translate-y-1 transition-transform" /><h4 className="font-bold text-[var(--text-main)] mb-1">Backup Profile</h4><p className="text-xs text-[var(--text-muted)]">Save all settings and data to JSON.</p></button>
                        <button onClick={handleImportClick} className="p-6 bg-[var(--bg-panel)] border border-[var(--border-color)] hover:border-emerald-500/50 rounded-2xl text-left group transition-all"><Upload className="w-8 h-8 text-emerald-500 mb-3 group-hover:-translate-y-1 transition-transform" /><h4 className="font-bold text-[var(--text-main)] mb-1">Restore Profile</h4><p className="text-xs text-[var(--text-muted)]">Import settings from a JSON file.</p></button>
                     </div>
                </div>
            )}
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
      </div>
    </div>
  );
};

export default SettingsModal;
