
import React from 'react';
import V2Sidebar from './V2Sidebar';
import V2Calendar from './V2Calendar';
import { useAppContext } from '../context/AppContext';

const V2Dashboard: React.FC = () => {
    return (
        <div className="flex h-screen w-screen bg-[#020202] text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* Column 1: V2 Sidebar */}
            <V2Sidebar />

            {/* Column 2: Main Content (Calendar Area) */}
            <main className="flex-1 flex flex-col min-w-0 h-full">
                <V2Calendar />
            </main>

            {/* Column 3: Agenda (Right Sidebar) */}
            <aside className="w-[300px] hidden xl:flex flex-col bg-zinc-950/20 border-l border-white/5">
                <div className="h-20 shrink-0 border-b border-white/5 flex items-center px-6">
                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Upcoming</h3>
                </div>
                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                    <div className="w-full h-full flex flex-col items-center justify-center opacity-20 p-8 text-center">
                        <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
                            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.5em] -mr-[0.5em]">TBD</h3>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">Select a day on the calendar to view full agenda details</p>
                    </div>
                </div>
            </aside>
        </div>
    );
};

export default V2Dashboard;
