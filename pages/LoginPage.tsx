import React, { useState, useRef, useEffect } from 'react';
import { Tv, ArrowRight, Upload, Key, HelpCircle, RefreshCw, Hourglass, Loader2, AlertTriangle, QrCode, X, Cloud, HardDrive, Mail, Lock, UserPlus, LogIn, Database, Settings, PlugZap, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase, isSupabaseConfigured, configureSupabase, getStoredSupabaseConfig, clearSupabaseConfig } from '../services/supabase';
import { Navigate } from 'react-router-dom';

const V2LoginPage: React.FC = () => {
  const { login, importBackup, syncProgress, loading, processSyncPayload, user } = useAppContext();
  
  // -- State --
  const [authMethod, setAuthMethod] = useState<'cloud' | 'local'>('cloud');
  const [flow, setFlow] = useState<'signin' | 'signup'>('signin');
  const [showConfig, setShowConfig] = useState(false);
  
  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // Cloud Signup or Local Login
  const [localKey, setLocalKey] = useState('');
  
  // Config Inputs
  const [configUrl, setConfigUrl] = useState('');
  const [configKey, setConfigKey] = useState('');

  // UI Status
  const [localLoading, setLocalLoading] = useState(false); // Local loader to prevent double spinners
  const [error, setError] = useState('');
  const [importPreview, setImportPreview] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-redirect if already logged in
  if (user) {
      return <Navigate to="/" replace />;
  }

  useEffect(() => {
      // Load stored config for display
      const stored = getStoredSupabaseConfig();
      if (stored) {
          setConfigUrl(stored.url || '');
          setConfigKey(stored.key || '');
      } else if (!isSupabaseConfigured() && authMethod === 'cloud') {
           // If configured to cloud but no client, allow UI to show normally but config modal is accessible
      }
  }, [authMethod]);

  // -- Handlers --

  const handleCloudSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLocalLoading(true);

      if (!supabase) {
          setError('Database not connected. Please configure connection.');
          setLocalLoading(false);
          setShowConfig(true); 
          return;
      }

      try {
          if (flow === 'signup') {
              const { data, error } = await supabase.auth.signUp({
                  email,
                  password,
                  options: { data: { username } }
              });
              if (error) throw error;
              alert('Account created! You can now log in.');
              setFlow('signin');
              setLocalLoading(false);
          } else {
              const { error } = await supabase.auth.signInWithPassword({ email, password });
              if (error) throw error;
              // AppContext listener will detect session change
              // We keep loading true until redirect happens
          }
      } catch (err: any) {
          setError(err.message || 'Authentication failed');
          setLocalLoading(false);
      }
  };

  const handleLocalSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (!username.trim() || !localKey.trim()) {
          setError('Username and API Key are required.');
          return;
      }
      login(username, localKey);
  };

  const handleConfigSave = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLocalLoading(true);
      
      setTimeout(() => {
          try {
              configureSupabase(configUrl, configKey);
              setShowConfig(false);
          } catch (err: any) {
              setError(err.message);
              setLocalLoading(false);
          }
      }, 800);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              const data = JSON.parse(ev.target?.result as string);
              if (!data.user) throw new Error("Invalid backup");
              setImportPreview(data);
          } catch {
              setError("Failed to parse backup file.");
          }
      };
      reader.readAsText(file);
      if(fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleScan = (result: any) => {
      if (result?.[0]?.rawValue) {
          setShowScanner(false);
          setLocalLoading(true); 
          processSyncPayload(result[0].rawValue);
      }
  };

  // -- Render Helpers --

  const TabButton = ({ id, label, icon: Icon }: { id: 'cloud' | 'local', label: string, icon: any }) => (
      <button
          type="button"
          onClick={() => { setAuthMethod(id); setError(''); setShowConfig(false); }}
          className={`
              flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all
              ${authMethod === id 
                  ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}
          `}
      >
          <Icon className="w-4 h-4" />
          {label}
      </button>
  );

  return (
      <div className="min-h-screen w-full bg-[#020202] text-zinc-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
          
          {/* Background Ambience */}
          <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/10 blur-[120px] rounded-full opacity-50" />
              <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full opacity-50" />
          </div>

          <div className="w-full max-w-md relative z-10 animate-fade-in-up">
              
              {/* Logo / Header */}
              <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-2xl shadow-indigo-900/30 mb-6 ring-1 ring-white/10">
                      <Tv className="w-10 h-10" />
                  </div>
                  <h1 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase">TV Calendar</h1>
                  <p className="text-sm text-zinc-500 font-medium">Sync your entertainment life across devices.</p>
              </div>

              {/* Main Card */}
              <div className="bg-[#09090b] border border-white/10 rounded-3xl p-1 shadow-2xl overflow-hidden backdrop-blur-xl">
                  
                  {/* Tabs */}
                  <div className="flex p-1.5 gap-1 bg-zinc-900/50 rounded-t-[22px]">
                      <TabButton id="cloud" label="Cloud Sync" icon={Cloud} />
                      <TabButton id="local" label="Local Device" icon={HardDrive} />
                  </div>

                  <div className="p-8 bg-[#09090b]">
                      
                      {/* Error Banner */}
                      {error && (
                          <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-xs font-bold leading-relaxed">
                              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{error}</span>
                          </div>
                      )}

                      {/* --- CLOUD FLOW --- */}
                      {authMethod === 'cloud' && (
                          showConfig ? (
                              // DB CONFIG FORM
                              <form onSubmit={handleConfigSave} className="space-y-5 animate-enter">
                                  <div className="text-center mb-6">
                                      <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-400 border border-zinc-700">
                                          <Database className="w-6 h-6" />
                                      </div>
                                      <h3 className="text-sm font-bold text-white">Connection Setup</h3>
                                      <p className="text-xs text-zinc-500 mt-1">Connect to your Supabase instance.</p>
                                  </div>

                                  <div className="space-y-4">
                                      <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Project URL</label>
                                          <input 
                                              type="text" 
                                              value={configUrl}
                                              onChange={e => setConfigUrl(e.target.value)}
                                              placeholder="https://xyz.supabase.co"
                                              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-zinc-700"
                                              required
                                          />
                                      </div>
                                      <div className="space-y-1.5">
                                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Anon Key</label>
                                          <input 
                                              type="password" 
                                              value={configKey}
                                              onChange={e => setConfigKey(e.target.value)}
                                              placeholder="eyJh..."
                                              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all font-mono placeholder:text-zinc-700"
                                              required
                                          />
                                      </div>
                                  </div>

                                  <div className="flex gap-3 pt-2">
                                      <button 
                                          type="button" 
                                          onClick={() => setShowConfig(false)}
                                          className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-colors"
                                      >
                                          Cancel
                                      </button>
                                      <button 
                                          type="submit" 
                                          disabled={localLoading}
                                          className="flex-1 py-3.5 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                      >
                                          {localLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
                                          Save
                                      </button>
                                  </div>
                              </form>
                          ) : (
                              // AUTH FORM
                              <form onSubmit={handleCloudSubmit} className="space-y-5 animate-enter">
                                  {/* Toggle Sign In / Sign Up */}
                                  <div className="flex bg-zinc-900 p-1 rounded-xl mb-2">
                                      {['signin', 'signup'].map(f => (
                                          <button
                                              key={f}
                                              type="button"
                                              onClick={() => setFlow(f as any)}
                                              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${flow === f ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/5' : 'text-zinc-500 hover:text-zinc-300'}`}
                                          >
                                              {f === 'signin' ? 'Sign In' : 'Create Account'}
                                          </button>
                                      ))}
                                  </div>

                                  {flow === 'signup' && (
                                      <div className="space-y-1.5 animate-enter">
                                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Username</label>
                                          <div className="relative">
                                              <UserPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                              <input 
                                                  type="text" 
                                                  value={username} 
                                                  onChange={e => setUsername(e.target.value)}
                                                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-zinc-700"
                                                  placeholder="Display Name"
                                                  required
                                              />
                                          </div>
                                      </div>
                                  )}

                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email</label>
                                      <div className="relative">
                                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                          <input 
                                              type="email" 
                                              value={email} 
                                              onChange={e => setEmail(e.target.value)}
                                              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-zinc-700"
                                              placeholder="name@example.com"
                                              required
                                          />
                                      </div>
                                  </div>

                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Password</label>
                                      <div className="relative">
                                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                          <input 
                                              type="password" 
                                              value={password} 
                                              onChange={e => setPassword(e.target.value)}
                                              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-zinc-700"
                                              placeholder="••••••••"
                                              required
                                          />
                                      </div>
                                  </div>

                                  <button 
                                      type="submit" 
                                      disabled={localLoading}
                                      className="w-full py-4 bg-white hover:bg-zinc-200 text-black rounded-xl text-sm font-bold transition-all shadow-lg shadow-white/5 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                                  >
                                      {localLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (flow === 'signin' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />)}
                                      {flow === 'signin' ? 'Sign In' : 'Create Account'}
                                  </button>

                                  <div className="pt-4 text-center">
                                      <button 
                                          type="button"
                                          onClick={() => setShowConfig(true)}
                                          className="text-xs text-zinc-600 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1.5 mx-auto font-medium"
                                      >
                                          <Settings className="w-3 h-3" /> Connection Settings
                                      </button>
                                  </div>
                              </form>
                          )
                      )}

                      {/* --- LOCAL FLOW --- */}
                      {authMethod === 'local' && (
                          <form onSubmit={handleLocalSubmit} className="space-y-5 animate-enter">
                              <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 mb-2">
                                  <p className="text-xs text-zinc-400 leading-relaxed">
                                      Data is stored in your browser's local storage. Recommended for single-device use only.
                                  </p>
                              </div>

                              <div className="space-y-1.5">
                                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Username</label>
                                  <input 
                                      type="text" 
                                      value={username} 
                                      onChange={e => setUsername(e.target.value)}
                                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-zinc-700"
                                      placeholder="Your Name"
                                      required
                                  />
                              </div>

                              <div className="space-y-1.5">
                                  <div className="flex justify-between items-center px-1">
                                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">TMDB Read Access Token</label>
                                      <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-bold">Get Token <ArrowRight className="w-3 h-3" /></a>
                                  </div>
                                  <div className="relative">
                                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                                      <input 
                                          type="password" 
                                          value={localKey} 
                                          onChange={e => setLocalKey(e.target.value)}
                                          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all font-mono placeholder:text-zinc-700"
                                          placeholder="eyJh..."
                                          required
                                      />
                                  </div>
                              </div>

                              <button 
                                  type="submit" 
                                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg border border-zinc-700 mt-4 flex items-center justify-center gap-2"
                              >
                                  Continue Locally <ChevronRight className="w-4 h-4" />
                              </button>

                              <div className="grid grid-cols-2 gap-3 pt-6 border-t border-white/5 mt-6">
                                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-zinc-500 hover:text-white transition-colors bg-zinc-900 rounded-xl hover:bg-zinc-800">
                                      <Upload className="w-3 h-3" /> Restore Backup
                                  </button>
                                  <button type="button" onClick={() => setShowScanner(true)} className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-zinc-500 hover:text-white transition-colors bg-zinc-900 rounded-xl hover:bg-zinc-800">
                                      <QrCode className="w-3 h-3" /> Scan Sync
                                  </button>
                              </div>
                          </form>
                      )}
                  </div>
              </div>

              {/* Footer */}
              <div className="text-center mt-8">
                  <p className="text-[10px] text-zinc-700 font-mono uppercase tracking-widest">
                      Secure • Private • Open Source
                  </p>
              </div>
          </div>

          {/* Hidden File Input */}
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImport} className="hidden" />

          {/* Scanner Overlay */}
          {showScanner && (
              <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
                  <div className="flex justify-between items-center p-6 absolute top-0 w-full z-10 bg-gradient-to-b from-black/80 to-transparent">
                      <h2 className="text-white font-bold">Scan Settings QR</h2>
                      <button onClick={() => setShowScanner(false)} className="p-3 bg-white/10 rounded-full text-white backdrop-blur-md">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                      <Scanner onScan={handleScan} />
                  </div>
              </div>
          )}

          {/* Import Confirm Modal */}
          {importPreview && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                  <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-enter">
                      <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                              <CheckCircle2 className="w-8 h-8" />
                          </div>
                          <h3 className="text-lg font-bold text-white">Restore Profile?</h3>
                          <p className="text-sm text-zinc-400 mt-1">Found data for <strong className="text-white">{importPreview.user?.username}</strong></p>
                      </div>
                      <div className="flex gap-3">
                          <button onClick={() => setImportPreview(null)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold hover:text-white">Cancel</button>
                          <button onClick={() => { setImportPreview(null); importBackup(importPreview); }} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500">Restore</button>
                      </div>
                  </div>
              </div>
          )}

           {/* Full Screen Loader Overlay */}
          {(loading || localLoading) && (
             <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center">
                 <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                 <p className="text-zinc-400 font-medium animate-pulse">Authenticating...</p>
             </div>
          )}
      </div>
  );
};

export default V2LoginPage;