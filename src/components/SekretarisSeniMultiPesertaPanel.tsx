/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Users, Play, Plus, Trash2, Edit3, ArrowLeft, ArrowUp, ArrowDown, 
  Sparkles, CheckCircle2, RefreshCw, Lock, Unlock, Download, FileSpreadsheet,
  AlertCircle, Search, ChevronRight, Layers, Eye, Settings, Clock, Star,
  Award, Shield, FileText, CheckSquare, Maximize2, Minimize2, Sun, Moon
} from 'lucide-react';
import { TGRState, TGRPeserta, TGRPartaiPool, MatchState } from '../types';
import { playBeep } from '../utils/sound';
import { jsPDF } from 'jspdf';
import safeHtml2canvas from '../utils/safeHtml2canvas';

interface SekretarisSeniMultiPesertaPanelProps {
  tgrState: TGRState;
  state?: MatchState;
  dispatch: (type: string, payload?: any) => Promise<any>;
  onClose: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export default function SekretarisSeniMultiPesertaPanel({
  tgrState,
  state,
  dispatch,
  onClose,
  theme = 'dark',
  onToggleTheme
}: SekretarisSeniMultiPesertaPanelProps) {
  // Preset configuration state
  const [presetPerPartai, setPresetPerPartai] = useState<number>(() => {
    return tgrState.jumlahPesertaPerPartai || 4;
  });

  const [selectedKategoriFilter, setSelectedKategoriFilter] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedPartaiId, setSelectedPartaiId] = useState<string | null>(null);

  // Modal states
  const [showAddPesertaModal, setShowAddPesertaModal] = useState(false);
  const [showAddPartaiModal, setShowAddPartaiModal] = useState(false);
  const [showAutoGroupModal, setShowAutoGroupModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingPeserta, setEditingPeserta] = useState<TGRPeserta | null>(null);

  // Form states for Peserta
  const [formNama, setFormNama] = useState('');
  const [formKontingen, setFormKontingen] = useState('');
  const [formKategori, setFormKategori] = useState('Tunggal');
  const [formGender, setFormGender] = useState<'Putra' | 'Putri'>('Putra');
  const [formUsia, setFormUsia] = useState('Dewasa');
  const [formTargetPartai, setFormTargetPartai] = useState<number>(1);
  const [formPoolName, setFormPoolName] = useState('Pool A');

  // Form state for New Partai
  const [newPartaiNum, setNewPartaiNum] = useState<number>(1);
  const [newPartaiKategori, setNewPartaiKategori] = useState('Tunggal');
  const [newPartaiGender, setNewPartaiGender] = useState<'Putra' | 'Putri'>('Putra');
  const [newPartaiUsia, setNewPartaiUsia] = useState('Dewasa');
  const [newPartaiPoolName, setNewPartaiPoolName] = useState('Pool A');
  const [newPartaiBabak, setNewPartaiBabak] = useState('Penyisihan');

  // Build or derive current pool parties
  // If participant already has partai/partaiNumber, group by partaiNumber
  // Otherwise, group by sequential order based on presetPerPartai
  const derivedPartaiList: {
    partaiNumber: number;
    partaiLabel: string;
    kategori: string;
    gender: 'Putra' | 'Putri';
    usia: string;
    poolName: string;
    babak: string;
    pesertaList: TGRPeserta[];
    isLive: boolean;
    isCompleted: boolean;
  }[] = useMemo(() => {
    const rawList = tgrState.pesertaList || [];
    
    // Group participants by partai or auto-chunk by presetPerPartai
    const groupsMap = new Map<number, TGRPeserta[]>();

    // Check if participants have explicit partaiNumber assigned
    const hasExplicitPartai = rawList.some(p => p.partaiNumber !== undefined || (p.partai && p.partai.trim() !== ''));

    if (hasExplicitPartai) {
      rawList.forEach((p, idx) => {
        let pNum = p.partaiNumber;
        if (!pNum && p.partai) {
          pNum = parseInt(p.partai.replace(/\D/g, ''), 10) || 1;
        }
        if (!pNum) {
          pNum = Math.floor(idx / presetPerPartai) + 1;
        }
        if (!groupsMap.has(pNum)) {
          groupsMap.set(pNum, []);
        }
        groupsMap.get(pNum)!.push(p);
      });
    } else {
      // Auto chunk by presetPerPartai
      rawList.forEach((p, idx) => {
        const pNum = Math.floor(idx / presetPerPartai) + 1;
        if (!groupsMap.has(pNum)) {
          groupsMap.set(pNum, []);
        }
        groupsMap.get(pNum)!.push(p);
      });
    }

    const result: {
      partaiNumber: number;
      partaiLabel: string;
      kategori: string;
      gender: 'Putra' | 'Putri';
      usia: string;
      poolName: string;
      babak: string;
      pesertaList: TGRPeserta[];
      isLive: boolean;
      isCompleted: boolean;
    }[] = [];

    // Sort partai numbers
    const sortedPNums = Array.from(groupsMap.keys()).sort((a, b) => a - b);

    sortedPNums.forEach((pNum) => {
      const pList = groupsMap.get(pNum)!;
      // Sort participants by noUndian or noUrut
      pList.sort((a, b) => (a.noUndian || a.noUrut || 0) - (b.noUndian || b.noUrut || 0));

      const firstP = pList[0];
      const kategori = firstP?.kategori || 'Tunggal';
      const gender = firstP?.gender || 'Putra';
      const usia = firstP?.usia || 'Dewasa';
      const poolName = firstP?.pool || `Pool ${String.fromCharCode(64 + pNum)}`;
      const babak = tgrState.babak || 'Penyisihan';

      const isLive = pList.some(p => p.id === tgrState.activePesertaId);
      const isCompleted = pList.length > 0 && pList.every(p => p.finalScore !== undefined || p.status === 'Sudah Menilai');

      result.push({
        partaiNumber: pNum,
        partaiLabel: `Partai ${pNum.toString().padStart(2, '0')}`,
        kategori,
        gender,
        usia,
        poolName,
        babak,
        pesertaList: pList,
        isLive,
        isCompleted
      });
    });

    return result;
  }, [tgrState.pesertaList, presetPerPartai, tgrState.activePesertaId, tgrState.babak]);

  // Filtered by Category & Search
  const filteredPartaiList = useMemo(() => {
    return derivedPartaiList.filter(item => {
      if (selectedKategoriFilter !== 'all') {
        const matchKategori = item.kategori.toLowerCase().includes(selectedKategoriFilter.toLowerCase());
        if (!matchKategori) return false;
      }
      if (searchKeyword.trim() !== '') {
        const kw = searchKeyword.toLowerCase();
        const inPartai = item.partaiLabel.toLowerCase().includes(kw);
        const inPool = item.poolName.toLowerCase().includes(kw);
        const inPeserta = item.pesertaList.some(p => 
          p.nama.toLowerCase().includes(kw) || p.kontingen.toLowerCase().includes(kw)
        );
        if (!inPartai && !inPool && !inPeserta) return false;
      }
      return true;
    });
  }, [derivedPartaiList, selectedKategoriFilter, searchKeyword]);

  // Active Peserta Object
  const activePeserta = useMemo(() => {
    return (tgrState.pesertaList || []).find(p => p.id === tgrState.activePesertaId) || null;
  }, [tgrState.pesertaList, tgrState.activePesertaId]);

  // Find active Partai based on active Peserta
  const activePartaiGroup = useMemo(() => {
    if (!activePeserta) return derivedPartaiList[0] || null;
    return derivedPartaiList.find(grp => grp.pesertaList.some(p => p.id === activePeserta.id)) || null;
  }, [derivedPartaiList, activePeserta]);

  // Handle Set Active Performer (Set Live)
  const handleSetActivePeserta = async (pesertaId: string) => {
    playBeep('valid');
    await dispatch('TGR_SET_ACTIVE_PESERTA', { pesertaId });
  };

  // Handle Next Performer within Current Match / Pool
  const handleNextPerformerInPool = async () => {
    playBeep('click');
    if (!activePartaiGroup || !activePeserta) return;

    const list = activePartaiGroup.pesertaList;
    const curIdx = list.findIndex(p => p.id === activePeserta.id);

    if (curIdx !== -1 && curIdx + 1 < list.length) {
      // Advance to next participant in the same partai
      const nextP = list[curIdx + 1];
      await dispatch('TGR_SET_ACTIVE_PESERTA', { pesertaId: nextP.id });
    } else {
      // If at the end of this partai, move to first participant of next partai
      const allPartai = derivedPartaiList;
      const curPartaiIdx = allPartai.findIndex(grp => grp.partaiNumber === activePartaiGroup.partaiNumber);
      if (curPartaiIdx !== -1 && curPartaiIdx + 1 < allPartai.length) {
        const nextPartai = allPartai[curPartaiIdx + 1];
        if (nextPartai.pesertaList.length > 0) {
          await dispatch('TGR_SET_ACTIVE_PESERTA', { pesertaId: nextPartai.pesertaList[0].id });
        }
      } else {
        alert("Semua peserta dalam partai seni telah selesai!");
      }
    }
  };

  // Handle Prev Performer
  const handlePrevPerformerInPool = async () => {
    playBeep('click');
    if (!activePartaiGroup || !activePeserta) return;

    const list = activePartaiGroup.pesertaList;
    const curIdx = list.findIndex(p => p.id === activePeserta.id);

    if (curIdx > 0) {
      const prevP = list[curIdx - 1];
      await dispatch('TGR_SET_ACTIVE_PESERTA', { pesertaId: prevP.id });
    } else {
      const allPartai = derivedPartaiList;
      const curPartaiIdx = allPartai.findIndex(grp => grp.partaiNumber === activePartaiGroup.partaiNumber);
      if (curPartaiIdx > 0) {
        const prevPartai = allPartai[curPartaiIdx - 1];
        if (prevPartai.pesertaList.length > 0) {
          const lastP = prevPartai.pesertaList[prevPartai.pesertaList.length - 1];
          await dispatch('TGR_SET_ACTIVE_PESERTA', { pesertaId: lastP.id });
        }
      }
    }
  };

  // Auto-Group all participants into Parties of N participants
  const handleApplyAutoGroup = async (targetSize: number) => {
    playBeep('valid');
    const all = [...(tgrState.pesertaList || [])];
    if (all.length === 0) {
      alert("Belum ada peserta seni terdaftar.");
      return;
    }

    const updatedList: TGRPeserta[] = [];
    all.forEach((p, idx) => {
      const pNum = Math.floor(idx / targetSize) + 1;
      const orderInPartai = (idx % targetSize) + 1;
      const poolLetter = String.fromCharCode(65 + Math.floor((pNum - 1) % 26));

      updatedList.push({
        ...p,
        partaiNumber: pNum,
        partai: `PARTAI ${pNum}`,
        noUndian: orderInPartai,
        pool: `Pool ${poolLetter}`
      });
    });

    await dispatch('TGR_UPDATE_PESERTA', {
      action: 'sync_list',
      pesertaList: updatedList
    });

    await dispatch('TGR_UPDATE_EVENT_INFO', {
      jumlahPesertaPerPartai: targetSize
    });

    setPresetPerPartai(targetSize);
    setShowAutoGroupModal(false);
    alert(`Berhasil membagi ${all.length} atlet ke dalam format ${targetSize} peserta per partai seni!`);
  };

  // Re-order participant inside a partai
  const handleMovePesertaInPartai = async (pesertaId: string, direction: 'up' | 'down') => {
    playBeep('click');
    const all = [...(tgrState.pesertaList || [])];
    const targetP = all.find(p => p.id === pesertaId);
    if (!targetP) return;

    const pNum = targetP.partaiNumber || 1;
    const samePartai = all.filter(p => (p.partaiNumber || 1) === pNum);
    samePartai.sort((a, b) => (a.noUndian || a.noUrut || 0) - (b.noUndian || b.noUrut || 0));

    const idx = samePartai.findIndex(p => p.id === pesertaId);
    if (direction === 'up' && idx > 0) {
      const swapTarget = samePartai[idx - 1];
      const tempUndian = targetP.noUndian || idx + 1;
      targetP.noUndian = swapTarget.noUndian || idx;
      swapTarget.noUndian = tempUndian;
    } else if (direction === 'down' && idx < samePartai.length - 1) {
      const swapTarget = samePartai[idx + 1];
      const tempUndian = targetP.noUndian || idx + 1;
      targetP.noUndian = swapTarget.noUndian || idx + 2;
      swapTarget.noUndian = tempUndian;
    }

    await dispatch('TGR_UPDATE_PESERTA', {
      action: 'sync_list',
      pesertaList: all
    });
  };

  // Change participant's partai assignment
  const handleChangePesertaPartai = async (pesertaId: string, newPartai: number) => {
    playBeep('click');
    const all = [...(tgrState.pesertaList || [])];
    const p = all.find(x => x.id === pesertaId);
    if (!p) return;

    const existingInNewPartai = all.filter(x => (x.partaiNumber || 1) === newPartai);
    const newUndian = existingInNewPartai.length + 1;
    const poolLetter = String.fromCharCode(65 + Math.floor((newPartai - 1) % 26));

    p.partaiNumber = newPartai;
    p.partai = `PARTAI ${newPartai}`;
    p.noUndian = newUndian;
    p.pool = `Pool ${poolLetter}`;

    await dispatch('TGR_UPDATE_PESERTA', {
      action: 'sync_list',
      pesertaList: all
    });
  };

  // Add new participant directly into a partai
  const handleSaveAddPeserta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim() || !formKontingen.trim()) {
      alert("Nama dan kontingen wajib diisi!");
      return;
    }

    playBeep('valid');
    const all = tgrState.pesertaList || [];
    const samePartai = all.filter(x => (x.partaiNumber || 1) === formTargetPartai);
    const undian = samePartai.length + 1;

    const newPeserta: TGRPeserta = {
      id: `seni_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      noUrut: all.length + 1,
      noUndian: undian,
      partaiNumber: formTargetPartai,
      partai: `PARTAI ${formTargetPartai}`,
      pool: formPoolName || `Pool ${String.fromCharCode(65 + Math.floor((formTargetPartai - 1) % 26))}`,
      nama: formNama.trim(),
      kontingen: formKontingen.trim(),
      kategori: formKategori,
      gender: formGender,
      usia: formUsia,
      status: 'Belum Menilai',
      scores: {},
      kebenaranScores: {},
      isLocked: false,
      decisions: [],
      deductions: 0,
      deductionReasons: [],
      dewanDecisionScore: 0,
      finalizedJuries: []
    };

    await dispatch('TGR_UPDATE_PESERTA', {
      action: 'add',
      peserta: newPeserta
    });

    setFormNama('');
    setFormKontingen('');
    setShowAddPesertaModal(false);
  };

  // Delete Peserta
  const handleDeletePeserta = async (pesertaId: string) => {
    if (!confirm("Hapus peserta seni ini?")) return;
    playBeep('click');
    await dispatch('TGR_UPDATE_PESERTA', {
      action: 'delete',
      pesertaId
    });
  };

  // Export PDF Rekapitulasi Seni Multi-Peserta
  const handleExportPdf = () => {
    playBeep('click');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const title = tgrState.namaEvent || "KEJUARAAN PENCAK SILAT IPSI";
    const sub = `REKAPITULASI HASIL SENI - SISTEM POOL (MULTI-PESERTA)`;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title.toUpperCase(), 148, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.text(sub, 148, 22, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Gelanggang: ${tgrState.gelanggang} | Format: ${presetPerPartai} Peserta/Partai | Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 148, 28, { align: 'center' });
    doc.line(15, 31, 282, 31);

    let startY = 36;

    derivedPartaiList.forEach((grp) => {
      if (startY > 175) {
        doc.addPage();
        startY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setFillColor(240, 240, 240);
      doc.rect(15, startY - 4, 267, 7, 'F');
      doc.text(`${grp.partaiLabel} - ${grp.kategori.toUpperCase()} ${grp.gender.toUpperCase()} (${grp.poolName}) - [${grp.pesertaList.length} Peserta]`, 18, startY);
      startY += 6;

      // Table headers
      doc.setFontSize(8);
      doc.setFillColor(220, 220, 220);
      doc.rect(15, startY - 3, 267, 5, 'F');
      doc.text("No. Undian", 18, startY);
      doc.text("Nama Peserta", 45, startY);
      doc.text("Kontingen", 115, startY);
      doc.text("Skor Akhir", 175, startY);
      doc.text("Hukuman", 205, startY);
      doc.text("Ranking", 235, startY);
      doc.text("Status", 260, startY);
      startY += 5;

      doc.setFont("helvetica", "normal");
      grp.pesertaList.forEach((p, pIdx) => {
        const scoreStr = p.finalScore !== undefined ? p.finalScore.toFixed(3) : '-';
        const rankStr = p.ranking !== undefined ? `Peringkat ${p.ranking}` : '-';
        const penStr = p.deductions ? p.deductions.toFixed(3) : '0.000';

        doc.text(String(p.noUndian || pIdx + 1), 22, startY);
        doc.text(p.nama, 45, startY);
        doc.text(p.kontingen, 115, startY);
        doc.text(scoreStr, 175, startY);
        doc.text(penStr, 205, startY);
        doc.text(rankStr, 235, startY);
        doc.text(p.status, 260, startY);
        startY += 5;
      });

      startY += 4;
    });

    doc.save(`Rekapitulasi_Seni_Pool_${Date.now()}.pdf`);
  };

  return (
    <div className={`w-full h-full flex flex-col justify-between p-3 select-none transition-colors duration-300 font-sans ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      
      {/* 1. TOP HEADER BAR */}
      <div className={`flex justify-between items-center pb-2.5 border px-4 py-2 rounded-xl shadow-lg flex-shrink-0 ${
        theme === 'dark' 
          ? 'border-purple-900/60 bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 text-slate-100' 
          : 'border-purple-200 bg-gradient-to-r from-purple-50 via-white to-indigo-50 text-slate-800'
      }`}>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => { playBeep('click'); onClose(); }}
            className={`px-3 py-1 text-xs cursor-pointer rounded-lg transition-all font-black uppercase flex items-center gap-1.5 shadow-sm ${
              theme === 'dark' 
                ? 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200' 
                : 'bg-white hover:bg-slate-100 border border-slate-300 text-slate-700'
            }`}
            title="Kembali ke Sekretaris Utama"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  PANEL SEKRETARIS UTAMA • MANAJEMEN SENI (SISTEM POOL)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-700/50 font-bold">
                  3-4+ Peserta / Partai
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                {tgrState.namaEvent} • {tgrState.gelanggang} • Total {tgrState.pesertaList?.length || 0} Atlet Terdaftar
              </p>
            </div>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick Preset Selector */}
          <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 px-1">Format:</span>
            {[
              { label: '3 Peserta', count: 3 },
              { label: '4 Peserta', count: 4 },
              { label: '2 Peserta (Duel)', count: 2 },
              { label: 'Pool 6', count: 6 },
            ].map(preset => (
              <button
                key={preset.count}
                type="button"
                onClick={() => handleApplyAutoGroup(preset.count)}
                className={`px-2 py-1 rounded text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                  presetPerPartai === preset.count
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={`Atur otomatis semua partai menjadi ${preset.count} peserta per partai`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => { playBeep('click'); setShowAutoGroupModal(true); }}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase flex items-center gap-1 shadow-sm cursor-pointer"
            title="Pengaturan Pembagian Partai Otomatis (Auto-Group)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Bagi Partai Otomatis</span>
          </button>

          <button
            type="button"
            onClick={() => { playBeep('click'); setShowAddPesertaModal(true); }}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase flex items-center gap-1 shadow-sm cursor-pointer"
            title="Tambah Peserta Baru ke Partai"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Peserta</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold uppercase flex items-center gap-1 border border-slate-700 cursor-pointer shadow-sm"
            title="Cetak Rekapitulasi Seni PDF"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Cetak Rekap</span>
          </button>
        </div>
      </div>

      {/* 2. LIVE ACTIVE MATCH DECK (Floating Top Controller) */}
      <div className={`my-2 p-3 rounded-xl border shadow-lg transition-all ${
        theme === 'dark' 
          ? 'bg-gradient-to-r from-slate-900/90 via-purple-950/30 to-slate-900/90 border-purple-800/40' 
          : 'bg-gradient-to-r from-white via-purple-50/50 to-white border-purple-200'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          
          {/* Left: Active Partai & Category Information */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 flex flex-col items-center justify-center min-w-[70px]">
              <span className="text-[9px] uppercase font-mono font-bold text-slate-400">PARTAI AKTIF</span>
              <span className="text-lg font-black font-mono text-amber-400">
                {activePartaiGroup ? activePartaiGroup.partaiLabel : tgrState.partai || 'P01'}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-white tracking-wide">
                  {activePartaiGroup?.kategori || 'Seni Tunggal'} {activePartaiGroup?.gender || 'Putra'} ({activePartaiGroup?.poolName || 'Pool A'})
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {activePartaiGroup?.pesertaList?.length || 0} Peserta dalam Partai ini
                </span>
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1.5">
                <span className="text-slate-400">Sedang Tampil di Arena:</span>
                <span className="font-black text-amber-300 font-mono">
                  {activePeserta ? `[Undian ${activePeserta.noUndian || activePeserta.noUrut}] ${activePeserta.nama} (${activePeserta.kontingen})` : 'Belum Ada Peserta Dipilih'}
                </span>
                {activePeserta?.finalScore !== undefined && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono font-black bg-amber-500/20 text-amber-300 rounded border border-amber-500/40">
                    Skor: {activePeserta.finalScore.toFixed(3)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Center: Interactive Performer Steps (All 3, 4, or more participants in active match) */}
          {activePartaiGroup && (
            <div className="flex-1 max-w-xl w-full flex items-center gap-1.5 overflow-x-auto py-1 px-2 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="text-[9px] uppercase font-mono font-bold text-slate-500 flex-shrink-0">Urutan Tampil:</span>
              {activePartaiGroup.pesertaList.map((p, idx) => {
                const isActive = p.id === tgrState.activePesertaId;
                const isDone = p.finalScore !== undefined;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSetActivePeserta(p.id)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 flex-shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-md scale-105 font-black ring-2 ring-amber-400'
                        : isDone
                        ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300 hover:bg-emerald-900/60'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                    title={`Klik untuk tampilkan ${p.nama} (${p.kontingen})`}
                  >
                    <span className="font-mono">{p.noUndian || idx + 1}.</span>
                    <span className="truncate max-w-[90px]">{p.nama.split(' ')[0]}</span>
                    {isDone && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Right: Live Controller Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handlePrevPerformerInPool}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase flex items-center gap-1 border border-slate-700 cursor-pointer"
              title="Peserta Sebelumnya"
            >
              <span>◀ Peserta Sblm</span>
            </button>
            <button
              type="button"
              onClick={handleNextPerformerInPool}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase flex items-center gap-1.5 shadow-md cursor-pointer"
              title="Lanjut ke Peserta Berikutnya dalam Partai ini"
            >
              <span>Peserta Lanjut ▶</span>
            </button>
          </div>

        </div>
      </div>

      {/* 3. MAIN BODY: LIST OF ALL PARTAI SENI WITH 3-4+ PARTICIPANTS */}
      <div className="flex-1 min-h-0 flex flex-col my-1 bg-slate-900/20 p-2.5 rounded-xl border border-slate-800/80 overflow-hidden">
        
        {/* Filter and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black uppercase text-emerald-400 font-mono flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              DAFTAR PARTAI SENI POOL ({filteredPartaiList.length} PARTAI / {tgrState.pesertaList?.length || 0} PESERTA)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Category */}
            <select
              value={selectedKategoriFilter}
              onChange={(e) => setSelectedKategoriFilter(e.target.value)}
              className="text-[11px] bg-slate-950 border border-slate-800 px-2 py-1 rounded-md text-slate-300 font-bold outline-none"
            >
              <option value="all">Semua Kategori Seni</option>
              <option value="tunggal">Seni Tunggal</option>
              <option value="ganda">Seni Ganda</option>
              <option value="regu">Seni Regu</option>
              <option value="solo">Solo Kreatif</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari partai, atlet, kontingen..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="text-[11px] bg-slate-950 border border-slate-800 pl-7 pr-2 py-1 rounded-md text-white font-medium outline-none w-44 focus:w-60 transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
            </div>
          </div>
        </div>

        {/* Scrollable List of Partai Cards */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredPartaiList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
              Belum ada data partai seni. Klik "Bagi Partai Otomatis" atau "+ Peserta" untuk menambahkan data.
            </div>
          ) : (
            filteredPartaiList.map((grp) => {
              const isMatchLive = grp.isLive;

              return (
                <div 
                  key={grp.partaiNumber}
                  className={`rounded-xl border shadow-md transition-all overflow-hidden ${
                    isMatchLive 
                      ? 'border-amber-500/70 bg-slate-900/90 ring-1 ring-amber-500/30' 
                      : 'border-slate-800/80 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  {/* Partai Card Header */}
                  <div className={`flex flex-wrap items-center justify-between px-3.5 py-2 border-b ${
                    isMatchLive 
                      ? 'bg-gradient-to-r from-amber-950/60 to-purple-950/40 border-amber-500/30' 
                      : 'bg-slate-900/60 border-slate-800/80'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`font-mono font-black text-sm px-2 py-0.5 rounded-md ${
                        isMatchLive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400'
                      }`}>
                        {grp.partaiLabel}
                      </span>
                      <div>
                        <span className="font-extrabold text-xs text-white uppercase tracking-wider">
                          {grp.kategori} {grp.gender} • {grp.poolName}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-2 font-mono">
                          ({grp.babak} - {grp.usia})
                        </span>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-mono">
                        {grp.pesertaList.length} Peserta
                      </span>
                      {isMatchLive && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                          ● LIVE DI ARENA
                        </span>
                      )}
                      {grp.isCompleted && !isMatchLive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                          ✓ Selesai Dinilai
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (grp.pesertaList.length > 0) {
                            handleSetActivePeserta(grp.pesertaList[0].id);
                          }
                        }}
                        className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer shadow"
                        title="Muat partai ini ke penilaian juri & monitor"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Muat Partai Ini</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFormTargetPartai(grp.partaiNumber);
                          setFormPoolName(grp.poolName);
                          setFormKategori(grp.kategori);
                          setFormGender(grp.gender);
                          setFormUsia(grp.usia);
                          setShowAddPesertaModal(true);
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase flex items-center gap-1 border border-slate-700 cursor-pointer"
                        title="Tambah Peserta ke Partai Ini"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Peserta</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-Participant Table inside this Partai */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-slate-950/80 text-slate-400 text-[10px] uppercase font-mono border-b border-slate-800">
                          <th className="py-2 px-3 w-12 text-center">Undian</th>
                          <th className="py-2 px-3">Nama Peserta / Regu</th>
                          <th className="py-2 px-3">Kontingen</th>
                          <th className="py-2 px-2 text-center w-24">Status</th>
                          <th className="py-2 px-3 text-center w-24">Skor Akhir</th>
                          <th className="py-2 px-2 text-center w-20">Hukuman</th>
                          <th className="py-2 px-2 text-center w-24">Ranking Pool</th>
                          <th className="py-2 px-3 text-center w-36">Kontrol / Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/60">
                        {grp.pesertaList.map((p, idx) => {
                          const isCurrentlyPerforming = p.id === tgrState.activePesertaId;
                          const isFirst = idx === 0;
                          const isLast = idx === grp.pesertaList.length - 1;

                          return (
                            <tr 
                              key={p.id}
                              className={`transition-colors ${
                                isCurrentlyPerforming 
                                  ? 'bg-amber-950/30 font-bold' 
                                  : 'hover:bg-slate-900/40'
                              }`}
                            >
                              {/* No Undian */}
                              <td className="py-2 px-3 text-center font-mono font-black text-amber-400">
                                {p.noUndian || idx + 1}
                              </td>

                              {/* Nama */}
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-bold ${isCurrentlyPerforming ? 'text-amber-300' : 'text-slate-100'}`}>
                                    {p.nama}
                                  </span>
                                  {isCurrentlyPerforming && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-black font-mono">
                                      LIVE
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Kontingen */}
                              <td className="py-2 px-3 font-semibold text-slate-300">
                                {p.kontingen}
                              </td>

                              {/* Status */}
                              <td className="py-2 px-2 text-center">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                                  p.status === 'Sudah Menilai' || p.finalScore !== undefined
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : isCurrentlyPerforming
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {p.status}
                                </span>
                              </td>

                              {/* Skor Akhir */}
                              <td className="py-2 px-3 text-center font-mono font-black text-xs text-amber-400">
                                {p.finalScore !== undefined ? p.finalScore.toFixed(3) : '-'}
                              </td>

                              {/* Hukuman */}
                              <td className="py-2 px-2 text-center font-mono text-[11px] text-red-400">
                                {p.deductions ? p.deductions.toFixed(3) : '0.000'}
                              </td>

                              {/* Ranking in Pool */}
                              <td className="py-2 px-2 text-center">
                                {p.ranking !== undefined ? (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono inline-flex items-center gap-1 ${
                                    p.ranking === 1
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                                      : p.ranking === 2
                                      ? 'bg-slate-400/20 text-slate-300 border border-slate-400/50'
                                      : p.ranking === 3
                                      ? 'bg-orange-600/20 text-orange-400 border border-orange-600/50'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {p.ranking === 1 && <Award className="w-3 h-3 text-amber-400" />}
                                    Juara {p.ranking}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-mono">-</span>
                                )}
                              </td>

                              {/* Action controls */}
                              <td className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {/* Set Active / Live button */}
                                  <button
                                    type="button"
                                    onClick={() => handleSetActivePeserta(p.id)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                      isCurrentlyPerforming 
                                        ? 'bg-amber-500 text-slate-950 font-black' 
                                        : 'bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800 text-indigo-300'
                                    }`}
                                    title="Tampilkan pesilat ini di hadapan dewan & juri"
                                  >
                                    {isCurrentlyPerforming ? 'Sedang Live' : 'Set Tampil'}
                                  </button>

                                  {/* Reorder Up */}
                                  <button
                                    type="button"
                                    disabled={isFirst}
                                    onClick={() => handleMovePesertaInPartai(p.id, 'up')}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                                    title="Geser Urutan Tampil Naik"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>

                                  {/* Reorder Down */}
                                  <button
                                    type="button"
                                    disabled={isLast}
                                    onClick={() => handleMovePesertaInPartai(p.id, 'down')}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                                    title="Geser Urutan Tampil Turun"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>

                                  {/* Change Partai Dropdown */}
                                  <select
                                    value={p.partaiNumber || grp.partaiNumber}
                                    onChange={(e) => handleChangePesertaPartai(p.id, parseInt(e.target.value, 10))}
                                    className="text-[9px] bg-slate-900 border border-slate-700 text-slate-300 px-1 py-0.5 rounded font-mono"
                                    title="Pindahkan atlet ke Partai lain"
                                  >
                                    {derivedPartaiList.map(otherGrp => (
                                      <option key={otherGrp.partaiNumber} value={otherGrp.partaiNumber}>
                                        P{otherGrp.partaiNumber}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Delete */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePeserta(p.id)}
                                    className="p-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 cursor-pointer"
                                    title="Hapus Peserta"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>

      {/* 4. MODAL: AUTO-GROUP PARTICIPANTS INTO POOL */}
      <AnimatePresence>
        {showAutoGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-purple-800/60 rounded-2xl p-5 shadow-2xl text-slate-100"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Bagi Otomatis Partai Seni (Sistem Pool)</span>
                </div>
                <button
                  onClick={() => setShowAutoGroupModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                Sistem akan secara otomatis menyusun dan mengelompokkan semua pesilat seni yang telah terdaftar ke dalam partai pool dengan jumlah peserta yang dipilih:
              </p>

              <div className="grid grid-cols-2 gap-2.5 mb-5">
                {[
                  { size: 3, label: '3 Peserta / Partai', desc: 'Sistem Pool 3 (IPSI Standar)' },
                  { size: 4, label: '4 Peserta / Partai', desc: 'Sistem Pool 4 (Rekomendasi)' },
                  { size: 2, label: '2 Peserta (Battle)', desc: 'Sistem Gugur / Head-to-Head' },
                  { size: 6, label: '6 Peserta / Partai', desc: 'Pool Besar / Babak Final' },
                ].map(item => (
                  <button
                    key={item.size}
                    type="button"
                    onClick={() => handleApplyAutoGroup(item.size)}
                    className="p-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-purple-950/50 hover:border-purple-500 text-left transition-all cursor-pointer group"
                  >
                    <div className="font-extrabold text-xs text-amber-400 group-hover:text-amber-300">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAutoGroupModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. MODAL: ADD PESERTA BARU */}
      <AnimatePresence>
        {showAddPesertaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm">
                  <Plus className="w-4 h-4" />
                  <span>Tambah Peserta Baru ke Partai Seni</span>
                </div>
                <button
                  onClick={() => setShowAddPesertaModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveAddPeserta} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Nama Atlet / Pasangan Ganda / Regu
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Aditya Wahyu / Fajar & Galang"
                    value={formNama}
                    onChange={(e) => setFormNama(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-white font-bold outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Kontingen / Daerah / Perguruan
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: DKI Jakarta / Banten"
                      value={formKontingen}
                      onChange={(e) => setFormKontingen(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-white font-bold outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Kategori Seni
                    </label>
                    <select
                      value={formKategori}
                      onChange={(e) => setFormKategori(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-white font-bold outline-none focus:border-emerald-500"
                    >
                      <option value="Tunggal">Seni Tunggal</option>
                      <option value="Ganda">Seni Ganda</option>
                      <option value="Regu">Seni Regu</option>
                      <option value="Solo Kreatif">Solo Kreatif</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Gender
                    </label>
                    <select
                      value={formGender}
                      onChange={(e) => setFormGender(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-white font-bold outline-none"
                    >
                      <option value="Putra">Putra</option>
                      <option value="Putri">Putri</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Target Partai
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formTargetPartai}
                      onChange={(e) => setFormTargetPartai(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-white font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Nama Pool
                    </label>
                    <input
                      type="text"
                      value={formPoolName}
                      onChange={(e) => setFormPoolName(e.target.value)}
                      placeholder="Pool A"
                      className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-white font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddPesertaModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase cursor-pointer shadow-md"
                  >
                    Simpan Peserta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
