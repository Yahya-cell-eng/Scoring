import React, { useState, useEffect, useMemo } from 'react';
import { TGRState, TGRPeserta } from '../types';
import { playBeep } from '../utils/sound';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, Minimize2, ArrowLeft, RefreshCw, Info, Check, ShieldAlert, Award, Lock, Play, HelpCircle, Layers, Sliders, CheckCircle2 } from 'lucide-react';

interface TGRJuriPanelProps {
  juriId: string; // e.g. "juri1", "juri2"
  state: TGRState;
  dispatch: (type: string, payload?: any) => Promise<any>;
  onBack: () => void;
  theme: 'dark' | 'light';
}

export default function TGRJuriPanel({ juriId, state, dispatch, onBack, theme }: TGRJuriPanelProps) {
  // Standard mode states
  const [wrongMoveCount, setWrongMoveCount] = useState<number>(0);
  const [isJuriFullscreen, setIsJuriFullscreen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Toggle Jurus Phase text for Tunggal standard
  const [jurusPhase, setJurusPhase] = useState<'KOSONG' | 'SENJATA'>('KOSONG');

  // Ganda & Jurus Bebas Tuning Sub-scores (0.01 - 0.30 per category)
  const [cat1Score, setCat1Score] = useState<number>(0.00); // Teknik Serang Bela / Kekayaan Gerak
  const [cat2Score, setCat2Score] = useState<number>(0.00); // Kemantapan & Harmonisasi
  const [cat3Score, setCat3Score] = useState<number>(0.00); // Penjiwaan & Penghayatan

  const activePeserta = state.pesertaList.find(p => p.id === state.activePesertaId);

  // Determine whether current competitor category is Ganda or Bebas
  const isAutoGandaOrBebas = useMemo(() => {
    if (!activePeserta) return false;
    const kat = activePeserta.kategori.toLowerCase();
    return kat.includes('ganda') || kat.includes('bebas') || kat.includes('solo') || kat.includes('duo') || kat.includes('creative');
  }, [activePeserta]);

  // Scoring Mode: 'standard' (Tunggal Kebenaran) vs 'ganda_bebas' (Ganda/Tunggal Bebas/Solo Creative)
  const [scoringMode, setScoringMode] = useState<'standard' | 'ganda_bebas'>('standard');

  useEffect(() => {
    if (isAutoGandaOrBebas) {
      setScoringMode('ganda_bebas');
    } else {
      setScoringMode('standard');
    }
  }, [isAutoGandaOrBebas, activePeserta?.id, activePeserta?.kategori]);

  // Synchronize score from parent state when active competitor or score changes on server
  useEffect(() => {
    if (activePeserta) {
      const existingScore = activePeserta.scores[juriId];
      const existingKebenaran = activePeserta.kebenaranScores[juriId];
      const isFinalized = activePeserta.finalizedJuries?.includes(juriId) || false;

      // Restoring tuning scores if available
      if (activePeserta.tuningScores && activePeserta.tuningScores[juriId]) {
        const t = activePeserta.tuningScores[juriId];
        setCat1Score(t.cat1 || 0.00);
        setCat2Score(t.cat2 || 0.00);
        setCat3Score(t.cat3 || 0.00);
      } else if (existingScore !== undefined && isAutoGandaOrBebas) {
        // Estimate tuning total from score if base 9.00
        const rem = Math.max(0, parseFloat((existingScore - 9.00).toFixed(2)));
        setCat1Score(parseFloat((rem / 3).toFixed(2)));
        setCat2Score(parseFloat((rem / 3).toFixed(2)));
        setCat3Score(parseFloat((rem / 3).toFixed(2)));
      } else {
        setCat1Score(0.00);
        setCat2Score(0.00);
        setCat3Score(0.00);
      }

      // Base accuracy score starts at 9.90 for standard mode
      const kebVal = existingKebenaran !== undefined ? existingKebenaran : 9.90;
      const derivedWrongMoves = Math.max(0, Math.round((9.90 - kebVal) / 0.01));

      setWrongMoveCount(derivedWrongMoves);
      setHasSubmitted(isFinalized);
    } else {
      setWrongMoveCount(0);
      setCat1Score(0.00);
      setCat2Score(0.00);
      setCat3Score(0.00);
      setHasSubmitted(false);
    }
    setIsCorrecting(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [state.activePesertaId, juriId, activePeserta, isAutoGandaOrBebas]);

  // Handle Juri Fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsJuriFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleJuriFullscreen = () => {
    playBeep('click');
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(err => console.warn(err));
    } else {
      document.exitFullscreen().catch(err => console.warn(err));
    }
  };

  // Dispatch score helper for standard Tunggal
  const submitStandardScoreUpdate = (newWrongMoves: number, finalize: boolean = false) => {
    if (!activePeserta) return;
    const calculatedKebenaran = parseFloat((9.90 - newWrongMoves * 0.01).toFixed(2));
    dispatch('TGR_SUBMIT_JURI_SCORE', {
      pesertaId: activePeserta.id,
      juriId,
      score: calculatedKebenaran,
      kebenaranScore: calculatedKebenaran,
      finalize
    }).catch(err => {
      console.error("Error submitting TGR score:", err);
      setErrorMessage("Koneksi server terputus.");
    });
  };

  // Dispatch score helper for Ganda / Jurus Bebas
  const submitGandaBebasScoreUpdate = (c1: number, c2: number, c3: number, finalize: boolean = false) => {
    if (!activePeserta) return;
    const totalTuning = parseFloat((c1 + c2 + c3).toFixed(2));
    const calculatedTotal = parseFloat((9.00 + totalTuning).toFixed(2));

    dispatch('TGR_SUBMIT_JURI_SCORE', {
      pesertaId: activePeserta.id,
      juriId,
      score: calculatedTotal,
      kebenaranScore: calculatedTotal,
      tuningScores: { cat1: c1, cat2: c2, cat3: c3 },
      finalize
    }).catch(err => {
      console.error("Error submitting TGR Ganda/Bebas score:", err);
      setErrorMessage("Koneksi server terputus.");
    });
  };

  // Standard Wrong Move Handlers
  const handleWrongMoveClick = () => {
    if (hasSubmitted && !isCorrecting) return;
    playBeep('warning');
    const nextCount = wrongMoveCount + 1;
    setWrongMoveCount(nextCount);
    submitStandardScoreUpdate(nextCount, false);
  };

  const handleBackspaceClick = () => {
    if (hasSubmitted && !isCorrecting) return;
    if (wrongMoveCount === 0) {
      playBeep('click');
      return;
    }
    playBeep('click');
    const nextCount = wrongMoveCount - 1;
    setWrongMoveCount(nextCount);
    submitStandardScoreUpdate(nextCount, false);
  };

  // Tuning button click handler for Ganda & Jurus Bebas
  const handleTuningSelect = (catIndex: 1 | 2 | 3, value: number) => {
    if (hasSubmitted && !isCorrecting) return;
    playBeep('click');

    let newC1 = cat1Score;
    let newC2 = cat2Score;
    let newC3 = cat3Score;

    if (catIndex === 1) {
      newC1 = cat1Score === value ? 0.00 : value;
      setCat1Score(newC1);
    } else if (catIndex === 2) {
      newC2 = cat2Score === value ? 0.00 : value;
      setCat2Score(newC2);
    } else if (catIndex === 3) {
      newC3 = cat3Score === value ? 0.00 : value;
      setCat3Score(newC3);
    }

    submitGandaBebasScoreUpdate(newC1, newC2, newC3, false);
  };

  // Reset Ganda / Jurus Bebas tuning values
  const handleResetTuning = () => {
    if (hasSubmitted && !isCorrecting) return;
    playBeep('click');
    setCat1Score(0.00);
    setCat2Score(0.00);
    setCat3Score(0.00);
    submitGandaBebasScoreUpdate(0.00, 0.00, 0.00, false);
  };

  // Submit final score
  const handleSubmitScore = async () => {
    if (!activePeserta) return;
    playBeep('valid');
    setErrorMessage(null);
    setSuccessMessage(null);

    let calculatedTotal = 0;
    if (scoringMode === 'standard') {
      calculatedTotal = parseFloat((9.90 - wrongMoveCount * 0.01).toFixed(2));
    } else {
      const totalTuning = parseFloat((cat1Score + cat2Score + cat3Score).toFixed(2));
      calculatedTotal = parseFloat((9.00 + totalTuning).toFixed(2));
    }

    try {
      if (isCorrecting) {
        // Submit correction request to Ketua
        await dispatch('TGR_SUBMIT_JURI_CORRECTION', {
          juriId,
          pesertaId: activePeserta.id,
          original: activePeserta.scores[juriId] || (scoringMode === 'standard' ? 9.90 : 9.00),
          requested: calculatedTotal
        });
        await dispatch('TGR_ADD_AUDIT_LOG', {
          user: `Juri ${juriId.replace('juri', '')}`,
          action: `Mengajukan koreksi nilai TGR (${scoringMode}) untuk ${activePeserta.nama} menjadi ${calculatedTotal.toFixed(2)}`
        });
        setSuccessMessage('Koreksi diajukan! Menunggu persetujuan Ketua.');
        setIsCorrecting(false);
      } else {
        // Standard final submit
        if (scoringMode === 'standard') {
          submitStandardScoreUpdate(wrongMoveCount, true);
        } else {
          submitGandaBebasScoreUpdate(cat1Score, cat2Score, cat3Score, true);
        }

        await dispatch('TGR_ADD_AUDIT_LOG', {
          user: `Juri ${juriId.replace('juri', '')}`,
          action: `Mengirimkan hasil nilai final TGR (${scoringMode}) ${calculatedTotal.toFixed(2)} untuk ${activePeserta.nama}`
        });
        setSuccessMessage('Nilai berhasil dikirim & dikunci!');
        setHasSubmitted(true);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengirim nilai.');
    }
  };

  const handleRequestCorrectionMode = () => {
    playBeep('click');
    setIsCorrecting(true);
  };

  // Pre-calculated values for UI display
  const calculatedKebenaran = parseFloat((9.90 - wrongMoveCount * 0.01).toFixed(2));
  const totalTuning = parseFloat((cat1Score + cat2Score + cat3Score).toFixed(2));
  const calculatedGandaTotal = parseFloat((9.00 + totalTuning).toFixed(2));

  const juriNumberStr = juriId.replace('juri', '');

  // 30 Tuning button values (0.01 to 0.30)
  const tuningValues = useMemo(() => {
    const vals: number[] = [];
    for (let i = 1; i <= 30; i++) {
      vals.push(parseFloat((i * 0.01).toFixed(2)));
    }
    return vals;
  }, []);

  return (
    <div className={`min-h-screen h-full w-full flex flex-col bg-[#030714] text-slate-100 font-sans select-none overflow-x-hidden ${
      isJuriFullscreen ? 'fixed inset-0 z-[99999]' : 'relative'
    }`}>
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-[30rem] h-[30rem] rounded-full blur-[140px] pointer-events-none bg-blue-950/20" />
      <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] rounded-full blur-[140px] pointer-events-none bg-indigo-950/15" />

      {/* A. HEADER BAR */}
      <header className="z-10 bg-slate-950/90 border-b border-slate-800/80 px-3 py-1.5 sm:px-4 sm:py-2 flex items-center justify-between shadow-lg shrink-0">
        {/* Left Section: Competitor Metadata */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBack}
            className="p-1.5 cursor-pointer rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Kembali ke Pemilihan Peran"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-slate-400 font-mono uppercase">
              {activePeserta ? activePeserta.kontingen.toUpperCase() : 'JAWA BARAT'}
            </span>
            <h1 className="text-xs sm:text-sm font-black tracking-wider text-sky-400 font-sport uppercase leading-none mt-0.5">
              {activePeserta ? activePeserta.nama.toUpperCase() : 'RAHAYU SANTOSA'}
            </h1>
          </div>
        </div>

        {/* Center Section: Sudut / Team Highlight Pill & Mode Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="hidden xs:flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-full border border-slate-800">
            <span className="bg-blue-600 text-white px-2.5 sm:px-3.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow">
              BIRU
            </span>
            <span className="text-slate-500 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
              MERAH
            </span>
          </div>

          {/* Mode Switcher Button */}
          <button
            onClick={() => {
              playBeep('click');
              setScoringMode(prev => prev === 'standard' ? 'ganda_bebas' : 'standard');
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-400 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider cursor-pointer transition-all shadow-sm"
            title="Klik untuk ganti mode penilaian"
          >
            <Sliders className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
            <span>MODE: {scoringMode === 'ganda_bebas' ? 'GANDA / BEBAS' : 'TUNGGAL STANDARD'}</span>
          </button>
        </div>

        {/* Right Section: Gelanggang & Category Display */}
        <div className="flex items-center gap-2 sm:gap-4 text-right">
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-mono font-semibold text-slate-400 uppercase">
              GELANGGANG {state.gelanggang.replace(/\D/g, '') || '1'} (POOL-A), Partai {state.partai?.replace(/\D/g, '') || '1'}
            </span>
            <span className="text-[10px] sm:text-xs font-black font-sport text-amber-400 tracking-wider uppercase mt-0.5">
              {activePeserta ? activePeserta.kategori.toUpperCase() : 'TUNGGAL'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Juri Designation Label */}
            <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded bg-blue-950 border border-blue-700/50 text-blue-300 font-black font-sport text-[10px] sm:text-xs">
              JURI {juriNumberStr}
            </div>

            <button
              onClick={toggleJuriFullscreen}
              className="p-1.5 cursor-pointer rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
              title="Toggle Fullscreen"
            >
              {isJuriFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* B. CATEGORY SUBHEADER TITLE BANNER */}
      <div className="z-10 bg-slate-900/80 border-b border-slate-800 flex justify-between items-center px-3 py-1 sm:px-4 sm:py-1.5 shrink-0">
        <div className="text-[9px] sm:text-[10px] font-black font-mono tracking-widest text-slate-500 uppercase">
          PANEL PENILAIAN JURI SENI
        </div>

        <div className="text-[10px] sm:text-xs font-black tracking-widest text-slate-200 font-sport text-center flex-1 uppercase">
          {scoringMode === 'ganda_bebas' 
            ? `PENILAIAN KATEGORI ${activePeserta ? activePeserta.kategori.toUpperCase() : 'GANDA / BEBAS'}` 
            : `PENILAIAN KATEGORI ${activePeserta ? activePeserta.kategori.toUpperCase() : 'JURUS TUNGGAL'} (KEBENARAN & GERAK)`}
        </div>

        <div className="text-[9px] sm:text-[10px] font-bold text-slate-400 font-mono">
          REGULASI IPSI 2022
        </div>
      </div>

      {/* C. MAIN INTERACTIVE SCORING CONTENT */}
      <main className="flex-1 flex flex-col justify-between p-2 sm:p-3 z-10 gap-2 sm:gap-3 overflow-y-auto min-h-0">
        
        {/* MODE 1: GANDA / JURUS BEBAS / SOLO CREATIVE / TUNGGAL BEBAS (TUNING BUTTONS MATRIX) */}
        {scoringMode === 'ganda_bebas' ? (
          <div className="flex-1 flex flex-col justify-between gap-2 overflow-y-auto min-h-0 pr-1">
            
            {/* Grid Table Layout matching photo */}
            <div className="border border-slate-800/90 rounded-2xl bg-slate-950/60 shadow-2xl flex-1 flex flex-col min-w-[650px] lg:min-w-0 overflow-x-auto">
              
              {/* Table Header Row */}
              <div className="grid grid-cols-12 bg-slate-900/90 text-[9px] sm:text-[10px] font-black uppercase tracking-wider font-mono text-slate-400 border-b border-slate-800 py-1.5 sm:py-2 px-2 sm:px-3 text-center items-center min-w-[650px] lg:min-w-0">
                <div className="col-span-3 text-left pl-2">KATEGORI PENILAIAN</div>
                <div className="col-span-6">KONTROL PENILAIAN (TUNING BUTTONS)</div>
                <div className="col-span-1 text-center">NILAI SKOR</div>
                <div className="col-span-2 text-center">TOTAL SCORE (COMBINED)</div>
              </div>

              {/* Table Body (3 Rows + Spanning Right Column) */}
              <div className="grid grid-cols-12 flex-1 items-stretch divide-x divide-slate-800/80 min-w-[650px] lg:min-w-0">
                
                {/* Left 10 Columns: 3 Category Rows */}
                <div className="col-span-10 divide-y divide-slate-800/80 flex flex-col justify-between">
                  
                  {/* Category Row 1: TEKNIK SERANG BELA / KEKAYAAN GERAK */}
                  <div className="grid grid-cols-10 items-center p-1.5 sm:p-2.5 gap-1.5 sm:gap-2 flex-1">
                    {/* Label Column */}
                    <div className="col-span-3 pr-1 sm:pr-2">
                      <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-sky-400 font-sport leading-tight">
                        {activePeserta?.kategori?.toLowerCase().includes('ganda') ? 'TEKNIK SERANG BELA' : 'TEKNIK KEKAYAAN GERAK / SENJATA'}
                      </h3>
                      <span className="text-[8px] sm:text-[9px] font-mono text-slate-500 font-bold block mt-0.5">
                        (0.01 - 0.30)
                      </span>
                    </div>

                    {/* Tuning Buttons Matrix (30 buttons) */}
                    <div className="col-span-6 grid grid-cols-10 gap-0.5 sm:gap-1 my-auto">
                      {tuningValues.map((val) => {
                        const isActive = cat1Score === val;
                        return (
                          <button
                            key={`cat1-${val}`}
                            disabled={hasSubmitted && !isCorrecting}
                            onClick={() => handleTuningSelect(1, val)}
                            className={`py-1 sm:py-1.5 px-0.5 text-[8.5px] sm:text-[10px] md:text-[11px] font-mono font-extrabold rounded sm:rounded-lg border transition-all cursor-pointer truncate min-w-0 text-center leading-none ${
                              isActive
                                ? 'bg-sky-500 border-sky-400 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.6)] scale-105 z-10'
                                : 'bg-slate-900/80 border-slate-800/90 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                            } ${hasSubmitted && !isCorrecting ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {val.toFixed(2)}
                          </button>
                        );
                      })}
                    </div>

                    {/* Category Score Display */}
                    <div className="col-span-1 text-center font-mono">
                      <span className="text-[7.5px] sm:text-[8px] text-slate-500 block uppercase font-bold">SCORE</span>
                      <span className="text-xs sm:text-sm font-black text-sky-400 font-sport">
                        {cat1Score.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Category Row 2: KEMANTAPAN & HARMONISASI */}
                  <div className="grid grid-cols-10 items-center p-1.5 sm:p-2.5 gap-1.5 sm:gap-2 flex-1">
                    {/* Label Column */}
                    <div className="col-span-3 pr-1 sm:pr-2">
                      <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-400 font-sport leading-tight">
                        KEMANTAPAN & HARMONISASI
                      </h3>
                      <span className="text-[8px] sm:text-[9px] font-mono text-slate-500 font-bold block mt-0.5">
                        (0.01 - 0.30)
                      </span>
                    </div>

                    {/* Tuning Buttons Matrix (30 buttons) */}
                    <div className="col-span-6 grid grid-cols-10 gap-0.5 sm:gap-1 my-auto">
                      {tuningValues.map((val) => {
                        const isActive = cat2Score === val;
                        return (
                          <button
                            key={`cat2-${val}`}
                            disabled={hasSubmitted && !isCorrecting}
                            onClick={() => handleTuningSelect(2, val)}
                            className={`py-1 sm:py-1.5 px-0.5 text-[8.5px] sm:text-[10px] md:text-[11px] font-mono font-extrabold rounded sm:rounded-lg border transition-all cursor-pointer truncate min-w-0 text-center leading-none ${
                              isActive
                                ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)] scale-105 z-10'
                                : 'bg-slate-900/80 border-slate-800/90 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                            } ${hasSubmitted && !isCorrecting ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {val.toFixed(2)}
                          </button>
                        );
                      })}
                    </div>

                    {/* Category Score Display */}
                    <div className="col-span-1 text-center font-mono">
                      <span className="text-[7.5px] sm:text-[8px] text-slate-500 block uppercase font-bold">SCORE</span>
                      <span className="text-xs sm:text-sm font-black text-amber-400 font-sport">
                        {cat2Score.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Category Row 3: PENJIWAAN & PENGHAYATAN */}
                  <div className="grid grid-cols-10 items-center p-1.5 sm:p-2.5 gap-1.5 sm:gap-2 flex-1">
                    {/* Label Column */}
                    <div className="col-span-3 pr-1 sm:pr-2">
                      <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-purple-400 font-sport leading-tight">
                        PENJIWAAN & PENGHAYATAN
                      </h3>
                      <span className="text-[8px] sm:text-[9px] font-mono text-slate-500 font-bold block mt-0.5">
                        (0.01 - 0.30)
                      </span>
                    </div>

                    {/* Tuning Buttons Matrix (30 buttons) */}
                    <div className="col-span-6 grid grid-cols-10 gap-0.5 sm:gap-1 my-auto">
                      {tuningValues.map((val) => {
                        const isActive = cat3Score === val;
                        return (
                          <button
                            key={`cat3-${val}`}
                            disabled={hasSubmitted && !isCorrecting}
                            onClick={() => handleTuningSelect(3, val)}
                            className={`py-1 sm:py-1.5 px-0.5 text-[8.5px] sm:text-[10px] md:text-[11px] font-mono font-extrabold rounded sm:rounded-lg border transition-all cursor-pointer truncate min-w-0 text-center leading-none ${
                              isActive
                                ? 'bg-purple-500 border-purple-400 text-slate-950 shadow-[0_0_12px_rgba(168,85,247,0.6)] scale-105 z-10'
                                : 'bg-slate-900/80 border-slate-800/90 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                            } ${hasSubmitted && !isCorrecting ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {val.toFixed(2)}
                          </button>
                        );
                      })}
                    </div>

                    {/* Category Score Display */}
                    <div className="col-span-1 text-center font-mono">
                      <span className="text-[7.5px] sm:text-[8px] text-slate-500 block uppercase font-bold">SCORE</span>
                      <span className="text-xs sm:text-sm font-black text-purple-400 font-sport">
                        {cat3Score.toFixed(2)}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Right Column: TOTAL SCORE (COMBINED) Summary Panel */}
                <div className="col-span-2 bg-slate-950/90 p-2 sm:p-4 flex flex-col justify-between items-center text-center">
                  <div className="w-full">
                    <span className="text-[9px] sm:text-[10px] font-black font-sport tracking-wider text-slate-400 uppercase block mb-1.5 sm:mb-3 border-b border-slate-800 pb-1 sm:pb-2">
                      TOTAL SCORE
                    </span>

                    {/* Sub-score Breakdown list */}
                    <div className="space-y-1 sm:space-y-2 text-[9.5px] sm:text-[11px] font-mono text-left w-full px-1 sm:px-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-semibold truncate">- Tech</span>
                        <span className="font-bold text-sky-400 ml-1">{cat1Score.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-semibold truncate">- Firm</span>
                        <span className="font-bold text-amber-400 ml-1">{cat2Score.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 font-semibold truncate">- Soul</span>
                        <span className="font-bold text-purple-400 ml-1">{cat3Score.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Prominent Combined Total readout */}
                  <div className="my-auto w-full pt-1.5 sm:pt-3 border-t border-slate-800/80">
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold text-slate-400 block uppercase">
                      TUNING TOTAL
                    </span>
                    <span className="text-xl sm:text-3xl font-black font-sport text-cyan-400 tracking-wider block mt-0.5 sm:mt-1">
                      {totalTuning.toFixed(2)}
                    </span>
                  </div>
                </div>

              </div>

              {/* Table Footer Bar: Total Score & Action buttons */}
              <div className="bg-slate-900 border-t border-slate-800 p-2 sm:p-3 flex flex-wrap sm:flex-row items-center justify-between gap-2 sm:gap-3 min-w-[650px] lg:min-w-0">
                
                {/* Total Accumulation Score */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-[10px] sm:text-xs font-black font-sport tracking-widest text-slate-300 uppercase">
                    TOTAL AKUMULASI SCORE JURI {juriNumberStr}:
                  </span>
                  <span className="text-xl sm:text-2xl font-black font-sport text-amber-400 tracking-wider">
                    {calculatedGandaTotal.toFixed(2)}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono">
                    (Base 9.00 + {totalTuning.toFixed(2)})
                  </span>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    disabled={hasSubmitted && !isCorrecting}
                    onClick={handleResetTuning}
                    className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-[10px] sm:text-xs font-black font-sport tracking-wider uppercase transition-all cursor-pointer ${
                      hasSubmitted && !isCorrecting
                        ? 'bg-slate-900 border-slate-800 text-slate-600 pointer-events-none'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    RESET
                  </button>

                  <button
                    onClick={hasSubmitted && !isCorrecting ? handleRequestCorrectionMode : handleSubmitScore}
                    className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl border text-[10px] sm:text-xs font-black font-sport tracking-wider uppercase transition-all cursor-pointer shadow-lg flex items-center gap-1.5 sm:gap-2 ${
                      hasSubmitted && !isCorrecting
                        ? 'bg-rose-950/60 border-rose-500/40 text-rose-300 hover:bg-rose-900/80'
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 border-blue-400 text-white active:scale-95'
                    }`}
                  >
                    {hasSubmitted && !isCorrecting ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-rose-400" />
                        <span>AJUKAN KOREKSI NILAI</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                        <span>KIRIM & KUNCI NILAI FINAL ({calculatedGandaTotal.toFixed(2)})</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>

          </div>
        ) : (
          /* MODE 2: STANDARD JURUS TUNGGAL (ACCURACY WRONG MOVE COUNTER) */
          <div className="flex-1 flex flex-col justify-between gap-4">
            
            {/* Jurus Track Header Sub-bar */}
            <div className="bg-slate-900/60 border border-slate-800 flex justify-between items-center px-4 py-2 rounded-xl">
              <span className="text-[10px] font-black font-mono tracking-widest text-slate-400 uppercase">
                KATEGORI JURUS:
              </span>
              <div className="text-xs font-black tracking-wider text-slate-200 font-mono text-center flex-1">
                <span className="text-amber-400 font-extrabold uppercase">
                  {activePeserta ? activePeserta.kategori.toUpperCase() : 'JURUS TUNGGAL'}{' '}
                  <span className="text-cyan-400">
                    {activePeserta?.kategori.toLowerCase().includes('regu')
                      ? '(REGU IPSI)'
                      : jurusPhase === 'KOSONG'
                      ? '(TANGAN KOSONG / JURUS 1 - 7)'
                      : '(SENJATA / JURUS 8 - 14)'}
                  </span>
                </span>
              </div>
              <button
                onClick={() => {
                  playBeep('click');
                  setJurusPhase(prev => prev === 'KOSONG' ? 'SENJATA' : 'KOSONG');
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer border border-slate-700"
              >
                GANTI FASE
              </button>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-12 gap-4 flex-1 items-stretch max-h-[50vh]">
              
              {/* Left Box: WRONG MOVE Button */}
              <button
                disabled={hasSubmitted && !isCorrecting}
                onClick={handleWrongMoveClick}
                className={`col-span-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between p-6 cursor-pointer relative overflow-hidden group ${
                  hasSubmitted && !isCorrecting
                    ? 'bg-slate-950/40 border-slate-900 opacity-60 pointer-events-none'
                    : 'bg-gradient-to-b from-slate-900/80 to-[#110909]/40 border-red-950/60 hover:border-red-500/50 hover:bg-[#180a0a]/60 hover:shadow-[0_0_25px_rgba(239,68,68,0.15)] active:scale-[0.99]'
                }`}
              >
                <div className="w-full text-center">
                  <span className="block text-4xl sm:text-5xl font-black font-sport text-red-500 tracking-wider">
                    {wrongMoveCount}
                  </span>
                </div>

                <div className="w-full text-center py-6">
                  <span className="text-2xl sm:text-3xl font-black font-sport tracking-wider text-slate-400 group-hover:text-red-400 transition-colors">
                    WRONG MOVE
                  </span>
                </div>

                <div className="w-full text-center text-[9px] font-mono text-slate-500 font-bold uppercase tracking-widest">
                  {hasSubmitted && !isCorrecting ? 'LOCKED' : 'KLIK UNTUK TAMBAH SALAH GERAK (-0.01)'}
                </div>
              </button>

              {/* Center Box: DISCORS SILAT LOGO BRAND */}
              <div className="col-span-2 flex items-center justify-center p-1">
                <div className="flex flex-col items-center justify-center text-center">
                  <svg className="w-16 h-16 drop-shadow-[0_0_15px_rgba(56,189,248,0.25)]" viewBox="0 0 120 120" fill="none">
                    <path d="M12 85 C22 15, 98 15, 108 85" stroke="#0ea5e9" strokeWidth="4.5" strokeLinecap="round" strokeDasharray="3 3" />
                    <path d="M8 50 C18 110, 102 110, 112 50" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" />
                    <polygon points="60,18 102,92 18,92" stroke="#1e293b" strokeWidth="2.5" fill="#0b0f19" opacity="0.8" />
                    <g transform="translate(32, 26) scale(0.55)">
                      <circle cx="50" cy="32" r="8.5" fill="#ffffff" />
                      <path d="M38 40 L62 40 L66 75 L34 75 Z" fill="#ffffff" />
                    </g>
                  </svg>
                  <h2 className="text-base font-black font-sport tracking-tighter text-white mt-1 leading-none">
                    DISCORS
                  </h2>
                  <p className="text-[6px] font-mono tracking-[0.2em] text-cyan-400 font-extrabold uppercase mt-0.5 leading-none text-center">
                    DIGITAL SCORING SILAT
                  </p>
                </div>
              </div>

              {/* Right Box: READY / SUBMIT SCORE */}
              <button
                onClick={hasSubmitted && !isCorrecting ? handleRequestCorrectionMode : handleSubmitScore}
                className={`col-span-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between p-6 cursor-pointer relative overflow-hidden group ${
                  hasSubmitted && !isCorrecting
                    ? 'bg-slate-950/70 border-rose-500/20 hover:border-amber-500/40 hover:bg-slate-900/60'
                    : 'bg-gradient-to-b from-[#10306d] to-[#1e4ed8]/80 border-[#3b82f6]/50 hover:border-sky-400 hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] active:scale-[0.99]'
                }`}
              >
                <div className="w-full text-center">
                  {hasSubmitted && !isCorrecting ? (
                    <span className="inline-flex items-center gap-1 text-sm font-black font-sport text-rose-500 tracking-widest uppercase">
                      <Lock className="w-4 h-4 text-rose-500" />
                      LOCKED
                    </span>
                  ) : (
                    <span className="text-sm font-black font-sport text-emerald-400 tracking-widest uppercase">
                      UNLOCKED / RUNNING
                    </span>
                  )}
                </div>

                <div className="w-full text-center py-6">
                  <span className="text-2xl sm:text-3xl font-black font-sport tracking-wider text-white">
                    {hasSubmitted && !isCorrecting ? 'EDIT SCORE' : 'READY / SAVE'}
                  </span>
                </div>

                <div className="w-full text-center text-[9px] font-mono text-blue-200/60 font-bold uppercase tracking-widest">
                  {hasSubmitted && !isCorrecting ? 'KLIK UNTUK AJUKAN KOREKSI NILAI' : 'KLIK UNTUK MENYIMPAN NILAI FINAL'}
                </div>
              </button>

            </div>

            {/* Lower Summary Row */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3">
                  <button
                    disabled={hasSubmitted && !isCorrecting}
                    onClick={handleBackspaceClick}
                    className={`w-full py-3 px-4 rounded-xl border font-black text-xs font-sport tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all uppercase ${
                      hasSubmitted && !isCorrecting
                        ? 'bg-slate-950/20 border-slate-900 text-slate-600 pointer-events-none'
                        : 'border-amber-600/70 text-amber-500 bg-amber-950/10 hover:bg-amber-500 hover:text-slate-950 hover:shadow-lg active:scale-95'
                    }`}
                  >
                    <span>✕</span>
                    <span>BACKSPACE</span>
                  </button>
                </div>

                <div className="col-span-9 flex justify-between items-center py-2.5 px-4 border border-slate-800 bg-slate-950/60 rounded-xl">
                  <span className="text-[11px] font-black tracking-widest font-sport text-slate-400 uppercase">
                    ACCURACY TOTAL SCORE
                  </span>
                  <span className="text-xl font-bold font-mono text-white tracking-wider">
                    {calculatedKebenaran.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center py-3 px-4 border border-amber-900/40 bg-amber-950/20 rounded-xl">
                <span className="text-xs font-black tracking-widest font-sport text-amber-400 uppercase">
                  TOTAL SCORE
                </span>
                <span className="text-3xl font-black font-sport text-amber-400 tracking-widest">
                  {calculatedKebenaran.toFixed(2)}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* System Alert & Success Messages */}
        <AnimatePresence mode="wait">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="p-2.5 bg-red-950/40 border border-red-500/20 text-red-400 rounded-lg text-[10px] uppercase font-bold font-mono flex items-center gap-2"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>Sistem Alert: {errorMessage}</span>
            </motion.div>
          )}

          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="p-2.5 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] uppercase font-bold font-mono flex items-center gap-2"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Status: {successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* D. FOOTER BRANDING */}
      <footer className="z-10 bg-slate-950 border-t border-slate-900 px-4 py-1.5 flex items-center justify-between text-[8.5px] font-mono tracking-wider text-slate-400 uppercase">
        <span className="font-bold">SISTEM SCORING PENCAK SILAT IPSI - KATEGORI SENI (TUNGGAL, GANDA & JURUS BEBAS)</span>
        <span className="font-black text-blue-500 tracking-widest">DISCORS PENCAK SILAT - Versi 3.0</span>
      </footer>
    </div>
  );
}
