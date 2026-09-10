/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Shield, Award, HelpCircle, CheckCircle, AlertTriangle, 
  Sun, Moon, RotateCcw, Flag, Lock, Unlock, Maximize2, Minimize2, 
  Undo2, Play, Pause, RefreshCw, Zap, X
} from 'lucide-react';
import { MatchState } from '../types';
import { playBeep } from '../utils/sound';
import ThemePaletteSelector from './ThemePaletteSelector';
import AnimatedScore from './AnimatedScore';

interface DewanPanelProps {
  state: MatchState;
  dispatch: (action: string, payload?: any) => void;
  onBack: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

interface IconProps {
  active: boolean;
  side?: 'biru' | 'merah';
  className?: string;
}

// Custom SVG Icon Components
const Binaan1Icon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <rect x="17" y="10" width="3" height="5" rx="1" />
    <rect x="9" y="8" width="8" height="9" rx="2" />
    <rect x="2" y="10" width="8" height="2.2" rx="1.1" />
    <path d="M11 6.5 A 1.5 1.5 0 0 1 14 6.5 L 14 9 L 11 9 Z" />
    <rect x="11" y="12" width="4.5" height="1" rx="0.5" fill="white" className="opacity-40" />
    <rect x="11" y="14.5" width="3.5" height="1" rx="0.5" fill="white" className="opacity-40" />
  </svg>
);

const Binaan2Icon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <rect x="17" y="10" width="3" height="6.5" rx="1" />
    <rect x="9" y="8" width="8" height="10.5" rx="2" />
    <rect x="2" y="9.5" width="8" height="2" rx="1" />
    <rect x="2" y="12.5" width="8" height="2" rx="1" />
    <path d="M11 6.5 A 1.5 1.5 0 0 1 14 6.5 L 14 9 L 11 9 Z" />
    <rect x="10" y="15.5" width="4" height="0.8" rx="0.4" fill="white" className="opacity-40" />
  </svg>
);

const Teguran1Icon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <rect x="7" y="10" width="10" height="8" rx="2" />
    <rect x="10" y="18" width="4" height="3" rx="1" />
    <rect x="8.5" y="3" width="2.2" height="8" rx="1" />
    <path d="M17.5 11 A 1.2 1.2 0 0 0 16 12 L 15 15 L 18 14 Z" />
    <rect x="11.5" y="11" width="1" height="5" rx="0.5" fill="white" className="opacity-40" />
    <rect x="14" y="12" width="1" height="4" rx="0.5" fill="white" className="opacity-40" />
  </svg>
);

const Teguran2Icon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <rect x="7" y="10" width="10" height="8" rx="2" />
    <rect x="10" y="18" width="4" height="3" rx="1" />
    <rect x="8" y="3" width="2" height="8" rx="1" />
    <rect x="11.5" y="3" width="2" height="8" rx="1" />
    <path d="M17.5 11 A 1.2 1.2 0 0 0 16 12 L 15 15 L 18 14 Z" />
    <rect x="14.5" y="11" width="1" height="5" rx="0.5" fill="white" className="opacity-40" />
  </svg>
);

const Peringatan1Icon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="12" cy="12" r="10" />
    <rect x="11" y="6" width="2" height="7" rx="1" fill="white" />
    <circle cx="12" cy="16.5" r="1.25" fill="white" />
  </svg>
);

const Peringatan2Icon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2L2 20C1.3 21.2 2.2 22 3.5 22H20.5C21.8 22 22.7 21.2 22 20L12 2Z" />
    <rect x="11" y="9" width="2" height="6.5" rx="1" fill="white" />
    <circle cx="12" cy="18.5" r="1.25" fill="white" />
  </svg>
);

const DisqualifikasiIcon = ({ active, className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 64 64" className={className} fill="currentColor">
    <circle cx="32" cy="18" r="7" />
    <rect x="30" y="24" width="4" height="4" rx="1" />
    <path d="M20,54 C20,38 23,32 32,32 C41,32 44,38 44,54 Z" />
    <path d="M21,34 L43,50 C44.5,51 46,49.5 45,48 L23,32 Z" />
    <path d="M43,34 L21,50 C19.5,51 18,49.5 19,48 L41,32 Z" className="opacity-90" />
    <path d="M28,34 L32,44 L36,34" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60" />
    <path d="M26,50 H38" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-80" />
    <circle cx="16" cy="16" r="8" className="fill-slate-900 stroke-red-500" strokeWidth="1.5" />
    <text x="16" y="19" textAnchor="middle" fontSize="6.5" className="fill-red-500 font-black tracking-tighter">DSK</text>
  </svg>
);

const getPenaltyInfo = (type: string) => {
  switch (type) {
    case 'binaan1':
      return {
        title: 'Binaan 1',
        desc: 'Peringatan lisan tingkat 1 (Tidak mengurangi nilai poin).',
        colorClass: 'text-yellow-500 border-yellow-500',
        badgeColor: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/35',
      };
    case 'binaan2':
      return {
        title: 'Binaan 2',
        desc: 'Peringatan lisan tingkat 2 (Tidak mengurangi nilai poin).',
        colorClass: 'text-yellow-500 border-yellow-500',
        badgeColor: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/35',
      };
    case 'teguran1':
      return {
        title: 'Teguran 1',
        desc: 'Pelanggaran Ringan pertama. Mengurangi 1 poin dari total nilai.',
        colorClass: 'text-amber-500 border-amber-500',
        badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/35',
      };
    case 'teguran2':
      return {
        title: 'Teguran 2',
        desc: 'Pelanggaran Ringan kedua. Mengurangi 2 poin dari total nilai.',
        colorClass: 'text-amber-500 border-amber-500',
        badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-500/35',
      };
    case 'peringatan1':
      return {
        title: 'Peringatan 1',
        desc: 'Pelanggaran Berat pertama. Mengurangi 5 poin dari total nilai.',
        colorClass: 'text-red-500 border-red-500',
        badgeColor: 'bg-red-500/10 text-red-600 border-red-500/35',
      };
    case 'peringatan2':
      return {
        title: 'Peringatan 2',
        desc: 'Pelanggaran Berat kedua. Mengurangi 10 poin dari total nilai.',
        colorClass: 'text-red-500 border-red-500',
        badgeColor: 'bg-red-500/10 text-red-600 border-red-500/35',
      };
    case 'disqualified':
      return {
        title: 'Diskualifikasi',
        desc: 'Diskualifikasi atlet. Atlet langsung dinyatakan kalah, dan sudut lawan otomatis keluar sebagai pemenang.',
        colorClass: 'text-red-600 border-red-600 font-bold',
        badgeColor: 'bg-red-600/20 text-red-600 border-red-500/50',
      };
    default:
      return {
        title: 'Pelanggaran',
        desc: 'Perubahan status hukuman.',
        colorClass: 'text-slate-400 border-slate-500',
        badgeColor: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
      };
  }
};

export default function DewanPanel({ state, dispatch, onBack, theme, onToggleTheme }: DewanPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  React.useEffect(() => {
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

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [penaltyConfirm, setPenaltyConfirm] = useState<{
    sudut: 'merah' | 'biru';
    type: 'binaan1' | 'binaan2' | 'teguran1' | 'teguran2' | 'peringatan1' | 'peringatan2' | 'disqualified';
  } | null>(null);
  const [kTeknikConfirm, setKTeknikConfirm] = useState<'merah' | 'biru' | null>(null);
  const [undoConfirm, setUndoConfirm] = useState<'merah' | 'biru' | null>(null);
  const [undurDiriConfirm, setUndurDiriConfirm] = useState<'merah' | 'biru' | null>(null);
  const [wmpConfirm, setWmpConfirm] = useState<'merah' | 'biru' | null>(null);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePenaltyClick = (
    sudut: 'merah' | 'biru',
    type: 'binaan1' | 'binaan2' | 'teguran1' | 'teguran2' | 'peringatan1' | 'peringatan2' | 'disqualified'
  ) => {
    playBeep('warning');
    setPenaltyConfirm({ sudut, type });
  };

  const handleApplyPenalty = () => {
    if (!penaltyConfirm) return;
    const { sudut, type } = penaltyConfirm;
    playBeep('warning');
    dispatch('DEWAN_PENALTY', { sudut, penaltyType: type });
    setPenaltyConfirm(null);
  };

  const handleKTeknikClick = (sudut: 'merah' | 'biru') => {
    playBeep('warning');
    setKTeknikConfirm(sudut);
  };

  const handleApplyKTeknik = () => {
    if (!kTeknikConfirm) return;
    playBeep('warning');
    dispatch('DEWAN_K_TEKNIK', { winnerCorner: kTeknikConfirm });
    setKTeknikConfirm(null);
  };

  const handleUndoClick = (sudut: 'merah' | 'biru') => {
    playBeep('warning');
    setUndoConfirm(sudut);
  };

  const handleApplyUndo = () => {
    if (!undoConfirm) return;
    playBeep('warning');
    dispatch('DEWAN_UNDO', { sudut: undoConfirm });
    setUndoConfirm(null);
  };

  const handleUndurDiriClick = (sudut: 'merah' | 'biru') => {
    playBeep('warning');
    setUndurDiriConfirm(sudut);
  };

  const handleApplyUndurDiri = () => {
    if (!undurDiriConfirm) return;
    playBeep('warning');
    dispatch('DEWAN_UNDUR_DIRI', { sudut: undurDiriConfirm });
    setUndurDiriConfirm(null);
  };

  const handleWmpClick = (sudut: 'merah' | 'biru') => {
    playBeep('warning');
    setWmpConfirm(sudut);
  };

  const handleApplyWmp = () => {
    if (!wmpConfirm) return;
    playBeep('warning');
    dispatch('DEWAN_WMP', { winnerCorner: wmpConfirm });
    setWmpConfirm(null);
  };

  const handleJatuhan = (sudut: 'merah' | 'biru') => {
    playBeep('valid');
    dispatch('DEWAN_JATUHAN', { sudut });
  };

  const handleVerifyTrigger = (verifyType: 'JATUHAN' | 'PELANGGARAN') => {
    playBeep('click');
    dispatch('DEWAN_VERIFY_TRIGGER', { type: verifyType });
    setShowVerifyModal(false);
  };

  const handleResolveVerify = () => {
    playBeep('click');
    dispatch('DEWAN_VERIFY_RESOLVE');
  };

  const redPen = state.dewanPenalties.merah;
  const bluePen = state.dewanPenalties.biru;
  const v = state.verification;

  return (
    <div className={`w-full h-full flex flex-col justify-between p-2 md:p-3 transition-colors duration-300 select-none overflow-y-auto md:overflow-hidden relative ${
      theme === 'dark' ? 'bg-[#0b1220] text-slate-100' : 'bg-[#eef2f6] text-slate-900'
    }`}>
      
      {/* Top Utility Bar */}
      <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl border mb-2 flex-shrink-0 ${
        theme === 'dark' ? 'bg-[#131d31] border-slate-800' : 'bg-white border-slate-300'
      }`}>
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className="px-2.5 py-1 text-[10px] cursor-pointer rounded-lg font-black uppercase tracking-wider transition-all bg-slate-800 hover:bg-slate-700 text-white shadow-sm"
          >
            ← Keluar
          </button>
          <button
            onClick={onToggleTheme}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              theme === 'dark' ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-slate-200 text-slate-700'
            }`}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <ThemePaletteSelector compact={true} />

          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
            }`}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              playBeep('click');
              dispatch('TOGGLE_JURY_PENALTY_ACCESS');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
              state.juryPenaltyAccess
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                : theme === 'dark'
                  ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {state.juryPenaltyAccess ? <Unlock className="w-3 h-3 text-emerald-500" /> : <Lock className="w-3 h-3 text-rose-500" />}
            <span>Akses Juri: {state.juryPenaltyAccess ? 'AKTIF' : 'NONAKTIF'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <Shield className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-black uppercase tracking-wider text-amber-500">DEWAN HAKIM</span>
        </div>
      </div>

      {/* 1. Header Banner Matching Photo */}
      <div className="grid grid-cols-12 gap-2 items-center flex-shrink-0">
        
        {/* Sudut Merah Banner (Left) */}
        <div className="col-span-5 bg-gradient-to-r from-red-600 via-red-650 to-red-700 text-white p-2.5 rounded-2xl shadow-md border border-red-500/30 flex flex-col justify-center min-h-[64px]">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-red-200">SUDUT MERAH</span>
            <span className="text-[10px] font-mono font-bold bg-black/25 px-2 py-0.5 rounded-full border border-white/20 inline-flex items-center gap-1">
              SKOR: <AnimatedScore value={state.scores.merah.total} showDeltaBadge={true} badgeClassName="top-[-10px] right-[-10px]" />
            </span>
          </div>
          <h2 className="text-sm md:text-base font-black truncate uppercase tracking-tight mt-0.5">
            {state.atletMerah.nama || "ATLET MERAH"}
          </h2>
          <div className="text-[10px] font-extrabold text-red-100 truncate uppercase opacity-90">
            {state.atletMerah.kontingen || "KONTINGEN MERAH"}
          </div>
        </div>

        {/* Center Badge: PARTAI & ROUNDS */}
        <div className="col-span-2 flex flex-col items-center justify-center">
          {/* Partai Hexagon Badge */}
          <div className="bg-slate-900 border-2 border-amber-400/80 text-white px-3 py-1 rounded-xl shadow-lg text-center flex flex-col items-center justify-center w-full max-w-[110px]">
            <span className="text-[8px] font-black tracking-widest text-amber-400 uppercase leading-none">PARTAI</span>
            <span className="text-sm md:text-base font-mono font-black text-white leading-none mt-0.5">
              {state.partai || "001"}
            </span>
          </div>

          {/* Round Selector Indicators */}
          <div className="flex items-center gap-1 mt-1.5">
            {[1, 2, 3].map((r) => {
              const isActive = state.currentBabak === r;
              return (
                <button
                  key={r}
                  onClick={() => {
                    playBeep('click');
                    dispatch('SET_BABAK', { babak: r });
                  }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black uppercase transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-extrabold shadow-md scale-105'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}
                  title={`Ganti ke Babak ${r}`}
                >
                  {r === 1 ? 'I' : r === 2 ? 'II' : 'III'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sudut Biru Banner (Right) */}
        <div className="col-span-5 bg-gradient-to-r from-blue-700 via-blue-650 to-blue-600 text-white p-2.5 rounded-2xl shadow-md border border-blue-500/30 flex flex-col justify-center min-h-[64px] text-right">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono font-bold bg-black/25 px-2 py-0.5 rounded-full border border-white/20 inline-flex items-center gap-1">
              SKOR: <AnimatedScore value={state.scores.biru.total} showDeltaBadge={true} badgeClassName="top-[-10px] left-[-10px]" />
            </span>
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-200">SUDUT BIRU</span>
          </div>
          <h2 className="text-sm md:text-base font-black truncate uppercase tracking-tight mt-0.5">
            {state.atletBiru.nama || "ATLET BIRU"}
          </h2>
          <div className="text-[10px] font-extrabold text-blue-100 truncate uppercase opacity-90">
            {state.atletBiru.kontingen || "KONTINGEN BIRU"}
          </div>
        </div>

      </div>

      {/* 2. Main 3-Column Interactive Area */}
      <div className="grid grid-cols-12 gap-2 my-2 flex-1 min-h-0 items-stretch">
        
        {/* LEFT COLUMN: SUDUT MERAH CONTROLS */}
        <div className="col-span-5 flex flex-col gap-1.5 h-full justify-between">
          
          {/* Status Indicator Bar Rows (Red) */}
          <div className="grid grid-cols-2 gap-1 flex-shrink-0">
            <div className={`p-1.5 rounded-xl border text-[9px] font-mono flex items-center justify-between ${
              redPen.binaan1 || redPen.binaan2
                ? 'bg-amber-400/20 border-amber-500 text-amber-400 font-extrabold'
                : theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-250 text-slate-600'
            }`}>
              <span className="font-bold">BINAAN:</span>
              <span>{redPen.binaan2 ? 'B2' : redPen.binaan1 ? 'B1' : '-'}</span>
            </div>

            <div className={`p-1.5 rounded-xl border text-[9px] font-mono flex items-center justify-between ${
              redPen.teguran1 || redPen.teguran2
                ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-extrabold'
                : theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-250 text-slate-600'
            }`}>
              <span className="font-bold">TEGURAN:</span>
              <span>{redPen.teguran2 ? 'T2 (-2)' : redPen.teguran1 ? 'T1 (-1)' : '-'}</span>
            </div>

            <div className={`p-1.5 rounded-xl border text-[9px] font-mono flex items-center justify-between ${
              redPen.peringatan1 || redPen.peringatan2
                ? 'bg-red-500/20 border-red-500 text-red-400 font-extrabold'
                : theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-250 text-slate-600'
            }`}>
              <span className="font-bold">PERINGATAN:</span>
              <span>{redPen.peringatan2 ? 'P2 (-10)' : redPen.peringatan1 ? 'P1 (-5)' : '-'}</span>
            </div>

            <div className={`p-1.5 rounded-xl border text-[9px] font-mono flex items-center justify-between ${
              state.directPoints.merah > 0
                ? 'bg-blue-500/20 border-blue-500 text-blue-400 font-extrabold'
                : theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-250 text-slate-600'
            }`}>
              <span className="font-bold">JATUHAN:</span>
              <span>+{state.directPoints.merah} POIN</span>
            </div>
          </div>

          {/* Action Buttons Grid (2 cols x 5 rows) */}
          <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
            {/* Row 1: BINAAN 1 | BINAAN 2 */}
            <button
              onClick={() => handlePenaltyClick('merah', 'binaan1')}
              className={`rounded-xl border-2 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer p-2 ${
                redPen.binaan1
                  ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95'
                  : theme === 'dark'
                    ? 'bg-[#182338] border-red-900/40 text-red-400 hover:bg-red-900/20'
                    : 'bg-[#fef2f2] border-red-200 text-red-700 hover:bg-red-100'
              }`}
            >
              <Binaan1Icon active={!!redPen.binaan1} className="w-5 h-5" />
              <span>BINAAN 1</span>
            </button>

            <button
              onClick={() => handlePenaltyClick('merah', 'binaan2')}
              className={`rounded-xl border-2 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer p-2 ${
                redPen.binaan2
                  ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95'
                  : theme === 'dark'
                    ? 'bg-[#182338] border-red-900/40 text-red-400 hover:bg-red-900/20'
                    : 'bg-[#fef2f2] border-red-200 text-red-700 hover:bg-red-100'
              }`}
            >
              <Binaan2Icon active={!!redPen.binaan2} className="w-5 h-5" />
              <span>BINAAN 2</span>
            </button>

            {/* Row 2: TEGURAN 1 | TEGURAN 2 */}
            <button
              onClick={() => handlePenaltyClick('merah', 'teguran1')}
              className={`rounded-xl border-2 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer p-2 ${
                redPen.teguran1
                  ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95 animate-pulse'
                  : theme === 'dark'
                    ? 'bg-[#182338] border-red-900/40 text-red-400 hover:bg-red-900/20'
                    : 'bg-[#fef2f2] border-red-200 text-red-700 hover:bg-red-100'
              }`}
            >
              <Teguran1Icon active={!!redPen.teguran1} className="w-5 h-5" />
              <span>TEGURAN 1</span>
            </button>

            <button
              onClick={() => handlePenaltyClick('merah', 'teguran2')}
              className={`rounded-xl border-2 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer p-2 ${
                redPen.teguran2
                  ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95 animate-pulse'
                  : theme === 'dark'
                    ? 'bg-[#182338] border-red-900/40 text-red-400 hover:bg-red-900/20'
                    : 'bg-[#fef2f2] border-red-200 text-red-700 hover:bg-red-100'
              }`}
            >
              <Teguran2Icon active={!!redPen.teguran2} className="w-5 h-5" />
              <span>TEGURAN 2</span>
            </button>

            {/* Row 3: PERINGATAN 1 | PERINGATAN 2 */}
            <button
              onClick={() => handlePenaltyClick('merah', 'peringatan1')}
              className={`rounded-xl border-2 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer p-2 ${
                redPen.peringatan1
                  ? 'bg-red-600 border-red-700 text-white shadow-md scale-95'
                  : theme === 'dark'
                    ? 'bg-[#182338] border-red-900/40 text-red-400 hover:bg-red-900/20'
                    : 'bg-[#fef2f2] border-red-200 text-red-700 hover:bg-red-100'
              }`}
            >
              <Peringatan1Icon active={!!redPen.peringatan1} className="w-5 h-5" />
              <span>PERINGATAN 1</span>
            </button>

            <button
              onClick={() => handlePenaltyClick('merah', 'peringatan2')}
              className={`rounded-xl border-2 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer p-2 ${
                redPen.peringatan2
                  ? 'bg-red-700 border-red-800 text-white shadow-md scale-95'
                  : theme === 'dark'
                    ? 'bg-[#182338] border-red-900/40 text-red-400 hover:bg-red-900/20'
                    : 'bg-[#fef2f2] border-red-200 text-red-700 hover:bg-red-100'
              }`}
            >
              <Peringatan2Icon active={!!redPen.peringatan2} className="w-5 h-5" />
              <span>PERINGATAN 2</span>
            </button>

            {/* Row 4: JATUHAN (+3) | UNDO (DEL) */}
            <button
              onClick={() => handleJatuhan('merah')}
              className="rounded-xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer p-2"
            >
              <Award className="w-5 h-5 text-emerald-200" />
              <span>JATUHAN (+3)</span>
            </button>

            <button
              onClick={() => handleUndoClick('merah')}
              className="rounded-xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer p-2"
            >
              <Undo2 className="w-5 h-5 text-slate-950" />
              <span>UNDO (DEL)</span>
            </button>

            {/* Row 5: DISKUALIFIKASI | K. TEKNIK */}
            <button
              onClick={() => handlePenaltyClick('merah', 'disqualified')}
              className={`rounded-xl border-2 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer p-2 ${
                redPen.disqualified
                  ? 'bg-red-800 border-red-900 text-white shadow-md scale-95'
                  : 'bg-red-950/40 border-red-800/80 hover:bg-red-900/50 text-red-400'
              }`}
            >
              <DisqualifikasiIcon active={!!redPen.disqualified} className="w-5 h-5" />
              <span>DISKUALIFIKASI</span>
            </button>

            <button
              onClick={() => handleKTeknikClick('merah')}
              className="rounded-xl border-2 border-blue-500/50 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer p-2"
            >
              <Zap className="w-5 h-5 text-amber-300" />
              <span>K. TEKNIK</span>
            </button>
          </div>
        </div>

        {/* CENTER COLUMN: TIMER & VOTE VERIFICATION */}
        <div className="col-span-2 flex flex-col items-center justify-between h-full px-1 py-1">
          
          {/* Red Square VS Blue Square Logos */}
          <div className="flex items-center justify-center gap-2 my-1">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-red-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md border border-red-400/40">
              M
            </div>
            <span className="text-amber-500 font-black tracking-widest text-xs md:text-sm italic">VS</span>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-md border border-blue-400/40">
              B
            </div>
          </div>

          {/* Digital Timer */}
          <div className="flex flex-col items-center justify-center w-full my-auto">
            <div className={`w-full py-3 px-2 rounded-2xl border-2 text-center shadow-inner ${
              theme === 'dark' ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-slate-900 border-slate-700 text-emerald-400'
            }`}>
              <span className="text-[8px] font-mono font-bold tracking-widest text-slate-400 uppercase block mb-0.5">
                TIMER PERTANDINGAN
              </span>
              <div className="text-3xl lg:text-4xl font-mono font-black tracking-widest leading-none drop-shadow-sm">
                {formatTimer(state.timerSeconds)}
              </div>
            </div>

            {/* Timer Quick Controls */}
            <div className="flex items-center gap-1.5 mt-2 w-full">
              <button
                onClick={() => {
                  playBeep('click');
                  dispatch('TOGGLE_TIMER');
                }}
                className={`flex-1 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm border ${
                  state.timerActive
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400'
                }`}
              >
                {state.timerActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{state.timerActive ? 'JEDA' : 'MULAI'}</span>
              </button>

              <button
                onClick={() => {
                  playBeep('click');
                  dispatch('RESET_TIMER');
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer border border-slate-700"
                title="Reset Waktu"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Yellow Vote Verification Button */}
          <div className="w-full mt-2">
            <button
              onClick={() => {
                playBeep('click');
                setShowVerifyModal(true);
              }}
              disabled={v.active}
              className={`w-full py-3 px-2 font-black text-xs md:text-sm uppercase tracking-wider text-slate-950 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg border border-amber-300 cursor-pointer ${
                v.active
                  ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-350 hover:to-yellow-450 active:scale-95'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-slate-950" />
              <span>VOTE VERIFICATION</span>
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: SUDUT BIRU CONTROLS */}
        <div className="col-span-5 flex flex-col gap-1.5 h-full justify-between">
          
          {/* Status Indicator Bar Rows (Blue) */}
          <div className="grid grid-cols-2 gap-1 flex-shrink-0">
            <div className={`p-1.5 rounded-xl border text-[9px] font-mono flex items-center justify-between ${
              bluePen.binaan1 || bluePen.binaan2
                ? 'bg-amber-400/20 border-amber-500 text-amber-400 font-extrabold'
                : theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-250 text-slate-600'
            }`}>
              <span className="font-bold">BINAAN:</span>
              <span>{bluePen.binaan2 ? 'B2' : bluePen.binaan1 ? 'B1' : '-'}</span>
            </div>

            <div className={`p-1.5 rounded-xl border text-[9px] font-mono flex items-center justify-between ${
              bluePen.teguran1 || bluePen.teguran2
                ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-extrabold'
                : theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-250 text-slate-600'
            }`}>
              <span className="font-bold">TEGURAN:</span>
              <span>{bluePen.teguran2 ? 'T2 (-2)' : bluePen.teguran1 ? 'T1 (-1)' : '-'}</span>
            </div>

            <div className={`p-1.5 rounded-xl border text-[9px] font-mono flex items-center justify-between ${
              bluePen.peringatan1 || bluePen.peringatan2
                ? 'bg-red-500/20 border-red-500 text-red-400 font-extrabold'
                : theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-250 text-slate-600'
            }`}>
              <span className="font-bold">PERINGATAN:</span>
              <span>{bluePen.peringatan2 ? 'P2 (-10)' : bluePen.peringatan1 ? 'P1 (-5)' : '-'}</span>
            </div>

            <div className={`p-1.5 rounded-xl border text-[9px] font-mono flex items-center justify-between ${
              state.directPoints.biru > 0
                ? 'bg-blue-500/20 border-blue-500 text-blue-400 font-extrabold'
                : theme === 'dark' ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-white border-slate-250 text-slate-600'
            }`}>
              <span className="font-bold">JATUHAN:</span>
              <span>+{state.directPoints.biru} POIN</span>
            </div>
          </div>

          {/* Action Buttons Grid (2 cols x 5 rows) */}
          <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
            {/* Row 1: BINAAN 1 | BINAAN 2 */}
            <button
              onClick={() => handlePenaltyClick('biru', 'binaan1')}
              className={`rounded-xl border-2 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer p-2 ${
                bluePen.binaan1
                  ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95'
                  : theme === 'dark'
                    ? 'bg-[#122238] border-blue-900/40 text-blue-400 hover:bg-blue-900/20'
                    : 'bg-[#eff6ff] border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Binaan1Icon active={!!bluePen.binaan1} className="w-5 h-5" />
              <span>BINAAN 1</span>
            </button>

            <button
              onClick={() => handlePenaltyClick('biru', 'binaan2')}
              className={`rounded-xl border-2 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer p-2 ${
                bluePen.binaan2
                  ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95'
                  : theme === 'dark'
                    ? 'bg-[#122238] border-blue-900/40 text-blue-400 hover:bg-blue-900/20'
                    : 'bg-[#eff6ff] border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Binaan2Icon active={!!bluePen.binaan2} className="w-5 h-5" />
              <span>BINAAN 2</span>
            </button>

            {/* Row 2: TEGURAN 1 | TEGURAN 2 */}
            <button
              onClick={() => handlePenaltyClick('biru', 'teguran1')}
              className={`rounded-xl border-2 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer p-2 ${
                bluePen.teguran1
                  ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95 animate-pulse'
                  : theme === 'dark'
                    ? 'bg-[#122238] border-blue-900/40 text-blue-400 hover:bg-blue-900/20'
                    : 'bg-[#eff6ff] border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Teguran1Icon active={!!bluePen.teguran1} className="w-5 h-5" />
              <span>TEGURAN 1</span>
            </button>

            <button
              onClick={() => handlePenaltyClick('biru', 'teguran2')}
              className={`rounded-xl border-2 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer p-2 ${
                bluePen.teguran2
                  ? 'bg-amber-400 border-amber-500 text-slate-950 shadow-md scale-95 animate-pulse'
                  : theme === 'dark'
                    ? 'bg-[#122238] border-blue-900/40 text-blue-400 hover:bg-blue-900/20'
                    : 'bg-[#eff6ff] border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Teguran2Icon active={!!bluePen.teguran2} className="w-5 h-5" />
              <span>TEGURAN 2</span>
            </button>

            {/* Row 3: PERINGATAN 1 | PERINGATAN 2 */}
            <button
              onClick={() => handlePenaltyClick('biru', 'peringatan1')}
              className={`rounded-xl border-2 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer p-2 ${
                bluePen.peringatan1
                  ? 'bg-red-600 border-red-700 text-white shadow-md scale-95'
                  : theme === 'dark'
                    ? 'bg-[#122238] border-blue-900/40 text-blue-400 hover:bg-blue-900/20'
                    : 'bg-[#eff6ff] border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Peringatan1Icon active={!!bluePen.peringatan1} className="w-5 h-5" />
              <span>PERINGATAN 1</span>
            </button>

            <button
              onClick={() => handlePenaltyClick('biru', 'peringatan2')}
              className={`rounded-xl border-2 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer p-2 ${
                bluePen.peringatan2
                  ? 'bg-red-700 border-red-800 text-white shadow-md scale-95'
                  : theme === 'dark'
                    ? 'bg-[#122238] border-blue-900/40 text-blue-400 hover:bg-blue-900/20'
                    : 'bg-[#eff6ff] border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Peringatan2Icon active={!!bluePen.peringatan2} className="w-5 h-5" />
              <span>PERINGATAN 2</span>
            </button>

            {/* Row 4: UNDO (DEL) | JATUHAN (+3) */}
            <button
              onClick={() => handleUndoClick('biru')}
              className="rounded-xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer p-2"
            >
              <Undo2 className="w-5 h-5 text-slate-950" />
              <span>UNDO (DEL)</span>
            </button>

            <button
              onClick={() => handleJatuhan('biru')}
              className="rounded-xl border-2 border-emerald-500/50 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer p-2"
            >
              <Award className="w-5 h-5 text-emerald-200" />
              <span>JATUHAN (+3)</span>
            </button>

            {/* Row 5: K. TEKNIK | DISKUALIFIKASI */}
            <button
              onClick={() => handleKTeknikClick('biru')}
              className="rounded-xl border-2 border-blue-500/50 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer p-2"
            >
              <Zap className="w-5 h-5 text-amber-300" />
              <span>K. TEKNIK</span>
            </button>

            <button
              onClick={() => handlePenaltyClick('biru', 'disqualified')}
              className={`rounded-xl border-2 font-black uppercase text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer p-2 ${
                bluePen.disqualified
                  ? 'bg-red-800 border-red-900 text-white shadow-md scale-95'
                  : 'bg-red-950/40 border-red-800/80 hover:bg-red-900/50 text-red-400'
              }`}
            >
              <DisqualifikasiIcon active={!!bluePen.disqualified} className="w-5 h-5" />
              <span>DISKUALIFIKASI</span>
            </button>
          </div>
        </div>

      </div>

      {/* 3. Bottom Status Bar & Extra Actions */}
      <div className={`flex flex-col md:flex-row items-center justify-between gap-2 p-2 rounded-xl border flex-shrink-0 ${
        theme === 'dark' ? 'bg-[#131d31] border-slate-800' : 'bg-white border-slate-300'
      }`}>
        {/* Verification Status Banner */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {v.active ? (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="font-extrabold text-amber-400 uppercase">
                VERIFIKASI AKTIF ({v.type})
              </span>
              <div className="flex items-center gap-1 text-[10px] ml-2">
                <span className={`px-1.5 py-0.5 rounded border ${v.votes.juri1 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                  J1: {v.votes.juri1 || '?'}
                </span>
                <span className={`px-1.5 py-0.5 rounded border ${v.votes.juri2 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                  J2: {v.votes.juri2 || '?'}
                </span>
                <span className={`px-1.5 py-0.5 rounded border ${v.votes.juri3 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                  J3: {v.votes.juri3 || '?'}
                </span>
              </div>
              {v.votes.juri1 && v.votes.juri2 && v.votes.juri3 && (
                <button
                  onClick={handleResolveVerify}
                  className="ml-2 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase rounded-lg shadow-sm cursor-pointer"
                >
                  SELESAIKAN ({v.result})
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-[11px] font-semibold">Sistem Dewan Tanding Siaga.</span>
            </div>
          )}
        </div>

        {/* Extra Decision Actions (UD & WMP) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleUndurDiriClick('merah')}
            className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 font-black text-[10px] uppercase rounded-lg cursor-pointer flex items-center gap-1"
            title="Undur Diri Merah"
          >
            <Flag className="w-3 h-3 text-rose-400" />
            <span>UD MERAH</span>
          </button>
          <button
            onClick={() => handleUndurDiriClick('biru')}
            className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 font-black text-[10px] uppercase rounded-lg cursor-pointer flex items-center gap-1"
            title="Undur Diri Biru"
          >
            <Flag className="w-3 h-3 text-rose-400" />
            <span>UD BIRU</span>
          </button>
          <div className="w-[1px] h-4 bg-slate-700" />
          <button
            onClick={() => handleWmpClick('merah')}
            className="px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/80 text-amber-300 font-black text-[10px] uppercase rounded-lg cursor-pointer flex items-center gap-1"
            title="WMP Merah"
          >
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>WMP MERAH</span>
          </button>
          <button
            onClick={() => handleWmpClick('biru')}
            className="px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/80 text-amber-300 font-black text-[10px] uppercase rounded-lg cursor-pointer flex items-center gap-1"
            title="WMP Biru"
          >
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>WMP BIRU</span>
          </button>
        </div>
      </div>

      {/* 4. Modals and Confirmation Popups */}
      <AnimatePresence>
        {/* Vote Verification Modal */}
        {showVerifyModal && (
          <div className="fixed inset-0 bg-[#000000bd] backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-2 border-amber-400 max-w-sm w-full p-6 rounded-2xl shadow-2xl text-slate-900 relative"
            >
              <button
                onClick={() => { playBeep('click'); setShowVerifyModal(false); }}
                className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-base font-black text-center text-slate-900 mb-1 uppercase tracking-wider">
                MULAI VERIFIKASI DEWAN
              </h3>
              <p className="text-xs text-slate-500 text-center mb-5 font-sans">
                Pilih kategori verifikasi yang akan diajukan ke voting 3 Juri Penilai.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleVerifyTrigger('JATUHAN')}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black text-xs tracking-widest rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  VERIFIKASI JATUHAN (3 PT)
                </button>
                <button
                  onClick={() => handleVerifyTrigger('PELANGGARAN')}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs tracking-widest rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  VERIFIKASI PELANGGARAN
                </button>
              </div>

              <button
                onClick={() => { playBeep('click'); setShowVerifyModal(false); }}
                className="w-full text-center text-xs font-bold text-slate-400 hover:text-slate-600 underline mt-4 block cursor-pointer"
              >
                Batalkan
              </button>
            </motion.div>
          </div>
        )}

        {/* Penalty Confirmation Popup */}
        {penaltyConfirm && (() => {
          const targetAthlete = penaltyConfirm.sudut === 'merah' ? state.atletMerah : state.atletBiru;
          const isCurrentlyActive = state.dewanPenalties[penaltyConfirm.sudut][penaltyConfirm.type];
          const penaltyInfo = getPenaltyInfo(penaltyConfirm.type);
          const cornerText = penaltyConfirm.sudut === 'merah' ? 'SUDUT MERAH' : 'SUDUT BIRU';
          const cornerColorClass = penaltyConfirm.sudut === 'merah' ? 'text-red-600 border-red-300 bg-red-50' : 'text-blue-700 border-blue-300 bg-blue-50';
          const modalBorderClass = penaltyConfirm.sudut === 'merah' ? 'border-red-400' : 'border-blue-400';

          return (
            <div className="fixed inset-0 bg-[#000000bd] backdrop-blur-md z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`bg-white border-2 max-w-sm w-full p-6 rounded-2xl shadow-2xl text-slate-800 ${modalBorderClass}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black tracking-wide ${cornerColorClass}`}>
                    {cornerText}
                  </div>
                  <div className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${penaltyInfo.badgeColor}`}>
                    {penaltyInfo.title}
                  </div>
                </div>

                <div className="text-center mb-3">
                  <AlertTriangle className={`w-10 h-10 mx-auto mb-2 animate-pulse ${penaltyInfo.colorClass}`} />
                  <h3 className="text-base font-black uppercase text-slate-900 tracking-tight">
                    Sahkan Tindakan Dewan
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Konfirmasi keputusan dewan pertandingan untuk menyetor nilai.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl mb-3 text-left">
                  <span className="text-[9px] uppercase font-black text-slate-400 block">Atlet Terpilih</span>
                  <div className="text-sm font-black text-slate-800 uppercase mt-0.5">{targetAthlete.nama}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">{targetAthlete.kontingen}</div>
                </div>

                <div className="p-3 rounded-xl border mb-4 text-left bg-slate-50 border-slate-200">
                  <div className="text-xs font-bold text-slate-700">
                    Hukuman: <span className="text-slate-900 font-extrabold">{penaltyInfo.title}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    {penaltyInfo.desc}
                  </p>
                  <div className="h-[1px] bg-slate-200 my-2" />
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-700">Status Baru:</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                      isCurrentlyActive ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    }`}>
                      {isCurrentlyActive ? 'MENCABUT (NON-AKTIF)' : 'MEMBERIKAN (AKTIF)'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleApplyPenalty}
                    className="flex-1 py-2 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-md transition-all border border-emerald-400 active:scale-95"
                  >
                    Sahkan Nilai
                  </button>
                  <button
                    onClick={() => { playBeep('click'); setPenaltyConfirm(null); }}
                    className="flex-1 py-2 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                  >
                    Batal
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}

        {/* Keputusan Teknik (K. Teknik) Confirmation Popup */}
        {kTeknikConfirm && (() => {
          const targetAthlete = kTeknikConfirm === 'merah' ? state.atletMerah : state.atletBiru;
          const cornerText = kTeknikConfirm === 'merah' ? 'SUDUT MERAH' : 'SUDUT BIRU';
          const cornerColorClass = kTeknikConfirm === 'merah' ? 'text-red-600 border-red-300 bg-red-50' : 'text-blue-700 border-blue-300 bg-blue-50';

          return (
            <div className="fixed inset-0 bg-[#000000bd] backdrop-blur-md z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border-2 border-amber-400 max-w-sm w-full p-6 rounded-2xl shadow-2xl text-slate-800"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black tracking-wide ${cornerColorClass}`}>
                    {cornerText}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-[10px] font-black text-amber-700">
                    Keputusan Teknik (KO/TKO)
                  </div>
                </div>

                <div className="text-center mb-3">
                  <Zap className="w-10 h-10 mx-auto mb-2 text-amber-500 animate-bounce" />
                  <h3 className="text-base font-black uppercase text-slate-900 tracking-tight">
                    Sahkan Menang Keputusan Teknik?
                  </h3>
                  <p className="text-[10.5px] text-slate-500 mt-1 leading-normal font-sans">
                    Tindakan ini akan menghentikan pertandingan dan memenangkan <span className="font-bold text-slate-900">{cornerText}</span> secara mutlak.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl mb-4 text-left">
                  <span className="text-[9px] uppercase font-black text-slate-400 block">Atlet Pemenang (K. TEKNIK)</span>
                  <div className="text-sm font-black text-slate-800 uppercase mt-0.5">{targetAthlete.nama}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">{targetAthlete.kontingen}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleApplyKTeknik}
                    className="flex-1 py-2 cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-widest rounded-lg shadow-md transition-all border border-amber-300 active:scale-95"
                  >
                    Ya, Sahkan K. Teknik
                  </button>
                  <button
                    onClick={() => { playBeep('click'); setKTeknikConfirm(null); }}
                    className="flex-1 py-2 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                  >
                    Batal
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}

        {/* Undo Confirmation Popup */}
        {undoConfirm && (() => {
          const cornerText = undoConfirm === 'merah' ? 'SUDUT MERAH' : 'SUDUT BIRU';
          const cornerColorClass = undoConfirm === 'merah' ? 'text-red-600 border-red-300 bg-red-50' : 'text-blue-700 border-blue-300 bg-blue-50';

          return (
            <div className="fixed inset-0 bg-[#000000bd] backdrop-blur-md z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border-2 border-amber-400 max-w-sm w-full p-6 rounded-2xl shadow-2xl text-slate-800"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black tracking-wide ${cornerColorClass}`}>
                    {cornerText}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-[10px] font-black text-amber-700">
                    Batal / Undo (DEL)
                  </div>
                </div>

                <div className="text-center mb-3">
                  <Undo2 className="w-10 h-10 mx-auto mb-2 text-amber-500" />
                  <h3 className="text-base font-black uppercase text-slate-900 tracking-tight">
                    Batalkan Poin / Hukuman Terakhir?
                  </h3>
                  <p className="text-[10.5px] text-slate-500 mt-1 leading-normal font-sans">
                    Tindakan ini akan membatalkan jatuhan atau hukuman terakhir yang diberikan pada <span className="font-bold text-slate-900">{cornerText}</span>.
                  </p>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleApplyUndo}
                    className="flex-1 py-2 cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-widest rounded-lg shadow-md transition-all border border-amber-300 active:scale-95"
                  >
                    Ya, Batalkan (Undo)
                  </button>
                  <button
                    onClick={() => { playBeep('click'); setUndoConfirm(null); }}
                    className="flex-1 py-2 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                  >
                    Batal
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}

        {/* Undur Diri Confirmation Popup */}
        {undurDiriConfirm && (() => {
          const targetAthlete = undurDiriConfirm === 'merah' ? state.atletMerah : state.atletBiru;
          const cornerText = undurDiriConfirm === 'merah' ? 'SUDUT MERAH' : 'SUDUT BIRU';
          const cornerColorClass = undurDiriConfirm === 'merah' ? 'text-red-600 border-red-300 bg-red-50' : 'text-blue-700 border-blue-300 bg-blue-50';

          return (
            <div className="fixed inset-0 bg-[#000000bd] backdrop-blur-md z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border-2 border-red-500 max-w-sm w-full p-6 rounded-2xl shadow-2xl text-slate-800"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black tracking-wide ${cornerColorClass}`}>
                    {cornerText}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full border border-rose-300 bg-rose-50 text-[10px] font-black text-rose-700">
                    Undur Diri (UD)
                  </div>
                </div>

                <div className="text-center mb-3">
                  <Flag className="w-10 h-10 mx-auto mb-2 text-rose-500" />
                  <h3 className="text-base font-black uppercase text-slate-900 tracking-tight">
                    Sahkan Atlet Undur Diri?
                  </h3>
                  <p className="text-[10.5px] text-slate-500 mt-1 leading-normal font-sans">
                    Tindakan ini akan menghentikan pertandingan dan memenangkan sudut lawan.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl mb-4 text-left">
                  <span className="text-[9px] uppercase font-black text-slate-400 block">Atlet Mundur</span>
                  <div className="text-sm font-black text-slate-800 uppercase mt-0.5">{targetAthlete.nama}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">{targetAthlete.kontingen}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleApplyUndurDiri}
                    className="flex-1 py-2 cursor-pointer bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest rounded-lg shadow-md transition-all border border-red-400 active:scale-95"
                  >
                    Ya, Sahkan UD
                  </button>
                  <button
                    onClick={() => { playBeep('click'); setUndurDiriConfirm(null); }}
                    className="flex-1 py-2 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                  >
                    Batal
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}

        {/* WMP Confirmation Popup */}
        {wmpConfirm && (() => {
          const targetAthlete = wmpConfirm === 'merah' ? state.atletMerah : state.atletBiru;
          const cornerText = wmpConfirm === 'merah' ? 'SUDUT MERAH' : 'SUDUT BIRU';
          const cornerColorClass = wmpConfirm === 'merah' ? 'text-red-600 border-red-300 bg-red-50' : 'text-blue-700 border-blue-300 bg-blue-50';

          return (
            <div className="fixed inset-0 bg-[#000000bd] backdrop-blur-md z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white border-2 border-amber-400 max-w-sm w-full p-6 rounded-2xl shadow-2xl text-slate-800"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black tracking-wide ${cornerColorClass}`}>
                    {cornerText}
                  </div>
                  <div className="px-2.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-[10px] font-black text-amber-700">
                    Menang WMP (RSC)
                  </div>
                </div>

                <div className="text-center mb-3">
                  <Trophy className="w-10 h-10 mx-auto mb-2 text-amber-500 animate-bounce" />
                  <h3 className="text-base font-black uppercase text-slate-900 tracking-tight">
                    Sahkan Menang WMP?
                  </h3>
                  <p className="text-[10.5px] text-slate-500 mt-1 leading-normal font-sans">
                    Wasit Menghentikan Pertandingan dan menyatakan sudut ini sebagai PEMENANG mutlak.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl mb-4 text-left">
                  <span className="text-[9px] uppercase font-black text-slate-400 block">Atlet Pemenang (WMP)</span>
                  <div className="text-sm font-black text-slate-800 uppercase mt-0.5">{targetAthlete.nama}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">{targetAthlete.kontingen}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleApplyWmp}
                    className="flex-1 py-2 cursor-pointer bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-widest rounded-lg shadow-md transition-all border border-amber-300 active:scale-95"
                  >
                    Ya, Sahkan WMP
                  </button>
                  <button
                    onClick={() => { playBeep('click'); setWmpConfirm(null); }}
                    className="flex-1 py-2 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest rounded-lg transition-all active:scale-95"
                  >
                    Batal
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
