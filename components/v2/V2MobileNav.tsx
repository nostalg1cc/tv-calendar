
import React from 'react';
import { Calendar, Compass, List, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

const V2MobileNav: React.FC = () => {
    const location = useLocation();
    const { user } = useAppContext();
    
    const isActive = (path: string) => location.pathname === path || (path !== '/v2' && location.pathname.startsWith(path));

    const NavItem = ({ to, icon: Icon }: any) => {
        const active = isActive(to);
        return (
            <Link 
                to={to} 
                className={`
                    relative flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300
                    ${active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}
                `}
            >
                <div className={`absolute inset-0 bg-indigo-600 rounded-full opacity-0 transition-opacity duration-300 ${active ? 'opacity-100' : ''}`} />
                <Icon className={`w-5 h-5 z-10 relative ${active ? 'fill-current' : ''}`} />
            </Link>
        );
    };

    return (
        <div className="md:hidden fixed bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <div className="pointer-events-auto bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-full px-6 py-2 flex items-center gap-6 shadow-2xl shadow-black/50 ring-1 ring-white/5">
                <NavItem to="/v2" icon={Calendar} />
                <NavItem to="/discover" icon={Compass} />
                <NavItem to="/watchlist" icon={List} />
                <Link to="/" className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-400">
                    {user?.username?.[0].toUpperCase()}
                </Link>
            </div>
        </div>
    );
};

export default V2MobileNav;
