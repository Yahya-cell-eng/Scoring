import React, { useState, useEffect } from 'react';
import { TGRState, TGRPeserta } from '../types';
import { playBeep } from '../utils/sound';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ShieldCheck, ArrowLeft, Lock, Unlock, AlertTriangle, Users, Trash2, CheckCircle2, History, Scale, Plus, Minus, FileSpreadsheet, LockKeyhole, Maximize2, Minimize2 } from 'lucide-react';

export const DEWAN_DEDUCTION_REASONS = [
  { id: '1', label: '(1) Penampilan melebihi/kekurangan toleransi waktu >5 detik s/d 10 detik' },
  { id: '2', label: '(2) Penampilan keluar gelanggang 10 m x 10 m' },
  { id: '3', label: '(3) Menjatuhkan senjata, menyentuh lantai' },
  { id: '4', label: '(4) Pakaian tidak sesuai aturan (kain samping jatuh, kain samping tidak 1 (satu) motif, baju atasan dan bawahan tidak 1 (satu) warna)' },
  { id: '5', label: '(5) Menahan gerakan lebih dari 5 (lima) detik' },
  { id: '6', label: '(6) Senjata patah atau rusak' },
  { id: '7', label: '(7) Tidak sesuai deskripsi' }
];

interface TGRDewanPanelProps {
  state: TGRState;
  dispatch: (type: string, payload?: any) => Promise<any>;
  onBack: () => void;
  theme: 'dark' | 'light';
}

export default function TGRDewanPanel({ state, dispatch, onBack, theme }: TGRDewanPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
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
  const [username, setUsername] = useState('dewan');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [customDeduction, setCustomDeduction] = useState<number>(0);
  const [tieBreakerInput, setTieBreakerInput] = useState<string>('0');
  const [waktuInput, setWaktuInput] = useState<string>('0');

  const activePeserta = state.pesertaList.find(p => p.id === state.activePesertaId);

  useEffect(() => {
    if (activePeserta) {
      setTieBreakerInput(activePeserta.dewanDecisionScore?.toString() || '0');
      setWaktuInput(activePeserta.waktuTampil?.toString() || '0');
    }
  }, [activePeserta?.id]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'dewan' && password === 'silat2026') {
      playBeep('valid');
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      playBeep('warning');
      setLoginError('Kredensial salah! Gunakan: dewan / silat2026');
    }
  };

  const handleApplyDecision = async (decision: string) => {
    if (!activePeserta) return;
    playBeep('click');

    let updatedDecisions = [...activePeserta.decisions];
    if (updatedDecisions.includes(decision)) {
      // Toggle off
      updatedDecisions = updatedDecisions.filter(d => d !== decision);
    } else {
      // Toggle on
      updatedDecisions.push(decision);
    }

    // If diskualifikasi is applied, set deduction to maximum or handle state
    await dispatch('TGR_DEWAN_DECISION', {
      pesertaId: activePeserta.id,
      decisions: updatedDecisions
    });

    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Dewan Juri',
      action: `Mengubah keputusan dewan untuk ${activePeserta.nama} menjadi: [${updatedDecisions.join(', ')}]`
    });
  };

  const toggleDeductionReason = async (reasonId: string) => {
    if (!activePeserta) return;
    playBeep('click');
    const currentReasons = activePeserta.deductionReasons || [];
    let nextReasons: string[] = [];
    if (currentReasons.includes(reasonId)) {
      nextReasons = currentReasons.filter(r => r !== reasonId);
    } else {
      nextReasons = [...currentReasons, reasonId];
    }
    const nextDed = parseFloat((nextReasons.length * 0.50).toFixed(2));

    await dispatch('TGR_DEWAN_DECISION', {
      pesertaId: activePeserta.id,
      deductions: nextDed,
      deductionReasons: nextReasons
    });

    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Dewan Juri',
      action: `Mengubah hukuman dewan ${activePeserta.nama} menjadi -${nextDed.toFixed(2)} (${nextReasons.length} pelanggaran)`
    });
  };

  const adjustDeduction = async (amount: number) => {
    if (!activePeserta) return;
    playBeep('click');
    const nextDed = parseFloat((activePeserta.deductions + amount).toFixed(3));
    const finalDed = nextDed < 0 ? 0 : nextDed;

    await dispatch('TGR_DEWAN_DECISION', {
      pesertaId: activePeserta.id,
      deductions: finalDed
    });

    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Dewan Juri',
      action: `Menyesuaikan akumulasi pengurangan nilai dewan ${activePeserta.nama} menjadi -${finalDed.toFixed(3)}`
    });
  };

  const handleSetTieBreaker = async () => {
    if (!activePeserta) return;
    playBeep('click');
    const scoreVal = parseFloat(tieBreakerInput) || 0;

    await dispatch('TGR_DEWAN_DECISION', {
      pesertaId: activePeserta.id,
      dewanDecisionScore: scoreVal
    });

    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Dewan Juri',
      action: `Menetapkan nilai pemecah seri dewan untuk ${activePeserta.nama} sebesar ${scoreVal.toFixed(3)}`
    });
  };

  const handleSetWaktuTampil = async () => {
    if (!activePeserta) return;
    playBeep('click');
    const seconds = parseInt(waktuInput) || 0;

    await dispatch('TGR_DEWAN_DECISION', {
      pesertaId: activePeserta.id,
      waktuTampil: seconds
    });

    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Dewan Juri',
      action: `Menetapkan waktu tampil untuk ${activePeserta.nama} sebesar ${seconds} detik`
    });
  };

  const toggleLockPeserta = async (pesertaId: string, currentLockState: boolean) => {
    playBeep('valid');
    await dispatch('TGR_LOCK_RESULT', {
      pesertaId,
      isLocked: !currentLockState
    });

    await dispatch('TGR_ADD_AUDIT_LOG', {
      user: 'Dewan Juri',
      action: `${currentLockState ? 'Membuka' : 'Mengunci'} hasil penilaian dari peserta ID ${pesertaId}`
    });
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#050202] text-slate-100 p-4 font-sans relative">
        <div className="absolute inset-0 bg-[radial-gradient(#8b0000_1px,transparent_1px)] [background-size:24px_24px] opacity-10" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md border border-amber-500/20 bg-slate-950/90 rounded-2xl p-8 shadow-2xl relative"
        >
          <div className="absolute top-0 left-0 w-8 h-1 border-t border-l border-amber-500" />
          <div className="absolute top-0 right-0 w-8 h-1 border-t border-r border-amber-500" />

          <div className="text-center mb-6">
            <LockKeyhole className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-pulse" />
            <h2 className="text-xl font-black font-sport tracking-widest text-amber-500 uppercase">
              DEWAN JURI LOGIN (TGR)
            </h2>
            <p className="text-[10px] uppercase tracking-wider font-mono text-slate-400 mt-1">
              Kredensial Keamanan Tingkat Turnamen
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                USERNAME DEWAN
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full py-2.5 px-4 bg-slate-900 border border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="dewan"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                PASSWORD DEWAN
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2.5 px-4 bg-slate-900 border border-slate-800 rounded-xl text-sm font-semibold focus:outline-none focus:border-amber-500 transition-colors"
                placeholder="••••••••"
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
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-slate-950 font-black font-sport tracking-wider text-xs uppercase rounded-xl transition-all shadow-lg active:scale-95"
            >
              OTENTIKASI MASUK
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

  // Calculate scores per jury helper
  const renderJuriScoresTable = (peserta: TGRPeserta) => {
    const list = [];
    for (let i = 1; i <= state.jumlahJuri; i++) {
      const key = `juri${i}`;
      list.push({
        num: i,
        score: peserta.scores[key],
        kebenaran: peserta.kebenaranScores[key]
      });
    }
    return list;
  };

  const getMedian = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
      return sorted[mid];
    } else {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
  };

  const getStandardDeviation = (arr: number[]): number => {
    if (arr.length <= 1) return 0;
    const mean = arr.reduce((acc, v) => acc + v, 0) / arr.length;
    const variance = arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / arr.length;
    return Math.sqrt(variance);
  };

  const activeScores = activePeserta
    ? Object.entries(activePeserta.scores)
        .filter(([key]) => {
          const jNum = parseInt(key.replace('juri', ''));
          return jNum >= 1 && jNum <= state.jumlahJuri;
        })
        .map(([_, v]) => v)
    : [];

  const activeKebenaran = activePeserta
    ? Object.entries(activePeserta.kebenaranScores)
        .filter(([key]) => {
          const jNum = parseInt(key.replace('juri', ''));
          return jNum >= 1 && jNum <= state.jumlahJuri;
        })
        .map(([_, v]) => v)
    : [];

  const totalKebenaran = activeKebenaran.reduce((sum, v) => sum + v, 0);
  const medianScore = getMedian(activeScores);
  const stdDevScore = getStandardDeviation(activeScores);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#050202] text-slate-100 font-sans select-none overflow-y-auto lg:overflow-hidden">
      <div className="absolute top-0 right-1/4 w-[28rem] h-[28rem] rounded-full blur-[150px] pointer-events-none bg-red-950/15" />

      {/* Header Panel */}
      <header className="bg-slate-950 border-b border-amber-500/20 px-4 py-3 flex items-center justify-between shadow-md z-15">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 cursor-pointer rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-black font-sport tracking-widest text-amber-500 uppercase">
              DEWAN JURI PANEL (TGR MODE)
            </h1>
            <p className="text-[10px] font-mono tracking-wider text-slate-400">
              PENGENDALI UTAMA KEPUTUSAN & ATURAN IPSI
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
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase font-mono border ${
              state.sistemSeni === 'prestasi'
                ? 'bg-purple-950/50 border-purple-800/80 text-purple-300'
                : 'bg-amber-950/50 border-amber-800/80 text-amber-300'
            }`}>
              {state.sistemSeni === 'prestasi' ? '⚔️ SISTEM PRESTASI' : '🏊 SISTEM POOL'}
            </span>
            <div className="px-3.5 py-1.5 rounded-full bg-red-950/40 border border-red-500/30 text-red-400 font-black font-sport text-xs tracking-wider uppercase flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-red-500" />
              <span>DEWAN AUTHENTICATED</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 p-4 gap-4 overflow-y-auto lg:overflow-hidden z-10">
        
        {/* Left Column (4/12): Participants List (Ordered by No. Urut) */}
        <section className="lg:col-span-5 flex flex-col gap-4 lg:overflow-hidden">
          <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 flex flex-col h-full shadow-2xl overflow-y-auto lg:overflow-hidden min-h-[400px] lg:min-h-0">
            <h3 className="text-xs font-black font-sport tracking-widest text-amber-500 uppercase border-b border-slate-900 pb-2 mb-3">
              DAFTAR URUTAN TAMPIL PESERTA
            </h3>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {[...state.pesertaList]
                .sort((a, b) => a.noUrut - b.noUrut)
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
                          ? 'bg-amber-950/40 border-amber-500 text-white'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* No Urut Badge */}
                        <div className={`w-7 h-7 flex items-center justify-center rounded-lg font-black font-mono text-xs ${
                          isActive ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {p.noUrut}
                        </div>

                        <div>
                          <div className="text-[9px] font-mono uppercase text-amber-500/80 font-bold">
                            {p.kategori}
                          </div>
                          <div className="text-xs font-black uppercase text-white truncate max-w-[10rem]">
                            {p.nama}
                          </div>
                          <div className="text-[9px] font-mono uppercase text-slate-400">
                            {p.kontingen}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2">
                        {p.isLocked && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                        <div>
                          <div className="text-sm font-black font-sport text-amber-400">
                            {hasFinalScore ? p.finalScore?.toFixed(3) : '⏳'}
                          </div>
                          <div className="text-[8px] font-mono text-slate-500 uppercase">
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

        {/* Right Column (7/12): Live Scoring Analysis & Dewan Controller */}
        <section className="lg:col-span-7 flex flex-col gap-4 lg:overflow-hidden">
          {activePeserta ? (
            <div className="bg-gradient-to-b from-[#110505] to-slate-950 border border-red-500/10 rounded-2xl p-5 flex flex-col justify-between shadow-2xl h-full overflow-y-auto">
              <div>
                <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
                  <div>
                    <span className="text-[9px] font-black font-mono tracking-[0.25em] text-red-500 uppercase">
                      PESERTA SEDANG ANALISIS
                    </span>
                    <h2 className="text-xl font-black font-sport text-white uppercase mt-0.5">
                      {activePeserta.nama}
                    </h2>
                    <p className="text-[10px] font-mono uppercase text-slate-400">
                      {activePeserta.kontingen} ({activePeserta.kategori})
                    </p>
                  </div>

                  {/* Lock/Unlock Button */}
                  <button
                    onClick={() => toggleLockPeserta(activePeserta.id, activePeserta.isLocked)}
                    className={`px-3 py-1.5 cursor-pointer rounded-lg font-black text-xs font-sport uppercase tracking-widest transition-all flex items-center gap-1.5 border shadow ${
                      activePeserta.isLocked
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-red-950 text-red-400 border-red-500/20 hover:bg-red-900/40'
                    }`}
                  >
                    {activePeserta.isLocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>KUNCI AKTIF</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-red-500" />
                        <span>BUKA / UNLOCKED</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Score Per Juri Table */}
                <div className="space-y-2 mb-4 bg-slate-950/80 border border-slate-900 rounded-xl p-3">
                  <div className="text-[10px] font-black font-mono tracking-widest text-slate-400 uppercase border-b border-slate-900 pb-1.5">
                    REKAP DETAIL SKOR REAL-TIME JURI ({state.jumlahJuri} JURI)
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                    {renderJuriScoresTable(activePeserta).map((item) => (
                      <div key={item.num} className="bg-slate-900 p-2.5 rounded-lg text-center border border-slate-800">
                        <div className="text-[9px] font-mono text-slate-500 uppercase font-bold">JURI {item.num}</div>
                        <div className="text-base font-black font-sport text-white mt-1">
                          {item.score !== undefined ? item.score.toFixed(3) : '⏳'}
                        </div>
                        <div className="text-[8px] font-mono text-slate-500 mt-0.5">
                          K: {item.kebenaran !== undefined ? item.kebenaran.toFixed(3) : '-'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Real-time TGR Stats Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-900">
                    <div className="bg-slate-900/40 p-2.5 rounded-lg text-center border border-slate-800/60">
                      <div className="text-[8px] font-mono text-amber-500 uppercase font-bold tracking-wider">Median Juri</div>
                      <div className="text-lg font-black text-white mt-0.5">
                        {activeScores.length >= state.jumlahJuri ? medianScore.toFixed(3) : '⏳'}
                      </div>
                      <div className="text-[7.5px] font-mono text-slate-500 mt-0.5 font-bold">Basis Nilai Akhir</div>
                    </div>

                    <div className="bg-slate-900/40 p-2.5 rounded-lg text-center border border-slate-800/60">
                      <div className="text-[8px] font-mono text-emerald-400 uppercase font-bold tracking-wider">Kebenaran Gerak</div>
                      <div className="text-lg font-black text-white mt-0.5">
                        {activeScores.length >= state.jumlahJuri ? totalKebenaran.toFixed(3) : '⏳'}
                      </div>
                      <div className="text-[7.5px] font-mono text-slate-500 mt-0.5 font-bold">Tie-breaker 1</div>
                    </div>

                    <div className="bg-slate-900/40 p-2.5 rounded-lg text-center border border-slate-800/60">
                      <div className="text-[8px] font-mono text-cyan-400 uppercase font-bold tracking-wider">Waktu Tampil</div>
                      <div className="text-lg font-black text-white mt-0.5">
                        {formatTime(activePeserta.waktuTampil || 0)}
                      </div>
                      <div className="text-[7.5px] font-mono text-slate-500 mt-0.5 font-bold">
                        Selisih: {Math.abs((activePeserta.waktuTampil || 0) - 180)}s (TB 3)
                      </div>
                    </div>

                    <div className="bg-slate-900/40 p-2.5 rounded-lg text-center border border-slate-800/60">
                      <div className="text-[8px] font-mono text-indigo-400 uppercase font-bold tracking-wider">Std Deviasi</div>
                      <div className="text-lg font-black text-white mt-0.5">
                        {activeScores.length >= state.jumlahJuri ? stdDevScore.toFixed(4) : '⏳'}
                      </div>
                      <div className="text-[7.5px] font-mono text-slate-500 mt-0.5 font-bold">Tie-breaker 4</div>
                    </div>
                  </div>

                  {/* New Median Rule Warning */}
                  <div className="text-[8.5px] font-mono uppercase text-amber-500/90 flex items-center gap-1.5 pt-2.5 font-bold">
                    <Scale className="w-3.5 h-3.5 text-amber-500" />
                    <span>Sistem menghitung NILAI MEDIAN dari seluruh Juri sesuai aturan baru IPSI.</span>
                  </div>
                </div>

                {/* Decisions & Deductions row */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Decisions checkboxes */}
                  <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3.5 space-y-2">
                    <div className="text-[10px] font-black font-mono tracking-widest text-amber-500 uppercase">
                      KEPUTUSAN DEWAN JURI
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {['Sah', 'Diskualifikasi', 'Teguran', 'Pengurangan'].map((decision) => {
                        const isChecked = activePeserta.decisions.includes(decision);
                        return (
                          <button
                            key={decision}
                            onClick={() => handleApplyDecision(decision)}
                            className={`py-2 px-3 cursor-pointer border rounded-lg font-bold text-[10px] uppercase tracking-wider text-center transition-all ${
                              isChecked
                                ? 'bg-red-950 text-red-400 border-red-500'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {decision}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Deductions input with 0.50 reasons checklist */}
                  <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900 pb-2 mb-3">
                      <div>
                        <div className="text-[11px] font-black font-mono tracking-widest text-red-500 uppercase flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                          PENGURANGAN NILAI OLEH PENGAWAS / DEWAN SENI (-0.50 per Pelanggaran)
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono uppercase mt-0.5">
                          Centang pelanggaran di bawah untuk menambahkan pengurangan secara otomatis
                        </p>
                      </div>

                      <div className="mt-2 sm:mt-0 flex items-center gap-3 bg-red-950/50 border border-red-500/20 px-3 py-1.5 rounded-lg">
                        <span className="text-[9px] font-mono uppercase text-red-400 font-bold">Total Pengurangan:</span>
                        <span className="text-sm font-black font-mono text-red-400">
                          -{activePeserta.deductions.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                      {DEWAN_DEDUCTION_REASONS.map((reason) => {
                        const isChecked = (activePeserta.deductionReasons || []).includes(reason.id);
                        return (
                          <div
                            key={reason.id}
                            onClick={() => toggleDeductionReason(reason.id)}
                            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                              isChecked
                                ? 'bg-red-950/40 border-red-500 text-white shadow-md shadow-red-950/30'
                                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="mt-0.5 accent-red-500 cursor-pointer"
                            />
                            <span className="text-[9px] font-bold font-mono uppercase leading-normal">
                              {reason.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Manual override / fine tuning */}
                    <div className="mt-3 pt-3 border-t border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-[8px] font-mono text-slate-500 uppercase">
                        * Pilihan di atas secara otomatis mengakumulasi penalti kelipatan -0.50. Gunakan tombol manual di kanan untuk penyesuaian halus (fine-tuning) bila diperlukan.
                      </span>

                      <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800 self-end">
                        <button
                          onClick={() => adjustDeduction(-0.010)}
                          className="p-1 px-2.5 bg-slate-950 border border-slate-800 rounded font-black hover:border-slate-500 cursor-pointer text-[10px]"
                        >
                          -0.01
                        </button>
                        <span className="text-[10px] font-black font-mono text-slate-400 px-1">
                          Manual Tweak
                        </span>
                        <button
                          onClick={() => adjustDeduction(0.010)}
                          className="p-1 px-2.5 bg-slate-950 border border-slate-800 rounded font-black hover:border-slate-500 cursor-pointer text-[10px]"
                        >
                          +0.01
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tie-breaker & Waktu Tampil Override Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Tie-breaker / Dewan override */}
                  <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 space-y-2">
                    <div>
                      <div className="text-[10px] font-black font-mono tracking-widest text-amber-500 uppercase">
                        NILAI OVERRIDE PEMECAH SERI
                      </div>
                      <p className="text-[8px] text-slate-500 font-mono uppercase mt-0.5">
                        Pilihan manual jika seluruh pemecah seri otomatis sama persis
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.001"
                        value={tieBreakerInput}
                        onChange={(e) => setTieBreakerInput(e.target.value)}
                        className="flex-1 py-1 px-3 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                        placeholder="0.000"
                      />
                      <button
                        onClick={handleSetTieBreaker}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded font-mono cursor-pointer"
                      >
                        TERAPKAN
                      </button>
                    </div>
                  </div>

                  {/* Waktu Tampil Override */}
                  <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3 space-y-2">
                    <div>
                      <div className="text-[10px] font-black font-mono tracking-widest text-amber-500 uppercase">
                        KOREKSI WAKTU TAMPIL (DETIK)
                      </div>
                      <p className="text-[8px] text-slate-500 font-mono uppercase mt-0.5">
                        Atur manual durasi penampilan (contoh: 180 untuk 3'00")
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={waktuInput}
                        onChange={(e) => setWaktuInput(e.target.value)}
                        className="flex-1 py-1 px-3 bg-slate-900 border border-slate-800 rounded text-xs text-white"
                        placeholder="180"
                      />
                      <button
                        onClick={handleSetWaktuTampil}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded font-mono cursor-pointer"
                      >
                        SIMPAN
                      </button>
                    </div>
                  </div>
                </div>

              </div>

              {/* Final Score Dashboard banner */}
              <div className="mt-4 p-4 rounded-xl border border-amber-500/20 bg-gradient-to-r from-red-950/30 via-[#1e1302] to-red-950/30 text-center relative overflow-hidden">
                <div className="text-[10px] font-black text-slate-400 tracking-widest font-mono uppercase">
                  NILAI AKHIR SAH (FINAL SCORE)
                </div>
                <div className="text-4xl font-black font-sport text-amber-500 tracking-wider mt-1">
                  {activePeserta.finalScore !== undefined ? activePeserta.finalScore.toFixed(3) : 'BELUM LENGKAP'}
                </div>
                <div className="text-[8.5px] font-mono uppercase text-slate-500 mt-1">
                  DIHITUNG BERDASARKAN MEDIAN | PENGURANGAN DEWAN: -{activePeserta.deductions.toFixed(3)}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border border-slate-900 bg-slate-950/40 rounded-2xl p-6 text-slate-500 text-center">
              <ShieldCheck className="w-12 h-12 text-slate-700 mb-2" />
              <div className="text-sm font-black font-sport uppercase tracking-wider">TIDAK ADA DATA ANALISIS</div>
              <div className="text-xs font-mono">Pilih salah satu peserta di daftar sebelah kiri.</div>
            </div>
          )}
        </section>

      </main>

      {/* Footer Audit Logs ticker */}
      <footer className="bg-slate-950 border-t border-slate-900 px-4 py-2 flex items-center justify-between text-[8px] font-mono tracking-widest text-slate-600 uppercase">
        <span>IPSI DIGITAL SCORING TGR DEWAN | SYNC OK</span>
        <span>Kredensial Keamanan: dewan / silat2026</span>
      </footer>
    </div>
  );
}
