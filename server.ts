/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { MatchState, MatchHistory, JuriHit, ScoreBreakdown, DewanPenaltyCorner, BaganCategory, BaganMatch, TGRState, TGRPeserta } from './src/types';
import {
  arenasMap,
  getArena,
  getArenasList,
  getArenasSummary,
  createDefaultArena,
  createInitialMatchState,
  createInitialTGRState,
  recalculateArenaScores,
  recalculateArenaTGRScores,
  determineArenaWinner,
  updateArenaBaganWinner
} from './server/arenas';
import {
  masterDataState,
  createAdminSession,
  verifyAdminToken,
  revokeAdminSession,
  addAuditLog,
  syncTournamentToAllArenas,
  adminCredentials,
  defaultTournamentInfo,
  defaultReferees,
  defaultAssignments
} from './server/masterData';
import {
  initLocalStorage,
  saveLocalStorage,
  getLocalStorageStatus,
  createLocalBackup,
  exportFullDatabase,
  importFullDatabase
} from './server/storage';

const app = express();
const PORT = 3000;

// Enable JSON parsing
app.use(express.json({ limit: '10mb' }));

// Initialize persistent server local storage immediately on startup
initLocalStorage();

// Graceful shutdown hooks to ensure all state is flushed to disk
process.on('SIGINT', () => {
  console.log('[Server] Menerima sinyal SIGINT, menyimpan data ke server lokal...');
  saveLocalStorage(true);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Server] Menerima sinyal SIGTERM, menyimpan data ke server lokal...');
  saveLocalStorage(true);
  process.exit(0);
});

// SSE connections list
let sseClients: any[] = [];

const getArenasMapData = () => {
  const result: Record<string, { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: any }> = {};
  for (const [key, container] of Object.entries(arenasMap)) {
    result[key] = {
      state: container.state,
      tgrState: container.tgrState,
      histories: container.histories,
      info: container.info
    };
  }
  return result;
};

const broadcastState = (specificArenaId?: string) => {
  const arenasList = getArenasList();
  const allArenasSummary = getArenasSummary();
  const arenasFullMap = getArenasMapData();

  // Send to all connected clients
  sseClients.forEach(client => {
    const clientArenaId = client._arenaId || 'arena_1';
    const clientArena = getArena(clientArenaId);

    const payload = JSON.stringify({
      type: 'STATE_UPDATE',
      arenaId: clientArenaId,
      state: clientArena.state,
      histories: clientArena.histories,
      tgrState: clientArena.tgrState,
      arenasList,
      allArenasSummary,
      arenas: arenasFullMap,
      masterData: masterDataState
    });

    try {
      client.write(`data: ${payload}\n\n`);
    } catch (err) {
      // Ignore broken pipe
    }
  });
};

// Central Timer count down tick for all Arenas in parallel
setInterval(() => {
  let changed = false;

  for (const arena of Object.values(arenasMap)) {
    // 1. Tanding Match Timer
    if (arena.state.timerActive && arena.state.timerSeconds > 0) {
      arena.state.timerSeconds--;
      if (arena.state.timerSeconds === 0) {
        arena.state.timerActive = false;
        if (arena.state.currentBabak < 3) {
          arena.state.matchStatus = 'babak_habis';
        } else {
          determineArenaWinner(arena);
          saveLocalStorage(true);
        }
      }
      changed = true;
    }

    // 2. TGR Seni Timer
    if (arena.tgrState.timerActive) {
      arena.tgrState.timerSeconds++;
      if (arena.tgrState.activePesertaId) {
        const activeP = arena.tgrState.pesertaList.find(p => p.id === arena.tgrState.activePesertaId);
        if (activeP) {
          activeP.waktuTampil = arena.tgrState.timerSeconds;
          recalculateArenaTGRScores(arena);
        }
      }
      changed = true;
    }
  }

  if (changed) {
    broadcastState();
    saveLocalStorage();
  }
}, 1000);

// SSE connection setup
app.get('/api/events', (req, res) => {
  const reqArena = (req.query.arena as string) || 'arena_1';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  (res as any)._arenaId = reqArena;

  const arena = getArena(reqArena);
  const initialPayload = JSON.stringify({
    type: 'STATE_UPDATE',
    arenaId: reqArena,
    state: arena.state,
    histories: arena.histories,
    tgrState: arena.tgrState,
    arenasList: getArenasList(),
    allArenasSummary: getArenasSummary(),
    arenas: getArenasMapData(),
    masterData: masterDataState
  });

  res.write(`data: ${initialPayload}\n\n`);

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(client => client !== res);
  });
});

// REST API endpoint to query state
app.get('/api/state', (req, res) => {
  const reqArena = (req.query.arena as string) || 'arena_1';
  const arena = getArena(reqArena);
  res.json({
    state: arena.state,
    histories: arena.histories,
    tgrState: arena.tgrState,
    arenaId: arena.info.id,
    arenasList: getArenasList(),
    allArenasSummary: getArenasSummary(),
    arenas: getArenasMapData(),
    masterData: masterDataState
  });
});

// REST API endpoint to query arenas list and summaries
app.get('/api/arenas', (req, res) => {
  res.json({
    arenasList: getArenasList(),
    allArenasSummary: getArenasSummary(),
    arenas: getArenasMapData(),
    masterData: masterDataState
  });
});

// ==========================================
// PROTECTED MASTER DATA & ADMIN AUTH API
// ==========================================

// 1. Admin Login
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username dan password wajib diisi.' });
  }

  const account = adminCredentials.find(
    acc => acc.username.toLowerCase() === username.trim().toLowerCase() && acc.passwordHash === password
  );

  if (!account) {
    return res.status(401).json({
      success: false,
      error: 'Autentikasi gagal. Username atau password administrator tidak valid.'
    });
  }

  const { token, user } = createAdminSession(account.username);
  addAuditLog(user.username, 'LOGIN_SUKSES', `Administrator ${user.displayName} berhasil login ke AdminPanel.`);
  broadcastState();

  return res.json({
    success: true,
    token,
    user,
    masterData: masterDataState
  });
});

// 2. Admin Session Verification
app.get('/api/admin/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const user = verifyAdminToken(authHeader);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Sesi administrator tidak valid atau sudah kedaluwarsa.' });
  }

  return res.json({
    success: true,
    user,
    masterData: masterDataState
  });
});

// 3. Admin Logout
app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const user = verifyAdminToken(authHeader);
  if (user) {
    addAuditLog(user.username, 'LOGOUT', `Administrator ${user.displayName} keluar dari sistem.`);
  }
  revokeAdminSession(authHeader);
  return res.json({ success: true, message: 'Berhasil logout.' });
});

// 4. Get Master Data (Protected)
app.get('/api/admin/master-data', (req, res) => {
  const authHeader = req.headers.authorization;
  const user = verifyAdminToken(authHeader);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Akses ditolak. Memerlukan autentikasi administrator sistem.' });
  }

  return res.json({
    success: true,
    masterData: masterDataState,
    arenasList: getArenasList()
  });
});

// 5. Update Master Tournament Info (Protected)
app.post('/api/admin/tournament', (req, res) => {
  const authHeader = req.headers.authorization;
  const user = verifyAdminToken(authHeader);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Akses ditolak. Sesi admin tidak valid.' });
  }

  const { tournament } = req.body || {};
  if (!tournament || !tournament.namaEvent) {
    return res.status(400).json({ success: false, error: 'Nama turnamen tidak boleh kosong.' });
  }

  masterDataState.tournament = {
    ...masterDataState.tournament,
    ...tournament,
    updatedAt: new Date().toISOString()
  };

  // Synchronize tournament name and logos into all arenas immediately
  syncTournamentToAllArenas();

  addAuditLog(
    user.username,
    'UPDATE_TURNAMEN',
    `Memperbarui data master turnamen: "${tournament.namaEvent}" (${tournament.tingkatKejuaraan || 'Nasional'})`
  );

  broadcastState();
  saveLocalStorage(true);

  return res.json({
    success: true,
    tournament: masterDataState.tournament,
    message: 'Data master turnamen berhasil diperbarui dan disinkronkan ke seluruh gelanggang.'
  });
});

// 6. Manage Master Referees (Protected)
app.post('/api/admin/referees', (req, res) => {
  const authHeader = req.headers.authorization;
  const user = verifyAdminToken(authHeader);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Akses ditolak. Sesi admin tidak valid.' });
  }

  const { action, referee, id } = req.body || {};

  if (action === 'add') {
    if (!referee || !referee.nama) {
      return res.status(400).json({ success: false, error: 'Nama wasit/juri wajib diisi.' });
    }
    const newRef: any = {
      id: referee.id || `ref_${Date.now()}`,
      nama: referee.nama,
      lisensi: referee.lisensi || 'Daerah',
      pengprov: referee.pengprov || 'Pusat',
      kategoriTugas: referee.kategoriTugas || 'Semua',
      nomorRegistrasi: referee.nomorRegistrasi || `WJ-${Math.floor(1000 + Math.random() * 9000)}`,
      telepon: referee.telepon || '-',
      status: referee.status || 'aktif',
      catatan: referee.catatan || ''
    };
    masterDataState.referees.push(newRef);
    addAuditLog(user.username, 'TAMBAH_WASIT', `Menambahkan wasit/juri baru: ${newRef.nama} (${newRef.lisensi} - ${newRef.pengprov})`);
  } else if (action === 'update') {
    if (!referee || !referee.id) {
      return res.status(400).json({ success: false, error: 'ID wasit wajib disertakan.' });
    }
    const idx = masterDataState.referees.findIndex(r => r.id === referee.id);
    if (idx !== -1) {
      masterDataState.referees[idx] = { ...masterDataState.referees[idx], ...referee };
      addAuditLog(user.username, 'UPDATE_WASIT', `Memperbarui profil wasit: ${referee.nama}`);
    } else {
      return res.status(404).json({ success: false, error: 'Wasit tidak ditemukan.' });
    }
  } else if (action === 'delete') {
    const targetId = id || referee?.id;
    if (!targetId) {
      return res.status(400).json({ success: false, error: 'ID wasit wajib disertakan.' });
    }
    const targetRef = masterDataState.referees.find(r => r.id === targetId);
    masterDataState.referees = masterDataState.referees.filter(r => r.id !== targetId);
    addAuditLog(user.username, 'HAPUS_WASIT', `Menghapus wasit: ${targetRef?.nama || targetId}`);
  } else {
    return res.status(400).json({ success: false, error: 'Aksi tidak dikenali.' });
  }

  broadcastState();
  saveLocalStorage(true);

  return res.json({
    success: true,
    referees: masterDataState.referees,
    message: 'Data wasit & juri berhasil disimpan.'
  });
});

// 7. Manage Arena Assignments (Protected)
app.post('/api/admin/assignments', (req, res) => {
  const authHeader = req.headers.authorization;
  const user = verifyAdminToken(authHeader);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Akses ditolak. Sesi admin tidak valid.' });
  }

  const { arenaId, assignment, allAssignments } = req.body || {};

  if (allAssignments) {
    masterDataState.assignments = { ...masterDataState.assignments, ...allAssignments };
    addAuditLog(user.username, 'UPDATE_SEMUA_PENUGASAN', 'Memperbarui seluruh tabel penugasan wasit-juri gelanggang.');
  } else if (arenaId && assignment) {
    masterDataState.assignments[arenaId] = {
      ...masterDataState.assignments[arenaId],
      ...assignment,
      arenaId
    };
    addAuditLog(user.username, 'UPDATE_PENUGASAN_GELANGGANG', `Memperbarui penugasan wasit-juri untuk ${assignment.namaGelanggang || arenaId}`);
  } else {
    return res.status(400).json({ success: false, error: 'Data penugasan tidak valid.' });
  }

  broadcastState();
  saveLocalStorage(true);

  return res.json({
    success: true,
    assignments: masterDataState.assignments,
    message: 'Penugasan wasit & juri gelanggang berhasil disimpan.'
  });
});

// 8. Change Admin Password (Protected)
app.post('/api/admin/change-password', (req, res) => {
  const authHeader = req.headers.authorization;
  const user = verifyAdminToken(authHeader);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Akses ditolak. Sesi admin tidak valid.' });
  }

  const { newPassword, confirmPassword } = req.body || {};
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ success: false, error: 'Password baru minimal 4 karakter.' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, error: 'Konfirmasi password tidak cocok.' });
  }

  const targetAcc = adminCredentials.find(a => a.username === user.username);
  if (targetAcc) {
    targetAcc.passwordHash = newPassword;
    addAuditLog(user.username, 'UBAH_PASSWORD', `Password akun administrator ${user.username} berhasil diubah.`);
    saveLocalStorage(true);
    return res.json({ success: true, message: 'Password administrator berhasil diubah.' });
  }

  return res.status(404).json({ success: false, error: 'Akun tidak ditemukan.' });
});

// 9. Reset Master Data to Official Defaults (Protected)
app.post('/api/admin/reset-master-data', (req, res) => {
  const authHeader = req.headers.authorization;
  const user = verifyAdminToken(authHeader);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Akses ditolak. Sesi admin tidak valid.' });
  }

  masterDataState.tournament = JSON.parse(JSON.stringify(defaultTournamentInfo));
  masterDataState.referees = JSON.parse(JSON.stringify(defaultReferees));
  masterDataState.assignments = JSON.parse(JSON.stringify(defaultAssignments));

  syncTournamentToAllArenas();
  addAuditLog(user.username, 'RESET_MASTER_DATA', 'Mereset data master turnamen, wasit, dan penugasan ke template resmi.');
  broadcastState();
  saveLocalStorage(true);

  return res.json({
    success: true,
    masterData: masterDataState,
    message: 'Data master berhasil direset ke standar resmi IPSI.'
  });
});

// ==========================================
// LOCAL SERVER STORAGE PERSISTENCE API
// ==========================================

// 1. Get Storage Status & Health
app.get('/api/storage/status', (req, res) => {
  try {
    const status = getLocalStorageStatus();
    res.json({ success: true, ...status });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Force Immediate Save to Local Server Disk
app.post('/api/storage/save', (req, res) => {
  try {
    saveLocalStorage(true);
    const status = getLocalStorageStatus();
    res.json({
      success: true,
      message: 'Semua data turnamen, wasit, dan pertandingan seluruh gelanggang berhasil disimpan ke disk server lokal.',
      status
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Create Local Server Backup Snapshot
app.post('/api/storage/backup', (req, res) => {
  try {
    const backupResult = createLocalBackup();
    const status = getLocalStorageStatus();
    res.json({
      success: true,
      message: `File cadangan lokal berhasil dibuat: ${backupResult.filename}`,
      backup: backupResult,
      status
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Download Full Database JSON Dump directly
app.get('/api/storage/export', (req, res) => {
  try {
    saveLocalStorage(true);
    const dump = exportFullDatabase();
    const filename = `silat_db_backup_${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(dump, null, 2));
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Restore Database from JSON Dump
app.post('/api/storage/import', (req, res) => {
  try {
    const { dump } = req.body || {};
    if (!dump) {
      return res.status(400).json({ success: false, error: 'Data backup JSON tidak ditemukan.' });
    }
    const result = importFullDatabase(dump);
    broadcastState();
    const status = getLocalStorageStatus();
    res.json({
      success: true,
      message: result.message,
      status
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/action', (req, res) => {
  const { type, payload } = req.body;
  const reqArenaId = req.body.arenaId || payload?.arenaId || (req.query.arena as string) || 'arena_1';
  const arena = getArena(reqArenaId);
  const state = arena.state;
  const tgrState = arena.tgrState;

  try {
    // Automatically track active mode for the arena: TGR/Seni vs Tanding
    if (type && type.startsWith('TGR_')) {
      arena.info.modeAktif = 'seni';
    } else if (
      type === 'START_MATCH' ||
      type === 'TOGGLE_TIMER' ||
      type === 'LOAD_BAGAN_MATCH' ||
      type === 'RESET_OR_NEXT_PARTAI' ||
      type === 'SET_BABAK' ||
      type === 'JURI_HIT' ||
      type === 'DEWAN_PENALTY' ||
      type === 'SEKRETARIS_ADJUST_PARTAI' ||
      type === 'UPDATE_BAGAN_CATEGORIES' ||
      type === 'UPDATE_EVENT_INFO'
    ) {
      arena.info.modeAktif = 'tanding';
    }

    switch (type) {
      // --- ARENA MANAGEMENT ACTIONS ---
      case 'ADD_GELANGGANG': {
        const newId = payload.id || `arena_${Date.now()}`;
        const count = Object.keys(arenasMap).length + 1;
        const newName = payload.nama || `Gelanggang ${count}`;
        const newCode = payload.kode || `${count}`;
        const newKet = payload.keterangan || `Matras ${count}`;
        const newMode = payload.modeAktif || 'tanding';

        const newArena = createDefaultArena(newId, newName, newCode, newKet, newMode);

        if (payload.copyBaganFrom && arenasMap[payload.copyBaganFrom]) {
          newArena.state.baganCategories = JSON.parse(JSON.stringify(arenasMap[payload.copyBaganFrom].state.baganCategories));
        }

        arenasMap[newId] = newArena;
        break;
      }
      case 'UPDATE_GELANGGANG': {
        const targetId = payload.id || reqArenaId;
        const targetArena = getArena(targetId);
        if (payload.nama) {
          targetArena.info.nama = payload.nama;
          targetArena.state.gelanggang = payload.nama;
          targetArena.tgrState.gelanggang = payload.nama;
        }
        if (payload.kode) {
          targetArena.info.kode = payload.kode;
        }
        if (payload.keterangan !== undefined) {
          targetArena.info.keterangan = payload.keterangan;
        }
        if (payload.modeAktif) {
          targetArena.info.modeAktif = payload.modeAktif;
        }
        if (payload.status) {
          targetArena.info.status = payload.status;
        }
        break;
      }
      case 'DELETE_GELANGGANG': {
        const delId = payload.id;
        if (delId && Object.keys(arenasMap).length > 1 && arenasMap[delId]) {
          delete arenasMap[delId];
        }
        break;
      }
      case 'RESET_GELANGGANG': {
        const targetId = payload.id || reqArenaId;
        const target = getArena(targetId);
        if (payload.resetType === 'seni') {
          target.tgrState = createInitialTGRState(target.info.nama);
        } else if (payload.resetType === 'tanding') {
          const init = createInitialMatchState(target.info.nama);
          target.state = {
            ...init,
            juriRawScores: {
              juri1: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } },
              juri2: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } },
              juri3: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } }
            }
          };
        } else {
          const init = createInitialMatchState(target.info.nama);
          target.state = {
            ...init,
            juriRawScores: {
              juri1: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } },
              juri2: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } },
              juri3: { merah: { 1: 0, 2: 0, 3: 0 }, biru: { 1: 0, 2: 0, 3: 0 } }
            }
          };
          target.tgrState = createInitialTGRState(target.info.nama);
          target.histories = [];
        }
        break;
      }

      // --- CROSS-ARENA SCHEDULE MANAGEMENT ACTIONS ---
      case 'TRANSFER_CATEGORY_TO_ARENA': {
        const { sourceArenaId, targetArenaId, categoryId, isCopy } = payload;
        const sourceArena = getArena(sourceArenaId);
        const targetArena = getArena(targetArenaId);
        if (sourceArena && targetArena && sourceArena.state.baganCategories) {
          const catIndex = sourceArena.state.baganCategories.findIndex(c => c.id === categoryId);
          if (catIndex !== -1) {
            const cat = sourceArena.state.baganCategories[catIndex];
            if (!targetArena.state.baganCategories) targetArena.state.baganCategories = [];
            targetArena.state.baganCategories.push(JSON.parse(JSON.stringify(cat)));
            if (!isCopy) {
              sourceArena.state.baganCategories.splice(catIndex, 1);
            }
          }
        }
        break;
      }
      case 'TRANSFER_PESERTA_TGR_TO_ARENA': {
        const { sourceArenaId, targetArenaId, pesertaId, isCopy } = payload;
        const sourceArena = getArena(sourceArenaId);
        const targetArena = getArena(targetArenaId);
        if (sourceArena && targetArena && sourceArena.tgrState.pesertaList) {
          const pIndex = sourceArena.tgrState.pesertaList.findIndex(p => p.id === pesertaId);
          if (pIndex !== -1) {
            const peserta = sourceArena.tgrState.pesertaList[pIndex];
            if (!targetArena.tgrState.pesertaList) targetArena.tgrState.pesertaList = [];
            const newPeserta = JSON.parse(JSON.stringify(peserta));
            newPeserta.noUrut = targetArena.tgrState.pesertaList.length + 1;
            newPeserta.noUndian = newPeserta.noUrut;
            newPeserta.partaiNumber = newPeserta.noUrut;
            newPeserta.partai = `PARTAI ${newPeserta.noUrut}`;
            targetArena.tgrState.pesertaList.push(newPeserta);
            if (!targetArena.tgrState.activePesertaId) {
              targetArena.tgrState.activePesertaId = newPeserta.id;
              targetArena.tgrState.partai = newPeserta.partai;
            }
            if (!isCopy) {
              sourceArena.tgrState.pesertaList.splice(pIndex, 1);
              if (sourceArena.tgrState.activePesertaId === pesertaId) {
                sourceArena.tgrState.activePesertaId = sourceArena.tgrState.pesertaList[0]?.id || null;
              }
            }
          }
        }
        break;
      }
      case 'DISTRIBUTE_TANDING_SCHEDULE': {
        const { sourceArenaId, targetArenaIds, method } = payload; // method: 'round_robin' | 'even_split'
        const sourceArena = getArena(sourceArenaId);
        if (sourceArena && sourceArena.state.baganCategories && targetArenaIds && targetArenaIds.length > 0) {
          const categories = JSON.parse(JSON.stringify(sourceArena.state.baganCategories));
          const numTargets = targetArenaIds.length;
          
          targetArenaIds.forEach((targetId: string) => {
            const tArena = getArena(targetId);
            if (tArena) tArena.state.baganCategories = [];
          });

          categories.forEach((cat: any, idx: number) => {
            const targetId = targetArenaIds[idx % numTargets];
            const tArena = getArena(targetId);
            if (tArena) {
              if (!tArena.state.baganCategories) tArena.state.baganCategories = [];
              tArena.state.baganCategories.push(cat);
            }
          });
        }
        break;
      }
      case 'DISTRIBUTE_SENI_SCHEDULE': {
        const { sourceArenaId, targetArenaIds } = payload;
        const sourceArena = getArena(sourceArenaId);
        if (sourceArena && sourceArena.tgrState.pesertaList && targetArenaIds && targetArenaIds.length > 0) {
          const participants = JSON.parse(JSON.stringify(sourceArena.tgrState.pesertaList));
          const numTargets = targetArenaIds.length;

          targetArenaIds.forEach((targetId: string) => {
            const tArena = getArena(targetId);
            if (tArena) {
              tArena.tgrState.pesertaList = [];
              tArena.tgrState.activePesertaId = null;
            }
          });

          participants.forEach((p: any, idx: number) => {
            const targetId = targetArenaIds[idx % numTargets];
            const tArena = getArena(targetId);
            if (tArena) {
              const newP = { ...p, noUrut: tArena.tgrState.pesertaList.length + 1 };
              newP.partaiNumber = newP.noUrut;
              newP.partai = `PARTAI ${newP.noUrut}`;
              tArena.tgrState.pesertaList.push(newP);
              if (!tArena.tgrState.activePesertaId) {
                tArena.tgrState.activePesertaId = newP.id;
                tArena.tgrState.partai = newP.partai;
              }
            }
          });
        }
        break;
      }

      case 'SET_ARENA_MODE': {
        const targetId = payload.arenaId || reqArenaId;
        const targetArena = getArena(targetId);
        if (targetArena && payload.modeAktif) {
          targetArena.info.modeAktif = payload.modeAktif;
        }
        break;
      }

      case 'DISTRIBUTE_EXCEL_ALL_ARENAS': {
        const { tandingCategories = [], seniPesertaList = [], targetArenaIds } = payload;

        // Find all active arenas
        let activeArenas = (targetArenaIds && targetArenaIds.length > 0)
          ? targetArenaIds.map((id: string) => getArena(id)).filter(Boolean)
          : Object.values(arenasMap).filter(a => a.info.status === 'aktif');

        if (activeArenas.length === 0) {
          activeArenas = Object.values(arenasMap);
        }

        // Check if there are dedicated tanding and seni arenas
        let tandingArenas = activeArenas.filter(a => a.info.modeAktif === 'tanding');
        let seniArenas = activeArenas.filter(a => a.info.modeAktif === 'seni');

        if (tandingArenas.length === 0 && tandingCategories.length > 0) {
          tandingArenas = activeArenas;
        }
        if (seniArenas.length === 0 && seniPesertaList.length > 0) {
          seniArenas = activeArenas;
        }

        // 1. Distribute Tanding Categories across active tanding arenas
        if (tandingCategories.length > 0 && tandingArenas.length > 0) {
          tandingArenas.forEach(a => {
            a.state.baganCategories = [];
          });

          tandingCategories.forEach((cat: any, idx: number) => {
            const targetArena = tandingArenas[idx % tandingArenas.length];
            targetArena.state.baganCategories.push(JSON.parse(JSON.stringify(cat)));
          });

          // Renumber partais sequentially per arena
          tandingArenas.forEach(arena => {
            let partaiNum = 1;
            arena.state.baganCategories.forEach(cat => {
              cat.matches.forEach((m: any) => {
                m.partai = `Partai ${partaiNum < 10 ? '0' + partaiNum : partaiNum}`;
                partaiNum++;
              });
            });

            // Set initial active match for this arena
            const firstCat = arena.state.baganCategories[0];
            const firstMatch = firstCat?.matches[0];
            if (firstMatch) {
              arena.state.activeBaganCategoryId = firstCat.id;
              arena.state.activeBaganMatchId = firstMatch.id;
              arena.state.partai = firstMatch.partai;
              arena.state.kelas = firstCat.kelas || arena.state.kelas;
              arena.state.gender = firstCat.gender || arena.state.gender;
              if (firstMatch.atletMerah) arena.state.atletMerah = { ...firstMatch.atletMerah };
              if (firstMatch.atletBiru) arena.state.atletBiru = { ...firstMatch.atletBiru };
              arena.info.modeAktif = 'tanding';
            }
          });
        }

        // 2. Distribute Seni Participants across active seni arenas
        if (seniPesertaList.length > 0 && seniArenas.length > 0) {
          seniArenas.forEach(a => {
            a.tgrState.pesertaList = [];
            a.tgrState.activePesertaId = null;
          });

          seniPesertaList.forEach((p: any, idx: number) => {
            const targetArena = seniArenas[idx % seniArenas.length];
            const newOrder = targetArena.tgrState.pesertaList.length + 1;
            const newP = {
              ...p,
              noUrut: newOrder,
              partaiNumber: newOrder,
              partai: `PARTAI ${newOrder < 10 ? '0' + newOrder : newOrder}`
            };
            targetArena.tgrState.pesertaList.push(newP);
            if (!targetArena.tgrState.activePesertaId) {
              targetArena.tgrState.activePesertaId = newP.id;
              targetArena.tgrState.partai = newP.partai;
            }
          });

          seniArenas.forEach(a => {
            if (a.tgrState.pesertaList.length > 0) {
              a.info.modeAktif = 'seni';
            }
          });
        }
        break;
      }

      // --- TANDING ACTIONS ---
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
      case 'UPDATE_METADATA': {
        if (payload.namaEvent !== undefined) state.namaEvent = payload.namaEvent;
        if (payload.partai !== undefined) state.partai = payload.partai;
        if (payload.kelas !== undefined) state.kelas = payload.kelas;
        if (payload.gender !== undefined) state.gender = payload.gender;
        if (payload.atletMerah) state.atletMerah = { ...state.atletMerah, ...payload.atletMerah };
        if (payload.atletBiru) state.atletBiru = { ...state.atletBiru, ...payload.atletBiru };
        if (payload.selectedWaktu !== undefined) {
          state.selectedWaktu = payload.selectedWaktu;
          if (state.matchStatus === 'idle') {
            state.timerSeconds = payload.selectedWaktu;
          }
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
        if (payload.logoKanan !== undefined) {
          state.logoKanan = payload.logoKanan;
          tgrState.logoKanan = payload.logoKanan;
        }
        if (payload.logoKiri !== undefined) {
          state.logoKiri = payload.logoKiri;
          tgrState.logoKiri = payload.logoKiri;
        }
        if (payload.logoTengah !== undefined) {
          state.logoTengah = payload.logoTengah;
          tgrState.logoTengah = payload.logoTengah;
        }
        break;
      }
      case 'TGR_UPLOAD_LOGOS': {
        if (payload.logoKanan !== undefined) {
          tgrState.logoKanan = payload.logoKanan;
          state.logoKanan = payload.logoKanan;
        }
        if (payload.logoKiri !== undefined) {
          tgrState.logoKiri = payload.logoKiri;
          state.logoKiri = payload.logoKiri;
        }
        if (payload.logoTengah !== undefined) {
          tgrState.logoTengah = payload.logoTengah;
          state.logoTengah = payload.logoTengah;
        }
        break;
      }
      case 'START_MATCH': {
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
        recalculateArenaScores(arena);
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
        
        state.dewanPenalties.merah.binaan1 = false;
        state.dewanPenalties.merah.binaan2 = false;
        state.dewanPenalties.biru.binaan1 = false;
        state.dewanPenalties.biru.binaan2 = false;
        recalculateArenaScores(arena);
        break;
      }
      case 'APPROVE_NEXT_BABAK': {
        if (state.currentBabak < 3) {
          state.currentBabak += 1;
          state.timerSeconds = state.selectedWaktu;
          state.timerActive = false;
          state.matchStatus = 'paused';
          
          state.dewanPenalties.merah.binaan1 = false;
          state.dewanPenalties.merah.binaan2 = false;
          state.dewanPenalties.biru.binaan1 = false;
          state.dewanPenalties.biru.binaan2 = false;
          recalculateArenaScores(arena);
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
        const init = createInitialMatchState(arena.info.nama);
        arena.state = {
          ...arena.state,
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

        arena.state.namaEvent = payload.namaEvent || arena.state.namaEvent;
        arena.state.partai = payload.partai || arena.state.partai;
        arena.state.kelas = payload.kelas || arena.state.kelas;
        arena.state.gender = payload.gender || arena.state.gender;
        if (payload.selectedWaktu) {
          arena.state.selectedWaktu = payload.selectedWaktu;
        }
        arena.state.activeBaganCategoryId = payload.activeBaganCategoryId !== undefined ? payload.activeBaganCategoryId : arena.state.activeBaganCategoryId;
        arena.state.activeBaganMatchId = payload.activeBaganMatchId !== undefined ? payload.activeBaganMatchId : arena.state.activeBaganMatchId;
        
        arena.state.atletMerah = { ...arena.state.atletMerah, ...payload.atletMerah };
        arena.state.atletBiru = { ...arena.state.atletBiru, ...payload.atletBiru };
        arena.state.timerSeconds = arena.state.selectedWaktu;
        
        recalculateArenaScores(arena);
        break;
      }
      case 'RESET_OR_NEXT_PARTAI': {
        const existingCategories = state.baganCategories;
        const existingLogos = {
          logoKiri: state.logoKiri,
          logoKanan: state.logoKanan,
          logoTengah: state.logoTengah
        };
        const init = createInitialMatchState(arena.info.nama);
        arena.state = {
          ...arena.state,
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
        recalculateArenaScores(arena);
        break;
      }
      case 'JURI_HIT': {
        if (state.matchStatus !== 'running' || !state.timerActive) {
          break;
        }

        const { juriId, sudut, aksi } = payload as { juriId: 1 | 2 | 3; sudut: 'merah' | 'biru'; aksi: 'punch' | 'kick' };
        const now = Date.now();
        const b = state.currentBabak;

        const pts = aksi === 'punch' ? 1 : 2;
        state.juriRawScores[`juri${juriId}`][sudut][b] += pts;

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

        const candidate = state.juriHits.find(hit => 
          hit.isMatched === false &&
          hit.juriId !== juriId &&
          hit.sudut === sudut &&
          hit.aksi === aksi &&
          hit.babak === b &&
          Math.abs(hit.timestamp - now) <= 1500
        );

        if (candidate) {
          newHit.isMatched = true;
          candidate.isMatched = true;

          if (sudut === 'merah') {
            const currentRoundScore = state.scores.merah[`babak${b}` as keyof ScoreBreakdown] || 0;
            state.scores.merah[`babak${b}` as keyof Omit<ScoreBreakdown, 'total'>] = currentRoundScore + pts;
          } else {
            const currentRoundScore = state.scores.biru[`babak${b}` as keyof ScoreBreakdown] || 0;
            state.scores.biru[`babak${b}` as keyof Omit<ScoreBreakdown, 'total'>] = currentRoundScore + pts;
          }

          state.lastValidScore = {
            timestamp: now,
            sudut,
            aksi
          };
          recalculateArenaScores(arena);
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
        
        state.dewanPenalties[sudut][penaltyType] = !val;

        if (penaltyType === 'disqualified' && state.dewanPenalties[sudut][penaltyType]) {
          determineArenaWinner(arena);
        } else {
          recalculateArenaScores(arena);
        }
        break;
      }
      case 'DEWAN_UNDUR_DIRI': {
        const { sudut } = payload as { sudut: 'merah' | 'biru' };
        state.winner = sudut === 'merah' ? 'biru' : 'merah';
        state.matchStatus = 'selesai';
        state.timerActive = false;

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
        arena.histories.push(newHistory);

        if (state.activeBaganCategoryId && state.activeBaganMatchId) {
          updateArenaBaganWinner(arena, state.activeBaganCategoryId, state.activeBaganMatchId, state.winner);
        }
        break;
      }
      case 'DEWAN_WMP': {
        const { winnerCorner } = payload as { winnerCorner: 'merah' | 'biru' };
        state.winner = winnerCorner;
        state.matchStatus = 'selesai';
        state.timerActive = false;

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
        arena.histories.push(newHistory);

        if (state.activeBaganCategoryId && state.activeBaganMatchId) {
          updateArenaBaganWinner(arena, state.activeBaganCategoryId, state.activeBaganMatchId, state.winner);
        }
        break;
      }
      case 'DEWAN_K_TEKNIK': {
        const { winnerCorner } = payload as { winnerCorner: 'merah' | 'biru' };
        state.winner = winnerCorner;
        state.matchStatus = 'selesai';
        state.timerActive = false;

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
        arena.histories.push(newHistory);

        if (state.activeBaganCategoryId && state.activeBaganMatchId) {
          updateArenaBaganWinner(arena, state.activeBaganCategoryId, state.activeBaganMatchId, state.winner);
        }
        break;
      }
      case 'DEWAN_UNDO': {
        const { sudut } = payload as { sudut: 'merah' | 'biru' };
        if (state.directPoints[sudut] > 0) {
          state.directPoints[sudut] = Math.max(0, state.directPoints[sudut] - 3);
        } else {
          const pen = state.dewanPenalties[sudut];
          if (pen.disqualified) pen.disqualified = false;
          else if (pen.peringatan2) pen.peringatan2 = false;
          else if (pen.peringatan1) pen.peringatan1 = false;
          else if (pen.teguran2) pen.teguran2 = false;
          else if (pen.teguran1) pen.teguran1 = false;
          else if (pen.binaan2) pen.binaan2 = false;
          else if (pen.binaan1) pen.binaan1 = false;
        }
        recalculateArenaScores(arena);
        break;
      }
      case 'DEWAN_JATUHAN': {
        const { sudut } = payload as { sudut: 'merah' | 'biru' };
        state.directPoints[sudut] += 3;
        state.lastValidScore = {
          timestamp: Date.now(),
          sudut,
          aksi: 'kick'
        };
        recalculateArenaScores(arena);
        break;
      }
      case 'DEWAN_BATAL_JATUHAN': {
        const { sudut } = payload as { sudut: 'merah' | 'biru' };
        state.directPoints[sudut] = Math.max(0, state.directPoints[sudut] - 3);
        recalculateArenaScores(arena);
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

          const v = state.verification.votes;
          if (v.juri1 && v.juri2 && v.juri3) {
            const counts = { MERAH: 0, BIRU: 0, TIDAK_SAH: 0 };
            counts[v.juri1]++;
            counts[v.juri2]++;
            counts[v.juri3]++;

            let maj: 'MERAH' | 'BIRU' | 'TIDAK_SAH' = 'TIDAK_SAH';
            if (counts.MERAH >= 2) maj = 'MERAH';
            else if (counts.BIRU >= 2) maj = 'BIRU';

            state.verification.result = maj;
            
            if (state.verification.type === 'JATUHAN') {
              if (maj === 'MERAH') {
                state.directPoints.merah += 3;
              } else if (maj === 'BIRU') {
                state.directPoints.biru += 3;
              }
            }
            recalculateArenaScores(arena);
          }
        }
        break;
      }
      case 'DEWAN_VERIFY_RESOLVE': {
        state.verification = {
          active: false,
          type: null,
          votes: { juri1: null, juri2: null, juri3: null },
          result: null
        };
        break;
      }
      case 'CLEAR_HISTORY': {
        arena.histories = [];
        break;
      }
      case 'IMPORT_ROSTERS': {
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
        recalculateArenaScores(arena);
        break;
      }
      case 'SEKRETARIS_DECLARE_WINNER': {
        const { winner } = payload as { winner: 'merah' | 'biru' | null };
        state.winner = winner;
        state.matchStatus = 'selesai';
        state.timerActive = false;

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
        arena.histories.push(newHistory);

        if (state.activeBaganCategoryId && state.activeBaganMatchId) {
          updateArenaBaganWinner(arena, state.activeBaganCategoryId, state.activeBaganMatchId, state.winner);
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
          let currentIndex = scheduledList.findIndex(item => item.num === currentPartaiNum);
          let targetIndex = -1;
          if (currentIndex !== -1) {
            targetIndex = currentIndex + offset;
          } else {
            if (offset > 0) {
              targetIndex = scheduledList.findIndex(item => item.num > currentPartaiNum);
              if (targetIndex === -1) targetIndex = scheduledList.length - 1;
            } else {
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
            const existingCategories = state.baganCategories;
            const existingLogos = {
              logoKiri: state.logoKiri,
              logoKanan: state.logoKanan,
              logoTengah: state.logoTengah
            };
            const init = createInitialMatchState(arena.info.nama);
            arena.state = {
              ...arena.state,
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
            
            arena.state.partai = selected.num.toString().padStart(2, '0');
            arena.state.kelas = selected.catName.replace(/\s*\(.*\)/, '');
            arena.state.gender = selected.gender;
            arena.state.activeBaganCategoryId = selected.catId;
            arena.state.activeBaganMatchId = selected.m.id;
            arena.state.atletMerah = {
              nama: selected.m.atletMerah.nama || "Sudut Merah",
              kontingen: selected.m.atletMerah.kontingen || "SUDUT MERAH"
            };
            arena.state.atletBiru = {
              nama: selected.m.atletBiru.nama || "Sudut Biru",
              kontingen: selected.m.atletBiru.kontingen || "SUDUT BIRU"
            };
            arena.state.timerSeconds = arena.state.selectedWaktu;
            recalculateArenaScores(arena);
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
        if (payload.sistemSeni) {
          tgrState.sistemSeni = payload.sistemSeni;
        }
        if (payload.jumlahPesertaPerPartai) {
          tgrState.jumlahPesertaPerPartai = payload.jumlahPesertaPerPartai;
        }
        if (payload.selectedWaktu) {
          tgrState.selectedWaktu = payload.selectedWaktu;
        }
        recalculateArenaTGRScores(arena);
        break;
      }
      case 'TGR_SET_SISTEM_SENI': {
        tgrState.sistemSeni = payload.sistem || payload.sistemSeni || 'pool';
        recalculateArenaTGRScores(arena);
        break;
      }
      case 'TGR_SET_ACTIVE_VS_MATCH': {
        tgrState.activeVSMatch = payload.match;
        if (payload.match?.partai) {
          tgrState.partai = payload.match.partai;
        }
        if (payload.match?.round) {
          tgrState.babak = payload.match.round;
        }
        if (payload.match?.activeSudut) {
          const pId = payload.match.activeSudut === 'merah' 
            ? payload.match.merahPesertaId 
            : payload.match.biruPesertaId;
          if (pId) {
            tgrState.activePesertaId = pId;
          }
        }
        recalculateArenaTGRScores(arena);
        break;
      }
      case 'TGR_SET_ACTIVE_PESERTA': {
        tgrState.activePesertaId = payload.pesertaId;
        const activeP = tgrState.pesertaList.find(p => p.id === payload.pesertaId);
        if (activeP) {
          tgrState.partai = activeP.partai || `PARTAI ${activeP.partaiNumber || activeP.noUrut}`;
        }
        recalculateArenaTGRScores(arena);
        break;
      }
      case 'TGR_UPDATE_PESERTA': {
        const { action, peserta } = payload;
        if (action === 'add') {
          const newNoUrut = peserta.noUrut || (tgrState.pesertaList.length + 1);
          tgrState.pesertaList.push({
            id: peserta.id || Math.random().toString(36).substring(2),
            noUrut: newNoUrut,
            noUndian: peserta.noUndian || newNoUrut,
            partai: peserta.partai || `PARTAI ${peserta.partaiNumber || newNoUrut}`,
            partaiNumber: peserta.partaiNumber || newNoUrut,
            pool: peserta.pool || `Pool A`,
            gender: peserta.gender || 'Putra',
            usia: peserta.usia || 'Dewasa',
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
            tgrState.partai = peserta.partai || `PARTAI ${peserta.partaiNumber || newNoUrut}`;
          }
        } else if (action === 'edit') {
          const idx = tgrState.pesertaList.findIndex(p => p.id === peserta.id);
          if (idx !== -1) {
            tgrState.pesertaList[idx] = {
              ...tgrState.pesertaList[idx],
              ...peserta
            };
            if (tgrState.activePesertaId === peserta.id) {
              tgrState.partai = peserta.partai || `PARTAI ${peserta.partaiNumber || peserta.noUrut}`;
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
              tgrState.partai = activeP.partai || `PARTAI ${activeP.partaiNumber || activeP.noUrut}`;
            }
          }
        } else if (action === 'sync_list') {
          tgrState.pesertaList = payload.pesertaList.map((p: any, idx: number) => ({
            id: p.id || Math.random().toString(36).substring(2),
            noUrut: p.noUrut || (idx + 1),
            noUndian: p.noUndian !== undefined ? p.noUndian : (idx + 1),
            partai: p.partai || `PARTAI ${p.partaiNumber || idx + 1}`,
            partaiNumber: p.partaiNumber !== undefined ? p.partaiNumber : (idx + 1),
            pool: p.pool || `Pool A`,
            gender: p.gender || 'Putra',
            usia: p.usia || 'Dewasa',
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
              tgrState.partai = activeP.partai || `PARTAI ${activeP.partaiNumber || activeP.noUrut}`;
            }
          }
        }
        recalculateArenaTGRScores(arena);
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
            peserta.finalizedJuries = peserta.finalizedJuries.filter(id => id !== juriId);
          }

          recalculateArenaTGRScores(arena);
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
          recalculateArenaTGRScores(arena);
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
            recalculateArenaTGRScores(arena);
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
          recalculateArenaTGRScores(arena);
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
            recalculateArenaTGRScores(arena);
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
            recalculateArenaTGRScores(arena);
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

    // Persist all state changes to local server storage
    const isCriticalAction = [
      'START_MATCH', 'RESET_OR_NEXT_PARTAI', 'SET_BABAK', 'ADD_GELANGGANG', 'DELETE_GELANGGANG',
      'RESET_GELANGGANG', 'DEWAN_PENALTY', 'TGR_CONFIRM_PESERTA_SCORE', 'TGR_CANCEL_SCORE',
      'TGR_ADD_PESERTA', 'TGR_DELETE_PESERTA', 'UPDATE_BAGAN_CATEGORIES', 'TRANSFER_CATEGORY_TO_ARENA',
      'LOAD_BAGAN_MATCH', 'SEKRETARIS_ADJUST_PARTAI', 'RESET_MATCH', 'TGR_RESET_SESSION'
    ].includes(type);

    saveLocalStorage(isCriticalAction);
    broadcastState();
    res.json({
      success: true,
      state,
      tgrState,
      histories: arena.histories,
      arenaId: arena.info.id,
      arenasList: getArenasList(),
      allArenasSummary: getArenasSummary(),
      arenas: getArenasMapData()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// History download route as JSON/CSV
app.get('/api/history/download', (req, res) => {
  const reqArena = (req.query.arena as string) || 'arena_1';
  const arena = getArena(reqArena);

  let csv = 'No,Tanggal,Gelanggang,Nama Event,Partai,Kelas,Gender,Atlet Merah,Skor Merah,Skor Biru,Atlet Biru,Pemenang\n';
  arena.histories.forEach((h, index) => {
    const winnerName = h.winner === 'merah' ? h.atletMerah.nama : h.winner === 'biru' ? h.atletBiru.nama : 'Seri';
    csv += `${index + 1},"${h.tanggal}","${arena.info.nama}","${h.namaEvent}","${h.partai}","${h.kelas}","${h.gender}","${h.atletMerah.nama} (${h.atletMerah.kontingen})",${h.skorAkhirMerah},${h.skorAkhirBiru},"${h.atletBiru.nama} (${h.atletBiru.kontingen})","${winnerName}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=silat_match_history_${arena.info.id}.csv`);
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
