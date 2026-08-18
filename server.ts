/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { MatchState, MatchHistory, JuriHit, ScoreBreakdown, DewanPenaltyCorner, BaganCategory, BaganMatch, TGRState, TGRPeserta } from './src/types';

const app = express();
const PORT = 3000;

// Enable JSON parse parsing
app.use(express.json({ limit: '10mb' }));

// Historical matches database in-memory
let matchHistories: MatchHistory[] = [
  {
    id: "hist_01",
    namaEvent: "Kejuaraan Pencak Silat Nasional",
    partai: "Partai 01",
    kelas: "Kelas A",
    gender: "Putra",
    atletMerah: { nama: "Fajar Ramadhan", kontingen: "Banten" },
    atletBiru: { nama: "Galang Perkasa", kontingen: "Sumatra Barat" },
    winner: "merah",
    skorAkhirMerah: 28,
    skorAkhirBiru: 19,
    tanggal: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: "hist_02",
    namaEvent: "Kejuaraan Pencak Silat Nasional",
    partai: "Partai 02",
    kelas: "Kelas B",
    gender: "Putra",
    atletMerah: { nama: "Budi Santoso", kontingen: "Jawa Timur" },
    atletBiru: { nama: "Made Wirawan", kontingen: "Bali" },
    winner: "biru",
    skorAkhirMerah: 15,
    skorAkhirBiru: 22,
    tanggal: new Date(Date.now() - 3600000).toISOString()
  }
];

// Default tournament bracket database
const defaultBaganData: BaganCategory[] = [
  {
    id: "cat_1",
    name: "Kelas A Putra (45 - 50 kg)",
    gender: "Putra",
    size: 4,
    matches: [
      {
        id: 1,
        round: "semi",
        partai: "Partai 01",
        atletMerah: { nama: "Fajar Ramadhan", kontingen: "Banten" },
        atletBiru: { nama: "Galang Perkasa", kontingen: "Sumatra Barat" },
        winner: null
      },
      {
        id: 2,
        round: "semi",
        partai: "Partai 02",
        atletMerah: { nama: "Andi Wijaya", kontingen: "DKI Jakarta" },
        atletBiru: { nama: "Rian Hidayat", kontingen: "Jawa Barat" },
        winner: null
      },
      {
        id: 3,
        round: "final",
        partai: "Partai 05",
        atletMerah: { nama: "", kontingen: "" },
        atletBiru: { nama: "", kontingen: "" },
        winner: null
      }
    ]
  },
  {
    id: "cat_2",
    name: "Kelas B Putra (50 - 55 kg)",
    gender: "Putra",
    size: 8,
    matches: [
      {
        id: 1,
        round: "quarter",
        partai: "Partai 03",
        atletMerah: { nama: "Budi Santoso", kontingen: "Jawa Timur" },
        atletBiru: { nama: "Made Wirawan", kontingen: "Bali" },
        winner: null
      },
      {
        id: 2,
        round: "quarter",
        partai: "Partai 04",
        atletMerah: { nama: "Hendra Wijaya", kontingen: "Jawa Tengah" },
        atletBiru: { nama: "Zulfikar", kontingen: "DI Yogyakarta" },
        winner: null
      },
      {
        id: 3,
        round: "quarter",
        partai: "Partai 06",
        atletMerah: { nama: "Ahmad Fauzi", kontingen: "Sumatra Utara" },
        atletBiru: { nama: "Eko Prasetyo", kontingen: "Lampung" },
        winner: null
      },
      {
        id: 4,
        round: "quarter",
        partai: "Partai 07",
        atletMerah: { nama: "Rizal Gibran", kontingen: "Kaltim" },
        atletBiru: { nama: "Dimas Anggara", kontingen: "Sulsel" },
        winner: null
      },
      {
        id: 5,
        round: "semi",
        partai: "Partai 08",
        atletMerah: { nama: "", kontingen: "" },
        atletBiru: { nama: "", kontingen: "" },
        winner: null
      },
      {
        id: 6,
        round: "semi",
        partai: "Partai 09",
        atletMerah: { nama: "", kontingen: "" },
        atletBiru: { nama: "", kontingen: "" },
        winner: null
      },
      {
        id: 7,
        round: "final",
        partai: "Partai 10",
        atletMerah: { nama: "", kontingen: "" },
        atletBiru: { nama: "", kontingen: "" },
        winner: null
      }
    ]
  }
];

// Base initial state helper
const createInitialState = (): MatchState => ({
  namaEvent: "Kejuaraan Pencak Silat Nasional",
  partai: "01",
  kelas: "A",
  gender: "Putra",
  atletMerah: { nama: "Atlet Merah", kontingen: "SUDUT MERAH" },
  atletBiru: { nama: "Atlet Biru", kontingen: "SUDUT BIRU" },
  selectedWaktu: 120, // 2 minutes
  
  timerActive: false,
  timerSeconds: 120,
  currentBabak: 1,
  matchStatus: "idle",
  
  logoKanan: null,
  logoKiri: null,
  logoTengah: null,
  
  juriHits: [],
  
  scores: {
    merah: { babak1: 0, babak2: 0, babak3: 0, total: 0 },
    biru: { babak1: 0, babak2: 0, babak3: 0, total: 0 }
  },
  
  dewanPenalties: {
    merah: { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false },
    biru: { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false }
  },
  
  directPoints: {
    merah: 0,
    biru: 0
  },
  
  verification: {
    active: false,
    type: null,
    votes: { juri1: null, juri2: null, juri3: null },
    result: null
  },
  
  lastValidScore: null,
  winner: null,
  juryPenaltyAccess: false,

  // Bracket integrations
  baganCategories: defaultBaganData,
  activeBaganCategoryId: null,
  activeBaganMatchId: null
});

// Authoritative Match State
let state: MatchState & {
  juriRawScores: {
    juri1: { merah: { [key: number]: number }; biru: { [key: number]: number } };
    juri2: { merah: { [key: number]: number }; biru: { [key: number]: number } };
    juri3: { merah: { [key: number]: number }; biru: { [key: number]: number } };
  }
} = {
  ...createInitialState(),
  juriRawScores: {
    juri1: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } },
    juri2: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } },
    juri3: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } }
  }
};

// --- AUTHORITATIVE TGR (SENI) STATE ---
const defaultTGRPeserta: TGRPeserta[] = [
  {
    id: "peserta_1",
    noUrut: 1,
    nama: "Aditya Wahyu",
    kontingen: "DKI Jakarta",
    kategori: "Tunggal",
    status: "Sudah Menilai",
    scores: { juri1: 9.910, juri2: 9.930, juri3: 9.920, juri4: 9.940, juri5: 9.915 },
    kebenaranScores: { juri1: 9.500, juri2: 9.480, juri3: 9.510, juri4: 9.490, juri5: 9.520 },
    isLocked: true,
    decisions: ["Sah"],
    deductions: 0.010,
    finalScore: 9.918,
    ranking: 1,
    dewanDecisionScore: 0
  },
  {
    id: "peserta_2",
    noUrut: 2,
    nama: "Rian & Hendra (Duo)",
    kontingen: "Jawa Barat",
    kategori: "Ganda",
    status: "Sudah Menilai",
    scores: { juri1: 9.880, juri2: 9.890, juri3: 9.875, juri4: 9.910, juri5: 9.885 },
    kebenaranScores: { juri1: 9.400, juri2: 9.410, juri3: 9.380, juri4: 9.450, juri5: 9.420 },
    isLocked: true,
    decisions: ["Sah"],
    deductions: 0,
    finalScore: 9.885,
    ranking: 2,
    dewanDecisionScore: 0
  },
  {
    id: "peserta_3",
    noUrut: 3,
    nama: "Fajar, Galang & Andi",
    kontingen: "Jawa Timur",
    kategori: "Regu",
    status: "Belum Menilai",
    scores: {},
    kebenaranScores: {},
    isLocked: false,
    decisions: [],
    deductions: 0,
    dewanDecisionScore: 0
  },
  {
    id: "peserta_4",
    noUrut: 4,
    nama: "Putri Lestari",
    kontingen: "Jawa Tengah",
    kategori: "Tunggal",
    status: "Belum Menilai",
    scores: {},
    kebenaranScores: {},
    isLocked: false,
    decisions: [],
    deductions: 0,
    dewanDecisionScore: 0
  }
];

let tgrState: TGRState = {
  namaEvent: "Kejuaraan TGR Pencak Silat IPSI",
  gelanggang: "Gelanggang A",
  partai: "PARTAI 2",
  babak: "FINAL",
  activePesertaId: "peserta_1",
  pesertaList: defaultTGRPeserta,
  jumlahJuri: 5, // Default juri (can be 4 to 10)
  sessionStatus: "open",
  timerActive: false,
  timerSeconds: 0,
  selectedWaktu: 0,
  auditLogs: [
    { id: "log_1", timestamp: new Date().toISOString(), user: "Sistem", action: "Inisialisasi sistem TGR Pencak Silat IPSI Berhasil" }
  ],
  juriCorrections: {}
};

// Helper to recalculate TGR scores and ranks
function recalculateTGRScores() {
  const JCount = tgrState.jumlahJuri;

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

  tgrState.pesertaList.forEach(peserta => {
    const scoresArr = Object.entries(peserta.scores)
      .filter(([key]) => {
        const jNum = parseInt(key.replace('juri', ''));
        return jNum >= 1 && jNum <= JCount;
      })
      .map(([_, val]) => val);

    // Only compute if we have enough scores
    if (scoresArr.length >= JCount) {
      // Calculate base score as the median of all judges' scores
      const baseScore = getMedian(scoresArr);
      const finalScore = parseFloat((baseScore - peserta.deductions).toFixed(3));
      
      peserta.finalScore = finalScore;
      peserta.status = "Sudah Menilai";
    } else {
      peserta.status = peserta.id === tgrState.activePesertaId ? "Sedang Tampil" : "Belum Menilai";
      delete peserta.finalScore;
    }
  });

  const getKebenaranSum = (p: TGRPeserta) => {
    const kebArr = Object.entries(p.kebenaranScores)
      .filter(([key]) => {
        const jNum = parseInt(key.replace('juri', ''));
        return jNum >= 1 && jNum <= JCount;
      })
      .map(([_, v]) => v);
    return kebArr.reduce((sum, v) => sum + v, 0);
  };

  const getStdDev = (p: TGRPeserta) => {
    const scoresArr = Object.entries(p.scores)
      .filter(([key]) => {
        const jNum = parseInt(key.replace('juri', ''));
        return jNum >= 1 && jNum <= JCount;
      })
      .map(([_, val]) => val);
    return getStandardDeviation(scoresArr);
  };

  // Now sort and rank peserta by finalScore descending
  // Tie-breakers:
  // a) Kebenaran gerak tertinggi (descending)
  // b) Nilai hukuman lebih rendah (ascending - lower is better)
  // c) Waktu terdekat dengan 3'00" (ascending - lower absolute diff is better)
  // d) Standar Deviasi lebih rendah (ascending - lower is better)
  const rankedPeserta = [...tgrState.pesertaList]
    .filter(p => p.finalScore !== undefined)
    .sort((a, b) => {
      if (b.finalScore! !== a.finalScore!) {
        return b.finalScore! - a.finalScore!;
      }

      // a) Kebenaran gerak tertinggi
      const kebA = getKebenaranSum(a);
      const kebB = getKebenaranSum(b);
      if (kebB !== kebA) {
        return kebB - kebA;
      }

      // b) Nilai hukuman lebih rendah
      const penaltyA = a.deductions || 0;
      const penaltyB = b.deductions || 0;
      if (penaltyA !== penaltyB) {
        return penaltyA - penaltyB;
      }

      // c) Waktu terdekat dengan 3'00" (180s)
      const diffA = Math.abs((a.waktuTampil || 0) - 180);
      const diffB = Math.abs((b.waktuTampil || 0) - 180);
      if (diffA !== diffB) {
        return diffA - diffB;
      }

      // d) Standar Deviasi lebih rendah
      const stdDevA = getStdDev(a);
      const stdDevB = getStdDev(b);
      if (stdDevA !== stdDevB) {
        return stdDevA - stdDevB;
      }

      // e) Dewan manual decision score fallback
      const decA = a.dewanDecisionScore || 0;
      const decB = b.dewanDecisionScore || 0;
      return decB - decA;
    });

  // Assign ranks
  tgrState.pesertaList.forEach(peserta => {
    if (peserta.finalScore !== undefined) {
      const idx = rankedPeserta.findIndex(rp => rp.id === peserta.id);
      peserta.ranking = idx + 1;
    } else {
      delete peserta.ranking;
    }
  });
}

// Perform initial calculation on startup
recalculateTGRScores();

// SSE connections list
let sseClients: any[] = [];

const broadcastState = () => {
  const payload = JSON.stringify({ type: 'STATE_UPDATE', state, histories: matchHistories, tgrState });
  sseClients.forEach(client => {
    client.write(`data: ${payload}\n\n`);
  });
};

// Recalculate total scores using standard IPSI rules
function recalculateScores() {
  let totalMerah = state.scores.merah.babak1 + state.scores.merah.babak2 + state.scores.merah.babak3 + state.directPoints.merah;
  let totalBiru = state.scores.biru.babak1 + state.scores.biru.babak2 + state.scores.biru.babak3 + state.directPoints.biru;

  // Adjust for Dewan Penalties
  const penM = state.dewanPenalties.merah;
  if (penM.teguran1) totalMerah -= 1;
  if (penM.teguran2) totalMerah -= 2;
  if (penM.peringatan1) totalMerah -= 5;
  if (penM.peringatan2) totalMerah -= 10;

  const penB = state.dewanPenalties.biru;
  if (penB.teguran1) totalBiru -= 1;
  if (penB.teguran2) totalBiru -= 2;
  if (penB.peringatan1) totalBiru -= 5;
  if (penB.peringatan2) totalBiru -= 10;

  state.scores.merah.total = totalMerah;
  state.scores.biru.total = totalBiru;
}

// Helper to trigger cascading winner update on the server
function updateBaganWinnerOnServer(catId: string, matchId: number, winner: 'merah' | 'biru' | null) {
  if (!state.baganCategories) return;

  state.baganCategories = state.baganCategories.map(cat => {
    if (cat.id !== catId) return cat;

    // Deep copy matches
    const updatedMatches = cat.matches.map(m => ({
      ...m,
      atletMerah: { ...m.atletMerah },
      atletBiru: { ...m.atletBiru }
    }));

    const matchIndex = updatedMatches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) return cat;

    const oldWinner = updatedMatches[matchIndex].winner;
    updatedMatches[matchIndex].winner = winner;

    const getAdvancedAthlete = (m: any, win: 'merah' | 'biru' | null) => {
      if (win === 'merah') return m.atletMerah;
      if (win === 'biru') return m.atletBiru;
      return { nama: '', kontingen: '' };
    };

    const adv = getAdvancedAthlete(updatedMatches[matchIndex], winner);

    // Helper to dynamically set athlete by Match ID safely
    const setTargetAthlete = (targetId: number, side: 'merah' | 'biru', athlete: { nama: string; kontingen: string }) => {
      const idx = updatedMatches.findIndex(m => m.id === targetId);
      if (idx !== -1) {
        if (side === 'merah') {
          updatedMatches[idx].atletMerah = athlete;
        } else {
          updatedMatches[idx].atletBiru = athlete;
        }
      }
    };

    // Helper to dynamically clear winner by Match ID safely
    const resetTargetWinner = (targetId: number) => {
      const idx = updatedMatches.findIndex(m => m.id === targetId);
      if (idx !== -1) {
        updatedMatches[idx].winner = null;
      }
    };

    // Cascading updates for size 8
    if (cat.size === 8) {
      if (matchId === 1) {
        setTargetAthlete(5, 'merah', adv);
        if (winner === null || oldWinner !== winner) {
          resetTargetWinner(5);
          setTargetAthlete(7, 'merah', { nama: '', kontingen: '' });
          resetTargetWinner(7);
        }
      } else if (matchId === 2) {
        setTargetAthlete(5, 'biru', adv);
        if (winner === null || oldWinner !== winner) {
          resetTargetWinner(5);
          setTargetAthlete(7, 'merah', { nama: '', kontingen: '' });
          resetTargetWinner(7);
        }
      } else if (matchId === 3) {
        setTargetAthlete(6, 'merah', adv);
        if (winner === null || oldWinner !== winner) {
          resetTargetWinner(6);
          setTargetAthlete(7, 'biru', { nama: '', kontingen: '' });
          resetTargetWinner(7);
        }
      } else if (matchId === 4) {
        setTargetAthlete(6, 'biru', adv);
        if (winner === null || oldWinner !== winner) {
          resetTargetWinner(6);
          setTargetAthlete(7, 'biru', { nama: '', kontingen: '' });
          resetTargetWinner(7);
        }
      } else if (matchId === 5) {
        setTargetAthlete(7, 'merah', adv);
        if (winner === null || oldWinner !== winner) {
          resetTargetWinner(7);
        }
      } else if (matchId === 6) {
        setTargetAthlete(7, 'biru', adv);
        if (winner === null || oldWinner !== winner) {
          resetTargetWinner(7);
        }
      }
    } 
    // Cascading updates for size 4
    else if (cat.size === 4) {
      if (matchId === 1) {
        setTargetAthlete(3, 'merah', adv);
        if (winner === null || oldWinner !== winner) {
          resetTargetWinner(3);
        }
      } else if (matchId === 2) {
        setTargetAthlete(3, 'biru', adv);
        if (winner === null || oldWinner !== winner) {
          resetTargetWinner(3);
        }
      }

      // Automatic bye in final (Match 3)
      const m1 = updatedMatches.find(m => m.id === 1);
      const m2 = updatedMatches.find(m => m.id === 2);
      const m3 = updatedMatches.find(m => m.id === 3);
      if (m1 && m2 && m3) {
        const semi1Resolved = m1.winner !== null || (!m1.atletMerah.nama && !m1.atletBiru.nama);
        const semi2Resolved = m2.winner !== null || (!m2.atletMerah.nama && !m2.atletBiru.nama);
        if (semi1Resolved && semi2Resolved) {
          if (m3.atletMerah.nama && !m3.atletBiru.nama) {
            m3.winner = 'merah';
          } else if (m3.atletBiru.nama && !m3.atletMerah.nama) {
            m3.winner = 'biru';
          }
        }
      }
    }

    return {
      ...cat,
      matches: updatedMatches
    };
  });
}

// Automatically determine winner when match completes or upon disqualification
function determineWinner() {
  if (state.dewanPenalties.merah.disqualified) {
    state.winner = 'biru';
    state.matchStatus = 'selesai';
  } else if (state.dewanPenalties.biru.disqualified) {
    state.winner = 'merah';
    state.matchStatus = 'selesai';
  } else {
    // Determine by higher score
    if (state.scores.merah.total > state.scores.biru.total) {
      state.winner = 'merah';
    } else if (state.scores.biru.total > state.scores.merah.total) {
      state.winner = 'biru';
    } else {
      // If exact tie, let's say tie, or winner null
      state.winner = null;
    }
    state.matchStatus = 'selesai';
  }

  // Save to history
  const newHistory: MatchHistory = {
    id: Math.random().toString(36).substring(2),
    namaEvent: state.namaEvent,
    partai: state.partai,
    kelas: state.kelas,
    gender: state.gender,
    atletMerah: { ...state.atletMerah },
    atletBiru: { ...state.atletBiru },
    winner: state.winner,
    skorAkhirMerah: state.scores.merah.total,
    skorAkhirBiru: state.scores.biru.total,
    tanggal: new Date().toISOString()
  };
  matchHistories.push(newHistory);

  // Automatically advance winner in brackets if a bracket match is currently loaded!
  if (state.activeBaganCategoryId && state.activeBaganMatchId) {
    updateBaganWinnerOnServer(state.activeBaganCategoryId, state.activeBaganMatchId, state.winner);
  }
}

// Central Timer count down tick
setInterval(() => {
  let changed = false;
  if (state.timerActive && state.timerSeconds > 0) {
    state.timerSeconds--;
    if (state.timerSeconds === 0) {
      state.timerActive = false;
      if (state.currentBabak < 3) {
        state.matchStatus = 'babak_habis';
      } else {
        determineWinner();
      }
    }
    changed = true;
  }
  if (tgrState.timerActive) {
    tgrState.timerSeconds++;
    if (tgrState.activePesertaId) {
      const activeP = tgrState.pesertaList.find(p => p.id === tgrState.activePesertaId);
      if (activeP) {
        activeP.waktuTampil = tgrState.timerSeconds;
        recalculateTGRScores();
      }
    }
    changed = true;
  }
  if (changed) {
    broadcastState();
  }
}, 1000);

// SSE connection setup
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  // Send initial state immediately
  res.write(`data: ${JSON.stringify({ type: 'STATE_UPDATE', state, histories: matchHistories, tgrState })}\n\n`);

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

// REST API endpoint to post changes
app.get('/api/state', (req, res) => {
  res.json({ state, histories: matchHistories, tgrState });
});

app.post('/api/action', (req, res) => {
  const { type, payload } = req.body;

  try {
    switch (type) {
      case 'UPDATE_EVENT_INFO': {
        state.namaEvent = payload.namaEvent || state.namaEvent;
        state.partai = payload.partai || state.partai;
        state.kelas = payload.kelas || state.kelas;
        state.gender = payload.gender || state.gender;
        state.selectedWaktu = payload.selectedWaktu || state.selectedWaktu;
        state.activeBaganCategoryId = payload.activeBaganCategoryId !== undefined ? payload.activeBaganCategoryId : state.activeBaganCategoryId;
        state.activeBaganMatchId = payload.activeBaganMatchId !== undefined ? payload.activeBaganMatchId : state.activeBaganMatchId;
        if (state.matchStatus === 'idle') {
          state.timerSeconds = state.selectedWaktu;
        }
        break;
      }
      case 'UPDATE_BAGAN_CATEGORIES': {
        if (payload.categories) {
          state.baganCategories = payload.categories;
        }
        break;
      }
      case 'UPDATE_ATHLETES': {
        state.atletMerah = { ...state.atletMerah, ...payload.atletMerah };
        state.atletBiru = { ...state.atletBiru, ...payload.atletBiru };
        break;
      }
      case 'UPLOAD_LOGOS': {
        if (payload.logoKanan !== undefined) state.logoKanan = payload.logoKanan;
        if (payload.logoKiri !== undefined) state.logoKiri = payload.logoKiri;
        if (payload.logoTengah !== undefined) state.logoTengah = payload.logoTengah;
        break;
      }
      case 'START_MATCH': {
        // Prepare or clear variables for clean game
        state.juriHits = [];
        state.winner = null;
        state.timerActive = true;
        state.currentBabak = 1;
        state.timerSeconds = state.selectedWaktu;
        state.matchStatus = 'running';
        state.directPoints = { merah: 0, biru: 0 };
        state.scores = {
          merah: { babak1: 0, babak2: 0, babak3: 0, total: 0 },
          biru: { babak1: 0, babak2: 0, babak3: 0, total: 0 }
        };
        state.dewanPenalties = {
          merah: { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false },
          biru: { binaan1: false, binaan2: false, teguran1: false, teguran2: false, peringatan1: false, peringatan2: false, disqualified: false }
        };
        state.juriRawScores = {
          juri1: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } },
          juri2: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } },
          juri3: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } }
        };
        state.verification = {
          active: false,
          type: null,
          votes: { juri1: null, juri2: null, juri3: null },
          result: null
        };
        state.lastValidScore = null;
        recalculateScores();
        break;
      }
      case 'TOGGLE_TIMER': {
        if (state.matchStatus !== 'selesai') {
          state.timerActive = !state.timerActive;
          if (state.timerActive) {
            state.matchStatus = 'running';
          } else {
            state.matchStatus = 'paused';
          }
        }
        break;
      }
      case 'RESET_TIMER': {
        state.timerActive = false;
        state.timerSeconds = state.selectedWaktu;
        break;
      }
      case 'SET_BABAK': {
        const targetBabak = payload.babak;
        state.currentBabak = targetBabak;
        state.timerSeconds = state.selectedWaktu;
        state.timerActive = false;
        state.matchStatus = 'paused';
        
        // Auto-reset "Binaan" penalties on round (babak) change
        state.dewanPenalties.merah.binaan1 = false;
        state.dewanPenalties.merah.binaan2 = false;
        state.dewanPenalties.biru.binaan1 = false;
        state.dewanPenalties.biru.binaan2 = false;
        recalculateScores();
        break;
      }
      case 'APPROVE_NEXT_BABAK': {
        // Called when secretary clicks YES on "Lanjut ke Babak Selanjutnya" dialog
        if (state.currentBabak < 3) {
          state.currentBabak += 1;
          state.timerSeconds = state.selectedWaktu;
          state.timerActive = false;
          state.matchStatus = 'paused';
          
          // Auto-reset "Binaan" penalties on round (babak) change
          state.dewanPenalties.merah.binaan1 = false;
          state.dewanPenalties.merah.binaan2 = false;
          state.dewanPenalties.biru.binaan1 = false;
          state.dewanPenalties.biru.binaan2 = false;
          recalculateScores();
        }
        break;
      }
      case 'LOAD_BAGAN_MATCH': {
        const existingCategories = state.baganCategories;
        const existingLogos = {
          logoKiri: state.logoKiri,
          logoKanan: state.logoKanan,
          logoTengah: state.logoTengah
        };
        const init = createInitialState();
        state = {
          ...state,
          ...init,
          ...existingLogos,
          baganCategories: existingCategories,
          currentBabak: 1,
          timerSeconds: init.selectedWaktu,
          juriRawScores: {
            juri1: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } },
            juri2: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } },
            juri3: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } }
          }
        };

        state.namaEvent = payload.namaEvent || state.namaEvent;
        state.partai = payload.partai || state.partai;
        state.kelas = payload.kelas || state.kelas;
        state.gender = payload.gender || state.gender;
        if (payload.selectedWaktu) {
          state.selectedWaktu = payload.selectedWaktu;
        }
        state.activeBaganCategoryId = payload.activeBaganCategoryId !== undefined ? payload.activeBaganCategoryId : state.activeBaganCategoryId;
        state.activeBaganMatchId = payload.activeBaganMatchId !== undefined ? payload.activeBaganMatchId : state.activeBaganMatchId;
        
        state.atletMerah = { ...state.atletMerah, ...payload.atletMerah };
        state.atletBiru = { ...state.atletBiru, ...payload.atletBiru };
        
        state.timerSeconds = state.selectedWaktu;
        
        recalculateScores();
        break;
      }
      case 'RESET_OR_NEXT_PARTAI': {
        // Proceed on to the next match/reset
        const existingCategories = state.baganCategories;
        const existingLogos = {
          logoKiri: state.logoKiri,
          logoKanan: state.logoKanan,
          logoTengah: state.logoTengah
        };
        const init = createInitialState();
        state = {
          ...state,
          ...init,
          ...existingLogos,
          baganCategories: existingCategories,
          currentBabak: 1,
          timerSeconds: init.selectedWaktu,
          activeBaganCategoryId: null,
          activeBaganMatchId: null,
          juriRawScores: {
            juri1: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } },
            juri2: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } },
            juri3: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } }
          }
        };
        recalculateScores();
        break;
      }
      case 'JURI_HIT': {
        // Ensure judge clicks only counted while match is active running
        if (state.matchStatus !== 'running' || !state.timerActive) {
          break;
        }

        const { juriId, sudut, aksi } = payload as { juriId: 1 | 2 | 3; sudut: 'merah' | 'biru'; aksi: 'punch' | 'kick' };
        const now = Date.now();
        const b = state.currentBabak;

        // 1. Record raw score for that judge split by Babak
        const pts = aksi === 'punch' ? 1 : 2;
        state.juriRawScores[`juri${juriId}`][sudut][b] += pts;

        // 2. Create the Hit item
        const newHit: JuriHit = {
          id: Math.random().toString(36).substring(2),
          juriId,
          sudut,
          aksi,
          babak: b,
          timestamp: now,
          isMatched: false
        };
        state.juriHits.push(newHit);

        // 3. Search for unmatched hit of same corner, same action, same round
        // within 1.5 seconds tolerance window from other judges
        const candidate = state.juriHits.find(hit => 
          hit.isMatched === false &&
          hit.juriId !== juriId &&
          hit.sudut === sudut &&
          hit.aksi === aksi &&
          hit.babak === b &&
          Math.abs(hit.timestamp - now) <= 1500
        );

        if (candidate) {
          // Double judged match! Validate point
          newHit.isMatched = true;
          candidate.isMatched = true;

          // Increment standard score for that round
          if (sudut === 'merah') {
            const currentRoundScore = state.scores.merah[`babak${b}` as keyof ScoreBreakdown] || 0;
            state.scores.merah[`babak${b}` as keyof Omit<ScoreBreakdown, 'total'>] = currentRoundScore + pts;
          } else {
            const currentRoundScore = state.scores.biru[`babak${b}` as keyof ScoreBreakdown] || 0;
            state.scores.biru[`babak${b}` as keyof Omit<ScoreBreakdown, 'total'>] = currentRoundScore + pts;
          }

          // Trigger screen highlight on the Monitor
          state.lastValidScore = {
            timestamp: now,
            sudut,
            aksi
          };
          recalculateScores();
        }
        break;
      }
      case 'TOGGLE_JURY_PENALTY_ACCESS': {
        state.juryPenaltyAccess = !state.juryPenaltyAccess;
        break;
      }
      case 'DEWAN_PENALTY': {
        const { sudut, penaltyType } = payload as { sudut: 'merah' | 'biru'; penaltyType: keyof DewanPenaltyCorner };
        const val = state.dewanPenalties[sudut][penaltyType];
        
        // Toggle the penalty
        state.dewanPenalties[sudut][penaltyType] = !val;

        // Special case: Disqualification triggers instant fight complete
        if (penaltyType === 'disqualified' && state.dewanPenalties[sudut][penaltyType]) {
          determineWinner();
        } else {
          recalculateScores();
        }
        break;
      }
      case 'DEWAN_UNDUR_DIRI': {
        const { sudut } = payload as { sudut: 'merah' | 'biru' };
        state.winner = sudut === 'merah' ? 'biru' : 'merah';
        state.matchStatus = 'selesai';
        state.timerActive = false;

        // Save to history
        const newHistory: MatchHistory = {
          id: Math.random().toString(36).substring(2),
          namaEvent: state.namaEvent,
          partai: state.partai,
          kelas: state.kelas,
          gender: state.gender,
          atletMerah: { ...state.atletMerah },
          atletBiru: { ...state.atletBiru },
          winner: state.winner,
          skorAkhirMerah: state.scores.merah.total,
          skorAkhirBiru: state.scores.biru.total,
          tanggal: new Date().toISOString()
        };
        matchHistories.push(newHistory);

        // Automatically advance winner in brackets if a bracket match is currently loaded!
        if (state.activeBaganCategoryId && state.activeBaganMatchId) {
          updateBaganWinnerOnServer(state.activeBaganCategoryId, state.activeBaganMatchId, state.winner);
        }
        break;
      }
      case 'DEWAN_WMP': {
        const { winnerCorner } = payload as { winnerCorner: 'merah' | 'biru' };
        state.winner = winnerCorner;
        state.matchStatus = 'selesai';
        state.timerActive = false;

        // Save to history
        const newHistory: MatchHistory = {
          id: Math.random().toString(36).substring(2),
          namaEvent: state.namaEvent,
          partai: state.partai,
          kelas: state.kelas,
          gender: state.gender,
          atletMerah: { ...state.atletMerah },
          atletBiru: { ...state.atletBiru },
          winner: state.winner,
          skorAkhirMerah: state.scores.merah.total,
          skorAkhirBiru: state.scores.biru.total,
          tanggal: new Date().toISOString()
        };
        matchHistories.push(newHistory);

        // Automatically advance winner in brackets if a bracket match is currently loaded!
        if (state.activeBaganCategoryId && state.activeBaganMatchId) {
          updateBaganWinnerOnServer(state.activeBaganCategoryId, state.activeBaganMatchId, state.winner);
        }
        break;
      }
      case 'DEWAN_K_TEKNIK': {
        const { winnerCorner } = payload as { winnerCorner: 'merah' | 'biru' };
        state.winner = winnerCorner;
        state.matchStatus = 'selesai';
        state.timerActive = false;

        // Save to history
        const newHistory: MatchHistory = {
          id: Math.random().toString(36).substring(2),
          namaEvent: state.namaEvent,
          partai: state.partai,
          kelas: state.kelas,
          gender: state.gender,
          atletMerah: { ...state.atletMerah },
          atletBiru: { ...state.atletBiru },
          winner: state.winner,
          skorAkhirMerah: state.scores.merah.total,
          skorAkhirBiru: state.scores.biru.total,
          tanggal: new Date().toISOString()
        };
        matchHistories.push(newHistory);

        if (state.activeBaganCategoryId && state.activeBaganMatchId) {
          updateBaganWinnerOnServer(state.activeBaganCategoryId, state.activeBaganMatchId, state.winner);
        }
        break;
      }
      case 'DEWAN_UNDO': {
        const { sudut } = payload as { sudut: 'merah' | 'biru' };
        // 1. If directPoints > 0, decrease Jatuhan
        if (state.directPoints[sudut] > 0) {
          state.directPoints[sudut] = Math.max(0, state.directPoints[sudut] - 3);
        } else {
          // 2. Otherwise toggle off the last active penalty
          const pen = state.dewanPenalties[sudut];
          if (pen.disqualified) pen.disqualified = false;
          else if (pen.peringatan2) pen.peringatan2 = false;
          else if (pen.peringatan1) pen.peringatan1 = false;
          else if (pen.teguran2) pen.teguran2 = false;
          else if (pen.teguran1) pen.teguran1 = false;
          else if (pen.binaan2) pen.binaan2 = false;
          else if (pen.binaan1) pen.binaan1 = false;
        }
        recalculateScores();
        break;
      }
      case 'DEWAN_JATUHAN': {
        const { sudut } = payload as { sudut: 'merah' | 'biru' };
        // Directly add 3 points
        state.directPoints[sudut] += 3;
        
        // Register standard visual glow
        state.lastValidScore = {
          timestamp: Date.now(),
          sudut,
          aksi: 'kick' // Treat as kick equivalent visual flash
        };
        recalculateScores();
        break;
      }
      case 'DEWAN_BATAL_JATUHAN': {
        const { sudut } = payload as { sudut: 'merah' | 'biru' };
        // Directly subtract 3 points, protecting from negative values
        state.directPoints[sudut] = Math.max(0, state.directPoints[sudut] - 3);
        recalculateScores();
        break;
      }
      case 'DEWAN_VERIFY_TRIGGER': {
        const { type } = payload as { type: 'JATUHAN' | 'PELANGGARAN' };
        state.verification = {
          active: true,
          type,
          votes: { juri1: null, juri2: null, juri3: null },
          result: null
        };
        break;
      }
      case 'JURI_VERIFY_VOTE': {
        const { juriId, vote } = payload as { juriId: 1 | 2 | 3; vote: 'MERAH' | 'BIRU' | 'TIDAK_SAH' };
        if (state.verification.active) {
          state.verification.votes[`juri${juriId}`] = vote;

          // Check if all Judges have voted
          const v = state.verification.votes;
          if (v.juri1 && v.juri2 && v.juri3) {
            // Count votes to find majority
            const counts = { MERAH: 0, BIRU: 0, TIDAK_SAH: 0 };
            counts[v.juri1]++;
            counts[v.juri2]++;
            counts[v.juri3]++;

            let maj: 'MERAH' | 'BIRU' | 'TIDAK_SAH' = 'TIDAK_SAH';
            if (counts.MERAH >= 2) maj = 'MERAH';
            else if (counts.BIRU >= 2) maj = 'BIRU';

            state.verification.result = maj;
            
            // If verification was Jatuhan and valid for a corner, add Jatuhan points automatically!
            if (state.verification.type === 'JATUHAN') {
              if (maj === 'MERAH') {
                state.directPoints.merah += 3;
              } else if (maj === 'BIRU') {
                state.directPoints.biru += 3;
              }
            }
            recalculateScores();
          }
        }
        break;
      }
      case 'DEWAN_VERIFY_RESOLVE': {
        // Clear active verification popup
        state.verification = {
          active: false,
          type: null,
          votes: { juri1: null, juri2: null, juri3: null },
          result: null
        };
        break;
      }
      case 'CLEAR_HISTORY': {
        matchHistories = [];
        break;
      }
      case 'IMPORT_ROSTERS': {
        // Mass-config rosters
        const rosters = payload.rosters;
        if (rosters && rosters.length > 0) {
          const first = rosters[0];
          state.namaEvent = first.namaEvent || state.namaEvent;
          state.partai = first.partai || state.partai;
          state.kelas = first.kelas || state.kelas;
          state.gender = first.gender || state.gender;
          state.atletMerah = { nama: first.namaAtletMerah || "Atlet Merah", kontingen: first.kontingenMerah || "SUDUT MERAH" };
          state.atletBiru = { nama: first.namaAtletBiru || "Atlet Biru", kontingen: first.kontingenBiru || "SUDUT BIRU" };
          if (first.waktu) {
            state.selectedWaktu = parseInt(first.waktu, 10);
            state.timerSeconds = state.selectedWaktu;
          }
        }
        break;
      }
      case 'SEKRETARIS_ADJUST_SCORE': {
        const { sudut, amount } = payload as { sudut: 'merah' | 'biru'; amount: number };
        state.directPoints[sudut] += amount;
        recalculateScores();
        break;
      }
      case 'SEKRETARIS_DECLARE_WINNER': {
        const { winner } = payload as { winner: 'merah' | 'biru' | null };
        state.winner = winner;
        state.matchStatus = 'selesai';
        state.timerActive = false;

        // Save to history
        const newHistory: MatchHistory = {
          id: Math.random().toString(36).substring(2),
          namaEvent: state.namaEvent,
          partai: state.partai,
          kelas: state.kelas,
          gender: state.gender,
          atletMerah: { ...state.atletMerah },
          atletBiru: { ...state.atletBiru },
          winner: state.winner,
          skorAkhirMerah: state.scores.merah.total,
          skorAkhirBiru: state.scores.biru.total,
          tanggal: new Date().toISOString()
        };
        matchHistories.push(newHistory);

        // Automatically advance winner in brackets if a bracket match is currently loaded!
        if (state.activeBaganCategoryId && state.activeBaganMatchId) {
          updateBaganWinnerOnServer(state.activeBaganCategoryId, state.activeBaganMatchId, state.winner);
        }
        break;
      }
      case 'SEKRETARIS_ADJUST_PARTAI': {
        const { offset } = payload as { offset: number };
        
        const scheduledList: { catId: string; catName: string; gender: 'Putra' | 'Putri'; m: any; num: number }[] = [];
        if (state.baganCategories) {
          state.baganCategories.forEach(cat => {
            cat.matches.forEach(m => {
              if (m.partai && !m.partai.includes('TBD')) {
                const num = parseInt(m.partai.replace(/\D/g, ''), 10);
                if (!isNaN(num)) {
                  scheduledList.push({ catId: cat.id, catName: cat.name, gender: cat.gender, m, num });
                }
              }
            });
          });
        }
        
        scheduledList.sort((a, b) => a.num - b.num);
        
        const currentPartaiNum = parseInt(state.partai.replace(/\D/g, ''), 10) || 1;
        
        if (scheduledList.length > 0) {
          // Find the index of the scheduled match with the current partai number
          let currentIndex = scheduledList.findIndex(item => item.num === currentPartaiNum);
          
          let targetIndex = -1;
          if (currentIndex !== -1) {
            targetIndex = currentIndex + offset;
          } else {
            // If current number is not in scheduled list, find the next or previous
            if (offset > 0) {
              targetIndex = scheduledList.findIndex(item => item.num > currentPartaiNum);
              if (targetIndex === -1) targetIndex = scheduledList.length - 1;
            } else {
              // Find the last one that is less than current
              for (let i = scheduledList.length - 1; i >= 0; i--) {
                if (scheduledList[i].num < currentPartaiNum) {
                  targetIndex = i;
                  break;
                }
              }
              if (targetIndex === -1) targetIndex = 0;
            }
          }
          
          if (targetIndex >= 0 && targetIndex < scheduledList.length) {
            const selected = scheduledList[targetIndex];
            
            // Re-initialize state like LOAD_BAGAN_MATCH
            const existingCategories = state.baganCategories;
            const existingLogos = {
              logoKiri: state.logoKiri,
              logoKanan: state.logoKanan,
              logoTengah: state.logoTengah
            };
            const init = createInitialState();
            state = {
              ...state,
              ...init,
              ...existingLogos,
              baganCategories: existingCategories,
              currentBabak: 1,
              timerSeconds: init.selectedWaktu,
              juriRawScores: {
                juri1: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } },
                juri2: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } },
                juri3: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } }
              }
            };
            
            state.partai = selected.num.toString().padStart(2, '0');
            state.kelas = selected.catName.replace(/\s*\(.*\)/, '');
            state.gender = selected.gender;
            state.activeBaganCategoryId = selected.catId;
            state.activeBaganMatchId = selected.m.id;
            state.atletMerah = {
              nama: selected.m.atletMerah.nama || "Sudut Merah",
              kontingen: selected.m.atletMerah.kontingen || "SUDUT MERAH"
            };
            state.atletBiru = {
              nama: selected.m.atletBiru.nama || "Sudut Biru",
              kontingen: selected.m.atletBiru.kontingen || "SUDUT BIRU"
            };
            state.timerSeconds = state.selectedWaktu;
            recalculateScores();
          } else {
            const newPartaiNum = Math.max(1, currentPartaiNum + offset);
            state.partai = newPartaiNum.toString().padStart(2, '0');
          }
        } else {
          const newPartaiNum = Math.max(1, currentPartaiNum + offset);
          state.partai = newPartaiNum.toString().padStart(2, '0');
        }
        break;
      }
      
      // --- TGR ACTION CASES ---
      case 'TGR_UPDATE_EVENT_INFO': {
        tgrState.namaEvent = payload.namaEvent || tgrState.namaEvent;
        tgrState.gelanggang = payload.gelanggang || tgrState.gelanggang;
        tgrState.partai = payload.partai || tgrState.partai;
        tgrState.babak = payload.babak || tgrState.babak;
        tgrState.jumlahJuri = payload.jumlahJuri || tgrState.jumlahJuri;
        if (payload.selectedWaktu) {
          tgrState.selectedWaktu = payload.selectedWaktu;
        }
        recalculateTGRScores();
        break;
      }
      case 'TGR_SET_ACTIVE_PESERTA': {
        tgrState.activePesertaId = payload.pesertaId;
        const activeP = tgrState.pesertaList.find(p => p.id === payload.pesertaId);
        if (activeP) {
          tgrState.partai = `PARTAI ${activeP.noUrut}`;
        }
        recalculateTGRScores();
        break;
      }
      case 'TGR_UPDATE_PESERTA': {
        const { action, peserta } = payload;
        if (action === 'add') {
          const newNoUrut = peserta.noUrut || (tgrState.pesertaList.length + 1);
          tgrState.pesertaList.push({
            id: peserta.id || Math.random().toString(36).substring(2),
            noUrut: newNoUrut,
            nama: peserta.nama,
            kontingen: peserta.kontingen,
            kategori: peserta.kategori || "Tunggal",
            status: "Belum Menilai",
            scores: {},
            kebenaranScores: {},
            isLocked: false,
            decisions: [],
            deductions: 0,
            deductionReasons: [],
            dewanDecisionScore: 0,
            finalizedJuries: []
          });
          if (!tgrState.activePesertaId) {
            tgrState.activePesertaId = peserta.id || null;
            tgrState.partai = `PARTAI ${newNoUrut}`;
          }
        } else if (action === 'edit') {
          const idx = tgrState.pesertaList.findIndex(p => p.id === peserta.id);
          if (idx !== -1) {
            tgrState.pesertaList[idx] = {
              ...tgrState.pesertaList[idx],
              ...peserta
            };
            if (tgrState.activePesertaId === peserta.id && peserta.noUrut !== undefined) {
              tgrState.partai = `PARTAI ${peserta.noUrut}`;
            }
          }
        } else if (action === 'delete') {
          tgrState.pesertaList = tgrState.pesertaList.filter(p => p.id !== payload.pesertaId);
          if (tgrState.activePesertaId === payload.pesertaId) {
            tgrState.activePesertaId = tgrState.pesertaList[0]?.id || null;
          }
          if (tgrState.activePesertaId) {
            const activeP = tgrState.pesertaList.find(p => p.id === tgrState.activePesertaId);
            if (activeP) {
              tgrState.partai = `PARTAI ${activeP.noUrut}`;
            }
          }
        } else if (action === 'sync_list') {
          tgrState.pesertaList = payload.pesertaList.map((p: any, idx: number) => ({
            id: p.id || Math.random().toString(36).substring(2),
            noUrut: p.noUrut || (idx + 1),
            nama: p.nama,
            kontingen: p.kontingen,
            kategori: p.kategori || "Tunggal",
            status: p.status || "Belum Menilai",
            scores: p.scores || {},
            kebenaranScores: p.kebenaranScores || {},
            isLocked: p.isLocked || false,
            decisions: p.decisions || [],
            deductions: p.deductions || 0,
            deductionReasons: p.deductionReasons || [],
            dewanDecisionScore: p.dewanDecisionScore || 0,
            finalizedJuries: p.finalizedJuries || []
          }));
          tgrState.activePesertaId = tgrState.pesertaList[0]?.id || null;
          if (tgrState.activePesertaId) {
            const activeP = tgrState.pesertaList.find(p => p.id === tgrState.activePesertaId);
            if (activeP) {
              tgrState.partai = `PARTAI ${activeP.noUrut}`;
            }
          }
        }
        recalculateTGRScores();
        break;
      }
      case 'TGR_SUBMIT_JURI_SCORE': {
        const { pesertaId, juriId, score, kebenaranScore, finalize, tuningScores } = payload;
        if (tgrState.sessionStatus === 'closed') {
          throw new Error('Sesi penilaian ditutup oleh Ketua Pertandingan');
        }
        const peserta = tgrState.pesertaList.find(p => p.id === pesertaId);
        if (peserta) {
          if (peserta.isLocked) {
            throw new Error('Hasil pertandingan sudah dikunci');
          }
          peserta.scores[juriId] = score;
          peserta.kebenaranScores[juriId] = kebenaranScore;

          if (tuningScores) {
            if (!peserta.tuningScores) peserta.tuningScores = {};
            peserta.tuningScores[juriId] = tuningScores;
          }

          if (!peserta.finalizedJuries) {
            peserta.finalizedJuries = [];
          }

          if (finalize) {
            if (!peserta.finalizedJuries.includes(juriId)) {
              peserta.finalizedJuries.push(juriId);
            }
          } else {
            // If they are live updating, make sure they are not marked as finalized
            peserta.finalizedJuries = peserta.finalizedJuries.filter(id => id !== juriId);
          }

          recalculateTGRScores();
        }
        break;
      }
      case 'TGR_DEWAN_DECISION': {
        const { pesertaId, decisions, deductions, dewanDecisionScore, waktuTampil, deductionReasons } = payload;
        const peserta = tgrState.pesertaList.find(p => p.id === pesertaId);
        if (peserta) {
          if (decisions !== undefined) peserta.decisions = decisions;
          if (deductions !== undefined) peserta.deductions = deductions;
          if (dewanDecisionScore !== undefined) peserta.dewanDecisionScore = dewanDecisionScore;
          if (waktuTampil !== undefined) peserta.waktuTampil = waktuTampil;
          if (deductionReasons !== undefined) peserta.deductionReasons = deductionReasons;
          recalculateTGRScores();
        }
        break;
      }
      case 'TGR_LOCK_RESULT': {
        const { pesertaId, isLocked } = payload;
        const peserta = tgrState.pesertaList.find(p => p.id === pesertaId);
        if (peserta) {
          peserta.isLocked = isLocked;
        }
        break;
      }
      case 'TGR_SUBMIT_JURI_CORRECTION': {
        const { juriId, pesertaId, original, requested } = payload;
        tgrState.juriCorrections[juriId] = {
          pesertaId,
          original,
          requested,
          status: 'pending'
        };
        break;
      }
      case 'TGR_APPROVE_JURI_CORRECTION': {
        const { juriId } = payload;
        const corr = tgrState.juriCorrections[juriId];
        if (corr) {
          corr.status = 'approved';
          const peserta = tgrState.pesertaList.find(p => p.id === corr.pesertaId);
          if (peserta) {
            peserta.scores[juriId] = corr.requested;
            recalculateTGRScores();
          }
        }
        break;
      }
      case 'TGR_REJECT_JURI_CORRECTION': {
        const { juriId } = payload;
        const corr = tgrState.juriCorrections[juriId];
        if (corr) {
          corr.status = 'rejected';
        }
        break;
      }
      case 'TGR_CANCEL_SCORE': {
        const { pesertaId } = payload;
        const peserta = tgrState.pesertaList.find(p => p.id === pesertaId);
        if (peserta) {
          peserta.scores = {};
          peserta.kebenaranScores = {};
          peserta.isLocked = false;
          peserta.deductions = 0;
          peserta.decisions = [];
          peserta.dewanDecisionScore = 0;
          recalculateTGRScores();
        }
        break;
      }
      case 'TGR_TOGGLE_SESSION': {
        tgrState.sessionStatus = payload.status;
        break;
      }
      case 'TGR_START_TIMER': {
        tgrState.timerActive = true;
        break;
      }
      case 'TGR_PAUSE_TIMER': {
        tgrState.timerActive = false;
        if (tgrState.activePesertaId) {
          const activeP = tgrState.pesertaList.find(p => p.id === tgrState.activePesertaId);
          if (activeP) {
            activeP.waktuTampil = tgrState.timerSeconds;
            recalculateTGRScores();
          }
        }
        break;
      }
      case 'TGR_RESET_TIMER': {
        tgrState.timerActive = false;
        tgrState.timerSeconds = 0;
        break;
      }
      case 'TGR_SET_TIMER_SECONDS': {
        tgrState.timerSeconds = payload.seconds;
        if (tgrState.activePesertaId) {
          const activeP = tgrState.pesertaList.find(p => p.id === tgrState.activePesertaId);
          if (activeP) {
            activeP.waktuTampil = payload.seconds;
            recalculateTGRScores();
          }
        }
        break;
      }
      case 'TGR_ADD_AUDIT_LOG': {
        tgrState.auditLogs.unshift({
          id: Math.random().toString(36).substring(2),
          timestamp: new Date().toISOString(),
          user: payload.user,
          action: payload.action
        });
        if (tgrState.auditLogs.length > 200) {
          tgrState.auditLogs.pop();
        }
        break;
      }
      default:
        break;
    }

    broadcastState();
    res.json({ success: true, state, tgrState });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// History download route as JSON/CSV
app.get('/api/history/download', (req, res) => {
  // Let's generate a beautiful formatted CSV document
  let csv = 'No,Tanggal,Nama Event,Partai,Kelas,Gender,Atlet Merah,Skor Merah,Skor Biru,Atlet Biru,Pemenang\n';
  matchHistories.forEach((h, index) => {
    const winnerName = h.winner === 'merah' ? h.atletMerah.nama : h.winner === 'biru' ? h.atletBiru.nama : 'Seri';
    csv += `${index + 1},"${h.tanggal}","${h.namaEvent}","${h.partai}","${h.kelas}","${h.gender}","${h.atletMerah.nama} (${h.atletMerah.kontingen})",${h.skorAkhirMerah},${h.skorAkhirBiru},"${h.atletBiru.nama} (${h.atletBiru.kontingen})","${winnerName}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=silat_match_history.csv');
  res.send(csv);
});

// Vite & Static file serving integration
const setupStaticAndMiddleware = async () => {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pencak Silat Digital Scoring Server is listening on http://localhost:${PORT}`);
  });
};

setupStaticAndMiddleware();
