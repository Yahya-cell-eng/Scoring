/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { MasterTournamentInfo, MasterReferee, ArenaAssignment, MasterDataState, AdminUser } from '../src/types.ts';
import { arenasMap } from './arenas.ts';

// Default Master Tournament Information
export const defaultTournamentInfo: MasterTournamentInfo = {
  namaEvent: "Kejuaraan Nasional Pencak Silat IPSI 2026",
  subJudul: "Piala Menpora RI & Ketua Umum Pengurus Besar IPSI",
  lokasi: "Padepokan Pencak Silat Indonesia, TMII, Jakarta Timur",
  tanggalMulai: "2026-09-15",
  tanggalSelesai: "2026-09-20",
  tingkatKejuaraan: "Nasional",
  penyelenggara: "Pengurus Besar Ikatan Pencak Silat Indonesia (PB IPSI)",
  delegasiTeknis: "Drs. H. M. Taufik, M.Si (Technical Delegate IPSI)",
  ketuaPertandinganUtama: "Dr. H. Suwandi, M.Pd (Wasit Juri Internasional)",
  dewanWasitUtama: "Drs. Bambang Sutrisno, M.M",
  aturanVersi: "Peraturan Pertandingan IPSI 2022 (Terbaru)",
  logoKiri: null,
  logoKanan: null,
  logoTengah: null,
  updatedAt: new Date().toISOString()
};

// Initial Master Referee Registry (Official Wasit & Juri IPSI)
export const defaultReferees: MasterReferee[] = [
  {
    id: "ref_1",
    nama: "Dr. H. Suwandi, M.Pd",
    lisensi: "Internasional",
    pengprov: "DKI Jakarta",
    kategoriTugas: "Semua",
    nomorRegistrasi: "WJ-INT-0842",
    telepon: "0812-8877-6601",
    status: "aktif",
    catatan: "Ketua Wasit Juri Internasional Persilat"
  },
  {
    id: "ref_2",
    nama: "H. Joko Susilo, M.Pd",
    lisensi: "Nasional 1",
    pengprov: "Jawa Barat",
    kategoriTugas: "Tanding",
    nomorRegistrasi: "WJ-NAS1-1029",
    telepon: "0813-2233-4455",
    status: "aktif",
    catatan: "Koordinator Wasit Gelanggang Utama"
  },
  {
    id: "ref_3",
    nama: "Drs. Bambang Sutrisno, M.M",
    lisensi: "Nasional 1",
    pengprov: "Jawa Tengah",
    kategoriTugas: "Semua",
    nomorRegistrasi: "WJ-NAS1-0988",
    telepon: "0811-9988-7711",
    status: "aktif",
    catatan: "Dewan Hakim Senior"
  },
  {
    id: "ref_4",
    nama: "Ahmad Fauzi, S.Or",
    lisensi: "Nasional 1",
    pengprov: "Jawa Timur",
    kategoriTugas: "Tanding",
    nomorRegistrasi: "WJ-NAS1-1240",
    telepon: "0852-3344-5566",
    status: "aktif",
    catatan: "Wasit Utama Panggung A"
  },
  {
    id: "ref_5",
    nama: "Siti Nurjanah, S.Pd",
    lisensi: "Nasional 2",
    pengprov: "Banten",
    kategoriTugas: "Tanding",
    nomorRegistrasi: "WJ-NAS2-2031",
    telepon: "0819-4455-6677",
    status: "aktif",
    catatan: "Juri Sudut Berpengalaman PON"
  },
  {
    id: "ref_6",
    nama: "I Made Wirawan, S.Or",
    lisensi: "Nasional 2",
    pengprov: "Bali",
    kategoriTugas: "Semua",
    nomorRegistrasi: "WJ-NAS2-2115",
    telepon: "0878-6677-8899",
    status: "aktif",
    catatan: "Spesialisasi Sudut & Pengamatan Jatuhan"
  },
  {
    id: "ref_7",
    nama: "Hj. Fatimah Zahra, M.Si",
    lisensi: "Internasional",
    pengprov: "Sumatra Barat",
    kategoriTugas: "Semua",
    nomorRegistrasi: "WJ-INT-0915",
    telepon: "0812-7788-9900",
    status: "aktif",
    catatan: "Ketua Pertandingan Gelanggang 2"
  },
  {
    id: "ref_8",
    nama: "M. Ridwan, S.H",
    lisensi: "Nasional 1",
    pengprov: "Sulawesi Selatan",
    kategoriTugas: "Tanding",
    nomorRegistrasi: "WJ-NAS1-1188",
    telepon: "0813-5566-7788",
    status: "aktif",
    catatan: "Dewan Wasit & Evaluator Teknis"
  },
  {
    id: "ref_9",
    nama: "Eko Prasetyo, S.Pd",
    lisensi: "Nasional 2",
    pengprov: "Lampung",
    kategoriTugas: "Tanding",
    nomorRegistrasi: "WJ-NAS2-2204",
    telepon: "0821-3344-8899",
    status: "aktif",
    catatan: "Wasit Utama Gelanggang 2"
  },
  {
    id: "ref_10",
    nama: "Zulfikar Efendi, S.Sos",
    lisensi: "Nasional 2",
    pengprov: "DI Yogyakarta",
    kategoriTugas: "Semua",
    nomorRegistrasi: "WJ-NAS2-2319",
    telepon: "0857-1122-3344",
    status: "aktif",
    catatan: "Juri Tanding & Seni"
  },
  {
    id: "ref_11",
    nama: "Agus Gunawan, S.Pd",
    lisensi: "Daerah",
    pengprov: "Kalimantan Timur",
    kategoriTugas: "Tanding",
    nomorRegistrasi: "WJ-DAE-3401",
    telepon: "0853-9900-1122",
    status: "aktif",
    catatan: "Kandidat Sertifikasi Nasional"
  },
  {
    id: "ref_12",
    nama: "Dewi Sartika, M.Pd",
    lisensi: "Nasional 2",
    pengprov: "Riau",
    kategoriTugas: "Tanding",
    nomorRegistrasi: "WJ-NAS2-2455",
    telepon: "0812-4455-8811",
    status: "aktif",
    catatan: "Juri Tanding Handal"
  },
  {
    id: "ref_13",
    nama: "Ki Anom Suroto, S.Sn",
    lisensi: "Nasional 1",
    pengprov: "Jawa Tengah",
    kategoriTugas: "Seni",
    nomorRegistrasi: "WJ-NAS1-1402",
    telepon: "0812-3355-7799",
    status: "aktif",
    catatan: "Ketua Juri Seni & Koreografi TGR"
  },
  {
    id: "ref_14",
    nama: "Ni Ketut Astuti, S.Pd",
    lisensi: "Nasional 2",
    pengprov: "Bali",
    kategoriTugas: "Seni",
    nomorRegistrasi: "WJ-NAS2-2590",
    telepon: "0877-8899-0011",
    status: "aktif",
    catatan: "Juri Penilai Kebenaran Gerak Seni"
  },
  {
    id: "ref_15",
    nama: "Hendra Wijaya, S.Pd",
    lisensi: "Daerah",
    pengprov: "Banten",
    kategoriTugas: "Semua",
    nomorRegistrasi: "WJ-DAE-3520",
    telepon: "0856-7788-9911",
    status: "cadangan",
    catatan: "Wasit Cadangan / Petugas Timer & Verifikasi"
  }
];

// Initial Arena Master Assignments
export const defaultAssignments: Record<string, ArenaAssignment> = {
  arena_1: {
    arenaId: "arena_1",
    namaGelanggang: "Gelanggang 1",
    ketuaPertandinganId: "ref_1",
    dewanId: "ref_3",
    wasitUtamaId: "ref_4",
    juri1Id: "ref_2",
    juri2Id: "ref_5",
    juri3Id: "ref_6",
    juriCadanganId: "ref_15",
    seniJuriIds: {
      juri1: "ref_2",
      juri2: "ref_5",
      juri3: "ref_6",
      juri4: "ref_10",
      juri5: "ref_12"
    },
    shift: "Sesi 1 (Pagi - Siang)",
    status: "bertugas",
    catatan: "Matras Utama Partai Perebutan Medali"
  },
  arena_2: {
    arenaId: "arena_2",
    namaGelanggang: "Gelanggang 2",
    ketuaPertandinganId: "ref_7",
    dewanId: "ref_8",
    wasitUtamaId: "ref_9",
    juri1Id: "ref_10",
    juri2Id: "ref_11",
    juri3Id: "ref_12",
    juriCadanganId: "ref_15",
    seniJuriIds: {
      juri1: "ref_10",
      juri2: "ref_11",
      juri3: "ref_12",
      juri4: "ref_14",
      juri5: "ref_6"
    },
    shift: "Sesi 1 (Pagi - Siang)",
    status: "bertugas",
    catatan: "Matras Arena B Partai Penyisihan"
  },
  arena_3: {
    arenaId: "arena_3",
    namaGelanggang: "Gelanggang 3",
    ketuaPertandinganId: "ref_1",
    dewanId: "ref_13",
    wasitUtamaId: "ref_14",
    juri1Id: "ref_13",
    juri2Id: "ref_14",
    juri3Id: "ref_6",
    juriCadanganId: "ref_10",
    seniJuriIds: {
      juri1: "ref_13",
      juri2: "ref_14",
      juri3: "ref_6",
      juri4: "ref_10",
      juri5: "ref_2",
      juri6: "ref_3",
      juri7: "ref_5"
    },
    shift: "Sepanjang Hari",
    status: "bertugas",
    catatan: "Arena Khusus Seni Tunggal, Ganda, Regu & Solo Kreatif"
  }
};

// System Admin Credentials & Sessions
export interface AdminCredential {
  username: string;
  passwordHash: string; // Plaintext or hashed for this system
  displayName: string;
  role: 'superadmin' | 'admin';
}

export const adminCredentials: AdminCredential[] = [
  {
    username: "admin",
    passwordHash: "admin@silat2026",
    displayName: "System Administrator PB IPSI",
    role: "superadmin"
  },
  {
    username: "master",
    passwordHash: "ipsi123",
    displayName: "Master Technical Delegate",
    role: "admin"
  }
];

// In-Memory Active Admin Sessions (token -> AdminUser with expiration)
export const activeSessions = new Map<string, {
  token: string;
  user: AdminUser;
  expiresAt: number;
}>();

// Master Data State Container
export const masterDataState: MasterDataState = {
  tournament: { ...defaultTournamentInfo },
  referees: JSON.parse(JSON.stringify(defaultReferees)),
  assignments: JSON.parse(JSON.stringify(defaultAssignments)),
  auditLogs: [
    {
      id: "log_init_01",
      timestamp: new Date().toISOString(),
      admin: "System",
      action: "INISIALISASI_MASTER_DATA",
      details: "Inisialisasi data master turnamen, daftar wasit-juri, dan penugasan awal gelanggang berhasil."
    }
  ]
};

// Authentication Helper
export const createAdminSession = (username: string): { token: string; user: AdminUser } => {
  const account = adminCredentials.find(a => a.username.toLowerCase() === username.toLowerCase());
  const token = `adm_tok_${Math.random().toString(36).substring(2)}_${Date.now()}`;
  const user: AdminUser = {
    username: account?.username || username,
    displayName: account?.displayName || "System Administrator",
    role: account?.role || "superadmin",
    lastLogin: new Date().toISOString()
  };

  // 24 hours validity
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  activeSessions.set(token, { token, user, expiresAt });

  return { token, user };
};

export const verifyAdminToken = (token?: string | null): AdminUser | null => {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const session = activeSessions.get(cleanToken);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    activeSessions.delete(cleanToken);
    return null;
  }

  return session.user;
};

export const revokeAdminSession = (token?: string | null): boolean => {
  if (!token) return false;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  return activeSessions.delete(cleanToken);
};

// Master Data Modification Helpers with Automatic Arena State Synchronization
export const addAuditLog = (admin: string, action: string, details?: string) => {
  masterDataState.auditLogs.unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    admin,
    action,
    details
  });

  if (masterDataState.auditLogs.length > 200) {
    masterDataState.auditLogs = masterDataState.auditLogs.slice(0, 200);
  }
};

export const syncTournamentToAllArenas = () => {
  const tour = masterDataState.tournament;
  // Propagate to all arenas in arenasMap
  for (const arena of Object.values(arenasMap)) {
    if (tour.namaEvent) {
      arena.state.namaEvent = tour.namaEvent;
      arena.tgrState.namaEvent = tour.namaEvent;
    }
    if (tour.logoKanan !== undefined && tour.logoKanan !== null) {
      arena.state.logoKanan = tour.logoKanan;
      arena.tgrState.logoKanan = tour.logoKanan;
    }
    if (tour.logoKiri !== undefined && tour.logoKiri !== null) {
      arena.state.logoKiri = tour.logoKiri;
      arena.tgrState.logoKiri = tour.logoKiri;
    }
    if (tour.logoTengah !== undefined && tour.logoTengah !== null) {
      arena.state.logoTengah = tour.logoTengah;
      arena.tgrState.logoTengah = tour.logoTengah;
    }
  }
};
