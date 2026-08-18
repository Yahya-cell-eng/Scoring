/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Shield, Play, Clock, ArrowLeft, Maximize2, Minimize2, 
  Volume2, VolumeX, Search, Filter, RefreshCw, ChevronRight, 
  ChevronLeft, Bell, Users, CheckCircle, Radio, Sparkles, Megaphone,
  Eye, Calendar, Activity, Zap, Award, Layers, Hash, LayoutGrid,
  List, ArrowRight, SkipForward, SkipBack, Info
} from 'lucide-react';
import { MatchState, MatchHistory, TGRState, BaganCategory, BaganMatch, TGRPeserta } from '../types';
import { playBeep } from '../utils/sound';

export interface QueueMatchItem {
  id: string;
  type: 'tanding' | 'seni';
  gelanggang: string;
  partai: string;
  partaiNum: number;
  kelas: string;
  gender: 'Putra' | 'Putri';
  babak: string;
  atletMerah: {
    nama: string;
    kontingen: string;
    score?: number;
  };
  atletBiru: {
    nama: string;
    kontingen: string;
    score?: number;
  };
  status: 'live' | 'next' | 'waiting' | 'done';
  winner?: 'merah' | 'biru' | null;
  finalScoreMerah?: number;
  finalScoreBiru?: number;
  tgrPeserta?: TGRPeserta;
  catId?: string;
  matchId?: number;
}

interface MonitorUrutanPartaiProps {
  state: MatchState;
  histories: MatchHistory[];
  tgrState?: TGRState | null;
  dispatch?: (type: string, payload?: any) => Promise<any>;
  onBack: () => void;
  theme: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export default function MonitorUrutanPartai({
  state,
  histories = [],
  tgrState,
  dispatch,
  onBack,
  theme,
  onToggleTheme
}: MonitorUrutanPartaiProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // View mode: 'nomor_saja' (clean gigantic number board) or 'detail' (table with athlete names)
  const [displayMode, setDisplayMode] = useState<'nomor_saja' | 'detail'>('nomor_saja');
  const [activeTab, setActiveTab] = useState<'semua' | 'tanding' | 'seni'>('semua');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'next_waiting' | 'done'>('all');
  const [gelanggangFilter, setGelanggangFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoCarousel, setAutoCarousel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [selectedMatchModal, setSelectedMatchModal] = useState<QueueMatchItem | null>(null);
  const [announcementText, setAnnouncementText] = useState<string | null>(null);

  // Live real-time digital clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen event listener
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

  // Helper to extract numeric partai number for sorting & display
  const getPartaiNum = (pStr: string): number => {
    const num = parseInt(pStr.replace(/\D/g, ''), 10);
    return isNaN(num) ? 9999 : num;
  };

  // Format 2-digit number (e.g. 5 -> "05")
  const formatDigit = (num: number): string => {
    if (num >= 1000) return String(num); // Seni numbers
    return String(num).padStart(2, '0');
  };

  // Aggregate and build the master unified match schedule queue
  const matchQueue: QueueMatchItem[] = useMemo(() => {
    const items: QueueMatchItem[] = [];
    const currentPartaiNum = getPartaiNum(state.partai || '1');

    // 1. Process from state.baganCategories (Bracket Matches)
    if (state.baganCategories && state.baganCategories.length > 0) {
      state.baganCategories.forEach(cat => {
        cat.matches.forEach(m => {
          const pNum = getPartaiNum(m.partai);
          
          // Check if this match is already in completed histories
          const historyMatch = histories.find(
            h => h.partai.toLowerCase().trim() === m.partai.toLowerCase().trim() ||
                 (h.kelas === (cat.kelas || cat.name) && h.atletMerah.nama === m.atletMerah.nama && h.atletBiru.nama === m.atletBiru.nama)
          );

          // Check if it is the currently active match in arena
          const isCurrentlyActive = 
            state.partai.toLowerCase().trim() === m.partai.toLowerCase().trim() ||
            (state.activeBaganCategoryId === cat.id && state.activeBaganMatchId === m.id);

          let status: 'live' | 'next' | 'waiting' | 'done' = 'waiting';
          if (historyMatch || m.winner) {
            status = 'done';
          } else if (isCurrentlyActive) {
            status = 'live';
          } else if (pNum === currentPartaiNum + 1) {
            status = 'next';
          }

          items.push({
            id: `bagan_${cat.id}_${m.id}`,
            type: 'tanding',
            gelanggang: 'Gelanggang 1',
            partai: m.partai.toUpperCase().includes('PARTAI') ? m.partai.toUpperCase() : `PARTAI ${m.partai}`,
            partaiNum: pNum,
            kelas: cat.name.toUpperCase(),
            gender: cat.gender || 'Putra',
            babak: m.round === 'final' ? 'FINAL' : m.round === 'semi' ? 'SEMI FINAL' : m.round === 'quarter' ? 'PEREMPAT FINAL' : 'PENYISIHAN',
            atletMerah: {
              nama: isCurrentlyActive ? state.atletMerah.nama : m.atletMerah.nama || 'Menunggu Hasil...',
              kontingen: isCurrentlyActive ? state.atletMerah.kontingen : m.atletMerah.kontingen || '-',
              score: isCurrentlyActive ? state.scores.merah.total : historyMatch?.skorAkhirMerah
            },
            atletBiru: {
              nama: isCurrentlyActive ? state.atletBiru.nama : m.atletBiru.nama || 'Menunggu Hasil...',
              kontingen: isCurrentlyActive ? state.atletBiru.kontingen : m.atletBiru.kontingen || '-',
              score: isCurrentlyActive ? state.scores.biru.total : historyMatch?.skorAkhirBiru
            },
            status,
            winner: historyMatch?.winner || m.winner || (isCurrentlyActive ? state.winner : null),
            finalScoreMerah: historyMatch?.skorAkhirMerah,
            finalScoreBiru: historyMatch?.skorAkhirBiru,
            catId: cat.id,
            matchId: m.id
          });
        });
      });
    }

    // 2. If bagan was empty or current live match not in bagan, ensure current live match is prominently registered
    const hasLiveMatch = items.some(item => item.status === 'live');
    if (!hasLiveMatch && state.partai) {
      items.unshift({
        id: `live_${state.partai}`,
        type: 'tanding',
        gelanggang: 'Gelanggang 1',
        partai: state.partai.toUpperCase().includes('PARTAI') ? state.partai.toUpperCase() : `PARTAI ${state.partai}`,
        partaiNum: currentPartaiNum,
        kelas: state.kelas || 'KELAS TANDING',
        gender: state.gender || 'Putra',
        babak: `BABAK ${state.currentBabak}`,
        atletMerah: {
          nama: state.atletMerah.nama,
          kontingen: state.atletMerah.kontingen,
          score: state.scores.merah.total
        },
        atletBiru: {
          nama: state.atletBiru.nama,
          kontingen: state.atletBiru.kontingen,
          score: state.scores.biru.total
        },
        status: 'live',
        winner: state.winner
      });
    }

    // 3. Process completed matches from histories if not yet included
    histories.forEach(h => {
      const exists = items.some(
        it => it.partai.toLowerCase().replace(/\s+/g, '') === h.partai.toLowerCase().replace(/\s+/g, '')
      );
      if (!exists) {
        items.push({
          id: `hist_${h.id}`,
          type: 'tanding',
          gelanggang: 'Gelanggang 1',
          partai: h.partai.toUpperCase().includes('PARTAI') ? h.partai.toUpperCase() : `PARTAI ${h.partai}`,
          partaiNum: getPartaiNum(h.partai),
          kelas: h.kelas.toUpperCase(),
          gender: h.gender || 'Putra',
          babak: 'SELESAI',
          atletMerah: {
            nama: h.atletMerah.nama,
            kontingen: h.atletMerah.kontingen,
            score: h.skorAkhirMerah
          },
          atletBiru: {
            nama: h.atletBiru.nama,
            kontingen: h.atletBiru.kontingen,
            score: h.skorAkhirBiru
          },
          status: 'done',
          winner: h.winner,
          finalScoreMerah: h.skorAkhirMerah,
          finalScoreBiru: h.skorAkhirBiru
        });
      }
    });

    // 4. Process TGR / Seni participants from tgrState
    if (tgrState && tgrState.pesertaList && tgrState.pesertaList.length > 0) {
      tgrState.pesertaList.forEach(p => {
        const isTgrActive = tgrState.activePesertaId === p.id;
        const isDone = p.status === 'Sudah Menilai';
        const isTgrNext = !isDone && !isTgrActive && p.noUrut === (tgrState.pesertaList.find(x => x.id === tgrState.activePesertaId)?.noUrut || 0) + 1;

        items.push({
          id: `tgr_${p.id}`,
          type: 'seni',
          gelanggang: tgrState.gelanggang || 'Gelanggang 1',
          partai: `SENI ${String(p.noUrut).padStart(2, '0')}`,
          partaiNum: p.noUrut,
          kelas: `SENI ${p.kategori.toUpperCase()}`,
          gender: 'Putra',
          babak: p.status.toUpperCase(),
          atletMerah: {
            nama: p.nama,
            kontingen: p.kontingen,
            score: p.finalScore
          },
          atletBiru: {
            nama: '-',
            kontingen: '-',
            score: 0
          },
          status: isTgrActive ? 'live' : isDone ? 'done' : isTgrNext ? 'next' : 'waiting',
          tgrPeserta: p
        });
      });
    }

    // 5. Generate structured sequence from 1 to 20 if list is sparse so user sees a complete continuous number matrix
    const maxNum = Math.max(...items.map(it => it.partaiNum).filter(n => n < 1000), 12);
    for (let pNum = 1; pNum <= Math.max(maxNum, 12); pNum++) {
      if (!items.some(it => it.partaiNum === pNum && it.type === 'tanding')) {
        const isLive = pNum === currentPartaiNum;
        const isNext = pNum === currentPartaiNum + 1;
        const isDone = pNum < currentPartaiNum;

        items.push({
          id: `auto_${pNum}`,
          type: 'tanding',
          gelanggang: 'Gelanggang 1',
          partai: `PARTAI ${formatDigit(pNum)}`,
          partaiNum: pNum,
          kelas: `KELAS TANDING PARTAI ${formatDigit(pNum)}`,
          gender: pNum % 2 === 0 ? 'Putri' : 'Putra',
          babak: pNum > 8 ? 'SEMI FINAL' : 'PENYISIHAN',
          atletMerah: {
            nama: isLive ? state.atletMerah.nama : `Atlet Merah (P${pNum})`,
            kontingen: isLive ? state.atletMerah.kontingen : 'Kontingen A',
            score: isLive ? state.scores.merah.total : isDone ? 25 : undefined
          },
          atletBiru: {
            nama: isLive ? state.atletBiru.nama : `Atlet Biru (P${pNum})`,
            kontingen: isLive ? state.atletBiru.kontingen : 'Kontingen B',
            score: isLive ? state.scores.biru.total : isDone ? 18 : undefined
          },
          status: isLive ? 'live' : isDone ? 'done' : isNext ? 'next' : 'waiting',
          winner: isDone ? 'merah' : undefined,
          finalScoreMerah: isDone ? 25 : undefined,
          finalScoreBiru: isDone ? 18 : undefined
        });
      }
    }

    // Sort strictly by partaiNum ascending
    return items.sort((a, b) => a.partaiNum - b.partaiNum);
  }, [state, histories, tgrState]);

  // Identify Live Match
  const liveMatch = useMemo(() => {
    return matchQueue.find(m => m.status === 'live') || matchQueue[0];
  }, [matchQueue]);

  // Identify Next Up Match (Persiapan / On Deck)
  const nextMatch = useMemo(() => {
    return matchQueue.find(m => m.status === 'next') || 
           matchQueue.find(m => m.status === 'waiting' && m.partaiNum > (liveMatch?.partaiNum || 0));
  }, [matchQueue, liveMatch]);

  // Identify Standby Match 1 (2 matches away)
  const standbyMatch1 = useMemo(() => {
    if (!nextMatch) return null;
    return matchQueue.find(m => (m.status === 'waiting' || m.status === 'next') && m.partaiNum > nextMatch.partaiNum);
  }, [matchQueue, nextMatch]);

  // Identify Standby Match 2 (3 matches away)
  const standbyMatch2 = useMemo(() => {
    if (!standbyMatch1) return null;
    return matchQueue.find(m => m.status === 'waiting' && m.partaiNum > standbyMatch1.partaiNum);
  }, [matchQueue, standbyMatch1]);

  // Filtered Queue List based on tab, status, gelanggang, and search
  const filteredQueue = useMemo(() => {
    return matchQueue.filter(item => {
      // Type Tab Filter
      if (activeTab === 'tanding' && item.type !== 'tanding') return false;
      if (activeTab === 'seni' && item.type !== 'seni') return false;

      // Status Filter
      if (statusFilter === 'live' && item.status !== 'live') return false;
      if (statusFilter === 'next_waiting' && item.status !== 'next' && item.status !== 'waiting') return false;
      if (statusFilter === 'done' && item.status !== 'done') return false;

      // Gelanggang Filter
      if (gelanggangFilter !== 'all' && item.gelanggang !== gelanggangFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPartai = item.partai.toLowerCase().includes(q) || String(item.partaiNum).includes(q);
        const matchKelas = item.kelas.toLowerCase().includes(q);
        const matchMerah = item.atletMerah.nama.toLowerCase().includes(q) || item.atletMerah.kontingen.toLowerCase().includes(q);
        const matchBiru = item.atletBiru.nama.toLowerCase().includes(q) || item.atletBiru.kontingen.toLowerCase().includes(q);
        return matchPartai || matchKelas || matchMerah || matchBiru;
      }

      return true;
    });
  }, [matchQueue, activeTab, statusFilter, gelanggangFilter, searchQuery]);

  // Pagination for Queue List in detail mode
  const totalPages = Math.ceil(filteredQueue.length / itemsPerPage) || 1;
  const paginatedQueue = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQueue.slice(start, start + itemsPerPage);
  }, [filteredQueue, currentPage]);

  // Auto carousel cycling for big screen monitors
  useEffect(() => {
    if (!autoCarousel || totalPages <= 1) return;
    const interval = setInterval(() => {
      setCurrentPage(prev => (prev >= totalPages ? 1 : prev + 1));
    }, 8000);
    return () => clearInterval(interval);
  }, [autoCarousel, totalPages]);

  // Voice Announcement Function (SpeechSynthesis + Chime)
  const handleAnnounceMatch = (match: QueueMatchItem, customPrefix?: string) => {
    if (!soundEnabled) return;
    playBeep('valid');

    const numStr = formatDigit(match.partaiNum);
    let textToSpeak = '';
    if (customPrefix) {
      textToSpeak = `${customPrefix}, Partai Nomor ${numStr}. ${match.kelas}. Sudut Merah ${match.atletMerah.nama} dari ${match.atletMerah.kontingen}. Sudut Biru ${match.atletBiru.nama} dari ${match.atletBiru.kontingen}.`;
    } else if (match.status === 'live') {
      textToSpeak = `Partai yang sedang bertanding di Gelanggang 1 adalah Partai Nomor ${numStr}. ${match.kelas}. Sudut Merah ${match.atletMerah.nama}, Sudut Biru ${match.atletBiru.nama}.`;
    } else if (match.status === 'next') {
      textToSpeak = `Panggilan persiapan untuk Partai Nomor ${numStr}. Kategori ${match.kelas}. Sudut Merah ${match.atletMerah.nama} dari ${match.atletMerah.kontingen}, Sudut Biru ${match.atletBiru.nama} dari ${match.atletBiru.kontingen}. Dipersilakan segera memasuki ruang persiapan gelanggang.`;
    } else {
      textToSpeak = `Pemberitahuan standby, Partai Nomor ${numStr}. ${match.kelas}. Atlet dipersilakan melakukan pemanasan.`;
    }

    setAnnouncementText(textToSpeak);
    setIsAnnouncing(true);

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = 'id-ID';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.onend = () => {
        setIsAnnouncing(false);
        setTimeout(() => setAnnouncementText(null), 3000);
      };
      utterance.onerror = () => {
        setIsAnnouncing(false);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        setIsAnnouncing(false);
        setAnnouncementText(null);
      }, 5000);
    }
  };

  // Step active live partai forward / backward
  const handleStepPartai = async (direction: 'next' | 'prev') => {
    if (!dispatch) return;
    playBeep('click');
    const currentNum = getPartaiNum(state.partai || '1');
    const targetNum = direction === 'next' ? currentNum + 1 : Math.max(1, currentNum - 1);
    
    // Find item in queue
    const targetItem = matchQueue.find(m => m.partaiNum === targetNum && m.type === 'tanding');
    
    try {
      await dispatch('UPDATE_METADATA', {
        partai: formatDigit(targetNum),
        kelas: targetItem?.kelas || `KELAS TANDING PARTAI ${formatDigit(targetNum)}`,
        gender: targetItem?.gender || 'Putra',
        atletMerah: targetItem ? { nama: targetItem.atletMerah.nama, kontingen: targetItem.atletMerah.kontingen } : { nama: `Atlet Merah (${targetNum})`, kontingen: 'Kontingen A' },
        atletBiru: targetItem ? { nama: targetItem.atletBiru.nama, kontingen: targetItem.atletBiru.kontingen } : { nama: `Atlet Biru (${targetNum})`, kontingen: 'Kontingen B' }
      });
      playBeep('valid');
    } catch (e) {
      console.warn("Failed to step partai", e);
    }
  };

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between bg-[#03020c] text-slate-100 font-sans relative overflow-x-hidden ${
      isFullscreen ? 'fixed inset-0 z-[99999]' : ''
    }`}>
      
      {/* Background Cyber Grid & Radiant Neon Glows */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.35)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.18)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[35rem] h-[35rem] rounded-full blur-[170px] pointer-events-none bg-indigo-950/25" />
      <div className="absolute top-1/3 left-0 w-[30rem] h-[30rem] rounded-full blur-[160px] pointer-events-none bg-purple-950/20" />

      {/* 1. TOP HEADER & TOURNAMENT STATUS BAR */}
      <header className="z-20 w-full bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md px-4 py-3 sticky top-0 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Brand & Title */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-mono font-bold uppercase transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Kembali ke Menu Utama"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">KEMBALI</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-500 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                <Hash className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black font-sport tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-white to-cyan-400 uppercase">
                    MONITOR NOMOR URUTAN PARTAI
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-600/60 text-red-400 text-[9px] font-mono font-black uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    LIVE ARENA
                  </span>
                </div>
                <p className="text-[10px] font-mono text-slate-400 truncate max-w-[280px] sm:max-w-md uppercase">
                  {state.namaEvent || 'KEJUARAAN PENCAK SILAT NASIONAL'} • GELANGGANG 1
                </p>
              </div>
            </div>

            {/* Mobile Time */}
            <div className="md:hidden font-mono font-bold text-xs text-amber-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              {currentTime.toLocaleTimeString('id-ID')}
            </div>
          </div>

          {/* Controls & Digital Clock */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            
            {/* View Mode Toggle: Nomor Saja vs Detail */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => {
                  playBeep('click');
                  setDisplayMode('nomor_saja');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-black tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                  displayMode === 'nomor_saja'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Nomor Digital Arena (Hanya Nomor)"
              >
                <Hash className="w-3.5 h-3.5" />
                <span>NOMOR SAJA</span>
              </button>

              <button
                onClick={() => {
                  playBeep('click');
                  setDisplayMode('detail');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-black tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                  displayMode === 'detail'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Detail Nama Atlet & Kontingen"
              >
                <List className="w-3.5 h-3.5" />
                <span>DETAIL ATLET</span>
              </button>
            </div>

            {/* Real-time Clock Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono font-extrabold text-amber-400 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB</span>
            </div>

            {/* Voice Announcement Sound Toggle */}
            <button
              onClick={() => {
                playBeep('click');
                setSoundEnabled(!soundEnabled);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                soundEnabled 
                  ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? "Suara Panggilan Aktif" : "Suara Panggilan Nonaktif"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{soundEnabled ? 'SUARA ON' : 'MUTE'}</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all cursor-pointer shadow-sm active:scale-95"
              title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh (Full Screen)"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4 text-slate-300" />}
            </button>

          </div>

        </div>
      </header>

      {/* Voice Announcement Banner Overlay */}
      <AnimatePresence>
        {isAnnouncing && announcementText && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="z-30 w-full bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 text-slate-950 px-4 py-2.5 shadow-2xl flex items-center justify-center gap-3 text-xs sm:text-sm font-black font-sport tracking-wider uppercase border-b-2 border-amber-300"
          >
            <Megaphone className="w-5 h-5 animate-bounce text-slate-950 shrink-0" />
            <span className="truncate max-w-4xl">{announcementText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MAIN BODY CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6 z-10">

        {/* ========================================================= */}
        {/* MODE 1: DISPLAY NOMOR SAJA (GIANT ARENA LED NUMBER BOARD) */}
        {/* ========================================================= */}
        {displayMode === 'nomor_saja' && (
          <div className="space-y-6">
            
            {/* HERO ARENA NUMBER STAGE: 3 MAIN GIANT NUMBER PANELS */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-stretch">
              
              {/* CARD 1: NOMOR PARTAI SEDANG BERTANDING (GIANT RED/CYAN LED) - 6 COLS */}
              <div className="md:col-span-6 bg-gradient-to-b from-slate-950 via-[#0a0518] to-slate-950 border-4 border-red-500/80 rounded-3xl p-6 relative overflow-hidden shadow-[0_0_60px_rgba(239,68,68,0.25)] flex flex-col justify-between items-center text-center">
                
                {/* Glow Ambient Lights */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

                {/* Top Badge */}
                <div className="w-full flex items-center justify-between gap-2 border-b border-red-900/50 pb-3 mb-4">
                  <span className="px-3.5 py-1.5 rounded-full bg-red-600 text-white font-black font-sport text-xs sm:text-sm tracking-widest uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.6)]">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                    SEDANG TANDING
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-slate-900/90 border border-slate-700 text-cyan-400 font-mono font-extrabold text-xs uppercase">
                    GELANGGANG 1
                  </span>
                </div>

                {/* Label Header */}
                <div className="text-[11px] sm:text-xs font-mono font-black text-red-400 uppercase tracking-[0.25em]">
                  NOMOR PARTAI AKTIF
                </div>

                {/* GIGANTIC LED NUMBER DISPLAY */}
                <div className="my-3 py-2 flex flex-col items-center justify-center">
                  <div className="text-7xl sm:text-9xl md:text-[10rem] font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-red-200 to-red-500 drop-shadow-[0_0_35px_rgba(239,68,68,0.7)] leading-none select-none">
                    {formatDigit(liveMatch?.partaiNum || 1)}
                  </div>
                  <div className="mt-2 text-xs sm:text-sm font-black font-sport tracking-wider text-slate-300 uppercase">
                    {liveMatch?.kelas || 'KELAS TANDING'} • {liveMatch?.babak || 'BABAK AKTIF'}
                  </div>
                </div>

                {/* Quick Info & Actions Footer */}
                <div className="w-full pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {dispatch && (
                      <>
                        <button
                          onClick={() => handleStepPartai('prev')}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Kembali ke Partai Sebelumnya"
                        >
                          <SkipBack className="w-3 h-3" />
                          <span>-1</span>
                        </button>
                        <button
                          onClick={() => handleStepPartai('next')}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
                          title="Lanjut ke Partai Berikutnya"
                        >
                          <SkipForward className="w-3 h-3" />
                          <span>+1</span>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => liveMatch && setSelectedMatchModal(liveMatch)}
                      className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Info className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Rincian</span>
                    </button>

                    <button
                      onClick={() => liveMatch && handleAnnounceMatch(liveMatch)}
                      className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-black uppercase transition-colors cursor-pointer flex items-center gap-1.5 shadow-md"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>Panggil Suara</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* CARD 2: NOMOR PARTAI BERIKUTNYA (PERSIAPAN / ON-DECK) - 3 COLS */}
              <div className="md:col-span-3 bg-gradient-to-b from-slate-950 via-[#181305] to-slate-950 border-3 border-amber-500/80 rounded-3xl p-5 relative overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.2)] flex flex-col justify-between items-center text-center">
                
                {/* Glow Ambient */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

                {/* Top Badge */}
                <div className="w-full flex items-center justify-between gap-1 border-b border-amber-900/50 pb-2 mb-2">
                  <span className="px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-black font-sport text-[10px] sm:text-xs tracking-wider uppercase flex items-center gap-1 shadow-md">
                    <Zap className="w-3 h-3 fill-slate-950" />
                    BERIKUTNYA
                  </span>
                  <span className="text-[9px] font-mono font-bold text-amber-400 uppercase">
                    PERSIAPAN
                  </span>
                </div>

                <div className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest">
                  NOMOR PARTAI
                </div>

                {/* GIANT AMBER NUMBER */}
                <div className="my-2 flex flex-col items-center justify-center">
                  <div className="text-6xl sm:text-8xl md:text-8xl font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-200 to-amber-500 drop-shadow-[0_0_25px_rgba(245,158,11,0.6)] leading-none select-none">
                    {nextMatch ? formatDigit(nextMatch.partaiNum) : '--'}
                  </div>
                  <div className="mt-2 text-[11px] font-sport font-black text-slate-300 uppercase truncate max-w-[180px]">
                    {nextMatch?.kelas || 'Antrian Berikutnya'}
                  </div>
                </div>

                <div className="w-full pt-3 border-t border-slate-800/80 flex flex-col gap-2">
                  <span className="text-[9px] font-mono text-amber-300 font-bold uppercase animate-pulse">
                    ⚠ SEGERA KE RUANG PEMANASAN
                  </span>
                  {nextMatch && (
                    <button
                      onClick={() => handleAnnounceMatch(nextMatch, 'Panggilan Persiapan Masuk Gelanggang')}
                      className="w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-black text-xs uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      <span>PANGGIL PARTAI</span>
                    </button>
                  )}
                </div>

              </div>

              {/* CARD 3: NOMOR PARTAI STANDBY / CADANGAN (2 & 3 PARTAI LAGI) - 3 COLS */}
              <div className="md:col-span-3 bg-gradient-to-b from-slate-950 via-[#10091d] to-slate-950 border-2 border-purple-500/60 rounded-3xl p-5 relative overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col justify-between items-center text-center">
                
                {/* Glow Ambient */}
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-600/15 rounded-full blur-2xl pointer-events-none" />

                {/* Top Badge */}
                <div className="w-full flex items-center justify-between gap-1 border-b border-purple-900/50 pb-2 mb-2">
                  <span className="px-2.5 py-1 rounded-full bg-purple-950 border border-purple-600 text-purple-300 font-black font-sport text-[10px] tracking-wider uppercase">
                    STANDBY
                  </span>
                  <span className="text-[9px] font-mono font-bold text-purple-400 uppercase">
                    2-3 PARTAI LAGI
                  </span>
                </div>

                <div className="text-[10px] font-mono font-black text-purple-400 uppercase tracking-widest">
                  NOMOR STANDBY
                </div>

                {/* TWO STANDBY NUMBERS IN GRID */}
                <div className="my-2 grid grid-cols-2 gap-2 w-full">
                  <div className="p-2 rounded-2xl bg-purple-950/40 border border-purple-800/50 flex flex-col items-center">
                    <span className="text-[8.5px] font-mono text-purple-400 font-bold uppercase">URUTAN 1</span>
                    <span className="text-4xl sm:text-5xl font-black font-mono text-purple-300">
                      {standbyMatch1 ? formatDigit(standbyMatch1.partaiNum) : '--'}
                    </span>
                    <span className="text-[8.5px] font-sport text-slate-400 truncate max-w-[80px] uppercase">
                      {standbyMatch1?.kelas || '-'}
                    </span>
                  </div>

                  <div className="p-2 rounded-2xl bg-purple-950/20 border border-purple-900/40 flex flex-col items-center">
                    <span className="text-[8.5px] font-mono text-slate-400 font-bold uppercase">URUTAN 2</span>
                    <span className="text-4xl sm:text-5xl font-black font-mono text-slate-300">
                      {standbyMatch2 ? formatDigit(standbyMatch2.partaiNum) : '--'}
                    </span>
                    <span className="text-[8.5px] font-sport text-slate-400 truncate max-w-[80px] uppercase">
                      {standbyMatch2?.kelas || '-'}
                    </span>
                  </div>
                </div>

                <div className="w-full pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-slate-400 uppercase">
                    RUANG ATLET
                  </span>
                  {standbyMatch1 && (
                    <button
                      onClick={() => handleAnnounceMatch(standbyMatch1, 'Pemberitahuan Standby')}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-purple-700/60 text-purple-300 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                    >
                      Panggil Standby
                    </button>
                  )}
                </div>

              </div>

            </div>

            {/* DIGITAL LED NUMBER MATRIX BOARD (PAPAN NOMOR SELURUH PARTAI) */}
            <div className="bg-slate-950/90 border border-slate-800/90 rounded-3xl p-4 sm:p-6 shadow-2xl">
              
              {/* Header Filter & Legend */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400">
                    <LayoutGrid className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black font-sport tracking-wider text-slate-100 uppercase">
                      PAPAN MATRIKS NOMOR PARTAI (DIGITAL ARENA GRID)
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 uppercase">
                      Klik salah satu nomor untuk melihat rincian jadwal atau memanggil nomor bersangkutan
                    </p>
                  </div>
                </div>

                {/* Color Status Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse border border-red-300" />
                    <span className="text-red-400">SEDANG TANDING</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500 border border-amber-300" />
                    <span className="text-amber-400">PERSIAPAN</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-purple-500 border border-purple-300" />
                    <span className="text-purple-400">STANDBY</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-300" />
                    <span className="text-emerald-400">SELESAI</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-slate-700" />
                    <span className="text-slate-400">ANTRIAN</span>
                  </div>
                </div>
              </div>

              {/* NUMBER TILES GRID */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
                {matchQueue.map((item) => {
                  const isLive = item.status === 'live';
                  const isNext = item.status === 'next';
                  const isDone = item.status === 'done';
                  const isStandby = item.id === standbyMatch1?.id || item.id === standbyMatch2?.id;

                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        playBeep('click');
                        setSelectedMatchModal(item);
                      }}
                      className={`relative rounded-2xl p-3 flex flex-col items-center justify-between cursor-pointer transition-all border-2 text-center select-none shadow-lg ${
                        isLive
                          ? 'bg-red-950/80 border-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] ring-2 ring-red-400/50'
                          : isNext
                          ? 'bg-amber-950/70 border-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                          : isStandby
                          ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                          : isDone
                          ? 'bg-emerald-950/40 border-emerald-700/60 text-slate-300 opacity-75'
                          : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      {/* Status Indicator Tag */}
                      <div className="w-full flex items-center justify-between gap-1 text-[8.5px] font-mono font-bold mb-1">
                        <span className="uppercase text-slate-400">PARTAI</span>
                        {isLive && (
                          <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-mono text-[8px] font-black animate-pulse">
                            LIVE
                          </span>
                        )}
                        {isNext && (
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-mono text-[8px] font-black">
                            SIAP
                          </span>
                        )}
                        {isDone && (
                          <span className="text-emerald-400 font-mono text-[8px]">
                            ✓
                          </span>
                        )}
                      </div>

                      {/* GIGANTIC NUMBER IN TILE */}
                      <div className={`text-3xl sm:text-4xl font-black font-mono my-1 tracking-tight ${
                        isLive ? 'text-red-300 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]' : isNext ? 'text-amber-400' : isDone ? 'text-emerald-400' : isStandby ? 'text-purple-300' : 'text-slate-200'
                      }`}>
                        {formatDigit(item.partaiNum)}
                      </div>

                      {/* Category Subtext */}
                      <div className="w-full text-[9px] font-sport truncate uppercase text-slate-400 mt-1">
                        {item.kelas}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

            </div>

          </div>
        )}

        {/* ========================================================= */}
        {/* MODE 2: DISPLAY DETAIL LENGKAP ATLET & KONTINGEN          */}
        {/* ========================================================= */}
        {displayMode === 'detail' && (
          <div className="space-y-6">
            
            {/* Filter & Search Bar */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl space-y-3">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                
                {/* Left Type Tabs */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
                  <button
                    onClick={() => { playBeep('click'); setActiveTab('semua'); setCurrentPage(1); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black font-sport tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'semua' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SEMUA JADWAL ({matchQueue.length})
                  </button>

                  <button
                    onClick={() => { playBeep('click'); setActiveTab('tanding'); setCurrentPage(1); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black font-sport tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'tanding' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    LAGA TANDING ({matchQueue.filter(m => m.type === 'tanding').length})
                  </button>

                  <button
                    onClick={() => { playBeep('click'); setActiveTab('seni'); setCurrentPage(1); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-black font-sport tracking-wider uppercase transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'seni' ? 'bg-purple-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SENI TGR ({matchQueue.filter(m => m.type === 'seni').length})
                  </button>
                </div>

                {/* Right Filters & Search */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => { playBeep('click'); setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-300 uppercase focus:outline-none focus:border-amber-500"
                  >
                    <option value="all">SEMUA STATUS</option>
                    <option value="live">🔴 SEDANG TANDING</option>
                    <option value="next_waiting">⏳ PERSIAPAN & STANDBY</option>
                    <option value="done">🟢 SELESAI</option>
                  </select>

                  <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      placeholder="Cari nomor partai, atlet, kontingen..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* MASTER MATCH QUEUE TABLE */}
            <div className="bg-slate-950/90 border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl">
              <div className="grid grid-cols-12 bg-slate-900/90 text-[10px] font-mono font-black uppercase text-slate-400 py-3 px-4 border-b border-slate-800 items-center text-center">
                <div className="col-span-2 text-left">NO. PARTAI</div>
                <div className="col-span-3 text-left">KELAS & BABAK</div>
                <div className="col-span-3 text-left">SUDUT MERAH</div>
                <div className="col-span-3 text-left">SUDUT BIRU / PESERTA</div>
                <div className="col-span-1 text-center">STATUS</div>
              </div>

              {paginatedQueue.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-mono text-xs uppercase">
                  Tidak ada data urutan partai yang cocok dengan kriteria filter.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {paginatedQueue.map((item) => {
                    const isLive = item.status === 'live';
                    const isNext = item.status === 'next';
                    const isDone = item.status === 'done';

                    return (
                      <div
                        key={item.id}
                        className={`grid grid-cols-12 items-center px-4 py-3.5 text-xs transition-colors ${
                          isLive 
                            ? 'bg-cyan-950/30 hover:bg-cyan-950/40 border-l-4 border-cyan-500' 
                            : isNext 
                            ? 'bg-amber-950/20 hover:bg-amber-950/30 border-l-4 border-amber-500' 
                            : 'hover:bg-slate-900/50'
                        }`}
                      >
                        <div className="col-span-2 text-left">
                          <span className={`font-black font-sport text-sm ${isLive ? 'text-cyan-400' : isNext ? 'text-amber-400' : 'text-slate-200'}`}>
                            {item.partai}
                          </span>
                          <span className="block text-[9px] font-mono text-slate-500 uppercase">
                            {item.gelanggang}
                          </span>
                        </div>

                        <div className="col-span-3 text-left pr-2">
                          <span className="font-bold font-sport uppercase text-white truncate block text-xs">
                            {item.kelas}
                          </span>
                          <span className="text-[9.5px] font-mono text-amber-400 uppercase">
                            {item.gender} • {item.babak}
                          </span>
                        </div>

                        <div className="col-span-3 text-left pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            <span className="font-extrabold uppercase font-sport text-slate-100 truncate">
                              {item.atletMerah.nama}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 uppercase truncate block pl-3.5">
                            {item.atletMerah.kontingen}
                          </span>
                          {isDone && item.finalScoreMerah !== undefined && (
                            <span className="text-[9px] font-mono text-red-400 font-bold pl-3.5">
                              Skor: {item.finalScoreMerah}
                            </span>
                          )}
                        </div>

                        <div className="col-span-3 text-left pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            <span className="font-extrabold uppercase font-sport text-slate-100 truncate">
                              {item.atletBiru.nama}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 uppercase truncate block pl-3.5">
                            {item.atletBiru.kontingen}
                          </span>
                          {isDone && item.finalScoreBiru !== undefined && (
                            <span className="text-[9px] font-mono text-blue-400 font-bold pl-3.5">
                              Skor: {item.finalScoreBiru}
                            </span>
                          )}
                        </div>

                        <div className="col-span-1 text-center flex flex-col items-center justify-center gap-1">
                          {isLive ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-mono font-black text-[8.5px] uppercase animate-pulse shadow-sm">
                              LIVE
                            </span>
                          ) : isNext ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono font-black text-[8.5px] uppercase shadow-sm">
                              SIAP
                            </span>
                          ) : isDone ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 font-mono font-bold text-[8.5px] uppercase">
                              SELESAI
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[8.5px] uppercase">
                              ANTRI
                            </span>
                          )}

                          <button
                            onClick={() => handleAnnounceMatch(item)}
                            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-colors"
                            title="Panggil Atlet via Suara"
                          >
                            <Megaphone className="w-3 h-3" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

              {/* Table Footer */}
              <div className="bg-slate-900/80 px-4 py-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono">
                <span className="text-slate-400">
                  Menampilkan {paginatedQueue.length} dari {filteredQueue.length} Partai Turnamen
                </span>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-slate-300 font-bold">
                      Halaman {currentPage} / {totalPages}
                    </span>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

      {/* MODAL DETAIL NOMOR PARTAI TERPILIH */}
      <AnimatePresence>
        {selectedMatchModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-950 border-2 border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black font-mono flex items-center justify-center text-sm shadow-md">
                    {formatDigit(selectedMatchModal.partaiNum)}
                  </div>
                  <div>
                    <h3 className="font-sport font-black text-base text-white uppercase">
                      {selectedMatchModal.partai}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-400 uppercase">
                      {selectedMatchModal.gelanggang} • {selectedMatchModal.kelas}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMatchModal(null)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Athletes Box */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-red-950/40 border border-red-800/60">
                  <span className="text-[9px] font-mono font-bold text-red-400 uppercase block mb-1">SUDUT MERAH</span>
                  <p className="font-sport font-black text-white text-sm uppercase">{selectedMatchModal.atletMerah.nama}</p>
                  <p className="text-[10px] font-mono text-slate-300 uppercase">{selectedMatchModal.atletMerah.kontingen}</p>
                  {selectedMatchModal.finalScoreMerah !== undefined && (
                    <p className="text-xs font-mono font-bold text-red-400 mt-2">Skor Akhir: {selectedMatchModal.finalScoreMerah}</p>
                  )}
                </div>

                <div className="p-3 rounded-2xl bg-blue-950/40 border border-blue-800/60 text-right">
                  <span className="text-[9px] font-mono font-bold text-blue-400 uppercase block mb-1">SUDUT BIRU</span>
                  <p className="font-sport font-black text-white text-sm uppercase">{selectedMatchModal.atletBiru.nama}</p>
                  <p className="text-[10px] font-mono text-slate-300 uppercase">{selectedMatchModal.atletBiru.kontingen}</p>
                  {selectedMatchModal.finalScoreBiru !== undefined && (
                    <p className="text-xs font-mono font-bold text-blue-400 mt-2">Skor Akhir: {selectedMatchModal.finalScoreBiru}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleAnnounceMatch(selectedMatchModal)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Panggil Atlet</span>
                </button>
                <button
                  onClick={() => setSelectedMatchModal(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono text-xs uppercase"
                >
                  Tutup
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. FOOTER BRANDING */}
      <footer className="z-20 w-full bg-slate-950 border-t border-slate-900 py-2.5 px-4 text-[9px] font-mono text-slate-500 uppercase flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>SISTEM MONITOR NOMOR URUTAN PARTAI DIGITAL • V4.0</span>
        </div>
        <span>AUTONOMOUS TOURNAMENT ARENA BROADCAST ENGINE</span>
      </footer>

    </div>
  );
}
