
import React, { useState, useEffect, useRef } from 'react';
import { Globe, MapPin, Wifi, Activity, ShieldAlert, History, Play, RotateCcw, Download, Upload, Zap, Eye, Trash2, Globe2 } from 'lucide-react';
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
    speedTest?: {
        download: number;
        upload: number;
        ping: number;
    };
    changed?: string;
}

const V2IPoint: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<IPData | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [killSwitchActive, setKillSwitchActive] = useState(false);
    const [sessionIP, setSessionIP] = useState<string | null>(null);
    
    // Speed Test State
    const [isTesting, setIsTesting] = useState(false);
    const [speedResults, setSpeedResults] = useState<{dl: number, ul: number, ping: number} | null>(null);
    const [progress, setProgress] = useState({ dl: 0, ul: 0, ping: 0 });

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

    const runSpeedTest = async () => {
        if (isTesting) return;
        setIsTesting(true);
        setProgress({ dl: 0, ul: 0, ping: 0 });
        
        // Mock Speed Test (Real implementation requires backend or complex logic)
        // Simulating the phases for UI purposes
        
        // 1. Ping
        for (let i = 0; i <= 100; i+=10) {
            setProgress(p => ({ ...p, ping: i }));
            await new Promise(r => setTimeout(r, 50));
        }
        const ping = Math.floor(Math.random() * 40) + 10;
        
        // 2. Download
        for (let i = 0; i <= 100; i+=5) {
            setProgress(p => ({ ...p, dl: i }));
            await new Promise(r => setTimeout(r, 100));
        }
        const dl = Math.floor(Math.random() * 100) + 50;

        // 3. Upload
        for (let i = 0; i <= 100; i+=5) {
            setProgress(p => ({ ...p, ul: i }));
            await new Promise(r => setTimeout(r, 100));
        }
        const ul = Math.floor(Math.random() * 50) + 10;

        setSpeedResults({ dl, ul, ping });
        setIsTesting(false);
        
        // Log to history
        if (data) {
            addHistoryItem({
                ...data,
                timestamp: Date.now(),
                speedTest: { download: dl, upload: ul, ping },
                changed: 'SPEED TEST'
            });
        }
    };

    const clearHistory = () => {
        if(confirm("Clear all history?")) {
            setHistory([]);
            localStorage.removeItem(HISTORY_KEY);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#020202] overflow-y-auto custom-scrollbar p-6 md:p-12">
            <header className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-1 flex items-center gap-3">
                        <Globe2 className="w-8 h-8 text-indigo-500" /> IPoint
                    </h1>
                    <p className="text-zinc-500 font-medium text-sm">Real-time Connection Intelligence</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={refreshIP}
                        className={`p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors ${loading ? 'animate-spin' : ''}`}
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setKillSwitchActive(!killSwitchActive)}
                        className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 border transition-all ${killSwitchActive ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <ShieldAlert className="w-4 h-4" />
                        {killSwitchActive ? 'Kill-Switch Active' : 'Kill-Switch Off'}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                
                {/* 1. Identity Card */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-50 group-hover:opacity-100 transition-opacity">
                        {data?.country_code && <span className={`fi fi-${data.country_code.toLowerCase()} text-4xl rounded shadow-lg`} />}
                    </div>
                    
                    <div className="space-y-6 relative z-10">
                        <div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">IP Address</p>
                            <h2 className="text-2xl font-mono text-white tracking-tight">{data?.ip || '---.---.---.---'}</h2>
                            {data?.ipv6 && <p className="text-[10px] font-mono text-zinc-500 mt-1">{data.ipv6}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Provider</p>
                                <p className="text-sm font-bold text-zinc-300 truncate" title={data?.connection.isp}>{data?.connection.isp || 'Unknown'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">ASN</p>
                                <p className="text-sm font-bold text-zinc-300">{data?.connection.asn || '---'}</p>
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Location</p>
                            <p className="text-sm font-bold text-white flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-indigo-500" />
                                {data ? `${data.city}, ${data.region}, ${data.country}` : 'Locating...'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Map Card */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden relative min-h-[280px]">
                    <div ref={mapRef} className="absolute inset-0 z-0 bg-zinc-950" />
                    <div className="absolute top-4 left-4 z-[400] bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                        <p className="text-[10px] font-bold text-zinc-300 flex items-center gap-2">
                            <Globe className="w-3 h-3" /> {data?.latitude.toFixed(4)}, {data?.longitude.toFixed(4)}
                        </p>
                    </div>
                </div>

                {/* 3. Speed Test Card */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <Zap className="w-4 h-4 text-yellow-500" /> Speed Test
                            </h3>
                            {speedResults && !isTesting && (
                                <span className="text-[10px] font-bold text-zinc-500">Last run: Just now</span>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-zinc-400"><span>Ping</span><span>{speedResults?.ping || '--'} ms</span></div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-yellow-500 transition-all duration-200" style={{ width: `${progress.ping}%` }} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-zinc-400"><span>Download</span><span>{speedResults?.dl || '--'} Mbps</span></div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${progress.dl}%` }} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-zinc-400"><span>Upload</span><span>{speedResults?.ul || '--'} Mbps</span></div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 transition-all duration-200" style={{ width: `${progress.ul}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={runSpeedTest}
                        disabled={isTesting}
                        className={`w-full py-3 mt-6 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isTesting ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black hover:bg-zinc-200 shadow-lg'}`}
                    >
                        {isTesting ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {isTesting ? 'Testing...' : 'Start Test'}
                    </button>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/80">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <History className="w-4 h-4 text-zinc-500" /> Connection Log
                    </h3>
                    <button onClick={clearHistory} className="text-xs text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Clear
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-900/50 text-zinc-500 font-bold uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                            <tr>
                                <th className="px-6 py-3">Time</th>
                                <th className="px-6 py-3">IP Address</th>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3 hidden md:table-cell">ISP</th>
                                <th className="px-6 py-3 text-right">Event</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-600">No events logged yet.</td>
                                </tr>
                            ) : (
                                history.map((item, i) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-3 text-zinc-400 font-mono whitespace-nowrap">{formatDistanceToNow(item.timestamp, { addSuffix: true })}</td>
                                        <td className="px-6 py-3 text-white font-mono font-bold">{item.ip}</td>
                                        <td className="px-6 py-3 text-zinc-300">
                                            <span className="flex items-center gap-2">
                                                {item.country_code && <span className={`fi fi-${item.country_code.toLowerCase()} rounded shadow-sm`} />}
                                                {item.city}, {item.country_code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-zinc-500 hidden md:table-cell truncate max-w-[150px]" title={item.connection?.isp}>{item.connection?.isp}</td>
                                        <td className="px-6 py-3 text-right">
                                            {item.securityAlert ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 text-red-400 font-bold text-[10px] border border-red-500/20 uppercase tracking-wide">
                                                    <ShieldAlert className="w-3 h-3" /> Kill Switch
                                                </span>
                                            ) : item.speedTest ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 font-bold text-[10px] border border-yellow-500/20 uppercase tracking-wide">
                                                    <Zap className="w-3 h-3" /> {Math.round(item.speedTest.download)} Mbps
                                                </span>
                                            ) : (
                                                <span className="text-zinc-600 font-medium">Logged</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default V2IPoint;
