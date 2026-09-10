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
  gelanggang?: string;
  arenaId?: string;
}

export interface BaganCategory {
  id: string;
  name: string;
  gender: 'Putra' | 'Putri';
  size: number;
  matches: BaganMatch[];
  kelas?: string;
  usia?: string;
  gelanggang?: string;
  arenaId?: string;
}

export interface MatchState {
  namaEvent: string;
  gelanggang?: string;
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

export interface TGRPartaiPool {
  id: string;
  partai: string; // e.g. "Partai 01" or "Partai 1"
  partaiNumber: number; // e.g. 1
  kategori: string; // e.g. "Tunggal", "Ganda", "Regu", "Solo Kreatif"
  gender?: 'Putra' | 'Putri';
  usia?: string; // e.g. "Usia Dini", "Pra Remaja", "Remaja", "Dewasa"
  poolName?: string; // e.g. "Pool A", "Pool B", "Final"
  babak?: string; // e.g. "Penyisihan", "Semi Final", "Final"
  pesertaIds: string[]; // List of participant IDs in this match/pool (3, 4, or more)
  status?: 'terjadwal' | 'live' | 'selesai';
}

export interface TGRPeserta {
  id: string;
  noUrut: number;
  noUndian?: number; // No undian / nomor urut tampil dalam partai (1, 2, 3, 4...)
  partai?: string; // e.g. "Partai 01" or "Partai 1"
  partaiNumber?: number; // e.g. 1
  pool?: string; // e.g. "Pool A", "Pool B", "Final"
  poolName?: string; // e.g. "Pool A", "Pool B", "Final"
  isFinalPool?: boolean;
  sudut?: 'merah' | 'biru'; // For Prestasi (VS) mode
  gender?: 'Putra' | 'Putri';
  usia?: string; // e.g. "Remaja", "Dewasa"
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
  rankingInPartai?: number; // Ranking specifically inside this partai/pool
  rankingInPool?: number; // Ranking inside its assigned pool
  dewanDecisionScore?: number; // secondary tie breaker manually adjusted by dewan if exact tie
  waktuTampil?: number; // performance time in seconds
  finalizedJuries?: string[]; // list of juri IDs that have finalized their scores
}

export interface TGRState {
  namaEvent: string;
  gelanggang: string;
  partai?: string;
  babak?: string;
  sistemSeni?: 'pool' | 'prestasi'; // 'pool' = Ranking Nilai per Pool, 'prestasi' = Head-to-Head VS Bagan Gugur
  activePesertaId: string | null;
  activePartaiId?: string | null;
  activeVSMatch?: {
    partai: string;
    round: string;
    categoryName?: string;
    merahPesertaId?: string;
    biruPesertaId?: string;
    activeSudut?: 'merah' | 'biru';
    winner?: 'merah' | 'biru' | null;
  };
  pesertaList: TGRPeserta[];
  partaiPoolList?: TGRPartaiPool[];
  jumlahPesertaPerPartai?: number; // default 3 or 4 or custom per partai
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
  logoKanan?: string | null;
  logoKiri?: string | null;
  logoTengah?: string | null;
}

export interface GelanggangInfo {
  id: string; // e.g. "arena_1", "arena_2", "arena_3"
  nama: string; // e.g. "Gelanggang 1" or "Gelanggang A"
  kode: string; // e.g. "1" or "A"
  keterangan?: string; // e.g. "Matras A - Hall Utama"
  modeAktif?: 'tanding' | 'seni';
  status?: 'aktif' | 'istirahat' | 'selesai';
  createdAt?: string;
}

export interface ArenaSummary {
  id: string;
  nama: string;
  kode: string;
  keterangan?: string;
  modeAktif: 'tanding' | 'seni';
  status: 'aktif' | 'istirahat' | 'selesai';
  // Tanding stats
  tandingPartai?: string;
  tandingBabak?: number;
  tandingKelas?: string;
  tandingMerahNama?: string;
  tandingMerahKontingen?: string;
  tandingMerahSkor?: number;
  tandingBiruNama?: string;
  tandingBiruKontingen?: string;
  tandingBiruSkor?: number;
  tandingTimerActive?: boolean;
  tandingTimerSeconds?: number;
  tandingMatchStatus?: string;
  tandingWinner?: 'merah' | 'biru' | null;
  // Seni stats
  seniPartai?: string;
  seniBabak?: string;
  seniKategori?: string;
  seniActivePesertaNama?: string;
  seniActivePesertaKontingen?: string;
  seniActivePesertaSkor?: number;
  seniTimerActive?: boolean;
  seniTimerSeconds?: number;
  totalPesertaSeni?: number;
  totalHistories?: number;
}

