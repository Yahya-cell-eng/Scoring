import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, RefreshCw, Volume2, VolumeX, Maximize2, Minimize2, 
  Tv, Clock, Activity, Zap, CheckCircle, Flame, Users, Hash, Shield, Search, Filter,
  ListOrdered, Play, CheckCircle2, ChevronRight, Swords, Award
} from 'lucide-react';
import { MatchState, TGRState, MatchHistory, GelanggangInfo, BaganCategory, BaganMatch, TGRPeserta } from '../types';
import { playBeep } from '../utils/sound';

interface MonitorUrutanPartaiProps {
  state?: MatchState | null;
  histories?: MatchHistory[];
  tgrState?: TGRState | null;
  dispatch?: (type: string, payload?: any) => void;
  onBack: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  currentArenaId?: string;
  onSelectArena?: (id: string) => void;
  arenasList?: GelanggangInfo[];
  allArenasSummary?: any[];
  allArenasMap?: Record<string, { state: MatchState; tgrState: TGRState }>;
}

export type MonitorDisplayStyle = 'hanya_nomor' | 'lengkap' | 'urutan_partai' | 'kombinasi';
export type MonitorModeFilter = 'auto' | 'tanding' | 'seni' | 'all';

export interface UnifiedQueueMatch {
  id: string;
  arenaId: string;
  arenaNama: string;
  arenaKode: string;
  type: 'tanding' | 'seni';
  partai: string;
  partaiNum: number;
  kategori: string;
  gender?: string;
  usia?: string;
  babakOrPool: string;
  // Tanding
  atletMerah?: { nama: string; kontingen: string };
  atletBiru?: { nama: string; kontingen: string };
  winner?: 'merah' | 'biru' | null;
  skorMerah?: number;
  skorBiru?: number;
  // Seni
  pesertaNama?: string;
  pesertaKontingen?: string;
  finalScore?: number;
  // Status
  status: 'live' | 'selesai' | 'berikutnya' | 'terjadwal';
}

export default function MonitorUrutanPartai({
  state,
  histories = [],
  tgrState,
  dispatch,
  onBack,
  theme = 'dark',
  onToggleTheme,
  currentArenaId = 'arena_1',
  onSelectArena,
  arenasList = [],
  allArenasSummary = [],
  allArenasMap = {}
}: MonitorUrutanPartaiProps) {
  const [displayStyle, setDisplayStyle] = useState<MonitorDisplayStyle>('urutan_partai');
  const [modeFilter, setModeFilter] = useState<MonitorModeFilter>('auto');
  const [selectedArenaFilter, setSelectedArenaFilter] = useState<string>('all');
  const [queueStatusFilter, setQueueStatusFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>('all');
  const [queueSearchText, setQueueSearchText] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastAnnouncedPartais, setLastAnnouncedPartais] = useState<Record<string, string>>({});

  // Local state for polled arenas data
  const [liveArenasList, setLiveArenasList] = useState<GelanggangInfo[]>(arenasList);
  const [liveSummaryList, setLiveSummaryList] = useState<any[]>(allArenasSummary);
  const [liveArenasMap, setLiveArenasMap] = useState<Record<string, { state: MatchState; tgrState: TGRState }>>(allArenasMap);

  // Sync with props
  useEffect(() => {
    if (arenasList && arenasList.length > 0) setLiveArenasList(arenasList);
  }, [arenasList]);

  useEffect(() => {
    if (allArenasSummary && allArenasSummary.length > 0) setLiveSummaryList(allArenasSummary);
  }, [allArenasSummary]);

  useEffect(() => {
    if (allArenasMap && Object.keys(allArenasMap).length > 0) setLiveArenasMap(allArenasMap);
  }, [allArenasMap]);

  // Real-time polling
  const fetchLatestArenas = async () => {
    try {
      const res = await fetch('/api/arenas');
      if (res.ok) {
        const data = await res.json();
        if (data.arenasList) setLiveArenasList(data.arenasList);
        if (data.allArenasSummary) setLiveSummaryList(data.allArenasSummary);
        if (data.arenas) setLiveArenasMap(data.arenas);
      }
    } catch (err) {
      console.warn('Sync poll error:', err);
    }
  };

  useEffect(() => {
    fetchLatestArenas();
    const interval = setInterval(fetchLatestArenas, 800);
    return () => clearInterval(interval);
  }, []);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen listener
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

  // Extract numeric partai number
  const getPartaiNum = (pStr: string): number => {
    if (!pStr) return 9999;
    const num = parseInt(pStr.replace(/\D/g, ''), 10);
    return isNaN(num) ? 9999 : num;
  };

  const formatDigit = (num: number): string => {
    if (num >= 1000) return String(num);
    return String(num).padStart(2, '0');
  };

  // Normalized active arenas
  const activeArenas: GelanggangInfo[] = useMemo(() => {
    if (liveArenasList && liveArenasList.length > 0) {
      return liveArenasList;
    }
    return [
      { id: 'arena_1', nama: 'Gelanggang 1', kode: '1', keterangan: 'Matras 1', modeAktif: 'tanding', status: 'aktif' },
      { id: 'arena_2', nama: 'Gelanggang 2', kode: '2', keterangan: 'Matras 2', modeAktif: 'tanding', status: 'aktif' },
      { id: 'arena_3', nama: 'Gelanggang 3', kode: '3', keterangan: 'Matras 3', modeAktif: 'seni', status: 'aktif' }
    ];
  }, [liveArenasList]);

  // Derive accurate Live & Next match cards for ALL arenas
  const arenasLiveCards = useMemo(() => {
    return activeArenas.map(arenaInfo => {
      const arenaData = liveArenasMap[arenaInfo.id];
      const arenaSummary = liveSummaryList.find(s => s.id === arenaInfo.id);

      const aState: MatchState | undefined = arenaData?.state || (arenaInfo.id === currentArenaId ? state : undefined);
      const aTgrState: TGRState | undefined = arenaData?.tgrState || (arenaInfo.id === currentArenaId ? (tgrState || undefined) : undefined);

      // Intelligent Mode Follow:
      // Respect user global modeFilter first; otherwise strictly follow arenaInfo.modeAktif!
      let isSeniMode = false;
      if (modeFilter === 'seni') {
        isSeniMode = true;
      } else if (modeFilter === 'tanding') {
        isSeniMode = false;
      } else {
        // 'auto' or 'all': follow arenaInfo.modeAktif
        if (arenaInfo.modeAktif === 'seni') {
          isSeniMode = true;
        } else if (arenaInfo.modeAktif === 'tanding') {
          isSeniMode = false;
        } else {
          // Dynamic fallback if modeAktif is ambiguous:
          if (aTgrState?.timerActive) isSeniMode = true;
          else if (aState?.timerActive) isSeniMode = false;
          else isSeniMode = false;
        }
      }

      // 1. TANDING MATCH NUMBER & DETAILS
      let tandingPartaiRaw = aState?.partai || arenaSummary?.tandingPartai || '01';
      if (!tandingPartaiRaw || tandingPartaiRaw.trim() === '') tandingPartaiRaw = '01';

      const tandingPartaiClean = tandingPartaiRaw.replace(/PARTAI\s*/i, '').trim();
      const tandingPartaiDisplay = tandingPartaiRaw.toUpperCase().includes('PARTAI') 
        ? tandingPartaiRaw.toUpperCase() 
        : `PARTAI ${tandingPartaiRaw.padStart(2, '0')}`;

      const currentBabakText = aState?.matchStatus === 'selesai' || arenaSummary?.tandingMatchStatus === 'selesai'
        ? 'SELESAI' 
        : aState?.matchStatus === 'babak_habis' || arenaSummary?.tandingMatchStatus === 'babak_habis'
          ? `BABAK ${aState?.currentBabak || arenaSummary?.tandingBabak || 1} (JEDA)` 
          : `BABAK ${aState?.currentBabak || arenaSummary?.tandingBabak || 1}`;

      // Calculate Next Tanding Partai
      let nextPartaiText = '-';
      let nextCategoryText = '';
      let nextMerahNama = '';
      let nextBiruNama = '';

      if (aState?.baganCategories && aState.baganCategories.length > 0) {
        const allMatches: { pNum: number; partai: string; catName: string; merah: string; biru: string }[] = [];
        aState.baganCategories.forEach(cat => {
          cat.matches.forEach(m => {
            const pNum = getPartaiNum(m.partai);
            if (!m.winner) {
              allMatches.push({
                pNum,
                partai: m.partai,
                catName: cat.name,
                merah: m.atletMerah?.nama || '',
                biru: m.atletBiru?.nama || ''
              });
            }
          });
        });

        const currentPNum = getPartaiNum(tandingPartaiRaw);
        const upcoming = allMatches
          .filter(m => m.pNum > currentPNum)
          .sort((a, b) => a.pNum - b.pNum)[0];

        if (upcoming) {
          nextPartaiText = upcoming.partai.toUpperCase().includes('PARTAI') ? upcoming.partai.toUpperCase() : `PARTAI ${upcoming.partai}`;
          nextCategoryText = upcoming.catName.toUpperCase();
          nextMerahNama = upcoming.merah;
          nextBiruNama = upcoming.biru;
        } else {
          const nextNum = currentPNum + 1;
          nextPartaiText = `PARTAI ${formatDigit(nextNum)}`;
          nextCategoryText = `KELAS LANJUTAN`;
        }
      } else {
        const currentPNum = getPartaiNum(tandingPartaiRaw);
        const nextNum = currentPNum + 1;
        nextPartaiText = `PARTAI ${formatDigit(nextNum)}`;
        nextCategoryText = `KELAS LANJUTAN`;
      }

      // 2. SENI TGR MATCH NUMBER & DETAILS
      const activePeserta = aTgrState?.pesertaList.find(p => p.id === aTgrState.activePesertaId);
      let seniPartaiRaw = activePeserta?.partai || aTgrState?.partai || arenaSummary?.seniPartai || 'PARTAI 1';
      const seniPartaiClean = seniPartaiRaw.replace(/PARTAI\s*/i, '').trim();
      const seniPartaiDisplay = seniPartaiRaw.toUpperCase().includes('PARTAI') || seniPartaiRaw.toUpperCase().includes('SENI')
        ? seniPartaiRaw.toUpperCase()
        : `PARTAI ${seniPartaiRaw}`;

      const nextPeserta = aTgrState?.pesertaList
        .filter(p => p.status !== 'Sudah Menilai' && p.id !== aTgrState?.activePesertaId)
        .sort((a, b) => a.noUrut - b.noUrut)[0];

      const isTandingLive = (aState?.matchStatus === 'running') || 
                            (aState?.timerActive === true) || 
                            (arenaSummary?.tandingTimerActive === true) ||
                            (arenaSummary?.tandingMatchStatus === 'running') ||
                            ((aState?.scores?.merah?.total || 0) > 0 || (aState?.scores?.biru?.total || 0) > 0);

      const isSeniLive = (aTgrState?.timerActive === true) || 
                         (arenaSummary?.seniTimerActive === true) || 
                         (activePeserta !== undefined && activePeserta.status === 'Sedang Tampil');

      const isArenaLive = isSeniMode ? isSeniLive : isTandingLive;

      return {
        arenaInfo,
        isSeniMode,
        isArenaLive,
        // Tanding Display Values
        tandingPartaiDisplay,
        tandingPartaiNumber: tandingPartaiClean || '01',
        kelas: aState?.kelas || arenaSummary?.tandingKelas || 'A',
        gender: aState?.gender || 'Putra',
        babakText: currentBabakText,
        timerSeconds: aState?.timerSeconds ?? arenaSummary?.tandingTimerSeconds ?? 120,
        timerActive: aState?.timerActive ?? arenaSummary?.tandingTimerActive ?? false,
        atletMerah: aState?.atletMerah || { nama: arenaSummary?.tandingMerahNama || 'Sudut Merah', kontingen: arenaSummary?.tandingMerahKontingen || '-' },
        atletBiru: aState?.atletBiru || { nama: arenaSummary?.tandingBiruNama || 'Sudut Biru', kontingen: arenaSummary?.tandingBiruKontingen || '-' },
        skorMerah: aState?.scores?.merah?.total ?? arenaSummary?.tandingMerahSkor ?? 0,
        skorBiru: aState?.scores?.biru?.total ?? arenaSummary?.tandingBiruSkor ?? 0,
        nextPartaiText,
        nextCategoryText,
        nextMerahNama,
        nextBiruNama,
        // Seni Display Values
        seniPartaiDisplay,
        seniPartaiNumber: seniPartaiClean || '01',
        seniActivePesertaNama: activePeserta?.nama || arenaSummary?.seniActivePesertaNama || 'Peserta Seni',
        seniActivePesertaKontingen: activePeserta?.kontingen || arenaSummary?.seniActivePesertaKontingen || '-',
        seniKategori: activePeserta?.kategori || arenaSummary?.seniKategori || 'Tunggal',
        seniSkor: activePeserta?.finalScore ?? arenaSummary?.seniActivePesertaSkor,
        seniNextPesertaNama: nextPeserta?.nama,
        seniNextPartaiText: nextPeserta?.partai || (nextPeserta ? `PARTAI ${nextPeserta.noUrut}` : 'SENI LANJUTAN')
      };
    });
  }, [activeArenas, liveArenasMap, liveSummaryList, currentArenaId, state, tgrState, modeFilter]);

  // Compute Full Match Queue (Urutan Partai) for BOTH Tanding and Seni across all arenas
  const fullMatchQueue: UnifiedQueueMatch[] = useMemo(() => {
    const queue: UnifiedQueueMatch[] = [];

    activeArenas.forEach(arenaInfo => {
      const arenaData = liveArenasMap[arenaInfo.id];
      const aState = arenaData?.state || (arenaInfo.id === currentArenaId ? state : undefined);
      const aTgrState = arenaData?.tgrState || (arenaInfo.id === currentArenaId ? tgrState : undefined);

      // Determine active match identifiers
      const activeTandingPartai = aState?.partai || '';
      const activeTgrPesertaId = aTgrState?.activePesertaId;

      // 1. TANDING MATCHES
      if (aState?.baganCategories && aState.baganCategories.length > 0) {
        aState.baganCategories.forEach(cat => {
          cat.matches.forEach(m => {
            const pNum = getPartaiNum(m.partai);
            const isCurrentActive = arenaInfo.modeAktif === 'tanding' && (
              m.partai.toLowerCase() === activeTandingPartai.toLowerCase() ||
              (aState.activeBaganCategoryId === cat.id && aState.activeBaganMatchId === m.id)
            );
            const isCompleted = !!m.winner;

            let matchStatus: 'live' | 'selesai' | 'berikutnya' | 'terjadwal' = 'terjadwal';
            if (isCurrentActive) matchStatus = 'live';
            else if (isCompleted) matchStatus = 'selesai';

            queue.push({
              id: `tanding_${arenaInfo.id}_${cat.id}_${m.id}`,
              arenaId: arenaInfo.id,
              arenaNama: arenaInfo.nama,
              arenaKode: arenaInfo.kode || '1',
              type: 'tanding',
              partai: m.partai,
              partaiNum: pNum,
              kategori: `${cat.kelas} ${cat.gender}`,
              gender: cat.gender,
              usia: cat.usia,
              babakOrPool: m.round.toUpperCase(),
              atletMerah: m.atletMerah,
              atletBiru: m.atletBiru,
              winner: m.winner,
              skorMerah: isCurrentActive ? (aState.scores?.merah?.total ?? 0) : undefined,
              skorBiru: isCurrentActive ? (aState.scores?.biru?.total ?? 0) : undefined,
              status: matchStatus
            });
          });
        });
      }

      // 2. SENI MATCHES
      if (aTgrState?.pesertaList && aTgrState.pesertaList.length > 0) {
        aTgrState.pesertaList.forEach(p => {
          const pNum = p.partaiNumber || p.noUrut || getPartaiNum(p.partai || '');
          const isCurrentActive = arenaInfo.modeAktif === 'seni' && activeTgrPesertaId === p.id;
          const isCompleted = p.status === 'Sudah Menilai' || p.isLocked;

          let matchStatus: 'live' | 'selesai' | 'berikutnya' | 'terjadwal' = 'terjadwal';
          if (isCurrentActive) matchStatus = 'live';
          else if (isCompleted) matchStatus = 'selesai';

          queue.push({
            id: `seni_${arenaInfo.id}_${p.id}`,
            arenaId: arenaInfo.id,
            arenaNama: arenaInfo.nama,
            arenaKode: arenaInfo.kode || '1',
            type: 'seni',
            partai: p.partai || `PARTAI ${pNum}`,
            partaiNum: pNum,
            kategori: `${p.kategori} ${p.gender || ''}`,
            gender: p.gender,
            usia: p.usia,
            babakOrPool: p.pool || 'Pool A',
            pesertaNama: p.nama,
            pesertaKontingen: p.kontingen,
            finalScore: (p as any).finalScore ?? (p as any).scores?.finalScore,
            status: matchStatus
          });
        });
      }
    });

    // Sort by Arena first, then by partai number
    queue.sort((a, b) => {
      if (a.arenaId !== b.arenaId) {
        return a.arenaId.localeCompare(b.arenaId);
      }
      return a.partaiNum - b.partaiNum;
    });

    // Mark 'berikutnya' (on-deck) for the first scheduled match in each arena
    const arenaFirstScheduled: Record<string, boolean> = {};
    queue.forEach(item => {
      if (item.status === 'terjadwal' && !arenaFirstScheduled[item.arenaId]) {
        item.status = 'berikutnya';
        arenaFirstScheduled[item.arenaId] = true;
      }
    });

    return queue;
  }, [activeArenas, liveArenasMap, currentArenaId, state, tgrState]);

  // Filtered Queue Matches
  const filteredQueueMatches = useMemo(() => {
    return fullMatchQueue.filter(m => {
      // Arena filter
      if (selectedArenaFilter !== 'all' && m.arenaId !== selectedArenaFilter) {
        return false;
      }

      // Mode filter
      if (modeFilter === 'tanding' && m.type !== 'tanding') return false;
      if (modeFilter === 'seni' && m.type !== 'seni') return false;

      // Status filter
      if (queueStatusFilter === 'live' && m.status !== 'live') return false;
      if (queueStatusFilter === 'upcoming' && m.status !== 'berikutnya' && m.status !== 'terjadwal') return false;
      if (queueStatusFilter === 'completed' && m.status !== 'selesai') return false;

      // Search text
      if (queueSearchText.trim()) {
        const query = queueSearchText.toLowerCase();
        const merahMatch = m.atletMerah?.nama?.toLowerCase().includes(query) || m.atletMerah?.kontingen?.toLowerCase().includes(query);
        const biruMatch = m.atletBiru?.nama?.toLowerCase().includes(query) || m.atletBiru?.kontingen?.toLowerCase().includes(query);
        const seniMatch = m.pesertaNama?.toLowerCase().includes(query) || m.pesertaKontingen?.toLowerCase().includes(query);
        const partaiMatch = m.partai.toLowerCase().includes(query);
        const catMatch = m.kategori.toLowerCase().includes(query);
        if (!merahMatch && !biruMatch && !seniMatch && !partaiMatch && !catMatch) {
          return false;
        }
      }

      return true;
    });
  }, [fullMatchQueue, selectedArenaFilter, modeFilter, queueStatusFilter, queueSearchText]);

  // Filtered Arenas for Scoreboard Views
  const displayedArenas = useMemo(() => {
    if (selectedArenaFilter === 'all') return arenasLiveCards;
    return arenasLiveCards.filter(c => c.arenaInfo.id === selectedArenaFilter);
  }, [arenasLiveCards, selectedArenaFilter]);

  // Sound chime when match number advances
  useEffect(() => {
    if (!soundEnabled) return;
    arenasLiveCards.forEach(card => {
      const arenaKey = card.arenaInfo.id;
      const currentPartai = card.isSeniMode ? card.seniPartaiDisplay : card.tandingPartaiDisplay;
      if (lastAnnouncedPartais[arenaKey] && lastAnnouncedPartais[arenaKey] !== currentPartai) {
        playBeep('valid');
      }
    });

    const newMap: Record<string, string> = {};
    arenasLiveCards.forEach(c => {
      newMap[c.arenaInfo.id] = c.isSeniMode ? c.seniPartaiDisplay : c.tandingPartaiDisplay;
    });
    setLastAnnouncedPartais(newMap);
  }, [arenasLiveCards, soundEnabled]);

  return (
    <div className={`min-h-screen w-full flex flex-col transition-colors duration-300 select-none overflow-x-hidden ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-900 text-white'
    }`}>
      {/* 1. TOP HEADER CONTROLS */}
      <header className="w-full px-4 py-3 bg-slate-950/95 border-b border-slate-800 backdrop-blur-md sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        {/* Left: Branding & Back Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playBeep('click');
              onBack();
            }}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/90 text-slate-200 hover:bg-slate-700 flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-md"
            title="Kembali ke Menu"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">KEMBALI</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 flex items-center justify-center text-slate-950 shadow-lg shadow-orange-500/30 font-black">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-black uppercase tracking-wider leading-none text-white">
                  MONITOR URUTAN PARTAI
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 border border-emerald-500/50 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  LIVE REAL-TIME
                </span>
              </div>
              <p className="text-[11px] font-mono text-amber-400/90 uppercase tracking-widest mt-0.5 truncate">
                {state?.namaEvent || 'KEJUARAAN PENCAK SILAT DIGITAL SCORING'}
              </p>
            </div>
          </div>
        </div>

        {/* Center: View Style Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Display Style Selector */}
          <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => {
                playBeep('click');
                setDisplayStyle('urutan_partai');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                displayStyle === 'urutan_partai'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Daftar Antrean & Urutan Semua Partai Tanding & Seni"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>DAFTAR URUTAN PARTAI</span>
            </button>

            <button
              onClick={() => {
                playBeep('click');
                setDisplayStyle('kombinasi');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                displayStyle === 'kombinasi'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Layar Split: Nomor Besar + Antrean Partai Selanjutnya"
            >
              <Users className="w-3.5 h-3.5" />
              <span>LAYAR KOMBINASI</span>
            </button>

            <button
              onClick={() => {
                playBeep('click');
                setDisplayStyle('hanya_nomor');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                displayStyle === 'hanya_nomor'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Fokus Layar Besar: Hanya Nomor Partai Sedang Tanding"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>HANYA NOMOR</span>
            </button>

            <button
              onClick={() => {
                playBeep('click');
                setDisplayStyle('lengkap');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                displayStyle === 'lengkap'
                  ? 'bg-indigo-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Papan Skor & Detail Atlet Lengkap"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>RINCIAN SKOR</span>
            </button>
          </div>

          {/* Mode Filter Toggle (Auto Follow vs Forced) */}
          <div className="bg-slate-900/90 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => {
                playBeep('click');
                setModeFilter('auto');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer flex items-center gap-1 ${
                modeFilter === 'auto'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Otomatis Mengikuti Mode Panel Gelanggang yang Aktif (Tanding / Seni)"
            >
              <RefreshCw className="w-3 h-3" />
              <span>OTOMATIS (IKUTI PANEL)</span>
            </button>

            <button
              onClick={() => {
                playBeep('click');
                setModeFilter('tanding');
              }}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                modeFilter === 'tanding'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              TANDING
            </button>

            <button
              onClick={() => {
                playBeep('click');
                setModeFilter('seni');
              }}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                modeFilter === 'seni'
                  ? 'bg-purple-600 text-white font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              SENI
            </button>
          </div>
        </div>

        {/* Right: Digital Clock, Refresh, Sound & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Real-time Clock */}
          <div className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-slate-900 font-mono text-center flex items-center gap-2 text-amber-400 shadow-md">
            <Clock className="w-3.5 h-3.5 opacity-80" />
            <span className="text-xs md:text-sm font-black tracking-widest">
              {currentTime.toLocaleTimeString('id-ID', { hour12: false })}
            </span>
          </div>

          {/* Manual Refresh button */}
          <button
            onClick={() => {
              playBeep('click');
              setIsSyncing(true);
              fetchLatestArenas().finally(() => setIsSyncing(false));
            }}
            className="p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
            title="Refresh Sinkronisasi Data"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              playBeep('click');
              setSoundEnabled(!soundEnabled);
            }}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-md'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
            title={soundEnabled ? 'Audio Suara Pergantian Partai Aktif' : 'Audio Suara Nonaktif'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-md ${
              isFullscreen
                ? 'bg-blue-600 border-blue-400 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
            title="Layar Penuh (F11 / Fullscreen)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Sub-header Filter Bar: Filter Gelanggang & Search */}
      <div className="w-full px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Gelanggang Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono text-slate-400 uppercase font-bold mr-1">Gelanggang:</span>
          <button
            onClick={() => {
              playBeep('click');
              setSelectedArenaFilter('all');
            }}
            className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
              selectedArenaFilter === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Semua ({activeArenas.length})
          </button>

          {activeArenas.map(arena => {
            const isMatchActive = arena.modeAktif === 'seni' ? 'Seni' : 'Tanding';
            return (
              <button
                key={arena.id}
                onClick={() => {
                  playBeep('click');
                  setSelectedArenaFilter(arena.id);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedArenaFilter === arena.id
                    ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{arena.nama}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                  arena.modeAktif === 'seni' ? 'bg-purple-950 text-purple-300' : 'bg-blue-950 text-blue-300'
                }`}>
                  {isMatchActive}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Status Filter (visible on queue & kombinasi views) */}
        {(displayStyle === 'urutan_partai' || displayStyle === 'kombinasi') && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status pills */}
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setQueueStatusFilter('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                  queueStatusFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setQueueStatusFilter('live')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                  queueStatusFilter === 'live' ? 'bg-red-600 text-white' : 'text-slate-400'
                }`}
              >
                Sedang Tampil / Tanding
              </button>
              <button
                onClick={() => setQueueStatusFilter('upcoming')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                  queueStatusFilter === 'upcoming' ? 'bg-amber-600 text-white' : 'text-slate-400'
                }`}
              >
                Berikutnya (On-Deck)
              </button>
              <button
                onClick={() => setQueueStatusFilter('completed')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                  queueStatusFilter === 'completed' ? 'bg-emerald-700 text-white' : 'text-slate-400'
                }`}
              >
                Selesai
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={queueSearchText}
                onChange={e => setQueueSearchText(e.target.value)}
                placeholder="Cari atlet, kontingen, kelas..."
                className="pl-8 pr-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 p-3 md:p-6 flex flex-col justify-between">
        {/* VIEW A: DAFTAR URUTAN PARTAI (MATCH QUEUE LIST) FOR TANDING & SENI */}
        {displayStyle === 'urutan_partai' && (
          <div className="space-y-4 w-full max-w-7xl mx-auto flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-500 flex items-center justify-center text-emerald-400">
                  <ListOrdered className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-white">
                    DAFTAR URUTAN PARTAI BERTANDING
                  </h2>
                  <p className="text-xs font-mono text-slate-400">
                    Menampilkan antrean lengkap partai Tanding dan Seni di seluruh gelanggang aktif secara real-time.
                  </p>
                </div>
              </div>

              <div className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>TOTAL: {filteredQueueMatches.length} PARTAI TERJADWAL</span>
              </div>
            </div>

            {/* Match Queue Table / Cards */}
            {filteredQueueMatches.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400 space-y-2">
                <ListOrdered className="w-10 h-10 mx-auto text-slate-600" />
                <h4 className="text-base font-bold text-slate-300">Tidak ada partai yang sesuai kriteria</h4>
                <p className="text-xs font-mono text-slate-500">
                  Pastikan jadwal tanding atau seni telah dibuat atau diunggah dari Excel ke gelanggang aktif.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredQueueMatches.map((m, idx) => {
                  const isLive = m.status === 'live';
                  const isUpcoming = m.status === 'berikutnya';
                  const isCompleted = m.status === 'selesai';
                  const isTanding = m.type === 'tanding';

                  return (
                    <div
                      key={m.id || idx}
                      className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isLive
                          ? 'border-red-500 bg-gradient-to-r from-red-950/40 via-slate-900 to-black shadow-lg shadow-red-500/10 ring-2 ring-red-500/30'
                          : isUpcoming
                          ? 'border-amber-500/60 bg-gradient-to-r from-amber-950/30 to-slate-900 hover:border-amber-400'
                          : isCompleted
                          ? 'border-slate-800 bg-[#06081e]/60 opacity-85 hover:opacity-100'
                          : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                      }`}
                    >
                      {/* Left: Gelanggang & Partai Number */}
                      <div className="flex items-center gap-3.5 min-w-[220px]">
                        <div className={`px-3 py-2 rounded-xl font-mono font-black text-center flex flex-col items-center justify-center min-w-[65px] ${
                          isLive
                            ? 'bg-red-600 text-white animate-pulse'
                            : isUpcoming
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : isCompleted
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-800/80 text-amber-300 border border-slate-700'
                        }`}>
                          <span className="text-[9px] uppercase tracking-wider">{m.arenaNama}</span>
                          <span className="text-sm font-black">
                            {m.partai.toUpperCase().includes('PARTAI') ? m.partai.toUpperCase() : `PARTAI ${m.partai}`}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              isTanding
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : 'bg-purple-950 text-purple-300 border border-purple-800'
                            }`}>
                              {isTanding ? 'TANDING' : 'SENI'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 uppercase">
                              {m.babakOrPool}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white mt-1">
                            {m.kategori} {m.usia ? `• ${m.usia}` : ''}
                          </h4>
                        </div>
                      </div>

                      {/* Middle: Participants / Fighters */}
                      <div className="flex-1 w-full max-w-2xl">
                        {isTanding ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Sudut Merah */}
                            <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                              m.winner === 'merah'
                                ? 'bg-red-950/80 border-emerald-500 ring-2 ring-emerald-500/40'
                                : 'bg-red-950/40 border-red-800/60'
                            }`}>
                              <div className="truncate">
                                <span className="text-[9px] font-black uppercase text-red-300 block">SUDUT MERAH</span>
                                <h5 className="text-xs font-bold text-white truncate">
                                  {m.atletMerah?.nama || '-'}
                                </h5>
                                <p className="text-[10px] font-mono text-red-200 truncate">
                                  {m.atletMerah?.kontingen || '-'}
                                </p>
                              </div>
                              {m.skorMerah !== undefined && (
                                <span className="text-sm font-black font-mono px-2 py-1 rounded bg-black/40 text-red-300">
                                  {m.skorMerah}
                                </span>
                              )}
                              {m.winner === 'merah' && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[9px] font-black uppercase">
                                  MENANG
                                </span>
                              )}
                            </div>

                            {/* Sudut Biru */}
                            <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                              m.winner === 'biru'
                                ? 'bg-blue-950/80 border-emerald-500 ring-2 ring-emerald-500/40'
                                : 'bg-blue-950/40 border-blue-800/60'
                            }`}>
                              <div className="truncate">
                                <span className="text-[9px] font-black uppercase text-blue-300 block">SUDUT BIRU</span>
                                <h5 className="text-xs font-bold text-white truncate">
                                  {m.atletBiru?.nama || '-'}
                                </h5>
                                <p className="text-[10px] font-mono text-blue-200 truncate">
                                  {m.atletBiru?.kontingen || '-'}
                                </p>
                              </div>
                              {m.skorBiru !== undefined && (
                                <span className="text-sm font-black font-mono px-2 py-1 rounded bg-black/40 text-blue-300">
                                  {m.skorBiru}
                                </span>
                              )}
                              {m.winner === 'biru' && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[9px] font-black uppercase">
                                  MENANG
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Seni Participant */
                          <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-center justify-between gap-3">
                            <div>
                              <span className="text-[9px] font-black uppercase text-purple-300 block">PESERTA SENI</span>
                              <h5 className="text-xs font-bold text-white">
                                {m.pesertaNama || '-'}
                              </h5>
                              <p className="text-[10px] font-mono text-purple-200">
                                Kontingen: <strong className="text-slate-200">{m.pesertaKontingen || '-'}</strong>
                              </p>
                            </div>
                            {m.finalScore !== undefined && (
                              <div className="text-right">
                                <span className="text-[9px] font-mono text-emerald-400 block font-bold">NILAI AKHIR</span>
                                <span className="text-sm font-black font-mono text-emerald-300">
                                  {m.finalScore.toFixed(3)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Status Pill */}
                      <div className="self-end md:self-center">
                        {isLive ? (
                          <span className="px-3.5 py-1.5 rounded-xl bg-red-600 text-white text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-lg shadow-red-600/30">
                            <Flame className="w-3.5 h-3.5 animate-bounce" />
                            <span>SEDANG BERTANDING</span>
                          </span>
                        ) : isUpcoming ? (
                          <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-mono font-black uppercase flex items-center gap-1.5 shadow-lg shadow-amber-500/20">
                            <Zap className="w-3.5 h-3.5 animate-pulse" />
                            <span>PARTAI BERIKUTNYA</span>
                          </span>
                        ) : isCompleted ? (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>SELESAI</span>
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-mono">
                            Terjadwal
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW B & D: SCOREBOARD / BIG NUMBER OR SPLIT KOMBINASI */}
        {(displayStyle === 'hanya_nomor' || displayStyle === 'lengkap' || displayStyle === 'kombinasi') && (
          <div className="flex-1 flex flex-col justify-between space-y-6">
            {/* Sub-header Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse inline-block" />
                <span className="text-xs md:text-sm font-black uppercase tracking-wider text-slate-200">
                  NOMOR PARTAI YANG SEDANG BERTANDING DI SEMUA GELANGGANG
                </span>
              </div>

              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
                <span>STATUS SINKRONISASI:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                  100% TERHUBUNG OTOMATIS
                </span>
              </div>
            </div>

            {/* Dynamic Multi-Arena Grid */}
            <div className={`grid gap-4 md:gap-6 items-stretch ${
              displayedArenas.length === 1 
                ? 'grid-cols-1 max-w-5xl mx-auto w-full' 
                : displayedArenas.length === 2 
                  ? 'grid-cols-1 lg:grid-cols-2' 
                  : displayedArenas.length === 3 
                    ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' 
                    : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
            }`}>
              {displayedArenas.map((card, idx) => {
                const { arenaInfo, isSeniMode, isArenaLive } = card;

                return (
                  <motion.div
                    key={arenaInfo.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: idx * 0.05 }}
                    className={`relative rounded-3xl border-2 flex flex-col justify-between overflow-hidden shadow-2xl transition-all ${
                      isArenaLive
                        ? 'bg-gradient-to-b from-slate-900 via-slate-950 to-black border-amber-500 ring-4 ring-amber-500/20 shadow-amber-500/10'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Gelanggang Header Strip */}
                    <div className={`px-5 py-3 flex items-center justify-between border-b ${
                      isArenaLive
                        ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-slate-950'
                        : 'bg-slate-800/90 text-slate-200 border-slate-700'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-xl bg-black/40 font-mono font-black text-sm md:text-base text-white">
                          {arenaInfo.kode || `${idx + 1}`}
                        </span>
                        <div>
                          <h3 className="text-base md:text-lg font-black uppercase tracking-wider leading-none text-white drop-shadow-sm">
                            {arenaInfo.nama}
                          </h3>
                          <p className="text-[10px] md:text-[11px] font-mono text-amber-200 uppercase leading-none mt-1 truncate">
                            {arenaInfo.keterangan || `Matras ${idx + 1}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                          isSeniMode
                            ? 'bg-purple-950/80 text-purple-200 border border-purple-400/40'
                            : 'bg-blue-950/80 text-blue-200 border border-blue-400/40'
                        }`}>
                          {isSeniMode ? 'SENI TGR' : 'TANDING'}
                        </span>

                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          isArenaLive
                            ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/40'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {isArenaLive ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-white animate-ping inline-block" />
                              LIVE
                            </>
                          ) : (
                            'STANDBY'
                          )}
                        </span>
                      </div>
                    </div>

                    {/* GIGANTIC MATCH NUMBER (NOMOR PARTAI UTAMA) */}
                    <div className="p-6 md:p-8 flex-1 flex flex-col items-center justify-center text-center my-auto">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-black text-xs md:text-sm uppercase tracking-widest mb-3">
                        <Activity className="w-3.5 h-3.5 animate-pulse text-red-400" />
                        <span>SEDANG BERTANDING</span>
                      </div>

                      {/* Gigantic Match Number Label */}
                      <div className="relative w-full my-2">
                        <div className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black font-mono tracking-tighter text-amber-400 drop-shadow-[0_6px_24px_rgba(245,158,11,0.35)] leading-none">
                          {isSeniMode ? card.seniPartaiDisplay : card.tandingPartaiDisplay}
                        </div>
                      </div>

                      {/* Babak / Kategori Badge */}
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                        <span className="px-4 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-sm md:text-base uppercase tracking-wider font-mono">
                          {isSeniMode ? `SENI ${card.seniKategori.toUpperCase()}` : card.babakText}
                        </span>

                        <span className="px-4 py-1.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-slate-200 font-black text-sm md:text-base uppercase tracking-wider">
                          {isSeniMode ? 'KATEGORI TGR' : `KELAS ${card.kelas} (${card.gender.toUpperCase()})`}
                        </span>
                      </div>
                    </div>

                    {/* DETAILED VIEW (IF STYLE IS 'lengkap' OR 'kombinasi') */}
                    {(displayStyle === 'lengkap' || displayStyle === 'kombinasi') && (
                      <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800">
                        {!isSeniMode ? (
                          <div className="grid grid-cols-2 gap-2">
                            {/* Sudut Merah */}
                            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-2.5 rounded-2xl border border-red-500/40 flex flex-col justify-between shadow-md">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-red-200">SUDUT MERAH</span>
                                <span className="text-xs font-mono font-black bg-black/40 px-1.5 py-0.5 rounded">
                                  {card.skorMerah}
                                </span>
                              </div>
                              <h4 className="text-xs md:text-sm font-black truncate uppercase mt-1">
                                {card.atletMerah.nama}
                              </h4>
                              <p className="text-[10px] text-red-100 truncate opacity-90 uppercase font-mono">
                                {card.atletMerah.kontingen}
                              </p>
                            </div>

                            {/* Sudut Biru */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2.5 rounded-2xl border border-blue-500/40 flex flex-col justify-between shadow-md">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase text-blue-200">SUDUT BIRU</span>
                                <span className="text-xs font-mono font-black bg-black/40 px-1.5 py-0.5 rounded">
                                  {card.skorBiru}
                                </span>
                              </div>
                              <h4 className="text-xs md:text-sm font-black truncate uppercase mt-1">
                                {card.atletBiru.nama}
                              </h4>
                              <p className="text-[10px] text-blue-100 truncate opacity-90 uppercase font-mono">
                                {card.atletBiru.kontingen}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-purple-800 to-indigo-800 text-white p-2.5 rounded-2xl border border-purple-500/40 flex items-center justify-between shadow-md">
                            <div className="truncate">
                              <span className="text-[9px] font-black uppercase text-purple-200">PESERTA SENI AKTIF</span>
                              <h4 className="text-xs md:text-sm font-black truncate uppercase mt-0.5">
                                {card.seniActivePesertaNama}
                              </h4>
                              <p className="text-[10px] text-purple-200 truncate font-mono">
                                {card.seniActivePesertaKontingen}
                              </p>
                            </div>
                            {card.seniSkor !== undefined && (
                              <div className="text-right ml-2 flex-shrink-0">
                                <span className="text-[9px] font-black text-purple-200 uppercase block">SKOR</span>
                                <span className="text-sm font-mono font-black text-amber-300">
                                  {card.seniSkor.toFixed(3)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* BOTTOM ON-DECK STRIP: PARTAI SELANJUTNYA */}
                    <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 animate-pulse" />
                        <span className="text-[10px] md:text-xs font-black uppercase text-amber-400">SELANJUTNYA:</span>
                        <span className="text-xs md:text-sm font-black uppercase font-mono truncate text-white">
                          {!isSeniMode ? card.nextPartaiText : card.seniNextPartaiText}
                        </span>
                      </div>

                      <span className="text-[10px] md:text-xs font-mono text-slate-400 uppercase hidden sm:inline truncate">
                        {!isSeniMode 
                          ? (card.nextMerahNama ? `${card.nextMerahNama} vs ${card.nextBiruNama}` : card.nextCategoryText) 
                          : (card.seniNextPesertaNama || '')}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* SPLIT COMBINATION EXTRA: UPCOMING MATCH QUEUE ON BOTTOM */}
            {displayStyle === 'kombinasi' && (
              <div className="mt-6 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs md:text-sm font-mono font-black uppercase text-amber-400 flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-amber-400" />
                    <span>Jadwal Antrean Partai Berikutnya (On-Deck Match Queue)</span>
                  </h4>
                  <span className="text-xs font-mono text-slate-400">
                    Menampilkan 6 partai selanjutnya di semua gelanggang
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {fullMatchQueue
                    .filter(m => m.status === 'berikutnya' || m.status === 'terjadwal')
                    .slice(0, 6)
                    .map((item, qIdx) => (
                      <div
                        key={item.id || qIdx}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-[65px] text-center">
                          <span className="text-[9px] font-mono text-slate-400 uppercase block">{item.arenaNama}</span>
                          <span className="font-mono font-black text-amber-400">{item.partai}</span>
                        </div>
                        <div className="flex-1 truncate">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase ${
                              item.type === 'tanding' ? 'bg-blue-950 text-blue-300' : 'bg-purple-950 text-purple-300'
                            }`}>
                              {item.type}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">{item.kategori}</span>
                          </div>
                          <p className="font-bold text-white truncate mt-0.5">
                            {item.type === 'tanding'
                              ? `${item.atletMerah?.nama || '-'} vs ${item.atletBiru?.nama || '-'}`
                              : (item.pesertaNama || '-')}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-bold shrink-0">
                          {item.status === 'berikutnya' ? 'SIAP-SIAP' : 'ANTRE'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. RUNNING SUMMARY FOOTER */}
      <footer className="w-full px-4 py-2.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-slate-400">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] uppercase flex-shrink-0">
            INFO LIVE
          </span>
          <div className="truncate text-xs font-semibold text-slate-300">
            {arenasLiveCards.map((c, i) => (
              <span key={c.arenaInfo.id} className="mr-5">
                <strong className="text-amber-400 font-black">{c.arenaInfo.nama}:</strong>{' '}
                <span className="text-white font-bold">{c.isSeniMode ? c.seniPartaiDisplay : c.tandingPartaiDisplay}</span>{' '}
                <span className="opacity-70">({c.isSeniMode ? `Seni ${c.seniKategori}` : c.babakText})</span>
                {i < arenasLiveCards.length - 1 && <span className="ml-5 opacity-40 text-slate-500">•</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span>TOTAL: <strong className="text-white font-bold">{activeArenas.length} GELANGGANG</strong></span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            TERHUBUNG REAL-TIME
          </span>
        </div>
      </footer>
    </div>
  );
}
