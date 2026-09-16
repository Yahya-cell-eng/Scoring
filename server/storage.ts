/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { arenasMap, type ArenaContainer } from './arenas.ts';
import {
  masterDataState,
  adminCredentials,
  type AdminCredential,
  defaultTournamentInfo,
  defaultReferees,
  defaultAssignments
} from './masterData.ts';
import type { StorageStatus, StorageFileInfo, MasterDataState } from '../src/types.ts';

// Root directory for persistent local server storage
const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

const MASTER_DATA_FILE = path.join(DATA_DIR, 'master_data.json');
const ARENAS_DATA_FILE = path.join(DATA_DIR, 'arenas_data.json');
const ADMIN_CREDENTIALS_FILE = path.join(DATA_DIR, 'admin_credentials.json');
const STORAGE_META_FILE = path.join(DATA_DIR, 'storage_meta.json');

let lastSavedTimestamp: string | null = null;
let saveCount = 0;
let debounceTimeout: NodeJS.Timeout | null = null;
let isSaving = false;

/**
 * Format bytes into human readable string (KB, MB)
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Atomic write helper to prevent partial/corrupted files during power loss or server termination
 */
const atomicWriteJson = (filePath: string, data: any) => {
  const tempPath = `${filePath}.tmp_${Date.now()}`;
  const serialized = JSON.stringify(data, null, 2);
  fs.writeFileSync(tempPath, serialized, 'utf-8');
  fs.renameSync(tempPath, filePath);
};

/**
 * Initializes persistent local server storage on server boot.
 * Creates the ./data directory and loads saved state from disk if available.
 */
export const initLocalStorage = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    // 1. Load or Initialize Master Data
    if (fs.existsSync(MASTER_DATA_FILE)) {
      try {
        const raw = fs.readFileSync(MASTER_DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.tournament) masterDataState.tournament = parsed.tournament;
          if (Array.isArray(parsed.referees)) masterDataState.referees = parsed.referees;
          if (parsed.assignments) masterDataState.assignments = parsed.assignments;
          if (Array.isArray(parsed.auditLogs)) masterDataState.auditLogs = parsed.auditLogs;
          console.log(`[Storage Lokal] Master data turnamen & wasit berhasil dimuat dari ${MASTER_DATA_FILE}`);
        }
      } catch (err) {
        console.error('[Storage Lokal] Gagal membaca master_data.json, menggunakan data default:', err);
      }
    } else {
      atomicWriteJson(MASTER_DATA_FILE, masterDataState);
      console.log(`[Storage Lokal] File master_data.json baru dibuat di ${MASTER_DATA_FILE}`);
    }

    // 2. Load or Initialize Arenas Data
    if (fs.existsSync(ARENAS_DATA_FILE)) {
      try {
        const raw = fs.readFileSync(ARENAS_DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Clear current default arenas and restore saved arenas
          for (const key of Object.keys(arenasMap)) {
            delete arenasMap[key];
          }
          for (const [key, val] of Object.entries(parsed)) {
            arenasMap[key] = val as ArenaContainer;
          }
          console.log(`[Storage Lokal] Data gelanggang (${Object.keys(arenasMap).length} arena) berhasil dimuat dari ${ARENAS_DATA_FILE}`);
        }
      } catch (err) {
        console.error('[Storage Lokal] Gagal membaca arenas_data.json, menggunakan data default:', err);
      }
    } else {
      atomicWriteJson(ARENAS_DATA_FILE, arenasMap);
      console.log(`[Storage Lokal] File arenas_data.json baru dibuat di ${ARENAS_DATA_FILE}`);
    }

    // 3. Load or Initialize Admin Credentials
    if (fs.existsSync(ADMIN_CREDENTIALS_FILE)) {
      try {
        const raw = fs.readFileSync(ADMIN_CREDENTIALS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          adminCredentials.length = 0;
          parsed.forEach(acc => adminCredentials.push(acc));
          console.log(`[Storage Lokal] Kredensial administrator berhasil dimuat dari ${ADMIN_CREDENTIALS_FILE}`);
        }
      } catch (err) {
        console.error('[Storage Lokal] Gagal membaca admin_credentials.json:', err);
      }
    } else {
      atomicWriteJson(ADMIN_CREDENTIALS_FILE, adminCredentials);
    }

    // 4. Load metadata
    if (fs.existsSync(STORAGE_META_FILE)) {
      try {
        const raw = fs.readFileSync(STORAGE_META_FILE, 'utf-8');
        const meta = JSON.parse(raw);
        lastSavedTimestamp = meta.lastSaved || new Date().toISOString();
        saveCount = meta.saveCount || 0;
      } catch {
        lastSavedTimestamp = new Date().toISOString();
      }
    } else {
      lastSavedTimestamp = new Date().toISOString();
      atomicWriteJson(STORAGE_META_FILE, {
        lastSaved: lastSavedTimestamp,
        saveCount: 0,
        createdAt: new Date().toISOString()
      });
    }

    console.log(`[Storage Lokal] Server lokal siap. Data tersimpan di direktori: ${DATA_DIR}`);
  } catch (error) {
    console.error('[Storage Lokal] Kesalahan fatal inisialisasi penyimpanan lokal:', error);
  }
};

/**
 * Flushes all in-memory data to local server disk synchronously.
 */
const flushToDisk = () => {
  try {
    isSaving = true;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // 1. Save Master Data
    atomicWriteJson(MASTER_DATA_FILE, masterDataState);

    // 2. Save Arenas Data
    atomicWriteJson(ARENAS_DATA_FILE, arenasMap);

    // 3. Save Admin Credentials
    atomicWriteJson(ADMIN_CREDENTIALS_FILE, adminCredentials);

    // 4. Update Meta
    saveCount++;
    lastSavedTimestamp = new Date().toISOString();
    atomicWriteJson(STORAGE_META_FILE, {
      lastSaved: lastSavedTimestamp,
      saveCount,
      totalArenas: Object.keys(arenasMap).length,
      tournamentName: masterDataState.tournament.namaEvent
    });

    isSaving = false;
  } catch (error) {
    isSaving = false;
    console.error('[Storage Lokal] Gagal menyimpan data ke disk server lokal:', error);
  }
};

/**
 * Saves all system data to the local server disk.
 * Supports debounced saves for frequent actions and immediate synchronous saves.
 */
export const saveLocalStorage = (immediate: boolean = false) => {
  if (immediate) {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
      debounceTimeout = null;
    }
    flushToDisk();
    return;
  }

  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

  debounceTimeout = setTimeout(() => {
    debounceTimeout = null;
    flushToDisk();
  }, 600);
};

/**
 * Returns current status and file statistics of the local server storage.
 */
export const getLocalStorageStatus = (): StorageStatus => {
  const files: StorageFileInfo[] = [];

  const fileConfigs = [
    {
      name: 'master_data.json',
      path: MASTER_DATA_FILE,
      description: 'Master data turnamen, daftar 15 wasit-juri, penugasan gelanggang & log audit',
      count: masterDataState.referees.length
    },
    {
      name: 'arenas_data.json',
      path: ARENAS_DATA_FILE,
      description: 'Data pertandingan seluruh gelanggang, skor tanding, penilaian seni TGR, bagan & riwayat partai',
      count: Object.keys(arenasMap).length
    },
    {
      name: 'admin_credentials.json',
      path: ADMIN_CREDENTIALS_FILE,
      description: 'Kredensial login akun administrator sistem & hak akses',
      count: adminCredentials.length
    }
  ];

  let totalHistories = 0;
  for (const arena of Object.values(arenasMap)) {
    totalHistories += (arena.histories || []).length;
  }

  for (const cfg of fileConfigs) {
    try {
      if (fs.existsSync(cfg.path)) {
        const stat = fs.statSync(cfg.path);
        files.push({
          name: cfg.name,
          sizeBytes: stat.size,
          formattedSize: formatBytes(stat.size),
          lastModified: stat.mtime.toISOString(),
          itemCount: cfg.count,
          description: cfg.description
        });
      } else {
        files.push({
          name: cfg.name,
          sizeBytes: 0,
          formattedSize: '0 B',
          lastModified: new Date().toISOString(),
          itemCount: 0,
          description: cfg.description
        });
      }
    } catch {
      // Ignored
    }
  }

  return {
    status: isSaving ? 'saving' : 'active',
    folderPath: DATA_DIR,
    lastSaved: lastSavedTimestamp,
    saveCount,
    files,
    stats: {
      totalArenas: Object.keys(arenasMap).length,
      totalHistories,
      totalReferees: masterDataState.referees.length,
      tournamentName: masterDataState.tournament.namaEvent
    }
  };
};

/**
 * Creates a timestamped snapshot backup in ./data/backups/
 */
export const createLocalBackup = (): { success: boolean; filename: string; filePath: string; timestamp: string } => {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestampStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `silat_backup_${timestampStr}.json`;
    const backupFilePath = path.join(BACKUPS_DIR, filename);

    const snapshot = {
      version: '1.0.0',
      createdAt: now.toISOString(),
      generator: 'Sistem Skoring Digital Pencak Silat IPSI',
      masterData: masterDataState,
      arenas: arenasMap,
      adminCredentials
    };

    atomicWriteJson(backupFilePath, snapshot);

    return {
      success: true,
      filename,
      filePath: backupFilePath,
      timestamp: now.toISOString()
    };
  } catch (error: any) {
    console.error('[Storage Lokal] Gagal membuat backup:', error);
    throw new Error(`Gagal membuat backup: ${error.message}`);
  }
};

/**
 * Exports complete database dump for client download
 */
export const exportFullDatabase = () => {
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    system: 'Sistem Skoring Digital Pencak Silat IPSI',
    masterData: masterDataState,
    arenas: arenasMap,
    adminCredentials
  };
};

/**
 * Restores entire database from an imported JSON dump
 */
export const importFullDatabase = (dump: any): { success: boolean; message: string } => {
  if (!dump || typeof dump !== 'object') {
    throw new Error('Format file backup tidak valid.');
  }

  // Restore Master Data
  if (dump.masterData) {
    if (dump.masterData.tournament) masterDataState.tournament = dump.masterData.tournament;
    if (Array.isArray(dump.masterData.referees)) masterDataState.referees = dump.masterData.referees;
    if (dump.masterData.assignments) masterDataState.assignments = dump.masterData.assignments;
    if (Array.isArray(dump.masterData.auditLogs)) masterDataState.auditLogs = dump.masterData.auditLogs;
  }

  // Restore Arenas Data
  if (dump.arenas && typeof dump.arenas === 'object') {
    for (const key of Object.keys(arenasMap)) {
      delete arenasMap[key];
    }
    for (const [key, val] of Object.entries(dump.arenas)) {
      arenasMap[key] = val as ArenaContainer;
    }
  }

  // Restore Admin Credentials if provided
  if (Array.isArray(dump.adminCredentials) && dump.adminCredentials.length > 0) {
    adminCredentials.length = 0;
    dump.adminCredentials.forEach((acc: AdminCredential) => adminCredentials.push(acc));
  }

  // Immediately flush to disk
  saveLocalStorage(true);

  return {
    success: true,
    message: 'Database berhasil dipulihkan dan disimpan ke server lokal.'
  };
};
