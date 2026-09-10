/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Users, FileText, Monitor as MonitorIcon, ChevronRight, ChevronLeft, ChevronDown, Maximize, Minimize, Sun, Moon, RefreshCw, Radio, ArrowRight, ArrowDown, Sparkles, LayoutList, Columns, FileDown, FileSpreadsheet } from 'lucide-react';
import { playBeep } from '../utils/sound';
import { generateSchedulePdf, ScheduleMetadata, ScheduleMatchRow } from '../utils/generateSchedulePdf';

import dewanImg from '../assets/images/dewan_panel_1782782282395.jpg';
import sekretarisImg from '../assets/images/sekretaris_panel_1782782300726.jpg';
import juriImg from '../assets/images/juri_panel_1782782315779.jpg';
import monitorImg from '../assets/images/monitor_panel_1782782330918.jpg';
import RekapitulasiSkor from './RekapitulasiSkor';
import GoogleSheetsIntegrationModal from './GoogleSheetsIntegrationModal';
import { MatchHistory, MatchState, GelanggangInfo, ArenaSummary, TGRState } from '../types';
import ThemePaletteSelector from './ThemePaletteSelector';

interface LandingPageProps {
  onSelectRole: (role: 'dewan' | 'juri1' | 'juri2' | 'juri3' | 'sekretaris' | 'monitor' | 'monitor_urutan') => void;
  onBackToPortal: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  histories?: MatchHistory[];
  state?: MatchState | null;
  currentArenaId?: string;
  onSelectArena?: (arenaId: string) => void;
  arenasList?: GelanggangInfo[];
  allArenasSummary?: ArenaSummary[];
  allArenasMap?: Record<string, { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }>;
}

export default function LandingPage({ 
  onSelectRole, 
  onBackToPortal, 
  theme, 
  onToggleTheme, 
  histories = [], 
  state,
  currentArenaId = 'arena_1',
  onSelectArena,
  arenasList = [],
  allArenasSummary = [],
  allArenasMap = {}
}: LandingPageProps) {
  const [selectedJuriGroup, setSelectedJuriGroup] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scrollMode, setScrollMode] = useState<'vertical' | 'horizontal'>('vertical');
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 15);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 15);
    }
  };

  React.useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const handleScrollLeft = () => {
    playBeep('click');
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -360, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    playBeep('click');
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 360, behavior: 'smooth' });
    }
  };

  const handleScrollToCard = (index: number) => {
    playBeep('click');
    if (scrollContainerRef.current) {
      const cards = scrollContainerRef.current.children;
      if (cards[index]) {
        (cards[index] as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  };

  const handleScrollToRole = (roleId: string) => {
    playBeep('click');
    if (scrollMode === 'vertical') {
      const el = document.getElementById(`role-card-${roleId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      const idx = menuItems.findIndex(m => m.id === roleId);
      if (idx !== -1) handleScrollToCard(idx);
    }
  };

  const activeArena = arenasList.find(a => a.id === currentArenaId) || {
    id: 'arena_1',
    nama: 'Gelanggang 1',
    kode: '1',
    keterangan: 'Matras 1'
  };

  const handleDownloadSchedule = () => {
    playBeep('valid');

    const digits = (activeArena.kode || activeArena.nama).match(/\d+/);
    const num = digits ? parseInt(digits[0], 10) : 1;
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][num - 1] || 'I';
    const arenaFormatted = `GELANGGANG ${roman}`;

    const metadata: ScheduleMetadata = {
      headerTitle: "JADWAL PERTANDINGAN KEJUARAAN PENCAK SILAT",
      headerSubtitle: state?.namaEvent || "TRI GUNA SAKTI CUP XIV",
      headerLocationDate: "16 - 17 DESEMBER 2023",
      lokasiTanggal: "16 - 17 DESEMBER 2023",
      gelanggang: arenaFormatted,
      hariTanggal: "18 Des 2023",
      sesiNama: "1",
      sesiWaktu: "08:00 - SELESAI",
      pukul: "08:00 - SELESAI",
      fase: "PENYISIHAN",
      tingkat: "PEMASALAN & PRESTASI",
      showSignatures: false
    };

    const rows: ScheduleMatchRow[] = [];

    if (state?.baganCategories && state.baganCategories.length > 0) {
      state.baganCategories.forEach(cat => {
        cat.matches.forEach(m => {
          const partaiNum = parseInt(m.partai?.replace(/\D/g, '') || String(m.id)) || rows.length + 1;
          const kLetter = (cat.kelas || cat.name).replace(/kelas\s*/i, '').trim().split(' ')[0].toUpperCase();
          const gTag = (cat.gender || '').toLowerCase().includes('putri') || (cat.gender || '').toUpperCase() === 'PI' ? 'PI' : 'PA';
          const kelasLabel = `${kLetter} ${gTag}`;

          let roundLabel = (m.round || '').toUpperCase();
          if (roundLabel.includes('SEMI')) roundLabel = 'SEMI FINAL';
          else if (roundLabel.includes('PEREMPAT') || roundLabel.includes('QUARTER')) roundLabel = 'PEREMPAT FINAL';
          else if (roundLabel.includes('FINAL')) roundLabel = 'FINAL';
          else if (!roundLabel || roundLabel.includes('ROUND 1')) roundLabel = 'PENYISIHAN';

          let winner: 'merah' | 'biru' | null = null;
          if (m.winner === 'merah' || m.winner === 'biru') winner = m.winner;

          const isByeRed = m.atletBiru?.nama?.toUpperCase() === 'BYE' || m.atletBiru?.kontingen?.toUpperCase() === 'AUTOMATIC';
          const isByeBlue = m.atletMerah?.nama?.toUpperCase() === 'BYE' || m.atletMerah?.kontingen?.toUpperCase() === 'AUTOMATIC';
          const remark = isByeRed ? 'MENANG MERAH' : isByeBlue ? 'MENANG BIRU' : m.winner ? `MENANG ${m.winner.toUpperCase()}` : '';

          const merahNama = m.atletMerah?.nama && m.atletMerah.nama.trim() !== '' && !m.atletMerah.nama.includes('...')
            ? m.atletMerah.nama
            : `Pemenang Partai ${(rows.length * 2 - 1).toString().padStart(2, '0')}`;
          const merahKont = (!m.atletMerah?.nama || m.atletMerah.nama.trim() === '' || m.atletMerah.nama.includes('...')) ? '-' : (m.atletMerah?.kontingen || '-');

          const biruNama = m.atletBiru?.nama && m.atletBiru.nama.trim() !== '' && !m.atletBiru.nama.includes('...')
            ? m.atletBiru.nama
            : `Pemenang Partai ${(rows.length * 2).toString().padStart(2, '0')}`;
          const biruKont = (!m.atletBiru?.nama || m.atletBiru.nama.trim() === '' || m.atletBiru.nama.includes('...')) ? '-' : (m.atletBiru?.kontingen || '-');

          rows.push({
            no: rows.length + 1,
            partai: (m.partai?.replace(/\D/g, '') || `${partaiNum}`).padStart(2, '0'),
            kelas: kelasLabel,
            roundLabel,
            merahNama,
            merahKontingen: merahKont,
            biruNama,
            biruKontingen: biruKont,
            winner,
            remark
          });
        });
      });
    }

    generateSchedulePdf(metadata, rows);
  };

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
    <div className={`min-h-[100dvh] w-full flex flex-col justify-between items-center transition-colors duration-500 px-4 md:px-8 py-8 relative overflow-y-auto bg-[#020207] text-slate-100 ${
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

        {/* Arena Selector Dropdown */}
        {arenasList && arenasList.length > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900/90 border border-amber-500/50 rounded-xl shadow-md">
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">🏟️ GELANGGANG:</span>
            <select
              value={currentArenaId}
              onChange={(e) => onSelectArena && onSelectArena(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-amber-300 text-xs font-black uppercase rounded-lg px-2 py-0.5 cursor-pointer outline-none font-mono"
            >
              {arenasList.map(a => (
                <option key={a.id} value={a.id}>
                  {a.nama} ({a.keterangan || a.id})
                </option>
              ))}
            </select>
          </div>
        )}

        <ThemePaletteSelector compact={false} />

        <button
          onClick={handleDownloadSchedule}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 cursor-pointer bg-gradient-to-r from-emerald-950/90 to-teal-950/90 hover:from-emerald-900 hover:to-teal-900 border border-emerald-500/50 text-emerald-300 text-[9.5px] uppercase tracking-wider font-mono font-black rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
          title="Unduh Jadwal Pertandingan Resmi PDF (A4)"
        >
          <FileDown className="w-3.5 h-3.5 text-emerald-400" />
          <span>📄 UNDUH JADWAL (PDF)</span>
        </button>

        <button
          onClick={() => {
            playBeep('click');
            setShowGoogleSheetsModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 cursor-pointer bg-gradient-to-r from-emerald-950/90 to-teal-950/90 hover:from-emerald-900 hover:to-teal-900 border border-emerald-500/50 text-emerald-300 text-[9.5px] uppercase tracking-wider font-mono font-black rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
          title="Hubungkan Data Peserta & Hasil Pertandingan ke Google Sheets"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>📊 GOOGLE SHEETS</span>
        </button>

        <button
          onClick={() => handleRoleSelection('monitor_urutan')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 cursor-pointer bg-gradient-to-r from-amber-950/90 to-orange-950/90 hover:from-amber-900 hover:to-orange-900 border border-amber-500/50 text-amber-300 text-[9.5px] uppercase tracking-wider font-mono font-black rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
        >
          <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span>📺 MONITOR NOMOR PARTAI (SEMUA GELANGGANG)</span>
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

      {/* 2. CHOOSE ROLE PANELS - VERTICAL SCROLL-DOWN & HORIZONTAL CARDS */}
      <div id="role-selection-section" className="w-full max-w-7xl z-10 my-4 flex-1 flex flex-col items-center justify-center">
        {!selectedJuriGroup ? (
          <div className="w-full flex flex-col items-center">
            {/* Quick Role Navigation & View Mode Switcher */}
            <div className="w-full flex flex-wrap items-center justify-between gap-3 px-2 sm:px-6 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>PILIH PERAN TANDING ({scrollMode === 'vertical' ? 'GULIR KE BAWAH' : 'GULIR KE SAMPING'})</span>
                </span>
                <span className="text-[9px] font-mono text-slate-500 uppercase hidden sm:inline">
                  • {menuItems.length} PERAN TERSEDIA
                </span>
              </div>

              {/* Controls: Mode Switcher & Quick Jumps */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Mode Switcher */}
                <div className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800 shadow-inner">
                  <button
                    onClick={() => {
                      playBeep('click');
                      setScrollMode('vertical');
                    }}
                    className={`px-3 py-1 rounded-lg text-[9.5px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                      scrollMode === 'vertical'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Gulir ke Bawah (Vertikal)"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    <span>Ke Bawah</span>
                  </button>

                  <button
                    onClick={() => {
                      playBeep('click');
                      setScrollMode('horizontal');
                      setTimeout(() => checkScroll(), 100);
                    }}
                    className={`px-3 py-1 rounded-lg text-[9.5px] font-mono font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                      scrollMode === 'horizontal'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20 font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Gulir ke Samping (Horizontal)"
                  >
                    <Columns className="w-3.5 h-3.5" />
                    <span>Ke Samping</span>
                  </button>
                </div>

                {/* Role Jump Pills */}
                <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                  {menuItems.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleScrollToRole(m.id)}
                      className="px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase transition-all text-slate-400 hover:text-cyan-300 hover:bg-slate-800 cursor-pointer"
                    >
                      {m.title}
                    </button>
                  ))}
                </div>

                {/* Left/Right buttons only in horizontal mode */}
                {scrollMode === 'horizontal' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleScrollLeft}
                      disabled={!canScrollLeft}
                      aria-label="Gulir ke Kiri"
                      className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                        canScrollLeft
                          ? 'bg-slate-900 border-cyan-500/50 text-cyan-400 hover:bg-cyan-950/60 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                          : 'bg-slate-950 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                      }`}
                      title="Gulir ke kiri"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={handleScrollRight}
                      disabled={!canScrollRight}
                      aria-label="Gulir ke Kanan"
                      className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                        canScrollRight
                          ? 'bg-slate-900 border-cyan-500/50 text-cyan-400 hover:bg-cyan-950/60 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                          : 'bg-slate-950 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                      }`}
                      title="Gulir ke kanan"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 2A. VERTICAL SCROLL-DOWN MODE (PRIMARY DEFAULT) */}
            {scrollMode === 'vertical' ? (
              <div className="w-full flex flex-col gap-4 sm:gap-5 max-w-3xl mx-auto px-2 sm:px-4">
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    id={`role-card-${item.id}`}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.07, duration: 0.35 }}
                    whileHover={{ scale: 1.015, y: -2 }}
                    onClick={() => {
                      if (item.isGroup) {
                        playBeep('click');
                        setSelectedJuriGroup(true);
                      } else {
                        handleRoleSelection(item.id as any);
                      }
                    }}
                    className={`rounded-[28px] border p-5 sm:p-7 bg-[#070716]/95 hover:bg-[#0c0c24] transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-7 cursor-pointer shadow-2xl relative group ${
                      item.id === 'sekretaris' 
                        ? 'border-purple-500/40 hover:border-purple-400/90 shadow-[0_0_35px_rgba(168,85,247,0.18)] hover:shadow-[0_0_45px_rgba(168,85,247,0.35)]' 
                        : item.id === 'dewan'
                        ? 'border-amber-500/30 hover:border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.15)] hover:shadow-[0_0_45px_rgba(245,158,11,0.3)]'
                        : item.id === 'juri'
                        ? 'border-blue-500/30 hover:border-blue-400/80 shadow-[0_0_35px_rgba(59,130,246,0.15)] hover:shadow-[0_0_45px_rgba(59,130,246,0.3)]'
                        : 'border-red-500/30 hover:border-red-400/80 shadow-[0_0_35px_rgba(239,68,68,0.15)] hover:shadow-[0_0_45px_rgba(239,68,68,0.3)]'
                    }`}
                  >
                    {/* Glowing circular avatar badge */}
                    <div className={`w-28 h-28 sm:w-36 sm:h-36 shrink-0 rounded-full overflow-hidden border-2 bg-slate-950 relative shadow-2xl transition-all duration-300 flex items-center justify-center p-1.5 ${item.glowColor}`}>
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-contain rounded-full group-hover:scale-105 transition-transform duration-500 ease-out"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/10 pointer-events-none rounded-full" />
                    </div>

                    {/* Middle: Content */}
                    <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black tracking-wider uppercase bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-white transition-colors">
                          PERAN 0{index + 1}
                        </span>
                        <span className={`text-[9.5px] font-mono tracking-widest font-extrabold uppercase ${item.textColor}`}>
                          {item.titleSub}
                        </span>
                      </div>

                      <h3 className={`text-2xl sm:text-3xl font-black font-sport tracking-wider uppercase mb-1.5 text-white ${item.textColor} transition-colors`}>
                        {item.title}
                      </h3>

                      <p className="text-[11px] sm:text-xs leading-relaxed text-slate-400 uppercase tracking-wider font-semibold max-w-lg">
                        {item.desc}
                      </p>
                    </div>

                    {/* Right: CTA Button */}
                    <div className="w-full sm:w-auto shrink-0 flex items-center justify-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-900">
                      <div className={`w-full sm:w-auto py-3 px-5 rounded-2xl text-xs font-black font-sport tracking-wider uppercase flex items-center justify-center gap-2 transition-all ${
                        item.id === 'sekretaris'
                          ? 'bg-purple-950/60 group-hover:bg-purple-600 text-purple-200 group-hover:text-white border border-purple-800/40 shadow-lg shadow-purple-900/20'
                          : item.id === 'dewan'
                          ? 'bg-amber-950/60 group-hover:bg-amber-600 text-amber-200 group-hover:text-slate-950 border border-amber-800/40 shadow-lg shadow-amber-900/20'
                          : item.id === 'juri'
                          ? 'bg-blue-950/60 group-hover:bg-blue-600 text-blue-200 group-hover:text-white border border-blue-800/40 shadow-lg shadow-blue-900/20'
                          : 'bg-red-950/60 group-hover:bg-red-600 text-red-200 group-hover:text-white border border-red-800/40 shadow-lg shadow-red-900/20'
                      }`}>
                        <span>{item.isGroup ? 'PILIH NOMOR JURI' : `MASUK ${item.title}`}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Vertical scroll guidance cue */}
                <div className="flex flex-col items-center justify-center gap-1.5 py-4 text-center">
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase flex items-center gap-1">
                    <span>GULIR KE BAWAH UNTUK REKAPITULASI HASIL & KONTROL</span>
                    <ArrowDown className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
                  </span>
                </div>
              </div>
            ) : (
              /* 2B. HORIZONTAL SCROLL TRACK CONTAINER */
              <div className="w-full relative group">
                {/* Fade Overlays on left & right */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#020207] to-transparent z-10 pointer-events-none hidden sm:block opacity-70" />
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#020207] to-transparent z-10 pointer-events-none hidden sm:block opacity-70" />

                <div
                  ref={scrollContainerRef}
                  onScroll={checkScroll}
                  className="w-full flex flex-row items-stretch gap-5 sm:gap-6 overflow-x-auto py-4 px-4 sm:px-8 scroll-smooth snap-x snap-mandatory select-none"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {menuItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.08, duration: 0.4 }}
                      whileHover={{ scale: 1.025, y: -4 }}
                      onClick={() => {
                        if (item.isGroup) {
                          playBeep('click');
                          setSelectedJuriGroup(true);
                        } else {
                          handleRoleSelection(item.id as any);
                        }
                      }}
                      className={`w-[290px] sm:w-[320px] md:w-[340px] shrink-0 snap-center rounded-[32px] border p-6 sm:p-7 bg-[#070716]/95 hover:bg-[#0c0c24] transition-all duration-300 flex flex-col justify-between items-center text-center cursor-pointer shadow-2xl relative group ${
                        item.id === 'sekretaris' 
                          ? 'border-purple-500/40 hover:border-purple-400/90 shadow-[0_0_35px_rgba(168,85,247,0.18)] hover:shadow-[0_0_45px_rgba(168,85,247,0.35)]' 
                          : item.id === 'dewan'
                          ? 'border-amber-500/30 hover:border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.15)] hover:shadow-[0_0_45px_rgba(245,158,11,0.3)]'
                          : item.id === 'juri'
                          ? 'border-blue-500/30 hover:border-blue-400/80 shadow-[0_0_35px_rgba(59,130,246,0.15)] hover:shadow-[0_0_45px_rgba(59,130,246,0.3)]'
                          : 'border-red-500/30 hover:border-red-400/80 shadow-[0_0_35px_rgba(239,68,68,0.15)] hover:shadow-[0_0_45px_rgba(239,68,68,0.3)]'
                      }`}
                    >
                      {/* Top Tag & Corner tech styling */}
                      <div className="w-full flex items-center justify-between mb-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black tracking-wider uppercase bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-white transition-colors">
                          PERAN 0{index + 1}
                        </span>
                        <span className={`text-[9px] font-mono tracking-widest font-extrabold uppercase ${item.textColor}`}>
                          {item.titleSub}
                        </span>
                      </div>

                      <div className="flex flex-col items-center w-full my-auto">
                        {/* Glowing circular avatar badge */}
                        <div className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-2 bg-slate-950 relative shadow-2xl transition-all duration-300 flex items-center justify-center p-1.5 mb-4 ${item.glowColor}`}>
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-contain rounded-full group-hover:scale-105 transition-transform duration-500 ease-out"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/10 pointer-events-none rounded-full" />
                        </div>

                        {/* Role Title */}
                        <h3 className={`text-2xl font-black font-sport tracking-wider uppercase mt-1 mb-2 text-center transition-colors duration-300 text-white ${item.textColor}`}>
                          {item.title}
                        </h3>

                        {/* Description */}
                        <p className="text-[11px] leading-relaxed text-slate-400 uppercase tracking-wider font-semibold max-w-xs mx-auto line-clamp-3">
                          {item.desc}
                        </p>
                      </div>

                      {/* Bottom Action CTA */}
                      <div className="w-full pt-4 mt-4 border-t border-slate-900/80 flex items-center justify-center">
                        <div className={`w-full py-2.5 px-4 rounded-xl text-xs font-black font-sport tracking-wider uppercase flex items-center justify-center gap-2 transition-all ${
                          item.id === 'sekretaris'
                            ? 'bg-purple-950/60 group-hover:bg-purple-600 text-purple-200 group-hover:text-white border border-purple-800/40'
                            : item.id === 'dewan'
                            ? 'bg-amber-950/60 group-hover:bg-amber-600 text-amber-200 group-hover:text-slate-950 border border-amber-800/40'
                            : item.id === 'juri'
                            ? 'bg-blue-950/60 group-hover:bg-blue-600 text-blue-200 group-hover:text-white border border-blue-800/40'
                            : 'bg-red-950/60 group-hover:bg-red-600 text-red-200 group-hover:text-white border border-red-800/40'
                        }`}>
                          <span>{item.isGroup ? 'PILIH NOMOR JURI' : `BUKA PANEL ${item.title}`}</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Mobile / Compact scroll indicator text */}
                <div className="flex items-center justify-center gap-2 mt-2 text-[10px] font-mono text-slate-500 uppercase">
                  <span>← Geser ke samping untuk memilih peran →</span>
                </div>
              </div>
            )}
          </div>
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

      {/* Google Sheets Real-Time Synchronization Modal */}
      <GoogleSheetsIntegrationModal
        isOpen={showGoogleSheetsModal}
        onClose={() => setShowGoogleSheetsModal(false)}
        allArenasMap={allArenasMap}
      />

    </div>
  );
}
