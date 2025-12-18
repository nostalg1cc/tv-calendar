
import React from 'react';
import V2Sidebar from './V2Sidebar';
import { useAppContext } from '../context/AppContext';

const V2Dashboard: React.FC = () => {
    const { settings } = useAppContext();
    const sidebarMode = settings.v2SidebarMode || 'fixed';

    return (
        <div className="flex h-screen w-screen bg-[#020202] text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Column 1: V2 Sidebar */}
            <V2Sidebar />

            {/* Column 2: Main Content (Calendar Placeholder) */}
            <main className={`
                flex-1 flex flex-col min-w-0 transition-all duration-500 ease-in-out
                ${sidebarMode === 'fixed' ? 'ml-0' : sidebarMode === 'collapsed' ? 'ml-0' : 'ml-0'}
            `}>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="w-full h-full rounded-[2.5rem] bg-zinc-900/40 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <h2 className="text-4xl font-black text-white/20 uppercase tracking-[1em] select-none">Calendar</h2>
                        <p className="text-zinc-500 font-mono text-xs mt-4 tracking-widest uppercase">Coming Soon in V2</p>
                    </div>
                </div>
            </main>

            {/* Column 3: Agenda (Right Side Placeholder) */}
            <aside className="w-[380px] hidden xl:flex flex-col border-l border-white/5 bg-zinc-950/20">
                <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-full h-full rounded-[2.5rem] bg-zinc-900/20 border border-white/5 flex flex-col items-center justify-center opacity-50">
                        <h3 className="text-xl font-bold text-zinc-500 uppercase tracking-widest mb-2">Agenda</h3>
                        <p className="text-xs text-zinc-600 font-mono">Real-time schedule</p>
                    </div>
                </div>
            </aside>
        </div>
    );
};

export default V2Dashboard;
