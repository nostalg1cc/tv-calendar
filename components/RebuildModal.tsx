
import React, { useState } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useStore } from '../store';

interface RebuildModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const RebuildModal: React.FC<RebuildModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const { watchlist } = useStore();
    const [status, setStatus] = useState<'idle' | 'working' | 'done'>('idle');

    if (!isOpen) return null;

    const handleRebuild = async () => {
        setStatus('working');
        
        // 1. Remove all cached data related to calendar
        await queryClient.removeQueries({ queryKey: ['calendar_data'] });
        await queryClient.removeQueries({ queryKey: ['media'] });

        // 2. Wait a moment for UI to reflect
        setTimeout(() => {
            // 3. Trigger refetch by invalidating (though removeQueries basically did it)
            queryClient.invalidateQueries({ queryKey: ['calendar_data'] });
            
            setStatus('done');
            
            // Auto close after success
            setTimeout(() => {
                onClose();
                setStatus('idle');
            }, 1500);
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-3xl shadow-2xl p-6 relative overflow-hidden" 
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center">
                    <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                        {status === 'working' ? (
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        ) : status === 'done' ? (
                            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        ) : (
                            <RefreshCw className="w-8 h-8 text-indigo-500" />
                        )}
                    </div>
                    
                    <h2 className="text-xl font-bold text-white mb-2">Rebuild Calendar</h2>
                    
                    {status === 'idle' && (
                        <>
                            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                                This will clear the local cache and force a complete re-sync of all {watchlist.length} items from the data providers. Use this if dates seem incorrect.
                            </p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-xs hover:bg-zinc-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleRebuild}
                                    className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition-colors shadow-lg"
                                >
                                    Start Rebuild
                                </button>
                            </div>
                        </>
                    )}

                    {status === 'working' && (
                        <p className="text-sm text-zinc-400 animate-pulse">Clearing cache and syncing data...</p>
                    )}

                    {status === 'done' && (
                        <p className="text-sm text-emerald-400 font-bold">Successfully rebuilt!</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RebuildModal;
