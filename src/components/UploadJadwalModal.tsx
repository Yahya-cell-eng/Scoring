/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, FileSpreadsheet, Download, CheckCircle2, AlertCircle,
  FileText, X, Search, Shield, RefreshCw, Layers, Swords, Award,
  Sparkles, Check, ArrowRight, ArrowDown, AlertTriangle, XCircle,
  CheckCheck, Code2, Filter, ChevronDown, ChevronUp
} from 'lucide-react';
import { BaganCategory, TGRPeserta, BaganMatch, Athlete } from '../types';
import {
  parseScheduleFile,
  parseScheduleText,
  downloadScheduleTemplate,
  downloadScheduleJsonTemplate,
  downloadScheduleCsvTemplate,
  ParsedScheduleSummary,
  ParsedScheduleRow,
  ValidationReport,
  ValidationIssue
} from '../utils/scheduleParser';
import { playBeep } from '../utils/sound';

interface UploadJadwalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySchedule: (params: {
    tandingCategories: BaganCategory[];
    seniPesertaList: TGRPeserta[];
    targetArena: 'current' | 'all';
    mode: 'tanding' | 'seni' | 'all';
    rawSummary: ParsedScheduleSummary;
  }) => void;
  currentArenaName?: string;
  defaultMode?: 'tanding' | 'seni' | 'all';
}

export default function UploadJadwalModal({
  isOpen,
  onClose,
  onApplySchedule,
  currentArenaName = 'Gelanggang 1',
  defaultMode = 'all'
}: UploadJadwalModalProps) {
  const [activeTab, setActiveTab] = useState<'excel' | 'paste' | 'template'>('excel');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parsed summary state
  const [summary, setSummary] = useState<ParsedScheduleSummary | null>(null);

  // Paste text state
  const [rawPastedText, setRawPastedText] = useState('');

  // Target application settings
  const [targetArena, setTargetArena] = useState<'current' | 'all'>('current');
  const [applyMode, setApplyMode] = useState<'tanding' | 'seni' | 'all'>(defaultMode);
  const [applyOnlyValid, setApplyOnlyValid] = useState(true);

  // Search and validation filter in preview
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'tanding' | 'seni'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'issues'>('all');
  const [showValidationAudit, setShowValidationAudit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      playBeep('click');

      const result = await parseScheduleFile(file);
      if (!result) {
        setErrorMsg('File tidak dapat diproses. Pastikan format file adalah CSV, JSON, atau Excel yang valid.');
        setIsLoading(false);
        playBeep('warning');
        return;
      }

      setSummary(result);
      setFileName(file.name);

      if (result.validation?.status === 'invalid') {
        playBeep('warning');
        setErrorMsg(result.validation.fatalError || 'Validasi struktur gagal: berkas tidak memenuhi format sistem.');
        setShowValidationAudit(true);
      } else if (result.validation?.status === 'warning') {
        playBeep('warning');
      } else {
        playBeep('valid');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Gagal membaca file: ${err.message || 'Format tidak didukung'}`);
      playBeep('warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleProcessPastedText = () => {
    if (!rawPastedText.trim()) {
      setErrorMsg('Masukkan teks data jadwal atau salin struktur CSV/JSON!');
      playBeep('warning');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg(null);
      playBeep('click');

      const result = parseScheduleText(rawPastedText);
      if (!result) {
        setErrorMsg('Data teks tidak menghasilkan baris jadwal yang valid.');
        setIsLoading(false);
        playBeep('warning');
        return;
      }

      setSummary(result);
      const isJson = rawPastedText.trim().startsWith('{') || rawPastedText.trim().startsWith('[');
      setFileName(isJson ? 'Payload_JSON_Jadwal.json' : 'Data_Teks_Jadwal.csv');

      if (result.validation?.status === 'invalid') {
        playBeep('warning');
        setErrorMsg(result.validation.fatalError || 'Validasi struktur teks gagal.');
        setShowValidationAudit(true);
      } else if (result.validation?.status === 'warning') {
        playBeep('warning');
      } else {
        playBeep('valid');
      }
    } catch (err: any) {
      setErrorMsg(`Gagal memproses teks: ${err.message}`);
      playBeep('warning');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!summary || summary.rows.length === 0) {
      setErrorMsg('Belum ada data jadwal yang diproses!');
      return;
    }

    // Integrity check: cannot apply if 0 valid rows
    if (summary.validation && !summary.validation.isValid) {
      setErrorMsg('Data jadwal tidak valid! Perbaiki kesalahan struktur sebelum menyimpannya ke state aplikasi.');
      playBeep('warning');
      setShowValidationAudit(true);
      return;
    }

    // Filter valid rows if applyOnlyValid is active
    const activeRows = applyOnlyValid
      ? summary.rows.filter(r => r.isValid)
      : summary.rows;

    if (activeRows.length === 0) {
      setErrorMsg('Tidak ada baris valid yang dapat diterapkan!');
      playBeep('warning');
      return;
    }

    // Reconstruct BaganCategory and TGRPeserta based on activeRows
    const tandingRows = activeRows.filter(r => r.kategoriType === 'Tanding');
    const seniRows = activeRows.filter(r => r.kategoriType !== 'Tanding');

    // Build categories for Tanding
    const categoryMap = new Map<string, { cat: BaganCategory; matches: BaganMatch[] }>();
    tandingRows.forEach((r) => {
      const catKey = `${r.usia}_${r.gender}_${r.kelas}`.toLowerCase().replace(/\s+/g, '_');
      const catName = `${r.usia} ${r.gender} - ${r.kelas}`;

      if (!categoryMap.has(catKey)) {
        categoryMap.set(catKey, {
          cat: {
            id: `cat_${catKey}`,
            name: catName,
            gender: r.gender,
            size: 8,
            kelas: r.kelas,
            usia: r.usia,
            matches: []
          },
          matches: []
        });
      }

      const entry = categoryMap.get(catKey)!;
      const matchId = entry.matches.length + 1;

      const athleteMerah: Athlete = {
        nama: r.merahNama,
        kontingen: r.merahKontingen
      };
      const athleteBiru: Athlete = {
        nama: r.biruNama,
        kontingen: r.biruKontingen
      };

      entry.matches.push({
        id: matchId,
        round: r.round,
        partai: r.partai,
        atletMerah: athleteMerah,
        atletBiru: athleteBiru,
        winner: null
      });
    });

    const finalTandingCategories: BaganCategory[] = [];
    categoryMap.forEach(({ cat, matches }) => {
      cat.matches = matches;
      cat.size = matches.length <= 2 ? 4 : matches.length <= 4 ? 8 : 16;
      finalTandingCategories.push(cat);
    });

    // Build participants for Seni
    const finalSeniPesertaList: TGRPeserta[] = seniRows.map((r, idx) => ({
      id: `peserta_upload_${Date.now()}_${idx}`,
      noUrut: idx + 1,
      noUndian: r.noUndian || (idx + 1),
      partai: r.partai,
      partaiNumber: r.partaiNumber,
      pool: r.poolName || 'Pool A',
      poolName: r.poolName || 'Pool A',
      gender: r.gender,
      usia: r.usia,
      nama: r.merahNama || `Peserta ${idx + 1}`,
      kontingen: r.merahKontingen || 'Umum',
      kategori: r.kategoriType,
      status: 'Belum Menilai',
      scores: {},
      kebenaranScores: {},
      isLocked: false,
      decisions: [],
      deductions: 0,
      deductionReasons: [],
      dewanDecisionScore: 0,
      finalizedJuries: []
    }));

    playBeep('valid');
    onApplySchedule({
      tandingCategories: finalTandingCategories,
      seniPesertaList: finalSeniPesertaList,
      targetArena,
      mode: applyMode,
      rawSummary: summary
    });
    onClose();
  };

  const filteredRows = (summary?.rows || []).filter(r => {
    if (filterType === 'tanding' && r.kategoriType !== 'Tanding') return false;
    if (filterType === 'seni' && r.kategoriType === 'Tanding') return false;
    if (statusFilter === 'valid' && !r.isValid) return false;
    if (statusFilter === 'issues' && r.isValid && (!r.issues || r.issues.length === 0)) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.partai.toLowerCase().includes(q) ||
      r.merahNama.toLowerCase().includes(q) ||
      r.merahKontingen.toLowerCase().includes(q) ||
      r.biruNama.toLowerCase().includes(q) ||
      r.biruKontingen.toLowerCase().includes(q) ||
      r.kelas.toLowerCase().includes(q) ||
      r.kategoriType.toLowerCase().includes(q)
    );
  });

  const validation = summary?.validation;
  const isFormValid = Boolean(validation && validation.isValid && validation.validRowsCount > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-700 w-full max-w-5xl max-h-[94vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        id="modal-upload-jadwal"
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-white font-mono">
                  UPLOAD & VALIDASI JADWAL
                </h2>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400 font-mono text-[10px] font-bold">
                  IPSI STANDARD
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Impor berkas Excel (.xlsx), CSV, atau JSON resmi dengan validasi struktur otomatis sebelum disimpan ke state
              </p>
            </div>
          </div>
          <button
            onClick={() => { playBeep('click'); onClose(); }}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            id="btn-close-upload-jadwal-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-slate-800 bg-slate-950/70 px-4 pt-2 gap-2 shrink-0 overflow-x-auto">
          <button
            onClick={() => { playBeep('click'); setActiveTab('excel'); }}
            className={`px-4 py-2.5 text-xs font-bold font-mono uppercase rounded-t-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'excel'
                ? 'bg-slate-900 text-blue-400 border-t-2 border-blue-500 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload File (Excel / CSV / JSON)</span>
          </button>

          <button
            onClick={() => { playBeep('click'); setActiveTab('paste'); }}
            className={`px-4 py-2.5 text-xs font-bold font-mono uppercase rounded-t-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'paste'
                ? 'bg-slate-900 text-blue-400 border-t-2 border-blue-500 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Salin / Tempel Teks (CSV / JSON)</span>
          </button>

          <button
            onClick={() => { playBeep('click'); setActiveTab('template'); }}
            className={`px-4 py-2.5 text-xs font-bold font-mono uppercase rounded-t-xl transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'template'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Unduh Template Resmi (Excel, CSV, JSON)</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: FILE UPLOAD (EXCEL, CSV, JSON) */}
          {activeTab === 'excel' && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-950/30 scale-[1.01]'
                    : 'border-slate-700 hover:border-blue-500/60 bg-slate-950/40 hover:bg-slate-950/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv, .json, .txt, application/json, text/csv, text/plain"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-3 text-blue-400 shadow-inner">
                  {isLoading ? (
                    <RefreshCw className="w-7 h-7 animate-spin text-blue-400" />
                  ) : (
                    <Upload className="w-7 h-7" />
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1">
                  {fileName ? (
                    <span className="text-emerald-400 flex items-center justify-center gap-1.5 font-mono">
                      <CheckCircle2 className="w-4 h-4" /> {fileName}
                    </span>
                  ) : (
                    'Tarik & Lepas Berkas Jadwal di Sini, atau Klik untuk Memilih'
                  )}
                </h3>
                <p className="text-xs text-slate-400 max-w-lg mx-auto mb-3">
                  Mendukung berkas <strong>Excel (.xlsx, .xls)</strong>, <strong>CSV (.csv)</strong>, dan <strong>JSON (.json)</strong>.
                  Sistem otomatis memvalidasi kolom Partai, Kelas, Babak, Sudut Merah/Biru, Pool Seni, dan Kontingen.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-slate-300">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Excel (.xlsx, .xls)
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
                    <FileText className="w-3.5 h-3.5 text-blue-400" /> CSV (.csv)
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800">
                    <Code2 className="w-3.5 h-3.5 text-amber-400" /> JSON (.json)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PASTE TEXT (CSV / TSV / JSON) */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Tempelkan teks data jadwal dari spreadsheet (tab/koma terpisah) atau struktur JSON schema:
                </p>
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">Format: CSV / TSV / JSON</span>
                </div>
              </div>
              <textarea
                value={rawPastedText}
                onChange={(e) => setRawPastedText(e.target.value)}
                placeholder={'Contoh Format Tabular / CSV:\nPartai 01, Kelas A, SEMI FINAL, FAJAR RAMADHAN, BANTEN, GALANG PERKASA, SUMATERA BARAT, Dewasa, Putra\nPartai 02, Kelas A, SEMI FINAL, ANDI WIJAYA, DKI JAKARTA, BUDI SANTOSO, JAWA TIMUR, Dewasa, Putra\n\nAtau Format Dokumen JSON:\n{\n  "schedule": [\n    { "partai": "01", "kategori": "Tanding", "kelas": "Kelas A", "merahNama": "FAJAR RAMADHAN", "merahKontingen": "BANTEN", "biruNama": "GALANG PERKASA", "biruKontingen": "SUMATERA BARAT" }\n  ]\n}'}
                rows={7}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-y"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleProcessPastedText}
                  disabled={isLoading || !rawPastedText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold uppercase rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Validasi & Proses Teks</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DOWNLOAD OFFICIAL TEMPLATES (EXCEL, CSV, JSON) */}
          {activeTab === 'template' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Gunakan template resmi sistem Digital Scoring IPSI di bawah ini untuk memastikan 100% kecocokan struktur dan validasi:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Template Excel Tanding */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="w-8 h-8 rounded-lg bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400">
                      <Swords className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-white font-mono uppercase">Excel Tanding (.xlsx)</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Format kolom partai tanding lengkap: Merah vs Biru, Kelas, Babak, Kontingen.
                    </p>
                  </div>
                  <button
                    onClick={() => { playBeep('valid'); downloadScheduleTemplate('tanding'); }}
                    className="w-full py-2 px-3 bg-red-900/60 hover:bg-red-800 border border-red-500/40 text-red-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh XLSX Tanding</span>
                  </button>
                </div>

                {/* Template Excel Seni */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-500/30 flex items-center justify-center text-amber-400">
                      <Award className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-white font-mono uppercase">Excel Seni (.xlsx)</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Format penampilan Seni TGR: No Undian, Nama Peserta, Kategori, Pool & Kontingen.
                    </p>
                  </div>
                  <button
                    onClick={() => { playBeep('valid'); downloadScheduleTemplate('seni'); }}
                    className="w-full py-2 px-3 bg-amber-900/60 hover:bg-amber-800 border border-amber-500/40 text-amber-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh XLSX Seni</span>
                  </button>
                </div>

                {/* Template CSV Standar */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-950/40 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-white font-mono uppercase">Template CSV (.csv)</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Format tabel berbasis teks standar koma/RFC-4180 kompatibel Google Sheets & Excel.
                    </p>
                  </div>
                  <button
                    onClick={() => { playBeep('valid'); downloadScheduleCsvTemplate('lengkap'); }}
                    className="w-full py-2 px-3 bg-blue-900/60 hover:bg-blue-800 border border-blue-500/40 text-blue-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh CSV Resmi</span>
                  </button>
                </div>

                {/* Template JSON Schema */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Code2 className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-white font-mono uppercase">Template JSON (.json)</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Format objek terstruktur schema sistem digital scoring IPSI dengan metadata lengkap.
                    </p>
                  </div>
                  <button
                    onClick={() => { playBeep('valid'); downloadScheduleJsonTemplate(); }}
                    className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-950/40"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh JSON Resmi</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Kesalahan: </span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* VALIDATION REPORT CARD */}
          {validation && (
            <div className={`p-4 rounded-xl border transition-all ${
              validation.status === 'valid'
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                : validation.status === 'warning'
                ? 'bg-amber-950/25 border-amber-500/40 text-amber-200'
                : 'bg-red-950/30 border-red-500/50 text-red-200'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-start sm:items-center gap-2.5">
                  {validation.status === 'valid' ? (
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCheck className="w-5 h-5" />
                    </div>
                  ) : validation.status === 'warning' ? (
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                      <XCircle className="w-5 h-5" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase font-mono tracking-wider">
                        {validation.status === 'valid'
                          ? 'FORMAT & STRUKTUR VALID (SIAP DISIMPAN KE STATE)'
                          : validation.status === 'warning'
                          ? 'STRUKTUR FORMAT SESUAI DENGAN CATATAN'
                          : 'STRUKTUR FORMAT TIDAK SESUAI / GAGAL VALIDASI'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-black/40 text-[10px] font-mono uppercase font-bold">
                        {validation.fileFormat.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90">
                      {validation.status === 'valid'
                        ? 'Seluruh kolom dan struktur data jadwal sesuai dengan standar sistem IPSI.'
                        : validation.status === 'warning'
                        ? `${validation.warnings.length} catatan/peringatan terdeteksi. Data tetap dapat disimpan ke state aplikasi.`
                        : validation.fatalError || `${validation.errors.length} baris memiliki kesalahan format fatal yang mencegah penyimpanan.`}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                  <span className="px-2 py-1 rounded bg-black/40 border border-white/10 text-slate-200">
                    Total: <strong>{validation.totalRows}</strong>
                  </span>
                  <span className="px-2 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
                    ✓ Valid: <strong>{validation.validRowsCount}</strong>
                  </span>
                  {validation.warnings.length > 0 && (
                    <span className="px-2 py-1 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300">
                      ⚠ Catatan: <strong>{validation.warnings.length}</strong>
                    </span>
                  )}
                  {validation.errors.length > 0 && (
                    <span className="px-2 py-1 rounded bg-red-950/60 border border-red-500/40 text-red-300 font-bold">
                      ✕ Error: <strong>{validation.errors.length}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* RULES CHECKLIST */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-3">
                {validation.checkedRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-2 rounded-lg bg-black/30 border border-white/5 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold text-slate-300 truncate">{rule.rule}</span>
                      {rule.status === 'passed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : rule.status === 'warning' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 line-clamp-2 leading-tight">
                      {rule.details}
                    </span>
                  </div>
                ))}
              </div>

              {/* ISSUE AUDIT TOGGLE */}
              {validation.issues.length > 0 && (
                <div className="pt-3">
                  <button
                    onClick={() => setShowValidationAudit(!showValidationAudit)}
                    className="text-[11px] font-mono font-bold flex items-center gap-1.5 opacity-90 hover:opacity-100 underline cursor-pointer"
                  >
                    {showValidationAudit ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{showValidationAudit ? 'Sembunyikan Rincian Masalah Validasi' : `Tampilkan Rincian Masalah Validasi (${validation.issues.length})`}</span>
                  </button>

                  {/* EXPANDABLE ISSUES LIST */}
                  {showValidationAudit && (
                    <div className="mt-2.5 max-h-44 overflow-y-auto border border-white/10 rounded-lg bg-black/40 text-xs font-mono">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-black/60 sticky top-0 border-b border-white/10 text-[10px] text-slate-400 uppercase">
                          <tr>
                            <th className="py-1.5 px-2.5 w-14">BARIS</th>
                            <th className="py-1.5 px-2.5 w-16">PARTAI</th>
                            <th className="py-1.5 px-2.5 w-24">KOLOM</th>
                            <th className="py-1.5 px-2.5 w-20">TINGKAT</th>
                            <th className="py-1.5 px-2.5">RINCIAN VALIDASI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {validation.issues.map((issue, i) => (
                            <tr key={i} className="hover:bg-white/5">
                              <td className="py-1.5 px-2.5 text-slate-400">#{issue.rowNumber}</td>
                              <td className="py-1.5 px-2.5 font-bold text-blue-400">{issue.partai || '-'}</td>
                              <td className="py-1.5 px-2.5 text-slate-300">{issue.field}</td>
                              <td className="py-1.5 px-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                  issue.severity === 'error' ? 'bg-red-900/60 text-red-300 border border-red-500/40' : 'bg-amber-900/60 text-amber-300 border border-amber-500/40'
                                }`}>
                                  {issue.severity}
                                </span>
                              </td>
                              <td className="py-1.5 px-2.5 text-slate-300">{issue.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PARSED PREVIEW SECTION */}
          {summary && summary.rows.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              {/* SUMMARY STATS & FILTERS */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 font-mono text-xs font-bold">
                    Total: {summary.totalRows} Baris
                  </span>
                  {summary.tandingCount > 0 && (
                    <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 font-mono text-xs font-bold">
                      ⚔️ Tanding: {summary.tandingCount}
                    </span>
                  )}
                  {summary.seniCount > 0 && (
                    <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-400 font-mono text-xs font-bold">
                      🥋 Seni: {summary.seniCount}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Validation Status Filter */}
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-2 py-1 rounded cursor-pointer ${statusFilter === 'all' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'}`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setStatusFilter('valid')}
                      className={`px-2 py-1 rounded cursor-pointer ${statusFilter === 'valid' ? 'bg-emerald-700 text-white font-bold' : 'text-slate-400'}`}
                    >
                      ✓ Valid ({summary.validation?.validRowsCount || 0})
                    </button>
                    {(summary.validation?.invalidRowsCount || 0) + (summary.validation?.warningRowsCount || 0) > 0 && (
                      <button
                        onClick={() => setStatusFilter('issues')}
                        className={`px-2 py-1 rounded cursor-pointer ${statusFilter === 'issues' ? 'bg-amber-700 text-white font-bold' : 'text-slate-400'}`}
                      >
                        ⚠ Catatan ({ (summary.validation?.invalidRowsCount || 0) + (summary.validation?.warningRowsCount || 0) })
                      </button>
                    )}
                  </div>

                  {/* Category Filter */}
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
                    <button
                      onClick={() => setFilterType('all')}
                      className={`px-2 py-1 rounded cursor-pointer ${filterType === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      Semua
                    </button>
                    {summary.tandingCount > 0 && (
                      <button
                        onClick={() => setFilterType('tanding')}
                        className={`px-2 py-1 rounded cursor-pointer ${filterType === 'tanding' ? 'bg-red-600 text-white font-bold' : 'text-slate-400'}`}
                      >
                        Tanding
                      </button>
                    )}
                    {summary.seniCount > 0 && (
                      <button
                        onClick={() => setFilterType('seni')}
                        className={`px-2 py-1 rounded cursor-pointer ${filterType === 'seni' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400'}`}
                      >
                        Seni
                      </button>
                    )}
                  </div>

                  {/* Search input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari atlet/partai..."
                      className="pl-8 pr-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-32 sm:w-44"
                    />
                  </div>
                </div>
              </div>

              {/* TABLE OF MATCHES WITH VALIDATION COLUMN */}
              <div className="border border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-slate-950/40">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="bg-slate-900/90 sticky top-0 border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <tr>
                      <th className="py-2 px-3 w-12 text-center">NO</th>
                      <th className="py-2 px-3 w-16 text-center">VALIDASI</th>
                      <th className="py-2 px-3 w-20">PARTAI</th>
                      <th className="py-2 px-3 w-24">KELAS/KAT</th>
                      <th className="py-2 px-3 w-24">BABAK</th>
                      <th className="py-2 px-3">SUDUT MERAH / PESERTA</th>
                      <th className="py-2 px-3">SUDUT BIRU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredRows.slice(0, 100).map((row, idx) => (
                      <tr key={row.id || idx} className={`hover:bg-slate-900/50 transition ${
                        !row.isValid ? 'bg-red-950/20' : (row.issues && row.issues.length > 0 ? 'bg-amber-950/10' : '')
                      }`}>
                        <td className="py-2 px-3 text-center text-slate-500 font-bold">{row.no}</td>
                        <td className="py-2 px-3 text-center">
                          {row.isValid ? (
                            row.issues && row.issues.length > 0 ? (
                              <span 
                                title={row.issues.map(i => i.message).join(' | ')}
                                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 cursor-help"
                              >
                                ⚠
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400">
                                ✓
                              </span>
                            )
                          ) : (
                            <span 
                              title={row.issues.map(i => i.message).join(' | ')}
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400 font-bold cursor-help"
                            >
                              ✕
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-bold text-blue-400">{row.partai}</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            row.kategoriType === 'Tanding' ? 'bg-slate-800 text-slate-300' : 'bg-amber-950/50 text-amber-300 border border-amber-500/20'
                          }`}>
                            {row.kelas || row.kategoriType}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">{row.roundLabel}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>
                            <span className="font-bold text-slate-200 truncate max-w-[140px] sm:max-w-[180px]">{row.merahNama}</span>
                            <span className="text-[10px] text-slate-500">({row.merahKontingen})</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          {row.biruNama ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                              <span className="font-bold text-slate-200 truncate max-w-[140px] sm:max-w-[180px]">{row.biruNama}</span>
                              <span className="text-[10px] text-slate-500">({row.biruKontingen})</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 italic text-[11px]">- (Seni Solo/Pool)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* APPLICATION CONFIGURATION */}
          {summary && summary.rows.length > 0 && (
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold font-mono uppercase text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  <span>Konfigurasi Penerapan ke State</span>
                </div>

                {/* Filter Invalid Option */}
                {summary.validation && summary.validation.invalidRowsCount > 0 && (
                  <label className="flex items-center gap-2 text-xs font-mono cursor-pointer text-amber-300">
                    <input
                      type="checkbox"
                      checked={applyOnlyValid}
                      onChange={(e) => setApplyOnlyValid(e.target.checked)}
                      className="rounded border-slate-700 text-blue-600 focus:ring-0"
                    />
                    <span>Hanya terapkan {summary.validation.validRowsCount} baris valid (lewati {summary.validation.invalidRowsCount} cacat)</span>
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Target Arena */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Target Gelanggang:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { playBeep('click'); setTargetArena('current'); }}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition ${
                        targetArena === 'current'
                          ? 'bg-blue-950/60 border-blue-500 text-blue-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs">{currentArenaName}</div>
                      <div className="text-[10px] text-slate-500 font-normal">Gelanggang aktif ini saja</div>
                    </button>
                    <button
                      onClick={() => { playBeep('click'); setTargetArena('all'); }}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition ${
                        targetArena === 'all'
                          ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs">Semua Gelanggang</div>
                      <div className="text-[10px] text-slate-500 font-normal">Bagi rata multi-arena</div>
                    </button>
                  </div>
                </div>

                {/* Apply Mode */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Kategori Jadwal:</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => { playBeep('click'); setApplyMode('all'); }}
                      className={`p-2 rounded-lg border text-center cursor-pointer transition ${
                        applyMode === 'all'
                          ? 'bg-blue-950/60 border-blue-500 text-blue-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => { playBeep('click'); setApplyMode('tanding'); }}
                      className={`p-2 rounded-lg border text-center cursor-pointer transition ${
                        applyMode === 'tanding'
                          ? 'bg-red-950/60 border-red-500 text-red-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Tanding
                    </button>
                    <button
                      onClick={() => { playBeep('click'); setApplyMode('seni'); }}
                      className={`p-2 rounded-lg border text-center cursor-pointer transition ${
                        applyMode === 'seni'
                          ? 'bg-amber-950/60 border-amber-500 text-amber-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Seni (TGR)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={() => { playBeep('click'); onClose(); }}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase transition cursor-pointer"
          >
            Batal
          </button>

          <button
            onClick={handleApply}
            disabled={!isFormValid}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-lg ${
              isFormValid
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-900/40'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed shadow-none'
            }`}
            id="btn-apply-uploaded-schedule"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {!summary || summary.rows.length === 0
                ? 'Terapkan Jadwal'
                : !isFormValid
                ? 'Format Data Tidak Sesuai'
                : applyOnlyValid && summary.validation && summary.validation.invalidRowsCount > 0
                ? `Terapkan ${summary.validation.validRowsCount} Partai Valid`
                : `Terapkan Jadwal (${summary.rows.length} Partai)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
