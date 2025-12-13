import React from 'react';
import { Monitor, Smartphone, X, ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const MobileAddWarning: React.FC = () => {
  const { isMobileWarningOpen, closeMobileWarning } = useAppContext();

  if (!isMobileWarningOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <div className="glass-panel w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden">
             
             {/* Icon Graphic */}
             <div className="flex items-center justify-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                    <Smartphone className="w-6 h-6 text-slate-400" />
                 </div>
                 <ArrowRight className="w-5 h-5 text-indigo-500 animate-pulse" />
                 <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <Monitor className="w-8 h-8 text-white" />
                 </div>
             </div>

             <h2 className="text-xl font-bold text-white text-center mb-2">Better on Desktop</h2>
             <p className="text-slate-400 text-center text-sm mb-6 leading-relaxed">
                 Adding shows is easier on your PC! You can manage your library on a big screen and then 
                 <strong className="text-indigo-400"> sync to mobile</strong> instantly via QR code in Settings.
             </p>

             <div className="space-y-3">
                 <button 
                    onClick={() => closeMobileWarning(false)}
                    className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                 >
                     Understand
                 </button>
                 <button 
                    onClick={() => closeMobileWarning(true)}
                    className="w-full py-3 bg-white/5 text-slate-400 hover:text-white rounded-xl font-medium transition-colors text-xs"
                 >
                     Don't show this again
                 </button>
             </div>
        </div>
    </div>
  );
};

export default MobileAddWarning;