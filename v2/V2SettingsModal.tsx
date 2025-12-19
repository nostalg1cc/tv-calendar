import React, { useState, useRef } from 'react';
import { Settings, ShieldCheck, Palette, User, Globe, EyeOff, Layout, Bell, Monitor, Cloud, LogOut, RefreshCw, X, ChevronLeft, Signal, CheckCircle2, XCircle, Database, Download, Upload, Trash2, Unlink } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useData } from '../context/v2/DataContext'; // Direct access for specialized functions

interface V2SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type TabId = 'general' | 'account' | 'design' | 'spoiler' | 'data';

const V2SettingsModal: React.FC<V2SettingsModalProps> = ({ isOpen, onClose }) => {
    const { settings, updateSettings, user, logout, hardRefreshCalendar, isSyncing, testConnection, disconnectTrakt } = useAppContext();
    const { exportData, importData, clearAccountData } = useData();
    
    const [activeTab, setActiveTab] = useState<TabId>('general');
    const [mobileView, setMobileView] = useState<'menu' | 'content'>('menu');

    // Test State
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ read: boolean; write: boolean; message: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleRunTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        const res = await testConnection();
        setTimeout(() => {
            setTestResult(res);
            setIsTesting(false);
        }, 800);
    };

    const handleExport = () => {
        const data = exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tv-calendar-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            try {
                const data = JSON.parse(ev.target?.result as string);
                if (!data.watchlist && !data.interactions) throw new Error("Invalid file format");
                
                if (confirm(`Found valid backup from ${data.timestamp || 'unknown date'}. Import data?`)) {
                    await importData(data);
                    alert("Import successful!");
                }
            } catch (e) {
                alert("Failed to parse backup file.");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleReset = async () => {
        const confirm1 = confirm("⚠️ FACTORY RESET WARNING ⚠️\n\nThis will DELETE ALL your data including watchlist, history, and settings from the cloud.\n\nThis action cannot be undone. Are you sure?");
        if (confirm1) {
             const confirm2 = confirm("Final Confirmation: Delete everything?");
             if (confirm2) {
                 await clearAccountData();
                 onClose();
             }
        }
    };

    if (!isOpen) return null;

    const Toggle = ({ active, onToggle, label, description }: { active: boolean; onToggle: () => void; label: string; description?: string }) => (
        <div className="flex items-center justify-between py-4 group/toggle cursor-pointer" onClick={onToggle}>
            <div className="flex-1 pr-4">
                <h4 className="text-sm font-bold text-zinc-200 group-hover/toggle:text-white transition-colors">{label}</h4>
                {description && <p className="text-xs text-zinc-500 mt-1">{description}</p>}
            </div>
            <button className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${active ? 'bg-indigo-600' : 'bg-zinc-800'}`}>
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-lg transition-transform ${active ? 'translate-x-6' : ''}`} />
            </button>
        </div>
    );

    const TABS: { id: TabId; label: string; icon: any }[] = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'account', label: 'Account', icon: User },
        { id: 'data', label: 'Data & Storage', icon: Database },
        { id: 'design', label: 'Design', icon: Palette },
        { id: 'spoiler', label: 'Spoilers', icon: ShieldCheck },
    ];

    const handleTabSelect = (id: TabId) => {
        setActiveTab(id);
        setMobileView('content');
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-0 md:p-12" onClick={onClose}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-fade-in" />
            <div 
                className="relative bg-[#080808] border border-white/5 w-full md:w-full md:max-w-4xl h-full md:h-full md:max-h-[700px] flex flex-col md:flex-row overflow-hidden md:rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-enter" 
                onClick={e => e.stopPropagation()}
            >
                {/* Sidebar */}
                <div className={`w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 bg-zinc-950/30 flex-col shrink-0 h-full ${mobileView === 'menu' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="p-6 md:p-8 flex justify-between items-center md:block">
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter">System</h2>
                            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-1">Version 2.5.0</p>
                        </div>
                        <button onClick={onClose} className="md:hidden p-2 text-zinc-400 hover:text-white bg-zinc-900 rounded-full"><X className="w-5 h-5" /></button>
                    </div>
                    <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                        {TABS.map(tab => (
                            <button key={tab.id} onClick={() => handleTabSelect(tab.id)} className={`w-full flex items-center gap-4 px-4 py-4 md:py-3 rounded-2xl transition-all text-sm font-bold ${activeTab === tab.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02] border border-transparent'}`}>
                                <tab.icon className="w-5 h-5" /> {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className={`flex-1 flex flex-col h-full bg-[#080808] ${mobileView === 'content' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="md:hidden p-4 border-b border-white/5 flex items-center gap-3">
                        <button onClick={() => setMobileView('menu')} className="p-2 -ml-2 text-zinc-400 hover:text-white"><ChevronLeft className="w-6 h-6" /></button>
                        <h3 className="font-bold text-white text-lg">{TABS.find(t => t.id === activeTab)?.label}</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar">
                        {activeTab === 'general' && (
                            <div className="animate-fade-in space-y-8">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-6 hidden md:block">Preferences</h3>
                                    <div className="space-y-2 divide-y divide-white/5">
                                        <Toggle label="Automatic Calendar Sync" description="Fetch new episodes on load." active={!!settings.autoSync} onToggle={() => updateSettings({ autoSync: !settings.autoSync })} />
                                        <Toggle label="Smart Timezone Shift" description="Adjust release dates to local time." active={!!settings.timeShift} onToggle={() => updateSettings({ timeShift: !settings.timeShift })} />
                                        <Toggle label="Ignore Specials" description="Hide Season 0 content." active={!!settings.ignoreSpecials} onToggle={() => updateSettings({ ignoreSpecials: !settings.ignoreSpecials })} />
                                        <Toggle label="Hide Theatrical" description="Only show streaming releases." active={!!settings.hideTheatrical} onToggle={() => updateSettings({ hideTheatrical: !settings.hideTheatrical })} />
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-white/5">
                                    <h3 className="text-sm font-black text-zinc-600 uppercase tracking-widest mb-4">Region</h3>
                                    <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3"><Globe className="w-4 h-4 text-zinc-500" /><span className="text-sm font-bold text-zinc-300">System Timezone</span></div>
                                        <span className="text-xs font-mono text-indigo-400 uppercase">{settings.timezone}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'account' && (
                            <div className="animate-fade-in space-y-8">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight hidden md:block">Identity</h3>
                                <div className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                                    <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-3xl shadow-inner border border-indigo-500/20">{user?.username.charAt(0).toUpperCase()}</div>
                                    <div className="flex-1">
                                        <h4 className="text-lg font-black text-white">{user?.username}</h4>
                                        <p className="text-sm text-zinc-500">{user?.email || 'Local Profile'}</p>
                                        <div className="mt-2">{user?.isCloud ? <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">Cloud Synced</span> : <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2 py-1 rounded">Local Storage</span>}</div>
                                    </div>
                                    <button onClick={logout} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all"><LogOut className="w-5 h-5" /></button>
                                </div>

                                {user?.traktToken ? (
                                    <div className="p-5 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center font-bold">T</div>
                                            <div>
                                                <div className="text-sm font-bold text-white">Trakt Account</div>
                                                <div className="text-xs text-zinc-500">Connected as {user.traktProfile?.username || 'User'}</div>
                                            </div>
                                        </div>
                                        <button onClick={disconnectTrakt} className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1"><Unlink className="w-3 h-3" /> Disconnect</button>
                                    </div>
                                ) : (
                                     <div className="p-5 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-between opacity-50">
                                         <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 bg-zinc-800 text-zinc-600 rounded-full flex items-center justify-center font-bold">T</div>
                                             <div><div className="text-sm font-bold text-white">Trakt</div><div className="text-xs text-zinc-500">Not connected</div></div>
                                         </div>
                                     </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'data' && (
                            <div className="animate-fade-in space-y-8">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight hidden md:block">Data & Storage</h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={handleExport} className="p-5 bg-zinc-900 border border-white/5 hover:border-indigo-500/50 rounded-2xl text-left group transition-all">
                                        <Download className="w-6 h-6 text-indigo-500 mb-3 group-hover:-translate-y-1 transition-transform" />
                                        <h4 className="font-bold text-white mb-1">Export Data</h4>
                                        <p className="text-[10px] text-zinc-500">Download JSON backup including watched history.</p>
                                    </button>
                                    <button onClick={handleImportClick} className="p-5 bg-zinc-900 border border-white/5 hover:border-emerald-500/50 rounded-2xl text-left group transition-all">
                                        <Upload className="w-6 h-6 text-emerald-500 mb-3 group-hover:-translate-y-1 transition-transform" />
                                        <h4 className="font-bold text-white mb-1">Import Data</h4>
                                        <p className="text-[10px] text-zinc-500">Restore from a previous backup file.</p>
                                    </button>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />

                                <div className="bg-zinc-900 border border-white/5 p-5 rounded-2xl">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h4 className="text-sm font-bold text-zinc-200 flex items-center gap-2"><Signal className="w-4 h-4 text-emerald-500" /> Database Status</h4>
                                            <p className="text-[10px] text-zinc-500 mt-1">Test connectivity to cloud servers.</p>
                                        </div>
                                        <button onClick={handleRunTest} disabled={isTesting} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                                            {isTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Ping Test'}
                                        </button>
                                    </div>
                                    {testResult && (
                                        <div className="grid grid-cols-2 gap-3 mt-4 border-t border-white/5 pt-4">
                                            <div className={`p-3 rounded-xl border flex items-center gap-3 ${testResult.read ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                                {testResult.read ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                                <div><div className="text-xs font-black uppercase tracking-wider">Read</div><div className="text-[10px] opacity-80">{testResult.read ? 'OK' : 'Error'}</div></div>
                                            </div>
                                            <div className={`p-3 rounded-xl border flex items-center gap-3 ${testResult.write ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                                {testResult.write ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                                <div><div className="text-xs font-black uppercase tracking-wider">Write</div><div className="text-[10px] opacity-80">{testResult.write ? 'OK' : 'Error'}</div></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 pt-4 border-t border-white/5">
                                     <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/> Danger Zone</h3>
                                     
                                     <button onClick={() => { if(confirm("Refresh calendar data?")) hardRefreshCalendar(); }} disabled={isSyncing} className="w-full bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-zinc-300 hover:text-white p-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-between group">
                                         <span className="flex items-center gap-3"><RefreshCw className={`w-4 h-4 text-zinc-500 group-hover:text-white ${isSyncing ? 'animate-spin' : ''}`} /> Force Re-Sync</span>
                                     </button>

                                     <button onClick={handleReset} className="w-full bg-red-950/10 hover:bg-red-950/30 border border-red-500/20 text-red-400 hover:text-red-300 p-4 rounded-2xl font-bold text-sm transition-all flex items-center justify-between group">
                                         <span className="flex items-center gap-3"><Trash2 className="w-4 h-4" /> Factory Reset Account</span>
                                     </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'design' && (
                            <div className="animate-fade-in space-y-8">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight hidden md:block">Interface</h3>
                                <div>
                                    <label className="text-sm font-black text-zinc-600 uppercase tracking-widest mb-4 block">Visual Mode</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['cosmic', 'oled', 'light'].map(t => <button key={t} onClick={() => updateSettings({ baseTheme: t as any })} className={`p-4 rounded-2xl border-2 transition-all text-center ${settings.baseTheme === t ? 'border-indigo-500 bg-zinc-900 text-indigo-400' : 'border-white/5 bg-zinc-950 text-zinc-600 hover:text-zinc-300'}`}><span className="text-xs font-black uppercase tracking-widest">{t}</span></button>)}
                                    </div>
                                </div>
                                <div className="space-y-2 divide-y divide-white/5">
                                    <Toggle label="Compact Calendar" description="FIT more rows on the grid." active={!!settings.compactCalendar} onToggle={() => updateSettings({ compactCalendar: !settings.compactCalendar })} />
                                    <Toggle label="Season 1 Art" description="Show non-spoiler art." active={!!settings.useSeason1Art} onToggle={() => updateSettings({ useSeason1Art: !settings.useSeason1Art })} />
                                    <Toggle label="Monochrome UI" description="Remove accent colors." active={settings.theme === 'zinc'} onToggle={() => updateSettings({ theme: settings.theme === 'zinc' ? 'default' : 'zinc' })} />
                                </div>
                            </div>
                        )}

                        {activeTab === 'spoiler' && (
                            <div className="animate-fade-in space-y-8">
                                <h3 className="text-2xl font-black text-white uppercase tracking-tight hidden md:block">Safe View</h3>
                                <div className="space-y-2 divide-y divide-white/5">
                                    <Toggle label="Protect Images" description="Hide stills until watched." active={!!settings.spoilerConfig.images} onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, images: !settings.spoilerConfig.images } })} />
                                    <Toggle label="Censor Titles" description="Replace names with generic labels." active={!!settings.spoilerConfig.title} onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, title: !settings.spoilerConfig.title } })} />
                                    <Toggle label="Redact Overviews" description="Hide episode descriptions." active={!!settings.spoilerConfig.overview} onToggle={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, overview: !settings.spoilerConfig.overview } })} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default V2SettingsModal;