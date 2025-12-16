import React, { useRef, useState, useEffect } from 'react';
import { X, Eye, EyeOff, Ticket, MonitorPlay, Download, Upload, HardDrive, Sparkles, LayoutList, AlignJustify, Key, Check, ListVideo, AlertTriangle, ShieldAlert, FileJson, RefreshCw, Loader2, Hourglass, Expand, Shrink, QrCode, Smartphone, Merge, ArrowDownToLine, Image as ImageIcon, Maximize, Scan, SquareDashedBottom, Database, Globe, Palette, User as UserIcon, Monitor, Pipette, Link as LinkIcon, ExternalLink, Copy, LogOut, LayoutGrid, List, Layers, PanelBottom, Pill, Filter, Ban, FileText, Lock, Type, Film, Moon, Bell } from 'lucide-react';
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] relative" 
        onClick={e => e.stopPropagation()}
      >
        {/* Cinematic Header */}
        <div className="relative h-28 shrink-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 to-purple-900/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
            
            <div className="absolute bottom-4 left-6 z-10">
                <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">Settings</h2>
                <p className="text-indigo-200/80 text-sm font-medium">Manage preferences & sync</p>
            </div>

            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-white/10 backdrop-blur-md rounded-full text-white transition-colors border border-white/5 z-20"
            >
               <X className="w-5 h-5" />
            </button>
        </div>

        {/* Floating Pill Tabs */}
        <div className="px-6 pb-2 pt-2 border-b border-white/5 bg-zinc-950 sticky top-0 z-20">
            <div className="flex bg-white/5 p-1 rounded-full overflow-x-auto hide-scrollbar">
                {[{ id: 'general', label: 'General' }, { id: 'design', label: 'Appearance' }, { id: 'integrations', label: 'Integrations' }, { id: 'data', label: 'Data' }].map((tab) => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as Tab)} 
                        className={`
                            flex-1 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                            ${activeTab === tab.id 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'}
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 bg-zinc-950">
            
            {activeTab === 'general' && (
                <div className="space-y-6 animate-fade-in">
                    <section className="space-y-3">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Account & Sync</h4>
                        
                        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400"><Key className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-white font-bold text-sm">TMDB Access Token</h3>
                                    <p className="text-zinc-500 text-xs">API Key for metadata.</p>
                                </div>
                            </div>
                            {isEditingKey ? (
                                <div className="flex gap-2">
                                    <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} className="flex-1 bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="TMDB Token" />
                                    <button onClick={saveKey} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg transition-colors"><Check className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center bg-black/30 p-2.5 rounded-lg border border-white/5">
                                    <div className="text-zinc-400 text-sm font-mono truncate max-w-[200px]">{user?.tmdbKey ? '••••••••••••••••' : 'Not Set'}</div>
                                    <button onClick={() => { setKeyInput(user?.tmdbKey || ''); setIsEditingKey(true); }} className="text-xs font-bold text-indigo-400 hover:text-indigo-300">Edit</button>
                                </div>
                            )}
                        </div>

                        {!user?.isCloud && (
                            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400"><Smartphone className="w-5 h-5" /></div>
                                    <div>
                                        <h3 className="text-white font-bold text-sm">Transfer to Mobile</h3>
                                        <p className="text-zinc-500 text-xs">Sync via QR Code</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowQr(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white"><QrCode className="w-5 h-5" /></button>
                            </div>
                        )}
                    </section>

                    <section className="space-y-3">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Localization</h4>
                        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400"><Globe className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-white font-bold text-sm">Region & Timezone</h3>
                                    <p className="text-zinc-500 text-xs">Localize air dates.</p>
                                </div>
                            </div>
                            {timezones.length > 0 ? (
                                <div className="relative">
                                    <select value={settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone} onChange={(e) => updateSettings({ timezone: e.target.value })} className="w-full bg-black/30 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer">
                                        {timezones.map((tz: string) => (<option key={tz} value={tz}>{tz}</option>))}
                                    </select>
                                    <ArrowDownToLine className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 w-4 h-4" />
                                </div>
                            ) : (
                                <p className="text-xs text-zinc-500 italic">Not supported in this browser.</p>
                            )}
                        </div>
                    </section>
                </div>
            )}
            
            {activeTab === 'design' && (
                <div className="space-y-6 animate-fade-in">
                    <section>
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-3">Themes</h4>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button onClick={() => updateSettings({ appDesign: 'default' })} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all relative overflow-hidden ${settings.appDesign === 'default' ? 'bg-zinc-800 border-indigo-500 shadow-lg shadow-indigo-500/10' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}>
                                <LayoutList className="w-6 h-6 text-zinc-400 relative z-10" />
                                <span className="text-xs font-bold text-zinc-300 relative z-10">Standard</span>
                            </button>
                            <button onClick={() => updateSettings({ appDesign: 'blackout' })} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all overflow-hidden relative ${settings.appDesign === 'blackout' ? 'bg-black border-indigo-500 shadow-lg shadow-indigo-500/10' : 'bg-black border-zinc-800 hover:border-zinc-700'}`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-pink-900/20 opacity-50" />
                                <Moon className="w-6 h-6 text-indigo-400 relative z-10" />
                                <span className="text-xs font-bold text-white relative z-10">Blackout</span>
                            </button>
                        </div>

                        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-sm font-bold text-white">Accent Color</h4>
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: customColor }} />
                            </div>
                            <div className="flex justify-between items-center">
                                {Object.keys(THEMES).map((themeKey) => (
                                    <button key={themeKey} onClick={() => updateSettings({ theme: themeKey, customThemeColor: undefined })} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${settings.theme === themeKey ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`} style={{ backgroundColor: `rgb(${THEMES[themeKey]['500']})` }} />
                                ))}
                                <div className="relative group ml-2 pl-2 border-l border-white/10">
                                    <button className={`w-8 h-8 rounded-full border-2 flex items-center justify-center overflow-hidden ${settings.theme === 'custom' ? 'border-white' : 'border-zinc-700 bg-zinc-800'}`}>
                                        <Pipette className="w-4 h-4 text-zinc-400" />
                                    </button>
                                    <input type="color" value={customColor} onChange={(e) => handleCustomColorChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Card Options</h4>
                        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-2 space-y-1">
                            {/* Toggle Items */}
                            {[
                                { label: 'Use Season 1 Art', key: 'useSeason1Art', icon: MonitorPlay },
                                { label: 'Clean Grid (No Text)', key: 'cleanGrid', icon: SquareDashedBottom },
                                { label: 'Compact Calendar', key: 'compactCalendar', icon: Expand },
                                { label: 'Show Recommendations', key: 'recommendationsEnabled', icon: Sparkles },
                            ].map((opt) => (
                                <div key={opt.key} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors">
                                    <div className="flex items-center gap-3">
                                        <opt.icon className="w-4 h-4 text-zinc-400" />
                                        <span className="text-sm font-medium text-zinc-200">{opt.label}</span>
                                    </div>
                                    <button onClick={() => updateSettings({ [opt.key]: !settings[opt.key as keyof typeof settings] })} className={`w-10 h-6 rounded-full transition-colors relative ${settings[opt.key as keyof typeof settings] ? 'bg-indigo-600' : 'bg-zinc-700'}`}>
                                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings[opt.key as keyof typeof settings] ? 'translate-x-4' : ''}`} />
                                    </button>
                                </div>
                            ))}
                            
                            <div className="h-px bg-white/5 my-1 mx-3" />
                            
                            <div className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors">
                                <div className="flex items-center gap-3">
                                    <ImageIcon className="w-4 h-4 text-zinc-400" />
                                    <span className="text-sm font-medium text-zinc-200">Image Fit</span>
                                </div>
                                <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                                    <button onClick={() => updateSettings({ calendarPosterFillMode: 'cover' })} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${settings.calendarPosterFillMode === 'cover' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400'}`}>Cover</button>
                                    <button onClick={() => updateSettings({ calendarPosterFillMode: 'contain' })} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${settings.calendarPosterFillMode === 'contain' ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400'}`}>Contain</button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Spoiler Protection</h4>
                        <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4">
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => toggleSpoiler('images')} className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${settings.spoilerConfig.images ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                                    <ImageIcon className="w-5 h-5" />
                                    <span className="text-xs font-bold">Blur Images</span>
                                </button>
                                <button onClick={() => toggleSpoiler('overview')} className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${settings.spoilerConfig.overview ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                                    <FileText className="w-5 h-5" />
                                    <span className="text-xs font-bold">Hide Text</span>
                                </button>
                                <button onClick={() => toggleSpoiler('title')} className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${settings.spoilerConfig.title ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                                    <Type className="w-5 h-5" />
                                    <span className="text-xs font-bold">Hide Titles</span>
                                </button>
                                <button onClick={() => toggleSpoiler('includeMovies')} className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${settings.spoilerConfig.includeMovies ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                                    <Film className="w-5 h-5" />
                                    <span className="text-xs font-bold">Movies Too</span>
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            )}
            
            {activeTab === 'integrations' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-gradient-to-br from-red-900/20 to-zinc-900 border border-red-500/20 rounded-3xl p-6 text-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://waline.js.org/trakt.png')] opacity-5 bg-contain bg-center bg-no-repeat pointer-events-none" />
                        <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-red-900/20 relative z-10">
                            <span className="text-white font-bold text-2xl">t</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 relative z-10">Trakt.tv</h3>
                        <p className="text-sm text-zinc-400 mb-6 relative z-10">Sync your watched history and ratings automatically.</p>
                        
                        {user?.traktToken ? (
                            <div className="space-y-4 relative z-10">
                                <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex items-center gap-4">
                                    {user.traktProfile?.images?.avatar?.full ? (
                                        <img src={user.traktProfile.images.avatar.full} alt="Avatar" className="w-12 h-12 rounded-full ring-2 ring-red-500/30" />
                                    ) : (
                                        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500"><UserIcon className="w-6 h-6" /></div>
                                    )}
                                    <div className="text-left">
                                        <div className="text-white font-bold">{user.traktProfile?.name || user.traktProfile?.username || 'Trakt User'}</div>
                                        <div className="text-xs text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Connected</div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={handleSyncTrakt} disabled={isTraktSyncing} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-900/20">
                                        {isTraktSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Sync
                                    </button>
                                    <button onClick={disconnectTrakt} className="px-4 py-3 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl font-bold transition-colors">
                                        Disconnect
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 relative z-10">
                                {!traktCode ? (
                                    <>
                                        <input 
                                            type="text" 
                                            value={traktClientId} 
                                            onChange={e => setTraktClientId(e.target.value)} 
                                            placeholder="Trakt Client ID" 
                                            className="w-full bg-black/40 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-white focus:border-red-500 focus:outline-none placeholder:text-zinc-600" 
                                        />
                                        <button onClick={handleTraktConnect} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-900/20">
                                            Connect Account
                                        </button>
                                        <div className="text-center">
                                            <a href="https://trakt.tv/oauth/applications" target="_blank" rel="noreferrer" className="text-[10px] text-zinc-500 hover:text-white underline">Get API Key</a>
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-black/40 border border-white/5 p-4 rounded-xl animate-fade-in">
                                        <p className="text-sm text-zinc-300 mb-2">Enter this code at <a href={traktCode.verification_url} target="_blank" rel="noreferrer" className="text-red-400 underline font-bold">trakt.tv/activate</a></p>
                                        <div className="text-3xl font-mono font-bold text-white tracking-widest my-4 select-all bg-white/5 p-2 rounded-lg">{traktCode.user_code}</div>
                                        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Waiting for authentication...
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {activeTab === 'data' && (
                <div className="space-y-6 animate-fade-in">
                    <section className="space-y-3">
                         <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Management</h4>
                         <div className="grid grid-cols-2 gap-3">
                             <button onClick={() => setShowExportWarning(true)} className="py-4 bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 text-white rounded-2xl font-bold flex flex-col items-center justify-center gap-2 text-sm transition-all group">
                                 <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-full group-hover:bg-indigo-500 group-hover:text-white transition-colors"><Download className="w-5 h-5" /></div>
                                 Export Backup
                             </button>
                             <button onClick={handleImportClick} className="py-4 bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 text-white rounded-2xl font-bold flex flex-col items-center justify-center gap-2 text-sm transition-all group">
                                 <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-full group-hover:bg-emerald-500 group-hover:text-white transition-colors"><Upload className="w-5 h-5" /></div>
                                 Import File
                             </button>
                             <button onClick={handleExportWatchlist} className="col-span-2 py-3 bg-zinc-900/30 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl text-xs font-medium flex items-center justify-center gap-2">
                                 <FileJson className="w-4 h-4" /> Export Watchlist Only (JSON)
                             </button>
                         </div>
                    </section>
                    
                    <section className="bg-red-500/5 border border-red-500/10 rounded-3xl p-5">
                         <h3 className="text-red-400 font-bold mb-1 flex items-center gap-2"><ShieldAlert className="w-5 h-5" /> Danger Zone</h3>
                         <p className="text-xs text-red-300/60 mb-4">Actions here are destructive and cannot be undone easily.</p>
                         
                         <button onClick={handleForceReload} className="w-full py-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-colors">
                             <RefreshCw className="w-4 h-4" /> Force Reload All Data
                         </button>
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