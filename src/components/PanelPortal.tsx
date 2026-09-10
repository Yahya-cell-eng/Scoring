/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio,
  Download,
  FileDown,
  FileSpreadsheet,
  Shield,
  Award,
  Users,
  FileText,
  ChevronRight,
  Sparkles,
  Layers,
  LayoutGrid,
  BarChart3,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { playBeep } from '../utils/sound';
import tandingImg from '../assets/images/tanding_shield_logo_1783848117532.jpg';
import seniImg from '../assets/images/seni_shield_logo_1783848135838.jpg';
import RekapitulasiSkor from './RekapitulasiSkor';
import GelanggangManagerTab from './GelanggangManagerTab';
import GoogleSheetsIntegrationModal from './GoogleSheetsIntegrationModal';
import { MatchHistory, TGRState, MatchState, GelanggangInfo, ArenaSummary } from '../types';
import ThemePaletteSelector from './ThemePaletteSelector';
import { generateSchedulePdf, ScheduleMetadata, ScheduleMatchRow } from '../utils/generateSchedulePdf';

interface PanelPortalProps {
  onSelectMode: (mode: 'tanding' | 'seni' | 'monitor_urutan', targetRole?: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  histories?: MatchHistory[];
  tgrState?: TGRState | null;
  state?: MatchState | null;
  dispatch?: (type: string, payload?: any) => void;
  currentArenaId?: string;
  onSelectArena?: (arenaId: string) => void;
  arenasList?: GelanggangInfo[];
  allArenasSummary?: ArenaSummary[];
  allArenasMap?: Record<string, { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }>;
}

export default function PanelPortal({
  onSelectMode,
  theme,
  onToggleTheme,
  histories = [],
  tgrState = null,
  state = null,
  dispatch = () => {},
  currentArenaId = 'arena_1',
  onSelectArena = () => {},
  arenasList = [],
  allArenasSummary = [],
  allArenasMap = {}
}: PanelPortalProps) {
  // Main Navigation Tabs on Home Portal: 'portal' | 'gelanggang' | 'rekapitulasi'
  const [activeTab, setActiveTab] = useState<'portal' | 'gelanggang' | 'rekapitulasi'>('portal');
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState<boolean>(false);

  const currentArena = arenasList.find(a => a.id === currentArenaId) || arenasList[0] || {
    id: 'arena_1',
    nama: 'Gelanggang 1',
    kode: '1'
  };

  const handleSelect = (mode: 'tanding' | 'seni' | 'monitor_urutan', targetRole?: string) => {
    playBeep('valid');
    onSelectMode(mode, targetRole);
  };

  const handleLaunchRoleFromArena = (mode: 'tanding' | 'seni' | 'monitor_urutan', role?: string, arenaId?: string) => {
    if (arenaId) {
      onSelectArena(arenaId);
    }
    onSelectMode(mode, role);
  };

  const handleDownloadSchedule = () => {
    playBeep('valid');

    const logoKiri = localStorage.getItem('silat_schedule_logo_kiri') || localStorage.getItem('silat_logo_kiri') || null;
    const logoKanan = localStorage.getItem('silat_schedule_logo_kanan') || localStorage.getItem('silat_logo_kanan') || null;

    const digits = (currentArena.kode || currentArena.nama).match(/\d+/);
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
      logoKiri,
      logoKanan,
      showSignatures: false
    };

    const rows: ScheduleMatchRow[] = [];

    // 1. Extract from state (Tanding categories)
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

    // 2. Extract from tgrState (Seni participants)
    if (tgrState?.pesertaList && tgrState.pesertaList.length > 0 && rows.length === 0) {
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

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center bg-gradient-to-b from-[#071330] via-[#03081a] to-[#010207] text-slate-100 p-4 md:p-8 relative overflow-hidden font-sans select-none">
      
      {/* Decorative Martial Arts Silhouettes and Radial Energy Backdrops */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(30,58,138,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(30,58,138,0.15)_1px,transparent_1px)] bg-[size:36px_36px] opacity-35" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2)_0%,transparent_65%)]" />
        <div className="absolute bottom-0 right-0 w-[45rem] h-[45rem] rounded-full blur-[200px] bg-blue-950/25" />
        <div className="absolute top-1/3 left-0 w-[35rem] h-[35rem] rounded-full blur-[170px] bg-indigo-950/20" />
      </div>

      {/* 1. TOP BAR QUICK HUBS & ARENA BADGES */}
      <div className="w-full max-w-7xl z-10 flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-950/50 text-[9px] font-mono tracking-[0.2em] font-black uppercase text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.25)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span>SISTEM SKORING RESMI IPSI</span>
          </motion.div>

          {/* Active Arena Switcher Quick Pill */}
          <div className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/40 bg-[#060e2a] text-xs font-mono font-bold text-cyan-300 shadow-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-[10px] text-slate-400 uppercase hidden sm:inline">ARENA AKTIF:</span>
            <select
              value={currentArenaId}
              onChange={(e) => {
                playBeep('click');
                onSelectArena(e.target.value);
              }}
              aria-label="Pilih Gelanggang Aktif"
              className="bg-transparent text-white font-extrabold text-xs cursor-pointer focus:outline-none uppercase pr-2"
            >
              {arenasList.map(a => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-white">
                  {a.nama.toUpperCase()} ({a.kode})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ThemePaletteSelector compact={false} />

          {/* Dedicated Unduh Jadwal Pertandingan Button */}
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadSchedule}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/50 bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-cyan-950/80 hover:from-emerald-900/90 hover:to-cyan-900/90 text-[10px] font-mono tracking-wider font-extrabold uppercase text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
            title="Unduh Jadwal Pertandingan Resmi Format PDF (A4)"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">UNDUH JADWAL (PDF)</span>
          </motion.button>

          {/* Dedicated Monitor Urutan Partai Launch Button */}
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect('monitor_urutan')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/50 bg-gradient-to-r from-amber-950/70 to-orange-950/70 hover:from-amber-900/80 hover:to-orange-900/80 text-[10px] font-mono tracking-wider font-extrabold uppercase text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span>MONITOR URUTAN</span>
          </motion.button>

          {/* Dedicated Quick Access to Manajemen Gelanggang */}
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playBeep('click');
              setActiveTab('gelanggang');
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/50 bg-gradient-to-r from-blue-950/80 to-indigo-950/80 hover:from-blue-900/90 hover:to-indigo-900/90 text-[10px] font-mono tracking-wider font-extrabold uppercase text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all cursor-pointer"
            title="Kelola & Distribusikan Data Peserta ke Gelanggang"
          >
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">MANAJEMEN GELANGGANG</span>
          </motion.button>

          {/* Dedicated Google Sheets Sync Button */}
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              playBeep('click');
              setShowGoogleSheetsModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/50 bg-gradient-to-r from-emerald-950/80 to-teal-950/80 hover:from-emerald-900/90 hover:to-teal-900/90 text-[10px] font-mono tracking-wider font-extrabold uppercase text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
            title="Sinkronkan Peserta & Hasil Pertandingan ke Google Sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>GOOGLE SHEETS</span>
          </motion.button>
        </div>
      </div>

      {/* 2. CENTER TITLES */}
      <div className="max-w-4xl w-full text-center z-10 flex flex-col items-center my-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="space-y-2"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-[0.1em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-blue-400 filter drop-shadow-[0_0_30px_rgba(59,130,246,0.3)] uppercase select-none">
            DIGITAL SKORING PENCAK SILAT
          </h1>
          <p className="text-[10px] md:text-xs tracking-[0.15em] font-bold text-slate-300 uppercase max-w-2xl mx-auto leading-relaxed">
            APLIKASI DIGITAL SKORING PENCAK SILAT BERBASIS REAL-TIME SINKRONISASI OFFLINE / ONLINE MULTI DEVICE & MULTI GELANGGANG
          </p>
        </motion.div>
      </div>

      {/* 3. PRIMARY NAVIGATION TABS */}
      <div className="w-full max-w-2xl z-10 flex items-center justify-center my-4">
        <div className="p-1.5 rounded-2xl bg-[#06081e]/90 border border-blue-500/30 backdrop-blur-md shadow-2xl flex items-center gap-2 w-full max-w-xl">
          {/* TAB 1: PORTAL UTAMA */}
          <button
            onClick={() => {
              playBeep('click');
              setActiveTab('portal');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'portal'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>PORTAL UTAMA</span>
          </button>

          {/* TAB 2: MANAJEMEN GELANGGANG */}
          <button
            onClick={() => {
              playBeep('click');
              setActiveTab('gelanggang');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer relative ${
              activeTab === 'gelanggang'
                ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-lg shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-300" />
            <span>MANAJEMEN GELANGGANG</span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 text-[9px] font-mono font-black border border-cyan-400/40">
              {arenasList.length}
            </span>
          </button>

          {/* TAB 3: REKAPITULASI */}
          <button
            onClick={() => {
              playBeep('click');
              setActiveTab('rekapitulasi');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
              activeTab === 'rekapitulasi'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>REKAPITULASI</span>
          </button>
        </div>
      </div>

      {/* 4. TAB CONTENTS */}
      <div className="w-full max-w-7xl z-10 flex-1 my-2">
        <AnimatePresence mode="wait">
          {activeTab === 'portal' && (
            <motion.div
              key="portal-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center"
            >
              {/* Active Arena Announcement */}
              <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/40 border border-blue-800/40 text-xs font-mono text-blue-300">
                <span>SEDANG MENGELOLA:</span>
                <strong className="text-white uppercase font-black">{currentArena.nama} ({currentArena.kode})</strong>
                <span className="text-slate-400">• {currentArena.keterangan || 'Matras Pertandingan'}</span>
              </div>

              {/* DUAL PORTAL CARDS */}
              <div className="max-w-5xl w-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 px-4 my-2">
                {/* TANDING PORTAL CARD */}
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => handleSelect('tanding')}
                  className="group w-full max-w-[340px] aspect-[4/5] rounded-3xl border border-cyan-500/30 bg-[#06081e]/80 hover:border-cyan-400 p-6 flex flex-col justify-between items-center cursor-pointer transition-all duration-300 shadow-2xl hover:shadow-[0_0_50px_rgba(6,182,212,0.35)] relative backdrop-blur-sm"
                >
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-500 rounded-tl-3xl opacity-40 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500 rounded-tr-3xl opacity-40 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500 rounded-bl-3xl opacity-40 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-500 rounded-br-3xl opacity-40 group-hover:opacity-100 transition-opacity" />

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl group-hover:bg-cyan-500/25 transition-all" />

                  <div className="w-52 h-52 rounded-full overflow-hidden border-2 border-cyan-500/40 group-hover:border-cyan-400 p-1 bg-[#020108] relative z-10 shadow-lg">
                    <img
                      src={tandingImg}
                      alt="Tanding Shield Logo"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  </div>

                  <div className="text-center z-10 mt-3 space-y-1">
                    <h2 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 group-hover:from-cyan-200 group-hover:to-blue-400 uppercase">
                      TANDING
                    </h2>
                    <p className="text-[9px] font-mono tracking-widest uppercase text-slate-400 group-hover:text-slate-200 transition-colors">
                      MODUL ARENA PERTANDINGAN FISIK ({currentArena.nama.toUpperCase()})
                    </p>
                  </div>
                </motion.div>

                {/* JURUS/SENI PORTAL CARD */}
                <motion.div
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => handleSelect('seni')}
                  className="group w-full max-w-[340px] aspect-[4/5] rounded-3xl border border-purple-500/30 bg-[#06081e]/80 hover:border-purple-400 p-6 flex flex-col justify-between items-center cursor-pointer transition-all duration-300 shadow-2xl hover:shadow-[0_0_50px_rgba(168,85,247,0.35)] relative backdrop-blur-sm"
                >
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-purple-500 rounded-tl-3xl opacity-40 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-purple-500 rounded-tr-3xl opacity-40 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-purple-500 rounded-bl-3xl opacity-40 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-purple-500 rounded-br-3xl opacity-40 group-hover:opacity-100 transition-opacity" />

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl group-hover:bg-purple-500/25 transition-all" />

                  <div className="w-52 h-52 rounded-full overflow-hidden border-2 border-purple-500/40 group-hover:border-purple-400 p-1 bg-[#020108] relative z-10 shadow-lg">
                    <img
                      src={seniImg}
                      alt="Jurus/Seni Shield Logo"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  </div>

                  <div className="text-center z-10 mt-3 space-y-1">
                    <h2 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-500 group-hover:from-purple-200 group-hover:to-pink-400 uppercase">
                      JURUS/SENI
                    </h2>
                    <p className="text-[9px] font-mono tracking-widest uppercase text-slate-400 group-hover:text-slate-200 transition-colors">
                      MODUL SENI TGR (TUNGGAL/GANDA/REGU) ({currentArena.nama.toUpperCase()})
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}

          {activeTab === 'gelanggang' && (
            <motion.div
              key="gelanggang-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <GelanggangManagerTab
                arenasList={arenasList}
                allArenasSummary={allArenasSummary}
                allArenasMap={allArenasMap}
                currentArenaId={currentArenaId}
                onSelectArena={onSelectArena}
                onLaunchRole={handleLaunchRoleFromArena}
                dispatch={dispatch}
                theme={theme}
              />
            </motion.div>
          )}

          {activeTab === 'rekapitulasi' && (
            <motion.div
              key="rekapitulasi-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-7xl mx-auto"
            >
              <RekapitulasiSkor
                histories={histories}
                tgrState={tgrState}
                state={state}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 5. FOOTER CREDITS */}
      <div className="w-full z-10 flex flex-col sm:flex-row justify-between items-center gap-3 text-[9px] font-mono tracking-widest text-slate-500 uppercase mt-6 border-t border-slate-900/60 pt-4 max-w-7xl">
        <span>© 2026 NO DISCORD. HAK CIPTA DILINDUNGI.</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleTheme}
            className="px-2.5 py-1 rounded bg-slate-950 border border-slate-900 text-slate-400 hover:text-slate-200 transition-colors text-[8px] uppercase font-bold tracking-widest cursor-pointer"
          >
            THEME: {theme.toUpperCase()}
          </button>
        </div>
        <span>SISTEM SKORING DIGITAL PENCAK SILAT MULTI GELANGGANG</span>
      </div>

      {/* Google Sheets Real-Time Synchronization Modal */}
      <GoogleSheetsIntegrationModal
        isOpen={showGoogleSheetsModal}
        onClose={() => setShowGoogleSheetsModal(false)}
        allArenasMap={allArenasMap}
        onApplyParsedAthletes={(athletes) => {
          setActiveTab('gelanggang');
        }}
      />

    </div>
  );
}
