import React, { useRef, useState, useEffect } from 'react';
import { X, Eye, EyeOff, Ticket, MonitorPlay, Download, Upload, HardDrive, Sparkles, LayoutList, AlignJustify, Key, Check, ListVideo, AlertTriangle, ShieldAlert, FileJson, RefreshCw, Loader2, Hourglass, Expand, Shrink } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, watchlist, subscribedLists, user, updateUserKey, importBackup, syncProgress, loading } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for key editing
  const [keyInput, setKeyInput] = useState(user?.tmdbKey || '');
  const [isEditingKey, setIsEditingKey] = useState(false);

  // Export Security State
  const [showExportWarning, setShowExportWarning] = useState(false);
  const [hasAcknowledgedRisk, setHasAcknowledgedRisk] = useState(false);
  
  // Import Confirmation State
  const [importPreview, setImportPreview] = useState<any>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

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
              
              // Set preview instead of importing immediately
              setImportPreview(data);
          } catch (err) {
              console.error(err);
              alert('Failed to import: Invalid file format.');
          }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = () => {
      if (importPreview) {
          setIsProcessingImport(true); // Start blocking UI
          importBackup(importPreview); // Updates state, triggers refreshEpisodes
          setImportPreview(null);
          // Note: onClose is called via useEffect when loading becomes false
      }
  };

  const saveKey = () => {
      if (keyInput.trim()) {
          updateUserKey(keyInput.trim());
          setIsEditingKey(false);
      }
  };

  const calculateEstimate = (count: number) => {
      const batchSize = 4;
      const delayPerBatch = 0.5; // 500ms
      const batches = Math.ceil(count / batchSize);
      const totalSeconds = batches * delayPerBatch;
      
      if (totalSeconds < 60) {
          return `${Math.ceil(totalSeconds)} seconds`;
      }
      return `${Math.ceil(totalSeconds / 60)} minutes`;
  };

  // --- Render Import Confirmation Overlay ---
  if (importPreview) {
      const showCount = Array.isArray(importPreview) 
          ? importPreview.length 
          : (importPreview.watchlist?.length || 0);
      const listCount = !Array.isArray(importPreview) && importPreview.subscribedLists 
          ? importPreview.subscribedLists.length 
          : 0;
      
      let totalItemsToSync = showCount;
      if (importPreview.subscribedLists) {
          importPreview.subscribedLists.forEach((l: any) => {
             if (l.items) totalItemsToSync += l.items.length;
          });
      }

      const timeEstimate = calculateEstimate(totalItemsToSync);

      return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in relative overflow-hidden">
                   <div className="text-center mb-6">
                       <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
                           <Upload className="w-8 h-8" />
                       </div>
                       <h2 className="text-xl font-bold text-white mb-2">Confirm Import</h2>
                       <p className="text-slate-400 text-sm">You are about to add:</p>
                   </div>

                   <div className="bg-slate-800 rounded-xl p-4 mb-6 border border-white/5 space-y-3">
                       <div className="flex justify-between items-center border-b border-white/5 pb-2">
                           <span className="text-slate-400 text-sm">TV Shows & Movies</span>
                           <span className="text-white font-bold">{showCount}</span>
                       </div>
                       {listCount > 0 && (
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                <span className="text-slate-400 text-sm">Subscribed Lists</span>
                                <span className="text-white font-bold">{listCount}</span>
                            </div>
                       )}
                       <div className="flex justify-between items-center">
                           <span className="text-slate-400 text-sm">Settings</span>
                           <span className="text-white font-bold">{importPreview.settings ? 'Yes' : 'No'}</span>
                       </div>
                   </div>

                   <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3 mb-6">
                       <Hourglass className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                       <div className="text-xs text-yellow-200 leading-relaxed">
                           <strong className="block mb-1 text-yellow-100">Estimated Time: ~{timeEstimate}</strong>
                           Please do not close the window while the import is processing.
                       </div>
                   </div>

                   <div className="flex gap-3">
                       <button 
                           onClick={() => setImportPreview(null)}
                           className="flex-1 py-3 rounded-lg font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                       >
                           Cancel
                       </button>
                       <button 
                           onClick={confirmImport}
                           className="flex-1 py-3 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all"
                       >
                           Import Now
                       </button>
                   </div>
              </div>
          </div>
      );
  }

  // --- Render Processing/Syncing Overlay ---
  if (isProcessingImport) {
      const pct = syncProgress.total > 0 ? Math.round((syncProgress.current / syncProgress.total) * 100) : 0;
      
      return (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl">
               <div className="w-full max-w-sm text-center">
                   <div className="mb-8 relative">
                       <div className="w-20 h-20 mx-auto rounded-full border-4 border-slate-800 flex items-center justify-center relative">
                           <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                       </div>
                       <div className="absolute top-0 right-0 left-0 bottom-0 flex items-center justify-center">
                           <span className="text-xs font-bold text-white mt-12">{pct}%</span>
                       </div>
                   </div>
                   
                   <h2 className="text-2xl font-bold text-white mb-2">Syncing your Library</h2>
                   <p className="text-slate-400 mb-8">
                       Updating calendar events for {syncProgress.total} items...
                   </p>

                   <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                       <div 
                           className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                           style={{ width: `${pct}%` }}
                       />
                   </div>
                   
                   <p className="text-sm font-mono text-indigo-300 mb-8">
                       {syncProgress.current} / {syncProgress.total} processed
                   </p>

                   <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3 text-left">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-xs text-red-200">
                            <strong>Do not close this window.</strong><br/>
                            Interrupting this process may result in missing calendar data.
                        </p>
                   </div>
               </div>
          </div>
      );
  }

  // --- Render Export Warning Modal Overlay ---
  if (showExportWarning) {
      return (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md">
              <div className="bg-slate-900 border-2 border-red-500/50 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in relative overflow-hidden">
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

                    <div className="flex items-start gap-3 mb-6 p-3 bg-slate-800 rounded-lg cursor-pointer" onClick={() => setHasAcknowledgedRisk(!hasAcknowledgedRisk)}>
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
                            className="flex-1 py-3 rounded-lg font-medium text-slate-300 hover:bg-slate-800 transition-colors"
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
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
            
            {/* API Key Management */}
            <div>
                 <div className="flex items-center gap-3 mb-3">
                     <div className="p-2.5 rounded-xl bg-slate-700/50 text-slate-300 h-fit">
                         <Key className="w-6 h-6" />
                     </div>
                     <div>
                         <h3 className="text-white font-medium">TMDB Access Token</h3>
                         <p className="text-slate-400 text-sm">Update your API credentials.</p>
                     </div>
                 </div>
                 
                 <div className="bg-slate-800 p-3 rounded-lg border border-white/5">
                     {isEditingKey ? (
                         <div className="flex gap-2">
                             <input 
                                type="password" 
                                value={keyInput}
                                onChange={(e) => setKeyInput(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
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
                            ${settings.compactCalendar ? 'bg-indigo-600' : 'bg-slate-700'}
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

                {/* Spoiler Toggle */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 h-fit">
                            {settings.hideSpoilers ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="text-white font-medium mb-1">Spoiler Protection</h3>
                            <p className="text-slate-400 text-sm">Blur episode images by default.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => updateSettings({ hideSpoilers: !settings.hideSpoilers })}
                        className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${settings.hideSpoilers ? 'bg-indigo-600' : 'bg-slate-700'}
                        `}
                    >
                        <span 
                            className={`
                                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                ${settings.hideSpoilers ? 'translate-x-6' : 'translate-x-1'}
                            `} 
                        />
                    </button>
                </div>

                {/* Theatrical Toggle */}
                <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                         <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 h-fit">
                            <Ticket className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium mb-1">Hide Theatrical Releases</h3>
                            <p className="text-slate-400 text-sm">Only show digital/home releases.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => updateSettings({ hideTheatrical: !settings.hideTheatrical })}
                        className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${settings.hideTheatrical ? 'bg-indigo-600' : 'bg-slate-700'}
                        `}
                    >
                        <span 
                            className={`
                                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                ${settings.hideTheatrical ? 'translate-x-6' : 'translate-x-1'}
                            `} 
                        />
                    </button>
                </div>
            </div>

            <div className="h-px bg-white/5" />

             {/* Discovery / Recommendations */}
             <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-4">
                         <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 h-fit">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium mb-1">Recommendations</h3>
                            <p className="text-slate-400 text-sm">Suggest similar shows when adding.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => updateSettings({ recommendationsEnabled: !settings.recommendationsEnabled })}
                        className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${settings.recommendationsEnabled ? 'bg-indigo-600' : 'bg-slate-700'}
                        `}
                    >
                        <span 
                            className={`
                                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                                ${settings.recommendationsEnabled ? 'translate-x-6' : 'translate-x-1'}
                            `} 
                        />
                    </button>
                </div>

                {settings.recommendationsEnabled && (
                    <div className="bg-slate-800/50 rounded-lg p-3 border border-white/5 ml-14">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Display Style</p>
                        <div className="flex gap-2">
                             <button
                                onClick={() => updateSettings({ recommendationMethod: 'banner' })}
                                className={`
                                    flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all border
                                    ${settings.recommendationMethod === 'banner' 
                                        ? 'bg-indigo-600 text-white border-indigo-500' 
                                        : 'bg-slate-800 text-slate-400 border-white/5 hover:bg-slate-700'}
                                `}
                             >
                                <LayoutList className="w-4 h-4" /> Top Banner
                             </button>
                             <button
                                onClick={() => updateSettings({ recommendationMethod: 'inline' })}
                                className={`
                                    flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all border
                                    ${settings.recommendationMethod === 'inline' 
                                        ? 'bg-indigo-600 text-white border-indigo-500' 
                                        : 'bg-slate-800 text-slate-400 border-white/5 hover:bg-slate-700'}
                                `}
                             >
                                <AlignJustify className="w-4 h-4" /> Inline List
                             </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 text-center">
                            {settings.recommendationMethod === 'banner' 
                                ? "Shows recommendations at the top of the search window."
                                : "Inserts recommendations directly into the results list (Spotify style)."}
                        </p>
                    </div>
                )}
             </div>

             <div className="h-px bg-white/5" />

             {/* Data Management */}
             <div>
                 <div className="flex items-center gap-3 mb-4">
                     <div className="p-2.5 rounded-xl bg-slate-700/50 text-slate-300 h-fit">
                         <HardDrive className="w-6 h-6" />
                     </div>
                     <div>
                         <h3 className="text-white font-medium">Backup & Restore</h3>
                         <p className="text-slate-400 text-sm">Manage your local data.</p>
                     </div>
                 </div>
                 
                 <div className="space-y-4">
                     {/* Full Profile - HOLD 5 SECONDS */}
                     <div className="bg-slate-800 p-3 rounded-lg border border-white/5">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <FileJson className="w-3 h-3" /> Full Profile (Contains Keys)
                        </p>
                        <button 
                            onMouseDown={startHold}
                            onMouseUp={stopHold}
                            onMouseLeave={stopHold}
                            onTouchStart={startHold}
                            onTouchEnd={stopHold}
                            className="relative w-full h-10 bg-slate-700 rounded-lg font-medium text-xs text-slate-200 overflow-hidden select-none touch-none group"
                        >
                            {/* Progress Background */}
                            <div 
                                className="absolute inset-y-0 left-0 bg-indigo-600 transition-all duration-[50ms] ease-linear"
                                style={{ width: `${holdProgress}%` }}
                            />
                            
                            {/* Text / Label */}
                            <div className="absolute inset-0 flex items-center justify-center gap-2 z-10">
                                <Download className={`w-3 h-3 ${isHolding ? 'animate-bounce' : ''}`} /> 
                                {isHolding 
                                    ? `Keep holding... ${Math.ceil((HOLD_DURATION - (HOLD_DURATION * (holdProgress/100))) / 1000)}s` 
                                    : 'Hold 5s to Export Profile'}
                            </div>
                        </button>
                        <p className="text-[10px] text-slate-500 mt-2 text-center">
                            Importing full profiles is only available on the Login screen.
                        </p>
                     </div>

                     {/* Watchlist Only */}
                     <div className="bg-slate-800 p-3 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                             <ListVideo className="w-3 h-3 text-indigo-400" />
                             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Watchlist Only</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={handleExportWatchlist}
                                className="flex items-center justify-center gap-2 bg-slate-900/50 hover:bg-slate-900 text-indigo-300 border border-indigo-500/20 py-2 rounded-lg font-medium transition-colors text-xs"
                            >
                                <Download className="w-3 h-3" /> Export List
                            </button>
                            <button 
                                onClick={handleImportClick}
                                className="flex items-center justify-center gap-2 bg-slate-900/50 hover:bg-slate-900 text-indigo-300 border border-indigo-500/20 py-2 rounded-lg font-medium transition-colors text-xs"
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