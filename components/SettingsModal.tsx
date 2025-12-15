import React, { useRef, useState, useEffect } from 'react';
import { X, Eye, EyeOff, Ticket, MonitorPlay, Download, Upload, HardDrive, Sparkles, LayoutList, AlignJustify, Key, Check, ListVideo, AlertTriangle, ShieldAlert, FileJson, RefreshCw, Loader2, Hourglass, Expand, Shrink, QrCode, Smartphone, Merge, ArrowDownToLine, Image as ImageIcon, Maximize, Scan, SquareDashedBottom, Database, Globe, Palette, User as UserIcon, Monitor, Pipette, Link as LinkIcon, ExternalLink, Copy, LogOut, LayoutGrid, List, Layers } from 'lucide-react';
import { useAppContext, THEMES } from '../context/AppContext';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'general' | 'appearance' | 'data' | 'integrations';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, watchlist, subscribedLists, user, updateUserKey, importBackup, batchAddShows, batchSubscribe, syncProgress, loading, getSyncPayload, processSyncPayload, reloadAccount, reminders, interactions, traktAuth, traktPoll, saveTraktToken, disconnectTrakt, syncTraktData } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for key editing
  const [keyInput, setKeyInput] = useState(user?.tmdbKey || '');
  const [isEditingKey, setIsEditingKey] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // Export Security State
  const [showExportWarning, setShowExportWarning] = useState(false);
  const [hasAcknowledgedRisk, setHasAcknowledgedRisk] = useState(false);
  
  // Import / Merge State
  const [mergePreview, setMergePreview] = useState<any>(null); 
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // QR Sync State
  const [showQr, setShowQr] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Hold Button State
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdIntervalRef = useRef<number | null>(null);
  const HOLD_DURATION = 5000;
  const UPDATE_INTERVAL = 50;

  // Custom Color State
  const [customColor, setCustomColor] = useState(settings.customThemeColor || '#6366f1');

  // Trakt State
  const [traktClientId, setTraktClientId] = useState(localStorage.getItem('trakt_client_id') || '');
  const [traktCode, setTraktCode] = useState<{ user_code: string; verification_url: string; device_code: string, interval: number } | null>(null);
  const [isTraktPolling, setIsTraktPolling] = useState(false);
  const [isTraktSyncing, setIsTraktSyncing] = useState(false);

  // Get available timezones
  const timezones = React.useMemo(() => { try { return (Intl as any).supportedValuesOf('timeZone'); } catch { return []; } }, []);
  // Reset local processing state
  useEffect(() => { if (!loading && isProcessingImport) { setIsProcessingImport(false); onClose(); } }, [loading, isProcessingImport, onClose]);
  // Clean up timer
  useEffect(() => { return () => stopHold(); }, []);
  // Update local custom color state when settings change
  useEffect(() => { if (settings.customThemeColor) { setCustomColor(settings.customThemeColor); } }, [settings.customThemeColor]);
  // Apply custom color debounced
  const handleCustomColorChange = (hex: string) => { setCustomColor(hex); updateSettings({ customThemeColor: hex, theme: 'custom' }); };
  const startHold = () => { setIsHolding(true); setHoldProgress(0); const step = 100 / (HOLD_DURATION / UPDATE_INTERVAL); holdIntervalRef.current = window.setInterval(() => { setHoldProgress(prev => { const next = prev + step; if (next >= 100) { stopHold(); setShowExportWarning(true); return 100; } return next; }); }, UPDATE_INTERVAL); };
  const stopHold = () => { if (holdIntervalRef.current) { clearInterval(holdIntervalRef.current); holdIntervalRef.current = null; } setIsHolding(false); setHoldProgress(0); };
  if (!isOpen && !isProcessingImport) return null;
  const handleExportProfile = () => { const data = { version: '2.0', exportDate: new Date().toISOString(), user, watchlist, subscribedLists, settings, reminders, interactions }; downloadJson(data, `tv-calendar-profile-${user?.username || 'backup'}-${new Date().toISOString().split('T')[0]}`); setShowExportWarning(false); setHasAcknowledgedRisk(false); };
  const handleExportWatchlist = () => { const data = { watchlist }; downloadJson(data, `tv-calendar-watchlist-${new Date().toISOString().split('T')[0]}`); };
  const downloadJson = (data: any, filename: string) => { const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${filename}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); };
  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { try { const content = event.target?.result as string; const data = JSON.parse(content); if (!Array.isArray(data) && !data.watchlist && !data.settings && !data.user) { throw new Error('Invalid backup file format'); } let incomingShows = Array.isArray(data) ? data : (data.watchlist || []); let incomingLists = Array.isArray(data) ? [] : (data.subscribedLists || []); const currentShowIds = new Set(watchlist.map(s => s.id)); const currentListIds = new Set(subscribedLists.map(l => l.id)); const newShows = incomingShows.filter((s: any) => !currentShowIds.has(s.id)); const newLists = incomingLists.filter((l: any) => !currentListIds.has(l.id)); const matchCount = incomingShows.length - newShows.length; setMergePreview({ matchCount, newShows, newLists, totalNew: newShows.length + newLists.length, fullData: data }); } catch (err) { console.error(err); alert('Failed to import: Invalid file format.'); } }; reader.readAsText(file); if (fileInputRef.current) fileInputRef.current.value = ''; };
  const confirmMerge = () => { if (mergePreview) { setIsProcessingImport(true); if (mergePreview.newShows.length > 0) batchAddShows(mergePreview.newShows); if (mergePreview.newLists.length > 0) batchSubscribe(mergePreview.newLists); setTimeout(() => { setIsProcessingImport(false); setMergePreview(null); onClose(); }, 1500); } };
  const saveKey = () => { if (keyInput.trim()) { updateUserKey(keyInput.trim()); setIsEditingKey(false); } };
  const handleScan = (result: any) => { if (result && result[0]?.rawValue) { setShowScanner(false); setIsProcessingImport(true); processSyncPayload(result[0].rawValue); } };
  const handleForceReload = async () => { if (confirm('This will wipe the local cache and re-download all data from the server. This may take a moment. Continue?')) { onClose(); await reloadAccount(); } };

  // --- Trakt Logic ---
  const handleTraktConnect = async () => {
      if (!traktClientId) { alert("Please enter a Client ID"); return; }
      localStorage.setItem('trakt_client_id', traktClientId);
      try {
          const codeData = await traktAuth(traktClientId, ''); 
          setTraktCode(codeData);
          
          // Start Polling
          setIsTraktPolling(true);
          const interval = setInterval(async () => {
              const pollRes = await traktPoll(codeData.device_code, traktClientId, '');
              if (pollRes.status === 200) {
                  clearInterval(interval);
                  setIsTraktPolling(false);
                  setTraktCode(null);
                  await saveTraktToken(pollRes.data);
              } else if (pollRes.status === 410 || pollRes.status === 418 || pollRes.status === 409) {
                  clearInterval(interval);
                  setIsTraktPolling(false);
                  setTraktCode(null);
                  if (pollRes.status !== 409) alert("Trakt connection timed out.");
              }
          }, codeData.interval * 1000);
      } catch (e) {
          console.error(e);
          alert("Failed to connect to Trakt.");
      }
  };

  const handleSyncTrakt = async () => {
      setIsTraktSyncing(true);
      await syncTraktData();
      setIsTraktSyncing(false);
  };

  // ... (Render Overlays) ...
  if (mergePreview) { return (<div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"><div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-fade-in relative overflow-hidden"><div className="text-center mb-6"><Merge className="w-12 h-12 text-indigo-400 mx-auto mb-3" /><h2 className="text-xl font-bold text-white mb-2">Merge Content</h2><p className="text-zinc-400 text-sm">Found {mergePreview.totalNew} new items.</p></div><div className="flex gap-3"><button onClick={() => setMergePreview(null)} className="flex-1 py-3 rounded-lg font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">Cancel</button><button onClick={confirmMerge} className="flex-1 py-3 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white">Import</button></div></div></div>); }
  if (showScanner) { return (<div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in"><div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 left-0 right-0 z-10 backdrop-blur-md"><h2 className="text-white font-bold">Scan QR</h2><button onClick={() => setShowScanner(false)} className="p-2 bg-white/10 rounded-full text-white"><X className="w-6 h-6" /></button></div><div className="flex-1 flex items-center justify-center"><Scanner onScan={handleScan} /></div></div>); }
  if (showQr) { const payload = getSyncPayload(); return (<div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in" onClick={() => setShowQr(false)}><div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}><h3 className="text-2xl font-bold text-slate-900 mb-6">Scan on Mobile</h3><QRCode value={payload} size={240} /><button onClick={() => setShowQr(false)} className="w-full mt-6 py-3 rounded-xl bg-slate-900 text-white font-bold">Done</button></div></div>); }
  if (isProcessingImport) { return (<div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-xl"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" /><h2 className="text-xl font-bold text-white">Syncing Data...</h2></div>); }
  if (showExportWarning) { return (<div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md"><div className="bg-zinc-900 border-2 border-red-500/50 rounded-3xl shadow-2xl w-full max-w-md p-6 animate-fade-in"><div className="flex items-center gap-3 mb-4 text-red-400"><AlertTriangle className="w-8 h-8" /><h2 className="text-2xl font-bold text-white">Security Warning</h2></div><p className="text-zinc-300 mb-4">This file contains your <strong>Private API Key</strong>. Do not share it.</p><div className="flex items-start gap-3 mb-6 p-3 bg-zinc-800/50 rounded-lg cursor-pointer" onClick={() => setHasAcknowledgedRisk(!hasAcknowledgedRisk)}><div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${hasAcknowledgedRisk ? 'bg-red-600 border-red-500' : 'border-zinc-500'}`}>{hasAcknowledgedRisk && <Check className="w-3.5 h-3.5 text-white" />}</div><p className="text-sm text-zinc-400 select-none">I understand the risks.</p></div><div className="flex gap-3"><button onClick={() => { setShowExportWarning(false); setHasAcknowledgedRisk(false); }} className="flex-1 py-3 rounded-lg font-medium text-zinc-300 hover:bg-zinc-800">Cancel</button><button onClick={handleExportProfile} disabled={!hasAcknowledgedRisk} className="flex-1 py-3 rounded-lg font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50">Download</button></div></div></div>); }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex border-b border-zinc-800 bg-zinc-900/30">
            {[{ id: 'general', icon: UserIcon, label: 'General' }, { id: 'appearance', icon: Palette, label: 'Appearance' }, { id: 'integrations', icon: LinkIcon, label: 'Connect' }, { id: 'data', icon: Database, label: 'Data' }].map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`flex-1 py-4 flex flex-col items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors relative ${activeTab === tab.id ? 'text-indigo-400 bg-indigo-500/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}><tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-400' : 'text-zinc-500'}`} />{tab.label}{activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}</button>))}
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-zinc-950/30">
            {activeTab === 'general' && (<div className="space-y-6 animate-fade-in"><section><div className="flex items-center gap-3 mb-3"><div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 h-fit"><Key className="w-6 h-6" /></div><div><h3 className="text-white font-medium">TMDB Access Token</h3><p className="text-zinc-400 text-sm">Required for API access.</p></div></div><div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">{isEditingKey ? (<div className="flex gap-2"><input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} className="flex-1 bg-black/50 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="TMDB Token" /><button onClick={saveKey} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded transition-colors"><Check className="w-4 h-4" /></button></div>) : (<div className="flex justify-between items-center"><div className="text-zinc-400 text-sm font-mono truncate max-w-[200px]">{user?.tmdbKey ? '••••••••••••••••' : 'Not Set'}</div><button onClick={() => { setKeyInput(user?.tmdbKey || ''); setIsEditingKey(true); }} className="text-xs text-indigo-400 hover:text-white underline">Change</button></div>)}</div></section><div className="h-px bg-zinc-800/50" /><section><div className="flex items-center gap-3 mb-3"><div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 h-fit"><Globe className="w-6 h-6" /></div><div><h3 className="text-white font-medium">Region & Time</h3><p className="text-zinc-400 text-sm">Localize air dates.</p></div></div>{timezones.length > 0 ? (<div className="relative"><select value={settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone} onChange={(e) => updateSettings({ timezone: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer">{timezones.map((tz: string) => (<option key={tz} value={tz}>{tz}</option>))}</select><div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500"><ArrowDownToLine className="w-4 h-4" /></div></div>) : (<p className="text-xs text-zinc-500 italic">Not supported in this browser.</p>)}</section><div className="h-px bg-zinc-800/50" /><section><div className="flex items-center gap-3 mb-3"><div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 h-fit"><Smartphone className="w-6 h-6" /></div><div><h3 className="text-white font-medium">Device Sync</h3><p className="text-zinc-400 text-sm">Transfer data instantly.</p></div></div><div className="grid grid-cols-2 gap-3"><button onClick={() => setShowQr(true)} className="bg-zinc-200 hover:bg-white text-zinc-900 font-bold py-3 px-2 rounded-lg flex flex-col items-center justify-center gap-2 transition-all text-xs text-center border border-transparent"><QrCode className="w-5 h-5" /> <span>Show QR Code</span></button><button onClick={() => setShowScanner(true)} className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 px-2 rounded-lg flex flex-col items-center justify-center gap-2 transition-all text-xs text-center border border-zinc-800"><Scan className="w-5 h-5" /> <span>Scan to Sync</span></button></div></section></div>)}
            {activeTab === 'appearance' && (
                <div className="space-y-6 animate-fade-in">
                    <section>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Calendar View</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <button 
                                onClick={() => updateSettings({ viewMode: 'grid' })}
                                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${settings.viewMode === 'grid' || !settings.viewMode ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                            >
                                <LayoutGrid className="w-5 h-5" />
                                <span className="text-[10px] font-bold">Grid</span>
                            </button>
                            <button 
                                onClick={() => updateSettings({ viewMode: 'list' })}
                                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${settings.viewMode === 'list' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                            >
                                <List className="w-5 h-5" />
                                <span className="text-[10px] font-bold">List</span>
                            </button>
                            <button 
                                onClick={() => updateSettings({ viewMode: 'stack' })}
                                className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${settings.viewMode === 'stack' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                            >
                                <Layers className="w-5 h-5" />
                                <span className="text-[10px] font-bold">Feed</span>
                            </button>
                        </div>
                    </section>
                    <div className="h-px bg-zinc-800/50" />
                    <section><h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Accent Theme</h3><div className="flex flex-wrap gap-3">{Object.keys(THEMES).map((themeKey) => { const colors = THEMES[themeKey]; const isActive = (settings.theme || 'default') === themeKey; return (<button key={themeKey} onClick={() => updateSettings({ theme: themeKey })} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`} style={{ backgroundColor: `rgb(${colors['500']})` }} title={themeKey}>{isActive && <Check className="w-5 h-5 text-white drop-shadow-md" />}</button>); })}<button onClick={() => updateSettings({ theme: 'custom' })} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 ${settings.theme === 'custom' ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900 scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'}`} title="Custom Color">{settings.theme === 'custom' ? <Check className="w-5 h-5 text-white drop-shadow-md" /> : <Pipette className="w-4 h-4 text-white" />}</button></div>{settings.theme === 'custom' && (<div className="mt-4 bg-zinc-900 border border-zinc-800 p-3 rounded-xl flex items-center gap-3 animate-fade-in"><input type="color" value={customColor} onChange={(e) => handleCustomColorChange(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-none p-0" /><input type="text" value={customColor} onChange={(e) => handleCustomColorChange(e.target.value)} className="bg-transparent text-sm text-white font-mono uppercase focus:outline-none w-20" maxLength={7} /><div className="ml-auto text-xs text-zinc-500">Pick any color</div></div>)}</section><div className="h-px bg-zinc-800/50" /><section className="space-y-4"><h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Display & Layout</h3><div className="flex items-center justify-between"><div className="flex gap-3"><div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">{settings.calendarPosterFillMode === 'contain' ? <ImageIcon className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}</div><div><h4 className="text-white text-sm font-medium">Image Fit</h4><p className="text-zinc-500 text-xs">Full cover or preserve aspect.</p></div></div><div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1"><button onClick={() => updateSettings({ calendarPosterFillMode: 'cover' })} className={`p-1.5 rounded ${settings.calendarPosterFillMode !== 'contain' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500'}`}><Maximize className="w-4 h-4" /></button><button onClick={() => updateSettings({ calendarPosterFillMode: 'contain' })} className={`p-1.5 rounded ${settings.calendarPosterFillMode === 'contain' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500'}`}><ImageIcon className="w-4 h-4" /></button></div></div><div className="space-y-3">{[{ key: 'useSeason1Art', label: 'Use Season 1 Art', desc: 'Avoid spoiler posters', icon: Sparkles }, { key: 'cleanGrid', label: 'Clean Grid Mode', desc: 'Hide text labels', icon: SquareDashedBottom }, { key: 'hideSpoilers', label: 'Hide Spoilers', desc: 'Blur images/text', icon: EyeOff }, { key: 'hideTheatrical', label: 'Hide Cinema', desc: 'Only stream dates', icon: Ticket }].map((item) => (<div key={item.key} className="flex items-center justify-between"><div className="flex gap-3"><div className="p-2 rounded-lg bg-zinc-800 text-zinc-400"><item.icon className="w-5 h-5" /></div><div><h4 className="text-white text-sm font-medium">{item.label}</h4><p className="text-zinc-500 text-xs">{item.desc}</p></div></div><button onClick={() => updateSettings({ [item.key]: !settings[item.key as keyof typeof settings] })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings[item.key as keyof typeof settings] ? 'bg-indigo-600' : 'bg-zinc-800'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings[item.key as keyof typeof settings] ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>))}</div></section></div>
            )}

            {/* --- INTEGRATIONS TAB (Trakt) --- */}
            {activeTab === 'integrations' && (
                <div className="space-y-6 animate-fade-in">
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-red-600/10 text-red-500 h-fit">
                                <LinkIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium">Trakt.tv</h3>
                                <p className="text-zinc-400 text-sm">Sync your history & ratings.</p>
                            </div>
                        </div>

                        {user?.traktToken ? (
                            // CONNECTED STATE
                            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wide border border-emerald-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 mb-6">
                                    {user.traktProfile?.images?.avatar?.full ? (
                                        <img src={user.traktProfile.images.avatar.full} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-red-500/30" />
                                    ) : (
                                        <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-red-900/50">
                                            {user.traktProfile?.username?.charAt(0).toUpperCase() || 'T'}
                                        </div>
                                    )}
                                    <div>
                                        <h4 className="text-white font-bold text-lg">{user.traktProfile?.name || user.traktProfile?.username || 'Trakt User'}</h4>
                                        <p className="text-zinc-500 text-xs">@{user.traktProfile?.username || 'unknown'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={handleSyncTrakt}
                                        disabled={isTraktSyncing}
                                        className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isTraktSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                        {isTraktSyncing ? 'Syncing...' : 'Sync Now'}
                                    </button>
                                    <button 
                                        onClick={disconnectTrakt}
                                        className="py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-2"
                                    >
                                        <LogOut className="w-3 h-3" /> Disconnect
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // DISCONNECTED STATE
                            !traktCode ? (
                                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                                    <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Trakt Client ID</label>
                                    <input 
                                        type="password"
                                        value={traktClientId}
                                        onChange={(e) => setTraktClientId(e.target.value)}
                                        placeholder="Enter Client ID from Trakt Dashboard"
                                        className="w-full bg-black/40 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 mb-3"
                                    />
                                    <button 
                                        onClick={handleTraktConnect}
                                        disabled={!traktClientId || isTraktPolling}
                                        className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isTraktPolling ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect Trakt'}
                                    </button>
                                    <div className="mt-3 text-[10px] text-zinc-500">
                                        <p>Don't have an ID? Create an app at <a href="https://trakt.tv/oauth/applications" target="_blank" className="text-red-400 hover:underline">trakt.tv</a> with Redirect URI: <code className="bg-zinc-800 px-1 py-0.5 rounded">urn:ietf:wg:oauth:2.0:oob</code></p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl text-center">
                                    <h4 className="text-white font-bold mb-2">Authorize this device</h4>
                                    <p className="text-zinc-400 text-sm mb-4">Visit the URL and enter the code:</p>
                                    
                                    <div className="bg-black/50 border border-zinc-700 rounded-lg p-3 mb-4">
                                        <div className="text-2xl font-mono text-white tracking-widest font-bold mb-1">{traktCode.user_code}</div>
                                    </div>
                                    
                                    <a 
                                        href={traktCode.verification_url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 font-bold text-sm mb-6 hover:underline"
                                    >
                                        {traktCode.verification_url} <ExternalLink className="w-3 h-3" />
                                    </a>

                                    <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs animate-pulse">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Waiting for authorization...
                                    </div>
                                </div>
                            )
                        )}
                    </section>
                </div>
            )}

            {/* --- DATA TAB (Existing) --- */}
            {activeTab === 'data' && (<div className="space-y-6 animate-fade-in"><section><div className="flex items-center gap-2 mb-3 text-emerald-400"><Database className="w-5 h-5" /><h3 className="font-bold text-sm uppercase tracking-wide">Troubleshooting</h3></div><div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl"><button onClick={handleForceReload} className="w-full h-10 bg-zinc-800 hover:bg-emerald-900/30 hover:text-emerald-400 hover:border-emerald-500/30 rounded-lg font-medium text-xs text-zinc-300 flex items-center justify-center gap-2 border border-zinc-700/50 transition-all mb-2"><RefreshCw className="w-3 h-3" /> Force Full Resync</button><p className="text-[10px] text-zinc-500 text-center">Use if data is missing or out of sync. Clears local cache.</p></div></section><div className="h-px bg-zinc-800/50" /><section><div className="flex items-center gap-2 mb-3 text-indigo-400"><HardDrive className="w-5 h-5" /><h3 className="font-bold text-sm uppercase tracking-wide">Backup & Restore</h3></div><div className="space-y-3"><div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl"><h4 className="text-white text-sm font-bold mb-2 flex items-center gap-2"><FileJson className="w-4 h-4" /> Full Profile</h4><div className="grid grid-cols-1 gap-2"><button onMouseDown={startHold} onMouseUp={stopHold} onMouseLeave={stopHold} onTouchStart={startHold} onTouchEnd={stopHold} className="relative w-full h-10 bg-zinc-800 rounded-lg font-medium text-xs text-zinc-200 overflow-hidden select-none border border-zinc-700/50"><div className="absolute inset-y-0 left-0 bg-indigo-600 transition-all duration-75 ease-linear" style={{ width: `${holdProgress}%` }} /><div className="absolute inset-0 flex items-center justify-center gap-2 z-10"><Download className="w-3 h-3" /> {isHolding ? 'Keep holding...' : 'Hold to Export (Includes Keys)'}</div></button><button onClick={handleImportClick} className="w-full h-10 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium text-xs text-zinc-300 flex items-center justify-center gap-2 border border-zinc-700/50"><ArrowDownToLine className="w-3 h-3" /> Import & Merge Backup</button></div></div><div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl"><h4 className="text-white text-sm font-bold mb-2 flex items-center gap-2"><ListVideo className="w-4 h-4" /> Watchlist Only</h4><div className="grid grid-cols-2 gap-2"><button onClick={handleExportWatchlist} className="h-9 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50 rounded-lg font-medium transition-colors text-xs flex items-center justify-center gap-2"><Download className="w-3 h-3" /> Export List</button><button onClick={handleImportClick} className="h-9 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50 rounded-lg font-medium transition-colors text-xs flex items-center justify-center gap-2"><Upload className="w-3 h-3" /> Import List</button></div></div></div></section></div>)}

            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;