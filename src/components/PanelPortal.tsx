import React from 'react';
import { motion } from 'motion/react';
import { Radio, ListOrdered, Tv } from 'lucide-react';
import { playBeep } from '../utils/sound';
import tandingImg from '../assets/images/tanding_shield_logo_1783848117532.jpg';
import seniImg from '../assets/images/seni_shield_logo_1783848135838.jpg';
import RekapitulasiSkor from './RekapitulasiSkor';
import { MatchHistory, TGRState, MatchState } from '../types';

interface PanelPortalProps {
  onSelectMode: (mode: 'tanding' | 'seni' | 'monitor_urutan') => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  histories?: MatchHistory[];
  tgrState?: TGRState | null;
  state?: MatchState | null;
}

export default function PanelPortal({ onSelectMode, theme, onToggleTheme, histories = [], tgrState, state }: PanelPortalProps) {
  const handleSelect = (mode: 'tanding' | 'seni' | 'monitor_urutan') => {
    playBeep('valid');
    onSelectMode(mode);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-[#03020c] text-slate-100 p-4 md:p-8 relative overflow-hidden font-sans">
      
      {/* Abstract modern cyber waves & grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(10,10,35,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(10,10,35,0.4)_1px,transparent_1px)] bg-[size:32px_32px] opacity-35 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[40rem] h-[40rem] rounded-full blur-[180px] pointer-events-none bg-indigo-950/20" />
      <div className="absolute top-1/3 left-0 w-[30rem] h-[30rem] rounded-full blur-[150px] pointer-events-none bg-purple-950/15" />

      {/* 1. TOP BAR PILL & QUICK MONITOR LINK */}
      <div className="z-10 mt-4 flex flex-wrap items-center justify-center gap-3">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-950/40 text-[9px] font-mono tracking-[0.25em] font-black uppercase text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span>NO DISCORD • PLATFORM UTAMA</span>
        </motion.div>

        {/* Dedicated Monitor Urutan Partai Launch Button */}
        <motion.button
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSelect('monitor_urutan')}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/50 bg-gradient-to-r from-amber-950/70 to-orange-950/70 hover:from-amber-900/80 hover:to-orange-900/80 text-[10px] font-mono tracking-wider font-extrabold uppercase text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
        >
          <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span>MONITOR URUTAN PARTAI (LIVE JADWAL)</span>
        </motion.button>
      </div>

      {/* 2. CENTER TITLES */}
      <div className="max-w-4xl w-full text-center z-10 flex flex-col items-center my-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-[0.1em] text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-white to-amber-500 filter drop-shadow-[0_0_30px_rgba(245,158,11,0.25)] uppercase select-none">
            DIGITAL SKORING PENCAK SILAT
          </h1>
          <p className="text-[10px] md:text-xs tracking-[0.15em] font-bold text-slate-400 uppercase max-w-2xl mx-auto leading-relaxed">
            APLIKASI DIGITAL SKORING PENCAK SILAT BERBASIS OFFLINE (LOCALHOST) MULTI DEVICE
          </p>
        </motion.div>
      </div>

      {/* 3. DUAL PORTAL CARDS */}
      <div className="max-w-5xl w-full z-10 my-6 flex flex-col md:flex-row items-center justify-center gap-10 md:gap-14 px-4">
        
        {/* TANDING PORTAL CARD */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          whileHover={{ scale: 1.03 }}
          onClick={() => handleSelect('tanding')}
          className="group w-full max-w-[340px] aspect-[4/5] rounded-3xl border border-cyan-500/20 bg-[#060413]/70 hover:border-cyan-400/80 p-6 flex flex-col justify-between items-center cursor-pointer transition-all duration-300 shadow-2xl hover:shadow-[0_0_50px_rgba(6,182,212,0.3)] relative"
        >
          {/* Subtle frame corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500 rounded-tl-3xl opacity-30 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500 rounded-tr-3xl opacity-30 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500 rounded-bl-3xl opacity-30 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500 rounded-br-3xl opacity-30 group-hover:opacity-100 transition-opacity" />

          {/* Glowing background behind image */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-cyan-500/5 blur-3xl group-hover:bg-cyan-500/15 transition-all" />

          {/* Shield Image */}
          <div className="w-56 h-56 rounded-full overflow-hidden border border-cyan-500/30 group-hover:border-cyan-400 p-1 bg-[#020108] relative z-10 shadow-lg">
            <img
              src={tandingImg}
              alt="Tanding Shield Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-500 ease-out"
            />
          </div>

          {/* Category Text Title */}
          <div className="text-center z-10 mt-4 space-y-1">
            <h2 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 group-hover:from-cyan-300 group-hover:to-blue-400 uppercase">
              TANDING
            </h2>
            <p className="text-[9px] font-mono tracking-widest uppercase text-slate-500 group-hover:text-slate-350 transition-colors">
              MODUL ARENA PERTANDINGAN FISIK
            </p>
          </div>
        </motion.div>

        {/* JURUS/SENI PORTAL CARD */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          whileHover={{ scale: 1.03 }}
          onClick={() => handleSelect('seni')}
          className="group w-full max-w-[340px] aspect-[4/5] rounded-3xl border border-purple-500/20 bg-[#060413]/70 hover:border-purple-400/80 p-6 flex flex-col justify-between items-center cursor-pointer transition-all duration-300 shadow-2xl hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] relative"
        >
          {/* Subtle frame corners */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-500 rounded-tl-3xl opacity-30 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-500 rounded-tr-3xl opacity-30 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-500 rounded-bl-3xl opacity-30 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-500 rounded-br-3xl opacity-30 group-hover:opacity-100 transition-opacity" />

          {/* Glowing background behind image */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-purple-500/5 blur-3xl group-hover:bg-purple-500/15 transition-all" />

          {/* Shield Image */}
          <div className="w-56 h-56 rounded-full overflow-hidden border border-purple-500/30 group-hover:border-purple-400 p-1 bg-[#020108] relative z-10 shadow-lg">
            <img
              src={seniImg}
              alt="Jurus/Seni Shield Logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-500 ease-out"
            />
          </div>

          {/* Category Text Title */}
          <div className="text-center z-10 mt-4 space-y-1">
            <h2 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 group-hover:from-purple-300 group-hover:to-pink-400 uppercase">
              JURUS/SENI
            </h2>
            <p className="text-[9px] font-mono tracking-widest uppercase text-slate-500 group-hover:text-slate-350 transition-colors">
              MODUL SENI TGR (TUNGGAL/GANDA/REGU)
            </p>
          </div>
        </motion.div>

      </div>

      {/* 4. TOURNAMENT RECAPITULATION & WINNERS OVERVIEW */}
      <div className="max-w-7xl w-full z-10 my-8 px-2 sm:px-4">
        <RekapitulasiSkor
          histories={histories}
          tgrState={tgrState}
          state={state}
        />
      </div>

      {/* 5. FOOTER CREDITS */}
      <div className="w-full z-10 flex flex-col sm:flex-row justify-between items-center gap-3 text-[9px] font-mono tracking-widest text-slate-600 uppercase mt-8 border-t border-slate-900/60 pt-4 max-w-7xl">
        <span>© 2026 NO DISCORS. HAK CIPTA DILINDUNGI.</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="px-2.5 py-1 rounded bg-slate-950 border border-slate-900 text-slate-400 hover:text-slate-200 transition-colors text-[8px] uppercase font-bold tracking-widest"
          >
            THEME: {theme.toUpperCase()}
          </button>
        </div>
        <span>SISTEM SKORING DIGITAL</span>
      </div>

    </div>
  );
}
