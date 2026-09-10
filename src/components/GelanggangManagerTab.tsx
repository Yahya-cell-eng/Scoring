/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Radio,
  Tv,
  Users,
  Shield,
  Award,
  Layers,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  ArrowRight,
  ExternalLink,
  Sliders,
  Settings,
  Grid,
  Monitor,
  Activity,
  Maximize2,
  Calendar,
  Swords,
  Upload,
  FileSpreadsheet,
  Sparkles
} from 'lucide-react';
import { GelanggangInfo, ArenaSummary, MatchState, TGRState, MatchHistory } from '../types';
import { playBeep } from '../utils/sound';
import GelanggangJadwalSection from './GelanggangJadwalSection';
import UploadDistribusiPesertaModal from './UploadDistribusiPesertaModal';
import GoogleSheetsIntegrationModal from './GoogleSheetsIntegrationModal';

interface GelanggangManagerTabProps {
  arenasList: GelanggangInfo[];
  allArenasSummary: ArenaSummary[];
  allArenasMap: Record<string, { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }>;
  currentArenaId: string;
  onSelectArena: (arenaId: string) => void;
  onLaunchRole: (mode: 'tanding' | 'seni' | 'monitor_urutan', role?: string, arenaId?: string) => void;
  dispatch: (type: string, payload?: any) => void;
  theme: 'dark' | 'light';
}

export default function GelanggangManagerTab({
  arenasList,
  allArenasSummary,
  allArenasMap,
  currentArenaId,
  onSelectArena,
  onLaunchRole,
  dispatch,
  theme
}: GelanggangManagerTabProps) {
  const [mainTab, setMainTab] = useState<'kontrol' | 'jadwal'>('kontrol');
  const [viewMode, setViewMode] = useState<'grid' | 'matrix'>('grid');
  
  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingArena, setEditingArena] = useState<GelanggangInfo | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resettingArenaId, setResettingArenaId] = useState<string | null>(null);
  const [resetType, setResetType] = useState<'all' | 'tanding' | 'seni'>('all');

  // Form states for Add
  const [newNama, setNewNama] = useState('');
  const [newKode, setNewKode] = useState('');
  const [newKeterangan, setNewKeterangan] = useState('');
  const [newModeAktif, setNewModeAktif] = useState<'tanding' | 'seni'>('tanding');
  const [copyBaganFrom, setCopyBaganFrom] = useState('');

  // Form states for Edit
  const [editNama, setEditNama] = useState('');
  const [editKode, setEditKode] = useState('');
  const [editKeterangan, setEditKeterangan] = useState('');
  const [editModeAktif, setEditModeAktif] = useState<'tanding' | 'seni'>('tanding');
  const [editStatus, setEditStatus] = useState<'aktif' | 'istirahat' | 'selesai'>('aktif');

  const openAddModal = () => {
    playBeep('click');
    const nextNum = arenasList.length + 1;
    setNewNama(`Gelanggang ${nextNum}`);
    setNewKode(`${nextNum}`);
    setNewKeterangan(`Matras ${nextNum} - Hall Utama`);
    setNewModeAktif('tanding');
    setCopyBaganFrom(arenasList[0]?.id || '');
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNama.trim()) return;
    playBeep('valid');

    const newId = `arena_${Date.now()}`;
    dispatch('ADD_GELANGGANG', {
      id: newId,
      nama: newNama.trim(),
      kode: newKode.trim() || `${arenasList.length + 1}`,
      keterangan: newKeterangan.trim(),
      modeAktif: newModeAktif,
      copyBaganFrom: copyBaganFrom || undefined
    });

    setIsAddModalOpen(false);
  };

  const openEditModal = (arena: GelanggangInfo) => {
    playBeep('click');
    setEditingArena(arena);
    setEditNama(arena.nama);
    setEditKode(arena.kode);
    setEditKeterangan(arena.keterangan || '');
    setEditModeAktif(arena.modeAktif || 'tanding');
    setEditStatus(arena.status || 'aktif');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArena || !editNama.trim()) return;
    playBeep('valid');

    dispatch('UPDATE_GELANGGANG', {
      id: editingArena.id,
      nama: editNama.trim(),
      kode: editKode.trim(),
      keterangan: editKeterangan.trim(),
      modeAktif: editModeAktif,
      status: editStatus
    });

    setIsEditModalOpen(false);
    setEditingArena(null);
  };

  const handleDeleteArena = (arenaId: string, arenaName: string) => {
    if (arenasList.length <= 1) {
      alert('Tidak dapat menghapus arena satu-satunya. Minimal harus ada 1 gelanggang aktif.');
      return;
    }
    if (window.confirm(`Apakah Anda yakin ingin menghapus "${arenaName}"? Data pertandingan di gelanggang ini akan dihapus permanen.`)) {
      playBeep('warning');
      dispatch('DELETE_GELANGGANG', { id: arenaId });
      if (currentArenaId === arenaId) {
        const remaining = arenasList.filter(a => a.id !== arenaId);
        if (remaining[0]) {
          onSelectArena(remaining[0].id);
        }
      }
    }
  };

  const openResetModal = (arenaId: string) => {
    playBeep('click');
    setResettingArenaId(arenaId);
    setResetType('all');
    setIsResetModalOpen(true);
  };

  const handleResetSubmit = () => {
    if (!resettingArenaId) return;
    playBeep('warning');
    dispatch('RESET_GELANGGANG', {
      id: resettingArenaId,
      resetType
    });
    setIsResetModalOpen(false);
    setResettingArenaId(null);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper to find summary by arena ID
  const getSummary = (id: string): ArenaSummary | undefined => {
    return allArenasSummary.find(s => s.id === id);
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* 1. TOP CONTROL BAR */}
      <div className="w-full max-w-7xl flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-blue-500/20 bg-[#06081e]/90 backdrop-blur-md shadow-xl mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-black tracking-wider text-white uppercase">
                MANAJEMEN GELANGGANG / ARENA
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {arenasList.length} GELANGGANG TERSEDIA
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Setiap gelanggang beroperasi secara independen dengan kontrol jadwal tanding & seni terpisah.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Main Tab Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => { playBeep('click'); setMainTab('kontrol'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer ${
                mainTab === 'kontrol'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>KONTROL GELANGGANG</span>
            </button>
            <button
              onClick={() => { playBeep('click'); setMainTab('jadwal'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer ${
                mainTab === 'jadwal'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>MANAJEMEN JADWAL</span>
            </button>
          </div>

          {/* View Mode Toggle (Only active in 'kontrol' tab) */}
          {mainTab === 'kontrol' && (
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => { playBeep('click'); setViewMode('grid'); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Kartu Gelanggang"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">KARTU</span>
              </button>
              <button
                onClick={() => { playBeep('click'); setViewMode('matrix'); }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Live Matrix Split Semua Matras"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">MATRIX</span>
              </button>
            </div>
          )}

          {/* Upload Data Peserta & Auto Distribute Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { playBeep('click'); setIsUploadModalOpen(true); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-black tracking-wider uppercase shadow-lg shadow-blue-600/30 cursor-pointer"
            title="Upload data peserta Excel/CSV dan bagi ke gelanggang & jadwal otomatis"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">UPLOAD & BAGI PESERTA</span>
          </motion.button>

          {/* Google Sheets Integration Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { playBeep('click'); setIsGoogleSheetsModalOpen(true); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black tracking-wider uppercase shadow-lg shadow-emerald-700/30 cursor-pointer"
            title="Hubungkan data peserta dan hasil pertandingan ke Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span className="hidden sm:inline">GOOGLE SHEETS</span>
          </motion.button>

          {/* Add New Arena Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={openAddModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black tracking-wider uppercase shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">TAMBAH GELANGGANG</span>
          </motion.button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-7xl mb-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-teal-950/80 to-blue-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-start justify-between shadow-xl"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-sm font-bold text-white block">Distribusi Peserta Berhasil</strong>
              <p className="whitespace-pre-line text-emerald-300 font-mono text-[11px] leading-relaxed">
                {successBanner}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="p-1 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-800/40 cursor-pointer"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* 2. MAIN CONTENT AREA */}
      {mainTab === 'jadwal' ? (
        /* JADWAL MANAGEMENT SUB-SECTION */
        <GelanggangJadwalSection
          arenasList={arenasList}
          allArenasSummary={allArenasSummary}
          allArenasMap={allArenasMap}
          currentArenaId={currentArenaId}
          onSelectArena={onSelectArena}
          onLaunchRole={onLaunchRole}
          dispatch={dispatch}
          theme={theme}
        />
      ) : viewMode === 'grid' ? (
        /* GRID VIEW OF ARENAS */
        <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {arenasList.map((arena) => {
            const summary = getSummary(arena.id);
            const isSelected = currentArenaId === arena.id;
            const liveData = allArenasMap[arena.id];
            const activeMode = arena.modeAktif || 'tanding';

            return (
              <motion.div
                key={arena.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden backdrop-blur-md ${
                  isSelected
                    ? 'border-blue-400 bg-[#080d28]/95 shadow-[0_0_35px_rgba(59,130,246,0.3)] ring-2 ring-blue-400/50'
                    : 'border-slate-800/80 bg-[#06081e]/80 hover:border-slate-700 shadow-xl'
                }`}
              >
                {/* Active Indicator Ribbon */}
                {isSelected && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-blue-600 to-cyan-500 text-white text-[9px] font-mono font-black uppercase px-3 py-1 rounded-bl-xl shadow-md flex items-center gap-1 z-20">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                    <span>PERANGKAT INI: AKTIF</span>
                  </div>
                )}

                {/* Card Top Header */}
                <div className="p-5 border-b border-slate-800/80">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 font-mono font-black text-xs flex items-center justify-center">
                          {arena.kode || arena.nama.replace(/\D/g, '') || '1'}
                        </span>
                        <h3 className="text-xl font-black text-white uppercase tracking-wider">
                          {arena.nama}
                        </h3>
                      </div>
                      <p className="text-xs font-mono text-slate-400 mt-1">
                        {arena.keterangan || 'Matras Pertandingan'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(arena)}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Edit Info Gelanggang"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openResetModal(arena.id)}
                        className="p-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 transition-colors cursor-pointer border border-amber-800/40"
                        title="Reset Data Gelanggang Ini Saja"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      {arenasList.length > 1 && (
                        <button
                          onClick={() => handleDeleteArena(arena.id, arena.nama)}
                          className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 transition-colors cursor-pointer border border-red-800/40"
                          title="Hapus Gelanggang"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mode & Status Badges */}
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase border flex items-center gap-1.5 ${
                      activeMode === 'tanding'
                        ? 'bg-cyan-950/60 text-cyan-300 border-cyan-800/60'
                        : 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        activeMode === 'tanding' ? 'bg-cyan-400' : 'bg-purple-400'
                      }`} />
                      {activeMode === 'tanding' ? 'MODE: TANDING' : 'MODE: JURUS / SENI'}
                    </span>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      {arena.status || 'Aktif'}
                    </span>
                  </div>
                </div>

                {/* Card Live Snapshot Preview */}
                <div className="p-5 flex-1 flex flex-col justify-center bg-slate-950/40">
                  {/* TANDING LIVE SNAPSHOT */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 font-bold uppercase">
                        {summary?.tandingPartai ? `PARTAI ${summary.tandingPartai}` : 'PARTAI 01'} • BABAK {summary?.tandingBabak || 1}
                      </span>
                      <span className={`flex items-center gap-1 font-bold ${
                        summary?.tandingTimerActive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'
                      }`}>
                        {summary?.tandingTimerActive ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
                        {formatTimer(summary?.tandingTimerSeconds ?? 120)}
                      </span>
                    </div>

                    {/* Corner Matchup Bar */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Merah Corner */}
                      <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/40 flex items-center justify-between">
                        <div className="overflow-hidden pr-1">
                          <span className="text-[9px] font-mono font-black text-red-400 uppercase block">MERAH</span>
                          <span className="text-xs font-bold text-white truncate block">
                            {summary?.tandingMerahNama || 'Sudut Merah'}
                          </span>
                        </div>
                        <span className="text-xl font-black font-mono text-red-400 ml-1">
                          {summary?.tandingMerahSkor ?? 0}
                        </span>
                      </div>

                      {/* Biru Corner */}
                      <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-800/40 flex items-center justify-between">
                        <div className="overflow-hidden pr-1">
                          <span className="text-[9px] font-mono font-black text-blue-400 uppercase block">BIRU</span>
                          <span className="text-xs font-bold text-white truncate block">
                            {summary?.tandingBiruNama || 'Sudut Biru'}
                          </span>
                        </div>
                        <span className="text-xl font-black font-mono text-blue-400 ml-1">
                          {summary?.tandingBiruSkor ?? 0}
                        </span>
                      </div>
                    </div>

                    {/* Seni Snapshot Mini */}
                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>SENI: <strong className="text-purple-300">{summary?.seniActivePesertaNama || '-'}</strong></span>
                      <span>SKOR: <strong className="text-purple-300">{summary?.seniActivePesertaSkor?.toFixed(3) || '-'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Card Quick Action Footers */}
                <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 space-y-2">
                  {/* Select Arena Primary Action Button */}
                  <button
                    onClick={() => {
                      playBeep('valid');
                      onSelectArena(arena.id);
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-black tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                      isSelected
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-blue-500/30 ring-1 ring-white/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSelected ? 'GELANGGANG TERPILIH' : 'PILIH GELANGGANG INI'}</span>
                  </button>

                  {/* Fast Panel Launchers Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Enter Tanding Sub-App */}
                    <button
                      onClick={() => {
                        onSelectArena(arena.id);
                        onLaunchRole('tanding', 'landing', arena.id);
                      }}
                      className="py-1.5 px-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/40 text-cyan-300 hover:text-cyan-200 text-[10px] font-mono font-bold uppercase flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Shield className="w-3 h-3 text-cyan-400" />
                      <span>BUKA TANDING</span>
                    </button>

                    {/* Enter Seni Sub-App */}
                    <button
                      onClick={() => {
                        onSelectArena(arena.id);
                        onLaunchRole('seni', 'landing', arena.id);
                      }}
                      className="py-1.5 px-2 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 text-purple-300 hover:text-purple-200 text-[10px] font-mono font-bold uppercase flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Award className="w-3 h-3 text-purple-400" />
                      <span>BUKA SENI</span>
                    </button>
                  </div>

                  {/* Manage Schedule for this Arena */}
                  <button
                    onClick={() => {
                      playBeep('click');
                      onSelectArena(arena.id);
                      setMainTab('jadwal');
                    }}
                    className="w-full py-1.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/40 text-indigo-300 hover:text-indigo-200 text-[10px] font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>KELOLA JADWAL {arena.nama.toUpperCase()}</span>
                  </button>

                  {/* Direct Monitor Urutan Link */}
                  <button
                    onClick={() => {
                      onSelectArena(arena.id);
                      onLaunchRole('monitor_urutan', 'monitor_urutan', arena.id);
                    }}
                    className="w-full py-1 rounded-lg bg-amber-950/20 hover:bg-amber-900/40 border border-amber-800/30 text-amber-400 text-[10px] font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                    <span>MONITOR URUTAN PARTAI {arena.nama.toUpperCase()}</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* LIVE MULTI-ARENA MATRIX MONITORING VIEW */
        <div className="w-full max-w-7xl flex flex-col gap-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>LIVE MULTI-ARENA MONITORING MATRIX — SINKRONISASI SEMUA MATRAS REAL-TIME</span>
            </div>
            <span className="text-slate-400">
              Total {arenasList.length} Matras / Gelanggang
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {arenasList.map(arena => {
              const s = getSummary(arena.id);
              const isSelected = currentArenaId === arena.id;

              return (
                <div
                  key={arena.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between overflow-hidden shadow-2xl backdrop-blur-md ${
                    isSelected
                      ? 'border-blue-500 bg-[#060b24] shadow-blue-500/20'
                      : 'border-slate-800 bg-[#040616]'
                  }`}
                >
                  {/* Arena Header Bar */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-black text-xs">
                        {arena.kode}
                      </span>
                      <h4 className="text-lg font-black text-white uppercase tracking-wider">
                        {arena.nama}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                        s?.tandingTimerActive
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {s?.tandingTimerActive ? 'LIVE MATCH' : 'STANDBY'}
                      </span>
                    </div>
                  </div>

                  {/* Large Scoreboard Area */}
                  <div className="py-4 space-y-4">
                    {/* Match & Timer info */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 font-bold uppercase">
                        {s?.tandingPartai ? `PARTAI ${s.tandingPartai}` : 'PARTAI 01'} (BABAK {s?.tandingBabak || 1})
                      </span>
                      <span className="text-lg font-black text-amber-400 font-mono tracking-widest bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800">
                        {formatTimer(s?.tandingTimerSeconds ?? 120)}
                      </span>
                    </div>

                    {/* Dual Corner Big Numbers */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Red Corner */}
                      <div className="p-4 rounded-xl bg-gradient-to-br from-red-950/70 to-red-900/40 border border-red-600/50 flex flex-col items-center text-center">
                        <span className="text-[10px] font-mono font-black text-red-300 tracking-widest uppercase mb-1">
                          SUDUT MERAH
                        </span>
                        <span className="text-3xl sm:text-4xl font-black font-mono text-white filter drop-shadow">
                          {s?.tandingMerahSkor ?? 0}
                        </span>
                        <span className="text-xs font-bold text-slate-200 mt-2 truncate w-full">
                          {s?.tandingMerahNama || 'Sudut Merah'}
                        </span>
                        <span className="text-[10px] font-mono text-red-300/80 truncate w-full">
                          {s?.tandingMerahKontingen || '-'}
                        </span>
                      </div>

                      {/* Blue Corner */}
                      <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/70 to-blue-900/40 border border-blue-600/50 flex flex-col items-center text-center">
                        <span className="text-[10px] font-mono font-black text-blue-300 tracking-widest uppercase mb-1">
                          SUDUT BIRU
                        </span>
                        <span className="text-3xl sm:text-4xl font-black font-mono text-white filter drop-shadow">
                          {s?.tandingBiruSkor ?? 0}
                        </span>
                        <span className="text-xs font-bold text-slate-200 mt-2 truncate w-full">
                          {s?.tandingBiruNama || 'Sudut Biru'}
                        </span>
                        <span className="text-[10px] font-mono text-blue-300/80 truncate w-full">
                          {s?.tandingBiruKontingen || '-'}
                        </span>
                      </div>
                    </div>

                    {/* Seni Live Line */}
                    <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/30 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-purple-400 font-bold block uppercase">SENI TGR TERAKHIR</span>
                        <span className="text-white font-bold">{s?.seniActivePesertaNama || '-'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-purple-400 font-bold block uppercase">NILAI AKHIR</span>
                        <span className="text-purple-300 font-black text-sm">{s?.seniActivePesertaSkor?.toFixed(3) || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action link */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onSelectArena(arena.id);
                        onLaunchRole('tanding', 'monitor', arena.id);
                      }}
                      className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold font-mono tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Tv className="w-3.5 h-3.5 text-cyan-400" />
                      <span>MONITOR</span>
                    </button>
                    <button
                      onClick={() => {
                        onSelectArena(arena.id);
                        setMainTab('jadwal');
                      }}
                      className="w-full py-2 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-800/40 text-indigo-300 text-xs font-bold font-mono tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>JADWAL</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MODAL: TAMBAH GELANGGANG */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-blue-500/40 bg-[#070d28] p-6 shadow-2xl text-slate-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-white">
                    TAMBAH GELANGGANG BARU
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Nama Gelanggang *
                  </label>
                  <input
                    type="text"
                    value={newNama}
                    onChange={(e) => setNewNama(e.target.value)}
                    placeholder="Contoh: Gelanggang 4 atau Gelanggang D"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                      Kode Gelanggang
                    </label>
                    <input
                      type="text"
                      value={newKode}
                      onChange={(e) => setNewKode(e.target.value)}
                      placeholder="Contoh: 4 atau D"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                      Mode Awal
                    </label>
                    <select
                      value={newModeAktif}
                      onChange={(e) => setNewModeAktif(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="tanding">Tanding</option>
                      <option value="seni">Seni / TGR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Keterangan Lokasi / Matras
                  </label>
                  <input
                    type="text"
                    value={newKeterangan}
                    onChange={(e) => setNewKeterangan(e.target.value)}
                    placeholder="Contoh: Matras 4 - Hall Utama Gedung A"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Salin Bagan Pertandingan Dari Gelanggang Lain (Opsi)
                  </label>
                  <select
                    value={copyBaganFrom}
                    onChange={(e) => setCopyBaganFrom(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">-- Buat Bagan Kosong Baru --</option>
                    {arenasList.map(a => (
                      <option key={a.id} value={a.id}>
                        Salin dari {a.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    Simpan Gelanggang
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. MODAL: EDIT INFO GELANGGANG */}
      <AnimatePresence>
        {isEditModalOpen && editingArena && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-blue-500/40 bg-[#070d28] p-6 shadow-2xl text-slate-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-wider text-white">
                    EDIT GELANGGANG ({editingArena.nama})
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Nama Gelanggang *
                  </label>
                  <input
                    type="text"
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                      Kode Gelanggang
                    </label>
                    <input
                      type="text"
                      value={editKode}
                      onChange={(e) => setEditKode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                      Status Arena
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="aktif">Aktif</option>
                      <option value="istirahat">Istirahat / Skorsing</option>
                      <option value="selesai">Selesai</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Keterangan Lokasi
                  </label>
                  <input
                    type="text"
                    value={editKeterangan}
                    onChange={(e) => setEditKeterangan(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Mode Pertandingan
                  </label>
                  <select
                    value={editModeAktif}
                    onChange={(e) => setEditModeAktif(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-none"
                  >
                    <option value="tanding">Tanding</option>
                    <option value="seni">Seni / TGR</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                  >
                    Perbarui Gelanggang
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. MODAL: RESET DATA GELANGGANG */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-[#070d28] p-6 shadow-2xl text-slate-100"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-amber-600/30 border border-amber-500 flex items-center justify-center text-amber-300">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    RESET GELANGGANG
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Hanya mereset data pada gelanggang ini.
                  </p>
                </div>
              </div>

              <div className="space-y-4 my-5">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Pilih cakupan data yang ingin di-reset untuk gelanggang ini. Gelanggang lain tidak akan terpengaruh sama sekali:
                </p>

                <div className="space-y-2">
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    resetType === 'all'
                      ? 'bg-amber-950/40 border-amber-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}>
                    <input
                      type="radio"
                      name="resetType"
                      checked={resetType === 'all'}
                      onChange={() => setResetType('all')}
                      className="accent-amber-500"
                    />
                    <div>
                      <strong className="text-xs uppercase block font-black">Reset Total Gelanggang</strong>
                      <span className="text-[10px] font-mono block text-slate-400">Reset skor tanding, seni TGR, dan histori match di arena ini</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    resetType === 'tanding'
                      ? 'bg-amber-950/40 border-amber-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}>
                    <input
                      type="radio"
                      name="resetType"
                      checked={resetType === 'tanding'}
                      onChange={() => setResetType('tanding')}
                      className="accent-amber-500"
                    />
                    <div>
                      <strong className="text-xs uppercase block font-black">Reset Tanding Saja</strong>
                      <span className="text-[10px] font-mono block text-slate-400">Kembalikan skor babak tanding & timer ke kondisi awal</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    resetType === 'seni'
                      ? 'bg-amber-950/40 border-amber-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}>
                    <input
                      type="radio"
                      name="resetType"
                      checked={resetType === 'seni'}
                      onChange={() => setResetType('seni')}
                      className="accent-amber-500"
                    />
                    <div>
                      <strong className="text-xs uppercase block font-black">Reset Seni / TGR Saja</strong>
                      <span className="text-[10px] font-mono block text-slate-400">Kembalikan nilai juri dan timer seni ke kondisi awal</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleResetSubmit}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-600/30 transition-all cursor-pointer"
                >
                  Konfirmasi Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload & Distribusi Peserta Modal */}
      <UploadDistribusiPesertaModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        arenasList={arenasList}
        dispatch={dispatch}
        theme={theme}
        onSuccess={(msg) => setSuccessBanner(msg)}
      />

      {/* Google Sheets Real-Time Synchronization Modal */}
      <GoogleSheetsIntegrationModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        allArenasMap={allArenasMap}
        onApplyParsedAthletes={(athletes) => {
          setSuccessBanner(`Berhasil mengambil ${athletes.length} atlet dari Google Sheets! Klik "UPLOAD & BAGI PESERTA" untuk membagi ke gelanggang.`);
        }}
      />
    </div>
  );
}
