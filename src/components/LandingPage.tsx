/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Users, FileText, Monitor as MonitorIcon, ChevronRight, Maximize, Minimize, Sun, Moon, RefreshCw, Radio } from 'lucide-react';
import { playBeep } from '../utils/sound';

import dewanImg from '../assets/images/dewan_panel_1782782282395.jpg';
import sekretarisImg from '../assets/images/sekretaris_panel_1782782300726.jpg';
import juriImg from '../assets/images/juri_panel_1782782315779.jpg';
import monitorImg from '../assets/images/monitor_panel_1782782330918.jpg';
import RekapitulasiSkor from './RekapitulasiSkor';
import { MatchHistory, MatchState } from '../types';

interface LandingPageProps {
  onSelectRole: (role: 'dewan' | 'juri1' | 'juri2' | 'juri3' | 'sekretaris' | 'monitor' | 'monitor_urutan') => void;
  onBackToPortal: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  histories?: MatchHistory[];
  state?: MatchState | null;
}

export default function LandingPage({ onSelectRole, onBackToPortal, theme, onToggleTheme, histories = [], state }: LandingPageProps) {
  const [selectedJuriGroup, setSelectedJuriGroup] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeActive = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isNativeActive);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Initial check
    handleFullscreenChange();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  React.useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    playBeep('click');
    
    const nativeElement = document.fullscreenElement || 
                          (document as any).webkitFullscreenElement || 
                          (document as any).mozFullScreenElement || 
                          (document as any).msFullscreenElement;

    if (!nativeElement && !isFullscreen) {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        element.requestFullscreen()
          .then(() => setIsFullscreen(true))
          .catch(err => {
            console.warn("Native fullscreen failed", err);
            setIsFullscreen(true);
          });
      } else {
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch(err => {
            console.warn(err);
            setIsFullscreen(false);
          });
      } else {
        setIsFullscreen(false);
      }
    }
  };

  const handleReload = () => {
    playBeep('click');
    window.location.reload();
  };

  const handleRoleSelection = (role: 'dewan' | 'juri1' | 'juri2' | 'juri3' | 'sekretaris' | 'monitor' | 'monitor_urutan') => {
    playBeep('click');
    onSelectRole(role);
  };

  const menuItems = [
    {
      id: 'dewan',
      title: 'DEWAN',
      titleSub: 'DEWAN PERTANDINGAN',
      desc: 'KELOLA PELANGGARAN, TEGURAN, PERINGATAN, JATUHAN SERTA INSTRUKSI VERIFIKASI PENILAIAN JURI',
      icon: Shield,
      image: dewanImg,
      glowColor: 'group-hover:shadow-[0_0_35px_rgba(245,158,11,0.55)] border-amber-500/30 group-hover:border-amber-400/80',
      textColor: 'group-hover:text-amber-400',
      badgeGradient: 'from-amber-600 to-orange-700'
    },
    {
      id: 'sekretaris',
      title: 'SEKRETARIS',
      titleSub: 'SEKRETARIS PERTANDINGAN',
      desc: 'ATUR IDENTITAS PESERTA, DURASI RONDE, CETAK PDF HASIL, SERTA AKSELERASI BAGAN TURNAMEN',
      icon: FileText,
      image: sekretarisImg,
      glowColor: 'group-hover:shadow-[0_0_35px_rgba(168,85,247,0.55)] border-purple-500/30 group-hover:border-purple-400/80',
      textColor: 'group-hover:text-purple-400',
      badgeGradient: 'from-purple-600 to-pink-700'
    },
    {
      id: 'juri',
      title: 'JURI',
      titleSub: 'JURI PERTANDINGAN',
      desc: 'BERIKAN PENILAIAN LANGSUNG PUKULAN & TENDANGAN SAAT WAKTU PERTANDINGAN AKTIF',
      icon: Users,
      image: juriImg,
      glowColor: 'group-hover:shadow-[0_0_35px_rgba(59,130,246,0.55)] border-blue-500/30 group-hover:border-blue-400/80',
      textColor: 'group-hover:text-blue-400',
      badgeGradient: 'from-blue-600 to-cyan-600',
      isGroup: true
    },
    {
      id: 'monitor',
      title: 'MONITOR',
      titleSub: 'MONITOR PERTANDINGAN',
      desc: 'DISPLAY LAYAR UTAMA PENONTON MENAMPILKAN SKOR REAL-TIME AKUMULATIF SECARA MIRRORED & MEGAH',
      icon: MonitorIcon,
      image: monitorImg,
      glowColor: 'group-hover:shadow-[0_0_35px_rgba(239,68,68,0.55)] border-red-500/30 group-hover:border-red-400/80',
      textColor: 'group-hover:text-red-400',
      badgeGradient: 'from-red-600 to-rose-700'
    }
  ];

  const tandingItems = menuItems.filter(item => ['dewan', 'juri', 'monitor'].includes(item.id));
  const urusItems = menuItems.filter(item => item.id === 'sekretaris');

  return (
    <div className={`min-h-[100dvh] w-full flex flex-col justify-between items-center transition-colors duration-500 px-4 md:px-8 py-8 relative overflow-hidden bg-[#020207] text-slate-100 ${
      isFullscreen ? 'fixed inset-0 z-[99999] w-screen h-[100dvh]' : ''
    }`}>
      
      {/* Dynamic Cyber background grid overlay & subtle cosmic dust */}
      <div className="absolute inset-0 bg-[radial-gradient(#08081a_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(circle_at_top,rgba(20,24,65,0.4)_0%,transparent_65%)] pointer-events-none" />

      {/* Extreme Neon Glow Underlays */}
      <div className="absolute top-1/4 left-1/3 w-[30rem] h-[30rem] rounded-full blur-[160px] pointer-events-none bg-blue-900/10" />
      <div className="absolute bottom-1/4 right-1/3 w-[30rem] h-[30rem] rounded-full blur-[160px] pointer-events-none bg-purple-900/10" />

      {/* Decorative Martial Arts subtle backdrop silhouette logo */}
      <div className="absolute inset-0 opacity-[0.015] select-none pointer-events-none flex justify-center items-center">
        <svg viewBox="0 0 100 100" className="w-[45rem] h-[45rem] text-cyan-500">
          <path fill="currentColor" d="M30 40 L40 30 L55 35 L68 25 L75 32 L58 48 L45 42 Z M45 48 L52 58 L50 80 L42 80 L44 64 L34 52 Z" />
        </svg>
      </div>

      {/* Top action buttons */}
      <div className="z-10 mt-2 mb-2 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={onBackToPortal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[9.5px] uppercase tracking-wider font-mono font-bold rounded-xl transition-all active:scale-95 shadow-sm"
        >
          ← Kembali ke Portal Utama
        </button>

        <button
          onClick={() => handleRoleSelection('monitor_urutan')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 cursor-pointer bg-gradient-to-r from-amber-950/90 to-orange-950/90 hover:from-amber-900 hover:to-orange-900 border border-amber-500/50 text-amber-300 text-[9.5px] uppercase tracking-wider font-mono font-black rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
        >
          <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span>📺 MONITOR URUTAN PARTAI (LIVE JADWAL)</span>
        </button>
      </div>

      {/* 1. HEADER LOGO BANNER AREA */}
      <div className="max-w-5xl w-full z-10 text-center flex flex-col items-center mt-2 mb-6">
        <motion.div
          initial={{ opacity: 0, y: -25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          {/* DIGITAL SCORING header border box with wing accents */}
          <div className="relative inline-flex items-center px-12 py-1.5 border-t border-b border-cyan-500/30 bg-[#040410]/75 before:absolute before:left-0 before:top-0 before:h-full before:w-1.5 before:bg-cyan-500 after:absolute after:right-0 after:top-0 after:h-full after:w-1.5 after:bg-amber-500 shadow-[0_0_20px_rgba(6,182,212,0.15)] rounded">
            <span className="font-orbitron font-extrabold text-[11px] md:text-sm tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-amber-400 uppercase">
              DIGITAL SCORING
            </span>
          </div>
          
          {/* PENCAK SILAT giant italic sport title */}
          <h1 className="font-sport font-black italic text-[42px] sm:text-6xl md:text-[84px] mt-4 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-white to-orange-500 filter drop-shadow-[0_0_25px_rgba(59,130,246,0.4)] select-none leading-none">
            PENCAK SILAT
          </h1>

          {/* Subtitle block */}
          <p className="mt-5 max-w-3xl text-[9px] md:text-[10px] leading-relaxed text-slate-400 font-bold tracking-wider uppercase px-6 py-2.5 rounded-lg bg-slate-950/80 border border-slate-900/80 shadow-2xl max-w-2xl mx-auto">
            Aplikasi digitalisasi penilaian wasit dan dewan juri cabang olahraga beladiri Pencak Silat IPSI secara profesional dengan sinkronisasi instan multi-layer secara offline tingkat turnamen Nasional
          </p>
        </motion.div>
      </div>

      {/* 2. CHOOSE ROLE PANELS ROWS WITH SEPARATOR */}
      <div className="max-w-6xl w-full z-10 my-6">
        {!selectedJuriGroup ? (
          <motion.div 
            className="flex flex-col lg:flex-row items-stretch gap-6 px-2"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
          >
            {/* KATEGORI TANDING (OPERASIONAL ARENA) */}
            <div className="flex-[3] border border-cyan-500/15 rounded-2xl p-6 bg-slate-950/40 relative shadow-2xl">
              <div className="absolute -top-3 left-6 px-3 py-0.5 bg-[#020207] border border-cyan-500/50 text-cyan-400 font-black text-[9px] tracking-[0.2em] uppercase rounded shadow-md">
                KATEGORI PERTANDINGAN (TANDING)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 h-full">
                {tandingItems.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={{
                      hidden: { opacity: 0, y: 25 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    onClick={() => {
                      if (item.isGroup) {
                        playBeep('click');
                        setSelectedJuriGroup(true);
                      } else {
                        handleRoleSelection(item.id as any);
                      }
                    }}
                    className="flex flex-col items-center group cursor-pointer justify-between"
                  >
                    <div className="flex flex-col items-center">
                      {/* Glowing shield launcher badge */}
                      <div className={`w-32 h-32 sm:w-34 sm:h-34 rounded-full overflow-hidden border-2 bg-slate-950 relative shadow-xl transition-all duration-300 flex items-center justify-center ${item.glowColor}`}>
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-[96%] h-[96%] object-contain rounded-full group-hover:scale-110 transition-transform duration-500 ease-out"
                          referrerPolicy="no-referrer"
                        />
                        {/* Glowing light center glow */}
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5 pointer-events-none" />
                      </div>

                      {/* Role text headings */}
                      <h3 className={`text-base sm:text-lg font-black font-sport tracking-widest uppercase mt-4 text-center transition-colors duration-300 text-slate-150 ${item.textColor}`}>
                        {item.title}
                      </h3>
                    </div>
                    
                    {/* Detailed descriptions */}
                    <p className="text-[9px] mt-2 text-center leading-relaxed text-slate-500 uppercase tracking-wider font-semibold max-w-[14rem] sm:max-w-[16rem]">
                      {item.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* SEPARATOR PANEL (VERTICAL DIVIDER ON DESKTOP, HORIZONTAL ON MOBILE) */}
            <div className="flex lg:flex-col items-center justify-center py-2 lg:py-0 px-2">
              <div className="h-[1px] lg:h-full w-full lg:w-[1px] bg-gradient-to-r lg:bg-gradient-to-b from-transparent via-slate-800 to-transparent" />
              <div className="text-[8px] font-mono font-black text-slate-600 my-2 lg:my-4 lg:transform lg:rotate-90 uppercase tracking-[0.4em] select-none whitespace-nowrap">
                DIVIDER
              </div>
              <div className="h-[1px] lg:h-full w-full lg:w-[1px] bg-gradient-to-r lg:bg-gradient-to-b from-transparent via-slate-800 to-transparent" />
            </div>

            {/* KATEGORI URUS (PENGELOLA DATA) */}
            <div className="flex-[1] border border-purple-500/15 rounded-2xl p-6 bg-slate-950/40 relative shadow-2xl flex flex-col justify-between">
              <div className="absolute -top-3 left-6 px-3 py-0.5 bg-[#020207] border border-purple-500/50 text-purple-400 font-black text-[9px] tracking-[0.2em] uppercase rounded shadow-md">
                KATEGORI URUS (ADMINISTRASI)
              </div>
              <div className="flex flex-col items-center pt-4 h-full justify-between">
                {urusItems.map((item) => (
                  <motion.div
                    key={item.id}
                    variants={{
                      hidden: { opacity: 0, y: 25 },
                      visible: { opacity: 1, y: 0 }
                    }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    onClick={() => {
                      if (item.isGroup) {
                        playBeep('click');
                        setSelectedJuriGroup(true);
                      } else {
                        handleRoleSelection(item.id as any);
                      }
                    }}
                    className="flex flex-col items-center group cursor-pointer h-full justify-between"
                  >
                    <div className="flex flex-col items-center">
                      {/* Glowing shield launcher badge */}
                      <div className={`w-32 h-32 sm:w-34 sm:h-34 rounded-full overflow-hidden border-2 bg-slate-950 relative shadow-xl transition-all duration-300 flex items-center justify-center ${item.glowColor}`}>
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-[96%] h-[96%] object-contain rounded-full group-hover:scale-110 transition-transform duration-500 ease-out"
                          referrerPolicy="no-referrer"
                        />
                        {/* Glowing light center glow */}
                        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5 pointer-events-none" />
                      </div>

                      {/* Role text headings */}
                      <h3 className={`text-base sm:text-lg font-black font-sport tracking-widest uppercase mt-4 text-center transition-colors duration-300 text-slate-150 ${item.textColor}`}>
                        {item.title}
                      </h3>
                    </div>
                    
                    {/* Detailed descriptions */}
                    <p className="text-[9px] mt-2 text-center leading-relaxed text-slate-500 uppercase tracking-wider font-semibold max-w-[14rem] sm:max-w-[16rem]">
                      {item.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border rounded-2xl p-8 text-center shadow-2xl bg-slate-950/80 border-slate-900 max-w-2xl mx-auto backdrop-blur-md relative overflow-hidden"
          >
            {/* Corner visual tech lines */}
            <div className="absolute top-0 left-0 w-8 h-1 border-t border-l border-cyan-500" />
            <div className="absolute top-0 right-0 w-8 h-1 border-t border-r border-cyan-500" />
            <div className="absolute bottom-0 left-0 w-8 h-1 border-b border-l border-cyan-500" />
            <div className="absolute bottom-0 right-0 w-8 h-1 border-b border-r border-cyan-500" />

            <h3 className="text-xl font-black font-sport tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase mb-2">
              PILIH NOMOR JURI PENILAI
            </h3>
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-8 tracking-wider max-w-sm mx-auto leading-relaxed">
              Silakan pilih perangkat Juri yang sesuai. Setiap nilai dari juri akan dicocokkan otomatis untuk melahirkan nilai sah.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-lg mx-auto mb-6">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => handleRoleSelection(`juri${num}` as any)}
                  className="py-4 px-6 cursor-pointer border rounded-xl font-black transition-all shadow-lg text-xs font-sport uppercase tracking-widest bg-gradient-to-b from-[#0b1022] to-slate-950 hover:from-cyan-950/30 hover:to-slate-950 border-cyan-900/60 text-cyan-400 hover:text-white hover:border-cyan-400 active:scale-95"
                >
                  JURI {num}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                playBeep('click');
                setSelectedJuriGroup(false);
              }}
              className="text-[10px] font-bold font-mono tracking-widest uppercase text-slate-500 hover:text-slate-300 underline cursor-pointer transition-colors"
            >
              Kembali ke Pemilihan Peran
            </button>
          </motion.div>
        )}
      </div>

      {/* 4. FOOTER CONTROLS & WATERMARK */}
      <div className="w-full z-10 flex flex-row justify-between items-end mt-4">
        
        {/* Bottom Left: Circular floating purple Refresh button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleReload}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-lg shadow-[#7c3aed]/20 hover:shadow-[#7c3aed]/40 hover:scale-105 active:scale-95 cursor-pointer transition-all border border-[#9061f9]/40 group"
            title="Muat Ulang Dashboard"
          >
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700 ease-out" />
          </button>
          
          {/* Subtle text for branding */}
          <span className="hidden sm:inline-block text-[8px] font-mono tracking-widest text-slate-650 font-bold">
            IPSI DIGITAL PANEL v3.2
          </span>
        </div>

        {/* Floating Controls Row (Theme + Full Screen) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="px-3 py-1.5 border border-slate-900 bg-slate-950/60 rounded-lg transition-all flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-wider cursor-pointer uppercase hover:border-slate-800 text-slate-400 hover:text-slate-200 active:scale-95"
            title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3 h-3 text-amber-400" />
                <span>Terang</span>
              </>
            ) : (
              <>
                <Moon className="w-3 h-3 text-blue-500" />
                <span>Gelap</span>
              </>
            )}
          </button>

          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 border border-slate-900 bg-slate-950/60 rounded-lg transition-all flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-wider cursor-pointer uppercase hover:border-slate-800 text-slate-400 hover:text-slate-200 active:scale-95"
            title="Layar Penuh"
          >
            {isFullscreen ? (
              <>
                <Minimize className="w-3 h-3 text-cyan-400 animate-pulse" />
                <span>Normal</span>
              </>
            ) : (
              <>
                <Maximize className="w-3 h-3 text-cyan-405" />
                <span>Layar Penuh</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* REKAPITULASI HASIL & PEMENANG PARTAI */}
      <div className="max-w-6xl w-full z-10 my-8 px-2 sm:px-4">
        <RekapitulasiSkor
          histories={histories}
          state={state}
          title="REKAPITULASI HASIL TANDING"
          subtitle="DAFTAR PEMENANG & SKOR AKHIR PARTAI FISIK TANDING SELESAI"
        />
      </div>

    </div>
  );
}
