import React, { useState } from 'react';
import { Tv, ArrowRight, Upload, Key, Loader2, AlertTriangle, Cloud, HardDrive, Mail, Lock, UserPlus, LogIn, Database } from 'lucide-react';
import { useAuth } from '../../context/v2/AuthContext';
import { supabase, configureSupabase, getStoredSupabaseConfig } from '../../services/supabase';

const V2LoginPage: React.FC = () => {
  const { login, authLoading } = useAuth();
  
  const [authMethod, setAuthMethod] = useState<'cloud' | 'local'>('cloud');
  const [flow, setFlow] = useState<'signin' | 'signup'>('signin');
  const [showConfig, setShowConfig] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [localKey, setLocalKey] = useState('');
  const [configUrl, setConfigUrl] = useState(getStoredSupabaseConfig()?.url || '');
  const [configKey, setConfigKey] = useState(getStoredSupabaseConfig()?.key || '');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCloudSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setBusy(true);

      if (!supabase) {
          setError('Database not configured.');
          setBusy(false);
          setShowConfig(true); 
          return;
      }

      try {
          if (flow === 'signup') {
              const { error } = await supabase.auth.signUp({
                  email,
                  password,
                  options: { data: { username } }
              });
              if (error) throw error;
              alert('Account created! Please log in.');
              setFlow('signin');
          } else {
              const { error } = await supabase.auth.signInWithPassword({ email, password });
              if (error) throw error;
          }
      } catch (err: any) {
          setError(err.message || 'Authentication failed');
      } finally {
          setBusy(false);
      }
  };

  const handleLocalSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!username.trim() || !localKey.trim()) {
          setError('Username and API Key are required.');
          return;
      }
      login(username, localKey);
  };

  const handleConfigSave = (e: React.FormEvent) => {
      e.preventDefault();
      try {
          configureSupabase(configUrl, configKey);
          setShowConfig(false);
      } catch (err: any) {
          setError(err.message);
      }
  };

  const isLoading = busy || authLoading;

  return (
      <div className="min-h-screen w-full bg-[#020202] text-zinc-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
          
          <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/10 blur-[120px] rounded-full opacity-50" />
              <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[120px] rounded-full opacity-50" />
          </div>

          <div className="w-full max-w-md relative z-10 animate-fade-in-up">
              <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-2xl shadow-indigo-900/30 mb-6 ring-1 ring-white/10">
                      <Tv className="w-10 h-10" />
                  </div>
                  <h1 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase">TV Calendar</h1>
                  <p className="text-sm text-zinc-500 font-medium">V2 Architecture • Segmented Logic</p>
              </div>

              <div className="bg-[#09090b] border border-white/10 rounded-3xl p-1 shadow-2xl overflow-hidden backdrop-blur-xl">
                  <div className="flex p-1.5 gap-1 bg-zinc-900/50 rounded-t-[22px]">
                      <button onClick={() => setAuthMethod('cloud')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${authMethod === 'cloud' ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}>
                          <Cloud className="w-4 h-4" /> Cloud
                      </button>
                      <button onClick={() => setAuthMethod('local')} className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${authMethod === 'local' ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}>
                          <HardDrive className="w-4 h-4" /> Local
                      </button>
                  </div>

                  <div className="p-8 bg-[#09090b]">
                      {error && (
                          <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-xs font-bold leading-relaxed">
                              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>{error}</span>
                          </div>
                      )}

                      {authMethod === 'cloud' && (
                          showConfig ? (
                              <form onSubmit={handleConfigSave} className="space-y-5">
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-zinc-500 uppercase">URL</label>
                                      <input type="text" value={configUrl} onChange={e => setConfigUrl(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 transition-all" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="text-[10px] font-black text-zinc-500 uppercase">Key</label>
                                      <input type="password" value={configKey} onChange={e => setConfigKey(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 transition-all" />
                                  </div>
                                  <button type="submit" className="w-full py-3 bg-white text-black rounded-xl text-xs font-bold">Save Config</button>
                              </form>
                          ) : (
                              <form onSubmit={handleCloudSubmit} className="space-y-5">
                                  <div className="flex bg-zinc-900 p-1 rounded-xl mb-2">
                                      {['signin', 'signup'].map(f => (
                                          <button key={f} type="button" onClick={() => setFlow(f as any)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${flow === f ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}>{f === 'signin' ? 'Sign In' : 'Sign Up'}</button>
                                      ))}
                                  </div>
                                  {flow === 'signup' && (
                                      <div className="relative"><UserPlus className="absolute left-3 top-3 w-4 h-4 text-zinc-600" /><input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-indigo-500 transition-all" placeholder="Username" /></div>
                                  )}
                                  <div className="relative"><Mail className="absolute left-3 top-3 w-4 h-4 text-zinc-600" /><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-indigo-500 transition-all" placeholder="Email" /></div>
                                  <div className="relative"><Lock className="absolute left-3 top-3 w-4 h-4 text-zinc-600" /><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-indigo-500 transition-all" placeholder="Password" /></div>
                                  <button type="submit" disabled={isLoading} className="w-full py-4 bg-white hover:bg-zinc-200 text-black rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all">
                                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />} {flow === 'signin' ? 'Sign In' : 'Create Account'}
                                  </button>
                                  <button type="button" onClick={() => setShowConfig(true)} className="w-full text-center text-xs text-zinc-600 hover:text-white flex items-center justify-center gap-2"><Database className="w-3 h-3" /> Connection Settings</button>
                              </form>
                          )
                      )}

                      {authMethod === 'local' && (
                          <form onSubmit={handleLocalSubmit} className="space-y-5">
                              <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 mb-2"><p className="text-xs text-zinc-400">Browser local storage only.</p></div>
                              <div className="space-y-1.5"><label className="text-[10px] font-black text-zinc-500 uppercase">Username</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-500 transition-all" placeholder="Name" /></div>
                              <div className="space-y-1.5"><label className="text-[10px] font-black text-zinc-500 uppercase">TMDB Token</label><div className="relative"><Key className="absolute left-3 top-3 w-4 h-4 text-zinc-600" /><input type="password" value={localKey} onChange={e => setLocalKey(e.target.value)} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-indigo-500 transition-all" placeholder="TMDB Read Access Token" /></div></div>
                              <button type="submit" className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all">Continue Locally <ArrowRight className="w-4 h-4" /></button>
                          </form>
                      )}
                  </div>
              </div>
          </div>
      </div>
  );
};

export default V2LoginPage;