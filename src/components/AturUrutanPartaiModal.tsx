/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, ArrowUp, ArrowDown, Shuffle, Layers, Hash, 
  Sparkles, Trophy, Calendar, RefreshCw, AlertCircle, Play
} from 'lucide-react';
import { BaganCategory } from '../types';
import { 
  ReorderStrategy, 
  FlattenedMatchInfo, 
  resequenceAndRenumberCategories, 
  reorderSingleMatch,
  flattenAllBaganMatches
} from '../utils/partaiOrdering';
import { playBeep } from '../utils/sound';

interface AturUrutanPartaiModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: BaganCategory[];
  onSave: (updatedCategories: BaganCategory[]) => void;
}

export default function AturUrutanPartaiModal({
  isOpen,
  onClose,
  categories,
  onSave
}: AturUrutanPartaiModalProps) {
  const [strategy, setStrategy] = useState<ReorderStrategy>('standar_ipsi_babak');
  const [startNumber, setStartNumber] = useState<number>(1);
  const [previewList, setPreviewList] = useState<FlattenedMatchInfo[]>([]);
  const [workingCategories, setWorkingCategories] = useState<BaganCategory[]>(categories);
  const [searchQuery, setSearchQuery] = useState('');

  // Re-calculate preview when opened or strategy/startNumber changes
  useEffect(() => {
    if (isOpen && categories.length > 0) {
      const { updatedCategories, orderedMatches } = resequenceAndRenumberCategories(
        categories,
        strategy,
        startNumber
      );
      setWorkingCategories(updatedCategories);
      setPreviewList(orderedMatches);
    }
  }, [isOpen, strategy, startNumber, categories]);

  if (!isOpen) return null;

  const handleApplyStrategy = (newStrategy: ReorderStrategy) => {
    playBeep('click');
    setStrategy(newStrategy);
    const { updatedCategories, orderedMatches } = resequenceAndRenumberCategories(
      categories,
      newStrategy,
      startNumber
    );
    setWorkingCategories(updatedCategories);
    setPreviewList(orderedMatches);
  };

  const handleMoveMatch = (uniqueId: string, direction: 'up' | 'down') => {
    playBeep('click');
    const { updatedCategories, orderedMatches } = reorderSingleMatch(
      workingCategories,
      uniqueId,
      direction,
      previewList
    );
    setWorkingCategories(updatedCategories);
    setPreviewList(orderedMatches);
  };

  const handleSave = () => {
    playBeep('valid');
    onSave(workingCategories);
    onClose();
  };

  const filteredPreview = previewList.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.match.partai.toLowerCase().includes(q) ||
      item.catName.toLowerCase().includes(q) ||
      item.match.atletMerah.nama.toLowerCase().includes(q) ||
      item.match.atletBiru.nama.toLowerCase().includes(q) ||
      item.match.round.toLowerCase().includes(q)
    );
  });

  const getRoundBadgeColor = (round: string) => {
    switch (round.toLowerCase()) {
      case 'final': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'semi': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'quarter': return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default: return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  const getRoundLabel = (round: string) => {
    switch (round.toLowerCase()) {
      case 'final': return 'FINAL';
      case 'semi': return 'SEMI FINAL';
      case 'quarter': return 'PEREMPAT FINAL';
      case 'eighth': return '16 BESAR';
      case 'sixteenth': return '32 BESAR';
      default: return round.toUpperCase();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide flex items-center gap-2">
                <span>Atur & Perbaiki Urutan Partai</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold font-mono">
                  {previewList.length} Total Partai
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Susun urutan pertandingan secara berurutan tanpa duplikasi nomor partai untuk seluruh bagan kelas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Pilih Metode Urutan Pertandingan (Metode Penomoran)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Option 1: Standar IPSI (Urut Babak) */}
              <button
                type="button"
                onClick={() => handleApplyStrategy('standar_ipsi_babak')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  strategy === 'standar_ipsi_babak'
                    ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-md shadow-indigo-900/30'
                    : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                {strategy === 'standar_ipsi_babak' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                )}
                <div>
                  <div className="flex items-center gap-2 font-bold text-sm text-indigo-300 mb-1">
                    <Trophy className="w-4 h-4 text-indigo-400" />
                    <span>Standar IPSI (Urut Babak)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Penyisihan seluruh kelas dipertandingkan dahulu, lalu Perempat Final, Semi Final, dan Final. (Rekomendasi Resmi)
                  </p>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
                  <Check className="w-3 h-3" /> Atlet memiliki waktu istirahat
                </div>
              </button>

              {/* Option 2: Urut Per Kategori */}
              <button
                type="button"
                onClick={() => handleApplyStrategy('per_kategori')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  strategy === 'per_kategori'
                    ? 'bg-purple-950/60 border-purple-500 text-white shadow-md shadow-purple-900/30'
                    : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-sm text-purple-300 mb-1">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <span>Urut Per Kategori / Kelas</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Menyelesaikan semua babak Kelas A dahulu, lanjut Kelas B, Kelas C, dst. secara berurutan.
                  </p>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold text-purple-400">
                  <Layers className="w-3 h-3" /> Terstruktur per kelompok kelas
                </div>
              </button>

              {/* Option 3: Rapikan Nomor Saat Ini */}
              <button
                type="button"
                onClick={() => handleApplyStrategy('per_nomor_saat_ini')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  strategy === 'per_nomor_saat_ini'
                    ? 'bg-teal-950/60 border-teal-500 text-white shadow-md shadow-teal-900/30'
                    : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800/80 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 font-bold text-sm text-teal-300 mb-1">
                    <Hash className="w-4 h-4 text-teal-400" />
                    <span>Rapikan Nomor (Urutan Tetap)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Mempertahankan susunan posisi saat ini, memperbaiki nomor ganda atau nomor lompat menjadi 1, 2, 3, ... N.
                  </p>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold text-teal-400">
                  <Check className="w-3 h-3" /> Bersihkan nomor ganda
                </div>
              </button>
            </div>
          </div>

          {/* Start Number & Search Filter */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/60">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-300">
                Nomor Partai Mulai Dari:
              </label>
              <input
                type="number"
                min="1"
                max="999"
                value={startNumber}
                onChange={(e) => setStartNumber(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-center font-bold text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400">
                (Contoh: Partai 01 s/d Partai {String(startNumber + previewList.length - 1).padStart(2, '0')})
              </span>
            </div>

            <div className="flex-1 max-w-xs">
              <input
                type="text"
                placeholder="Cari atlet, kelas, atau babak..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Body / Table Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1 px-1">
            <span className="font-semibold uppercase tracking-wider text-slate-300">
              Pratinjau Hasil Urutan Partai ({filteredPreview.length} Partai)
            </span>
            <span className="text-[11px] text-slate-500">
              Gunakan tombol ▲ ▼ untuk menggeser posisi partai jika diperlukan
            </span>
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-700 text-slate-300 font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-3 w-12 text-center">No</th>
                  <th className="py-2.5 px-3 w-28 text-center">Partai Baru</th>
                  <th className="py-2.5 px-3 w-36">Kelas / Kategori</th>
                  <th className="py-2.5 px-3 w-28 text-center">Babak</th>
                  <th className="py-2.5 px-3 text-red-400">Sudut Merah</th>
                  <th className="py-2.5 px-3 text-blue-400">Sudut Biru</th>
                  <th className="py-2.5 px-3 w-24 text-center">Geser Urutan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPreview.map((item, idx) => {
                  const uniqueId = `${item.catId}_${item.match.id}`;
                  const isTop = idx === 0;
                  const isBottom = idx === previewList.length - 1;

                  const merahNama = item.match.atletMerah?.nama || 'Menunggu Hasil / Pemenang';
                  const biruNama = item.match.atletBiru?.nama || 'Menunggu Hasil / Pemenang';

                  return (
                    <tr 
                      key={uniqueId}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* No */}
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Partai Baru */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 font-mono font-bold text-xs tracking-wider">
                          {item.match.partai}
                        </span>
                      </td>

                      {/* Kelas */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-200">{item.shortKelas}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{item.catName}</div>
                      </td>

                      {/* Babak */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getRoundBadgeColor(item.match.round)}`}>
                          {getRoundLabel(item.match.round)}
                        </span>
                      </td>

                      {/* Sudut Merah */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-red-400 truncate max-w-[160px]">
                          {merahNama}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                          {item.match.atletMerah.kontingen || '-'}
                        </div>
                      </td>

                      {/* Sudut Biru */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-blue-400 truncate max-w-[160px]">
                          {biruNama}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                          {item.match.atletBiru.kontingen || '-'}
                        </div>
                      </td>

                      {/* Reorder Buttons */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={isTop}
                            onClick={() => handleMoveMatch(uniqueId, 'up')}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            title="Geser Naik"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isBottom}
                            onClick={() => handleMoveMatch(uniqueId, 'down')}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            title="Geser Turun"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
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

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-indigo-400" />
            <span>Nomor partai akan otomatis terupdate di Bagan, Jadwal Cetak, dan Monitor Partai.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Terapkan Urutan Partai</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
