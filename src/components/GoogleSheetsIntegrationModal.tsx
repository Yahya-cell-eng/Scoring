/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  CloudUpload,
  CloudDownload,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Link as LinkIcon,
  Plus,
  LogOut,
  Sparkles,
  Users,
  Trophy,
  ShieldCheck,
  ChevronRight,
  Database,
  X
} from 'lucide-react';
import {
  clearStoredGoogleToken,
  createChampionshipSpreadsheet,
  extractSpreadsheetId,
  fetchGoogleUserProfile,
  fetchSpreadsheetInfo,
  getActiveSpreadsheetId,
  getActiveSpreadsheetTitle,
  getActiveSpreadsheetUrl,
  getAutoSyncEnabled,
  getStoredGoogleToken,
  GoogleSpreadsheetInfo,
  GoogleUserProfile,
  importAthletesFromGoogleSheet,
  requestGoogleAccessToken,
  setActiveSpreadsheet,
  setAutoSyncEnabled,
  syncAllMatchResultsToSheets,
  syncAllParticipantsToSheets
} from '../services/googleSheetsService';
import { GelanggangInfo, MatchHistory, MatchState, TGRState } from '../types';
import { ParsedAthleteRecord } from '../utils/smartDataParser';

interface GoogleSheetsIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  allArenasMap?: Record<string, { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }>;
  onApplyParsedAthletes?: (athletes: ParsedAthleteRecord[]) => void;
}

export default function GoogleSheetsIntegrationModal({
  isOpen,
  onClose,
  allArenasMap,
  onApplyParsedAthletes
}: GoogleSheetsIntegrationModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<GoogleUserProfile | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>('');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>('');
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>('');
  const [spreadsheetInfo, setSpreadsheetInfo] = useState<GoogleSpreadsheetInfo | null>(null);
  
  const [autoSync, setAutoSync] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'sync' | 'import' | 'setup'>('sync');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [manualUrlInput, setManualUrlInput] = useState<string>('');
  
  // Import preview state
  const [importedAthletes, setImportedAthletes] = useState<ParsedAthleteRecord[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('DATA PESERTA');

  // Effective arenas map with localStorage fallback
  const effectiveArenasMap = useMemo(() => {
    if (allArenasMap && Object.keys(allArenasMap).length > 0) return allArenasMap;
    try {
      const raw = localStorage.getItem('ipsi_all_arenas_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Error loading fallback arenas map:', e);
    }
    return allArenasMap || {};
  }, [allArenasMap]);

  // Initialize from storage on mount
  useEffect(() => {
    const existingToken = getStoredGoogleToken();
    if (existingToken) {
      setToken(existingToken);
      fetchGoogleUserProfile(existingToken).then(prof => {
        if (prof) setUserProfile(prof);
      });
    }

    const savedId = getActiveSpreadsheetId();
    if (savedId) {
      setSpreadsheetId(savedId);
      setSpreadsheetUrl(getActiveSpreadsheetUrl());
      setSpreadsheetTitle(getActiveSpreadsheetTitle());
    }

    setAutoSync(getAutoSyncEnabled());
  }, [isOpen]);

  // When token and spreadsheetId exist, load spreadsheet info
  useEffect(() => {
    if (token && spreadsheetId) {
      fetchSpreadsheetInfo(token, spreadsheetId)
        .then(info => {
          setSpreadsheetInfo(info);
          setSpreadsheetTitle(info.title);
          setSpreadsheetUrl(info.url);
          if (info.sheets.length > 0 && !info.sheets.includes(selectedSheetName)) {
            setSelectedSheetName(info.sheets[0]);
          }
        })
        .catch(() => {
          // ignore or prompt
        });
    }
  }, [token, spreadsheetId]);

  const handleConnectGoogle = () => {
    setIsLoading(true);
    setStatusMessage({ text: 'Membuka dialog otorisasi Google...', type: 'info' });
    requestGoogleAccessToken(
      (newToken) => {
        setToken(newToken);
        setIsLoading(false);
        setStatusMessage({ text: 'Berhasil terhubung dengan Google Account!', type: 'success' });
        fetchGoogleUserProfile(newToken).then(prof => {
          if (prof) setUserProfile(prof);
        });
      },
      (err) => {
        setIsLoading(false);
        setStatusMessage({ text: err, type: 'error' });
      }
    );
  };

  const handleDisconnect = () => {
    clearStoredGoogleToken();
    setToken(null);
    setUserProfile(null);
    setStatusMessage({ text: 'Koneksi Google diputus.', type: 'info' });
  };

  const handleCreateNewSpreadsheet = async () => {
    if (!token) {
      setStatusMessage({ text: 'Silakan hubungkan Google Account terlebih dahulu.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ text: 'Sedang membuat Google Spreadsheet Kejuaraan Silat baru...', type: 'info' });

    try {
      const created = await createChampionshipSpreadsheet(token, 'Kejuaraan Pencak Silat IPSI');
      setSpreadsheetId(created.id);
      setSpreadsheetUrl(created.url);
      setSpreadsheetTitle(created.title);
      setSpreadsheetInfo(created);
      setIsLoading(false);
      setStatusMessage({
        text: `Berhasil membuat spreadsheet: "${created.title}". 5 Tab resmi telah disiapkan!`,
        type: 'success'
      });
    } catch (err: any) {
      setIsLoading(false);
      setStatusMessage({ text: err.message || 'Gagal membuat spreadsheet.', type: 'error' });
    }
  };

  const handleConnectExistingSpreadsheet = async () => {
    if (!manualUrlInput.trim()) {
      setStatusMessage({ text: 'Masukkan URL atau ID Spreadsheet.', type: 'error' });
      return;
    }
    if (!token) {
      setStatusMessage({ text: 'Silakan hubungkan Google Account terlebih dahulu.', type: 'error' });
      return;
    }

    const cleanId = extractSpreadsheetId(manualUrlInput);
    setIsLoading(true);
    setStatusMessage({ text: 'Memvalidasi spreadsheet...', type: 'info' });

    try {
      const info = await fetchSpreadsheetInfo(token, cleanId);
      setSpreadsheetId(info.id);
      setSpreadsheetUrl(info.url);
      setSpreadsheetTitle(info.title);
      setSpreadsheetInfo(info);
      setActiveSpreadsheet(info.id, info.url, info.title);
      setManualUrlInput('');
      setIsLoading(false);
      setStatusMessage({ text: `Berhasil terhubung ke spreadsheet: "${info.title}"!`, type: 'success' });
    } catch (err: any) {
      setIsLoading(false);
      setStatusMessage({ text: err.message || 'Spreadsheet tidak ditemukan atau tidak memiliki akses.', type: 'error' });
    }
  };

  const handleSyncParticipants = async () => {
    if (!token || !spreadsheetId) {
      setStatusMessage({ text: 'Pastikan akun Google dan Spreadsheet telah terhubung.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ text: 'Mengunggah seluruh data atlet ke sheet "DATA PESERTA"...', type: 'info' });

    try {
      const count = await syncAllParticipantsToSheets(token, spreadsheetId, effectiveArenasMap);
      setIsLoading(false);
      setStatusMessage({
        text: `Berhasil mengekspor ${count} atlet ke sheet "DATA PESERTA"!`,
        type: 'success'
      });
    } catch (err: any) {
      setIsLoading(false);
      setStatusMessage({ text: err.message || 'Gagal sinkronisasi data peserta.', type: 'error' });
    }
  };

  const handleSyncResults = async () => {
    if (!token || !spreadsheetId) {
      setStatusMessage({ text: 'Pastikan akun Google dan Spreadsheet telah terhubung.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ text: 'Mengunggah hasil tanding, seni TGR, klasemen medali, dan jadwal...', type: 'info' });

    try {
      const res = await syncAllMatchResultsToSheets(token, spreadsheetId, effectiveArenasMap);
      setIsLoading(false);
      setStatusMessage({
        text: `Sukses! ${res.tandingCount} hasil tanding & ${res.seniCount} seni TGR telah disinkronkan ke Google Sheets!`,
        type: 'success'
      });
    } catch (err: any) {
      setIsLoading(false);
      setStatusMessage({ text: err.message || 'Gagal sinkronisasi hasil pertandingan.', type: 'error' });
    }
  };

  const handleToggleAutoSync = (val: boolean) => {
    setAutoSync(val);
    setAutoSyncEnabled(val);
    setStatusMessage({
      text: val 
        ? 'Auto-Sync aktif: Setiap hasil pertandingan baru akan otomatis dikirim ke Google Sheets.' 
        : 'Auto-Sync dinonaktifkan.',
      type: 'info'
    });
  };

  const handleFetchFromSheet = async () => {
    if (!token || !spreadsheetId) {
      setStatusMessage({ text: 'Pastikan akun Google dan Spreadsheet telah terhubung.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ text: `Membaca baris data dari sheet "${selectedSheetName}"...`, type: 'info' });

    try {
      const athletes = await importAthletesFromGoogleSheet(token, spreadsheetId, selectedSheetName);
      setImportedAthletes(athletes);
      setIsLoading(false);
      setStatusMessage({
        text: `Berhasil membaca ${athletes.length} atlet dari Google Sheets! Siap didistribusikan.`,
        type: 'success'
      });
    } catch (err: any) {
      setIsLoading(false);
      setStatusMessage({ text: err.message || 'Gagal membaca data dari spreadsheet.', type: 'error' });
    }
  };

  const handleApplyImportedAthletes = () => {
    if (importedAthletes.length === 0) return;
    if (onApplyParsedAthletes) {
      onApplyParsedAthletes(importedAthletes);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-4xl bg-[#0a0f24] border border-emerald-500/30 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wider uppercase text-white font-mono">
                  INTEGRASI GOOGLE SPREADSHEETS
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  LIVE SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Hubungkan data atlet, bagan pertandingan, dan rekap skor hasil tanding ke Google Sheets
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Google Account & Active Spreadsheet Status Bar */}
        <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Account status */}
          <div className="flex items-center gap-2.5">
            {token ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">
                  {userProfile?.name ? `${userProfile.name} (${userProfile.email})` : 'Google Account Terhubung'}
                </span>
                <button
                  onClick={handleDisconnect}
                  className="ml-2 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Putuskan koneksi Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnectGoogle}
                disabled={isLoading}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Hubungkan Google Account</span>
              </button>
            )}
          </div>

          {/* Connected Spreadsheet Badge */}
          <div className="flex items-center gap-2">
            {spreadsheetId ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[200px] font-mono text-[11px]" title={spreadsheetTitle}>
                  {spreadsheetTitle || spreadsheetId}
                </span>
                {spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 transition-colors p-1"
                    title="Buka Spreadsheet di Tab Baru"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ) : (
              <span className="text-amber-400/90 text-[11px] font-mono flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Belum ada spreadsheet aktif
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono tracking-wider border-b-2 transition-all ${
              activeTab === 'sync'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CloudUpload className="w-4 h-4" />
            <span>SINKRONISASI & HASIL TANDING</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono tracking-wider border-b-2 transition-all ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CloudDownload className="w-4 h-4" />
            <span>IMPOR PESERTA DARI SHEETS</span>
          </button>

          <button
            onClick={() => setActiveTab('setup')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono tracking-wider border-b-2 transition-all ${
              activeTab === 'setup'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>PILIH / BUAT SPREADSHEET</span>
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl border flex items-center gap-2.5 text-xs font-mono ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                : 'bg-blue-950/60 border-blue-500/50 text-blue-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <RefreshCw className="w-4 h-4 shrink-0 text-blue-400 animate-spin" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: SINKRONISASI & EKSPOR */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sync Hasil Pertandingan Card */}
                <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2 text-emerald-400">
                      <Trophy className="w-5 h-5" />
                      <h3 className="font-bold text-sm tracking-wide text-white uppercase font-mono">
                        Hasil Tanding & Klasemen
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Kirim seluruh riwayat partai yang telah selesai dari semua gelanggang ke tab{' '}
                      <span className="text-emerald-300 font-mono">HASIL TANDING</span>,{' '}
                      <span className="text-emerald-300 font-mono">HASIL SENI TGR</span>, dan{' '}
                      <span className="text-emerald-300 font-mono">KLASEMEN KONTINGEN</span> secara otomatis.
                    </p>
                  </div>

                  <button
                    onClick={handleSyncResults}
                    disabled={isLoading || !token || !spreadsheetId}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>Sinkronkan Hasil Sekarang</span>
                  </button>
                </div>

                {/* Sync Data Peserta Card */}
                <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2.5 mb-2 text-blue-400">
                      <Users className="w-5 h-5" />
                      <h3 className="font-bold text-sm tracking-wide text-white uppercase font-mono">
                        Data Peserta & Bagan
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Ekspor seluruh daftar atlet, kontingen, kategori tanding/seni, dan alokasi gelanggang ke tab{' '}
                      <span className="text-blue-300 font-mono">DATA PESERTA</span> dan{' '}
                      <span className="text-blue-300 font-mono">JADWAL GELANGGANG</span>.
                    </p>
                  </div>

                  <button
                    onClick={handleSyncParticipants}
                    disabled={isLoading || !token || !spreadsheetId}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>Sinkronkan Data Peserta</span>
                  </button>
                </div>
              </div>

              {/* Auto Sync Toggle & Info */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase text-white font-mono">
                      Auto-Sync Otomatis Tiap Partai Selesai
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Setiap kali Ketua Pertandingan mengesahkan pemenang, baris skor langsung dikirim ke spreadsheet
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => handleToggleAutoSync(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Live Preview of Sheets Output Format */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <h4 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Struktur Tab Spreadsheet Resmi IPSI
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] font-mono font-bold text-emerald-400">TAB 1</div>
                    <div className="text-xs font-bold text-white mt-0.5">DATA PESERTA</div>
                    <div className="text-[10px] text-slate-500 mt-1">10 Kolom Roster</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] font-mono font-bold text-emerald-400">TAB 2</div>
                    <div className="text-xs font-bold text-white mt-0.5">HASIL TANDING</div>
                    <div className="text-[10px] text-slate-500 mt-1">12 Kolom Partai</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] font-mono font-bold text-emerald-400">TAB 3</div>
                    <div className="text-xs font-bold text-white mt-0.5">HASIL SENI TGR</div>
                    <div className="text-[10px] text-slate-500 mt-1">12 Kolom Pool</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] font-mono font-bold text-emerald-400">TAB 4</div>
                    <div className="text-xs font-bold text-white mt-0.5">JADWAL ARENA</div>
                    <div className="text-[10px] text-slate-500 mt-1">Status Gelanggang</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] font-mono font-bold text-emerald-400">TAB 5</div>
                    <div className="text-xs font-bold text-white mt-0.5">KLASEMEN</div>
                    <div className="text-[10px] text-slate-500 mt-1">Perolehan Medali</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPOR DARI GOOGLE SHEETS */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase text-white font-mono">
                      Ambil Data Atlet Langsung dari Spreadsheet
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pilih nama sheet yang berisi nama atlet, kontingen, kategori, kelas, dan gender
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {spreadsheetInfo?.sheets && spreadsheetInfo.sheets.length > 0 ? (
                      <select
                        value={selectedSheetName}
                        onChange={(e) => setSelectedSheetName(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                      >
                        {spreadsheetInfo.sheets.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={selectedSheetName}
                        onChange={(e) => setSelectedSheetName(e.target.value)}
                        placeholder="Nama Sheet (e.g. DATA PESERTA)"
                        className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono"
                      />
                    )}

                    <button
                      onClick={handleFetchFromSheet}
                      disabled={isLoading || !token || !spreadsheetId}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase font-mono shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>Tarik Data</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview of Imported Athletes */}
              {importedAthletes.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      PRATINJAU DATA ATLET TERBACA ({importedAthletes.length} PESERTA)
                    </span>
                    <button
                      onClick={handleApplyImportedAthletes}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider font-mono shadow-lg shadow-emerald-950/40 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Terapkan & Bagi ke Gelanggang</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/80">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                        <tr>
                          <th className="py-2 px-3">No</th>
                          <th className="py-2 px-3">Nama Atlet</th>
                          <th className="py-2 px-3">Kontingen</th>
                          <th className="py-2 px-3">Kategori</th>
                          <th className="py-2 px-3">Kelas / Format</th>
                          <th className="py-2 px-3">Usia</th>
                          <th className="py-2 px-3">Gender</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {importedAthletes.map((a, idx) => (
                          <tr key={a.id || idx} className="hover:bg-slate-900/50 transition-colors">
                            <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-white">{a.nama}</td>
                            <td className="py-2 px-3 text-emerald-300">{a.kontingen}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                {a.kategoriType}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-blue-300">{a.kelasDisplay || a.kelas}</td>
                            <td className="py-2 px-3 text-slate-400">{a.kategoriUsia}</td>
                            <td className="py-2 px-3 text-slate-400">{a.gender}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs font-mono">
                  Belum ada data atlet yang ditarik. Klik tombol "Tarik Data" untuk membaca baris dari spreadsheet.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SETUP & KONEKSI SPREADSHEET */}
          {activeTab === 'setup' && (
            <div className="space-y-6">
              {/* Option A: Create New Spreadsheet */}
              <div className="p-5 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs uppercase mb-1">
                    <Plus className="w-4 h-4" />
                    <span>OPSI 1: BUAT SPREADSHEET BARU OTOMATIS</span>
                  </div>
                  <h3 className="font-bold text-white text-base">Buat Spreadsheet Kejuaraan Silat di Google Drive</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg">
                    Sistem akan otomatis membuat file Google Sheets baru dengan format 5 sheet resmi IPSI, header berwarna, dan baris judul yang telah terkunci (frozen row).
                  </p>
                </div>

                <button
                  onClick={handleCreateNewSpreadsheet}
                  disabled={isLoading || !token}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider font-mono shadow-lg transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat di Google Drive</span>
                </button>
              </div>

              {/* Option B: Connect Existing Spreadsheet */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60">
                <div className="flex items-center gap-2 text-blue-400 font-mono font-bold text-xs uppercase mb-1">
                  <LinkIcon className="w-4 h-4" />
                  <span>OPSI 2: HUBUNGKAN SPREADSHEET YANG SUDAH ADA</span>
                </div>
                <h3 className="font-bold text-white text-base">Tempel Link Google Sheets</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Pastikan spreadsheet tersebut telah dibagikan izin edit kepada akun Google yang Anda hubungkan.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <input
                    type="text"
                    value={manualUrlInput}
                    onChange={(e) => setManualUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1A2b3C.../edit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={handleConnectExistingSpreadsheet}
                    disabled={isLoading || !token || !manualUrlInput.trim()}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider font-mono transition-all shrink-0 cursor-pointer"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>Hubungkan</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Koneksi aman melalui Google Identity Services (OAuth2) & Sheets API v4</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
}
