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
  X,
  Code2,
  Copy,
  Download,
  Check,
  Radio
} from 'lucide-react';
import {
  clearStoredGoogleToken,
  clearStoredWebhookUrl,
  createChampionshipSpreadsheet,
  downloadChampionshipXlsx,
  extractSpreadsheetId,
  fetchGoogleUserProfile,
  fetchSpreadsheetInfo,
  getActiveSpreadsheetId,
  getActiveSpreadsheetTitle,
  getActiveSpreadsheetUrl,
  getAutoSyncEnabled,
  getStoredGoogleToken,
  getStoredWebhookUrl,
  GoogleSpreadsheetInfo,
  GoogleUserProfile,
  importAthletesFromGoogleSheet,
  readPublicGoogleSheetCsv,
  requestGoogleAccessToken,
  saveWebhookUrl,
  setActiveSpreadsheet,
  setAutoSyncEnabled,
  syncAllMatchResultsToSheets,
  syncAllMatchResultsToWebhook,
  syncAllParticipantsToSheets,
  testWebhookConnection,
  APPS_SCRIPT_SAMPLE_CODE
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
  
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [isCopiedScript, setIsCopiedScript] = useState<boolean>(false);

  const [autoSync, setAutoSync] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'import' | 'sync' | 'webhook' | 'export' | 'oauth'>('import');
  
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

    setWebhookUrl(getStoredWebhookUrl());
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
      setActiveSpreadsheet(created.id, created.url, created.title);
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
    const input = manualUrlInput.trim();
    if (!input) {
      setStatusMessage({ text: 'Masukkan URL atau ID Spreadsheet.', type: 'error' });
      return;
    }

    const cleanId = extractSpreadsheetId(input);
    if (!cleanId) {
      setStatusMessage({ text: 'Format URL / ID Spreadsheet tidak valid.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ text: 'Memeriksa akses spreadsheet...', type: 'info' });

    // 1. If token is available, fetch full info
    if (token) {
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
        return;
      } catch (err: any) {
        console.warn('OAuth fetch failed, trying public read fallback:', err);
      }
    }

    // 2. Fallback: connect as public spreadsheet (anyone with the link can view)
    try {
      const sampleCsv = await readPublicGoogleSheetCsv(cleanId);
      if (sampleCsv && sampleCsv.trim()) {
        const url = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;
        const title = 'Google Spreadsheet (Tautan Publik)';
        setSpreadsheetId(cleanId);
        setSpreadsheetUrl(url);
        setSpreadsheetTitle(title);
        setActiveSpreadsheet(cleanId, url, title);
        setManualUrlInput('');
        setIsLoading(false);
        setStatusMessage({
          text: 'Tautan Google Sheet publik berhasil terhubung dan dapat diakses!',
          type: 'success'
        });
        return;
      }
    } catch (err: any) {
      setIsLoading(false);
      setStatusMessage({
        text: err.message || 'Spreadsheet tidak dapat diakses. Pastikan hak akses disetel: "Siapa saja yang memiliki link dapat melihat".',
        type: 'error'
      });
    }
  };

  const handleSyncParticipants = async () => {
    if (!spreadsheetId) {
      setStatusMessage({ text: 'Tentukan Spreadsheet tujuan terlebih dahulu.', type: 'error' });
      return;
    }

    // If webhook is configured, sync via webhook
    if (webhookUrl) {
      handleSyncViaWebhook();
      return;
    }

    if (!token) {
      setStatusMessage({ text: 'Hubungkan Google Account atau masukkan Webhook Apps Script untuk mengirim data.', type: 'error' });
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
    if (webhookUrl) {
      handleSyncViaWebhook();
      return;
    }

    if (!token || !spreadsheetId) {
      setStatusMessage({ text: 'Pastikan akun Google dan Spreadsheet telah terhubung, atau gunakan Webhook.', type: 'error' });
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

  const handleSaveWebhook = async () => {
    if (!webhookUrl.trim()) {
      clearStoredWebhookUrl();
      setStatusMessage({ text: 'Webhook URL dihapus.', type: 'info' });
      return;
    }

    saveWebhookUrl(webhookUrl.trim());
    setIsLoading(true);
    setStatusMessage({ text: 'Menguji koneksi Webhook Google Apps Script...', type: 'info' });

    try {
      const res = await testWebhookConnection(webhookUrl.trim());
      setIsLoading(false);
      setStatusMessage({
        text: res.title
          ? `Webhook berhasil tersambung ke: "${res.title}"!`
          : 'Webhook Google Apps Script aktif & siap digunakan!',
        type: 'success'
      });
    } catch (err: any) {
      setIsLoading(false);
      setStatusMessage({ text: `Perhatian: Webhook tersimpan, tapi tes respons error: ${err.message}`, type: 'info' });
    }
  };

  const handleSyncViaWebhook = async () => {
    if (!webhookUrl.trim()) {
      setStatusMessage({ text: 'Masukkan Webhook URL Google Apps Script terlebih dahulu.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ text: 'Mengirim seluruh data pertandingan (Tanding, Seni, Klasemen, Jadwal) ke Google Sheets...', type: 'info' });

    try {
      const res = await syncAllMatchResultsToWebhook(webhookUrl.trim(), effectiveArenasMap);
      setIsLoading(false);
      setStatusMessage({ text: res.message || 'Data berhasil disinkronkan ke Google Sheets!', type: 'success' });
    } catch (err: any) {
      setIsLoading(false);
      setStatusMessage({ text: err.message || 'Gagal mengirim data ke Webhook.', type: 'error' });
    }
  };

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SAMPLE_CODE);
    setIsCopiedScript(true);
    setTimeout(() => setIsCopiedScript(false), 2500);
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
    const targetId = spreadsheetId || extractSpreadsheetId(manualUrlInput.trim());
    if (!targetId) {
      setStatusMessage({ text: 'Masukkan tautan / ID Spreadsheet terlebih dahulu.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ text: `Membaca data atlet dari Google Sheets...`, type: 'info' });

    try {
      const athletes = await importAthletesFromGoogleSheet(token, targetId, selectedSheetName);
      setImportedAthletes(athletes);
      setSpreadsheetId(targetId);
      setActiveSpreadsheet(targetId);
      setIsLoading(false);
      setStatusMessage({
        text: `Berhasil membaca ${athletes.length} atlet dari Google Sheets! Siap didistribusikan.`,
        type: 'success'
      });
    } catch (err: any) {
      setIsLoading(false);
      setStatusMessage({
        text: err.message || 'Gagal membaca data dari spreadsheet. Pastikan izin akses disetel "Siapa saja yang memiliki link dapat melihat".',
        type: 'error'
      });
    }
  };

  const handleApplyImportedAthletes = () => {
    if (importedAthletes.length === 0) return;
    if (onApplyParsedAthletes) {
      onApplyParsedAthletes(importedAthletes);
      onClose();
    }
  };

  const handleDownloadXlsx = () => {
    try {
      downloadChampionshipXlsx(effectiveArenasMap, 'Rekap_Kejuaraan_Pencak_Silat_IPSI.xlsx');
      setStatusMessage({
        text: 'File Excel (.xlsx) berhasil diunduh dengan 5 tab lengkap siap buka di Google Sheets!',
        type: 'success'
      });
    } catch (err: any) {
      setStatusMessage({ text: `Gagal mengunduh: ${err.message}`, type: 'error' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-4xl bg-[#0a0f24] border border-emerald-500/30 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-white font-mono">
                  INTEGRASI GOOGLE SPREADSHEETS
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  LIVE SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Impor data peserta dari tautan Google Sheet & sinkronisasi otomatis hasil pertandingan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar: Active Sheet & Connection Status */}
        <div className="px-5 sm:px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Active Sheet Badge */}
          <div className="flex items-center gap-2">
            {spreadsheetId ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-200">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[240px] font-mono text-[11px]" title={spreadsheetTitle || spreadsheetId}>
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

            {webhookUrl && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/40 border border-purple-500/30 text-purple-300 font-mono text-[10px]">
                <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
                <span>Webhook Aktif</span>
              </div>
            )}
          </div>

          {/* Account status */}
          <div className="flex items-center gap-2">
            {token ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-medium">
                  {userProfile?.name || 'Akun Google Terhubung'}
                </span>
                <button
                  onClick={handleDisconnect}
                  className="ml-1 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('oauth')}
                className="text-blue-400 hover:text-blue-300 text-[11px] font-mono flex items-center gap-1 cursor-pointer"
              >
                <LinkIcon className="w-3 h-3" />
                <span>Opsi Login Google (Opsional)</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-5 sm:px-6 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono tracking-wider border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CloudDownload className="w-4 h-4" />
            <span>1. IMPOR PESERTA (LINK GOOGLE)</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono tracking-wider border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'sync'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CloudUpload className="w-4 h-4" />
            <span>2. SINKRONISASI HASIL</span>
          </button>

          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono tracking-wider border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'webhook'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>3. APPS SCRIPT WEBHOOK</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono tracking-wider border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'export'
                ? 'border-teal-500 text-teal-400 bg-teal-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>4. UNDUH EXCEL (.XLSX)</span>
          </button>

          <button
            onClick={() => setActiveTab('oauth')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono tracking-wider border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'oauth'
                ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>AKUN GOOGLE</span>
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`mx-5 sm:mx-6 mt-4 p-3 rounded-xl border flex items-center gap-2.5 text-xs font-mono ${
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
            <span className="flex-1">{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: IMPOR DARI GOOGLE SHEETS */}
          {activeTab === 'import' && (
            <div className="space-y-6">
              {/* Input Link Card */}
              <div className="p-5 rounded-xl border border-emerald-500/30 bg-slate-900/60 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase text-white font-mono flex items-center gap-2">
                      <LinkIcon className="w-4 h-4 text-emerald-400" />
                      Masukkan Tautan Google Sheets
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Salin tautan dari browser Anda. Pastikan hak akses spreadsheet diatur ke{' '}
                      <span className="text-emerald-300 font-semibold">"Siapa saja yang memiliki link dapat melihat"</span>.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <input
                    type="text"
                    value={manualUrlInput || (spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : '')}
                    onChange={(e) => setManualUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                  />
                  <button
                    onClick={handleFetchFromSheet}
                    disabled={isLoading || (!manualUrlInput.trim() && !spreadsheetId)}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider font-mono transition-all shrink-0 cursor-pointer shadow-lg shadow-emerald-950/50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Tarik Data Atlet</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center gap-2">
                    <span>Nama Tab:</span>
                    <input
                      type="text"
                      value={selectedSheetName}
                      onChange={(e) => setSelectedSheetName(e.target.value)}
                      placeholder="DATA PESERTA"
                      className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-emerald-300 font-mono w-40"
                    />
                  </div>
                  <button
                    onClick={handleDownloadXlsx}
                    className="text-teal-400 hover:text-teal-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Template Contoh Google Sheets (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Preview of Imported Athletes */}
              {importedAthletes.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      DATA ATLET TERBACA: {importedAthletes.length} PESERTA
                    </span>
                    <button
                      onClick={handleApplyImportedAthletes}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider font-mono shadow-lg shadow-emerald-950/50 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Terapkan & Bagi ke Gelanggang</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/80">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                        <tr>
                          <th className="py-2.5 px-3">No</th>
                          <th className="py-2.5 px-3">Nama Atlet</th>
                          <th className="py-2.5 px-3">Kontingen</th>
                          <th className="py-2.5 px-3">Kategori</th>
                          <th className="py-2.5 px-3">Kelas / Format</th>
                          <th className="py-2.5 px-3">Usia</th>
                          <th className="py-2.5 px-3">Gender</th>
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
                <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs space-y-2">
                  <FileSpreadsheet className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="font-mono">Belum ada data atlet yang ditarik.</p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Masukkan URL Google Sheets di atas, lalu klik tombol <b>"Tarik Data Atlet"</b>. Sistem akan otomatis memetakan nama, kontingen, kategori, kelas, dan gender.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SINKRONISASI HASIL PERTANDINGAN */}
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
                      <span className="text-emerald-300 font-mono">KLASEMEN KONTINGEN</span>.
                    </p>
                  </div>

                  <button
                    onClick={handleSyncResults}
                    disabled={isLoading || (!token && !webhookUrl)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>Kirim Hasil ke Google Sheets</span>
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
                    disabled={isLoading || (!token && !webhookUrl)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>Kirim Roster Peserta</span>
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

              {/* Structure Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <h4 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Struktur 5 Tab Resmi IPSI
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
                    <div className="text-[10px] text-slate-500 mt-1">11 Kolom Pool</div>
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

          {/* TAB 3: APPS SCRIPT WEBHOOK */}
          {activeTab === 'webhook' && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase text-white font-mono flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-purple-400" />
                      Sinkronisasi Tanpa Ribet via Google Apps Script
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Metode paling mudah & anti-gagal! Anda tidak perlu mendaftarkan Google Cloud Console ataupun membuat OAuth Client ID. Cukup tempel script sederhana ke Google Sheets Anda.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="font-bold text-white font-mono text-[11px] text-purple-300">
                    CARA PASANG DALAM 3 LANGKAH (30 DETIK):
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px]">
                    <li>Buka file Google Sheets Anda &rarr; Klik menu <b>Extensions</b> &rarr; <b>Apps Script</b>.</li>
                    <li>Hapus kode bawaan, lalu salin & tempel kode di bawah ini.</li>
                    <li>Klik tombol <b>Deploy</b> &rarr; <b>New deployment</b> &rarr; Pilih jenis <b>Web app</b> &rarr; Setel <i>Who has access</i> ke <b>Anyone</b> &rarr; Salin Web app URL-nya ke input di bawah.</li>
                  </ol>
                </div>

                {/* Script snippet with 1-click copy */}
                <div className="relative">
                  <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-200 overflow-x-auto max-h-40">
                    {APPS_SCRIPT_SAMPLE_CODE}
                  </pre>
                  <button
                    onClick={handleCopyAppsScript}
                    className="absolute top-2.5 right-2.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-[11px] flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                  >
                    {isCopiedScript ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedScript ? 'Tersalin!' : 'Salin Skrip'}</span>
                  </button>
                </div>

                {/* Webhook URL input */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-mono font-bold text-slate-300">
                    URL Web App Google Apps Script:
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <input
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-purple-500 outline-none"
                    />
                    <button
                      onClick={handleSaveWebhook}
                      disabled={isLoading}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs uppercase font-mono transition-all shrink-0 cursor-pointer"
                    >
                      Tes & Simpan
                    </button>
                    <button
                      onClick={handleSyncViaWebhook}
                      disabled={isLoading || !webhookUrl.trim()}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase font-mono transition-all shrink-0 cursor-pointer shadow-md"
                    >
                      Sync Sekarang
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EKSPOR FILE EXCEL (.XLSX) */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="p-6 rounded-xl border border-teal-500/30 bg-teal-950/20 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mx-auto shadow-inner">
                  <Download className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-white font-mono uppercase">
                    Unduh Rekap Spreadsheet Resmi (.xlsx)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-lg mx-auto">
                    Unduh seluruh data pertandingan ke dalam 1 file buku kerja Excel (.xlsx) dengan 5 sheet terformat lengkap: Data Peserta, Hasil Tanding, Hasil Seni, Klasemen Kontingen, dan Jadwal Gelanggang.
                  </p>
                </div>

                <button
                  onClick={handleDownloadXlsx}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm uppercase tracking-wider font-mono shadow-xl shadow-teal-950/50 cursor-pointer transition-all active:scale-95 inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File Excel (.xlsx) Lengkap</span>
                </button>

                <p className="text-[11px] text-slate-400">
                  File ini dapat langsung dibuka di Microsoft Excel, Google Sheets (cukup drag & drop ke Drive), WPS Office, atau LibreOffice.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: AKUN GOOGLE (OAUTH) */}
          {activeTab === 'oauth' && (
            <div className="space-y-6">
              {/* Option A: Google Login status */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white text-base font-mono">Status Akun Google</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {token
                      ? `Terhubung sebagai ${userProfile?.name || 'User'} (${userProfile?.email || 'OAuth Aktif'})`
                      : 'Belum terhubung dengan akun Google'}
                  </p>
                </div>

                {token ? (
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-bold text-xs uppercase font-mono transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Putuskan Hubungan</span>
                  </button>
                ) : (
                  <button
                    onClick={handleConnectGoogle}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase font-mono transition-all shadow-md cursor-pointer"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>Masuk dengan Google</span>
                  </button>
                )}
              </div>

              {/* Option B: Create New Spreadsheet */}
              <div className="p-5 rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs uppercase mb-1">
                    <Plus className="w-4 h-4" />
                    <span>BUAT SPREADSHEET BARU OTOMATIS</span>
                  </div>
                  <h3 className="font-bold text-white text-base">Buat Spreadsheet di Google Drive Anda</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg">
                    Sistem akan otomatis membuat file Google Sheets baru dengan 5 sheet resmi IPSI, header berwarna, dan baris judul yang telah terkunci.
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

              {/* Iframe tip */}
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-950/20 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-blue-300 font-mono">TIPS TAMPILAN PREVIEW / IFRAME:</span>
                <p>
                  Jika jendela popup login Google terblokir oleh browser di dalam frame preview, Anda dapat membuka aplikasi di tab baru melalui tombol pop-out browser di pojok atas, atau gunakan <b>Metode 3: Apps Script Webhook</b> yang tidak membutuhkan izin OAuth sama sekali.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sistem Skoring Pencak Silat IPSI &bull; Google Sheets & Excel Compatible</span>
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
