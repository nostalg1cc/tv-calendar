import React, { useRef, useState, useEffect } from 'react';
import { X, Eye, EyeOff, Ticket, MonitorPlay, Download, Upload, HardDrive, Sparkles, LayoutList, AlignJustify, Key, Check, ListVideo, AlertTriangle, ShieldAlert, FileJson, RefreshCw, Loader2, Hourglass, Expand, Shrink, QrCode, Smartphone, Merge, ArrowDownToLine, Image as ImageIcon, Maximize } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, watchlist, subscribedLists, user, updateUserKey, importBackup, batchAddShows, batchSubscribe, syncProgress, loading, getSyncPayload, processSyncPayload } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for key editing
  const [keyInput, setKeyInput] = useState(user?.tmdbKey || '');
  const [isEditingKey, setIsEditingKey] = useState(false);

  // Export Security State
  const [showExportWarning, setShowExportWarning] = useState(false);
  const [hasAcknowledgedRisk, setHasAcknowledgedRisk] = useState(false);
  
  // Import / Merge State
  const [mergePreview, setMergePreview] = useState<any>(null); // For "Merge" modal on PC
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // QR Sync State
  const [showQr, setShowQr] = useState(false); // Showing QR to be scanned (PC Side)
  const [showScanner, setShowScanner] = useState(false); // Scanning QR (Mobile Side)

  // Hold Button State
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdIntervalRef = useRef<number | null>(null);
  const HOLD_DURATION = 5000; // 5 seconds
  const UPDATE_INTERVAL = 50; // Update every 50ms

  // Reset local processing state when global loading stops (import finished)
  useEffect(() => {
      if (!loading && isProcessingImport) {
          setIsProcessingImport(false);
          onClose(); // Close modal on finish
      }
  }, [loading, isProcessingImport, onClose]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => stopHold();
  }, []);

  const startHold = () => {
    setIsHolding(true);
    setHoldProgress(0);
    const step = 100 / (HOLD_DURATION / UPDATE_INTERVAL);
    
    holdIntervalRef.current = window.setInterval(() => {
      setHoldProgress(prev => {
        const next = prev + step;
        if (next >= 100) {
          stopHold();
          setShowExportWarning(true);
          return 100;
        }
        return next;
      });
    }, UPDATE_INTERVAL);
  };

  const stopHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setIsHolding(false);
    setHoldProgress(0);
  };

  if (!isOpen && !isProcessingImport) return null;

  const handleExportProfile = () => {
      const data = {
          version: '2.0',
          exportDate: new Date().toISOString(),
          user,
          watchlist,
          subscribedLists,
          settings,
      };
      downloadJson(data, `tv-calendar-profile-${user?.username || 'backup'}-${new Date().toISOString().split('T')[0]}`);
      
      // Reset state after download
      setShowExportWarning(false);
      setHasAcknowledgedRisk(false);
  };

  const handleExportWatchlist = () => {
      const data = {
          watchlist
      };
      downloadJson(data, `tv-calendar-watchlist-${new Date().toISOString().split('T')[0]}`);
  };

  const downloadJson = (data: any, filename: string) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const content = event.target?.result as string;
              const data = JSON.parse(content);
              
              // Validate simple check
              if (!Array.isArray(data) && !data.watchlist && !data.settings && !data.user) {
                  throw new Error('Invalid backup file format');
              }
              
              // MERGE LOGIC
              let incomingShows = [];
              let incomingLists = [];
              
              if (Array.isArray(data)) {
                  incomingShows = data;
              } else {
                  incomingShows = data.watchlist || [];
                  incomingLists = data.subscribedLists || [];
              }

              const currentShowIds = new Set(watchlist.map(s => s.id));
              const currentListIds = new Set(subscribedLists.map(l => l.id));

              const newShows = incomingShows.filter((s: any) => !currentShowIds.has(s.id));
              const newLists = incomingLists.filter((l: any) => !currentListIds.has(l.id));

              const matchCount = incomingShows.length - newShows.length;

              setMergePreview({
                  matchCount,
                  newShows,
                  newLists,
                  totalNew: newShows.length + newLists.length
              });

          } catch (err) {
              console.error(err);
              alert('Failed to import: Invalid file format.');
          }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmMerge = () => {
      if (mergePreview) {
          setIsProcessingImport(true);
          
          if (mergePreview.newShows.length > 0) {
              batchAddShows(mergePreview.newShows);
          }
          if (mergePreview.newLists.length > 0) {
              batchSubscribe(mergePreview.newLists);
          }
          
          // Small delay to show loader then close
          setTimeout(() => {
              setIsProcessingImport(false);
              setMergePreview(null);
              onClose();
          }, 1500);
      }
  };

  const saveKey = () => {
      if (keyInput.trim()) {
          updateUserKey(keyInput.trim());
          setIsEditingKey(false);
      }
  };

  const handleScan = (result: any) => {
      if (result && result[0]?.rawValue) {
          setShowScanner(false);
          setIsProcessingImport(true);
          processSyncPayload(result[0].rawValue);
      }
  };

  // --- Render Merge Confirmation Overlay ---
  if (mergePreview) {
      return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="glass-panel rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-fade-in relative overflow-hidden">
                   <div className="text-center mb-6">
                       <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
                           <Merge className="w-8 h-8" />
                       </div>
                       <h2 className="text-xl font-bold text-white mb-2">Merge Content</h2>
                       <p className="text-slate-400 text-sm">We compared your backup with your current profile.</p>
                   </div>

                   <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5 space-y-3">
                       <div className="flex justify-between items-center border-b border-white/5 pb-2">
                           <span className="text-slate-400 text-sm">Matching Items</span>
                           <span className="text-slate-500 font-mono font-bold text-xs bg-slate-800 px-2 py-0.5 rounded">
                               {mergePreview.matchCount} Skipped
                           </span>
                       </div>
                       <div className="flex justify-between items-center border-b border-white/5 pb-2">
                           <span className="text-slate-400 text-sm">New Shows/Movies</span>
                           <span className="text-green-400 font-bold">+{mergePreview.newShows.length}</span>
                       </div>
                       <div className="flex justify-between items-center">
                           <span className="text-slate-400 text-sm">New Lists</span>
                           <span className="text-green-400 font-bold">+{mergePreview.newLists.length}</span>
                       </div>
                   </div>

                   <div className="flex gap-3">
                       <button 
                           onClick={() => setMergePreview(null)}
                           className="flex-1 py-3 rounded-lg font-medium text-slate-300 hover:bg-white/5 transition-colors"
                       >
                           Cancel
                       </button>
                       <button 
                           onClick={confirmMerge}
                           disabled={mergePreview.totalNew === 0}
                           className={`
                                flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all
                                ${mergePreview.totalNew === 0 
                                    ? 'bg-white/10 text-slate-500 cursor-not-allowed' 
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}
                           `}
                       >
                           {mergePreview.totalNew === 0 ? 'Nothing to Add' : 'Import New'}
                       </button>
                   </div>
              </div>
          </div>
      );
  }

  // --- Render Scanner Overlay (Sync from PC) ---
  if (showScanner) {
      return (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
              <div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 left-0 right-0 z-10 backdrop-blur-md">
                  <h2 className="text-white font-bold">Scan QR from PC</h2>
                  <button onClick={() => setShowScanner(false)} className="p-2 bg-white/10 rounded-full text-white">
                      <X className="w-6 h-6" />
                  </button>
              </div>
              <div className="flex-1 flex items-center justify-center relative">
                  <Scanner 
                      onScan={handleScan} 
                      onError={(err: any) => console.log(err)}
                      styles={{ container: { width: '100%', height: '100%' } }}
                  />
                  {/* Overlay Guide */}
                  <div className="absolute inset-0 border-[30px] border-black/50 pointer-events-none flex items-center justify-center">
                      <div className="w-64 h-64 border-2 border-indigo-500/50 rounded-lg relative">
                           <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-500 -mt-1 -ml-1" />
                           <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-500 -mt-1 -mr-1" />
                           <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-500 -mb-1 -ml-1" />
                           <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-500 -mb-1 -mr-1" />
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- Render QR Overlay (Show to Mobile) ---
  if (showQr) {
      const payload = getSyncPayload();
      
      return (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in" onClick={() => setShowQr(false)}>
              <div 
                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center" 
                onClick={e => e.stopPropagation()}
              >
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Scan on Mobile</h3>
                  <p className="text-slate-500 text-center text-sm mb-6">
                      Open TV Calendar on your phone's login screen and scan this code to sync instantly.
                  </p>
                  
                  <div className="bg-white p-2 rounded-xl border-4 border-slate-100 mb-6">
                    <QRCode value={payload} size={240} />
                  </div>
                  
                  <button 
                    onClick={() => setShowQr(false)}
                    className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
                  >
                      Done
                  </button>
              </div>
          </div>
      );
  }

  // --- Render Processing/Syncing Overlay ---
  if (isProcessingImport) {
      const pct = syncProgress.total > 0 ? Math.round((syncProgress.current / syncProgress.total) * 100) : 0;
      
      return (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
               <div className="w-full max-w-sm text-center">
                   <div className="mb-8 relative">
                       <div className="w-20 h-20 mx-auto rounded-full border-4 border-white/10 flex items-center justify-center relative">
                           <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                       </div>
                       <div className="absolute top-0 right-0 left-0 bottom-0 flex items-center justify-center">
                           <span className="text-xs font-bold text-white mt-12">{pct}%</span>
                       </div>
                   </div>
                   
                   <h2 className="text-2xl font-bold text-white mb-2">Syncing Data</h2>
                   <p className="text-slate-400 mb-8">
                       Processing {syncProgress.total} items...
                   </p>

                   <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                       <div 
                           className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                           style={{ width: `${pct}%` }}
                       />
                   </div>
               </div>
          </div>
      );
  }

  // --- Render Export Warning Modal Overlay ---
  if (showExportWarning) {
      return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md">
              <div className="glass-panel border-2 border-red-500/50 rounded-3xl shadow-2xl w-full max-w-md p-6 animate-fade-in relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                      <ShieldAlert className="w-32 h-32 text-red-500" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4 text-red-400">
                        <AlertTriangle className="w-8 h-8" />
                        <h2 className="text-2xl font-bold text-white">Security Warning</h2>
                    </div>

                    <p className="text-slate-300 mb-4 leading-relaxed">
                        You are about to export your <strong className="text-white">Full Profile</strong>.
                    </p>
                    
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg mb-6">
                        <ul className="list-disc list-inside space-y-2 text-sm text-red-200">
                            <li>This file contains your <strong>Private TMDB API Key</strong>.</li>
                            <li>Anyone with this file can use your API quota.</li>
                            <li><strong>DO NOT share this file</strong> with others or upload it to public websites.</li>
                        </ul>
                    </div>

                    <div className="flex items-start gap-3 mb-6 p-3 bg-white/5 rounded-lg cursor-pointer" onClick={() => setHasAcknowledgedRisk(!hasAcknowledgedRisk)}>
                        <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${hasAcknowledgedRisk ? 'bg-indigo-600 border-indigo-500' : 'border-slate-500'}`}>
                            {hasAcknowledgedRisk && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <p className="text-sm text-slate-400 select-none">
                            I understand the risks and agree to keep this file safe.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => {
                                setShowExportWarning(false);
                                setHasAcknowledgedRisk(false);
                            }}
                            className="flex-1 py-3 rounded-lg font-medium text-slate-300 hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleExportProfile}
                            disabled={!hasAcknowledgedRisk}
                            className={`
                                flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all
                                ${hasAcknowledgedRisk 
                                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20' 
                                    : 'bg-white/5 text-slate-500 cursor-not-allowed'}
                            `}
                        >
                            <Download className="w-4 h-4" /> Download Profile
                        </button>
                    </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="glass-panel rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            
            {/* API Key Management */}
            <div>
                 <div className="flex items-center gap-3 mb-3">
                     <div className="p-2.5 rounded-xl bg-white/5 text-slate-300 h-fit">
                         <Key className="w-6 h-6" />
                     </div>
                     <div>
                         <h3 className="text-white font-medium">TMDB Access Token</h3>
                         <p className="text-slate-400 text-sm">Update your API credentials.</p>
                     </div>
                 </div>
                 
                 <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                     {isEditingKey ? (
                         <div className="flex gap-2">
                             <input 
                                type="password" 
                                value={keyInput}
                                onChange={(e) => setKeyInput(e.target.value)}
                                className="flex-1 bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                placeholder="TMDB Token"
                             />
                             <button 
                                onClick={saveKey}
                                className="bg-green-600 hover:bg-green-500 text-white p-2 rounded transition-colors"
                             >
                                 <Check className="w-4 h-4" />
                             </button>
                         </div>
                     ) : (
                         <div className="flex justify-between items-center">
                             <div className="text-slate-400 text-sm font-mono truncate max-w-[200px]">
                                 {user?.tmdbKey ? '••••••••••••••••' : 'Not Set'}
                             </div>
                             <button 
                                onClick={() => {
                                    setKeyInput(user?.tmdbKey || '');
                                    setIsEditingKey(true);
                                }}
                                className="text-xs text-indigo-400 hover:text-white underline"
                             >
                                 Change
                             </button>
                         </div>
                     )}
                 </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* Sync Section (Mobile <-> PC) */}
            <div>
                 <div className="flex items-center gap-3 mb-3">
                     <div className="p-2.5 rounded-xl bg-white/5 text-slate-300 h-fit">
                         <Smartphone className="w-6 h-6" />
                     </div>
                     <div>
                         <h3 className="text-white font-medium">Device Sync</h3>
                         <p className="text-slate-400 text-sm">Transfer data between devices.</p>
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3">
                     <button 
                        onClick={() => setShowQr(true)}
                        className="bg-white text-slate-900 hover:bg-slate-200 font-bold py-3 px-2 rounded-lg flex flex-col items-center justify-center gap-2 transition-all text-xs text-center"
                     >
                         <QrCode className="w-5 h-5" /> 
                         <span>Show QR Code</span>
                     </button>
                     <button 
                        onClick={() => setShowScanner(true)}
                        className="bg-white/10 text-white hover:bg-white/20 border border-white/10 font-bold py-3 px-2 rounded-lg flex flex-col items-center justify-center gap-2 transition-all text-xs text-center"
                     >
                         <Scanner className="w-5 h-5" /> 
                         <span>Scan to Sync</span>
                     </button>
                 </div>
            </div>

            <div className="h-px bg-white/5" />
            
            {/* Visual Settings Section */}
            <div className="space-y-4">
                
                {/* Compact Calendar Toggle */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 h-fit">
                            {settings.compactCalendar ? <Shrink className="w-6 h-6" /> : <Expand className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="text-white font-medium mb-1">Compact Calendar</h3>
                            <p className="text-slate-400 text-sm">Fit calendar to 100% viewport height.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => updateSettings({ compactCalendar: !settings.compactCalendar })}
                        className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${settings.compactCalendar ? 'bg-indigo-600' : 'bg-white/10'}
                        `}
                    >
                        <span 
                            className={`
                                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                ${settings.compactCalendar ? 'translate-x-6' : 'translate-x-1'}
                            `} 
                        />
                    </button>
                </div>

                {/* Poster Fill Mode Toggle */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                         <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 h-fit">
                            {settings.calendarPosterFillMode === 'contain' ? <ImageIcon className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="text-white font-medium mb-1">Grid Image Style</h3>
                            <p className="text-slate-400 text-sm">Toggle between full cover or ratio preserve.</p>
                        </div>
                    </div>
                    
                    <div className="flex bg-white/10 rounded-lg p-1">
                        <button
                             onClick={() => updateSettings({ calendarPosterFillMode: 'cover' })}
                             className={`p-1.5 rounded transition-colors ${settings.calendarPosterFillMode !== 'contain' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                             title="Full Cover"
                        >
                            <Maximize className="w-4 h-4" />
                        </button>
                         <button
                             onClick={() => updateSettings({ calendarPosterFillMode: 'contain' })}
                             className={`p-1.5 rounded transition-colors ${settings.calendarPosterFillMode === 'contain' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                             title="Preserve Ratio (Blur BG)"
                        >
                            <ImageIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ... existing toggles ... */}
            </div>

             {/* Data Management */}
             <div>
                 <div className="flex items-center gap-3 mb-4">
                     <div className="p-2.5 rounded-xl bg-white/5 text-slate-300 h-fit">
                         <HardDrive className="w-6 h-6" />
                     </div>
                     <div>
                         <h3 className="text-white font-medium">Backup & Restore</h3>
                         <p className="text-slate-400 text-sm">Manage your local data.</p>
                     </div>
                 </div>
                 
                 <div className="space-y-4">
                     {/* Full Profile - HOLD 5 SECONDS */}
                     <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <FileJson className="w-3 h-3" /> Full Profile (Contains Keys)
                        </p>
                        <button 
                            onMouseDown={startHold}
                            onMouseUp={stopHold}
                            onMouseLeave={stopHold}
                            onTouchStart={startHold}
                            onTouchEnd={stopHold}
                            className="relative w-full h-10 bg-white/5 rounded-lg font-medium text-xs text-slate-200 overflow-hidden select-none touch-none group"
                        >
                            <div 
                                className="absolute inset-y-0 left-0 bg-indigo-600 transition-all duration-[50ms] ease-linear"
                                style={{ width: `${holdProgress}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center gap-2 z-10">
                                <Download className={`w-3 h-3 ${isHolding ? 'animate-bounce' : ''}`} /> 
                                {isHolding 
                                    ? `Keep holding... ${Math.ceil((HOLD_DURATION - (HOLD_DURATION * (holdProgress/100))) / 1000)}s` 
                                    : 'Hold 5s to Export Profile'}
                            </div>
                        </button>
                        
                        {/* New MERGE Import Button */}
                        <button 
                            onClick={handleImportClick}
                            className="mt-2 w-full h-10 bg-white/5 hover:bg-white/10 rounded-lg font-medium text-xs text-slate-300 flex items-center justify-center gap-2 border border-white/5 hover:border-indigo-500/20 transition-all"
                        >
                            <ArrowDownToLine className="w-3 h-3" /> Import & Merge Backup
                        </button>
                     </div>

                     {/* Watchlist Only */}
                     <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                             <ListVideo className="w-3 h-3 text-indigo-400" />
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Watchlist Only</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={handleExportWatchlist}
                                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-indigo-300 border border-indigo-500/20 py-2 rounded-lg font-medium transition-colors text-xs"
                            >
                                <Download className="w-3 h-3" /> Export List
                            </button>
                            <button 
                                onClick={handleImportClick} // Reuses handleImportClick but logic handles watchlist-only files automatically
                                className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-indigo-300 border border-indigo-500/20 py-2 rounded-lg font-medium transition-colors text-xs"
                            >
                                <Upload className="w-3 h-3" /> Import List
                            </button>
                        </div>
                     </div>
                 </div>
                 
                 <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    className="hidden" 
                 />
             </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;