
import React, { useState } from 'react';
import { Database, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useStore } from '../store';

const FullSyncModal: React.FC = () => {
  const fullSyncRequired = useStore(state => state.fullSyncRequired);
  const performFullSync = useStore(state => state.performFullSync);
  const syncProgress = useStore(state => state.syncProgress);
  const [started, setStarted] = useState(false);

  if (!fullSyncRequired) return null;

  const handleStart = () => {
      setStarted(true);
      if (performFullSync) performFullSync();
  };

  const pct = (syncProgress && syncProgress.total > 0) ? Math.round((syncProgress.current / syncProgress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
        <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-3xl shadow-2xl p-8 text-center relative overflow-hidden">
            <div className="mb-6">
                <div className="w-20 h-20 bg-indigo-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                    <Database className="w-10 h-10 text-indigo-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Database Migration</h2>
                <p className="text-zinc-400 text-sm">We're upgrading your cloud storage to be faster and more reliable.</p>
            </div>

            {!started ? (
                <div className="space-y-4">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex gap-3 text-left">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-yellow-200"><strong>Do not close this window.</strong><br/>This process fetches all historical data for your shows.</div>
                    </div>
                    <button onClick={handleStart} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2">Start Migration <RefreshCw className="w-5 h-5" /></button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="relative pt-4">
                        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-300 ease-out relative overflow-hidden" style={{ width: `${pct}%` }}><div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite]" /></div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs font-bold text-zinc-500 uppercase tracking-wider"><span>Syncing...</span><span>{pct}%</span></div>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default FullSyncModal;
