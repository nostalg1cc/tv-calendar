import React, { useState } from 'react';
import { Database, CheckCircle, RefreshCw, Globe, EyeOff, Film, CalendarClock, Settings2, Loader2, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { AppSettings } from '../types';

const MigrationModal: React.FC = () => {
    const { fullSyncRequired, performFullSync, settings, isSyncing, syncProgress } = useAppContext();
    const [step, setStep] = useState<'config' | 'sync' | 'done'>('config');
    
    // Local state for migration configuration
    const [config, setConfig] = useState<{
        timeShift: boolean;
        spoilers: boolean;
        movies: boolean;
        timezone: string;
    }>({
        timeShift: settings.timeShift || false,
        spoilers: settings.spoilerConfig?.images || false,
        movies: settings.spoilerConfig?.includeMovies || false,
        timezone: settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    });

    if (!fullSyncRequired) return null;

    const handleStart = () => {
        setStep('sync');
        // Construct partial settings object
        const newSettings: Partial<AppSettings> = {
            timeShift: config.timeShift,
            timezone: config.timezone,
            spoilerConfig: {
                ...settings.spoilerConfig,
                images: config.spoilers,
                overview: config.spoilers,
                title: config.spoilers,
                includeMovies: config.movies,
                replacementMode: 'blur'
            }
        };
        performFullSync(newSettings);
    };

    const pct = syncProgress.total > 0 ? Math.round((syncProgress.current / syncProgress.total) * 100) : 0;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl animate-fade-in">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
                
                {step === 'config' && (
                    <div className="p-8 animate-fade-in">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-indigo-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                                <Settings2 className="w-10 h-10 text-indigo-500" />
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">System Update</h2>
                            <p className="text-sm text-zinc-400">
                                We've upgraded the database structure. Please confirm your preferences before we rebuild your calendar.
                            </p>
                        </div>

                        <div className="space-y-4 mb-8">
                            {/* Time Shift Toggle */}
                            <div 
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${config.timeShift ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-zinc-950 border-white/5 hover:border-white/10'}`}
                                onClick={() => setConfig({...config, timeShift: !config.timeShift})}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${config.timeShift ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                        <CalendarClock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-bold ${config.timeShift ? 'text-indigo-200' : 'text-zinc-300'}`}>Smart Time Shift</h4>
                                        <p className="text-[10px] text-zinc-500">Adjust release dates to my timezone.</p>
                                    </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${config.timeShift ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-700'}`}>
                                    {config.timeShift && <CheckCircle className="w-3.5 h-3.5" />}
                                </div>
                            </div>

                            {/* Spoilers Toggle */}
                            <div 
                                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${config.spoilers ? 'bg-red-500/10 border-red-500/50' : 'bg-zinc-950 border-white/5 hover:border-white/10'}`}
                                onClick={() => setConfig({...config, spoilers: !config.spoilers})}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${config.spoilers ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                        <EyeOff className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-bold ${config.spoilers ? 'text-red-200' : 'text-zinc-300'}`}>Spoiler Protection</h4>
                                        <p className="text-[10px] text-zinc-500">Blur images for unwatched episodes.</p>
                                    </div>
                                </div>
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${config.spoilers ? 'bg-red-500 border-red-500 text-white' : 'border-zinc-700'}`}>
                                    {config.spoilers && <CheckCircle className="w-3.5 h-3.5" />}
                                </div>
                            </div>

                            {/* Timezone (If shifting) */}
                            {config.timeShift && (
                                <div className="p-4 bg-zinc-950 border border-white/10 rounded-2xl flex items-center justify-between animate-fade-in">
                                    <div className="flex items-center gap-3">
                                        <Globe className="w-4 h-4 text-zinc-500" />
                                        <span className="text-xs font-bold text-zinc-400">Target Timezone</span>
                                    </div>
                                    <select 
                                        value={config.timezone} 
                                        onChange={(e) => setConfig({...config, timezone: e.target.value})}
                                        className="bg-transparent text-xs font-mono text-indigo-400 outline-none text-right w-40"
                                    >
                                        {(Intl as any).supportedValuesOf('timeZone').map((tz: string) => (<option key={tz} value={tz}>{tz}</option>))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={handleStart}
                            className="w-full py-4 bg-white text-black hover:bg-zinc-200 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-white/5"
                        >
                            Update & Rebuild <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {step === 'sync' && (
                    <div className="p-12 text-center animate-fade-in">
                        <div className="mb-8 relative inline-block">
                            <div className="w-24 h-24 rounded-full border-4 border-zinc-800 flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                                <span className="text-xl font-black text-white">{pct}%</span>
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-white mb-2">Rebuilding Calendar</h3>
                        <p className="text-sm text-zinc-500 mb-8 max-w-xs mx-auto">
                            Processing {syncProgress.current} of {syncProgress.total} items. This ensures your history is accurate.
                        </p>

                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-indigo-500 transition-all duration-300 ease-out" 
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MigrationModal;