
import React, { useRef, useState, useEffect } from 'react';
import { X, LayoutList, Key, Check, Smartphone, ArrowDownToLine, Image as ImageIcon, Globe, Pipette, MonitorPlay, Sparkles, SquareDashedBottom, Expand, Bell, Eye, EyeOff, FileText, Type, Film, Moon, User, Database, ShieldAlert, Download, Upload, FileJson, RefreshCw, Merge, LayoutGrid, List, QrCode } from 'lucide-react';
import { useAppContext, THEMES } from '../context/AppContext';
import QRCode from 'react-qr-code';
import { Scanner } from '@yudiel/react-qr-scanner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'general' | 'appearance' | 'integrations' | 'data';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, user, updateUserKey, reminders, traktAuth, traktPoll, saveTraktToken, disconnectTrakt, syncTraktData } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [keyInput, setKeyInput] = useState(user?.tmdbKey || '');
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [customColor, setCustomColor] = useState(settings.customThemeColor || '#6366f1');
  const [showQr, setShowQr] = useState(false);

  // Timezones
  const timezones = React.useMemo(() => { try { return (Intl as any).supportedValuesOf('timeZone'); } catch { return []; } }, []);

  if (!isOpen) return null;

  const SidebarItem = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
      <button 
          onClick={() => setActiveTab(id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
      >
          <Icon className="w-4 h-4" />
          {label}
      </button>
  );

  const SectionTitle = ({ title }: { title: string }) => (
      <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 ml-1">{title}</h3>
  );

  const Toggle = ({ label, desc, checked, onChange, icon: Icon }: any) => (
      <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all">
          <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${checked ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  <Icon className="w-5 h-5" />
              </div>
              <div className="text-left">
                  <div className="text-sm font-bold text-white">{label}</div>
                  {desc && <div className="text-xs text-zinc-500">{desc}</div>}
              </div>
          </div>
          <button 
              onClick={() => onChange(!checked)} 
              className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-indigo-600' : 'bg-zinc-700'}`}
          >
              <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
          </button>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] flex overflow-hidden ring-1 ring-white/5"
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-64 border-r border-zinc-800 bg-zinc-950/50 flex flex-col p-4 shrink-0 hidden md:flex">
            <div className="px-4 py-4 mb-4">
                <h2 className="text-xl font-bold text-white tracking-tight">Settings</h2>
                <p className="text-xs text-zinc-500">Preferences & Account</p>
            </div>
            
            <nav className="space-y-1 flex-1">
                <SidebarItem id="general" label="General" icon={LayoutList} />
                <SidebarItem id="appearance" label="Appearance" icon={Moon} />
                <SidebarItem id="integrations" label="Integrations" icon={Merge} />
                <SidebarItem id="data" label="Data & Storage" icon={Database} />
            </nav>

            <div className="p-4 border-t border-zinc-800 mt-auto">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                        {user?.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{user?.username}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{user?.isCloud ? 'Cloud Account' : 'Local User'}</div>
                    </div>
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-zinc-950 custom-scrollbar relative">
            <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
            </button>

            {/* Mobile Nav Tabs */}
            <div className="md:hidden flex gap-2 overflow-x-auto pb-4 mb-4 border-b border-zinc-800">
                <button onClick={() => setActiveTab('general')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === 'general' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>General</button>
                <button onClick={() => setActiveTab('appearance')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === 'appearance' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Appearance</button>
                <button onClick={() => setActiveTab('integrations')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === 'integrations' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Integrations</button>
                <button onClick={() => setActiveTab('data')} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${activeTab === 'data' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Data</button>
            </div>

            {activeTab === 'general' && (
                <div className="space-y-8 animate-fade-in">
                    <section>
                        <SectionTitle title="Account" />
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Key className="w-5 h-5" /></div>
                                    <div>
                                        <div className="text-sm font-bold text-white">TMDB API Key</div>
                                        <div className="text-xs text-zinc-500">Access token for metadata</div>
                                    </div>
                                </div>
                                <button onClick={() => setIsEditingKey(!isEditingKey)} className="text-xs font-bold text-indigo-400 hover:text-indigo-300">
                                    {isEditingKey ? 'Cancel' : 'Update'}
                                </button>
                            </div>
                            {isEditingKey ? (
                                <div className="flex gap-2">
                                    <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} className="flex-1 bg-black/50 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="New Token" />
                                    <button onClick={() => { updateUserKey(keyInput); setIsEditingKey(false); }} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg"><Check className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <div className="text-xs font-mono text-zinc-600 bg-black/20 p-2 rounded">••••••••••••••••••••••••</div>
                            )}
                        </div>
                    </section>

                    <section>
                        <SectionTitle title="Region & Time" />
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><Globe className="w-5 h-5" /></div>
                                <div>
                                    <div className="text-sm font-bold text-white">Timezone</div>
                                    <div className="text-xs text-zinc-500">Localize air dates</div>
                                </div>
                            </div>
                            <div className="relative w-48">
                                <select value={settings.timezone} onChange={(e) => updateSettings({ timezone: e.target.value })} className="w-full bg-black/30 border border-zinc-700 rounded-lg py-2 pl-3 pr-8 text-xs text-white focus:outline-none appearance-none">
                                    {timezones.map((tz: string) => <option key={tz} value={tz}>{tz}</option>)}
                                </select>
                                <ArrowDownToLine className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                            </div>
                        </div>
                    </section>

                    <section>
                        <SectionTitle title="Automation" />
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between mb-2">
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><Bell className="w-5 h-5" /></div>
                                <div>
                                    <div className="text-sm font-bold text-white">Reminder Strategy</div>
                                    <div className="text-xs text-zinc-500">Default behavior when adding shows</div>
                                </div>
                            </div>
                            <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                                {[
                                    { id: 'ask', label: 'Ask' },
                                    { id: 'always', label: 'Always' },
                                    { id: 'never', label: 'Never' }
                                ].map((opt) => (
                                    <button 
                                        key={opt.id}
                                        onClick={() => updateSettings({ reminderStrategy: opt.id as any })}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${settings.reminderStrategy === opt.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Toggle label="Recommend Similar" desc="Suggest shows when adding" checked={settings.recommendationsEnabled} onChange={(v: boolean) => updateSettings({ recommendationsEnabled: v })} icon={Sparkles} />
                            {settings.recommendationsEnabled && (
                                <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                                    <div className="text-sm font-bold text-zinc-400 ml-2">Style</div>
                                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                                        <button onClick={() => updateSettings({ recommendationMethod: 'banner' })} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${settings.recommendationMethod === 'banner' ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}>Banner</button>
                                        <button onClick={() => updateSettings({ recommendationMethod: 'inline' })} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${settings.recommendationMethod === 'inline' ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}>Inline</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'appearance' && (
                <div className="space-y-8 animate-fade-in">
                    <section>
                        <SectionTitle title="Theme" />
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button onClick={() => updateSettings({ appDesign: 'default' })} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${settings.appDesign === 'default' ? 'bg-zinc-800 border-indigo-500 shadow-lg' : 'bg-zinc-900 border-zinc-800'}`}>
                                <LayoutList className="w-6 h-6 text-zinc-400" />
                                <span className="text-xs font-bold text-zinc-300">Standard</span>
                            </button>
                            <button onClick={() => updateSettings({ appDesign: 'blackout' })} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all relative overflow-hidden ${settings.appDesign === 'blackout' ? 'bg-black border-indigo-500 shadow-lg' : 'bg-black border-zinc-800'}`}>
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 opacity-50" />
                                <Moon className="w-6 h-6 text-indigo-400 relative z-10" />
                                <span className="text-xs font-bold text-white relative z-10">Blackout</span>
                            </button>
                        </div>
                        
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                            <div className="flex gap-2">
                                {Object.keys(THEMES).map((themeKey) => (
                                    <button key={themeKey} onClick={() => updateSettings({ theme: themeKey })} className={`w-8 h-8 rounded-full border-2 transition-all ${settings.theme === themeKey ? 'border-white scale-110 shadow' : 'border-transparent'}`} style={{ backgroundColor: `rgb(${THEMES[themeKey]['500']})` }} />
                                ))}
                            </div>
                        </div>
                    </section>

                    <section>
                        <SectionTitle title="Display Options" />
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Toggle label="Use Season 1 Art" desc="Avoid spoilers from newer posters" checked={settings.useSeason1Art} onChange={(v: boolean) => updateSettings({ useSeason1Art: v })} icon={MonitorPlay} />
                                <Toggle label="Clean Grid" desc="Hide text labels on calendar" checked={settings.cleanGrid} onChange={(v: boolean) => updateSettings({ cleanGrid: v })} icon={SquareDashedBottom} />
                                <Toggle label="Compact Calendar" desc="Fit grid to screen" checked={settings.compactCalendar} onChange={(v: boolean) => updateSettings({ compactCalendar: v })} icon={Expand} />
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-zinc-800 text-zinc-500"><ImageIcon className="w-5 h-5" /></div>
                                    <div className="text-sm font-bold text-white">Poster Fit</div>
                                </div>
                                <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                                    <button onClick={() => updateSettings({ calendarPosterFillMode: 'cover' })} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${settings.calendarPosterFillMode === 'cover' ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}>Cover</button>
                                    <button onClick={() => updateSettings({ calendarPosterFillMode: 'contain' })} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${settings.calendarPosterFillMode === 'contain' ? 'bg-indigo-600 text-white' : 'text-zinc-400'}`}>Contain</button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <SectionTitle title="Spoiler Protection" />
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, images: !settings.spoilerConfig.images } })} className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${settings.spoilerConfig.images ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                                <ImageIcon className="w-5 h-5" />
                                <span className="text-xs font-bold">Blur Images</span>
                            </button>
                            <button onClick={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, overview: !settings.spoilerConfig.overview } })} className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${settings.spoilerConfig.overview ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                                <FileText className="w-5 h-5" />
                                <span className="text-xs font-bold">Hide Text</span>
                            </button>
                            <button onClick={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, title: !settings.spoilerConfig.title } })} className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${settings.spoilerConfig.title ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                                <Type className="w-5 h-5" />
                                <span className="text-xs font-bold">Hide Titles</span>
                            </button>
                            <button onClick={() => updateSettings({ spoilerConfig: { ...settings.spoilerConfig, includeMovies: !settings.spoilerConfig.includeMovies } })} className={`p-4 rounded-xl border flex flex-col gap-2 transition-all ${settings.spoilerConfig.includeMovies ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                                <Film className="w-5 h-5" />
                                <span className="text-xs font-bold">Movies Too</span>
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'integrations' && (
                <div className="space-y-8 animate-fade-in">
                    <section>
                        <SectionTitle title="Trakt.tv" />
                        <div className="bg-gradient-to-br from-red-900/20 to-zinc-900 border border-red-500/20 rounded-2xl p-6 text-center">
                            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">t</div>
                            <h3 className="text-lg font-bold text-white mb-2">Sync History</h3>
                            <p className="text-sm text-zinc-400 mb-6">Automatically sync watched status.</p>
                            
                            {user?.traktToken ? (
                                <div className="space-y-4">
                                    <div className="bg-black/30 rounded-xl p-3 border border-white/5 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center"><User className="w-5 h-5 text-zinc-400" /></div>
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-white">{user.traktProfile?.username || 'Connected'}</div>
                                            <div className="text-[10px] text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Active</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => syncTraktData()} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-sm">Sync Now</button>
                                        <button onClick={disconnectTrakt} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-sm">Disconnect</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => alert("Please implement the auth flow call here")} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-900/20">Connect Trakt</button>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'data' && (
                <div className="space-y-8 animate-fade-in">
                    <section>
                        <SectionTitle title="Export & Import" />
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => {}} className="p-6 bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 rounded-2xl flex flex-col items-center gap-3 group transition-all">
                                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-full group-hover:bg-indigo-500 group-hover:text-white transition-colors"><Download className="w-6 h-6" /></div>
                                <span className="text-sm font-bold text-white">Backup</span>
                            </button>
                            <button onClick={() => {}} className="p-6 bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 rounded-2xl flex flex-col items-center gap-3 group transition-all">
                                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full group-hover:bg-emerald-500 group-hover:text-white transition-colors"><Upload className="w-6 h-6" /></div>
                                <span className="text-sm font-bold text-white">Restore</span>
                            </button>
                        </div>
                    </section>
                    
                    {!user?.isCloud && (
                        <section>
                            <SectionTitle title="Mobile Sync" />
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg"><Smartphone className="w-5 h-5" /></div>
                                    <div className="text-sm font-bold text-white">Transfer to Phone</div>
                                </div>
                                <button onClick={() => setShowQr(true)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white"><QrCode className="w-5 h-5" /></button>
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
      </div>
      
      {showQr && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl" onClick={() => setShowQr(false)}>
              <div className="bg-white p-8 rounded-3xl" onClick={e => e.stopPropagation()}>
                  <QRCode value={""} size={256} />
              </div>
          </div>
      )}
    </div>
  );
};

export default SettingsModal;
