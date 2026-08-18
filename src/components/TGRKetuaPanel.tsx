import React, { useState } from 'react';
import { TGRState, TGRPeserta } from '../types';
import { playBeep } from '../utils/sound';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Key, Play, Pause, RefreshCw, AlertOctagon, Check, X, Shield, Lock, Unlock, HelpCircle, AlertCircle, Maximize2, Minimize2, Trophy } from 'lucide-react';

interface TGRKetuaPanelProps {
  state: TGRState;
  dispatch: (type: string, payload?: any) => Promise<any>;
  onBack: () => void;
  theme: 'dark' | 'light';
}

export default function TGRKetuaPanel({ state, dispatch, onBack, theme }: TGRKetuaPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    playBeep('click');
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'ketua2026') {
      playBeep('valid');
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      playBeep('warning');
      setLoginError('Sandi Ketua Pertandingan salah! Gunakan: ketua2026');
    }
  };

  const handleToggleSession = async (currentStatus: 'open' | 'closed') => {
    playBeep('valid');
    const nextStatus = currentStatus === 'open' ? 'closed' : 'open';
    await dispatch('TGR_TOGGLE_SESSION', { status: nextStatus });
    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Ketua Pertandingan',
      action: `Mengubah status sesi penilaian juri menjadi: [${nextStatus.toUpperCase()}]`
    });
  };

  const handleApproveCorrection = async (juriId: string) => {
    playBeep('valid');
    await dispatch('TGR_APPROVE_JURI_CORRECTION', { juriId });
    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Ketua Pertandingan',
      action: `MENYETUJUI koreksi nilai juri ${juriId.replace('juri', '')}`
    });
  };

  const handleRejectCorrection = async (juriId: string) => {
    playBeep('warning');
    await dispatch('TGR_REJECT_JURI_CORRECTION', { juriId });
    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Ketua Pertandingan',
      action: `MENOLAK koreksi nilai juri ${juriId.replace('juri', '')}`
    });
  };

  const handleTechnicalReset = async (pesertaId: string, nama: string) => {
    if (!confirm(`TINDAKAN SANGAT BERBAHAYA! Reset semua nilai & juri untuk peserta: ${nama}?`)) return;
    playBeep('warning');

    await dispatch('TGR_CANCEL_SCORE', { pesertaId });
    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Ketua Pertandingan',
      action: `Melakukan RESET TEKNIS (pembatalan nilai) untuk peserta: ${nama}`
    });
  };

  const activePeserta = state.pesertaList.find(p => p.id === state.activePesertaId);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#050202] text-slate-100 p-4 font-sans relative">
        <div className="absolute inset-0 bg-[radial-gradient(#991b1b_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md border border-amber-500/20 bg-slate-950/90 rounded-2xl p-8 shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 w-8 h-1 border-t border-l border-amber-500" />
          <div className="absolute top-0 right-0 w-8 h-1 border-t border-r border-amber-500" />

          <div className="text-center mb-6">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-3 animate-pulse" />
            <h2 className="text-xl font-black font-sport tracking-widest text-red-500 uppercase">
              KETUA PERTANDINGAN (TGR)
            </h2>
            <p className="text-[10px] uppercase tracking-wider font-mono text-slate-400 mt-1">
              PANEL OTORITAS TERTINGGI & PERSETUJUAN KOREKSI
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                PASSWORD KETUA PERTANDINGAN
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2.5 px-4 bg-slate-900 border border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="ketua2026"
                required
              />
            </div>

            {loginError && (
              <div className="text-[10px] font-bold text-red-400 font-mono uppercase bg-red-950/40 p-2.5 rounded-lg border border-red-500/20 text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 text-white font-black font-sport tracking-wider text-xs uppercase rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Key className="w-4 h-4 text-white" />
              <span>MASUK KETUA</span>
            </button>
          </form>

          <button
            onClick={onBack}
            className="w-full mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest hover:text-slate-300 font-mono transition-colors text-center block"
          >
            Kembali ke Pemilihan Peran
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#050202] text-slate-100 font-sans select-none overflow-hidden">
      <div className="absolute top-0 right-1/4 w-[28rem] h-[28rem] rounded-full blur-[150px] pointer-events-none bg-red-950/20" />

      {/* Header Panel */}
      <header className="bg-slate-950 border-b border-red-500/20 px-4 py-3 flex items-center justify-between shadow-md z-15">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 cursor-pointer rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-black font-sport tracking-widest text-red-500 uppercase">
              PANEL KETUA PERTANDINGAN (TGR)
            </h1>
            <p className="text-[10px] font-mono tracking-wider text-slate-400">
              MODERATOR KOREKSI NILAI & RESIDUAL TEKNIS ARENA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 cursor-pointer rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <div className="px-4 py-1.5 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 font-black font-sport text-xs tracking-wider uppercase flex items-center gap-2 animate-pulse">
            <Shield className="w-3.5 h-3.5 text-red-500" />
            <span>KETUA PERTANDINGAN POWER</span>
          </div>
        </div>
      </header>

      {/* Main Grid splits */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 p-4 gap-4 overflow-hidden z-10">

        {/* Left column (4/12): Standings (Klasemen) List */}
        <section className="lg:col-span-4 flex flex-col gap-4 overflow-hidden">
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 flex flex-col h-full shadow-2xl overflow-hidden">
            <h3 className="text-xs font-black font-sport tracking-widest text-amber-500 uppercase border-b border-slate-900 pb-2 mb-3 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              KLASEMEN PERINGKAT & NILAI (SENI)
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {[...state.pesertaList]
                .sort((a, b) => (a.ranking || 99) - (b.ranking || 100))
                .map((p) => {
                  const isActive = p.id === state.activePesertaId;
                  const hasFinalScore = p.finalScore !== undefined;

                  return (
                    <div
                      key={p.id}
                      onClick={async () => {
                        playBeep('click');
                        await dispatch('TGR_SET_ACTIVE_PESERTA', { pesertaId: p.id });
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'bg-amber-950/40 border-amber-500 text-white shadow-md shadow-amber-950/25'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div className={`w-7 h-7 flex items-center justify-center rounded-full font-black text-xs ${
                          p.ranking === 1 ? 'bg-amber-500 text-slate-950' :
                          p.ranking === 2 ? 'bg-slate-400 text-slate-950' :
                          p.ranking === 3 ? 'bg-amber-700 text-slate-950' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {p.ranking || '-'}
                        </div>

                        <div>
                          <div className="text-[8px] font-mono uppercase text-amber-500/80 font-bold">
                            {p.kategori} | NO. {p.noUrut}
                          </div>
                          <div className="text-xs font-black uppercase text-white truncate max-w-[8rem]">
                            {p.nama}
                          </div>
                          <div className="text-[8px] font-mono uppercase text-slate-400">
                            {p.kontingen}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-1.5">
                        {p.isLocked && <Lock className="w-3 h-3 text-amber-500" />}
                        <div>
                          <div className="text-xs font-black font-sport text-amber-400">
                            {hasFinalScore ? p.finalScore?.toFixed(3) : '⏳'}
                          </div>
                          <div className="text-[7px] font-mono text-slate-500 uppercase">
                            {p.decisions.includes('Diskualifikasi') ? 'DISQ' : 'Score'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </section>

        {/* Middle column (4/12): Juri Correction Requests approval list */}
        <section className="lg:col-span-4 flex flex-col gap-4 overflow-hidden">
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 flex flex-col h-full shadow-2xl overflow-hidden">
            <h3 className="text-xs font-black font-sport tracking-widest text-amber-500 uppercase border-b border-slate-900 pb-2 mb-3">
              PERMINTAAN KOREKSI NILAI JURI ({Object.keys(state.juriCorrections || {}).length})
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {Object.entries(state.juriCorrections || {}).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                  <Check className="w-8 h-8 text-slate-600" />
                  <p className="text-[10px] uppercase font-mono tracking-wider font-bold">Tidak ada permintaan koreksi aktif</p>
                  <p className="text-[9px] text-slate-600">Semua juri telah mengunci nilai dengan aman.</p>
                </div>
              ) : (
                Object.entries(state.juriCorrections).map(([juriId, corr]) => {
                  const targetPeserta = state.pesertaList.find(p => p.id === corr.pesertaId);
                  return (
                    <div key={juriId} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black font-sport text-[9px] tracking-wider uppercase">
                          JURI {juriId.replace('juri', '')}
                        </span>

                        <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded uppercase ${
                          corr.status === 'pending' ? 'bg-amber-950/40 text-amber-500 border border-amber-500/20' :
                          corr.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' :
                          'bg-red-950 text-red-400 border border-red-500/20'
                        }`}>
                          {corr.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-slate-300">
                        <div>Peserta: <strong className="text-white font-bold">{targetPeserta?.nama || 'N/A'}</strong> ({targetPeserta?.kontingen})</div>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] font-mono text-slate-500">NILAI AWAL: {corr.original.toFixed(3)}</span>
                          <span className="text-slate-400">➔</span>
                          <span className="text-xs font-black font-sport text-amber-400">NILAI BARU: {corr.requested.toFixed(3)}</span>
                        </div>
                      </div>

                      {corr.status === 'pending' && (
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-800">
                          <button
                            onClick={() => handleRejectCorrection(juriId)}
                            className="py-1.5 cursor-pointer bg-red-950/40 border border-red-500/20 hover:bg-red-900/30 text-red-400 font-bold uppercase tracking-wider text-[9px] font-mono rounded transition-all"
                          >
                            TOLAK KOREKSI
                          </button>

                          <button
                            onClick={() => handleApproveCorrection(juriId)}
                            className="py-1.5 cursor-pointer bg-emerald-950 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-900 text-[9px] font-mono font-bold uppercase tracking-wider rounded transition-all"
                          >
                            SETUJUI KOREKSI
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Right column (4/12): Chairman controls: Toggle Sessions & Technical Resets */}
        <section className="lg:col-span-4 flex flex-col gap-4 overflow-hidden">
          
          {/* Toggle scoring session */}
          <div className="bg-gradient-to-b from-[#180303] to-slate-950 border border-red-500/10 rounded-2xl p-5 shadow-xl">
            <h3 className="text-xs font-black font-sport tracking-widest text-red-500 uppercase border-b border-slate-900 pb-2 mb-3">
              MODERASI SESI JURI REAL-TIME (TGR)
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase block">SESI JURI SAAT INI</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 mt-1 rounded text-xs font-black uppercase tracking-wider ${
                  state.sessionStatus === 'open' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 'bg-red-950 text-red-400 border border-red-500/20'
                }`}>
                  {state.sessionStatus === 'open' ? '✔ DIBUKA (Juri Bisa Menilai)' : '🔒 DITUTUP (Scoring Terkunci)'}
                </span>
              </div>

              <button
                onClick={() => handleToggleSession(state.sessionStatus)}
                className={`px-4 py-2.5 cursor-pointer rounded-xl font-black font-sport text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 border shadow ${
                  state.sessionStatus === 'open'
                    ? 'bg-red-950 text-red-400 border-red-500/30'
                    : 'bg-emerald-950 text-emerald-400 border-emerald-500/30 animate-pulse'
                }`}
              >
                {state.sessionStatus === 'open' ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>TUTUP SESI SCORING</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>BUKA SESI SCORING</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Dangerous/Technical reset zone */}
          <div className="bg-slate-950 border border-red-950 rounded-2xl p-5 flex-1 flex flex-col justify-between">
            <div>
              <div className="text-xs font-black font-sport tracking-widest text-red-500 uppercase flex items-center gap-1.5 border-b border-slate-900 pb-2 mb-3">
                <AlertOctagon className="w-4 h-4 text-red-500" />
                DANGER ZONE: PEMBATALAN NILAI ARENA (RESET TEKNIS)
              </div>

              {activePeserta ? (
                <div className="p-3.5 bg-red-950/20 border border-red-500/10 rounded-xl space-y-2">
                  <div className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                    Peserta Aktif Terpilih:
                  </div>
                  <h4 className="text-base font-black text-white uppercase">{activePeserta.nama}</h4>
                  <p className="text-[9px] text-slate-500 uppercase font-mono">
                    Kontingen: {activePeserta.kontingen} | No Urut: {activePeserta.noUrut}
                  </p>
                  <p className="text-[9px] text-red-400/80 font-mono leading-relaxed uppercase">
                    Melakukan reset akan menghapus seluruh data nilai juri, koreksi, keputusan dewan, dan status penilaian peserta ini untuk ditandingkan ulang dari awal.
                  </p>

                  <button
                    onClick={() => handleTechnicalReset(activePeserta.id, activePeserta.nama)}
                    className="w-full mt-2 py-3 cursor-pointer bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-black font-sport text-xs tracking-wider uppercase rounded-xl transition-all"
                  >
                    RESET TEKNIS SEKARANG (RESET ALL VALUES)
                  </button>
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center text-center text-slate-600">
                  <AlertCircle className="w-8 h-8 text-slate-800 mb-1" />
                  <p className="text-[10px] uppercase font-mono font-bold tracking-wider">Tidak ada peserta yang aktif terpilih</p>
                  <p className="text-[9.5px]">Pilih peserta di Monitor atau Sekretaris.</p>
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl mt-4 flex items-start gap-2.5">
              <HelpCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-[8.5px] font-mono text-slate-400 leading-relaxed uppercase">
                Ketua Pertandingan memiliki otoritas mutlak untuk mengizinkan koreksi juri, membuka/menutup gerbang SSE scoring, dan me-reset nilai jika terjadi kegagalan sistem atau diskualifikasi mendadak.
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer info */}
      <footer className="bg-slate-950 border-t border-slate-900 px-4 py-2 flex items-center justify-between text-[8px] font-mono tracking-widest text-slate-600 uppercase">
        <span>IPSI DIGITAL SCORING TGR KETUA | SECURE ENCRYPTED OK</span>
        <span>Sandi Ketua: ketua2026</span>
      </footer>
    </div>
  );
}
