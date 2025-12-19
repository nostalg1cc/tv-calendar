
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import { useStore } from './store';
import { Toaster } from 'react-hot-toast';
import V2Dashboard from './v2/V2Dashboard';
import V2LoginPage from './pages/v2/LoginPage';
import { supabase } from './services/supabase';

// --- PERSISTENCE SETUP ---
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            gcTime: 1000 * 60 * 60 * 24 * 7, // Garbage collect after 7 days
            staleTime: 1000 * 60 * 60 * 24, // Consider data stale after 24 hours (prevents refetch on reload)
        }
    }
});

const persister = createAsyncStoragePersister({
    storage: {
        getItem: async (key) => {
            const val = await get(key);
            return val;
        },
        setItem: async (key, value) => {
            await set(key, value);
        },
        removeItem: async (key) => {
            await del(key);
        },
    },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isAuthenticated = useStore((state) => state.isAuthenticated);
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return <>{children}</>;
};

const AuthListener = () => {
    const login = useStore((state) => state.login);
    const logout = useStore((state) => state.logout);

    useEffect(() => {
        if (!supabase) return;
        
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                login({
                    id: session.user.id,
                    username: session.user.user_metadata.username || session.user.email?.split('@')[0] || 'User',
                    email: session.user.email,
                    is_cloud: true
                });
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                login({
                    id: session.user.id,
                    username: session.user.user_metadata.username || session.user.email?.split('@')[0] || 'User',
                    email: session.user.email,
                    is_cloud: true
                });
            } else if (event === 'SIGNED_OUT') {
                logout();
            }
        });
        return () => subscription.unsubscribe();
    }, []);
    return null;
};

const App: React.FC = () => {
  return (
    <PersistQueryClientProvider 
        client={queryClient} 
        persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
    >
        <HashRouter>
            <AuthListener />
            <div className="bg-[#020202] text-zinc-100 min-h-screen font-sans antialiased selection:bg-indigo-500/30">
                <Routes>
                    <Route path="/login" element={<V2LoginPage />} />
                    <Route path="/*" element={
                        <ProtectedRoute>
                            <V2Dashboard />
                        </ProtectedRoute>
                    } />
                </Routes>
                <Toaster position="bottom-right" toastOptions={{ style: { background: '#18181b', color: '#fff', border: '1px solid #27272a' } }} />
            </div>
        </HashRouter>
    </PersistQueryClientProvider>
  );
};
export default App;
