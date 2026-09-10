import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Users, FileText, Monitor as MonitorIcon, ChevronRight, ChevronLeft, HelpCircle, ArrowLeft, ArrowRight, Trophy, Star, Radio, FileSpreadsheet, Sparkles, FileDown } from 'lucide-react';
import { playBeep } from '../utils/sound';
import { generateSchedulePdf, ScheduleMetadata, ScheduleMatchRow } from '../utils/generateSchedulePdf';

import dewanImg from '../assets/images/dewan_panel_1782782282395.jpg';
import sekretarisImg from '../assets/images/sekretaris_panel_1782782300726.jpg';
import juriImg from '../assets/images/juri_panel_1782782315779.jpg';
import monitorImg from '../assets/images/monitor_panel_1782782330918.jpg';
import RekapitulasiSkor from './RekapitulasiSkor';
import GoogleSheetsIntegrationModal from './GoogleSheetsIntegrationModal';
import { MatchHistory, TGRState, GelanggangInfo, ArenaSummary, MatchState } from '../types';

interface TGRLandingPageProps {
  onSelectRole: (role: string) => void;
  onBackToPortal: () => void;
  theme: 'dark' | 'light';
  tgrState?: TGRState | null;
  histories?: MatchHistory[];
  currentArenaId?: string;
  onSelectArena?: (arenaId: string) => void;
  arenasList?: GelanggangInfo[];
  allArenasSummary?: ArenaSummary[];
  allArenasMap?: Record<string, { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }>;
}

export default function TGRLandingPage({ 
  onSelectRole, 
  onBackToPortal, 
  theme, 
  tgrState, 
  histories = [],
  currentArenaId = 'arena_1',
  onSelectArena,
  arenasList = [],
  allArenasSummary = [],
  allArenasMap = {}
}: TGRLandingPageProps) {
  const [selectedJuriGroup, setSelectedJuriGroup] = useState(false);
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
      headerSubtitle: "TRI GUNA SAKTI CUP XIV",
      headerLocationDate: "16 - 17 DESEMBER 2023",
      lokasiTanggal: "16 - 17 DESEMBER 2023",
      gelanggang: arenaFormatted,
      hariTanggal: "18 Des 2023",
      sesiNama: "1",
      sesiWaktu: "08:00 - SELESAI",
      pukul: "08:00 - SELESAI",
      fase: "SENI / ARTISTIC",
      tingkat: "PEMASALAN & PRESTASI",
      showSignatures: false
    };

    const rows: ScheduleMatchRow[] = [];

    if (tgrState?.pesertaList && tgrState.pesertaList.length > 0) {
      tgrState.pesertaList.forEach((p, idx) => {
        const katUpper = (p.kategori || 'TUNGGAL').toUpperCase();
        rows.push({
          no: rows.length + 1,
          partai: `${idx + 1}`.padStart(2, '0'),
          kelas: katUpper,
          roundLabel: katUpper,
          merahNama: p.nama,
          merahKontingen: p.kontingen,
          biruNama: `Kategori: ${p.kategori}`,
          biruKontingen: `No Urut ${p.noUrut || idx + 1}`,
          remark: p.finalScore !== undefined ? `Skor: ${p.finalScore.toFixed(3)} (#${idx + 1})` : ''
        });
      });
    }

    generateSchedulePdf(metadata, rows);
  };

  const menuItems = [
    {
      id: 'dewan',
      title: 'DEWAN TGR',
      titleSub: 'DEWAN PERTANDINGAN TGR',
      desc: 'KELOLA DISKUALIFIKASI, TEGURAN, PENGURANGAN NILAI SERTA PENENTUAN TIE-BREAK DEWAN',
      icon: Shield,
      image: dewanImg,
      glowColor: 'group-hover:shadow-[0_0_35px_rgba(245,158,11,0.55)] border-amber-500/30 group-hover:border-amber-400/80',
      textColor: 'group-hover:text-amber-400',
    },
    {
      id: 'sekretaris',
      title: 'SEKRETARIS TGR',
      titleSub: 'SEKRETARIS PERTANDINGAN TGR',
      desc: 'ATUR DATA PESERTA SENI, JUMLAH JURI AKTIF, DURASI TAMPIL, DAN EKSPOR HASIL SKORING',
      icon: FileText,
      image: sekretarisImg,
      glowColor: 'group-hover:shadow-[0_0_35px_rgba(168,85,247,0.55)] border-purple-500/30 group-hover:border-purple-400/80',
      textColor: 'group-hover:text-purple-400',
    },
    {
      id: 'juri',
      title: 'JURI TGR',
      titleSub: 'JURI PENILAI TGR',
      desc: 'BERIKAN NILAI KEBENARAN JURUS DAN NILAI KEMANTAPAN SECARA INDEPENDEN DAN AKURAT',
      icon: Users,
      image: juriImg,
      glowColor: 'group-hover:shadow-[0_0_35px_rgba(59,130,246,0.55)] border-blue-500/30 group-hover:border-blue-400/80',
      textColor: 'group-hover:text-blue-400',
      isGroup: true
    },
    {
      id: 'monitor',
      title: 'MONITOR TGR',
      titleSub: 'DISPLAY SCOREBOARD TGR',
      desc: 'MENAMPILKAN NILAI SECARA TRANSPARAN, TIMER TAMPIL, SERTA KLASEMEN KEDUDUKAN REAL-TIME',
      icon: MonitorIcon,
      image: monitorImg,
      glowColor: 'group-hover:shadow-[0_0_35px_rgba(16,185,129,0.55)] border-emerald-500/30 group-hover:border-emerald-400/80',
      textColor: 'group-hover:text-emerald-400',
    }
  ];

  const handleRoleSelection = (role: string) => {
    playBeep('click');
    onSelectRole(role);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center transition-colors duration-500 px-4 md:px-8 py-8 relative overflow-y-auto bg-[#020207] text-slate-100">
      
      {/* Dynamic purple & gold glowing backgrounds */}
      <div className="absolute inset-0 bg-[radial-gradient(#0c061a_1px,transparent_1px)] [background-size:16px_16px] opacity-35 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.15)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[28rem] h-[28rem] rounded-full blur-[140px] pointer-events-none bg-purple-950/20" />
      <div className="absolute top-1/4 right-1/4 w-[28rem] h-[28rem] rounded-full blur-[140px] pointer-events-none bg-amber-950/15" />

      {/* Header Title with Back Action */}
      <div className="max-w-6xl w-full z-10 flex flex-col items-center mt-2 mb-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          <button
            onClick={onBackToPortal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 cursor-pointer bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[9.5px] uppercase tracking-wider font-mono font-bold rounded-xl transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Portal Utama</span>
          </button>

          {/* Arena Selector Dropdown */}
          {arenasList && arenasList.length > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900/90 border border-purple-500/50 rounded-xl shadow-md">
              <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">🏟️ GELANGGANG:</span>
              <select
                value={currentArenaId}
                onChange={(e) => onSelectArena && onSelectArena(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-purple-300 text-xs font-black uppercase rounded-lg px-2 py-0.5 cursor-pointer outline-none font-mono"
              >
                {arenasList.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.nama} ({a.keterangan || a.id})
                  </option>
                ))}
              </select>
            </div>
          )}

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
            title="Hubungkan Data Peserta & Hasil Seni TGR ke Google Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>📊 GOOGLE SHEETS</span>
          </button>

          <button
            onClick={() => handleRoleSelection('registrasi')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 cursor-pointer bg-gradient-to-r from-amber-950/90 to-orange-950/90 hover:from-amber-900 hover:to-orange-900 border border-amber-500/50 text-amber-300 text-[9.5px] uppercase tracking-wider font-mono font-black rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span>📝 REGISTRASI & BAGAN SENI</span>
          </button>

          <button
            onClick={() => handleRoleSelection('monitor_urutan')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 cursor-pointer bg-gradient-to-r from-purple-950/90 to-pink-950/90 hover:from-purple-900 hover:to-pink-900 border border-purple-500/50 text-purple-300 text-[9.5px] uppercase tracking-wider font-mono font-black rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
          >
            <Radio className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
            <span>📺 MONITOR NOMOR PARTAI (SEMUA GELANGGANG)</span>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center"
        >
          <div className="relative inline-flex items-center px-10 py-1 border-t border-b border-purple-500/30 bg-[#060413]/80 rounded">
            <span className="font-mono font-black text-[10px] tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-amber-400 uppercase">
              MODUL SENI / ARTISTIC
            </span>
          </div>
          
          <h1 className="font-sport font-black italic text-4xl sm:text-5xl md:text-6xl mt-3 tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-amber-500 filter drop-shadow-[0_0_20px_rgba(168,85,247,0.3)] select-none uppercase">
            JURUS & SENI TGR
          </h1>
          <p className="mt-4 max-w-2xl text-[9px] md:text-[10px] leading-relaxed text-slate-400 font-bold tracking-wider uppercase px-5 py-2 rounded-lg bg-slate-950/75 border border-slate-900/80 shadow-xl">
            Sistem penjurian digital terintegrasi untuk kategori Tunggal, Ganda, dan Regu sesuai regulasi IPSI termutakhir.
          </p>
        </motion.div>
      </div>

      {/* Choose Role Display - Horizontal Sideways Scrollable Panels */}
      <div className="w-full max-w-7xl z-10 my-4 flex-1 flex flex-col items-center justify-center">
        {!selectedJuriGroup ? (
          <div className="w-full flex flex-col items-center">
            {/* Quick Role Navigation & Sideways Scroll Controls */}
            <div className="w-full flex flex-wrap items-center justify-between gap-3 px-4 sm:px-8 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-purple-400 uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                  <span>PILIH PERAN SENI TGR (GULIR KE SAMPING)</span>
                </span>
                <span className="text-[9px] font-mono text-slate-500 uppercase hidden md:inline">
                  • {menuItems.length} PERAN TERSEDIA
                </span>
              </div>

              {/* Navigation Indicators & Left/Right Arrows */}
              <div className="flex items-center gap-2">
                {/* Role Jump Pills */}
                <div className="hidden lg:flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                  {menuItems.map((m, idx) => (
                    <button
                      key={m.id}
                      onClick={() => handleScrollToCard(idx)}
                      className="px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase transition-all text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                    >
                      {m.title}
                    </button>
                  ))}
                </div>

                {/* Left Arrow Button */}
                <button
                  onClick={handleScrollLeft}
                  disabled={!canScrollLeft}
                  aria-label="Gulir ke Kiri"
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                    canScrollLeft
                      ? 'bg-slate-900 border-purple-500/50 text-purple-400 hover:bg-purple-950/60 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                      : 'bg-slate-950 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                  }`}
                  title="Gulir ke kiri"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Right Arrow Button */}
                <button
                  onClick={handleScrollRight}
                  disabled={!canScrollRight}
                  aria-label="Gulir ke Kanan"
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                    canScrollRight
                      ? 'bg-slate-900 border-purple-500/50 text-purple-400 hover:bg-purple-950/60 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                      : 'bg-slate-950 border-slate-800 text-slate-600 opacity-40 cursor-not-allowed'
                  }`}
                  title="Gulir ke kanan"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Horizontal Scroll Track Container */}
            <div className="w-full relative group">
              {/* Fade Overlays on left & right to indicate scrollability */}
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
                        handleRoleSelection(item.id);
                      }
                    }}
                    className={`w-[290px] sm:w-[320px] md:w-[340px] shrink-0 snap-center rounded-[32px] border p-6 sm:p-7 bg-[#070716]/95 hover:bg-[#0c0c24] transition-all duration-300 flex flex-col justify-between items-center text-center cursor-pointer shadow-2xl relative group ${
                      item.id === 'sekretaris' 
                        ? 'border-purple-500/40 hover:border-purple-400/90 shadow-[0_0_35px_rgba(168,85,247,0.18)] hover:shadow-[0_0_45px_rgba(168,85,247,0.35)]' 
                        : item.id === 'dewan'
                        ? 'border-amber-500/30 hover:border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.15)] hover:shadow-[0_0_45px_rgba(245,158,11,0.3)]'
                        : item.id === 'juri'
                        ? 'border-blue-500/30 hover:border-blue-400/80 shadow-[0_0_35px_rgba(59,130,246,0.15)] hover:shadow-[0_0_45px_rgba(59,130,246,0.3)]'
                        : 'border-emerald-500/30 hover:border-emerald-400/80 shadow-[0_0_35px_rgba(16,185,129,0.15)] hover:shadow-[0_0_45px_rgba(16,185,129,0.3)]'
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
                          : 'bg-emerald-950/60 group-hover:bg-emerald-600 text-emerald-200 group-hover:text-white border border-emerald-800/40'
                      }`}>
                        <span>{item.isGroup ? 'PILIH NOMOR JURI TGR' : `BUKA ${item.title}`}</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Mobile / Compact scroll indicator text */}
            <div className="flex items-center justify-center gap-2 mt-2 text-[10px] font-mono text-slate-500 uppercase">
              <span>← Geser ke samping untuk memilih peran Seni TGR →</span>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="border rounded-2xl p-6 text-center shadow-2xl bg-slate-950/80 border-purple-900/40 max-w-xl w-full mx-auto backdrop-blur-md relative overflow-hidden"
          >
            {/* Corner visual tech lines */}
            <div className="absolute top-0 left-0 w-8 h-1 border-t border-l border-purple-500" />
            <div className="absolute top-0 right-0 w-8 h-1 border-t border-r border-purple-500" />
            <div className="absolute bottom-0 left-0 w-8 h-1 border-b border-l border-purple-500" />
            <div className="absolute bottom-0 right-0 w-8 h-1 border-b border-r border-purple-500" />

            <h3 className="text-lg font-black font-sport tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-amber-500 uppercase mb-1">
              PILIH PERANGKAT JURI TGR
            </h3>
            <p className="text-[9px] uppercase font-bold text-slate-400 mb-6 tracking-wider max-w-sm mx-auto leading-relaxed">
              Pilih identitas Juri Seni yang bertugas di arena saat ini.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-lg mx-auto mb-6">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <button
                  key={num}
                  onClick={() => handleRoleSelection(`juri${num}`)}
                  className="py-2.5 px-1 cursor-pointer border rounded-lg font-black transition-all shadow text-[9px] font-sport uppercase tracking-wider bg-gradient-to-b from-[#0f0922] to-slate-950 hover:from-purple-950/30 hover:to-slate-950 border-purple-900/40 text-purple-400 hover:text-white hover:border-purple-400 active:scale-95"
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
              className="text-[9px] font-bold font-mono tracking-widest uppercase text-slate-500 hover:text-slate-350 underline cursor-pointer transition-colors"
            >
              Kembali ke Peran Seni
            </button>
          </motion.div>
        )}
      </div>

      {/* REKAPITULASI SKOR SENI TGR & PEMENANG */}
      <div className="max-w-6xl w-full z-10 my-8 px-2 sm:px-4">
        <RekapitulasiSkor
          tgrState={tgrState}
          histories={histories}
          title="REKAPITULASI HASIL SENI TGR"
          subtitle="KLASEMEN PEROLEHAN SKOR & PEMENANG KATEGORI TUNGGAL, GANDA, REGU"
        />
      </div>

      {/* Footer Branding */}
      <div className="w-full z-10 flex justify-between items-center text-[8px] font-mono tracking-widest text-slate-700 uppercase mt-4">
        <span>IPSI DIGITAL TGR CONTROLLER v3.2</span>
        <span>MODUL JURUS / SENI DIGITAL SCORING</span>
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
