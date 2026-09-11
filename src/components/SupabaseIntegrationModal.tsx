/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  Zap,
  Trash2,
  X
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearStoredSupabaseConfig,
  isSupabaseConfigured,
  testSupabaseConnection,
  syncAllArenasToSupabase,
  getSupabaseAutoSyncEnabled,
  setSupabaseAutoSyncEnabled,
  SUPABASE_SQL_SAMPLE
} from '../services/supabaseService';
import { GelanggangInfo, MatchHistory, MatchState, TGRState } from '../types';

interface SupabaseIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  arenasMap: Record<string, { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }>;
}

export default function SupabaseIntegrationModal({
  isOpen,
  onClose,
  arenasMap
}: SupabaseIntegrationModalProps) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isCopiedSql, setIsCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sync' | 'sql'>('config');

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setAutoSync(getSupabaseAutoSyncEnabled());
      setStatusMessage(null);
    }
  }, [isOpen]);

  const handleSaveConfig = () => {
    if (!url.trim() || !anonKey.trim()) {
      setStatusMessage({ text: 'Harap isi URL Proyek dan Anon Key Supabase.', type: 'error' });
      return;
    }
    saveSupabaseConfig(url.trim(), anonKey.trim());
    setStatusMessage({
      text: 'Konfigurasi Supabase berhasil disimpan di browser!',
      type: 'success'
    });
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setStatusMessage({ text: 'Menguji koneksi ke Supabase...', type: 'info' });
    const res = await testSupabaseConnection(url.trim(), anonKey.trim());
    setIsLoading(false);
    if (res.success) {
      saveSupabaseConfig(url.trim(), anonKey.trim());
      setStatusMessage({ text: res.message, type: 'success' });
    } else {
      setStatusMessage({ text: res.message, type: 'error' });
    }
  };

  const handleClearConfig = () => {
    clearStoredSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setAutoSync(false);
    setSupabaseAutoSyncEnabled(false);
    setStatusMessage({ text: 'Konfigurasi Supabase telah dihapus.', type: 'info' });
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSync(enabled);
    setSupabaseAutoSyncEnabled(enabled);
    setStatusMessage({
      text: enabled
        ? 'Auto-Sync Supabase aktif: Perubahan gelanggang dan hasil tanding otomatis disinkronkan.'
        : 'Auto-Sync Supabase dinonaktifkan.',
      type: 'info'
    });
  };

  const handleSyncAll = async () => {
    if (!isSupabaseConfigured() && (!url.trim() || !anonKey.trim())) {
      setStatusMessage({ text: 'Harap hubungkan dan simpan kredensial Supabase terlebih dahulu.', type: 'error' });
      return;
    }

    if (url.trim() && anonKey.trim()) {
      saveSupabaseConfig(url.trim(), anonKey.trim());
    }

    setIsLoading(true);
    setStatusMessage({ text: 'Mengunggah seluruh data arena & hasil tanding ke Supabase...', type: 'info' });

    const res = await syncAllArenasToSupabase(arenasMap);
    setIsLoading(false);

    if (res.success) {
      setStatusMessage({
        text: `Berhasil menyinkronkan data gelanggang (${res.count} arena) & riwayat pertandingan ke database Supabase!`,
        type: 'success'
      });
    } else {
      setStatusMessage({
        text: `Gagal sinkronisasi: ${res.error}. Pastikan tabel sudah dibuat menggunakan skrip SQL.`,
        type: 'error'
      });
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SAMPLE);
    setIsCopiedSql(true);
    setTimeout(() => setIsCopiedSql(false), 2500);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([SUPABASE_SQL_SAMPLE], { type: 'text/plain' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = 'supabase-schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    setStatusMessage({ text: 'File "supabase-schema.sql" berhasil diunduh!', type: 'success' });
  };

  if (!isOpen) return null;

  const isConfigured = isSupabaseConfigured() || (url && anonKey);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-3xl bg-[#09151c] border border-emerald-500/40 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-emerald-500/20 bg-gradient-to-r from-emerald-950/60 via-slate-900/60 to-cyan-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-white font-mono">
                  INTEGRASI SUPABASE
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  POSTGRESQL & REALTIME
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono">
                Penyimpanan awan persisten & sinkronisasi live multi-perangkat via Netlify/Cloud
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-mono font-bold transition-colors flex items-center gap-2 border-t border-x ${
              activeTab === 'config'
                ? 'bg-[#09151c] border-emerald-500/50 text-emerald-300 border-b-transparent'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>1. KONEKSI & KUNCI</span>
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-mono font-bold transition-colors flex items-center gap-2 border-t border-x ${
              activeTab === 'sync'
                ? 'bg-[#09151c] border-emerald-500/50 text-emerald-300 border-b-transparent'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>2. SINKRONISASI DATA</span>
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-mono font-bold transition-colors flex items-center gap-2 border-t border-x ${
              activeTab === 'sql'
                ? 'bg-[#09151c] border-emerald-500/50 text-emerald-300 border-b-transparent'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>3. SKEMA TABEL SQL</span>
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`mx-5 sm:mx-6 mt-4 p-3 rounded-xl border flex items-center gap-2.5 text-xs font-mono ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/50 text-rose-300'
                : 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-cyan-400" />
            )}
            <span className="flex-1">{statusMessage.text}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: KONEKSI & KUNCI */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="text-emerald-400 font-bold flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  <span>Dukungan Database Supabase (PostgreSQL)</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Supabase memungkinkan seluruh arena, partai, dan monitor berjalan secara online dan tersinkronisasi antar perangkat di Netlify atau jaringan internet tanpa memerlukan server lokal.
                </p>
                <div className="pt-2 text-slate-400">
                  Belum punya proyek? Buka{' '}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 underline inline-flex items-center gap-1 hover:text-emerald-300"
                  >
                    supabase.com <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  &rarr; <b>Project Settings</b> &rarr; <b>API</b> &rarr; Salin Project URL & Project API Keys (anon/public).
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">
                    Project URL Supabase:
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzabcdefghijklm.supabase.co"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 mb-1.5">
                    Project API Key (anon / public):
                  </label>
                  <input
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono focus:border-emerald-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 font-mono mt-1">
                    Gunakan kunci publik (<b>anon</b>), bukan secret key (service_role). Kunci ini aman untuk browser.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-md disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Uji & Hubungkan</span>
                </button>

                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors border border-slate-700"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Simpan Kredensial</span>
                </button>

                {isConfigured && (
                  <button
                    onClick={handleClearConfig}
                    className="px-4 py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Kunci</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SINKRONISASI DATA */}
          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Auto-Sync Realtime Gelanggang:</span>
                  <button
                    onClick={() => handleToggleAutoSync(!autoSync)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors flex items-center gap-2 cursor-pointer ${
                      autoSync
                        ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{autoSync ? 'AKTIF' : 'NONAKTIF'}</span>
                  </button>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Jika aktif, setiap partai yang selesai, perubahan skor, atau status babak akan langsung tersimpan ke Supabase dan diteruskan ke perangkat lain via Supabase Realtime.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-mono font-bold text-slate-200">
                  Sinkronisasi Manual (Push Seluruh Gelanggang)
                </h4>
                <p className="text-xs text-slate-400 font-mono">
                  Kirim status seluruh gelanggang aktif ({Object.keys(arenasMap).length} arena) dan seluruh riwayat partai yang telah selesai ke tabel database Supabase saat ini.
                </p>
                <button
                  onClick={handleSyncAll}
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-mono text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-lg disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Kirim Data ke Supabase Sekarang</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SKEMA TABEL SQL */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs font-mono text-slate-300">
                <div className="font-bold text-emerald-400">Petunjuk Pembuatan Tabel Supabase:</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Buka dashboard proyek Anda di <b>supabase.com</b>.</li>
                  <li>Buka menu <b>SQL Editor</b> di panel sebelah kiri.</li>
                  <li>Klik <b>New query</b>, lalu paste skrip SQL di bawah ini.</li>
                  <li>Klik tombol <b>Run</b>. Semua tabel, kebijakan akses (RLS), dan Realtime akan langsung aktif!</li>
                </ol>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-200 overflow-x-auto max-h-48 pb-12 sm:pb-4">
                  {SUPABASE_SQL_SAMPLE}
                </pre>
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    onClick={handleDownloadSql}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-mono text-[11px] flex items-center gap-1.5 shadow-md cursor-pointer border border-slate-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Unduh .sql</span>
                  </button>
                  <button
                    onClick={handleCopySql}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                  >
                    {isCopiedSql ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-slate-400">
              Status Supabase: <b className="text-white">{isConfigured ? 'Terkonfigurasi' : 'Belum Terhubung'}</b>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
}
