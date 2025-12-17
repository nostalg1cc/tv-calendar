
import React from 'react';
import V2Sidebar from './V2Sidebar';
import { useAppContext } from '../../context/AppContext';

// This layout is completely separate from V1
const V2Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { settings } = useAppContext();

    return (
        <div className="flex h-screen w-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden font-sans selection:bg-indigo-500/30">
            {/* V2 Navigation */}
            <V2Sidebar />

            {/* Main Content Area - Modern "Card" feel if desired, or full bleed */}
            <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden bg-[var(--bg-main)]">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-900/10 to-transparent pointer-events-none z-0" />
                
                <div className="relative z-10 w-full h-full flex flex-col">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default V2Layout;
