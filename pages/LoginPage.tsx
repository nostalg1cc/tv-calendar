import React, { useState, useRef, useEffect } from 'react';
import { Tv, ArrowRight, Upload, Key, HelpCircle, RefreshCw, Hourglass, Loader2, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const { login, importBackup, syncProgress, loading } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Reset local processing state when global loading stops (import finished)
  // In the login page context, usually we'd redirect or just show the main app once user is set.
  // But importBackup sets the user, so the AppRoutes will unmount LoginPage and mount Layout.
  // This useEffect ensures we see the progress bar until that transition happens.
  useEffect(() => {
      // If we are authenticated (user is set in context), the main App component will switch views.
      // But if we are just "loading" data inside context, we stay here.
      // Actually, once importBackup runs, `user` is set, so this component unmounts.
      // BUT, we want to block until data is fetched.
      // The ProtectedRoute/AppRoutes logic handles the view switch. 
      // We might not need to manually handle "finish" here because the component will die.
  }, [loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() && apiKey.trim()) {
      login(username, apiKey);
    } else {
        setError('Please provide both username and API Key.');
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

  // --- Render Processing/Syncing Overlay ---
  // Note: Even if user context is set, we might still be on this page for a split second, or the app might re-render.
  // In `App.tsx`, if `user` is set, `LoginPage` is replaced by `Layout`.
  // So `isProcessingImport` here is transient. 
  // However, because `importBackup` sets the user, this component will likely unmount immediately.
  // To show the progress bar properly, we should probably delay setting the user until fetching is done, 
  // OR rely on a global loading overlay in `App.tsx` or `Layout`.
  // Given current architecture, let's keep it simple: We show it here. If the app transitions, 
  // the Main Layout should probably handle a global loading state if `loading` is true.
  
  // For now, `importBackup` sets the user immediately. So this component unmounts.
  // The Main App will load. The Main App `Layout` should probably show a global loader if `loading` is true.
  // BUT the user asked for a "Don't close window" message during import.
  // Since we switch views, we need to ensure the user knows it's still working.
  // We can add a Global Loader to `App.tsx`?
  // Let's rely on the fact that `App.tsx` renders `Layout` which renders `Navbar`.
  // `CalendarPage` has a loader. 
  // Let's add a Global Loader in `App.tsx` or `Layout`? 
  // No, let's keep the logic here for the 'Preview' and 'Confirmation'.
  // Once confirmed, if the page switches, that's fine, as long as the user sees data populating.
  // BUT, if we want a *blocking* "Don't Close" modal, we need it to persist.
  
  // Actually, if we look at `AppContext`: `importBackup` sets `user` -> state change -> `AppRoutes` rerenders -> `LoginPage` unmounts -> `Layout` mounts.
  // The `refreshEpisodes` happens in `useEffect` in `AppProvider`.
  // So the `loading` state will be true in the new view.
  // We should add the Blocking Overlay to `Layout` or `App` to ensure it persists across the view change.
  // OR, we just render the overlay here.

  if (isProcessingImport) {
     // If we are here, it means we clicked confirm.
     // If `user` was set, we might be unmounted.
     // But if we are still here, show the loader.
     const pct = syncProgress.total > 0 ? Math.round((syncProgress.current / syncProgress.total) * 100) : 0;

     return (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-fade-in">
               <div className="w-full max-w-sm text-center">
                   <div className="mb-8 relative">
                       <div className="w-20 h-20 mx-auto rounded-full border-4 border-slate-800 flex items-center justify-center relative">
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

                   {/* Progress Bar */}
                   <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
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

  return (
    <>
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
            <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 text-indigo-500 mb-4">
                <Tv className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">TV Calendar</h1>
            <p className="text-slate-400">Track your shows and never miss an episode.</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm mb-6 text-center">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Username
                </label>
                <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Enter your name"
                required
                />
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <label htmlFor="apiKey" className="block text-sm font-medium text-slate-300">
                        TMDB Read Access Token (v4)
                    </label>
                    <a 
                        href="https://www.themoviedb.org/settings/api" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                        title="Go to TMDB Settings -> API to generate a Read Access Token"
                    >
                        <HelpCircle className="w-3 h-3" /> Get Token
                    </a>
                </div>
                <div className="relative">
                    <input
                        type="password"
                        id="apiKey"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm"
                        placeholder="eyJhbGciOiJIUzI1NiJ9..."
                        required
                    />
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                    Your key is stored locally in your browser and used only for API requests.
                </p>
            </div>

            <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-lg shadow-indigo-500/20"
            >
                Get Started <ArrowRight className="w-4 h-4" />
            </button>
            </form>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-slate-800 text-slate-500">Already have a profile?</span>
                </div>
            </div>

            <button 
                onClick={handleImportClick}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all border border-slate-600"
            >
                <Upload className="w-4 h-4" /> Import Profile Backup
            </button>
            <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                onChange={handleFileChange}
                className="hidden" 
            />

            <div className="mt-8 text-center text-xs text-slate-500">
            <p>Powered by TMDB API.</p>
            </div>
        </div>
        </div>

        {/* Import Confirmation Modal for Login Page */}
        {importPreview && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in relative overflow-hidden">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
                            <Upload className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Restore Profile</h2>
                        <p className="text-slate-400 text-sm">You are about to restore:</p>
                    </div>

                    <div className="bg-slate-800 rounded-xl p-4 mb-6 border border-white/5 space-y-3">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-slate-400 text-sm">User</span>
                            <span className="text-white font-bold">{importPreview.user?.username || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-slate-400 text-sm">TV Shows & Movies</span>
                            <span className="text-white font-bold">{importPreview.watchlist?.length || 0}</span>
                        </div>
                        {importPreview.subscribedLists?.length > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-400 text-sm">Subscribed Lists</span>
                                    <span className="text-white font-bold">{importPreview.subscribedLists.length}</span>
                                </div>
                        )}
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
                            className="flex-1 py-3 rounded-lg font-medium text-slate-300 hover:bg-slate-800 transition-colors"
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