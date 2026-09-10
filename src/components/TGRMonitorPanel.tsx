/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { TGRState, TGRPeserta } from '../types';
import { Maximize2, Minimize2, Trophy, Swords, Layers, Smartphone, Tablet, Monitor, Tv, RotateCcw, Timer, Image as ImageIcon, Upload, X, Trash2, Shield, Check, Sparkles } from 'lucide-react';

interface TGRMonitorPanelProps {
  state: TGRState;
  dispatch?: (type: string, payload?: any) => Promise<any> | void;
  onBack: () => void;
  theme: 'dark' | 'light';
}

export default function TGRMonitorPanel({ state, dispatch, onBack, theme }: TGRMonitorPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoTab, setLogoTab] = useState<'kiri' | 'kanan' | 'tengah'>('kiri');
  const [uploadLoading, setUploadLoading] = useState(false);

  const fileInputKiriRef = useRef<HTMLInputElement>(null);
  const fileInputKananRef = useRef<HTMLInputElement>(null);
  const fileInputTengahRef = useRef<HTMLInputElement>(null);

  // Device layout preset: 'auto' | 'tv' | 'pc' | 'tablet' | 'hp'
  const [devicePreset, setDevicePreset] = useState<'auto' | 'tv' | 'pc' | 'tablet' | 'hp'>(() => {
    return (localStorage.getItem('tgr_monitor_device_preset') as any) || 'auto';
  });

  // Window dimension tracking
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720
  }));

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine effective device profile
  const effectiveProfile = React.useMemo(() => {
    if (devicePreset !== 'auto') return devicePreset;
    const { width, height } = windowSize;
    if (width < 640 || (width < 768 && height > width)) return 'hp';
    if (width >= 640 && width < 1024) return 'tablet';
    if (width >= 1920 || (width >= 1440 && isFullscreen)) return 'tv';
    return 'pc';
  }, [devicePreset, windowSize, isFullscreen]);

  // Scale multiplier for TV / LED videotron
  const [scaleFactor, setScaleFactor] = useState(() => {
    const saved = localStorage.getItem('tgr_monitor_zoom');
    return saved ? parseFloat(saved) : 1.0;
  });

  const handleDevicePresetChange = (preset: 'auto' | 'tv' | 'pc' | 'tablet' | 'hp') => {
    setDevicePreset(preset);
    localStorage.setItem('tgr_monitor_device_preset', preset);
    if (preset === 'tv') {
      setScaleFactor(1.15);
    } else if (preset === 'tablet') {
      setScaleFactor(0.9);
    } else if (preset === 'hp') {
      setScaleFactor(1.0);
    } else if (preset === 'pc') {
      setScaleFactor(1.0);
    }
  };

  const handleZoomChange = (delta: number) => {
    setScaleFactor(prev => {
      const next = Math.max(0.6, Math.min(2.0, prev + delta));
      localStorage.setItem('tgr_monitor_zoom', next.toFixed(2));
      return parseFloat(next.toFixed(2));
    });
  };

  const handleFitScreen = () => {
    setScaleFactor(1.0);
    localStorage.setItem('tgr_monitor_zoom', '1.00');
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  };

  const activePeserta = state.pesertaList.find(p => p.id === state.activePesertaId);

  // Formatting timer seconds to MM:SS
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getMedian = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return sorted[mid];
    } else {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
  };

  const getStandardDeviation = (arr: number[]): number => {
    if (arr.length <= 1) return 0;
    const mean = arr.reduce((acc, v) => acc + v, 0) / arr.length;
    const variance = arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  };

  const activeScores = activePeserta
    ? Object.entries(activePeserta.scores)
        .filter(([key]) => {
          const jNum = parseInt(key.replace('juri', ''));
          return jNum >= 1 && jNum <= state.jumlahJuri;
        })
        .map(([_, v]) => v)
    : [];

  const activeKebenaran = activePeserta
    ? Object.entries(activePeserta.kebenaranScores)
        .filter(([key]) => {
          const jNum = parseInt(key.replace('juri', ''));
          return jNum >= 1 && jNum <= state.jumlahJuri;
        })
        .map(([_, v]) => v)
    : [];

  const totalKebenaran = activeKebenaran.reduce((sum, v) => sum + v, 0);
  const medianScore = getMedian(activeScores);
  const stdDevScore = getStandardDeviation(activeScores);

  // Prestasi (VS) Match participants
  const merahPeserta = state.activeVSMatch?.merahPesertaId 
    ? state.pesertaList.find(p => p.id === state.activeVSMatch?.merahPesertaId) 
    : state.pesertaList.find(p => p.sudut === 'merah');
    
  const biruPeserta = state.activeVSMatch?.biruPesertaId 
    ? state.pesertaList.find(p => p.id === state.activeVSMatch?.biruPesertaId) 
    : state.pesertaList.find(p => p.sudut === 'biru');

  const merahScores = merahPeserta
    ? Object.entries(merahPeserta.scores)
        .filter(([key]) => {
          const jNum = parseInt(key.replace('juri', ''));
          return jNum >= 1 && jNum <= state.jumlahJuri;
        })
        .map(([_, v]) => v)
    : [];
  const merahStdDev = getStandardDeviation(merahScores);

  const biruScores = biruPeserta
    ? Object.entries(biruPeserta.scores)
        .filter(([key]) => {
          const jNum = parseInt(key.replace('juri', ''));
          return jNum >= 1 && jNum <= state.jumlahJuri;
        })
        .map(([_, v]) => v)
    : [];
  const biruStdDev = getStandardDeviation(biruScores);

  // Logo Upload and Management Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'logoKiri' | 'logoKanan' | 'logoTengah') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("Ukuran file terlalu besar. Maksimal ukuran gambar adalah 4MB.");
      return;
    }

    setUploadLoading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (dispatch) {
        try {
          await dispatch('TGR_UPLOAD_LOGOS', {
            [target]: base64
          });
        } catch (err) {
          console.error("Gagal mengupload logo:", err);
        }
      }
      setUploadLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = async (target: 'logoKiri' | 'logoKanan' | 'logoTengah') => {
    if (dispatch) {
      try {
        await dispatch('TGR_UPLOAD_LOGOS', {
          [target]: null
        });
      } catch (err) {
        console.error("Gagal menghapus logo:", err);
      }
    }
  };

  // Preset SVG / Data Logos
  const handleApplyPreset = async (target: 'logoKiri' | 'logoKanan' | 'logoTengah', presetType: string) => {
    let logoData = '';
    if (presetType === 'ipsi') {
      // Clean high-res IPSI Emblem SVG as data URI
      logoData = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,5 93,36 77,87 23,87 7,36" fill="%23065f2a" stroke="%23f59e0b" stroke-width="3.5"/><circle cx="50" cy="50" r="28" fill="none" stroke="%23ffffff" stroke-width="1.5"/><circle cx="50" cy="50" r="24" fill="%230b7336" stroke="%23ffffff" stroke-width="1.5"/><path d="M50,26 L50,70 M30,50 L70,50" stroke="%23ffffff" stroke-width="3" stroke-linecap="round"/><circle cx="50" cy="50" r="11" fill="%23dc2626" stroke="%23ffffff" stroke-width="1.5"/><circle cx="50" cy="50" r="3.5" fill="%23ffffff"/></svg>`;
    } else if (presetType === 'kemenpora') {
      logoData = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23b91c1c" stroke="%23f59e0b" stroke-width="3"/><path d="M50 20 L60 40 L82 42 L65 58 L70 80 L50 68 L30 80 L35 58 L18 42 L40 40 Z" fill="%23fef08a"/><circle cx="50" cy="50" r="16" fill="%230284c7"/><text x="50" y="54" font-size="7" font-weight="900" fill="%23ffffff" text-anchor="middle" font-family="sans-serif">INDONESIA</text></svg>`;
    } else if (presetType === 'silat_silhouette') {
      logoData = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><path d="M60 10 L105 35 L105 85 L60 110 L15 85 L15 35 Z" fill="%23002277" stroke="%2338bdf8" stroke-width="3"/><path d="M40 60 L60 40 L80 60 L60 80 Z" fill="%2300a859" stroke="%23ffffff" stroke-width="2"/><text x="60" y="65" font-size="10" font-weight="900" fill="%23ffffff" text-anchor="middle" font-family="sans-serif">PENCAK SILAT</text><text x="60" y="98" font-size="8" font-weight="bold" fill="%23facc15" text-anchor="middle" font-family="sans-serif">TGR SENI</text></svg>`;
    }

    if (dispatch && logoData) {
      await dispatch('TGR_UPLOAD_LOGOS', {
        [target]: logoData
      });
    }
  };

  // High-fidelity vector IPSI Pentagon/Circular Logo Component matching the screenshot
  const IPSICrestLogo = () => (
    <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center flex-shrink-0 drop-shadow-[0_0_12px_rgba(34,197,94,0.4)]">
      <svg viewBox="0 0 100 100" className="w-full h-full select-none">
        {/* Outer Green Pentagon with gold border */}
        <polygon 
          points="50,5 93,36 77,87 23,87 7,36" 
          fill="#065f2a" 
          stroke="#f59e0b" 
          strokeWidth="3.5" 
        />
        {/* Outer white thin circle */}
        <circle cx="50" cy="50" r="28" fill="none" stroke="#ffffff" strokeWidth="1.5" />
        {/* Inner green circle base */}
        <circle cx="50" cy="50" r="24" fill="#0b7336" stroke="#ffffff" strokeWidth="1.5" />
        {/* Crossed weapons / trident symbol */}
        <path 
          d="M50,26 L50,70 M30,50 L70,50" 
          stroke="#ffffff" 
          strokeWidth="3" 
          strokeLinecap="round" 
        />
        {/* Red target circle center */}
        <circle cx="50" cy="50" r="11" fill="#dc2626" stroke="#ffffff" strokeWidth="1.5" />
        {/* Inner target dot */}
        <circle cx="50" cy="50" r="3.5" fill="#ffffff" />
      </svg>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#070114] text-slate-100 font-sans select-none overflow-hidden relative">
      
      {/* 1. TOP UTILITY ACTION BAR (Hidden or compact for monitor display) */}
      <div className="z-30 bg-[#04000a] border-b border-purple-950/40 px-3 md:px-4 py-1 flex items-center justify-between text-xs font-mono relative flex-wrap gap-2">
        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
          <button
            onClick={onBack}
            className="flex items-center gap-1 bg-[#470b1b] hover:bg-[#5c0e22] border border-red-800 text-red-100 text-[10px] px-2.5 py-0.5 uppercase tracking-wider font-extrabold rounded cursor-pointer transition-colors"
          >
            ▲ MENU UTAMA
          </button>
          
          <button
            onClick={onBack}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-[10px] px-2.5 py-0.5 uppercase tracking-wider font-extrabold rounded cursor-pointer transition-colors"
          >
            ← KEMBALI
          </button>

          {/* Device Switcher */}
          <div className="flex items-center border border-purple-900/50 bg-[#120624] rounded p-0.5 text-[9px] font-mono shadow-inner">
            <button
              onClick={() => handleDevicePresetChange('auto')}
              className={`px-1.5 py-0.5 rounded transition-all font-bold flex items-center gap-1 cursor-pointer ${
                devicePreset === 'auto'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
              title="Deteksi Ukuran Layar Otomatis"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Auto</span>
            </button>
            <button
              onClick={() => handleDevicePresetChange('hp')}
              className={`px-1.5 py-0.5 rounded transition-all font-bold flex items-center gap-0.5 cursor-pointer ${
                devicePreset === 'hp'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span className="hidden md:inline">HP</span>
            </button>
            <button
              onClick={() => handleDevicePresetChange('tablet')}
              className={`px-1.5 py-0.5 rounded transition-all font-bold flex items-center gap-0.5 cursor-pointer ${
                devicePreset === 'tablet'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <Tablet className="w-3 h-3" />
              <span className="hidden md:inline">Tab</span>
            </button>
            <button
              onClick={() => handleDevicePresetChange('pc')}
              className={`px-1.5 py-0.5 rounded transition-all font-bold flex items-center gap-0.5 cursor-pointer ${
                devicePreset === 'pc'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <Monitor className="w-3 h-3" />
              <span className="hidden md:inline">PC</span>
            </button>
            <button
              onClick={() => handleDevicePresetChange('tv')}
              className={`px-1.5 py-0.5 rounded transition-all font-bold flex items-center gap-0.5 cursor-pointer ${
                devicePreset === 'tv'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              <Tv className="w-3 h-3" />
              <span className="hidden md:inline">TV</span>
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="hidden sm:flex items-center border border-purple-900/50 bg-[#120624] rounded p-0.5 font-mono text-[9px]">
            <button 
              onClick={() => handleZoomChange(-0.05)} 
              className="p-0.5 rounded hover:bg-purple-900/40 text-purple-300 font-black text-xs h-4 w-4 flex items-center justify-center cursor-pointer"
              title="Zoom Out"
            >
              -
            </button>
            <span className="px-1.5 font-black min-w-[2rem] text-center text-purple-200">
              {Math.round(scaleFactor * 100)}%
            </span>
            <button 
              onClick={() => handleZoomChange(0.05)} 
              className="p-0.5 rounded hover:bg-purple-900/40 text-purple-300 font-black text-xs h-4 w-4 flex items-center justify-center cursor-pointer"
              title="Zoom In"
            >
              +
            </button>
            <button
              onClick={handleFitScreen}
              className="px-1 py-0.5 text-[8px] font-bold uppercase rounded border border-purple-800/60 hover:bg-purple-900/50 text-purple-300 ml-0.5 cursor-pointer"
            >
              Fit
            </button>
          </div>

          <span className={`text-[10px] px-2 py-0.5 uppercase tracking-wider font-extrabold rounded border ${
            state.sistemSeni === 'prestasi'
              ? 'bg-purple-950/60 border-purple-800 text-purple-300'
              : 'bg-amber-950/60 border-amber-800 text-amber-300'
          }`}>
            {state.sistemSeni === 'prestasi' ? 'PRESTASI (VS)' : 'POOL'}
          </span>

          {/* Logo Manager Button */}
          <button
            onClick={() => setShowLogoModal(true)}
            className="flex items-center gap-1 bg-emerald-950/60 border border-emerald-600/70 hover:bg-emerald-900/80 text-emerald-300 text-[10px] px-2.5 py-0.5 uppercase tracking-wider font-extrabold rounded cursor-pointer transition-colors shadow-sm"
            title="Kelola Logo Layar Monitor Seni"
          >
            <ImageIcon className="w-3 h-3 text-emerald-400" />
            <span>ATUR LOGO</span>
            {(state.logoKiri || state.logoKanan || state.logoTengah) && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1 bg-purple-950/40 border border-purple-800/60 hover:bg-purple-900/60 text-purple-300 text-[10px] px-2 py-0.5 uppercase tracking-wider font-extrabold rounded cursor-pointer transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-300 font-bold tracking-widest uppercase truncate">
          {(state.logoTengah || state.logoKiri) && (
            <img src={state.logoTengah || state.logoKiri || undefined} alt="Logo Kejuaraan" className="w-4 h-4 object-contain rounded" referrerPolicy="no-referrer" />
          )}
          <span className="truncate max-w-[200px] md:max-w-none">{state.namaEvent?.toUpperCase() || 'KEJUARAAN NASIONAL PENCAK SILAT 2026'}</span>
        </div>
      </div>

      {/* Symmetrical High-Res Scale Container */}
      <div 
        className="flex-1 flex flex-col justify-between z-10 overflow-hidden relative"
        style={{
          transform: `scale(${scaleFactor})`,
          width: `${100 / scaleFactor}%`,
          height: `${100 / scaleFactor}%`,
          transformOrigin: 'top left',
          transition: 'transform 0.2s ease-out'
        }}
      >

        {/* 2. EXACT TOP BANNER HEADER MATCHING SCREENSHOT */}
        <header className="w-full pt-3 md:pt-5 pb-2 px-4 md:px-8 flex items-center justify-between relative z-10">
          {/* Top Left Logo (Kejuaraan or IPSI Crest) */}
          <div className="flex items-center justify-start min-w-[70px]">
            {(state.logoKiri || state.logoTengah) ? (
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/10 p-1 border-2 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center overflow-hidden flex-shrink-0 backdrop-blur-sm">
                <img src={state.logoKiri || state.logoTengah || undefined} alt="Logo Kejuaraan" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <IPSICrestLogo />
            )}
          </div>

          {/* Top Center: Golden Title & White Subtitle */}
          <div className="flex-1 text-center px-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-wider text-[#f59e0b] uppercase font-sans drop-shadow-[0_2px_10px_rgba(245,158,11,0.3)]">
              {state.namaEvent?.toUpperCase() || 'KEJUARAAN NASIONAL PENCAK SILAT 2026'}
            </h1>
            <div className="text-xs sm:text-sm md:text-base lg:text-lg font-extrabold tracking-widest text-white uppercase mt-0.5 md:mt-1 font-sans">
              <span>{state.partai ? `PARTAI ${state.partai}` : 'PARTAI 1'}</span>
              <span className="mx-2">•</span>
              <span>{state.babak ? `BABAK ${state.babak}` : (state.sistemSeni === 'pool' ? (activePeserta?.pool || 'POOL A') : 'BABAK FINAL')}</span>
              <span className="mx-2">•</span>
              <span>{activePeserta ? activePeserta.kategori.toUpperCase() : 'TUNGGAL'}</span>
            </div>
          </div>

          {/* Top Right Logo (IPSI Crest or custom logo) */}
          <div className="flex items-center justify-end min-w-[70px]">
            {state.logoKanan ? (
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-white/10 p-1 border-2 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center overflow-hidden flex-shrink-0 backdrop-blur-sm">
                <img src={state.logoKanan} alt="Logo IPSI" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <IPSICrestLogo />
            )}
          </div>
        </header>

        {/* 3. MAIN ARENA CONTENT (WATERMARK + ATHLETE BANNER ON LEFT, SCOREBOARD ON RIGHT) */}
        <main className="flex-1 flex flex-col lg:flex-row items-stretch justify-between px-3 md:px-8 py-2 md:py-4 gap-4 md:gap-8 z-10 relative overflow-hidden">
          
          {/* LEFT AREA: Watermark + Athlete & Kontingen Banner */}
          <div className="lg:w-[32%] flex flex-col justify-between relative py-2 min-h-[140px] lg:min-h-0">
            {/* Center Watermark silhouette / Logo */}
            <div className="my-auto flex items-center justify-center opacity-20 pointer-events-none select-none py-4">
              {(state.logoTengah || state.logoKiri || state.logoKanan) ? (
                <img 
                  src={state.logoTengah || state.logoKiri || state.logoKanan || undefined} 
                  alt="Watermark Logo" 
                  className="w-36 h-36 md:w-48 md:h-48 object-contain filter grayscale contrast-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <svg viewBox="0 0 100 100" className="w-32 h-32 md:w-44 md:h-44 text-slate-400">
                  <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" fill="none" stroke="currentColor" strokeWidth="3" />
                  <path d="M35 50 L50 35 L65 50 L50 65 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <text x="50" y="55" fontSize="11" fontWeight="bold" textAnchor="middle" fill="currentColor" fontFamily="sans-serif">PENCAK SILAT</text>
                </svg>
              )}
            </div>

            {/* Bottom-Left Athlete Banner (Exact Blue Bar from screenshot) */}
            <div className="w-full bg-[#002277] border-l-4 border-cyan-400 border-y border-r border-[#003db3] rounded-r-lg p-2.5 md:p-3.5 shadow-xl flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm md:text-lg font-black text-white uppercase tracking-wider font-sans leading-tight truncate">
                  {activePeserta ? (activePeserta.kontingen || 'KONTINGEN') : 'BANGKEP'}
                </div>
                <div className="text-xs md:text-sm font-bold text-cyan-300 uppercase tracking-wide font-sans mt-0.5 truncate">
                  {activePeserta ? (activePeserta.nama || 'ATLET') : 'ANDREAS'}
                </div>
              </div>
              {/* Optional Shield/Badge Icon */}
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-cyan-950/60 border border-cyan-400/40 flex items-center justify-center flex-shrink-0 text-cyan-300">
                <Shield className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            </div>
          </div>

          {/* RIGHT AREA: EXACT 2-ROW HIGH-CONTRAST SCOREBOARD GRID */}
          <div className="lg:w-[68%] flex flex-col justify-center my-auto w-full">
            <div className="w-full border-2 border-[#0055d4] rounded-lg overflow-hidden shadow-[0_0_30px_rgba(0,85,212,0.25)] bg-[#001035]">
              
              {/* ROW 1: MEDIAN (Col 1), PENALTY (Col 2), TIME PERFORMANCE (Col 3) */}
              <div className="grid grid-cols-12 border-b-2 border-[#0055d4]">
                {/* 1. MEDIAN */}
                <div className="col-span-4 border-r-2 border-[#0055d4] flex flex-col">
                  <div className="bg-[#00a859] py-1.5 md:py-2 text-center text-white font-black text-xs sm:text-sm md:text-base uppercase tracking-widest font-sans">
                    MEDIAN
                  </div>
                  <div className="bg-[#0038b8] flex-1 py-4 sm:py-6 md:py-8 flex items-center justify-center text-center">
                    <span className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white font-mono tracking-wider drop-shadow-md">
                      {activeScores.length >= state.jumlahJuri ? medianScore.toFixed(3) : (medianScore > 0 ? medianScore.toFixed(3) : '9.900')}
                    </span>
                  </div>
                </div>

                {/* 2. PENALTY / HUKUMAN */}
                <div className="col-span-3 border-r-2 border-[#0055d4] flex flex-col">
                  <div className="bg-[#00a859] py-1.5 md:py-2 text-center text-white font-black text-xs sm:text-sm md:text-base uppercase tracking-widest font-sans">
                    PENALTY
                  </div>
                  <div className="bg-[#0038b8] flex-1 py-4 sm:py-6 md:py-8 flex items-center justify-center text-center">
                    <span className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white font-mono tracking-wider drop-shadow-md">
                      {activePeserta ? (activePeserta.deductions > 0 ? activePeserta.deductions.toFixed(2) : '0.00') : '0.00'}
                    </span>
                  </div>
                </div>

                {/* 3. TIME PERFORMANCE (ARENA TIMER) */}
                <div className="col-span-5 flex flex-col">
                  <div className="bg-[#00a859] py-1.5 md:py-2 text-center text-white font-black text-xs sm:text-sm md:text-base uppercase tracking-widest font-sans">
                    TIME PERFORMANCE
                  </div>
                  <div className="bg-[#0038b8] flex-1 py-4 sm:py-6 md:py-8 flex items-center justify-center text-center">
                    <span className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white font-mono tracking-wider drop-shadow-md">
                      {formatTime(state.timerSeconds)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ROW 2: STANDARD DEVIATION (Cols 1-2 Span 7), TOTAL SCORE (Col 3 Span 5) */}
              <div className="grid grid-cols-12">
                {/* 4. STANDARD DEVIATION (Spans 7 cols under Median & Penalty) */}
                <div className="col-span-7 border-r-2 border-[#0055d4] flex flex-col">
                  <div className="bg-[#00a859] py-1.5 md:py-2 text-center text-white font-black text-xs sm:text-sm md:text-base uppercase tracking-widest font-sans">
                    STANDARD DEVIATION
                  </div>
                  <div className="bg-[#0038b8] flex-1 py-4 sm:py-6 md:py-8 flex items-center justify-center text-center px-2">
                    <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white font-mono tracking-wide drop-shadow-md truncate">
                      {activeScores.length >= state.jumlahJuri ? stdDevScore.toFixed(9) : (stdDevScore > 0 ? stdDevScore.toFixed(9) : '0.000000000')}
                    </span>
                  </div>
                </div>

                {/* 5. TOTAL SCORE (Gold Header with White Bold Score) */}
                <div className="col-span-5 flex flex-col">
                  <div className="bg-[#f59e0b] py-1.5 md:py-2 text-center text-slate-950 font-black text-xs sm:text-sm md:text-base uppercase tracking-widest font-sans">
                    TOTAL SCORE
                  </div>
                  <div className="bg-[#0038b8] flex-1 py-4 sm:py-6 md:py-8 flex items-center justify-center text-center">
                    <span className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white font-mono tracking-wider drop-shadow-md">
                      {activePeserta?.finalScore !== undefined ? activePeserta.finalScore.toFixed(3) : '9.900'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </main>

        {/* 4. BOTTOM JURI SCORING STRIP MATCHING SCREENSHOT */}
        <footer className="w-full z-20 px-3 md:px-8 pb-3 md:pb-5">
          <div className="w-full grid border-2 border-[#0055d4] rounded-lg overflow-hidden bg-[#001035] shadow-[0_0_20px_rgba(0,85,212,0.2)]"
            style={{
              gridTemplateColumns: `repeat(${Math.max(4, Math.min(state.jumlahJuri || 4, 10))}, minmax(0, 1fr))`
            }}
          >
            {Array.from({ length: Math.max(4, Math.min(state.jumlahJuri || 4, 10)) }).map((_, idx) => {
              const juriNum = idx + 1;
              const key = `juri${juriNum}`;
              
              const hasScore = activePeserta && activePeserta.scores[key] !== undefined;
              const scoreVal = hasScore ? activePeserta.scores[key] : 9.90;
              
              // In the screenshot: Juri 2 & 3 have green headers, Juri 1 & 4 have blue headers
              // Or middle juries (calculating median) have green headers
              const totalJuries = Math.max(4, Math.min(state.jumlahJuri || 4, 10));
              const isMiddleGreen = (totalJuries === 4 && (juriNum === 2 || juriNum === 3)) ||
                                    (totalJuries === 5 && (juriNum === 2 || juriNum === 3 || juriNum === 4)) ||
                                    (totalJuries > 5 && juriNum > 1 && juriNum < totalJuries);

              const headerBg = isMiddleGreen ? 'bg-[#00a859]' : 'bg-[#0038b8]';

              return (
                <div 
                  key={juriNum} 
                  className={`flex flex-col ${idx > 0 ? 'border-l-2 border-[#0055d4]' : ''}`}
                >
                  {/* Juri Header */}
                  <div className={`${headerBg} py-1 text-center text-white font-black text-[10px] sm:text-xs md:text-sm uppercase tracking-wider font-sans`}>
                    JURI {juriNum}
                  </div>
                  {/* Juri Score Box */}
                  <div className="bg-[#002e99] py-2 sm:py-3.5 md:py-5 flex items-center justify-center text-center">
                    <span className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white font-mono tracking-wider">
                      {scoreVal.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </footer>

      </div>

      {/* 5. LOGO MANAGEMENT MODAL */}
      {showLogoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b051a] border-2 border-purple-600/60 rounded-2xl w-full max-w-xl overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.3)] flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-[#15072b] border-b border-purple-800/40 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-900/50 text-purple-300">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white uppercase tracking-wider font-sans">
                    Pengaturan Logo Layar Monitor Seni
                  </h3>
                  <p className="text-xs text-purple-300/80 font-sans">
                    Unggah atau pilih logo kejuaraan, IPSI, dan watermark arena
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLogoModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-purple-900/40 bg-[#0e041d]">
              <button
                onClick={() => setLogoTab('kiri')}
                className={`flex-1 py-3 px-4 text-xs font-bold font-sans uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-2 ${
                  logoTab === 'kiri'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>LOGO KIRI</span>
                {state.logoKiri && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
              </button>
              <button
                onClick={() => setLogoTab('kanan')}
                className={`flex-1 py-3 px-4 text-xs font-bold font-sans uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-2 ${
                  logoTab === 'kanan'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>LOGO KANAN</span>
                {state.logoKanan && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
              </button>
              <button
                onClick={() => setLogoTab('tengah')}
                className={`flex-1 py-3 px-4 text-xs font-bold font-sans uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-2 ${
                  logoTab === 'tengah'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>WATERMARK ARENA</span>
                {state.logoTengah && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Hidden File Inputs */}
              <input
                type="file"
                ref={fileInputKiriRef}
                onChange={(e) => handleFileUpload(e, 'logoKiri')}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={fileInputKananRef}
                onChange={(e) => handleFileUpload(e, 'logoKanan')}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={fileInputTengahRef}
                onChange={(e) => handleFileUpload(e, 'logoTengah')}
                accept="image/*"
                className="hidden"
              />

              {/* TAB 1: LOGO KIRI */}
              {logoTab === 'kiri' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase">Logo Kiri (Logo Kejuaraan / Panitia)</h4>
                      <p className="text-xs text-slate-400">Tampil di sudut kiri atas layar monitor pertandingan.</p>
                    </div>
                  </div>

                  {/* Preview Box */}
                  <div className="border-2 border-dashed border-purple-800/60 rounded-xl p-6 flex flex-col items-center justify-center bg-[#070211] min-h-[160px] text-center">
                    {state.logoKiri ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-24 h-24 rounded-2xl bg-white/10 p-2 border border-purple-500/50 flex items-center justify-center shadow-lg">
                          <img src={state.logoKiri} alt="Logo Kiri" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                        <button
                          onClick={() => handleRemoveLogo('logoKiri')}
                          className="flex items-center gap-1.5 px-3 py-1 bg-red-950/60 border border-red-700/60 hover:bg-red-900 text-red-300 text-xs font-bold rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Logo Kiri</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <IPSICrestLogo />
                        <span className="text-xs text-slate-400 font-medium">Saat ini menggunakan Lambang IPSI default</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => fileInputKiriRef.current?.click()}
                      disabled={uploadLoading}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uploadLoading ? 'Mengunggah...' : 'Pilih Gambar Dari Komputer'}</span>
                    </button>
                    <button
                      onClick={() => handleApplyPreset('logoKiri', 'ipsi')}
                      className="py-2.5 px-3 bg-purple-950/80 border border-purple-700/60 hover:bg-purple-900 text-purple-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                      title="Gunakan Preset Lambang IPSI"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Preset IPSI</span>
                    </button>
                    <button
                      onClick={() => handleApplyPreset('logoKiri', 'kemenpora')}
                      className="py-2.5 px-3 bg-purple-950/80 border border-purple-700/60 hover:bg-purple-900 text-purple-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                      title="Gunakan Preset Garuda / Kemenpora"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Preset Kemenpora</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: LOGO KANAN */}
              {logoTab === 'kanan' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase">Logo Kanan (Logo IPSI / Lembaga Wasit Juri)</h4>
                      <p className="text-xs text-slate-400">Tampil di sudut kanan atas layar monitor pertandingan.</p>
                    </div>
                  </div>

                  {/* Preview Box */}
                  <div className="border-2 border-dashed border-purple-800/60 rounded-xl p-6 flex flex-col items-center justify-center bg-[#070211] min-h-[160px] text-center">
                    {state.logoKanan ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-24 h-24 rounded-2xl bg-white/10 p-2 border border-purple-500/50 flex items-center justify-center shadow-lg">
                          <img src={state.logoKanan} alt="Logo Kanan" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                        </div>
                        <button
                          onClick={() => handleRemoveLogo('logoKanan')}
                          className="flex items-center gap-1.5 px-3 py-1 bg-red-950/60 border border-red-700/60 hover:bg-red-900 text-red-300 text-xs font-bold rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Logo Kanan</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <IPSICrestLogo />
                        <span className="text-xs text-slate-400 font-medium">Saat ini menggunakan Lambang IPSI default</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => fileInputKananRef.current?.click()}
                      disabled={uploadLoading}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uploadLoading ? 'Mengunggah...' : 'Pilih Gambar Dari Komputer'}</span>
                    </button>
                    <button
                      onClick={() => handleApplyPreset('logoKanan', 'ipsi')}
                      className="py-2.5 px-3 bg-purple-950/80 border border-purple-700/60 hover:bg-purple-900 text-purple-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                      title="Gunakan Preset Lambang IPSI"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Preset IPSI</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: LOGO TENGAH / WATERMARK */}
              {logoTab === 'tengah' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase">Watermark Arena (Logo Siluet Latar)</h4>
                      <p className="text-xs text-slate-400">Tampil sebagai watermark siluet di area kiri monitor arena.</p>
                    </div>
                  </div>

                  {/* Preview Box */}
                  <div className="border-2 border-dashed border-purple-800/60 rounded-xl p-6 flex flex-col items-center justify-center bg-[#070211] min-h-[160px] text-center">
                    {state.logoTengah ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-28 h-28 rounded-2xl bg-white/10 p-2 border border-purple-500/50 flex items-center justify-center shadow-lg">
                          <img src={state.logoTengah} alt="Watermark" className="max-w-full max-h-full object-contain filter grayscale contrast-200" referrerPolicy="no-referrer" />
                        </div>
                        <button
                          onClick={() => handleRemoveLogo('logoTengah')}
                          className="flex items-center gap-1.5 px-3 py-1 bg-red-950/60 border border-red-700/60 hover:bg-red-900 text-red-300 text-xs font-bold rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Watermark</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <div className="opacity-40">
                          <svg viewBox="0 0 100 100" className="w-16 h-16 text-slate-300">
                            <path d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z" fill="none" stroke="currentColor" strokeWidth="3" />
                            <path d="M35 50 L50 35 L65 50 L50 65 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
                          </svg>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">Saat ini menggunakan siluet standar Pencak Silat</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => fileInputTengahRef.current?.click()}
                      disabled={uploadLoading}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{uploadLoading ? 'Mengunggah...' : 'Pilih Gambar Watermark'}</span>
                    </button>
                    <button
                      onClick={() => handleApplyPreset('logoTengah', 'silat_silhouette')}
                      className="py-2.5 px-3 bg-purple-950/80 border border-purple-700/60 hover:bg-purple-900 text-purple-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                      title="Gunakan Preset Siluet Seni"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Preset Siluet Seni</span>
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-[#120524] border-t border-purple-900/40 px-5 py-3 flex items-center justify-end">
              <button
                onClick={() => setShowLogoModal(false)}
                className="py-2 px-5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-md"
              >
                Tutup & Terapkan
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
