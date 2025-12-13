import React, { useState, useRef, useEffect } from 'react';
import { Tv, ArrowRight, Upload, Key, HelpCircle, RefreshCw, Hourglass, Loader2, AlertTriangle, QrCode, X, Cloud, HardDrive, Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase, isSupabaseConfigured } from '../services/supabase';

const LoginPage: React.FC = () => {
  // Local Auth State
  const [localUsername, setLocalUsername] = useState('');
  const [localApiKey, setLocalApiKey] = useState('');
  
  // Cloud Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cloudUsername, setCloudUsername] = useState(''); // Only for signup
  
  // UI State
  const [mode, setMode] = useState<'local' | 'cloud'>('local');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState('');
  const [cloudLoading, setCloudLoading] = useState(false);

  const { login, importBackup, syncProgress, loading, processSyncPayload } = useAppContext();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Switch to cloud default if configured
  useEffect(() => {
      if (isSupabaseConfigured()) {
          setMode('cloud');
      }
  }, []);

  const handleLocalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localUsername.trim() && localApiKey.trim()) {
      login(localUsername, localApiKey);
    } else {
        setError('Please provide both username and API Key.');
    }
  };

  const handleCloudSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase) return;
      
      setError('');
      setCloudLoading(true);

      try {
          if (authMode === 'signup') {
              const { data, error } = await supabase.auth.signUp({
                  email,
                  password,
                  options: {
                      data: {
                          username: cloudUsername
                      }
                  }
              });
              if (error) throw error;
              alert('Account created! You can now log in.');
              setAuthMode('signin');
          } else {
              const { error } = await supabase.auth.signInWithPassword({
                  email,
                  password
              });
              if (error) throw error;
              // AppContext listens to auth changes and will redirect
          }
      } catch (err: any) {
          setError(err.message || 'Authentication failed');
      } finally {
          setCloudLoading(false);
      }
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
              
              if (!data.user) {
                  throw new Error('Invalid backup file. Missing user data.');
              }

              // Set preview instead of importing immediately
              setImportPreview(data);
          } catch (err) {
              console.error(err);
              setError('Failed to import profile. Invalid file format.');
          }
      };
      reader.readAsText(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = () => {
      if (importPreview) {
          setIsProcessingImport(true);
          importBackup(importPreview);
          setImportPreview(null);
      }
  };

  const handleScan = (result: any) => {
      if (result && result[0]?.rawValue) {
          setShowScanner(false);
          setIsProcessingImport(true);
          processSyncPayload(result[0].rawValue);
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

  if (isProcessingImport) {
     const pct = syncProgress.total > 0 ? Math.round((syncProgress.current / syncProgress.total) * 100) : 0;

     return (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
               <div className="w-full max-w-sm text-center">
                   <div className="mb-8 relative">
                       <div className="w-20 h-20 mx-auto rounded-full border-4 border-white/10 flex items-center justify-center relative">
                           <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                       </div>
                       <div className="absolute top-0 right-0 left-0 bottom-0 flex items-center justify-center">
                           <span className="text-xs font-bold text-white mt-12">{pct}%</span>
                       </div>
                   </div>
                   
                   <h2 className="text-2xl font-bold text-white mb-2">Restoring Profile</h2>
                   <p className="text-slate-400 mb-8">
                       Syncing {syncProgress.total} items...
                   </p>

                   <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
                       <div 
                           className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                           style={{ width: `${pct}%` }}
                       />
                   </div>
                   
                   <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3 text-left">
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-xs text-red-200">
                            <strong>Do not close this window.</strong><br/>
                            We are fetching your calendar data.
                        </p>
                   </div>
               </div>
          </div>
     )
  }

  // --- Render Scanner Overlay ---
  if (showScanner) {
      return (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col">
              <div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 left-0 right-0 z-10">
                  <h2 className="text-white font-bold">Scan QR from Desktop</h2>
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
              </div>
          </div>
      );
  }

  return (
    <>
        <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden">
            
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 text-indigo-500 mb-4 border border-white/10">
                    <Tv className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">TV Calendar</h1>
                <p className="text-slate-400 text-sm">Track your shows across devices.</p>
            </div>

            {/* Mode Switcher */}
            {isSupabaseConfigured() && (
                <div className="flex bg-white/5 p-1 rounded-xl mb-6 border border-white/5">
                    <button 
                        onClick={() => setMode('cloud')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'cloud' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Cloud className="w-4 h-4" /> Cloud
                    </button>
                    <button 
                        onClick={() => setMode('local')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === 'local' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <HardDrive className="w-4 h-4" /> Local
                    </button>
                </div>
            )}

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm mb-6 text-center animate-fade-in">
                    {error}
                </div>
            )}

            {mode === 'cloud' ? (
                // --- CLOUD FORM ---
                <form onSubmit={handleCloudSubmit} className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Email</label>
                        <div className="relative">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                                placeholder="you@example.com"
                                required
                            />
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        </div>
                    </div>
                    
                    {authMode === 'signup' && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Username</label>
                            <input
                                type="text"
                                value={cloudUsername}
                                onChange={(e) => setCloudUsername(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                                placeholder="Display Name"
                                required
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Password</label>
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                                placeholder="••••••••"
                                required
                            />
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={cloudLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {cloudLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            authMode === 'signin' ? <><LogIn className="w-4 h-4" /> Sign In</> : <><UserPlus className="w-4 h-4" /> Create Account</>
                        )}
                    </button>

                    <div className="text-center pt-2">
                        <button 
                            type="button"
                            onClick={() => {
                                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                                setError('');
                            }}
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            {authMode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                        </button>
                    </div>
                </form>
            ) : (
                // --- LOCAL FORM ---
                <form onSubmit={handleLocalSubmit} className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Username</label>
                        <input
                            type="text"
                            value={localUsername}
                            onChange={(e) => setLocalUsername(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
                            placeholder="Enter your name"
                            required
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1.5 ml-1">
                            <label className="block text-sm font-medium text-slate-300">
                                TMDB Access Token
                            </label>
                            <a 
                                href="https://www.themoviedb.org/settings/api" 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"
                            >
                                Get Token <HelpCircle className="w-3 h-3" />
                            </a>
                        </div>
                        <div className="relative">
                            <input
                                type="password"
                                value={localApiKey}
                                onChange={(e) => setLocalApiKey(e.target.value)}
                                className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm placeholder:text-slate-600"
                                placeholder="TMDB_KEY"
                                required
                            />
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-white/10 hover:bg-white/20 border border-white/5 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                    >
                        Enter Local Mode <ArrowRight className="w-4 h-4" />
                    </button>
                    
                    <div className="text-center pt-2">
                        <button 
                            type="button"
                            onClick={() => {
                                handleImportClick();
                            }}
                            className="text-sm text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto"
                        >
                            <Upload className="w-3 h-3" /> Restore Backup
                        </button>
                         <button 
                            type="button"
                            onClick={() => setShowScanner(true)}
                            className="text-sm text-slate-500 hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto mt-2"
                         >
                            <QrCode className="w-3 h-3" /> Scan QR
                        </button>
                    </div>
                </form>
            )}

            <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                className="hidden" 
            />
        </div>
        </div>

        {/* Import Confirmation Modal for Login Page */}
        {importPreview && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="glass-panel rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-fade-in relative overflow-hidden">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
                            <Upload className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Restore Profile</h2>
                        <p className="text-slate-400 text-sm">You are about to restore:</p>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5 space-y-3">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-slate-400 text-sm">User</span>
                            <span className="text-white font-bold">{importPreview.user?.username || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-slate-400 text-sm">TV Shows & Movies</span>
                            <span className="text-white font-bold">{importPreview.watchlist?.length || 0}</span>
                        </div>
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3 mb-6">
                        <Hourglass className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-yellow-200 leading-relaxed">
                           <strong className="block mb-1 text-yellow-100">Estimated Time: ~{calculateEstimate((importPreview.watchlist?.length || 0) + (importPreview.subscribedLists?.reduce((acc: number, l: any) => acc + (l.items?.length || 0), 0) || 0))}</strong>
                           Please do not close the window while the import is processing.
                       </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setImportPreview(null)}
                            className="flex-1 py-3 rounded-lg font-medium text-slate-300 hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmImport}
                            className="flex-1 py-3 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all"
                        >
                            Restore
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default LoginPage;