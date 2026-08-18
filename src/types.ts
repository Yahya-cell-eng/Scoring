/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Athlete {
  nama: string;
  kontingen: string;
}

export interface JuriHit {
  id: string;
  juriId: 1 | 2 | 3;
  sudut: 'merah' | 'biru';
  aksi: 'punch' | 'kick';
  babak: number;
  timestamp: number;
  isMatched: boolean;
}

export interface ScoreBreakdown {
  babak1: number;
  babak2: number;
  babak3: number;
  total: number;
}

export interface DewanPenaltyCorner {
  binaan1: boolean;
  binaan2: boolean;
  teguran1: boolean; // -1
  teguran2: boolean; // -2
  peringatan1: boolean; // -5
  peringatan2: boolean; // -10
  disqualified: boolean;
}

export interface MatchHistory {
  id: string;
  namaEvent: string;
  partai: string;
  kelas: string;
  gender: 'Putra' | 'Putri';
  atletMerah: Athlete;
  atletBiru: Athlete;
  winner: 'merah' | 'biru' | null;
  skorAkhirMerah: number;
  skorAkhirBiru: number;
  tanggal: string;
}

export interface BaganMatch {
  id: number;
  round: 'thirtysecond' | 'sixteenth' | 'eighth' | 'quarter' | 'semi' | 'final';
  partai: string;
  atletMerah: Athlete;
  atletBiru: Athlete;
  winner: 'merah' | 'biru' | null;
}

export interface BaganCategory {
  id: string;
  name: string;
  gender: 'Putra' | 'Putri';
  size: number;
  matches: BaganMatch[];
  kelas?: string;
  usia?: string;
}

export interface MatchState {
  namaEvent: string;
  partai: string;
  kelas: string;
  gender: 'Putra' | 'Putri';
  atletMerah: Athlete;
  atletBiru: Athlete;
  selectedWaktu: number; // dropdown seconds (e.g., 60, 120, 180)
  
  timerActive: boolean;
  timerSeconds: number;
  currentBabak: number; // 1, 2, 3
  matchStatus: 'idle' | 'running' | 'paused' | 'babak_habis' | 'selesai';
  
  logoKanan: string | null; // Base64 of logo
  logoKiri: string | null;  // Base64 of logo
  logoTengah: string | null; // Base64 of event/championship logo

  juriHits: JuriHit[];

  scores: {
    merah: ScoreBreakdown;
    biru: ScoreBreakdown;
  };

  dewanPenalties: {
    merah: DewanPenaltyCorner;
    biru: DewanPenaltyCorner;
  };

  directPoints: {
    merah: number; // Accumulated Jatuhan * 3
    biru: number;
  };

  verification: {
    active: boolean;
    type: 'JATUHAN' | 'PELANGGARAN' | null;
    votes: {
      juri1: 'MERAH' | 'BIRU' | 'TIDAK_SAH' | null;
      juri2: 'MERAH' | 'BIRU' | 'TIDAK_SAH' | null;
      juri3: 'MERAH' | 'BIRU' | 'TIDAK_SAH' | null;
    };
    result: 'MERAH' | 'BIRU' | 'TIDAK_SAH' | null;
  };

  lastValidScore: {
    timestamp: number;
    sudut: 'merah' | 'biru';
    aksi: 'punch' | 'kick';
  } | null;

  winner: 'merah' | 'biru' | null;
  juryPenaltyAccess?: boolean;

  // Real-time Bracket integration fields
  baganCategories?: BaganCategory[];
  activeBaganCategoryId?: string | null;
  activeBaganMatchId?: number | null;
}

export interface TGRPeserta {
  id: string;
  noUrut: number;
  nama: string;
  kontingen: string;
  kategori: string;
  status: 'Belum Menilai' | 'Sudah Menilai' | 'Sedang Tampil';
  scores: { [juriId: string]: number }; // juriId ("juri1", "juri2", etc) -> score (9.990 to 0.000)
  kebenaranScores: { [juriId: string]: number }; // For tie break
  tuningScores?: { [juriId: string]: { cat1: number; cat2: number; cat3: number } };
  isLocked: boolean;
  decisions: string[]; // "Sah", "Diskualifikasi", "Teguran", "Pengurangan"
  deductions: number; // Penalty points by Dewan (e.g. 0.010, etc.)
  deductionReasons?: string[]; // Array of checked 0.50 reasons
  finalScore?: number;
  ranking?: number;
  dewanDecisionScore?: number; // secondary tie breaker manually adjusted by dewan if exact tie
  waktuTampil?: number; // performance time in seconds
  finalizedJuries?: string[]; // list of juri IDs that have finalized their scores
}

export interface TGRState {
  namaEvent: string;
  gelanggang: string;
  partai?: string;
  babak?: string;
  activePesertaId: string | null;
  pesertaList: TGRPeserta[];
  jumlahJuri: number; // 4 to 10
  sessionStatus: 'open' | 'closed';
  timerActive: boolean;
  timerSeconds: number;
  selectedWaktu: number;
  auditLogs: { id: string; timestamp: string; user: string; action: string }[];
  juriCorrections: {
    [juriId: string]: {
      pesertaId: string;
      original: number;
      requested: number;
      status: 'pending' | 'approved' | 'rejected';
    };
  };
}

