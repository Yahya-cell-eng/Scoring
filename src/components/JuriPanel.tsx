/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Play, UserCheck, Zap, AlertTriangle, Coins, Sun, Moon, Lock, Maximize2, Minimize2 } from 'lucide-react';
import { MatchState } from '../types';
import { playBeep } from '../utils/sound';
import ThemePaletteSelector from './ThemePaletteSelector';

interface JuriPanelProps {
  juriId: 1 | 2 | 3;
  state: MatchState;
  dispatch: (type: string, payload?: any) => Promise<any>;
  onBack: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export default function JuriPanel({ juriId, state, dispatch, onBack, theme, onToggleTheme }: JuriPanelProps) {
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

  // We keep a small local state for optimistic button flash feedback
  const [clickedButton, setClickedButton] = useState<{ sudut: 'merah' | 'biru'; type: 'punch' | 'kick' } | null>(null);
  const [selectedPenaltyCorner, setSelectedPenaltyCorner] = useState<'merah' | 'biru' | null>(null);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleScoreInput = (sudut: 'merah' | 'biru', actionType: 'punch' | 'kick') => {
    // Prevent scoring if timer is paused, stopped, in break, or finished
    if (state.matchStatus !== 'running' || !state.timerActive) {
      playBeep('warning');
      return;
    }

    // Play tactile sound & set flash
    playBeep('click');
    setClickedButton({ sudut, type: actionType });
    setTimeout(() => setClickedButton(null), 150);

    // Dispatches score input directly to the authoritative server
    dispatch('JURI_HIT', { juriId, sudut, aksi: actionType });
  };

  const castVote = (voteValue: 'MERAH' | 'BIRU' | 'TIDAK_SAH') => {
    playBeep('click');
    dispatch('JURI_VERIFY_VOTE', { juriId, vote: voteValue });
  };

  // Helper inside Juri scorecards - displays points entered ONLY by this specific Juri
  const getMyJuriRoundPoints = (corner: 'merah' | 'biru', bNum: number) => {
    if (!state.juriHits) return 0;
    return state.juriHits.reduce((sum, h) => {
      if (h.juriId === juriId && h.sudut === corner && h.babak === bNum) {
        return sum + (h.aksi === 'punch' ? 1 : 2);
      }
      return sum;
    }, 0);
  };

  const closeBack = () => {
    playBeep('click');
    onBack();
  };

  // Logic to determine locked-out states
  const showRoundEndWarning = state.matchStatus === 'babak_habis';
  const showMatchEndWarning = state.matchStatus === 'selesai';
  const showInputDisabledLock = state.matchStatus !== 'running' || !state.timerActive;

  // Track if we voted on active verification to hide once cast
  const v = state.verification;
  const currJuriKey = `juri${juriId}` as keyof typeof v.votes;
  const hasVoted = v.active && v.votes[currJuriKey] !== null;

  return (
    <div className={`w-full h-full flex flex-col justify-between p-3 select-none transition-colors duration-300 relative ${
      theme === 'dark' ? 'text-slate-100 bg-slate-950' : 'text-slate-800 bg-slate-50'
    }`}>
      
      {/* 1. Header Display */}
      <div className={`flex justify-between items-center pb-3 border px-4 py-2 rounded-xl shadow-lg transition-all duration-300 ${
        theme === 'dark' 
          ? 'border-slate-805 bg-gradient-to-r from-slate-900/40 via-slate-900 to-slate-900/40 text-slate-100' 
          : 'border-slate-205 bg-gradient-to-r from-slate-200/40 via-slate-200 to-slate-200/40 text-slate-800'
      }`}>
        <div className="flex items-center gap-2">
          <button 
            onClick={closeBack}
            className={`px-2.5 py-1 text-xs cursor-pointer rounded transition-colors font-bold uppercase ${
              theme === 'dark' 
                ? 'bg-slate-800 hover:bg-slate-705 border border-slate-700 text-slate-300' 
                : 'bg-white hover:bg-slate-100 border border-slate-300 text-slate-750'
            }`}
          >
            ← Keluar
          </button>
          <button
            onClick={onToggleTheme}
            className={`p-1.5 rounded transition-colors cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-800 text-amber-400' : 'hover:bg-slate-200 text-slate-600'}`}
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <ThemePaletteSelector compact={true} />
          
          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded transition-colors cursor-pointer ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-600'}`}
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <div className={`h-4 w-[1px] ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`} />
          <div className="flex items-center gap-1.5">
            <UserCheck className={`w-4 h-4 ${theme === 'dark' ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <span className={`text-xs font-mono font-black uppercase tracking-wider ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>PANEL JURI {juriId}</span>
          </div>
        </div>

        {/* Central Round/Waktu indicator */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2.5">
            <span className={`text-[10px] border px-2 py-0.5 rounded font-mono font-bold uppercase ${
              theme === 'dark' ? 'bg-cyan-950 border-cyan-800/40 text-cyan-350' : 'bg-cyan-50 border-cyan-200 text-cyan-705'
            }`}>
              BABAK AKTIF: {state.currentBabak}
            </span>
            <div className={`text-lg md:text-xl font-mono font-black flex items-center gap-1 px-2.5 py-0.5 rounded border transition-all duration-300 ${
              theme === 'dark' 
                ? 'bg-slate-955 border-slate-800' 
                : 'bg-white border-slate-201 text-slate-800'
            } ${state.timerActive ? 'text-green-405 animate-pulse' : 'text-amber-500'}`}>
              <Play className={`w-3.5 h-3.5 fill-current ${state.timerActive ? 'rotate-90' : ''}`} />
              {formatTimer(state.timerSeconds)}
            </div>
          </div>
        </div>

        {/* Short Profile Profile info */}
        <div className={`text-right text-[11px] font-mono flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-505'}`}>
          <div>
            PARTAI <span className={`font-black text-xs px-2 py-0.5 rounded-md shadow-sm ml-1 ${theme === 'dark' ? 'bg-indigo-950 text-indigo-300 border border-indigo-900/50' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold'}`}>{state.partai}</span>
          </div>
          <div className="mx-1">|</div>
          <div>
            KELAS <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{state.kelas} ({state.gender})</span>
          </div>
        </div>
      </div>

      {/* 2. Primary Tap scoring pads */}
      <div className="grid grid-cols-12 gap-3 flex-1 my-2 min-h-0 relative">
        
        {/* SUDUT BIRU PAD (LEFT SIDE) - COL 6 */}
        <div className="col-span-6 flex flex-col justify-between bg-gradient-to-bl from-blue-950/40 to-slate-900 border border-blue-900/50 rounded-xl p-3 shadow-lg min-h-0 relative overflow-hidden">
          
          {/* Subtle Silhouette Bg vector layout */}
          <div className="absolute inset-0 opacity-[0.015] pointer-events-none flex items-center justify-start pl-6">
            <svg viewBox="0 0 100 100" className="w-48 h-48 text-cyan-400">
              <path fill="currentColor" d="M20 50 L40 20 L50 30 L30 60 Z" />
            </svg>
          </div>

          {/* Athlete Profile / Header inside pad */}
          <div className="flex justify-between items-center border-b border-blue-900/25 pb-1 flex-shrink-0 z-10">
            <div>
              <span className="text-[9px] font-black uppercase bg-blue-600 text-white px-3 py-1 rounded shadow-lg shadow-blue-900/40">
                SUDUT BIRU
              </span>
              <h4 className="text-sm font-black text-white uppercase mt-1.5 max-w-[12rem] truncate">
                {state.atletBiru.nama}
              </h4>
              <p className="text-[9px] text-blue-400 uppercase font-semibold font-mono truncate max-w-[11rem]">
                {state.atletBiru.kontingen}
              </p>
            </div>

            {/* Micro score board showing this Juri's individual contribution logs */}
            <div className="text-right bg-blue-950/40 px-2 py-1 rounded border border-blue-900/30 font-mono flex gap-2 text-[10px]">
              <div>B1: <span className="text-cyan-405 font-bold">{getMyJuriRoundPoints('biru', 1)}</span></div>
              <div>B2: <span className="text-cyan-405 font-bold">{getMyJuriRoundPoints('biru', 2)}</span></div>
              <div>B3: <span className="text-cyan-405 font-bold">{getMyJuriRoundPoints('biru', 3)}</span></div>
            </div>
          </div>

          {/* Core Scoring Actions: PUNCH (+1) and KICK (+2) */}
          <div className="flex gap-3 flex-1 mt-3 z-10">
            <button
              onClick={() => handleScoreInput('biru', 'punch')}
              className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                showInputDisabledLock 
                  ? 'bg-slate-900/20 border-slate-900 text-slate-700 cursor-not-allowed' 
                  : clickedButton?.sudut === 'biru' && clickedButton?.type === 'punch'
                    ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-black scale-95 shadow-[0_0_20px_rgba(34,211,238,0.6)]'
                    : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80 hover:border-blue-500 text-blue-400'
              }`}
            >
              <Zap className="w-7 h-7 mb-1 filter drop-shadow" />
              <span className="text-lg font-black tracking-widest uppercase">PUNCH</span>
              <span className="text-[10px] font-mono tracking-wider opacity-70 mt-0.5">+1 POIN</span>
            </button>

            <button
              onClick={() => handleScoreInput('biru', 'kick')}
              className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                showInputDisabledLock 
                  ? 'bg-slate-900/20 border-slate-900 text-slate-700 cursor-not-allowed' 
                  : clickedButton?.sudut === 'biru' && clickedButton?.type === 'kick'
                    ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-black scale-95 shadow-[0_0_20px_rgba(34,211,238,0.6)]'
                    : 'bg-gradient-to-b from-blue-900/20 to-blue-950/30 border border-blue-900/60 hover:from-blue-900/30 hover:to-blue-950/40 text-cyan-455 font-bold hover:border-cyan-500 shadow-md'
              }`}
            >
              <Zap className="w-7 h-7 mb-1" />
              <span className="text-lg font-black tracking-widest uppercase">KICK</span>
              <span className="text-[10px] font-mono tracking-wider opacity-70 mt-0.5">+2 POIN</span>
            </button>
          </div>

          {/* Penalty Button for Blue */}
          {state.juryPenaltyAccess ? (
            <button
              onClick={() => {
                playBeep('click');
                setSelectedPenaltyCorner('biru');
              }}
              className={`w-full mt-3 py-2 px-3 flex items-center justify-center gap-1.5 rounded-xl border font-bold font-mono text-xs transition-all uppercase cursor-pointer z-10 hover:scale-[1.01] ${
                theme === 'dark'
                  ? 'border-red-900/40 bg-red-950/20 hover:bg-red-900/20 text-red-400'
                  : 'border-red-200 bg-red-50 hover:bg-red-100/80 text-red-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>⚠️ Input Penalti Sudut Biru</span>
            </button>
          ) : (
            <div
              className={`w-full mt-3 py-2.5 px-3 flex items-center justify-center gap-1.5 rounded-xl border font-bold font-mono text-xs opacity-50 cursor-not-allowed ${
                theme === 'dark'
                  ? 'border-slate-800 bg-slate-900/50 text-slate-500'
                  : 'border-slate-200 bg-slate-100 text-slate-400'
              }`}
              title="Akses di-lock oleh Dewan"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Input Penalti Biru (Terkunci)</span>
            </div>
          )}
        </div>

        {/* SUDUT MERAH PAD (RIGHT SIDE) - COL 6 */}
        <div className="col-span-6 flex flex-col justify-between bg-gradient-to-br from-red-950/40 to-slate-900 border border-red-900/50 rounded-xl p-3 shadow-lg min-h-0 relative overflow-hidden">
          
          {/* Subtle Silhouette Bg vector layout */}
          <div className="absolute inset-0 opacity-[0.015] pointer-events-none flex items-center justify-end pr-6">
            <svg viewBox="0 0 100 100" className="w-48 h-48 text-red-400">
              <path fill="currentColor" d="M80 50 L60 20 L50 30 L70 60 Z" />
            </svg>
          </div>

          {/* Athlete Profile / Header inside pad */}
          <div className="flex justify-between items-center border-b border-red-900/25 pb-1 flex-shrink-0 z-10">
            {/* Micro score board showing this Juri's individual contribution logs */}
            <div className="text-right bg-red-950/40 px-2 py-1 rounded border border-red-900/30 font-mono flex gap-2 text-[10px]">
              <div>B1: <span className="text-red-450 font-bold">{getMyJuriRoundPoints('merah', 1)}</span></div>
              <div>B2: <span className="text-red-450 font-bold">{getMyJuriRoundPoints('merah', 2)}</span></div>
              <div>B3: <span className="text-red-450 font-bold">{getMyJuriRoundPoints('merah', 3)}</span></div>
            </div>

            <div className="text-right">
              <span className="text-[9px] font-black uppercase bg-red-600 text-white px-3 py-1 rounded shadow-lg shadow-red-900/40">
                SUDUT MERAH
              </span>
              <h4 className="text-sm font-black text-white uppercase mt-1.5 max-w-[12rem] truncate">
                {state.atletMerah.nama}
              </h4>
              <p className="text-[9px] text-red-455 uppercase font-semibold font-mono truncate max-w-[11rem]">
                {state.atletMerah.kontingen}
              </p>
            </div>
          </div>

          {/* Core Scoring Actions: PUNCH (+1) and KICK (+2) */}
          <div className="flex gap-3 flex-1 mt-3 z-10">
            <button
              onClick={() => handleScoreInput('merah', 'punch')}
              className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                showInputDisabledLock 
                  ? 'bg-slate-900/20 border-slate-900 text-slate-700 cursor-not-allowed' 
                  : clickedButton?.sudut === 'merah' && clickedButton?.type === 'punch'
                    ? 'bg-orange-500 border-orange-400 text-slate-950 font-black scale-95 shadow-[0_0_20px_rgba(249,115,22,0.6)]'
                    : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80 hover:border-red-500 text-red-500'
              }`}
            >
              <Zap className="w-7 h-7 mb-1" />
              <span className="text-lg font-black tracking-widest uppercase">PUNCH</span>
              <span className="text-[10px] font-mono tracking-wider opacity-70 mt-0.5">+1 POIN</span>
            </button>

            <button
              onClick={() => handleScoreInput('merah', 'kick')}
              className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                showInputDisabledLock 
                  ? 'bg-slate-900/20 border-slate-900 text-slate-700 cursor-not-allowed' 
                  : clickedButton?.sudut === 'merah' && clickedButton?.type === 'kick'
                    ? 'bg-orange-500 border-orange-400 text-slate-950 font-black scale-95 shadow-[0_0_20px_rgba(249,115,22,0.6)]'
                    : 'bg-gradient-to-b from-red-900/20 to-red-950/30 border border-red-900/60 hover:from-red-900/30 hover:to-red-950/40 text-orange-455 font-bold hover:border-orange-500 shadow-md'
              }`}
            >
              <Zap className="w-7 h-7 mb-1" />
              <span className="text-lg font-black tracking-widest uppercase">KICK</span>
              <span className="text-[10px] font-mono tracking-wider opacity-70 mt-0.5">+2 POIN</span>
            </button>
          </div>

          {/* Penalty Button for Red */}
          {state.juryPenaltyAccess ? (
            <button
              onClick={() => {
                playBeep('click');
                setSelectedPenaltyCorner('merah');
              }}
              className={`w-full mt-3 py-2 px-3 flex items-center justify-center gap-1.5 rounded-xl border font-bold font-mono text-xs transition-all uppercase cursor-pointer z-10 hover:scale-[1.01] ${
                theme === 'dark'
                  ? 'border-red-900/40 bg-red-950/20 hover:bg-red-900/20 text-red-400'
                  : 'border-red-200 bg-red-50 hover:bg-red-100/80 text-red-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>⚠️ Input Penalti Sudut Merah</span>
            </button>
          ) : (
            <div
              className={`w-full mt-3 py-2.5 px-3 flex items-center justify-center gap-1.5 rounded-xl border font-bold font-mono text-xs opacity-50 cursor-not-allowed ${
                theme === 'dark'
                  ? 'border-slate-800 bg-slate-900/50 text-slate-500'
                  : 'border-slate-200 bg-slate-100 text-slate-400'
              }`}
              title="Akses di-lock oleh Dewan"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Input Penalti Merah (Terkunci)</span>
            </div>
          )}
        </div>

      </div>

      {/* 3. Real-time Status Overlay Warnings */}
      <AnimatePresence>
        
        {/* Dewan Active Verification Popup Panel */}
        {v.active && !hasVoted && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-yellow-500 max-w-lg w-full p-6 pb-8 rounded-2xl shadow-2xl text-center"
            >
              <Shield className="w-12 h-12 text-yellow-500 mx-auto mb-3 animate-ping" />
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">
                VERIFIKASI DEWAN PERTANDINGAN
              </h3>
              <p className="text-xs text-slate-400 mb-6">
                Silakan nyatakan pendapat Anda tentang verifikasi <span className="bg-yellow-950 border border-yellow-800 text-yellow-405 px-2 py-0.5 rounded font-black font-mono">{v.type}</span> yang diinstruksikan dewan.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => castVote('BIRU')}
                  className="py-4 px-6 cursor-pointer bg-gradient-to-b from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-white font-black text-sm tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                >
                  SUDUT BIRU
                </button>
                <button
                  onClick={() => castVote('TIDAK_SAH')}
                  className="py-4 px-6 cursor-pointer bg-gradient-to-b from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 text-slate-205 font-black text-sm tracking-wider rounded-xl transition-all shadow-md active:scale-95 border border-slate-600"
                >
                  TIDAK SAH
                </button>
                <button
                  onClick={() => castVote('MERAH')}
                  className="py-4 px-6 cursor-pointer bg-gradient-to-b from-red-700 to-red-900 hover:from-red-650 hover:to-red-800 text-white font-black text-sm tracking-wider rounded-xl transition-all shadow-md active:scale-95"
                >
                  SUDUT MERAH
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Locked Voting Pending Overlay */}
        {v.active && hasVoted && (
          <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-[9990] flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 max-w-sm w-full p-6 py-8 rounded-2xl shadow-xl text-center">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <h4 className="text-base font-black uppercase text-white mb-1.5 font-mono">
                SUARA SUDAH DIKIRIM
              </h4>
              <p className="text-xs text-slate-400">
                Menunggu dewan menyelesaikan keputusan akhir berdasarkan voting mayoritas juri...
              </p>
            </div>
          </div>
        )}

        {/* Round End Locked Gray Indicator */}
        {showRoundEndWarning && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[9980] flex items-center justify-center p-4">
            <div className="bg-slate-900/90 border border-amber-900/60 max-w-md w-full p-6 py-8 rounded-2xl text-center shadow-2xl">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-pulse" />
              <h3 className="text-lg font-black uppercase text-white mb-2 tracking-wide font-mono">
                BABAK {state.currentBabak} TELAH HABIS
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Pencatatan skor dikunci sementara selama waktu jeda istirahat. Hubungi Sekretaris untuk menyetujui pelanjutan pertandingan ke babak selanjutnya.
              </p>
            </div>
          </div>
        )}

        {/* Match End Locked Gray Indicator */}
        {showMatchEndWarning && (
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[9980] flex items-center justify-center p-4">
            <div className="bg-slate-900/90 border border-green-900/60 max-w-md w-full p-8 rounded-2xl text-center shadow-2xl">
              <Zap className="w-12 h-12 text-green-400 mx-auto mb-3 animate-bounce" />
              <h3 className="text-lg font-black uppercase text-white mb-2 tracking-wide font-mono">
                PERTANDINGAN SELESAI
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mb-1 leading-relaxed">
                Partai skoring saat ini telah diakumulasikan dan diselesaikan secara sah.
              </p>
              <p className="text-[10px] text-green-400 font-mono font-bold uppercase tracking-widest mt-2">
                Nantikan Sekretaris memulai Partai selanjutnya
              </p>
            </div>
          </div>
        )}

        {/* Penalty Selection Modal */}
        {selectedPenaltyCorner && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[9995] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`max-w-xl w-full p-6 rounded-2xl shadow-2xl border ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-700/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h3 className={`text-base font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    Input Penalti / Pelanggaran - {selectedPenaltyCorner === 'biru' ? 'Sudut Biru' : 'Sudut Merah'}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPenaltyCorner(null)}
                  className={`text-xs font-mono font-bold px-2 py-1 rounded hover:bg-slate-700/50 transition-colors ${
                    theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  [TUTUP]
                </button>
              </div>

              {/* Show the athlete currently selected */}
              <div className={`p-3 rounded-xl mb-4 border ${
                selectedPenaltyCorner === 'biru' 
                  ? 'bg-blue-950/20 border-blue-900/40 text-blue-400' 
                  : 'bg-red-955/25 border-red-900/40 text-red-400'
              }`}>
                <div className="text-[10px] uppercase font-mono font-black opacity-75">Nama Pesilat:</div>
                <div className="text-sm font-black uppercase">
                  {selectedPenaltyCorner === 'biru' ? state.atletBiru.nama : state.atletMerah.nama}
                </div>
                <div className="text-xs font-semibold opacity-85">
                  {selectedPenaltyCorner === 'biru' ? state.atletBiru.kontingen : state.atletMerah.kontingen}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Binaan 1 & 2 */}
                <button
                  onClick={() => {
                    playBeep('warning');
                    dispatch('DEWAN_PENALTY', { sudut: selectedPenaltyCorner, penaltyType: 'binaan1' });
                  }}
                  className={`p-3 text-left rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    state.dewanPenalties[selectedPenaltyCorner].binaan1
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                      : theme === 'dark' ? 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/50' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold uppercase">Binaan 1</div>
                    <div className="text-[10px] font-medium opacity-75">Pembinaan Tahap 1</div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${state.dewanPenalties[selectedPenaltyCorner].binaan1 ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-slate-600'}`} />
                </button>

                <button
                  onClick={() => {
                    playBeep('warning');
                    dispatch('DEWAN_PENALTY', { sudut: selectedPenaltyCorner, penaltyType: 'binaan2' });
                  }}
                  className={`p-3 text-left rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    state.dewanPenalties[selectedPenaltyCorner].binaan2
                      ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold'
                      : theme === 'dark' ? 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/50' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold uppercase">Binaan 2</div>
                    <div className="text-[10px] font-medium opacity-75">Pembinaan Tahap 2</div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${state.dewanPenalties[selectedPenaltyCorner].binaan2 ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-slate-600'}`} />
                </button>

                {/* Teguran 1 & 2 */}
                <button
                  onClick={() => {
                    playBeep('warning');
                    dispatch('DEWAN_PENALTY', { sudut: selectedPenaltyCorner, penaltyType: 'teguran1' });
                  }}
                  className={`p-3 text-left rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    state.dewanPenalties[selectedPenaltyCorner].teguran1
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400 font-bold shadow-[0_0_10px_rgba(249,115,22,0.15)]'
                      : theme === 'dark' ? 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/50' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold uppercase flex items-center gap-1.5">
                      <span>Teguran 1</span>
                      <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-1 py-0.2 rounded font-black">-1 Poin</span>
                    </div>
                    <div className="text-[10px] font-medium opacity-75">Pengurangan 1 Poin Otomatis</div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${state.dewanPenalties[selectedPenaltyCorner].teguran1 ? 'bg-orange-500 shadow-[0_0_8px_#f97316]' : 'bg-slate-600'}`} />
                </button>

                <button
                  onClick={() => {
                    playBeep('warning');
                    dispatch('DEWAN_PENALTY', { sudut: selectedPenaltyCorner, penaltyType: 'teguran2' });
                  }}
                  className={`p-3 text-left rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    state.dewanPenalties[selectedPenaltyCorner].teguran2
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400 font-bold shadow-[0_0_10px_rgba(249,115,22,0.15)]'
                      : theme === 'dark' ? 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/50' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold uppercase flex items-center gap-1.5">
                      <span>Teguran 2</span>
                      <span className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-1 py-0.2 rounded font-black">-2 Poin</span>
                    </div>
                    <div className="text-[10px] font-medium opacity-75">Pengurangan 2 Poin Otomatis</div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${state.dewanPenalties[selectedPenaltyCorner].teguran2 ? 'bg-orange-500 shadow-[0_0_8px_#f97316]' : 'bg-slate-600'}`} />
                </button>

                {/* Peringatan 1 & 2 */}
                <button
                  onClick={() => {
                    playBeep('warning');
                    dispatch('DEWAN_PENALTY', { sudut: selectedPenaltyCorner, penaltyType: 'peringatan1' });
                  }}
                  className={`p-3 text-left rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    state.dewanPenalties[selectedPenaltyCorner].peringatan1
                      ? 'bg-red-500/20 border-red-500 text-red-400 font-bold shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                      : theme === 'dark' ? 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/50' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold uppercase flex items-center gap-1.5">
                      <span>Peringatan 1</span>
                      <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.2 rounded font-black">-5 Poin</span>
                    </div>
                    <div className="text-[10px] font-medium opacity-75">Pengurangan 5 Poin Otomatis</div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${state.dewanPenalties[selectedPenaltyCorner].peringatan1 ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-slate-600'}`} />
                </button>

                <button
                  onClick={() => {
                    playBeep('warning');
                    dispatch('DEWAN_PENALTY', { sudut: selectedPenaltyCorner, penaltyType: 'peringatan2' });
                  }}
                  className={`p-3 text-left rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    state.dewanPenalties[selectedPenaltyCorner].peringatan2
                      ? 'bg-red-500/20 border-red-500 text-red-400 font-bold shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                      : theme === 'dark' ? 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/50' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold uppercase flex items-center gap-1.5">
                      <span>Peringatan 2</span>
                      <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.2 rounded font-black">-10 Poin</span>
                    </div>
                    <div className="text-[10px] font-medium opacity-75">Pengurangan 10 Poin Otomatis</div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${state.dewanPenalties[selectedPenaltyCorner].peringatan2 ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-slate-600'}`} />
                </button>

                {/* Diskualifikasi */}
                <button
                  onClick={() => {
                    playBeep('warning');
                    if (window.confirm(`YAKIN DISKUALIFIKASI ${selectedPenaltyCorner === 'biru' ? 'SUDUT BIRU' : 'SUDUT MERAH'}?`)) {
                      dispatch('DEWAN_PENALTY', { sudut: selectedPenaltyCorner, penaltyType: 'disqualified' });
                    }
                  }}
                  className={`col-span-1 sm:col-span-2 p-3 text-left rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                    state.dewanPenalties[selectedPenaltyCorner].disqualified
                      ? 'bg-[#7f1d1d]/40 border-red-700 text-red-400 font-black shadow-[0_0_12px_rgba(220,38,38,0.25)]'
                      : 'bg-red-950/10 border-red-900/30 text-red-500 hover:bg-red-950/20'
                  }`}
                >
                  <div>
                    <div className="text-xs font-extrabold uppercase flex items-center gap-1.5">
                      <span>Diskualifikasi</span>
                      <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded font-black">KALAH LANGSUNG</span>
                    </div>
                    <div className="text-[10px] font-medium opacity-75">Diskualifikasi atlet dan selesaikan pertandingan langsung</div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${state.dewanPenalties[selectedPenaltyCorner].disqualified ? 'bg-red-550 shadow-[0_0_8px_#dc2626]' : 'bg-slate-700'}`} />
                </button>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedPenaltyCorner(null)}
                  className={`px-5 py-2.5 cursor-pointer rounded-xl font-bold uppercase text-xs tracking-wider transition-colors border ${
                    theme === 'dark' 
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  }`}
                >
                  Tutup Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
}
