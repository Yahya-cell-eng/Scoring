/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  Swords,
  Award,
  Plus,
  Edit3,
  Trash2,
  ArrowRight,
  ArrowLeftRight,
  Printer,
  FileSpreadsheet,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Play,
  Filter,
  Search,
  Hash,
  Layers,
  ChevronRight,
  Shuffle,
  Copy,
  Users,
  Tv,
  Shield,
  Sparkles,
  Flame,
  Check,
  RotateCcw,
  Upload
} from 'lucide-react';
import {
  GelanggangInfo,
  ArenaSummary,
  MatchState,
  TGRState,
  MatchHistory,
  BaganCategory,
  BaganMatch,
  TGRPeserta
} from '../types';
import { playBeep } from '../utils/sound';
import { parseExcelFile, autoGroupAllAthletes } from '../utils/smartDataParser';
import {
  flattenAllBaganMatches,
  resequenceAndRenumberCategories,
  formatPartaiLabel,
  FlattenedMatchInfo
} from '../utils/partaiOrdering';
import { getNextMatchTarget } from '../utils/bracketProgression';
import {
  generateSchedulePdf,
  exportScheduleToExcel,
  ScheduleMatchRow,
  ScheduleMetadata
} from '../utils/generateSchedulePdf';
import EditJadwalPartaiModal from './EditJadwalPartaiModal';

interface GelanggangJadwalSectionProps {
  arenasList: GelanggangInfo[];
  allArenasSummary: ArenaSummary[];
  allArenasMap: Record<
    string,
    { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }
  >;
  currentArenaId: string;
  onSelectArena: (arenaId: string) => void;
  onLaunchRole: (mode: 'tanding' | 'seni' | 'monitor_urutan', role?: string, arenaId?: string) => void;
  dispatch: (type: string, payload?: any) => void;
  theme: 'dark' | 'light';
}

export default function GelanggangJadwalSection({
  arenasList,
  allArenasSummary,
  allArenasMap,
  currentArenaId,
  onSelectArena,
  onLaunchRole,
  dispatch,
  theme
}: GelanggangJadwalSectionProps) {
  // Selected arena to inspect and manage schedules for
  const [selectedArenaId, setSelectedArenaId] = useState<string>(() => {
    return currentArenaId || arenasList[0]?.id || 'arena_1';
  });

  // Schedule sub-mode: 'tanding' | 'seni' | 'distribusi'
  const [scheduleMode, setScheduleMode] = useState<'tanding' | 'seni' | 'distribusi'>('tanding');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [tandingRoundFilter, setTandingRoundFilter] = useState<'all' | 'sixtyfourth' | 'thirtysecond' | 'sixteenth' | 'quarter' | 'semi' | 'final'>('all');
  const [tandingStatusFilter, setTandingStatusFilter] = useState<'all' | 'live' | 'completed' | 'pending'>('all');
  const [seniKategoriFilter, setSeniKategoriFilter] = useState<string>('all');
  const [seniStatusFilter, setSeniStatusFilter] = useState<'all' | 'live' | 'completed' | 'pending'>('all');

  // Modal states for editing matches/participants
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTargetId, setEditTargetId] = useState<string | null>(null);
  const [editTargetType, setEditTargetType] = useState<'tanding' | 'seni' | 'all'>('tanding');

  // Quick transfer match/category modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<{
    type: 'tanding_cat' | 'tanding_match' | 'seni_peserta';
    id: string;
    title: string;
    sourceArenaId: string;
  } | null>(null);
  const [transferDestinationArenaId, setTransferDestinationArenaId] = useState<string>('');
  const [transferIsCopy, setTransferIsCopy] = useState(false);

  // Cross-arena distribution wizard state
  const [distSourceArenaId, setDistSourceArenaId] = useState<string>(() => arenasList[0]?.id || 'arena_1');
  const [distTargetArenaIds, setDistTargetArenaIds] = useState<string[]>(() => arenasList.map(a => a.id));
  const [distType, setDistType] = useState<'tanding' | 'seni' | 'all'>('tanding');
  const [distMethod, setDistMethod] = useState<'round_robin' | 'even_split'>('round_robin');
  const [distSuccessMsg, setDistSuccessMsg] = useState<string | null>(null);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelDistSuccess, setExcelDistSuccess] = useState<string | null>(null);

  const handleExcelUploadAndDistribute = async (file: File) => {
    try {
      setExcelLoading(true);
      playBeep('click');
      const records = await parseExcelFile(file);
      if (!records || records.length === 0) {
        alert('File Excel kosong atau format kolom tidak sesuai!');
        setExcelLoading(false);
        return;
      }
      const { tandingCategories, seniPesertaList } = autoGroupAllAthletes(records, 8, 4);
      if (dispatch) {
        dispatch('DISTRIBUTE_EXCEL_ALL_ARENAS', {
          tandingCategories,
          seniPesertaList
        });
      }
      playBeep('valid');
      setExcelDistSuccess(`Berhasil membagi otomatis ${records.length} atlet dari "${file.name}" ke semua gelanggang aktif! Kontingen dipisahkan agar tidak bertemu di awal, dan kategori tanding/seni disesuaikan.`);
      setDistSuccessMsg(null);
    } catch (err: any) {
      console.error(err);
      alert(`Gagal memproses Excel: ${err.message || err}`);
    } finally {
      setExcelLoading(false);
    }
  };

  // Current active arena objects
  const activeArenaData = allArenasMap[selectedArenaId] || {
    state: {} as MatchState,
    tgrState: {} as TGRState,
    histories: [],
    info: arenasList.find(a => a.id === selectedArenaId) || arenasList[0]
  };

  const selectedArenaInfo = arenasList.find(a => a.id === selectedArenaId) || activeArenaData.info;
  const tandingCategories: BaganCategory[] = activeArenaData.state?.baganCategories || [];
  const seniPesertaList: TGRPeserta[] = activeArenaData.tgrState?.pesertaList || [];

  // Summary for selected arena
  const selectedSummary = allArenasSummary.find(s => s.id === selectedArenaId);

  // Flattened tanding matches
  const flattenedMatches = useMemo(() => {
    return flattenAllBaganMatches(tandingCategories);
  }, [tandingCategories]);

  // Filtered Tanding Matches
  const filteredTandingMatches = useMemo(() => {
    return flattenedMatches.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const m = item.match;
        const matchText = `${item.catName} ${m.partai} ${m.atletMerah?.nama || ''} ${m.atletMerah?.kontingen || ''} ${m.atletBiru?.nama || ''} ${m.atletBiru?.kontingen || ''}`.toLowerCase();
        if (!matchText.includes(q)) return false;
      }

      // Round filter
      if (tandingRoundFilter !== 'all') {
        if (item.match.round !== tandingRoundFilter) return false;
      }

      // Status filter
      if (tandingStatusFilter !== 'all') {
        const isLive = activeArenaData.state?.activeBaganCategoryId === item.catId && activeArenaData.state?.activeBaganMatchId === item.match.id;
        const isCompleted = !!item.match.winner;
        if (tandingStatusFilter === 'live' && !isLive) return false;
        if (tandingStatusFilter === 'completed' && !isCompleted) return false;
        if (tandingStatusFilter === 'pending' && (isLive || isCompleted)) return false;
      }

      return true;
    });
  }, [flattenedMatches, searchQuery, tandingRoundFilter, tandingStatusFilter, activeArenaData.state?.activeBaganCategoryId, activeArenaData.state?.activeBaganMatchId]);

  // Filtered Seni Participants
  const filteredSeniPeserta = useMemo(() => {
    return seniPesertaList.filter(p => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${p.nama} ${p.kontingen} ${p.kategori} ${p.partai} ${p.pool} ${p.gender} ${p.usia}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      // Kategori
      if (seniKategoriFilter !== 'all') {
        if (p.kategori !== seniKategoriFilter) return false;
      }

      // Status
      if (seniStatusFilter !== 'all') {
        const isLive = activeArenaData.tgrState?.activePesertaId === p.id;
        const isCompleted = p.status === 'Sudah Menilai' || p.isLocked;
        if (seniStatusFilter === 'live' && !isLive) return false;
        if (seniStatusFilter === 'completed' && !isCompleted) return false;
        if (seniStatusFilter === 'pending' && (isLive || isCompleted)) return false;
      }

      return true;
    });
  }, [seniPesertaList, searchQuery, seniKategoriFilter, seniStatusFilter, activeArenaData.tgrState?.activePesertaId]);

  // Stats calculation for Tanding
  const tandingStats = useMemo(() => {
    let total = flattenedMatches.length;
    let completed = flattenedMatches.filter(m => !!m.match.winner).length;
    let live = flattenedMatches.filter(m => activeArenaData.state?.activeBaganCategoryId === m.catId && activeArenaData.state?.activeBaganMatchId === m.match.id).length;
    let pending = total - completed;
    return { total, completed, live, pending, totalClasses: tandingCategories.length };
  }, [flattenedMatches, tandingCategories, activeArenaData.state?.activeBaganCategoryId, activeArenaData.state?.activeBaganMatchId]);

  // Stats calculation for Seni
  const seniStats = useMemo(() => {
    let total = seniPesertaList.length;
    let completed = seniPesertaList.filter(p => p.status === 'Sudah Menilai' || p.isLocked).length;
    let live = seniPesertaList.filter(p => activeArenaData.tgrState?.activePesertaId === p.id).length;
    let pending = total - completed;
    return { total, completed, live, pending };
  }, [seniPesertaList, activeArenaData.tgrState?.activePesertaId]);

  // -------------------------------------------------------------
  // ACTIONS: CALL MATCH TO ARENA / SET ACTIVE
  // -------------------------------------------------------------
  const handleCallTandingMatchToArena = (item: FlattenedMatchInfo) => {
    playBeep('valid');
    dispatch('LOAD_BAGAN_MATCH', {
      arenaId: selectedArenaId,
      namaEvent: activeArenaData.state?.namaEvent || 'KEJUARAAN PENCAK SILAT',
      partai: item.match.partai || `PARTAI ${item.match.id}`,
      kelas: item.catName,
      gender: item.gender,
      activeBaganCategoryId: item.catId,
      activeBaganMatchId: item.match.id,
      atletMerah: {
        nama: item.match.atletMerah?.nama || 'Sudut Merah',
        kontingen: item.match.atletMerah?.kontingen || 'Kontingen Merah'
      },
      atletBiru: {
        nama: item.match.atletBiru?.nama || 'Sudut Biru',
        kontingen: item.match.atletBiru?.kontingen || 'Kontingen Biru'
      },
      selectedWaktu: activeArenaData.state?.selectedWaktu || 120
    });
  };

  const handleCallSeniPesertaToArena = (peserta: TGRPeserta) => {
    playBeep('valid');
    dispatch('TGR_SET_ACTIVE_PESERTA', {
      arenaId: selectedArenaId,
      pesertaId: peserta.id
    });
  };

  // -------------------------------------------------------------
  // ACTIONS: QUICK RENUMBERING
  // -------------------------------------------------------------
  const handleRenumberTandingMatches = (strategy: 'standar_ipsi_babak' | 'per_kategori' | 'per_nomor_saat_ini' = 'standar_ipsi_babak') => {
    if (tandingCategories.length === 0) return;
    playBeep('valid');
    const { updatedCategories } = resequenceAndRenumberCategories(tandingCategories, strategy, 1);
    dispatch('UPDATE_BAGAN_CATEGORIES', {
      arenaId: selectedArenaId,
      categories: updatedCategories
    });
  };

  const handleRenumberSeniParticipants = () => {
    if (seniPesertaList.length === 0) return;
    playBeep('valid');
    const updated = seniPesertaList.map((p, idx) => ({
      ...p,
      noUrut: idx + 1,
      noUndian: idx + 1,
      partaiNumber: idx + 1,
      partai: `PARTAI ${idx + 1}`
    }));
    dispatch('TGR_UPDATE_PESERTA', {
      arenaId: selectedArenaId,
      action: 'sync_list',
      pesertaList: updated
    });
  };

  // -------------------------------------------------------------
  // ACTIONS: TRANSFER OR COPY
  // -------------------------------------------------------------
  const openTransferModal = (
    type: 'tanding_cat' | 'tanding_match' | 'seni_peserta',
    id: string,
    title: string
  ) => {
    playBeep('click');
    const otherArena = arenasList.find(a => a.id !== selectedArenaId)?.id || arenasList[0]?.id;
    setTransferTarget({
      type,
      id,
      title,
      sourceArenaId: selectedArenaId
    });
    setTransferDestinationArenaId(otherArena);
    setTransferIsCopy(false);
    setTransferModalOpen(true);
  };

  const handleExecuteTransfer = () => {
    if (!transferTarget || !transferDestinationArenaId) return;
    playBeep('valid');

    if (transferTarget.type === 'tanding_cat') {
      dispatch('TRANSFER_CATEGORY_TO_ARENA', {
        sourceArenaId: transferTarget.sourceArenaId,
        targetArenaId: transferDestinationArenaId,
        categoryId: transferTarget.id,
        isCopy: transferIsCopy
      });
    } else if (transferTarget.type === 'seni_peserta') {
      dispatch('TRANSFER_PESERTA_TGR_TO_ARENA', {
        sourceArenaId: transferTarget.sourceArenaId,
        targetArenaId: transferDestinationArenaId,
        pesertaId: transferTarget.id,
        isCopy: transferIsCopy
      });
    }

    setTransferModalOpen(false);
    setTransferTarget(null);
  };

  // -------------------------------------------------------------
  // ACTIONS: CROSS-ARENA SCHEDULE DISTRIBUTION WIZARD
  // -------------------------------------------------------------
  const handleApplyScheduleDistribution = () => {
    if (distTargetArenaIds.length === 0) {
      alert('Pilih minimal satu gelanggang tujuan.');
      return;
    }

    playBeep('valid');
    if (distType === 'tanding' || distType === 'all') {
      dispatch('DISTRIBUTE_TANDING_SCHEDULE', {
        sourceArenaId: distSourceArenaId,
        targetArenaIds: distTargetArenaIds,
        method: distMethod
      });
    }

    if (distType === 'seni' || distType === 'all') {
      dispatch('DISTRIBUTE_SENI_SCHEDULE', {
        sourceArenaId: distSourceArenaId,
        targetArenaIds: distTargetArenaIds
      });
    }

    setDistSuccessMsg(`Berhasil mendistribusikan jadwal dari ${arenasList.find(a => a.id === distSourceArenaId)?.nama} ke ${distTargetArenaIds.length} Gelanggang terpilih!`);
    setTimeout(() => setDistSuccessMsg(null), 5000);
  };

  // -------------------------------------------------------------
  // ACTIONS: EXPORT SCHEDULE (PDF & EXCEL)
  // -------------------------------------------------------------
  const handleExportPdf = () => {
    playBeep('valid');
    const metadata: ScheduleMetadata = {
      headerTitle: activeArenaData.state?.namaEvent || 'JADWAL PERTANDINGAN PENCAK SILAT',
      headerSubtitle: `JADWAL RESMI — ${selectedArenaInfo?.nama || 'GELANGGANG 1'}`,
      gelanggang: selectedArenaInfo?.nama || 'Gelanggang 1',
      hariTanggal: new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      lokasiTanggal: selectedArenaInfo?.keterangan || 'Hall Utama Arena Pertandingan',
      logoKiri: activeArenaData.state?.logoKiri || null,
      logoKanan: activeArenaData.state?.logoKanan || null,
      showSignatures: true
    };

    if (scheduleMode === 'tanding') {
      const rows: ScheduleMatchRow[] = flattenedMatches.map((m, idx) => ({
        no: idx + 1,
        partai: m.match.partai || `Partai ${idx + 1}`,
        kelas: m.catName,
        roundLabel: m.match.round || 'Penyisihan',
        merahNama: m.match.athlete1?.name || 'Sudut Merah',
        merahKontingen: m.match.athlete1?.contingent || '-',
        biruNama: m.match.athlete2?.name || 'Sudut Biru',
        biruKontingen: m.match.athlete2?.contingent || '-',
        winner: m.match.winner,
        remark: m.match.winner ? `Pemenang: Sudut ${m.match.winner.toUpperCase()}` : ''
      }));
      generateSchedulePdf(metadata, rows);
    } else {
      // Seni participants rows
      const rows: ScheduleMatchRow[] = seniPesertaList.map((p, idx) => ({
        no: idx + 1,
        partai: p.partai || `Partai ${p.noUrut || idx + 1}`,
        kelas: `${p.kategori} ${p.gender || ''} (${p.pool || 'Pool A'})`,
        roundLabel: p.usia || 'Dewasa',
        merahNama: p.nama,
        merahKontingen: p.kontingen,
        biruNama: p.status === 'Sudah Menilai' ? `Nilai: ${((p as any).scores?.finalScore || 0).toFixed(3)}` : 'Standby',
        biruKontingen: p.status || 'Belum Menilai',
        remark: p.status === 'Sudah Menilai' ? 'Selesai' : 'Antrean'
      }));
      generateSchedulePdf(metadata, rows);
    }
  };

  const handleExportExcel = () => {
    playBeep('valid');
    const metadata: ScheduleMetadata = {
      headerTitle: activeArenaData.state?.namaEvent || 'JADWAL PERTANDINGAN PENCAK SILAT',
      headerSubtitle: `JADWAL ${selectedArenaInfo?.nama?.toUpperCase()}`,
      gelanggang: selectedArenaInfo?.nama || 'Gelanggang 1',
      hariTanggal: new Date().toLocaleDateString('id-ID'),
      lokasiTanggal: selectedArenaInfo?.keterangan || 'Hall Utama'
    };

    if (scheduleMode === 'tanding') {
      const rows: ScheduleMatchRow[] = flattenedMatches.map((m, idx) => ({
        no: idx + 1,
        partai: m.match.partai || `Partai ${idx + 1}`,
        kelas: m.catName,
        roundLabel: m.match.round || 'Penyisihan',
        merahNama: m.match.athlete1?.name || 'Sudut Merah',
        merahKontingen: m.match.athlete1?.contingent || '-',
        biruNama: m.match.athlete2?.name || 'Sudut Biru',
        biruKontingen: m.match.athlete2?.contingent || '-',
        winner: m.match.winner,
        remark: m.match.winner ? `Pemenang: ${m.match.winner}` : '-'
      }));
      exportScheduleToExcel(metadata, rows);
    } else {
      const rows: ScheduleMatchRow[] = seniPesertaList.map((p, idx) => ({
        no: idx + 1,
        partai: p.partai || `Partai ${p.noUrut || idx + 1}`,
        kelas: `${p.kategori} (${p.pool || 'Pool A'})`,
        roundLabel: p.usia || 'Dewasa',
        merahNama: p.nama,
        merahKontingen: p.kontingen,
        biruNama: p.status || '-',
        biruKontingen: p.kontingen,
        remark: p.status
      }));
      exportScheduleToExcel(metadata, rows);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* 1. ARENA SELECTOR TABS BAR */}
      <div className="w-full max-w-7xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl border border-blue-500/20 bg-[#06081e]/90 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-black tracking-wider text-white uppercase flex items-center gap-2">
              <span>MANAJEMEN JADWAL GELANGGANG</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                TANDING & SENI
              </span>
            </h3>
            <p className="text-xs font-mono text-slate-400">
              Atur partai, urutan tanding, panggil atlet live, dan distribusi jadwal tiap matras.
            </p>
          </div>
        </div>

        {/* Arena Pill Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
          {arenasList.map(arena => {
            const isSelected = selectedArenaId === arena.id;
            const aData = allArenasMap[arena.id];
            const tCount = flattenAllBaganMatches(aData?.state?.baganCategories || []).length;
            const sCount = aData?.tgrState?.pesertaList?.length || 0;

            return (
              <button
                key={arena.id}
                onClick={() => {
                  playBeep('click');
                  setSelectedArenaId(arena.id);
                  onSelectArena(arena.id);
                }}
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                }`}
              >
                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${
                  isSelected ? 'bg-white text-blue-900' : 'bg-slate-800 text-slate-200'
                }`}>
                  {arena.kode}
                </span>
                <span>{arena.nama}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tCount}T / {sCount}S
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ACTIVE ARENA BANNER & QUICK LAUNCHERS */}
      <div className="w-full max-w-7xl rounded-2xl border border-blue-500/30 bg-gradient-to-r from-[#070e2f] via-[#091238] to-[#060b24] p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-500 flex items-center justify-center text-blue-400 font-mono font-black text-lg">
            {selectedArenaInfo?.kode}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-black text-white uppercase tracking-wider">
                {selectedArenaInfo?.nama}
              </h4>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                selectedArenaInfo?.modeAktif === 'seni'
                  ? 'bg-purple-950 text-purple-300 border border-purple-700'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
              }`}>
                Mode: {selectedArenaInfo?.modeAktif?.toUpperCase() || 'TANDING'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {selectedArenaInfo?.keterangan || 'Hall Utama'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-1 text-xs font-mono text-slate-300">
              <span>Beban: <strong className="text-amber-400">{tandingStats.total} Partai Tanding</strong></span>
              <span>•</span>
              <span><strong className="text-purple-400">{seniStats.total} Peserta Seni</strong></span>
              <span>•</span>
              <span>Status: <strong className="text-emerald-400">{selectedArenaInfo?.status?.toUpperCase() || 'AKTIF'}</strong></span>
            </div>
          </div>
        </div>

        {/* Quick launch role shortcuts for this specific arena */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              playBeep('click');
              onLaunchRole('tanding', 'monitor', selectedArenaId);
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-700 text-cyan-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Buka Monitor Layar Penuh untuk gelanggang ini"
          >
            <Tv className="w-3.5 h-3.5 text-cyan-400" />
            <span>Monitor Layar</span>
          </button>
          <button
            onClick={() => {
              playBeep('click');
              onLaunchRole('tanding', 'dewan', selectedArenaId);
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Buka Dewan Juri untuk gelanggang ini"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Dewan Juri</span>
          </button>
          <button
            onClick={() => {
              playBeep('click');
              onLaunchRole('tanding', 'sekretaris', selectedArenaId);
            }}
            className="px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700 text-purple-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Buka Sekretaris untuk gelanggang ini"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Sekretaris</span>
          </button>
        </div>
      </div>

      {/* 3. MODE NAVIGATION TABS (TANDING vs SENI vs DISTRIBUSI) */}
      <div className="w-full max-w-7xl flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playBeep('click');
              setScheduleMode('tanding');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
              scheduleMode === 'tanding'
                ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
            }`}
          >
            <Swords className="w-4 h-4" />
            <span>Jadwal Tanding ({tandingStats.total})</span>
          </button>

          <button
            onClick={() => {
              playBeep('click');
              setScheduleMode('seni');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
              scheduleMode === 'seni'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Jadwal Seni TGR ({seniStats.total})</span>
          </button>

          <button
            onClick={() => {
              playBeep('click');
              setScheduleMode('distribusi');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
              scheduleMode === 'distribusi'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
            }`}
          >
            <Shuffle className="w-4 h-4" />
            <span>Distribusi Antar Gelanggang</span>
          </button>
        </div>

        {/* Global Export Buttons for this Gelanggang */}
        {scheduleMode !== 'distribusi' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Cetak PDF</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ekspor Excel</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. MAIN SUB-CONTENT BASED ON MODE */}

      {/* A. TANDING SCHEDULE VIEW */}
      {scheduleMode === 'tanding' && (
        <div className="w-full max-w-7xl flex flex-col gap-5">
          {/* Stats Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Total Partai Tanding</span>
              <span className="text-2xl font-black font-mono text-white mt-1">{tandingStats.total} Partai</span>
              <span className="text-[10px] font-mono text-slate-500">{tandingStats.totalClasses} Bagan Kelas</span>
            </div>
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex flex-col">
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Partai Sedang Live</span>
              <span className="text-2xl font-black font-mono text-emerald-300 mt-1">
                {tandingStats.live > 0 ? `${tandingStats.live} LIVE` : 'STANDBY'}
              </span>
              <span className="text-[10px] font-mono text-emerald-400/70">Di Matras {selectedArenaInfo?.kode}</span>
            </div>
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 flex flex-col">
              <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">Partai Selesai</span>
              <span className="text-2xl font-black font-mono text-blue-300 mt-1">{tandingStats.completed}</span>
              <span className="text-[10px] font-mono text-blue-400/70">Hasil tercatat</span>
            </div>
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/40 flex flex-col">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">Sisa Antrean</span>
              <span className="text-2xl font-black font-mono text-amber-300 mt-1">{tandingStats.pending} Partai</span>
              <span className="text-[10px] font-mono text-amber-400/70">Menunggu giliran</span>
            </div>
          </div>

          {/* Continuity Guarantee Notice */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900 border border-blue-500/30 flex items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-blue-200 block">
                  🔒 ATURAN KONTINUITAS GELANGGANG TERKUNCI ({selectedArenaInfo?.nama})
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Atlet yang bertanding di <strong>{selectedArenaInfo?.nama}</strong> akan tetap berlanjut di <strong>{selectedArenaInfo?.nama}</strong> pada babak selanjutnya (Semi Final & Final) tanpa berpindah gelanggang.
                </span>
              </div>
            </div>
            <span className="hidden md:inline-block px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider shrink-0">
              Sistem Terkunci
            </span>
          </div>

          {/* Action & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari partai, nama pesilat, kelas, kontingen..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Round Filter */}
            <select
              value={tandingRoundFilter}
              onChange={e => setTandingRoundFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Semua Babak</option>
              <option value="sixtyfourth">64 Besar</option>
              <option value="thirtysecond">32 Besar</option>
              <option value="sixteenth">16 Besar</option>
              <option value="quarter">Perempat Final</option>
              <option value="semi">Semi Final</option>
              <option value="final">Final</option>
            </select>

            {/* Status Filter */}
            <select
              value={tandingStatusFilter}
              onChange={e => setTandingStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="live">Sedang Live</option>
              <option value="completed">Sudah Selesai</option>
              <option value="pending">Menunggu / Antrean</option>
            </select>

            {/* Action Buttons: Add & Renumber */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playBeep('click');
                  setEditTargetId(null);
                  setEditTargetType('tanding');
                  setShowEditModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Partai Baru</span>
              </button>

              <button
                onClick={() => handleRenumberTandingMatches('standar_ipsi_babak')}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Urutkan partai secara standar IPSI (Penyisihan -> Perempat -> Semi -> Final)"
              >
                <Hash className="w-3.5 h-3.5 text-amber-400" />
                <span>Urutkan No. Partai</span>
              </button>
            </div>
          </div>

          {/* Matches List / Table */}
          {filteredTandingMatches.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-slate-500" />
              <h4 className="text-base font-bold text-slate-300">Belum Ada Jadwal Tanding di {selectedArenaInfo?.nama}</h4>
              <p className="text-xs font-mono text-slate-400 max-w-md">
                Gelanggang ini belum memiliki partai tanding. Anda bisa menambahkan partai baru atau mendistribusikan partai dari gelanggang lain.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => {
                    setEditTargetId(null);
                    setEditTargetType('tanding');
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono transition-colors"
                >
                  + Buat Partai Tanding
                </button>
                <button
                  onClick={() => setScheduleMode('distribusi')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-mono transition-colors"
                >
                  Salin / Bagi dari Gelanggang Lain
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTandingMatches.map(item => {
                const isLive =
                  activeArenaData.state?.activeBaganCategoryId === item.catId &&
                  activeArenaData.state?.activeBaganMatchId === item.match.id;
                const isCompleted = !!item.match.winner;
                
                const parentCat = tandingCategories.find(c => c.id === item.catId);
                const nextTarget = parentCat ? getNextMatchTarget(parentCat, item.match.id) : null;
                const winnerAthlete = item.match.winner === 'merah' ? item.match.atletMerah : item.match.winner === 'biru' ? item.match.atletBiru : null;

                return (
                  <div
                    key={`${item.catId}_${item.match.id}`}
                    className={`rounded-2xl border p-4 transition-all flex flex-col gap-3 ${
                      isLive
                        ? 'border-emerald-500 bg-gradient-to-r from-emerald-950/40 to-slate-900/90 shadow-lg shadow-emerald-500/10'
                        : isCompleted
                        ? 'border-slate-800 bg-[#06081e]/60 opacity-85'
                        : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      {/* Left: Partai Info & Category */}
                      <div className="flex items-center gap-3.5 min-w-[200px]">
                        <div className={`px-3 py-2 rounded-xl font-mono font-black text-center flex flex-col items-center justify-center ${
                          isLive
                            ? 'bg-emerald-600 text-white animate-pulse'
                            : isCompleted
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-blue-600/30 border border-blue-500/50 text-blue-300'
                        }`}>
                          <span className="text-[9px] uppercase tracking-wider">NO.</span>
                          <span className="text-sm">
                            {item.match.partai || `P-${item.match.id}`}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 uppercase">
                              {item.match.round || 'Penyisihan'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800 uppercase">
                              {item.shortKelas}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800/80 text-cyan-300 border border-slate-700">
                              🔒 {selectedArenaInfo?.nama}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-white mt-1">
                            {item.catName}
                          </h5>
                        </div>
                      </div>

                      {/* Middle: Dual Corner Matchup */}
                      <div className="flex-1 grid grid-cols-2 gap-3 w-full max-w-xl">
                        {/* Red Corner */}
                        <div className={`p-2.5 rounded-xl border flex flex-col ${
                          item.match.winner === 'merah'
                            ? 'bg-red-950/60 border-red-500 text-white font-bold'
                            : 'bg-red-950/20 border-red-900/40 text-slate-300'
                        }`}>
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-red-300 uppercase mb-0.5">
                            <span>SUDUT MERAH</span>
                            {item.match.winner === 'merah' && (
                              <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[9px]">MENANG</span>
                            )}
                          </div>
                          <span className="text-xs font-bold truncate text-white">
                            {item.match.atletMerah?.nama || 'Sudut Merah'}
                          </span>
                          <span className="text-[10px] font-mono text-red-300/80 truncate">
                            {item.match.atletMerah?.kontingen || '-'}
                          </span>
                        </div>

                        {/* Blue Corner */}
                        <div className={`p-2.5 rounded-xl border flex flex-col ${
                          item.match.winner === 'biru'
                            ? 'bg-blue-950/60 border-blue-500 text-white font-bold'
                            : 'bg-blue-950/20 border-blue-900/40 text-slate-300'
                        }`}>
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-blue-300 uppercase mb-0.5">
                            <span>SUDUT BIRU</span>
                            {item.match.winner === 'biru' && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-600 text-white text-[9px]">MENANG</span>
                            )}
                          </div>
                          <span className="text-xs font-bold truncate text-white">
                            {item.match.atletBiru?.nama || 'Sudut Biru'}
                          </span>
                          <span className="text-[10px] font-mono text-blue-300/80 truncate">
                            {item.match.atletBiru?.kontingen || '-'}
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center">
                        {/* Call / Set Live Button */}
                        {!isLive ? (
                          <button
                            onClick={() => handleCallTandingMatchToArena(item)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                            title="Panggil partai ini ke matras gelanggang sekarang (Jadikan Live Match)"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Panggil Matras</span>
                          </button>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-lg shadow-emerald-600/30">
                            <Flame className="w-3.5 h-3.5 animate-bounce" />
                            <span>SEDANG LIVE</span>
                          </span>
                        )}

                        {/* Transfer to other arena */}
                        <button
                          onClick={() => openTransferModal('tanding_cat', item.catId, `${item.match.partai} - ${item.catName}`)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors cursor-pointer"
                          title="Pindahkan atau salin partai/kategori ini ke gelanggang lain"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
                        </button>

                        {/* Edit Match */}
                        <button
                          onClick={() => {
                            playBeep('click');
                            setEditTargetId(`tanding_${item.catId}_${item.match.id}`);
                            setEditTargetType('tanding');
                            setShowEditModal(true);
                          }}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors cursor-pointer"
                          title="Edit rincian partai"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom: Continuity Progression Info Line */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <div className="flex items-center gap-2">
                        {isCompleted && winnerAthlete ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Pemenang: {winnerAthlete.nama} ({winnerAthlete.kontingen})
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Menunggu hasil pertandingan
                          </span>
                        )}
                        {nextTarget && (
                          <span className="text-cyan-300 flex items-center gap-1 ml-2">
                            <ArrowRight className="w-3 h-3 text-cyan-400" />
                            Lanjut ke <strong>{nextTarget.targetPartaiLabel} ({nextTarget.targetRoundLabel} - Sudut {nextTarget.targetSide})</strong> di <span className="underline font-bold text-white">{selectedArenaInfo?.nama}</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Gelanggang Tetap Terkunci
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* B. SENI TGR SCHEDULE VIEW */}
      {scheduleMode === 'seni' && (
        <div className="w-full max-w-7xl flex flex-col gap-5">
          {/* Stats Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Total Peserta Seni</span>
              <span className="text-2xl font-black font-mono text-white mt-1">{seniStats.total} Peserta</span>
              <span className="text-[10px] font-mono text-slate-500">Tunggal / Ganda / Regu</span>
            </div>
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/40 flex flex-col">
              <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">Sedang Tampil (LIVE)</span>
              <span className="text-2xl font-black font-mono text-purple-300 mt-1">
                {seniStats.live > 0 ? `${seniStats.live} LIVE` : 'STANDBY'}
              </span>
              <span className="text-[10px] font-mono text-purple-400/70">Di Arena {selectedArenaInfo?.kode}</span>
            </div>
            <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 flex flex-col">
              <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">Sudah Menilai</span>
              <span className="text-2xl font-black font-mono text-blue-300 mt-1">{seniStats.completed}</span>
              <span className="text-[10px] font-mono text-blue-400/70">Nilai Juri Terkunci</span>
            </div>
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/40 flex flex-col">
              <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">Sisa Antrean</span>
              <span className="text-2xl font-black font-mono text-amber-300 mt-1">{seniStats.pending} Peserta</span>
              <span className="text-[10px] font-mono text-amber-400/70">Belum Tampil</span>
            </div>
          </div>

          {/* Action & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari pesilat seni, kontingen, pool, kategori..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Kategori Filter */}
            <select
              value={seniKategoriFilter}
              onChange={e => setSeniKategoriFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:border-purple-500 focus:outline-none"
            >
              <option value="all">Semua Kategori Seni</option>
              <option value="Tunggal">Tunggal</option>
              <option value="Ganda">Ganda</option>
              <option value="Regu">Regu</option>
              <option value="Solo Kreatif">Solo Kreatif</option>
            </select>

            {/* Status Filter */}
            <select
              value={seniStatusFilter}
              onChange={e => setSeniStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono focus:border-purple-500 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="live">Sedang Live</option>
              <option value="completed">Sudah Menilai</option>
              <option value="pending">Belum Menilai</option>
            </select>

            {/* Action Buttons: Add & Renumber */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playBeep('click');
                  setEditTargetId(null);
                  setEditTargetType('seni');
                  setShowEditModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Peserta Seni</span>
              </button>

              <button
                onClick={handleRenumberSeniParticipants}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Urutkan nomor undian dan nomor partai peserta 1..N"
              >
                <Hash className="w-3.5 h-3.5 text-amber-400" />
                <span>Urutkan No. Undian</span>
              </button>
            </div>
          </div>

          {/* Seni Participants List / Table */}
          {filteredSeniPeserta.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-slate-500" />
              <h4 className="text-base font-bold text-slate-300">Belum Ada Peserta Seni di {selectedArenaInfo?.nama}</h4>
              <p className="text-xs font-mono text-slate-400 max-w-md">
                Gelanggang ini belum memiliki daftar peserta seni TGR. Anda dapat menambahkan peserta seni baru atau menyalin dari gelanggang lain.
              </p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => {
                    setEditTargetId(null);
                    setEditTargetType('seni');
                    setShowEditModal(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-mono transition-colors"
                >
                  + Tambah Peserta Seni
                </button>
                <button
                  onClick={() => setScheduleMode('distribusi')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-mono transition-colors"
                >
                  Salin / Bagi dari Gelanggang Lain
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSeniPeserta.map((p, idx) => {
                const isLive = activeArenaData.tgrState?.activePesertaId === p.id;
                const isCompleted = p.status === 'Sudah Menilai' || p.isLocked;
                const finalScore = (p as any).scores?.finalScore ?? 0;

                return (
                  <div
                    key={p.id || idx}
                    className={`rounded-2xl border p-4 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      isLive
                        ? 'border-purple-500 bg-gradient-to-r from-purple-950/40 to-slate-900/90 shadow-lg shadow-purple-500/10'
                        : isCompleted
                        ? 'border-slate-800 bg-[#06081e]/60 opacity-80'
                        : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                    }`}
                  >
                    {/* Left: Partai & Undian */}
                    <div className="flex items-center gap-3.5 min-w-[200px]">
                      <div className={`px-3 py-2 rounded-xl font-mono font-black text-center flex flex-col items-center justify-center ${
                        isLive
                          ? 'bg-purple-600 text-white animate-pulse'
                          : isCompleted
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-purple-600/30 border border-purple-500/50 text-purple-300'
                      }`}>
                        <span className="text-[9px] uppercase tracking-wider">NO.</span>
                        <span className="text-sm">
                          {p.noUrut || idx + 1}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800 uppercase">
                            {p.kategori || 'Tunggal'} {p.gender || 'Putra'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 uppercase">
                            {p.pool || 'Pool A'}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-white mt-1">
                          {p.partai || `PARTAI ${p.noUrut || idx + 1}`}
                        </h5>
                      </div>
                    </div>

                    {/* Middle: Pesilat & Kontingen */}
                    <div className="flex-1 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 w-full max-w-xl">
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {p.nama}
                        </h4>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                          Kontingen: <strong className="text-slate-200">{p.kontingen}</strong> • Usia: {p.usia || 'Dewasa'}
                        </p>
                      </div>

                      {/* Score or Status Pill */}
                      <div>
                        {isCompleted ? (
                          <div className="text-right">
                            <span className="text-[10px] font-mono text-emerald-400 block font-bold">NILAI AKHIR</span>
                            <span className="text-lg font-black font-mono text-emerald-300">
                              {finalScore ? finalScore.toFixed(3) : '-'}
                            </span>
                          </div>
                        ) : isLive ? (
                          <span className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-lg shadow-purple-600/30">
                            <Flame className="w-3.5 h-3.5 animate-bounce" />
                            <span>SEDANG TAMPIL</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-xs font-mono">
                            Belum Menilai
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center">
                      {/* Call / Set Live Button */}
                      {!isLive && (
                        <button
                          onClick={() => handleCallSeniPesertaToArena(p)}
                          className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600 border border-purple-500/50 text-purple-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Panggil peserta seni ini ke arena sekarang (Jadikan Live Active)"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Panggil Arena</span>
                        </button>
                      )}

                      {/* Transfer to other arena */}
                      <button
                        onClick={() => openTransferModal('seni_peserta', p.id, `${p.nama} (${p.kontingen})`)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors cursor-pointer"
                        title="Pindahkan atau salin peserta seni ini ke gelanggang lain"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-cyan-400" />
                      </button>

                      {/* Edit Peserta */}
                      <button
                        onClick={() => {
                          playBeep('click');
                          setEditTargetId(`seni_${p.id}`);
                          setEditTargetType('seni');
                          setShowEditModal(true);
                        }}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors cursor-pointer"
                        title="Edit rincian peserta seni"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* C. DISTRIBUSI & PEMBAGIAN JADWAL ANTAR GELANGGANG */}
      {scheduleMode === 'distribusi' && (
        <div className="w-full max-w-7xl flex flex-col gap-6">
          <div className="p-6 rounded-2xl border border-blue-500/30 bg-[#070f33]/90 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500 flex items-center justify-center text-blue-300">
                <Shuffle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-black text-white uppercase tracking-wider">
                  DISTRIBUSI & PEMBAGIAN JADWAL OTOMATIS ANTAR GELANGGANG
                </h4>
                <p className="text-xs font-mono text-slate-400">
                  Bagi partai tanding atau peserta seni dari satu gelanggang master ke beberapa gelanggang secara merata atau bergantian.
                </p>
              </div>
            </div>

            {distSuccessMsg && (
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500 text-emerald-200 text-xs font-mono flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{distSuccessMsg}</span>
              </div>
            )}

            {excelDistSuccess && (
              <div className="p-4 rounded-xl bg-emerald-950/70 border-2 border-emerald-400 text-emerald-200 text-xs font-mono flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{excelDistSuccess}</span>
              </div>
            )}

            {/* A. DIRECT EXCEL UPLOAD & AUTO DISTRIBUTION TO ALL ARENAS */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border-2 border-blue-500/50 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-md">
                    <FileSpreadsheet className="w-5 h-5 text-slate-950" />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <span>UPLOAD EXCEL & DISTRIBUSI OTOMATIS KE GELANGGANG AKTIF</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-emerald-500 text-slate-950 font-black">
                        SMART ALGORITHM
                      </span>
                    </h5>
                    <p className="text-xs font-mono text-slate-400">
                      Otomatis memisahkan kontingen, mengelompokkan kelas & usia, serta membagi kategori tanding dan seni ke seluruh gelanggang aktif.
                    </p>
                  </div>
                </div>

                <label className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/30 transition-all shrink-0">
                  <Upload className="w-4 h-4 text-slate-950" />
                  <span>{excelLoading ? 'MEMPROSES EXCEL...' : 'PILIH FILE EXCEL (.XLSX)'}</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    disabled={excelLoading}
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleExcelUploadAndDistribute(file);
                    }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-300">
                <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                  <span><strong>Pemisahan Kontingen:</strong> Atlet satu kontingen tidak akan bertemu di babak awal.</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
                  <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                  <span><strong>Klasifikasi Kelas & Usia:</strong> Dikelompokkan otomatis per bagan kompetisi.</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
                  <Tv className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span><strong>Sinkronisasi Monitor:</strong> Monitor partai langsung mendeteksi mode aktif gelanggang.</span>
                </div>
              </div>
            </div>

            {/* B. MANUAL DISTRIBUTION BETWEEN ARENAS */}
            <div className="pt-2">
              <h5 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider mb-3">
                Atau Pembagian Manual Antar Gelanggang yang Ada:
              </h5>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. GELANGGANG SUMBER */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase">
                  1. Pilih Gelanggang Sumber (Master / Asal Jadwal):
                </label>
                <select
                  value={distSourceArenaId}
                  onChange={e => setDistSourceArenaId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                >
                  {arenasList.map(a => {
                    const tCount = flattenAllBaganMatches(allArenasMap[a.id]?.state?.baganCategories || []).length;
                    const sCount = allArenasMap[a.id]?.tgrState?.pesertaList?.length || 0;
                    return (
                      <option key={a.id} value={a.id}>
                        {a.nama} ({tCount} Tanding, {sCount} Seni)
                      </option>
                    );
                  })}
                </select>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 space-y-1">
                  <span className="text-slate-400 block">Ketersediaan Jadwal Sumber:</span>
                  <div className="flex items-center justify-between">
                    <span>Partai Tanding:</span>
                    <strong className="text-amber-400">
                      {flattenAllBaganMatches(allArenasMap[distSourceArenaId]?.state?.baganCategories || []).length} Partai
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Peserta Seni:</span>
                    <strong className="text-purple-400">
                      {allArenasMap[distSourceArenaId]?.tgrState?.pesertaList?.length || 0} Peserta
                    </strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
                    Tipe Jadwal yang Dibagi:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDistType('tanding')}
                      className={`py-2 rounded-xl text-xs font-mono font-bold uppercase border transition-all cursor-pointer ${
                        distType === 'tanding'
                          ? 'bg-amber-600 text-white border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Tanding Saja
                    </button>
                    <button
                      type="button"
                      onClick={() => setDistType('seni')}
                      className={`py-2 rounded-xl text-xs font-mono font-bold uppercase border transition-all cursor-pointer ${
                        distType === 'seni'
                          ? 'bg-purple-600 text-white border-purple-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Seni Saja
                    </button>
                    <button
                      type="button"
                      onClick={() => setDistType('all')}
                      className={`py-2 rounded-xl text-xs font-mono font-bold uppercase border transition-all cursor-pointer ${
                        distType === 'all'
                          ? 'bg-blue-600 text-white border-blue-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Semua
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. GELANGGANG TUJUAN & METODE */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase">
                  2. Pilih Gelanggang Tujuan Distribusi:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {arenasList.map(a => {
                    const isChecked = distTargetArenaIds.includes(a.id);
                    return (
                      <label
                        key={a.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-blue-950/40 border-blue-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setDistTargetArenaIds(distTargetArenaIds.filter(id => id !== a.id));
                              } else {
                                setDistTargetArenaIds([...distTargetArenaIds, a.id]);
                              }
                            }}
                            className="accent-blue-500"
                          />
                          <span className="text-xs font-mono font-bold">{a.nama} ({a.kode})</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {a.modeAktif}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
                    Metode Pembagian:
                  </label>
                  <select
                    value={distMethod}
                    onChange={e => setDistMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-blue-500 focus:outline-none"
                  >
                    <option value="round_robin">Round-Robin (Bagi Bergantian Ganjil-Genap Merata)</option>
                    <option value="even_split">Bagi Berurutan Blok per Gelanggang</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Preview Calculation */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs font-mono text-slate-300">
                <span>Rencana Distribusi: Membagi ke <strong>{distTargetArenaIds.length} Gelanggang</strong> tujuan terpilih.</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Setiap gelanggang target akan menerima estimasi ~{distTargetArenaIds.length ? Math.ceil((flattenAllBaganMatches(allArenasMap[distSourceArenaId]?.state?.baganCategories || []).length) / distTargetArenaIds.length) : 0} partai tanding.
                </span>
              </div>

              <button
                type="button"
                onClick={handleApplyScheduleDistribution}
                className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-mono font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Shuffle className="w-4 h-4" />
                <span>Terapkan Distribusi Jadwal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: TRANSFER PARTAI / PESERTA ANTAR GELANGGANG */}
      <AnimatePresence>
        {transferModalOpen && transferTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-[#070d28] p-6 shadow-2xl text-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center text-white">
                    <ArrowLeftRight className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    PINDAH / SALIN JADWAL
                  </h3>
                </div>
                <button
                  onClick={() => setTransferModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
                  <span className="text-slate-400 block">Item yang Dipindahkan:</span>
                  <strong className="text-white text-sm block mt-0.5">{transferTarget.title}</strong>
                  <span className="text-slate-500 text-[10px] block mt-1">
                    Dari: {arenasList.find(a => a.id === transferTarget.sourceArenaId)?.nama}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Pilih Gelanggang Tujuan:
                  </label>
                  <select
                    value={transferDestinationArenaId}
                    onChange={e => setTransferDestinationArenaId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                  >
                    {arenasList.map(a => (
                      <option key={a.id} value={a.id} disabled={a.id === transferTarget.sourceArenaId}>
                        {a.nama} ({a.kode}) {a.id === transferTarget.sourceArenaId ? '(Gelanggang Saat Ini)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transferIsCopy}
                    onChange={e => setTransferIsCopy(e.target.checked)}
                    className="accent-cyan-500"
                  />
                  <div className="text-xs font-mono">
                    <strong className="text-white block">Salin (Duplikasi)</strong>
                    <span className="text-[10px] text-slate-400">Pertahankan juga di gelanggang asal tanpa menghapusnya</span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteTransfer}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-600/30 transition-all cursor-pointer"
                >
                  Konfirmasi Pindah
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. MODAL: EDIT JADWAL & PARTAI / PESERTA */}
      {showEditModal && (
        <EditJadwalPartaiModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          categories={tandingCategories}
          onSaveCategories={(updatedCategories) => {
            dispatch('UPDATE_BAGAN_CATEGORIES', {
              arenaId: selectedArenaId,
              categories: updatedCategories
            });
          }}
          tgrState={activeArenaData.tgrState}
          onSaveTgrPeserta={(updatedPeserta) => {
            dispatch('TGR_UPDATE_PESERTA', {
              arenaId: selectedArenaId,
              action: 'sync_list',
              pesertaList: updatedPeserta
            });
          }}
          targetMatchId={editTargetId}
          targetType={editTargetType}
        />
      )}
    </div>
  );
}
