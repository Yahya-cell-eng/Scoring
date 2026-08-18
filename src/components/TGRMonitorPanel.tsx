import React, { useState, useEffect } from 'react';
import { TGRState, TGRPeserta } from '../types';
import { Maximize2, Minimize2 } from 'lucide-react';

interface TGRMonitorPanelProps {
  state: TGRState;
  onBack: () => void;
  theme: 'dark' | 'light';
}

export default function TGRMonitorPanel({ state, onBack, theme }: TGRMonitorPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // High-fidelity vector IPSI Pentagon Logo Component
  const IPSILogo = () => (
    <svg viewBox="0 0 100 100" className="w-14 h-14 select-none drop-shadow-[0_0_10px_rgba(21,128,61,0.4)]">
      {/* Outer Green Pentagon with gold border */}
      <polygon 
        points="50,5 93,36 77,87 23,87 7,36" 
        fill="#0b6329" 
        stroke="#f59e0b" 
        strokeWidth="3.5" 
      />
      {/* Outer white thin circle */}
      <circle cx="50" cy="50" r="28" fill="none" stroke="#ffffff" strokeWidth="1.5" />
      {/* Inner white circle base */}
      <circle cx="50" cy="50" r="24" fill="#0b6329" stroke="#ffffff" strokeWidth="1.5" />
      {/* Crossed weapons / trident symbol */}
      <path 
        d="M50,28 L50,68 M32,50 L68,50" 
        stroke="#ffffff" 
        strokeWidth="3" 
        strokeLinecap="round" 
      />
      {/* Red target circle center */}
      <circle cx="50" cy="50" r="12" fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
      {/* Inner target dot */}
      <circle cx="50" cy="50" r="4" fill="#ffffff" />
    </svg>
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#05020c] text-slate-100 font-sans select-none overflow-hidden relative">
      
      {/* Ambient background glows */}
      <div className="absolute top-0 left-0 w-full h-[40rem] bg-gradient-to-b from-purple-950/25 to-transparent pointer-events-none blur-3xl z-0" />
      <div className="absolute bottom-0 right-10 w-[30rem] h-[30rem] rounded-full blur-[160px] pointer-events-none bg-blue-950/20 z-0" />

      {/* 1. TOP UTILITY ACTION BAR */}
      <div className="z-20 bg-[#080310] border-b border-purple-950/40 px-4 py-1.5 flex items-center justify-between text-xs font-mono relative">
        <div className="flex items-center gap-2">
          {/* Menu Utama tab styled exactly like the burgundy button */}
          <button
            onClick={onBack}
            className="flex items-center gap-1 bg-[#470b1b] hover:bg-[#5c0e22] border border-red-800 text-red-100 text-[10px] px-3.5 py-1 uppercase tracking-wider font-extrabold rounded-md cursor-pointer transition-colors"
          >
            ▲ MENU UTAMA
          </button>
          
          <button
            onClick={onBack}
            className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-[10px] px-3.5 py-1 uppercase tracking-wider font-extrabold rounded-md cursor-pointer transition-colors"
          >
            ← MENU
          </button>

          <span className="bg-[#180a30] text-purple-300 text-[10px] px-3.5 py-1 uppercase tracking-wider font-extrabold border border-purple-800/40 rounded-md">
            MONITOR
          </span>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-800/60 hover:bg-purple-900/60 text-purple-300 text-[10px] px-3 py-1 uppercase tracking-wider font-extrabold rounded-md cursor-pointer transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold tracking-widest uppercase">
          <span>{state.namaEvent?.toUpperCase() || 'KEJUARAAN NASIONAL PENCAK SILAT IPSI REKOR INDONESIA'}</span>
          
          <div className="flex items-center gap-2 text-slate-500 border-l border-slate-800 pl-4 select-none">
            <span className="cursor-pointer hover:text-white transition-colors">🌙</span>
            <span className="cursor-pointer hover:text-white transition-colors text-xs font-black font-sport" onClick={toggleFullscreen}>⛶</span>
            <span className="cursor-pointer hover:text-white transition-colors font-sans text-xs">🔊</span>
          </div>
        </div>
      </div>

      {/* 2. MATCH STATE HEADER (PARTAI 2 | FINAL | TUNGGAL) */}
      <div className="z-10 bg-[#0c051a] border-b border-purple-950/40 px-6 py-3.5 flex items-center justify-between shadow-lg relative">
        {/* Left IPSI Logo */}
        <IPSILogo />

        {/* Center Labels */}
        <div className="flex-1 max-w-4xl mx-auto grid grid-cols-3 gap-4 text-center items-center font-sans">
          <div className="text-3xl md:text-4xl font-extrabold text-white tracking-widest uppercase">
            {state.partai || 'PARTAI 2'}
          </div>
          <div className="text-3xl md:text-4xl font-extrabold text-white tracking-widest uppercase border-x border-slate-800/40 py-1">
            {state.babak || 'FINAL'}
          </div>
          <div className="text-3xl md:text-4xl font-extrabold text-white tracking-widest uppercase">
            {activePeserta ? activePeserta.kategori.toUpperCase() : 'TUNGGAL'}
          </div>
        </div>

        {/* Right IPSI Logo */}
        <IPSILogo />
      </div>

      {/* 3. MAIN CONTAINER GRID */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 p-6 gap-6 z-10 relative overflow-hidden">
        
        {/* Left Column (7/12): Blue Showcase Competitor Details */}
        <section className="lg:col-span-7 flex flex-col justify-between h-full">
          <div className="h-full flex flex-col justify-between p-8 bg-gradient-to-br from-[#121c42] via-[#090b1e] to-[#04040a] border border-blue-500/20 rounded-2xl relative overflow-hidden shadow-[inset_0_0_50px_rgba(30,58,138,0.3)]">
            
            {/* Big "BIRU" or "SUDUT BIRU" Watermark */}
            <div className="absolute top-1/4 left-8 text-[11rem] font-black tracking-tighter text-blue-500/[0.03] uppercase pointer-events-none select-none italic font-sans">
              BIRU
            </div>
            
            <div>
              <span className="text-xs font-black font-mono tracking-[0.2em] text-blue-400 uppercase">
                SUDUT BIRU
              </span>
            </div>

            <div id="tgr-competitor-showcase" className="z-10 mt-auto flex flex-col xl:flex-row xl:items-end justify-between gap-6 w-full font-sans">
              <div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-wide text-white uppercase font-sans">
                  {activePeserta ? activePeserta.nama : 'BENNY G. SUMARSONO'}
                </h2>
                <div className="text-xl md:text-2xl font-bold text-sky-400 uppercase tracking-wider mt-2 font-mono">
                  {activePeserta ? activePeserta.kontingen : 'BALI'}
                </div>
              </div>

              {activePeserta && (
                <div id="tgr-monitor-stats" className="bg-slate-950/80 border border-blue-500/30 rounded-xl p-4 grid grid-cols-2 gap-4 min-w-[280px] shadow-2xl backdrop-blur-md">
                  <div>
                    <div className="text-[9px] font-mono text-amber-400 uppercase font-bold tracking-wider">Median Juri (Basis)</div>
                    <div className="text-xl font-black text-amber-500 mt-0.5">
                      {activeScores.length >= state.jumlahJuri ? medianScore.toFixed(3) : '⏳'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-emerald-400 uppercase font-bold tracking-wider">Kebenaran Gerak</div>
                    <div className="text-xl font-black text-emerald-500 mt-0.5">
                      {activeScores.length >= state.jumlahJuri ? totalKebenaran.toFixed(3) : '⏳'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-cyan-400 uppercase font-bold tracking-wider">Nilai Hukuman</div>
                    <div className="text-xl font-black text-red-500 mt-0.5">
                      -{activePeserta.deductions.toFixed(3)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono text-indigo-400 uppercase font-bold tracking-wider">Standar Deviasi</div>
                    <div className="text-xl font-black text-indigo-500 mt-0.5">
                      {activeScores.length >= state.jumlahJuri ? stdDevScore.toFixed(4) : '⏳'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Column (5/12): Stopwatch/Timer */}
        <section className="lg:col-span-5 flex flex-col justify-center items-center h-full">
          <div className="w-full h-full flex flex-col justify-center items-center p-8 bg-gradient-to-b from-[#12081f] to-[#050308] border border-purple-500/10 rounded-2xl relative overflow-hidden">
            {/* Soft background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-950/20 via-transparent to-transparent opacity-60 pointer-events-none" />

            {/* Timer digital stopwatch frame */}
            <div className="w-full max-w-md bg-[#020105]/95 border-2 border-amber-500/25 rounded-xl p-8 shadow-[0_0_40px_rgba(245,158,11,0.08)] text-center relative z-10">
              
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-500/90 tracking-[0.2em] uppercase font-mono mb-4">
                <span>⏱️ WAKTU TAMPIL (TIMER 2)</span>
              </div>

              {/* Big digits matching screenshot */}
              <div className="text-6xl md:text-7xl lg:text-[5.5rem] font-mono font-black text-amber-400 tracking-wider bg-[#030107]/90 py-5 px-3 rounded-lg border border-amber-500/10 shadow-inner select-none leading-none">
                {formatTime(state.timerSeconds)}
              </div>

              {/* Timer status footer */}
              <div className="mt-5 flex items-center justify-center gap-2.5 text-xs font-mono tracking-widest text-slate-400 uppercase">
                <span className={`w-2.5 h-2.5 rounded-full ${state.timerActive ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                <span>STATUS: {state.timerActive ? 'SEDANG TAMPIL' : 'BELUM MULAI'}</span>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* 4. JURI SCORE GRID (BOTTOM PANEL) */}
      <div id="tgr-juri-scores-grid" className="z-10 bg-black/90 border-t border-purple-950/40 grid grid-cols-10 gap-1.5 p-2 px-3">
        {Array.from({ length: 10 }).map((_, idx) => {
          const juriNum = idx + 1;
          const key = `juri${juriNum}`;
          
          // If juri is not active based on state.jumlahJuri, render disabled empty box
          const isJuriActive = juriNum <= state.jumlahJuri;
          if (!isJuriActive) {
            return (
              <div
                key={juriNum}
                id={`juri-box-inactive-${juriNum}`}
                className="bg-slate-900/40 border border-slate-950/40 rounded-lg py-3 text-center flex flex-col justify-between opacity-30 select-none"
              >
                <div className="text-[11px] font-extrabold uppercase tracking-widest font-sans text-slate-500">
                  {juriNum}
                </div>
                <div className="text-xl font-bold tracking-wide font-sans text-slate-600 mt-1">
                  -
                </div>
              </div>
            );
          }

          // Check if we have score inside active competitor
          const hasScore = activePeserta && activePeserta.scores[key] !== undefined;
          const scoreVal = hasScore ? activePeserta.scores[key] : 9.990; // Starting TGR score
          const isFinalized = activePeserta && activePeserta.finalizedJuries?.includes(key);

          // Color coding match: Juri 5 and 6 are emerald green, others are royal blue
          const isGreen = juriNum === 5 || juriNum === 6;
          
          let bgClass = "";
          if (isFinalized) {
            bgClass = isGreen
              ? 'bg-emerald-600 border-t-2 border-emerald-400 text-white shadow-lg'
              : 'bg-blue-600 border-t-2 border-blue-400 text-white shadow-lg';
          } else {
            bgClass = 'bg-slate-900 border-t-2 border-amber-500/50 text-amber-400 shadow-md';
          }

          return (
            <div
              key={juriNum}
              id={`juri-box-${juriNum}`}
              className={`${bgClass} rounded-lg py-2.5 px-1.5 text-center transition-all duration-300 flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between px-1 text-[10px] font-extrabold uppercase tracking-widest font-sans text-white/80">
                <span>{juriNum}</span>
                {isFinalized ? (
                  <span className="text-emerald-400 font-black text-xs">✔</span>
                ) : (
                  <span className="text-amber-500 text-[8px] animate-pulse">● LIVE</span>
                )}
              </div>
              <div className={`text-2xl font-black tracking-wider font-sans mt-1 ${isFinalized ? 'text-white' : 'text-amber-400'}`}>
                {scoreVal.toFixed(3)}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
