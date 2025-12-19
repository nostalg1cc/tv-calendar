
import React, { useState, useEffect, useRef } from 'react';
import { Globe, MapPin, Wifi, Activity, ShieldAlert, History, RotateCcw, Trash2, Globe2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PRIMARY_API = 'https://ipwho.is/?lang=en';
const FALLBACK_API = 'https://ipapi.co/json';
const IPV6_URL = 'https://api6.ipify.org?format=json';
const HISTORY_KEY = 'ip_visit_history_v1';
const KILL_SWITCH_INTERVAL = 5000;

interface IPData {
    ip: string;
    country: string;
    country_code: string;
    city: string;
    region: string;
    latitude: number;
    longitude: number;
    timezone: string;
    connection: {
        isp: string;
        org: string;
        asn: string;
        domain: string;
    };
    ipv6?: string;
}

interface HistoryItem extends Partial<IPData> {
    timestamp: number;
    securityAlert?: boolean;
    changed?: string;
}

const V2IPoint: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<IPData | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [killSwitchActive, setKillSwitchActive] = useState(false);
    const [sessionIP, setSessionIP] = useState<string | null>(null);
    
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    const addHistoryItem = (item: HistoryItem) => {
        setHistory(prev => {
            const newHist = [item, ...prev].slice(0, 100);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(newHist));
            return newHist;
        });
    };

    // Initial Load
    useEffect(() => {
        const loadHistory = () => {
            try {
                const stored = localStorage.getItem(HISTORY_KEY);
                if (stored) setHistory(JSON.parse(stored));
            } catch (e) { console.error(e); }
        };
        
        loadHistory();
        refreshIP();

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, []);

    // Map Effect
    useEffect(() => {
        if (data && mapRef.current && (window as any).L) {
            if (!mapInstance.current) {
                const L = (window as any).L;
                mapInstance.current = L.map(mapRef.current, {
                    zoomControl: false,
                    attributionControl: false
                });
                
                // Dark Matter Tiles
                L.tileLayer('https://cartodb-basemaps-a.global.ssl.fastly.net/dark_nolabels/{z}/{x}/{y}{r}.png', {
                    maxZoom: 18,
                    minZoom: 2
                }).addTo(mapInstance.current);
            }
            
            const L = (window as any).L;
            mapInstance.current.setView([data.latitude, data.longitude], 13);
            
            // Clear old markers
            mapInstance.current.eachLayer((layer: any) => {
                if (layer instanceof L.CircleMarker) mapInstance.current.removeLayer(layer);
            });

            L.circleMarker([data.latitude, data.longitude], {
                radius: 8,
                color: '#6366f1',
                fillColor: '#818cf8',
                fillOpacity: 0.8,
                weight: 2
            }).addTo(mapInstance.current);
        }
    }, [data]);

    // Kill Switch Effect
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        
        if (killSwitchActive && sessionIP) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch('https://api.ipify.org?format=json');
                    const json = await res.json();
                    if (json.ip !== sessionIP) {
                        // IP CHANGED!
                        const newData = await fetchIPData();
                        if (newData) {
                            addHistoryItem({
                                ...newData,
                                timestamp: Date.now(),
                                securityAlert: true,
                                changed: 'SECURITY ALERT'
                            });
                            setData(newData);
                            setSessionIP(newData.ip);
                            // Alert user
                            if (Notification.permission === 'granted') {
                                new Notification('IPoint Security Alert', { body: `IP Changed to ${newData.ip}` });
                            }
                        }
                    }
                } catch (e) { console.error("Kill switch check failed", e); }
            }, KILL_SWITCH_INTERVAL);
        }

        return () => clearInterval(interval);
    }, [killSwitchActive, sessionIP]);

    const fetchIPData = async (): Promise<IPData | null> => {
        try {
            // Try Primary
            let res = await fetch(PRIMARY_API);
            let json = await res.json();
            
            if (!json.success) {
                // Fallback
                res = await fetch(FALLBACK_API);
                json = await res.json();
                
                // Normalize Fallback
                return {
                    ip: json.ip,
                    country: json.country_name,
                    country_code: json.country_code,
                    city: json.city,
                    region: json.region,
                    latitude: json.latitude,
                    longitude: json.longitude,
                    timezone: json.timezone,
                    connection: {
                        isp: json.org,
                        org: json.org,
                        asn: json.asn,
                        domain: ''
                    }
                };
            }

            // Normalize Primary
            return {
                ip: json.ip,
                country: json.country,
                country_code: json.country_code,
                city: json.city,
                region: json.region,
                latitude: json.latitude,
                longitude: json.longitude,
                timezone: json.timezone.id,
                connection: {
                    isp: json.connection.isp,
                    org: json.connection.org,
                    asn: json.connection.asn.toString(),
                    domain: json.connection.domain
                }
            };
        } catch (e) {
            console.error("IP Fetch failed", e);
            return null;
        }
    };

    const refreshIP = async () => {
        setLoading(true);
        const newData = await fetchIPData();
        if (newData) {
            // Check IPv6
            try {
                const v6res = await fetch(IPV6_URL);
                const v6json = await v6res.json();
                newData.ipv6 = v6json.ip;
            } catch {}

            setData(newData);
            setSessionIP(newData.ip);
            
            // Add to history if different from last
            setHistory(prev => {
                const last = prev[0];
                if (!last || last.ip !== newData.ip) {
                    const newItem = { ...newData, timestamp: Date.now() };
                    const newHist = [newItem, ...prev].slice(0, 100);
                    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHist));
                    return newHist;
                }
                return prev;
            });
        }
        setLoading(false);
    };

    const clearHistory = () => {
        if(confirm("Clear all history?")) {
            setHistory([]);
            localStorage.removeItem(HISTORY_KEY);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020202] overflow-hidden font-mono">
            {/* Header - Sharp, Border Bottom */}
            <header className="h-16 shrink-0 border-b border-white/10 flex items-center justify-between px-6 bg-[#050505]">
                <div className="flex items-center gap-4">
                    <Globe2 className="w-5 h-5 text-indigo-500" />
                    <h1 className="text-lg font-bold text-white tracking-wider uppercase">IPoint Intelligence</h1>
                </div>
                <div className="flex items-center">
                    <div className="h-8 w-px bg-white/10 mx-4 hidden md:block" />
                    <button 
                        onClick={refreshIP}
                        disabled={loading}
                        className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-widest flex items-center gap-2"
                    >
                        <RotateCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden md:inline">Refresh</span>
                    </button>
                    <div className="h-8 w-px bg-white/10 mx-4" />
                    <button 
                        onClick={() => setKillSwitchActive(!killSwitchActive)}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors ${killSwitchActive ? 'text-red-500 bg-red-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <ShieldAlert className="w-3 h-3" />
                        {killSwitchActive ? 'Kill-Switch: ON' : 'Kill-Switch: OFF'}
                    </button>
                </div>
            </header>

            <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                {/* Left Panel: Info & Stats */}
                <div className="flex-1 flex flex-col border-r border-white/10 min-w-0">
                    
                    {/* Top Section: IP & Location */}
                    <div className="flex-1 p-8 md:p-12 flex flex-col justify-center border-b border-white/10 bg-[#050505]">
                         <div className="mb-2 flex items-center gap-2">
                            {data?.country_code && <span className={`fi fi-${data.country_code.toLowerCase()} shadow-sm`} />}
                            <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{data?.country || 'Unknown Country'}</span>
                         </div>
                         <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4">{data?.ip || '---.---.---.---'}</h2>
                         <div className="flex flex-col md:flex-row gap-x-8 gap-y-4 text-sm text-zinc-400 font-medium">
                             <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-indigo-500" />
                                {data ? `${data.city}, ${data.region}` : 'Locating...'}
                             </div>
                             <div className="flex items-center gap-2">
                                <Wifi className="w-4 h-4 text-indigo-500" />
                                {data?.connection.isp || 'ISP Unknown'}
                             </div>
                             <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-indigo-500" />
                                ASN: {data?.connection.asn || '---'}
                             </div>
                         </div>
                         {data?.ipv6 && (
                            <div className="mt-6 pt-6 border-t border-white/5">
                                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-1">IPv6 Address</p>
                                <p className="text-zinc-400 font-mono text-xs truncate">{data.ipv6}</p>
                            </div>
                         )}
                    </div>

                    {/* Bottom Section: History Log */}
                    <div className="h-[300px] md:h-[400px] flex flex-col bg-[#020202]">
                        <div className="px-6 py-3 border-b border-white/10 flex justify-between items-center bg-[#080808]">
                             <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                <History className="w-3 h-3" /> Connection Log
                             </h3>
                             <button onClick={clearHistory} className="text-[10px] text-zinc-600 hover:text-red-400 uppercase tracking-wider font-bold flex items-center gap-1">
                                <Trash2 className="w-3 h-3" /> Clear Log
                             </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left text-xs text-zinc-400">
                                <thead className="bg-[#050505] sticky top-0 text-[10px] font-black uppercase tracking-wider text-zinc-600">
                                    <tr>
                                        <th className="px-6 py-3 font-normal bg-[#050505]">Time</th>
                                        <th className="px-6 py-3 font-normal bg-[#050505]">IP Address</th>
                                        <th className="px-6 py-3 font-normal hidden sm:table-cell bg-[#050505]">Location</th>
                                        <th className="px-6 py-3 font-normal text-right bg-[#050505]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {history.map((item, i) => (
                                        <tr key={i} className="hover:bg-white/[0.02]">
                                            <td className="px-6 py-3 font-mono text-zinc-500">{formatDistanceToNow(item.timestamp, { addSuffix: true })}</td>
                                            <td className="px-6 py-3 text-zinc-300 font-mono">{item.ip}</td>
                                            <td className="px-6 py-3 hidden sm:table-cell">{item.city}, {item.country_code}</td>
                                            <td className="px-6 py-3 text-right">
                                                {item.securityAlert ? (
                                                    <span className="text-red-500 font-bold bg-red-500/10 px-1 py-0.5 rounded">ALERT</span>
                                                ) : (
                                                    <span className="text-zinc-600 font-mono">OK</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                        <tr><td colSpan={4} className="px-6 py-8 text-center opacity-30">No history available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Panel: Map (Full Height) */}
                <div className="h-[300px] lg:h-auto lg:w-1/3 relative bg-[#050505]">
                     <div ref={mapRef} className="absolute inset-0 z-0 grayscale opacity-60" />
                     {/* Overlay Grid Pattern for tech feel */}
                     <div className="absolute inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                     <div className="absolute inset-0 pointer-events-none border-l border-white/10" />
                     
                     <div className="absolute bottom-6 left-6 right-6 bg-black/80 backdrop-blur-md border border-white/10 p-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Coordinates</p>
                                <p className="text-sm text-white font-mono">{data?.latitude.toFixed(4)}° N, {data?.longitude.toFixed(4)}° W</p>
                            </div>
                            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default V2IPoint;
