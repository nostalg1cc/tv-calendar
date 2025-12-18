
import React from 'react';
import V2Sidebar from './V2Sidebar';
import { useAppContext } from '../context/AppContext';

const V2Dashboard: React.FC = () => {
    const { settings } = useAppContext();

    return (
        <div className="flex h-screen w-screen bg-[#020202] text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Column 1: V2 Sidebar - Handles its own positioning (Fixed or Relative) */}
            <V2Sidebar />

            {/* Column 2: Main Content (Calendar Area) */}
            <main className="flex-1 flex flex-col min-w-0 h-full">
                <div className="flex-1 flex flex-col border-r border-white/5">
                    {/* Placeholder for the Actual Calendar Component */}
                    <div className="w-full h-full bg-zinc-900/5 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.03),transparent_50%)]" />
                        <h2 className="text-xl font-black text-white/5 uppercase tracking-[2em] select-none pl-[2em]">Calendar</h2>
                        <div className="absolute bottom-4 left-4 flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                            <p className="text-zinc-800 font-mono text-[9px] tracking-widest uppercase">Live Viewport / Flush</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Column 3: Agenda (Right Sidebar) */}
            <aside className="w-[300px] hidden xl:flex flex-col bg-zinc-950/40">
                <div className="flex-1 flex flex-col">
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-30">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] mb-2">Agenda</h3>
                        <p className="text-[9px] text-zinc-800 font-mono italic">No upcoming events</p>
                    </div>
                </div>
            </aside>
        </div>
    );
};

export default V2Dashboard;
