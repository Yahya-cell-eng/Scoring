/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Shield, Play, AlertTriangle, HelpCircle, CheckCircle, Sun, Moon, Maximize2, Minimize2 } from 'lucide-react';
import { MatchState } from '../types';
import { playBeep } from '../utils/sound';

interface MonitorPanelProps {
  state: MatchState;
  onBack: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

interface IconProps {
  active: boolean;
  side?: 'biru' | 'merah';
  className?: string;
}

// 2D SVG Icon Components for beautiful Pencak Silat Warnings & Gestures
const Binaan1Icon = ({ active, side, className = "w-6 h-6" }: IconProps) => (
  <div className="flex items-center justify-center">
    <div className={`transition-all duration-300`}>
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        {/* Wrist */}
        <rect x="17" y="10" width="3" height="5" rx="1" />
        {/* Main fist */}
        <rect x="9" y="8" width="8" height="9" rx="2" />
        {/* Index finger pointing horizontally left */}
        <rect x="2" y="10" width="8" height="2.2" rx="1.1" />
        {/* Thumb curled on top */}
        <path d="M11 6.5 A 1.5 1.5 0 0 1 14 6.5 L 14 9 L 11 9 Z" />
        {/* Separation lines for curled fingers */}
        <rect x="11" y="12" width="4.5" height="1" rx="0.5" fill="white" className="opacity-40" />
        <rect x="11" y="14.5" width="3.5" height="1" rx="0.5" fill="white" className="opacity-40" />
      </svg>
    </div>
  </div>
);

const Binaan2Icon = ({ active, side, className = "w-6 h-6" }: IconProps) => (
  <div className="flex items-center justify-center">
    <div className={`transition-all duration-300`}>
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        {/* Wrist */}
        <rect x="17" y="10" width="3" height="6.5" rx="1" />
        {/* Main fist */}
        <rect x="9" y="8" width="8" height="10.5" rx="2" />
        {/* Index finger pointing horizontally left */}
        <rect x="2" y="9.5" width="8" height="2" rx="1" />
        {/* Middle finger pointing horizontally left */}
        <rect x="2" y="12.5" width="8" height="2" rx="1" />
        {/* Thumb curled on top */}
        <path d="M11 6.5 A 1.5 1.5 0 0 1 14 6.5 L 14 9 L 11 9 Z" />
        {/* Separation line for curled ring finger */}
        <rect x="10" y="15.5" width="4" height="0.8" rx="0.4" fill="white" className="opacity-40" />
      </svg>
    </div>
  </div>
);

const Teguran1Icon = ({ active, className = "w-6 h-6" }: IconProps) => (
  <div className="flex items-center justify-center">
    <div className={`transition-all duration-300`}>
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        {/* Main hand box */}
        <rect x="7" y="10" width="10" height="8" rx="2" />
        {/* Wrist */}
        <rect x="10" y="18" width="4" height="3" rx="1" />
        {/* Index finger pointing vertically up */}
        <rect x="8.5" y="3" width="2.2" height="8" rx="1" />
        {/* Curled thumb on side */}
        <path d="M17.5 11 A 1.2 1.2 0 0 0 16 12 L 15 15 L 18 14 Z" />
        {/* Separation lines for other fingers internally */}
        <rect x="11.5" y="11" width="1" height="5" rx="0.5" fill="white" className="opacity-40" />
        <rect x="14" y="12" width="1" height="4" rx="0.5" fill="white" className="opacity-40" />
      </svg>
    </div>
  </div>
);

const Teguran2Icon = ({ active, className = "w-6 h-6" }: IconProps) => (
  <div className="flex items-center justify-center">
    <div className={`transition-all duration-300`}>
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        {/* Main hand box */}
        <rect x="7" y="10" width="10" height="8" rx="2" />
        {/* Wrist */}
        <rect x="10" y="18" width="4" height="3" rx="1" />
        {/* Index finger pointing vertically up */}
        <rect x="8" y="3" width="2" height="8" rx="1" />
        {/* Middle finger pointing vertically up */}
        <rect x="11.5" y="3" width="2" height="8" rx="1" />
        {/* Curled thumb on side */}
        <path d="M17.5 11 A 1.2 1.2 0 0 0 16 12 L 15 15 L 18 14 Z" />
        {/* Separation lines internally */}
        <rect x="14.5" y="11" width="1" height="5" rx="0.5" fill="white" className="opacity-40" />
      </svg>
    </div>
  </div>
);

const Peringatan1Icon = ({ active, className = "w-6 h-6" }: IconProps) => (
  <div className="flex items-center justify-center">
    <div className={`transition-all duration-300`}>
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <circle cx="12" cy="12" r="10" />
        <rect x="11" y="6" width="2" height="7" rx="1" fill="white" />
        <circle cx="12" cy="16.5" r="1.25" fill="white" />
      </svg>
    </div>
  </div>
);

const Peringatan2Icon = ({ active, className = "w-6 h-6" }: IconProps) => (
  <div className="flex items-center justify-center">
    <div className={`transition-all duration-300`}>
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M12 2L2 20C1.3 21.2 2.2 22 3.5 22H20.5C21.8 22 22.7 21.2 22 20L12 2Z" />
        <rect x="11" y="9" width="2" height="6.5" rx="1" fill="white" />
        <circle cx="12" cy="18.5" r="1.25" fill="white" />
      </svg>
    </div>
  </div>
);

const DisqualifikasiIcon = ({ active, className = "w-6 h-6" }: IconProps) => (
  <div className="flex items-center justify-center">
    <div className={`transition-all duration-300 ${active ? 'text-white' : 'text-slate-300'}`}>
      <svg viewBox="0 0 64 64" className={className} fill="currentColor">
        <circle cx="32" cy="18" r="7" />
        <rect x="30" y="24" width="4" height="4" rx="1" />
        <path d="M20,54 C20,38 23,32 32,32 C41,32 44,38 44,54 Z" />
        <path d="M21,34 L43,50 C44.5,51 46,49.5 45,48 L23,32 Z" />
        <path d="M43,34 L21,50 C19.5,51 18,49.5 19,48 L41,32 Z" className="opacity-90" />
        <path d="M28,34 L32,44 L36,34" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60" />
        <path d="M26,50 H38" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-80" />
        <circle cx="16" cy="16" r="8" className="fill-slate-900 stroke-red-500" strokeWidth="1.5" />
        <text x="16" y="19" textAnchor="middle" fontSize="6.5" className="fill-red-550 font-black tracking-tighter" style={{ fontStyle: 'normal' }}>DSK</text>
      </svg>
    </div>
  </div>
);

const renderShape = (shape: 'circle' | 'square' | 'triangle' | 'star', color: string, size: number) => {
  switch (shape) {
    case 'circle':
      return <div style={{ width: size, height: size, backgroundColor: color, borderRadius: '50%' }} />;
    case 'square':
      return <div style={{ width: size, height: size, backgroundColor: color }} />;
    case 'triangle':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 22H22L12 2Z" fill={color} />
        </svg>
      );
    case 'star':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" fill={color} />
        </svg>
      );
  }
};

export default function MonitorPanel({ state, onBack, theme, onToggleTheme }: MonitorPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    playBeep('click');
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  };

  const [flashBlue, setFlashBlue] = useState(false);
  const [flashRed, setFlashRed] = useState(false);

  // Generate stable cached set of multi-burst particles for premium winner celebration screen
  const particles = React.useMemo(() => {
    return [];
  }, [state.matchStatus, state.winner]);

  // High-Resolution Scale multiplier state for LED and TV setups
  const [scaleFactor, setScaleFactor] = useState(() => {
    const saved = localStorage.getItem('monitor_zoom');
    return saved ? parseFloat(saved) : 1.0;
  });

  const handleZoomChange = (delta: number) => {
    playBeep('click');
    setScaleFactor(prev => {
      const next = Math.max(0.7, Math.min(2.0, prev + delta));
      localStorage.setItem('monitor_zoom', next.toFixed(2));
      return parseFloat(next.toFixed(2));
    });
  };

  // Poll for valid score chimes & screen flashes in real-time
  useEffect(() => {
    if (state.lastValidScore) {
      const scaleAge = Date.now() - state.lastValidScore.timestamp;
      if (scaleAge < 1100) {
        // Trigger visual flash
        if (state.lastValidScore.sudut === 'biru') {
          setFlashBlue(true);
          setTimeout(() => setFlashBlue(false), 900);
        } else {
          setFlashRed(true);
          setTimeout(() => setFlashRed(false), 950);
        }
        
        // Play dual chimes sound on Monitor
        playBeep('valid');
      }
    }
  }, [state.lastValidScore]);

  // Play warning sirens when game transitions to babak habis
  useEffect(() => {
    if (state.matchStatus === 'babak_habis') {
      playBeep('alert');
    }
  }, [state.matchStatus]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate Juri Hits filtered by type
  const getJuriActionCount = (jNum: 1 | 2 | 3, sudut: 'merah' | 'biru', aksi: 'punch' | 'kick', babakNum: number) => {
    if (!state.juriHits) return 0;
    return state.juriHits.filter(h => h.juriId === jNum && h.sudut === sudut && h.aksi === aksi && h.babak === babakNum).length;
  };

  const redPen = state.dewanPenalties.merah;
  const bluePen = state.dewanPenalties.biru;
  const v = state.verification;

  return (
    <div className={`w-full h-full flex flex-col justify-between p-4 transition-colors duration-300 select-none overflow-hidden relative ${
      theme === 'dark' ? 'bg-[#0b0f19] text-slate-100' : 'bg-[#f1f5f9] text-[#1e293b]'
    }`}>
      
      {/* Decorative clean ambient subtle gradient */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-300 ${
        theme === 'dark' ? 'bg-gradient-to-tr from-[#050811] via-[#0d1527] to-[#04070e]' : 'bg-gradient-to-tr from-slate-100 via-white to-slate-50'
      }`} />

      {/* Dynamic Watermark background logo in deep center of screen */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
        {state.logoTengah ? (
          <img 
            src={state.logoTengah} 
            alt="Watermark Logo" 
            className="w-[45%] h-[45%] object-contain opacity-[0.03] dark:opacity-[0.05] transition-all duration-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="text-slate-500/5 dark:text-slate-400/5 text-[9vw] font-black uppercase tracking-[1.5rem] select-none text-center">
            Pencak Silat
          </div>
        )}
      </div>

      {/* Symmetrical High-Res Scale Container to prevent bounds overflowing while blowing up crisp graphics */}
      <div 
        className="w-full h-full flex flex-col justify-between z-10"
        style={{
          transform: `scale(${scaleFactor})`,
          width: `${100 / scaleFactor}%`,
          height: `${100 / scaleFactor}%`,
          transformOrigin: 'top left',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1), height 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >

        {/* 1. Header (Monitor Match Stats & Logos) styled in elite IPSI grey-blue format */}
        <div className={`border py-3.5 px-6 rounded-2xl shadow-sm z-10 flex-shrink-0 relative transition-all duration-300 ${
          theme === 'dark' ? 'bg-[#151d30] border-[#1e293b] text-slate-100' : 'bg-[#cbd5e1] border border-slate-300 text-slate-800'
        }`}>
          
          {/* Centered pill for 'Pencak silat' tab or custom event name with logo */}
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[1px] text-[10px] md:text-xs font-black tracking-widest px-8 py-1.5 rounded-b-xl shadow-md uppercase font-sans flex items-center justify-center gap-2 transition-all ${
            theme === 'dark' ? 'bg-[#0f172a] text-slate-300 border-x border-b border-slate-800' : 'bg-[#1e293b] text-white'
          }`}>
            {state.logoTengah ? (
              <img src={state.logoTengah} alt="Logo" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
            ) : null}
            <span>{state.namaEvent || "Pencak Silat"}</span>
          </div>

          <div className="flex items-center justify-between mt-1">
            
            {/* Far Left Logo/Flag group and zoom factor control */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => { playBeep('click'); onBack(); }}
                className={`p-1.5 px-3 rounded text-[10px] uppercase font-extrabold transition-all border cursor-pointer shadow-sm ${
                  theme === 'dark' ? 'bg-[#0f172a] hover:bg-slate-800 border-slate-800 text-slate-300' : 'bg-[#1e293b] hover:bg-slate-800 border-slate-700 text-white'
                }`}
              >
                ← Menu
              </button>

              <button
                onClick={onToggleTheme}
                className={`p-1.5 rounded border transition-colors cursor-pointer flex items-center justify-center ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-850 hover:bg-slate-800 text-amber-500' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-600'
                }`}
                title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={toggleFullscreen}
                className={`p-1.5 rounded border transition-colors cursor-pointer flex items-center justify-center ${
                  theme === 'dark' ? 'bg-[#0f172a] border-slate-850 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-600'
                }`}
                title="Toggle Fullscreen"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Zoom Selector for LED/TV */}
              <div className={`flex items-center border rounded-md p-0.5 font-mono text-[9px] shadow-inner ${
                theme === 'dark' ? 'bg-[#0f172a] border-slate-800 text-slate-400' : 'bg-white border-slate-300 text-slate-500'
              }`}>
                <button 
                  onClick={() => handleZoomChange(-0.05)} 
                  className={`p-0.5 rounded transition-all font-black text-xs h-5.5 w-5.5 flex items-center justify-center cursor-pointer ${
                    theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Zoom Out"
                >
                  -
                </button>
                <span className={`px-2 font-black min-w-[2.4rem] text-center ${
                  theme === 'dark' ? 'text-slate-200' : 'text-slate-800'
                }`}>
                  {Math.round(scaleFactor * 100)}%
                </span>
                <button 
                  onClick={() => handleZoomChange(0.05)} 
                  className={`p-0.5 rounded transition-all font-black text-xs h-5.5 w-5.5 flex items-center justify-center cursor-pointer ${
                    theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                  }`}
                  title="Zoom In"
                >
                  +
                </button>
              </div>

              {/* Mini flag and crest */}
              <div className="flex items-center gap-1.5 ml-1">
                <div className="flex flex-col w-7 h-[18px] border border-slate-350 rounded overflow-hidden shadow-sm flex-shrink-0">
                  <div className="bg-[#e01a22] h-1/2 w-full" />
                  <div className="bg-white h-1/2 w-full" />
                </div>
                <div className="w-8.5 h-8.5 rounded-full bg-white border border-slate-300 flex items-center justify-center font-black text-[9px] text-blue-900 shadow-sm overflow-hidden p-0.5">
                  {state.logoKiri ? (
                    <img src={state.logoKiri} alt="Logo IPSI" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    "IPSI"
                  )}
                </div>
              </div>
            </div>

            {/* Middle Tournament Details Block */}
            <div className="grid grid-cols-3 gap-0.5 max-w-4xl w-[55%] text-slate-700 font-extrabold font-sans text-[11px] leading-tight text-center uppercase transform translate-y-2.5 pt-2">
              <div className="text-left text-[#0f2b5c] font-black text-xs md:text-sm tracking-wide">
                GELANGGANG A
              </div>
              <div className="text-slate-600 font-black text-xs md:text-sm tracking-wide">
                PENYISIHAN
              </div>
              <div className="text-right text-[#0f2b5c] font-black text-xs md:text-sm tracking-wide">
                TANDING KELAS - {state.kelas} {state.gender}
              </div>
            </div>

            {/* Far Right Logo/Flag group with prominently enlarged PARTAI badge */}
            <div className="flex items-center gap-3">
              <div className={`px-4 py-1.5 rounded-2xl shadow-md flex flex-col items-center justify-center font-mono leading-none border transition-all duration-300 hover:scale-105 ${
                theme === 'dark' 
                  ? 'bg-indigo-950/80 border-indigo-500/35 text-white' 
                  : 'bg-white border-slate-300 text-slate-900 shadow-slate-200'
              }`}>
                <div className={`text-[9px] font-black tracking-widest uppercase mb-1 ${
                  theme === 'dark' ? 'text-indigo-400' : 'text-slate-500'
                }`}>PARTAI</div>
                <div className="text-xl md:text-2xl font-extrabold leading-none">{state.partai}</div>
              </div>
              
              <div className="flex items-center gap-1.5">
                <div className="w-8.5 h-8.5 rounded-full bg-white border border-slate-300 flex items-center justify-center font-black text-[9px] text-red-750 shadow-sm overflow-hidden p-0.5">
                  {state.logoKanan ? (
                    <img src={state.logoKanan} alt="Logo IPSI" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    "IPSI"
                  )}
                </div>
                <div className="flex flex-col w-7 h-[18px] border border-slate-350 rounded overflow-hidden shadow-sm flex-shrink-0">
                  <div className="bg-[#e01a22] h-1/2 w-full" />
                  <div className="bg-white h-1/2 w-full" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 1.5 Sub Header: Athlete Information with Flag, User Circles & Countdown Timer */}
        <div className="grid grid-cols-12 gap-4 items-center bg-white border border-slate-200 py-3.5 px-6 rounded-2xl shadow-sm mt-3 flex-shrink-0">
          
          {/* Blue corner athlete description */}
          <div className="col-span-4 flex items-center gap-3">
            {/* Miniature flag + user avatar */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex flex-col w-8.5 h-[22px] border border-slate-300 rounded overflow-hidden shadow-sm flex-shrink-0">
                <div className="bg-[#e01a22] h-1/2 w-full" />
                <div className="bg-white h-1/2 w-full" />
              </div>
              <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-400 text-blue-600 shadow-md flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6.5 h-6.5 fill-current">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            </div>

            <div className="text-left font-sans truncate">
              <h2 className="text-base md:text-lg font-black text-slate-800 leading-none">
                {state.atletBiru.nama || "Pesilat X"}
              </h2>
              <div className="text-[9px] md:text-[10px] font-black text-blue-600 tracking-wider uppercase leading-none mt-1">
                KONTINGEN
              </div>
              <div className="text-xs md:text-sm font-extrabold text-blue-500 leading-none mt-0.5 truncate max-w-[12rem] bg-blue-50 border border-blue-100/50 px-2 py-0.5 rounded inline-block">
                {state.atletBiru.kontingen || "Kontingen X"}
              </div>
            </div>
          </div>

          {/* TIMER COUNTDOWN */}
          <div className="col-span-4 flex flex-col items-center justify-center">
            <div className={`text-4xl md:text-5xl lg:text-[3.4rem] font-mono leading-none tracking-wider text-slate-900 font-extrabold font-black ${state.timerActive ? 'text-green-600 animate-pulse' : ''}`}>
              {formatTimer(state.timerSeconds)}
            </div>
          </div>

          {/* Red corner athlete description */}
          <div className="col-span-4 flex items-center gap-3 justify-end text-right">
            <div className="text-right font-sans truncate">
              <h2 className="text-base md:text-lg font-black text-slate-800 leading-none">
                {state.atletMerah.nama || "Pesilat IX"}
              </h2>
              <div className="text-[9px] md:text-[10px] font-black text-red-650 tracking-wider uppercase leading-none mt-1">
                KONTINGEN
              </div>
              <div className="text-xs md:text-sm font-extrabold text-red-500 leading-none mt-0.5 truncate max-w-[12rem] bg-red-50 border border-red-100/50 px-2 py-0.5 rounded inline-block">
                {state.atletMerah.kontingen || "Kontingen IX"}
              </div>
            </div>

            {/* User avatar + Miniature flag */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-11 h-11 rounded-full bg-red-50 border border-red-400 text-red-600 shadow-md flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-6.5 h-6.5 fill-current">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <div className="flex flex-col w-8.5 h-[22px] border border-slate-300 rounded overflow-hidden shadow-sm flex-shrink-0">
                <div className="bg-[#e01a22] h-1/2 w-full" />
                <div className="bg-white h-1/2 w-full" />
              </div>
            </div>
          </div>

        </div>

        {/* 2. Main Arena Symmetrical Grid Wrapper */}
        <div className="grid grid-cols-12 gap-4 flex-1 my-3 min-h-0 z-10 items-stretch" style={{ gridTemplateRows: '1fr' }}>
          
          {/* LEFT CORNER BLUE PENALTY CONTAINER GRID (Pencak Silat Warns, Reprimands in white blocks) */}
          <div className="col-span-12 md:col-span-2 flex flex-col justify-between gap-1.5 h-full">
            
            {/* ROW 1: Binaan 1 & 2 (Pointing finger left/right) */}
            <div className="grid grid-cols-2 gap-1.5 flex-1">
              <div className={`border rounded-xl flex flex-col items-center justify-center p-1 transition-all shadow-sm ${bluePen.binaan1 ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95' : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400'}`}>
                <Binaan1Icon active={!!bluePen.binaan1} side="biru" className="w-7 h-7" />
                <span className={`text-[7.5px] font-black uppercase mt-1 ${bluePen.binaan1 ? 'text-slate-950' : 'text-slate-800 dark:text-slate-200'}`}>BINAAN 1</span>
              </div>
              <div className={`border rounded-xl flex flex-col items-center justify-center p-1 transition-all shadow-sm ${bluePen.binaan2 ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95' : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400'}`}>
                <Binaan2Icon active={!!bluePen.binaan2} side="biru" className="w-7 h-7" />
                <span className={`text-[7.5px] font-black uppercase mt-1 ${bluePen.binaan2 ? 'text-slate-950' : 'text-slate-800 dark:text-slate-200'}`}>BINAAN 2</span>
              </div>
            </div>

            {/* ROW 2: Teguran 1 & 2 (Index fingers single/peace) */}
            <div className="grid grid-cols-2 gap-1.5 flex-1">
              <div className={`border rounded-xl flex flex-col items-center justify-center p-1 transition-all shadow-sm ${bluePen.teguran1 ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95 animate-pulse' : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400'}`}>
                <Teguran1Icon active={!!bluePen.teguran1} className="w-7 h-7" />
                <span className={`text-[7.5px] font-black uppercase mt-1 ${bluePen.teguran1 ? 'text-slate-950' : 'text-slate-800 dark:text-slate-200'}`}>TEGURAN 1</span>
              </div>
              <div className={`border rounded-xl flex flex-col items-center justify-center p-1 transition-all shadow-sm ${bluePen.teguran2 ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95 animate-pulse' : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400'}`}>
                <Teguran2Icon active={!!bluePen.teguran2} className="w-7 h-7" />
                <span className={`text-[7.5px] font-black uppercase mt-1 ${bluePen.teguran2 ? 'text-slate-950' : 'text-slate-800 dark:text-slate-200'}`}>TEGURAN 2</span>
              </div>
            </div>

            {/* ROW 3: Peringatan 1, 2 & Disqualified (Warning cards and referees) */}
            <div className="grid grid-cols-3 gap-1.5 flex-1">
              <div className={`border rounded-xl flex flex-col items-center justify-center p-1 transition-all shadow-sm ${bluePen.peringatan1 ? 'bg-red-500 border-red-650 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400'}`}>
                <Peringatan1Icon active={!!bluePen.peringatan1} className="w-6.5 h-6.5" />
                <span className={`text-[7px] font-black uppercase mt-1 ${bluePen.peringatan1 ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>PER 1</span>
              </div>
              <div className={`border rounded-xl flex flex-col items-center justify-center p-1 transition-all shadow-sm ${bluePen.peringatan2 ? 'bg-red-650 border-red-700 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400'}`}>
                <Peringatan2Icon active={!!bluePen.peringatan2} className="w-6.5 h-6.5" />
                <span className={`text-[7px] font-black uppercase mt-1 ${bluePen.peringatan2 ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>PER 2</span>
              </div>
              <div className={`border rounded-xl flex flex-col items-center justify-center p-1 transition-all shadow-sm ${bluePen.disqualified ? 'bg-red-700 border-red-855 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400'}`}>
                <DisqualifikasiIcon active={!!bluePen.disqualified} className="w-6.5 h-6.5" />
                <span className={`text-[7px] font-black uppercase mt-1 ${bluePen.disqualified ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>DSK</span>
              </div>
            </div>

          </div>

          {/* BLUE SCORE PANEL (3 columns) - Immersive Gradient, Huge Numbers */}
          <div 
            className={`col-span-12 md:col-span-3 rounded-3xl overflow-hidden shadow-lg border-2 transition-all duration-300 relative flex flex-col justify-center items-center bg-gradient-to-r from-[#03315a] to-[#01a2e2] ${
              flashBlue ? 'border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.35)] scale-[1.01]' : 'border-slate-300/40'
            }`}
          >
            {/* Ambient white flash modifier overlay */}
            <AnimatePresence>
              {flashBlue && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white mix-blend-overlay pointer-events-none" 
                />
              )}
            </AnimatePresence>

            <span className="absolute top-4 left-6 text-cyan-200/60 text-[10px] md:text-xs tracking-widest font-black uppercase">
              SUDUT BIRU
            </span>

            {/* Giant Score */}
            <div className="text-[8.5rem] md:text-[11.5rem] lg:text-[13rem] font-mono leading-none font-black text-white block select-none drop-shadow-md">
              {state.scores.biru.total}
            </div>

            <span className="absolute bottom-4 right-6 text-cyan-200/40 text-[9px] font-mono tracking-wider font-extrabold">
              IPSI OFFICIAL DIGITAL
            </span>
          </div>

          {/* CENTER STACK COLUMN: Event logo and single Babak indicator */}
          <div className="col-span-12 md:col-span-2 flex flex-col justify-between items-center h-full py-4 gap-4">
            
            {/* Event Logo container at the top of the middle section */}
            <div className="flex-1 flex items-center justify-center w-full min-h-[90px] md:min-h-[120px]">
              {state.logoTengah ? (
                <div className="p-2 bg-white/10 dark:bg-slate-900/40 border border-slate-200/20 dark:border-slate-800/60 rounded-2xl shadow-inner backdrop-blur-sm flex items-center justify-center max-w-[95px] max-h-[95px] md:max-w-[120px] md:max-h-[120px] aspect-square overflow-hidden hover:scale-105 transition-all">
                  <img 
                    src={state.logoTengah} 
                    alt="Event Logo" 
                    className="w-full h-full object-contain filter drop-shadow-md"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-dashed border-slate-300 dark:border-slate-705 flex flex-col items-center justify-center text-center opacity-40 text-slate-450 dark:text-slate-550 select-none">
                  <span className="text-[9px] font-black uppercase tracking-wider">No Logo</span>
                </div>
              )}
            </div>

            {/* Single Babak Indicator Box */}
            <div className={`w-full max-w-[125px] border-2 rounded-2xl flex flex-col items-center justify-center py-3.5 px-3 transition-all duration-300 shadow-lg ${
              theme === 'dark' 
                ? 'bg-gradient-to-b from-[#151d30] to-[#0f172a] border-amber-500/80 shadow-amber-955/5 text-slate-100' 
                : 'bg-gradient-to-b from-white to-slate-50 border-amber-400 shadow-slate-200 text-slate-800'
            }`}>
              <span className="text-[10px] tracking-[0.2em] font-black text-amber-500 dark:text-amber-400 uppercase leading-none mb-1 text-center font-sans">
                BABAK
              </span>
              <span className="text-3xl md:text-5xl font-mono font-black border-t border-slate-200/25 dark:border-slate-700/35 pt-1.5 w-full text-center leading-none">
                {state.currentBabak}
              </span>
            </div>

          </div>

          {/* RED SCORE PANEL (3 columns) - Vibrant Red Gradient, Huge Numbers */}
          <div 
            className={`col-span-12 md:col-span-3 rounded-3xl overflow-hidden shadow-lg border-2 transition-all duration-300 relative flex flex-col justify-center items-center bg-gradient-to-r from-[#980005] to-[#eb0505] ${
              flashRed ? 'border-orange-450 shadow-[0_0_40px_rgba(249,115,22,0.35)] scale-[1.01]' : 'border-slate-300/40'
            }`}
          >
            {/* Ambient white flash modifier overlay */}
            <AnimatePresence>
              {flashRed && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white mix-blend-overlay pointer-events-none" 
                />
              )}
            </AnimatePresence>

            <span className="absolute top-4 right-6 text-red-200/60 text-[10px] md:text-xs tracking-widest font-black uppercase">
              SUDUT MERAH
            </span>

            {/* Giant Score */}
            <div className="text-[8.5rem] md:text-[11.5rem] lg:text-[13rem] font-mono leading-none font-black text-white block select-none drop-shadow-md">
              {state.scores.merah.total}
            </div>

            <span className="absolute bottom-4 left-6 text-red-200/40 text-[9px] font-mono tracking-wider font-extrabold">
              IPSI OFFICIAL DIGITAL
            </span>
          </div>

          {/* RIGHT CORNER RED PENALTY CONTAINER GRID (Warnings, Reprimands in white blocks) */}
          <div className="col-span-12 md:col-span-2 flex flex-col justify-between gap-1.5 h-full">
            
            {/* ROW 1: BINAAN 1 & 2 */}
            <div className="grid grid-cols-2 gap-1.5 flex-1">
              <div className={`border rounded-xl flex flex-col items-center justify-center p-1 transition-all shadow-sm ${redPen.binaan1 ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95' : 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400'}`}>
                <Binaan1Icon active={!!redPen.binaan1} side="merah" className="w-7 h-7" />
                <span className={`text-[7.5px] font-black uppercase mt-1 ${redPen.binaan1 ? 'text-slate-950' : 'text-slate-800 dark:text-slate-200'}`}>BINAAN 1</span>
              </div>
              <div className={`border rounded-xl flex flex-col items-center justify-center p-1 transition-all shadow-sm ${redPen.binaan2 ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95' : 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400'}`}>
                <Binaan2Icon active={!!redPen.binaan2} side="merah" className="w-7 h-7" />
                <span className={`text-[7.5px] font-black uppercase mt-1 ${redPen.binaan2 ? 'text-slate-950' : 'text-slate-800 dark:text-slate-200'}`}>BINAAN 2</span>
              </div>
            </div>

            {/* ROW 2: Teguran 1 & 2 (Index fingers single/peace) */}
            <div className="grid grid-cols-2 gap-1.5 flex-1">
              <div className={`border rounded-xl flex flex-col items-center justify-center p-1 transition-all shadow-sm ${redPen.teguran1 ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95 animate-pulse' : 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400'}`}>
                <Teguran1Icon active={!!redPen.teguran1} className="w-7 h-7" />
                <span className={`text-[7.5px] font-black uppercase mt-1 ${redPen.teguran1 ? 'text-slate-950' : 'text-slate-800 dark:text-slate-200'}`}>TEGURAN 1</span>
              </div>
              <div className={`border rounded-xl flex flex-col items-center justify-center p-1 transition-all shadow-sm ${redPen.teguran2 ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95 animate-pulse' : 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400'}`}>
                <Teguran2Icon active={!!redPen.teguran2} className="w-7 h-7" />
                <span className={`text-[7.5px] font-black uppercase mt-1 ${redPen.teguran2 ? 'text-slate-950' : 'text-slate-800 dark:text-slate-200'}`}>TEGURAN 2</span>
              </div>
            </div>

            {/* ROW 3: Peringatan 1, 2 & Disqualified (Warning cards and referees) */}
            <div className="grid grid-cols-3 gap-1.5 flex-1">
              <div className={`border rounded-xl flex flex-col items-center justify-center p-1 transition-all shadow-sm ${redPen.peringatan1 ? 'bg-red-500 border-red-650 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400'}`}>
                <Peringatan1Icon active={!!redPen.peringatan1} className="w-6.5 h-6.5" />
                <span className={`text-[7px] font-black uppercase mt-1 ${redPen.peringatan1 ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>PER 1</span>
              </div>
              <div className={`border rounded-xl flex flex-col items-center justify-center p-1 transition-all shadow-sm ${redPen.peringatan2 ? 'bg-red-650 border-red-700 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400'}`}>
                <Peringatan2Icon active={!!redPen.peringatan2} className="w-6.5 h-6.5" />
                <span className={`text-[7px] font-black uppercase mt-1 ${redPen.peringatan2 ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>PER 2</span>
              </div>
              <div className={`border rounded-xl flex flex-col items-center justify-center p-1 transition-all shadow-sm ${redPen.disqualified ? 'bg-red-700 border-red-855 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400'}`}>
                <DisqualifikasiIcon active={!!redPen.disqualified} className="w-6.5 h-6.5" />
                <span className={`text-[7px] font-black uppercase mt-1 ${redPen.disqualified ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>DSK</span>
              </div>
            </div>

          </div>

        </div>

        {/* 3. Bottom Row: Symmetrical Juri Hits Breakdown */}
        {/* Row 1 (Punches ✊) */}
        <div className="grid grid-cols-12 gap-3 items-center mt-1 flex-shrink-0">
          
          {/* Blue Corner Juri punches */}
          <div className="col-span-5 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((num) => (
              <div key={num} className="bg-white border border-slate-300 rounded-xl p-2 shadow-sm text-center font-mono">
                <span className="text-[8.5px] text-slate-500 font-extrabold uppercase block leading-none">Juri {num}</span>
                <span className="text-xl md:text-2xl font-black text-blue-600 tracking-tight leading-none block mt-1">
                  {getJuriActionCount(num as any, 'biru', 'punch', state.currentBabak)}
                </span>
              </div>
            ))}
          </div>

          {/* Center Punch Indicator ✊ */}
          <div className="col-span-2 flex justify-center">
            <div className="w-10 h-10 border border-slate-300 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-800" title="Kategori Pukulan (+1)">
              <span className="text-xl">✊</span>
            </div>
          </div>

          {/* Red Corner Juri punches */}
          <div className="col-span-5 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((num) => (
              <div key={num} className="bg-white border border-slate-300 rounded-xl p-2 shadow-sm text-center font-mono">
                <span className="text-[8.5px] text-slate-500 font-extrabold uppercase block leading-none">Juri {num}</span>
                <span className="text-xl md:text-2xl font-black text-red-600 tracking-tight leading-none block mt-1">
                  {getJuriActionCount(num as any, 'merah', 'punch', state.currentBabak)}
                </span>
              </div>
            ))}
          </div>

        </div>

        {/* Row 2 (Kicks 🦵) */}
        <div className="grid grid-cols-12 gap-3 items-center mt-2 flex-shrink-0">
          
          {/* Blue Corner Juri kicks */}
          <div className="col-span-5 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((num) => (
              <div key={num} className="bg-white border border-slate-300 rounded-xl p-2 shadow-sm text-center font-mono">
                <span className="text-[8.5px] text-slate-500 font-extrabold uppercase block leading-none">Juri {num}</span>
                <span className="text-xl md:text-2xl font-black text-blue-600 tracking-tight leading-none block mt-1">
                  {getJuriActionCount(num as any, 'biru', 'kick', state.currentBabak)}
                </span>
              </div>
            ))}
          </div>

          {/* Center Kick Indicator 🥋 */}
          <div className="col-span-2 flex justify-center">
            <div className="w-10 h-10 border border-slate-300 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-800" title="Kategori Tendangan (+2)">
              <span className="text-xl">🥋</span>
            </div>
          </div>

          {/* Red Corner Juri kicks */}
          <div className="col-span-5 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((num) => (
              <div key={num} className="bg-white border border-slate-300 rounded-xl p-2 shadow-sm text-center font-mono">
                <span className="text-[8.5px] text-slate-500 font-extrabold uppercase block leading-none">Juri {num}</span>
                <span className="text-xl md:text-2xl font-black text-red-600 tracking-tight leading-none block mt-1">
                  {getJuriActionCount(num as any, 'merah', 'kick', state.currentBabak)}
                </span>
              </div>
            ))}
          </div>

        </div>

        {/* 4. Overlay & Alerts */}
        <AnimatePresence>
          {v.active && (
            <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-xl z-[9990] px-4">
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                className="bg-[#1e293b] border-2 border-yellow-500 p-4 rounded-xl flex items-center justify-between shadow-2xl text-white"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-yellow-500 animate-spin" />
                  <div className="font-mono text-[11px]">
                    <div className="font-black text-yellow-400 uppercase tracking-widest leading-none">PROSES VERIFIKASI DEWAN</div>
                    <div className="text-slate-300 mt-1">Kategori: <span className="text-white font-bold">{v.type}</span></div>
                  </div>
                </div>

                <div className="text-right">
                  {v.votes.juri1 && v.votes.juri2 && v.votes.juri3 ? (
                    <div className="text-xs font-mono font-black uppercase text-green-400 border border-green-800/40 bg-green-950/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      KEPUTUSAN: {v.result === 'TIDAK_SAH' ? 'TIDAK SAH' : `${v.result}`}
                    </div>
                  ) : (
                    <div className="text-xs font-mono font-bold text-yellow-400 uppercase tracking-widest animate-pulse">
                      MENANTAI SUARA JURI...
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {state.matchStatus === 'selesai' && (
            <div className="fixed inset-0 bg-[#000000d0] backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-hidden select-none">
              
              {/* WINNER MODAL BLOCK WITH HIGHLIGHT ACCENT BORDER (COMPLETELY WITHOUT CELEBRATION ANIMATIONS OR AUDIO EFFECT) */}
              <div
                className={`bg-white border-4 max-w-lg w-full p-8 rounded-3xl shadow-2xl text-center relative overflow-hidden z-10 ${
                  state.winner === 'biru' ? 'border-blue-500' : state.winner === 'merah' ? 'border-red-500' : 'border-amber-400'
                }`}
              >
                <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                
                <span className="text-xs font-black tracking-widest text-[#003366] uppercase font-mono bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                  PERTANDINGAN SELESAI
                </span>

                <h3 className="text-3xl font-black uppercase mt-5 text-slate-900 tracking-tight leading-normal border-b border-slate-200 pb-4">
                  {state.winner === 'biru' ? state.atletBiru.nama : state.winner === 'merah' ? state.atletMerah.nama : 'PERTANDINGAN SERI'}
                </h3>

                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mt-6 font-mono text-center">
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-150">
                    <span className="text-[10px] text-blue-700 uppercase font-bold block">TOTAL BIRU</span>
                    <div className="text-2xl font-black text-blue-900 mt-1">{state.scores.biru.total}</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-xl border border-red-150">
                    <span className="text-[10px] text-red-700 uppercase font-bold block">TOTAL MERAH</span>
                    <div className="text-2xl font-black text-red-900 mt-1">{state.scores.merah.total}</div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 font-mono mt-6">
                  Menanti admin sekretaris menyetel partai selanjutnya untuk memulai skoring kembali.
                </p>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Decorative Brand footer credit */}
        <div className="absolute bottom-1 left-2 text-slate-450 text-[9px] font-mono leading-none tracking-widest uppercase font-bold select-none opacity-60">
          IPSI OFFICIAL MONITOR BOARD SYSTEM
        </div>

      </div> {/* End Scalable Container */}
    </div>
  );
}
