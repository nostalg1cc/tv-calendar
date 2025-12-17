
import React, { useState, useEffect } from 'react';
import { Zap, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const V2PromoModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has seen this promo or is already on V2
    const hasSeen = localStorage.getItem('tv_calendar_v2_promo_seen');
    const isV2 = window.location.hash.includes('/v2');
    
    if (!hasSeen && !isV2) {
        // Delay showing to not block initial render
        const t = setTimeout(() => setIsOpen(true), 2000);
        return () => clearTimeout(t);
    }
  }, []);

  const handleDismiss = () => {
      setIsOpen(false);
      localStorage.setItem('tv_calendar_v2_promo_seen', 'true');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] max-w-sm w-full animate-fade-in-up">
        <div className="bg-zinc-900 border border-indigo-500/30 p-5 rounded-2xl shadow-2xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none" />
            
            <button 
                onClick={handleDismiss} 
                className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                    <Zap className="w-6 h-6 text-white fill-white" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">New Calendar UI</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                        We've built a brand new, unified dashboard experience. It's faster, cleaner, and features a smart agenda view.
                    </p>
                    <Link 
                        to="/v2" 
                        onClick={handleDismiss}
                        className="inline-flex items-center gap-2 text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        Try V2 Beta <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    </div>
  );
};

export default V2PromoModal;
