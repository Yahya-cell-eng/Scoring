/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Shield,
  Swords,
  Users,
  Award,
  Sparkles,
  X,
  FileText,
  Check,
  Play,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { GelanggangInfo, BaganCategory, TGRPeserta } from '../types';
import { playBeep } from '../utils/sound';
import {
  parseExcelFile,
  autoGroupAllAthletes,
  downloadOfficialExcelTemplate,
  ParsedAthleteRecord,
  parseRawAthletesData
} from '../utils/smartDataParser';
import {
  getStoredGoogleToken,
  getActiveSpreadsheetId,
  importAthletesFromGoogleSheet
} from '../services/googleSheetsService';
import GoogleSheetsIntegrationModal from './GoogleSheetsIntegrationModal';

interface UploadDistribusiPesertaModalProps {
  isOpen: boolean;
  onClose: () => void;
  arenasList: GelanggangInfo[];
  dispatch: (type: string, payload?: any) => void;
  theme: 'dark' | 'light';
  onSuccess?: (msg: string) => void;
}

// Realistic sample athletes for 1-click test load
const SAMPLE_DATA_TEXT = `HIDAYAT LIMONU, SULAWESI UTARA, Tanding, Kelas A, Dewasa, Putra
YUDHA MAHENDRI, RIAU, Tanding, Kelas A, Dewasa, Putra
MUH ISKANDAR, PAPUA, Tanding, Kelas A, Dewasa, Putra
ALAMSYAH, KALIMANTAN TIMUR, Tanding, Kelas A, Dewasa, Putra
BAYU SETIAWAN, JAWA TIMUR, Tanding, Kelas A, Dewasa, Putra
REZA PAHLEVI, ACEH, Tanding, Kelas A, Dewasa, Putra
FADLI RAHMAN, SUMATERA BARAT, Tanding, Kelas A, Dewasa, Putra
ARIF PRASETYO, DKI JAKARTA, Tanding, Kelas A, Dewasa, Putra
AFRIANI LAURENSIA, SUMATERA UTARA, Tanding, Kelas B, Dewasa, Putri
SUCI WULANDARI, SUMATERA BARAT, Tanding, Kelas B, Dewasa, Putri
NADIA HAQ U N C, JAWA TENGAH, Tanding, Kelas B, Dewasa, Putri
ADELA EARLENE S, JAWA TIMUR, Tanding, Kelas B, Dewasa, Putri
DINA KURNIA, LAMPUNG, Tanding, Kelas B, Dewasa, Putri
MAULIDA NUR, BANTEN, Tanding, Kelas B, Dewasa, Putri
PUTRI WULANDARI, BALI, Tanding, Kelas B, Dewasa, Putri
SITI AISYAH, DI YOGYAKARTA, Tanding, Kelas B, Dewasa, Putri
ILHAM WIJAYA, JAWA BARAT, Tanding, Kelas C, Dewasa, Putra
DIMAS SAPUTRA, SUMATERA SELATAN, Tanding, Kelas C, Dewasa, Putra
EKO FEBRIANTO, SULAWESI SELATAN, Tanding, Kelas C, Dewasa, Putra
RIZKY RAMADHAN, KALIMANTAN SELATAN, Tanding, Kelas C, Dewasa, Putra
HENDRA SETIAWAN, JAWA BARAT, Tunggal, Tunggal, Dewasa, Putra
SITI RAHMAH, JAWA TENGAH, Tunggal, Tunggal, Dewasa, Putri
TIM BANTEN PA, BANTEN, Regu, Regu, Dewasa, Putra
TIM JATIM PI, JAWA TIMUR, Regu, Regu, Dewasa, Putri`;

export default function UploadDistribusiPesertaModal({
  isOpen,
  onClose,
  arenasList,
  dispatch,
  theme,
  onSuccess
}: UploadDistribusiPesertaModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsed records state
  const [parsedRecords, setParsedRecords] = useState<ParsedAthleteRecord[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Raw text input toggle
  const [showTextPaste, setShowTextPaste] = useState<boolean>(false);
  const [rawTextInput, setRawTextInput] = useState<string>('');
  const [showSheetsModal, setShowSheetsModal] = useState<boolean>(false);

  // Configuration options
  const [selectedArenaIds, setSelectedArenaIds] = useState<string[]>(() => {
    return arenasList.filter(a => a.status === 'aktif').map(a => a.id).length > 0
      ? arenasList.filter(a => a.status === 'aktif').map(a => a.id)
      : arenasList.map(a => a.id);
  });

  const [bracketSize, setBracketSize] = useState<2 | 4 | 8 | 16>(8);
  const [seniPoolSize, setSeniPoolSize] = useState<number>(4);
  const [reorderStrategy, setReorderStrategy] = useState<'standar_ipsi_babak' | 'per_kategori'>('standar_ipsi_babak');

  // Handle file select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file: File) => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      playBeep('click');

      const records = await parseExcelFile(file);
      if (!records || records.length === 0) {
        setErrorMsg('File Excel / CSV tidak berisi data atlet yang valid atau kolom tidak dikenali.');
        return;
      }

      setParsedRecords(records);
      setFileName(file.name);
      playBeep('valid');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Gagal membaca file: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load sample data
  const handleLoadSample = () => {
    playBeep('click');
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const records = parseRawAthletesData(SAMPLE_DATA_TEXT);
      setParsedRecords(records);
      setFileName('Contoh_24_Pesilat_Kejuaraan.xlsx');
      playBeep('valid');
    } catch (err: any) {
      setErrorMsg(`Gagal memuat contoh: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Parse raw text paste
  const handleParseRawText = () => {
    if (!rawTextInput.trim()) return;
    playBeep('click');
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const records = parseRawAthletesData(rawTextInput);
      if (records.length === 0) {
        setErrorMsg('Format teks tidak dapat dikenali. Pastikan berformat: Nama, Kontingen, Kelas, Usia, Gender');
        return;
      }
      setParsedRecords(records);
      setFileName(`Data_Teks_Paste_${records.length}_Atlet`);
      playBeep('valid');
    } catch (err: any) {
      setErrorMsg(`Gagal memproses teks: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetchFromGoogleSheets = async () => {
    playBeep('click');
    const token = getStoredGoogleToken();
    const spreadsheetId = getActiveSpreadsheetId();

    if (!token || !spreadsheetId) {
      setShowSheetsModal(true);
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const records = await importAthletesFromGoogleSheet(token, spreadsheetId);
      if (records && records.length > 0) {
        setParsedRecords(records);
        setFileName(`Google Sheets (${records.length} Atlet)`);
        playBeep('valid');
      } else {
        setErrorMsg('Tab "DATA PESERTA" pada Google Sheets masih kosong atau tidak memiliki baris atlet yang valid.');
      }
    } catch (err: any) {
      console.error('Failed to import from Google Sheets:', err);
      setErrorMsg(`Gagal mengambil data dari Google Sheets: ${err.message || 'Periksa koneksi akun Google.'}`);
      setShowSheetsModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle arena selection
  const toggleArenaId = (id: string) => {
    playBeep('click');
    if (selectedArenaIds.includes(id)) {
      if (selectedArenaIds.length === 1) {
        alert('Minimal harus memilih 1 gelanggang tujuan!');
        return;
      }
      setSelectedArenaIds(selectedArenaIds.filter(aId => aId !== id));
    } else {
      setSelectedArenaIds([...selectedArenaIds, id]);
    }
  };

  // Auto group calculation
  const groupedData = useMemo(() => {
    if (parsedRecords.length === 0) return { tandingCategories: [], seniPesertaList: [] };
    return autoGroupAllAthletes(parsedRecords, bracketSize, seniPoolSize);
  }, [parsedRecords, bracketSize, seniPoolSize]);

  // Preview distribution allocation
  const arenaAllocations = useMemo(() => {
    const targetArenas = arenasList.filter(a => selectedArenaIds.includes(a.id));
    if (targetArenas.length === 0) return [];

    let tandingArenas = targetArenas.filter(a => a.modeAktif === 'tanding');
    let seniArenas = targetArenas.filter(a => a.modeAktif === 'seni');

    if (tandingArenas.length === 0 && groupedData.tandingCategories.length > 0) {
      tandingArenas = targetArenas;
    }
    if (seniArenas.length === 0 && groupedData.seniPesertaList.length > 0) {
      seniArenas = targetArenas;
    }

    const mapping: Record<
      string,
      {
        arena: GelanggangInfo;
        categories: BaganCategory[];
        seniList: TGRPeserta[];
        matchCount: number;
      }
    > = {};

    targetArenas.forEach(a => {
      mapping[a.id] = {
        arena: a,
        categories: [],
        seniList: [],
        matchCount: 0
      };
    });

    // Distribute categories round-robin so entire tree stays in one arena
    groupedData.tandingCategories.forEach((cat, idx) => {
      const target = tandingArenas[idx % tandingArenas.length];
      if (target && mapping[target.id]) {
        mapping[target.id].categories.push(cat);
        mapping[target.id].matchCount += cat.matches.length;
      }
    });

    // Distribute seni
    groupedData.seniPesertaList.forEach((p, idx) => {
      const target = seniArenas[idx % seniArenas.length];
      if (target && mapping[target.id]) {
        mapping[target.id].seniList.push(p);
      }
    });

    return Object.values(mapping);
  }, [arenasList, selectedArenaIds, groupedData]);

  // Execute upload and distribution
  const handleExecuteDistribution = () => {
    if (parsedRecords.length === 0) {
      alert('Silakan upload file Excel atau gunakan data contoh terlebih dahulu!');
      return;
    }

    if (selectedArenaIds.length === 0) {
      alert('Pilih minimal 1 Gelanggang sasaran!');
      return;
    }

    playBeep('valid');

    dispatch('DISTRIBUTE_EXCEL_ALL_ARENAS', {
      tandingCategories: groupedData.tandingCategories,
      seniPesertaList: groupedData.seniPesertaList,
      targetArenaIds: selectedArenaIds,
      reorderStrategy
    });

    const summaryMsg = `Berhasil mendistribusikan ${parsedRecords.length} atlet ke ${selectedArenaIds.length} Gelanggang!\n\n• Logika Konsistensi Aktif: Peserta di Gelanggang 1 (Penyisihan / Perempat / Semifinal) tetap bertanding di Gelanggang 1 sampai Final.\n• Kontingen satu perguruan dipisahkan agar tidak bertemu di awal.\n• Seluruh monitor dan papan skor langsung tersinkronisasi.`;
    
    if (onSuccess) {
      onSuccess(summaryMsg);
    } else {
      alert(summaryMsg);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl bg-[#090d26] border border-blue-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* 1. MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-blue-500/20 bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-wider text-white uppercase">
                  UPLOAD & DISTRIBUSI DATA PESERTA
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  OTOMATISASI JADWAL
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Impor data atlet Excel/CSV, bagi ke berbagai gelanggang, dan buat jadwal pertandingan.
              </p>
            </div>
          </div>

          <button
            onClick={() => { playBeep('click'); onClose(); }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. CORE REGULATION BANNER (USER REQUIREMENT) */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-blue-900/40 via-cyan-950/30 to-indigo-900/40 border-b border-blue-500/20 flex items-start gap-3">
          <Shield className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-bold text-cyan-300">Aturan Konsistensi Gelanggang Terjamin: </span>
            Jika seorang peserta berada pada <strong className="text-white">Gelanggang 1</strong> (babak Penyisihan, Perempat Final, maupun Semi Final), maka seluruh babak lanjutan hingga <strong className="text-amber-300">Final</strong> untuk bagan tersebut <strong className="text-cyan-300">TETAP bertanding di Gelanggang 1</strong>. Tidak ada perpindahan matras untuk atlet yang sama.
          </div>
        </div>

        {/* 3. MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-slate-200">
          {/* A. FILE UPLOAD BOX */}
          <div className="p-4 rounded-xl border-2 border-dashed border-blue-500/30 bg-blue-950/20 hover:border-blue-500/50 transition-colors flex flex-col items-center justify-center text-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv,.json"
              className="hidden"
            />

            <FileSpreadsheet className="w-10 h-10 text-blue-400 mb-2 animate-pulse" />

            {fileName ? (
              <div className="flex flex-col items-center">
                <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  File Siap: {fileName}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {parsedRecords.length} atlet terdeteksi ({groupedData.tandingCategories.length} bagan tanding, {groupedData.seniPesertaList.length} peserta seni)
                </span>
              </div>
            ) : (
              <div>
                <p className="text-xs sm:text-sm font-bold text-white mb-1">
                  Tarik & Lepas File Excel (.xlsx, .xls) atau CSV ke Sini
                </p>
                <p className="text-[11px] text-slate-400 font-mono mb-3">
                  Mendukung format kolom: No, Nama Atlet, Kontingen, Kategori (Tanding/Seni), Kelas, Usia, Gender
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => { playBeep('click'); fileInputRef.current?.click(); }}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold tracking-wider uppercase shadow-md transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>PILIH FILE EXCEL</span>
              </button>

              <button
                type="button"
                onClick={handleFetchFromGoogleSheets}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold tracking-wider uppercase shadow-md transition-all cursor-pointer border border-emerald-500/40"
                title="Ambil data atlet dari tab DATA PESERTA Google Sheets yang terhubung"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                <span>AMBIL DARI GOOGLE SHEETS</span>
              </button>

              <button
                type="button"
                onClick={handleLoadSample}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold tracking-wider uppercase shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>GUNAKAN DATA CONTOH (24 ATLET)</span>
              </button>

              <button
                type="button"
                onClick={() => { playBeep('click'); downloadOfficialExcelTemplate(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold tracking-wider uppercase border border-slate-700 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>UNDUH TEMPLATE</span>
              </button>

              <button
                type="button"
                onClick={() => { playBeep('click'); setShowTextPaste(!showTextPaste); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold tracking-wider uppercase border border-slate-700 transition-all cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>{showTextPaste ? 'TUTUP TEKS' : 'TEMPEL TEKS'}</span>
              </button>
            </div>
          </div>

          {/* B. OPTIONAL RAW TEXT PASTE AREA */}
          {showTextPaste && (
            <div className="p-3.5 rounded-xl border border-slate-700 bg-slate-900/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 font-mono">
                  TEMPEL DATA ATLET (Baris Baru Tiap Atlet)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Contoh: Nama, Kontingen, Tanding, Kelas A, Dewasa, Putra
                </span>
              </div>
              <textarea
                value={rawTextInput}
                onChange={(e) => setRawTextInput(e.target.value)}
                placeholder="HIDAYAT LIMONU, SULUT, Tanding, Kelas A, Dewasa, Putra&#10;YUDHA MAHENDRI, RIAU, Tanding, Kelas A, Dewasa, Putra"
                rows={4}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleParseRawText}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  PROSES DATA TEKS
                </button>
              </div>
            </div>
          )}

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="p-3 rounded-xl border border-red-500/30 bg-red-950/30 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* C. CONFIGURATION SETTINGS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. GELANGGANG TUJUAN */}
            <div className="p-3.5 rounded-xl border border-blue-500/20 bg-[#06081e]/80 flex flex-col space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  GELANGGANG SASARAN
                </span>
                <span className="text-[10px] font-mono text-blue-400 font-bold">
                  {selectedArenaIds.length} Terpilih
                </span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {arenasList.map(arena => {
                  const isChecked = selectedArenaIds.includes(arena.id);
                  return (
                    <div
                      key={arena.id}
                      onClick={() => toggleArenaId(arena.id)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'border-blue-500 bg-blue-950/40 text-white'
                          : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isChecked
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'border-slate-700'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <span className="font-bold">{arena.nama}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {arena.modeAktif === 'seni' ? 'Seni' : 'Tanding'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. UKURAN BAGAN TANDING */}
            <div className="p-3.5 rounded-xl border border-blue-500/20 bg-[#06081e]/80 flex flex-col space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-amber-400" />
                FORMAT BAGAN TANDING
              </span>

              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { size: 4, label: 'Bagan 4 (Semi & Final)' },
                  { size: 8, label: 'Bagan 8 (Perempat, Semi, Final)' },
                  { size: 16, label: 'Bagan 16 (Penyisihan s/d Final)' },
                  { size: 2, label: 'Bagan 2 (Final Langsung)' }
                ].map(opt => (
                  <button
                    key={opt.size}
                    type="button"
                    onClick={() => { playBeep('click'); setBracketSize(opt.size as any); }}
                    className={`p-2 rounded-lg border text-left text-xs font-mono transition-all cursor-pointer ${
                      bracketSize === opt.size
                        ? 'border-amber-500 bg-amber-950/40 text-amber-300 font-bold'
                        : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. STRATEGI URUTAN JADWAL */}
            <div className="p-3.5 rounded-xl border border-blue-500/20 bg-[#06081e]/80 flex flex-col space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-cyan-400" />
                STRATEGI URUTAN PARTAI
              </span>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => { playBeep('click'); setReorderStrategy('standar_ipsi_babak'); }}
                  className={`w-full p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    reorderStrategy === 'standar_ipsi_babak'
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 font-bold'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Babak Berjenjang (IPSI)</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300">Rekomendasi</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Perempat final dulu, lalu semi final, lalu final.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => { playBeep('click'); setReorderStrategy('per_kategori'); }}
                  className={`w-full p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    reorderStrategy === 'per_kategori'
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-300 font-bold'
                      : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold">Per Kategori Berurutan</div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Selesaikan kategori A sampai final, lalu kategori B.
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* D. LIVE ALLOCATION PREVIEW */}
          {arenaAllocations.length > 0 && parsedRecords.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  PRATINJAU PEMBAGIAN GELANGGANG & JADWAL
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Total: {groupedData.tandingCategories.length} Kategori Bagan Tanding | {groupedData.seniPesertaList.length} Peserta Seni
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {arenaAllocations.map(alloc => (
                  <div
                    key={alloc.arena.id}
                    className="p-3.5 rounded-xl border border-blue-500/30 bg-gradient-to-b from-blue-950/30 to-slate-950/50 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-sm font-black text-white">{alloc.arena.nama}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {alloc.matchCount} Partai
                        </span>
                      </div>

                      {alloc.categories.length > 0 ? (
                        <div className="mt-2.5 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Kategori Bagan Terkunci:
                          </span>
                          {alloc.categories.map((c, i) => (
                            <div
                              key={c.id || i}
                              className="text-xs font-mono p-1.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300 flex items-center justify-between"
                            >
                              <span className="truncate">{c.name}</span>
                              <span className="text-[10px] text-amber-400 font-bold shrink-0 ml-1">
                                {c.matches.length} M
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : alloc.seniList.length > 0 ? (
                        <div className="mt-2.5 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Peserta Seni Terkunci:
                          </span>
                          {alloc.seniList.slice(0, 5).map((p, i) => (
                            <div
                              key={p.id || i}
                              className="text-xs font-mono p-1.5 rounded bg-slate-900/80 border border-slate-800 text-slate-300 flex items-center justify-between"
                            >
                              <span className="truncate">{p.nama}</span>
                              <span className="text-[10px] text-cyan-400 font-bold shrink-0 ml-1">
                                {p.kategori}
                              </span>
                            </div>
                          ))}
                          {alloc.seniList.length > 5 && (
                            <div className="text-[10px] text-slate-500 font-mono text-center">
                              +{alloc.seniList.length - 5} peserta lainnya
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 font-mono mt-2">
                          Tidak ada alokasi pada matras ini
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] font-mono text-cyan-300">
                      <Shield className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>Semi & Final terkunci di {alloc.arena.nama}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. MODAL FOOTER */}
        <div className="p-4 border-t border-blue-500/20 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => { playBeep('click'); onClose(); }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            BATAL
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExecuteDistribution}
            disabled={parsedRecords.length === 0 || isLoading}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition-all cursor-pointer ${
              parsedRecords.length > 0 && !isLoading
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>BAGI KE GELANGGANG & SIMPAN JADWAL</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>

      {/* Google Sheets Modal if not connected */}
      <GoogleSheetsIntegrationModal
        isOpen={showSheetsModal}
        onClose={() => setShowSheetsModal(false)}
        onApplyParsedAthletes={(records) => {
          setParsedRecords(records);
          setFileName(`Google Sheets (${records.length} Atlet)`);
          playBeep('valid');
        }}
      />
    </div>
  );
}
