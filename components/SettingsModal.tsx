import React, { useRef, useState, useEffect } from 'react';
import { X, Eye, EyeOff, Ticket, MonitorPlay, Download, Upload, HardDrive, Sparkles, LayoutList, AlignJustify, Key, Check, ListVideo, AlertTriangle, ShieldAlert, FileJson, RefreshCw, Loader2, Hourglass, Expand, Shrink, QrCode, Smartphone, Merge, ArrowDownToLine, Image as ImageIcon, Maximize, Scan, SquareDashedBottom, Database, Globe, Palette, User as UserIcon, Monitor, Pipette, Link as LinkIcon, ExternalLink, Copy, LogOut, LayoutGrid, List, Layers, PanelBottom, Pill, Filter, Ban, FileText, Lock, Type, Film, Moon } from 'lucide-react';
import { useAppContext, THEMES } from '../context/AppContext';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'general' | 'design' | 'integrations' | 'data';

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
  
  // Update local custom color state when settings change
  useEffect(() => { if (settings.customThemeColor) { setCustomColor(settings.customThemeColor); } }, [settings.customThemeColor]);
  
  // Apply custom color debounced
  const handleCustomColorChange = (hex: string) => { setCustomColor(hex); updateSettings({ customThemeColor: hex, theme: 'custom' }); };
  
  const toggleSpoiler = (key: 'images' | 'overview' | 'title' | 'includeMovies') => {
      const newConfig = { ...settings.spoilerConfig, [key]: !settings.spoilerConfig[key] };
      updateSettings({ spoilerConfig: newConfig });
  };

  if (!isOpen && !isProcessingImport) return null;
  // ... (Helpers: handleExportProfile, handleExportWatchlist, downloadJson, handleImportClick, handleFileChange, confirmMerge, saveKey, handleScan, handleForceReload) ...
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
            {[{ id: 'general', icon: UserIcon, label: 'General' }, { id: 'design', icon: Palette, label: 'Design' }, { id: 'integrations', icon: LinkIcon, label: 'Connect' }, { id: 'data', icon: Database, label: 'Data' }].map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)} className={`flex-1 py-4 flex flex-col items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors relative ${activeTab === tab.id ? 'text-indigo-400 bg-indigo-500/5' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}><tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-400' : 'text-zinc-500'}`} />{tab.label}{activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}</button>))}
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-zinc-950/30">
            {/* ... (ActiveTab === 'general' logic unchanged) ... */}
            {activeTab === 'general' && (
                <div className="space-y-6 animate-fade-in">
                    <section>
                        <div className="flex items-center gap-3 mb-3"><div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 h-fit"><Key className="w-6 h-6" /></div><div><h3 className="text-white font-medium">TMDB Access Token</h3><p className="text-zinc-400 text-sm">Required for API access.</p></div></div>
                        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg">{isEditingKey ? (<div className="flex gap-2"><input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} className="flex-1 bg-black/50 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="TMDB Token" /><button onClick={saveKey} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded transition-colors"><Check className="w-4 h-4" /></button></div>) : (<div className="flex justify-between items-center"><div className="text-zinc-400 text-sm font-mono truncate max-w-[200px]">{user?.tmdbKey ? '••••••••••••••••' : 'Not Set'}</div><button onClick={() => { setKeyInput(user?.tmdbKey || ''); setIsEditingKey(true); }} className="text-xs text-indigo-400 hover:text-white underline">Change</button></div>)}</div>
                    </section>
                    <div className="h-px bg-zinc-800/50" />
                    <section>
                        <div className="flex items-center gap-3 mb-3"><div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 h-fit"><Globe className="w-6 h-6" /></div><div><h3 className="text-white font-medium">Region & Time</h3><p className="text-zinc-400 text-sm">Localize air dates.</p></div></div>
                        {timezones.length > 0 ? (<div className="relative"><select value={settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone} onChange={(e) => updateSettings({ timezone: e.target.value })} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer">{timezones.map((tz: string) => (<option key={tz} value={tz}>{tz}</option>))}</select><div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500"><ArrowDownToLine className="w-4 h-4" /></div></div>) : (<p className="text-xs text-zinc-500 italic">Not supported in this browser.</p>)}
                    </section>
                    {!user?.isCloud && (
                        <>
                            <div className="h-px bg-zinc-800/50" />
                            <section>
                                <div className="flex items-center gap-3 mb-3"><div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 h-fit"><Smartphone className="w-6 h-6" /></div><div><h3 className="text-white font-medium">Device Sync</h3><p className="text-zinc-400 text-sm">Transfer data instantly.</p></div></div>
                                <button onClick={() => setShowQr(true)} className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold flex items-center justify-center gap-2 border border-white/5"><QrCode className="w-5 h-5" /> Show Transfer Code</button>
                            </section>
                        </>
                    )}
                </div>
            )}
            
            {activeTab === 'design' && (
                <div className="space-y-6 animate-fade-in">
                    <section>
                        <h3 className="text-white font-bold mb-3">App Design</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => updateSettings({ appDesign: 'default' })} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${settings.appDesign === 'default' ? 'bg-zinc-800 border-indigo-500' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}>
                                <LayoutList className="w-6 h-6 text-zinc-400" />
                                <span className="text-xs font-bold text-zinc-300">Standard</span>
                            </button>
                            <button onClick={() => updateSettings({ appDesign: 'blackout' })} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all overflow-hidden relative ${settings.appDesign === 'blackout' ? 'bg-black border-indigo-500' : 'bg-black border-zinc-800 hover:border-zinc-700'}`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-pink-900/20 opacity-50" />
                                <Moon className="w-6 h-6 text-indigo-400 relative z-10" />
                                <span className="text-xs font-bold text-white relative z-10">Blackout</span>
                            </button>
                        </div>
                    </section>

                    <div className="h-px bg-zinc-800/50" />

                    <section>
                        <h3 className="text-white font-bold mb-3">Accent Color</h3>
                        <div className="grid grid-cols-7 gap-2">
                            {Object.keys(THEMES).map((themeKey) => (
                                <button key={themeKey} onClick={() => updateSettings({ theme: themeKey, customThemeColor: undefined })} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.theme === themeKey ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: `rgb(${THEMES[themeKey]['500']})` }} />
                            ))}
                            <div className="relative group">
                                <button className={`w-8 h-8 rounded-full border-2 flex items-center justify-center overflow-hidden ${settings.theme === 'custom' ? 'border-white' : 'border-zinc-700'}`} style={{ backgroundColor: settings.theme === 'custom' ? customColor : 'transparent' }}>
                                    <Pipette className="w-4 h-4 text-zinc-400" />
                                </button>
                                <input type="color" value={customColor} onChange={(e) => handleCustomColorChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-zinc-800/50" />

                    <section>
                        <h3 className="text-white font-bold mb-3">Card Appearance</h3>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                                <div className="flex items-center gap-3"><div className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><ImageIcon className="w-4 h-4" /></div><span className="text-sm font-medium text-zinc-200">Image Fit</span></div>
                                <div className="flex bg-zinc-800 p-0.5 rounded-lg">
                                    <button onClick={() => updateSettings({ calendarPosterFillMode: 'cover' })} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${settings.calendarPosterFillMode === 'cover' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400'}`}>Cover</button>
                                    <button onClick={() => updateSettings({ calendarPosterFillMode: 'contain' })} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${settings.calendarPosterFillMode === 'contain' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400'}`}>Contain</button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                                <div className="flex items-center gap-3"><div className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><MonitorPlay className="w-4 h-4" /></div><span className="text-sm font-medium text-zinc-200">Use Season 1 Art</span></div>
                                <button onClick={() => updateSettings({ useSeason1Art: !settings.useSeason1Art })} className={`w-10 h-6 rounded-full transition-colors relative ${settings.useSeason1Art ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.useSeason1Art ? 'translate-x-4' : ''}`} /></button>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                                <div className="flex items-center gap-3"><div className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><SquareDashedBottom className="w-4 h-4" /></div><span className="text-sm font-medium text-zinc-200">Clean Grid</span></div>
                                <button onClick={() => updateSettings({ cleanGrid: !settings.cleanGrid })} className={`w-10 h-6 rounded-full transition-colors relative ${settings.cleanGrid ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.cleanGrid ? 'translate-x-4' : ''}`} /></button>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                                <div className="flex items-center gap-3"><div className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><Expand className="w-4 h-4" /></div><span className="text-sm font-medium text-zinc-200">Compact Calendar</span></div>
                                <button onClick={() => updateSettings({ compactCalendar: !settings.compactCalendar })} className={`w-10 h-6 rounded-full transition-colors relative ${settings.compactCalendar ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.compactCalendar ? 'translate-x-4' : ''}`} /></button>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-zinc-800/50" />

                    <section>
                        <h3 className="text-white font-bold mb-3">Content & Behavior</h3>
                        <div className="space-y-2">
                            {/* Spoiler Protection Granular Controls */}
                            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><EyeOff className="w-4 h-4" /></div>
                                    <div>
                                        <h4 className="text-sm font-medium text-white">Spoiler Protection</h4>
                                        <p className="text-[10px] text-zinc-500">Block content on unwatched episodes.</p>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-zinc-300 flex items-center gap-2"><ImageIcon className="w-3 h-3 text-zinc-500" /> Blur Thumbnails</label>
                                        <button onClick={() => toggleSpoiler('images')} className={`w-8 h-5 rounded-full transition-colors relative ${settings.spoilerConfig.images ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.spoilerConfig.images ? 'translate-x-3' : ''}`} /></button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-zinc-300 flex items-center gap-2"><FileText className="w-3 h-3 text-zinc-500" /> Hide Description</label>
                                        <button onClick={() => toggleSpoiler('overview')} className={`w-8 h-5 rounded-full transition-colors relative ${settings.spoilerConfig.overview ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.spoilerConfig.overview ? 'translate-x-3' : ''}`} /></button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-zinc-300 flex items-center gap-2"><Type className="w-3 h-3 text-zinc-500" /> Hide Episode Titles</label>
                                        <button onClick={() => toggleSpoiler('title')} className={`w-8 h-5 rounded-full transition-colors relative ${settings.spoilerConfig.title ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.spoilerConfig.title ? 'translate-x-3' : ''}`} /></button>
                                    </div>
                                    
                                    <div className="h-px bg-zinc-800 my-2" />
                                    
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-zinc-300 flex items-center gap-2"><Film className="w-3 h-3 text-zinc-500" /> Include Movies</label>
                                        <button onClick={() => toggleSpoiler('includeMovies')} className={`w-8 h-5 rounded-full transition-colors relative ${settings.spoilerConfig.includeMovies ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${settings.spoilerConfig.includeMovies ? 'translate-x-3' : ''}`} /></button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                                <div className="flex items-center gap-3"><div className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><Ban className="w-4 h-4" /></div><span className="text-sm font-medium text-zinc-200">Ignore Specials (S0)</span></div>
                                <button onClick={() => updateSettings({ ignoreSpecials: !settings.ignoreSpecials })} className={`w-10 h-6 rounded-full transition-colors relative ${settings.ignoreSpecials ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.ignoreSpecials ? 'translate-x-4' : ''}`} /></button>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                                <div className="flex items-center gap-3"><div className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><Sparkles className="w-4 h-4" /></div><span className="text-sm font-medium text-zinc-200">Recommendations</span></div>
                                <button onClick={() => updateSettings({ recommendationsEnabled: !settings.recommendationsEnabled })} className={`w-10 h-6 rounded-full transition-colors relative ${settings.recommendationsEnabled ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.recommendationsEnabled ? 'translate-x-4' : ''}`} /></button>
                            </div>
                        </div>
                    </section>
                </div>
            )}
            
            {/* ... (Other tabs unchanged) ... */}
            {activeTab === 'integrations' && (
                <div className="space-y-6 animate-fade-in">
                    <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-center">
                        <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-900/20">
                            <span className="text-white font-bold text-2xl">t</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Trakt.tv</h3>
                        <p className="text-sm text-zinc-400 mb-6">Sync your watched history and ratings.</p>
                        
                        {user?.traktToken ? (
                            <div className="space-y-4">
                                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
                                    {user.traktProfile?.images?.avatar?.full ? (
                                        <img src={user.traktProfile.images.avatar.full} alt="Avatar" className="w-12 h-12 rounded-full" />
                                    ) : (
                                        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500"><UserIcon className="w-6 h-6" /></div>
                                    )}
                                    <div className="text-left">
                                        <div className="text-white font-bold">{user.traktProfile?.name || user.traktProfile?.username || 'Trakt User'}</div>
                                        <div className="text-xs text-zinc-500">Connected</div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={handleSyncTrakt} disabled={isTraktSyncing} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                                        {isTraktSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sync Now
                                    </button>
                                    <button onClick={disconnectTrakt} className="p-3 bg-red-600/10 text-red-400 hover:bg-red-600/20 rounded-xl font-bold">
                                        Disconnect
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {!traktCode ? (
                                    <>
                                        <input 
                                            type="text" 
                                            value={traktClientId} 
                                            onChange={e => setTraktClientId(e.target.value)} 
                                            placeholder="Trakt Client ID" 
                                            className="w-full bg-black/30 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 focus:outline-none" 
                                        />
                                        <button onClick={handleTraktConnect} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors">
                                            Connect Account
                                        </button>
                                        <p className="text-[10px] text-zinc-500">
                                            Requires a Trakt API App. <a href="https://trakt.tv/oauth/applications" target="_blank" rel="noreferrer" className="text-zinc-400 underline">Get ID</a>
                                        </p>
                                    </>
                                ) : (
                                    <div className="bg-zinc-800 p-4 rounded-xl animate-fade-in">
                                        <p className="text-sm text-zinc-300 mb-2">Enter this code at <span className="text-indigo-400 select-all">{traktCode.verification_url}</span>:</p>
                                        <div className="text-3xl font-mono font-bold text-white tracking-widest my-4 select-all">{traktCode.user_code}</div>
                                        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Waiting for authentication...
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            )}
            
            {activeTab === 'data' && (
                <div className="space-y-6 animate-fade-in">
                    <section>
                         <div className="flex items-center gap-3 mb-3"><div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 h-fit"><Database className="w-6 h-6" /></div><div><h3 className="text-white font-medium">Backup & Restore</h3><p className="text-zinc-400 text-sm">Save your data locally.</p></div></div>
                         <div className="grid grid-cols-2 gap-3">
                             <button onClick={() => setShowExportWarning(true)} className="py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm"><Download className="w-4 h-4" /> Export Profile</button>
                             <button onClick={handleImportClick} className="py-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-sm"><Upload className="w-4 h-4" /> Import File</button>
                             <button onClick={handleExportWatchlist} className="col-span-2 py-2 bg-zinc-900/50 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-medium">Export Watchlist Only (JSON)</button>
                         </div>
                    </section>
                    
                    <div className="h-px bg-zinc-800/50" />
                    
                    <section>
                         <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Danger Zone</h3>
                         <button onClick={handleForceReload} className="w-full py-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-colors">
                             <RefreshCw className="w-4 h-4" /> Force Reload All Data
                         </button>
                         <p className="text-[10px] text-zinc-600 mt-2 text-center">This will clear your local cache and re-fetch everything from TMDB/Supabase.</p>
                    </section>
                </div>
            )}
        </div>
        
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
      </div>
    </div>
  );
};

export default SettingsModal;