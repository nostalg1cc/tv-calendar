
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
            <main className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 flex flex-col items-center justify-center border-r border-white/5">
                    <div className="w-full h-full bg-zinc-900/10 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <h2 className="text-2xl font-black text-white/10 uppercase tracking-[1.5em] select-none">Calendar</h2>
                        <p className="text-zinc-700 font-mono text-[10px] mt-4 tracking-widest uppercase">Flush Layout Active</p>
                    </div>
                </div>
            </main>

            {/* Column 3: Agenda (Right Side Placeholder) */}
            <aside className="w-[320px] hidden xl:flex flex-col bg-zinc-950/20">
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-full h-full bg-zinc-900/5 flex flex-col items-center justify-center opacity-50">
                        <h3 className="text-sm font-bold text-zinc-600 uppercase tracking-widest mb-2">Agenda</h3>
                        <p className="text-[10px] text-zinc-700 font-mono italic">No events scheduled</p>
                    </div>
                </div>
            </aside>
        </div>
    );
};

export default V2Dashboard;
