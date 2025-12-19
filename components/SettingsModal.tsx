import React, { useRef, useState } from 'react';
import { X, EyeOff, Sparkles, RefreshCw, AlertTriangle, Moon, Sun, User, Palette, Layers, Database, LogOut, ChevronRight, CheckCircle2, Download, Upload, Monitor, PenTool, Globe, CalendarClock, Signal, Loader2, Ban } from 'lucide-react';
import { useStore } from '../store';

// Mock Themes if context is gone
const THEME_COLORS: Record<string, any> = {
    default: { 500: '99 102 241' },
    emerald: { 500: '16 185 129' },
    rose: { 500: '244 63 94' },
    amber: { 500: '245 158 11' },
    cyan: { 500: '6 182 212' },
    violet: { 500: '139 92 246' },
};

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
  const { settings, updateSettings, user, logout } = useStore();
  
  const [activeTab, setActiveTab] = useState<TabId>('appearance');
  const [customColor, setCustomColor] = useState(settings.customThemeColor || '#6366f1');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helpers
  const handleCustomColorChange = (hex: string) => { setCustomColor(hex); updateSettings({ customThemeColor: hex, theme: 'custom' }); };
  const toggleSpoiler = (key: 'images' | 'overview' | 'title' | 'includeMovies') => {
      const newConfig = { ...settings.spoilerConfig, [key]: !settings.spoilerConfig[key] };
      updateSettings({ spoilerConfig: newConfig });
  };
  
  const TABS = [
      { id: 'appearance', label: 'Appearance', icon: Palette },
      { id: 'preferences', label: 'Preferences', icon: Layers },
      { id: 'account', label: 'Account', icon: User },
      { id: 'data', label: 'Data', icon: Database },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#09090b] border border-white/10 rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col md:flex-row overflow-hidden relative" 
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="hidden md:flex w-64 border-r border-white/5 flex-col bg-[#050505]">
            <div className="p-6 border-b border-white/5">
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <p className="text-xs text-zinc-500">Customize your experience</p>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabId)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-sm font-medium ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
                    >
                        <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : ''}`} />
                        <span>{tab.label}</span>
                        {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto text-white/50" />}
                    </button>
                ))}
            </nav>
            <div className="p-4 border-t border-white/5">
                <button onClick={onClose} className="w-full py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium">Close</button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#09090b] p-6 md:p-10 relative">
            <button onClick={onClose} className="absolute top-6 right-6 hidden md:block p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>

            {activeTab === 'appearance' && (
                <div className="space-y-10 max-w-3xl">
                    <section>
                        <h3 className="text-2xl font-bold text-white mb-4">Typography</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {FONTS.map(font => (
                                <button key={font.id} onClick={() => updateSettings({ appFont: font.id as any })} className={`p-4 rounded-xl border-2 text-left transition-all relative overflow-hidden group ${settings.appFont === font.id ? 'bg-indigo-600/10 border-indigo-500' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}>
                                    <div className="flex justify-between items-start mb-2"><span className={`text-sm font-medium ${settings.appFont === font.id ? 'text-indigo-500' : 'text-zinc-400'}`}>{font.name}</span>{settings.appFont === font.id && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}</div>
                                    <div style={{ fontFamily: font.family }} className="text-2xl text-white">The quick brown fox</div>
                                </button>
                            ))}
                        </div>
                    </section>
                    <div className="h-px bg-white/5" />
                    <section>
                         <h3 className="text-2xl font-bold text-white mb-4">Theme</h3>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {BASE_THEMES.map(theme => (
                                    <button key={theme.id} onClick={() => updateSettings({ baseTheme: theme.id as any })} className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${settings.baseTheme === theme.id ? 'border-indigo-500 bg-zinc-900' : 'border-zinc-800 bg-zinc-900 opacity-60 hover:opacity-100'}`}>
                                        <div className="w-8 h-8 rounded-full shadow-lg border border-white/10 flex items-center justify-center" style={{ backgroundColor: theme.color }}>{theme.id === 'auto' && <Sparkles className="w-4 h-4 text-white" />}{['cosmic', 'oled', 'midnight', 'forest', 'dawn'].includes(theme.id) && <Moon className="w-4 h-4 text-white/50" />}</div>
                                        <span className="text-xs font-medium text-white">{theme.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'preferences' && (
                <div className="space-y-8 max-w-3xl">
                     <section>
                         <h3 className="text-2xl font-bold text-white mb-6">Content Settings</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                                 <h4 className="font-bold text-white mb-4">Spoiler Protection</h4>
                                 <div className="space-y-3">
                                     {[['images', 'Blur Images'], ['overview', 'Hide Descriptions'], ['title', 'Hide Titles']].map(([key, label]) => (
                                         <div key={key} className="flex items-center justify-between">
                                             <span className="text-sm text-zinc-400">{label}</span>
                                             <button onClick={() => toggleSpoiler(key as any)} className={`w-10 h-6 rounded-full transition-colors relative ${settings.spoilerConfig[key as keyof typeof settings.spoilerConfig] ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.spoilerConfig[key as keyof typeof settings.spoilerConfig] ? 'translate-x-4' : ''}`} /></button>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                             <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl">
                                 <h4 className="font-bold text-white mb-4">General</h4>
                                 <div className="space-y-3">
                                     <div className="flex items-center justify-between">
                                         <span className="text-sm text-zinc-400">Ignore Specials (S0)</span>
                                         <button onClick={() => updateSettings({ ignoreSpecials: !settings.ignoreSpecials })} className={`w-10 h-6 rounded-full transition-colors relative ${settings.ignoreSpecials ? 'bg-indigo-600' : 'bg-zinc-700'}`}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.ignoreSpecials ? 'translate-x-4' : ''}`} /></button>
                                     </div>
                                 </div>
                             </div>
                         </div>
                     </section>
                </div>
            )}
            
            {activeTab === 'account' && (
                <div className="space-y-6 max-w-3xl">
                    <h3 className="text-2xl font-bold text-white mb-6">Account</h3>
                    <div className="bg-zinc-900 p-6 rounded-2xl border border-white/5 flex gap-6 items-center">
                        <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-3xl">{user?.username.charAt(0).toUpperCase()}</div>
                        <div>
                            <h4 className="text-lg font-black text-white">{user?.username}</h4>
                            <p className="text-sm text-zinc-500">{user?.is_cloud ? 'Cloud Synced' : 'Local Storage'}</p>
                        </div>
                        <button onClick={logout} className="ml-auto p-3 bg-red-500/10 text-red-500 rounded-2xl"><LogOut className="w-5 h-5" /></button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;