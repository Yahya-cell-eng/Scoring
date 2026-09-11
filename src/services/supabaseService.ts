/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { GelanggangInfo, MatchHistory, MatchState, TGRState } from '../types';

const STORAGE_KEY_URL = 'silat_supabase_url';
const STORAGE_KEY_KEY = 'silat_supabase_anon_key';
const STORAGE_KEY_SYNC_ENABLED = 'silat_supabase_auto_sync';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let cachedClient: SupabaseClient | null = null;
let cachedClientUrl = '';
let cachedClientKey = '';

/**
 * Get active Supabase configuration from environment variables or local storage
 */
export function getStoredSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

  return {
    url: localUrl.trim() || envUrl.trim(),
    anonKey: localKey.trim() || envKey.trim()
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  // Invalidate cached client
  cachedClient = null;
  cachedClientUrl = '';
  cachedClientKey = '';
}

export function clearStoredSupabaseConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_KEY);
  cachedClient = null;
  cachedClientUrl = '';
  cachedClientKey = '';
}

export function isSupabaseConfigured(): boolean {
  const cfg = getStoredSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey);
}

export function getSupabaseAutoSyncEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY_SYNC_ENABLED) === 'true';
}

export function setSupabaseAutoSyncEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_SYNC_ENABLED, enabled ? 'true' : 'false');
}

/**
 * Lazy-init Supabase client
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();
  if (!url || !anonKey) return null;

  if (cachedClient && cachedClientUrl === url && cachedClientKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    cachedClientUrl = url;
    cachedClientKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; message: string; tablesDetected?: string[] }> {
  try {
    const targetUrl = (url || getStoredSupabaseConfig().url).trim();
    const targetKey = (anonKey || getStoredSupabaseConfig().anonKey).trim();

    if (!targetUrl || !targetKey) {
      return { success: false, message: 'URL atau Anon Key Supabase belum diisi' };
    }

    const client = createClient(targetUrl, targetKey);
    // Attempt a lightweight select from arenas_state or matches
    const { data, error } = await client.from('arenas_state').select('arena_id').limit(1);

    if (error) {
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Terhubung ke Supabase! Perhatian: Tabel arenas_state belum dibuat. Silakan jalankan Skrip SQL di dashboard Supabase.'
        };
      }
      return { success: false, message: `Error Supabase (${error.code}): ${error.message}` };
    }

    return {
      success: true,
      message: 'Koneksi ke Supabase berhasil! Tabel siap digunakan.',
      tablesDetected: ['arenas_state']
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal tersambung ke Supabase' };
  }
}

/**
 * Sync single arena state to Supabase
 */
export async function syncArenaStateToSupabase(
  arenaId: string,
  arenaData: { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('arenas_state').upsert({
      arena_id: arenaId,
      nama: arenaData.info?.nama || arenaId,
      mode_aktif: arenaData.info?.modeAktif || 'tanding',
      state_data: arenaData.state,
      tgr_state_data: arenaData.tgrState,
      info_data: arenaData.info,
      updated_at: new Date().toISOString()
    }, { onConflict: 'arena_id' });

    if (error) {
      console.warn(`Supabase upsert arenas_state warning for ${arenaId}:`, error);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`Supabase sync error for ${arenaId}:`, e);
    return false;
  }
}

/**
 * Sync all arenas state to Supabase
 */
export async function syncAllArenasToSupabase(
  arenasMap: Record<string, { state: MatchState; tgrState: TGRState; histories: MatchHistory[]; info: GelanggangInfo }>
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Klien Supabase belum terkonfigurasi' };
  }

  try {
    let count = 0;
    for (const [arenaId, container] of Object.entries(arenasMap)) {
      const ok = await syncArenaStateToSupabase(arenaId, container);
      if (ok) count++;
    }

    // Also push match histories to 'matches' table
    for (const container of Object.values(arenasMap)) {
      if (container.histories && container.histories.length > 0) {
        for (const h of container.histories) {
          await client.from('matches').upsert({
            id: h.id,
            arena_id: h.gelanggang || 'arena_1',
            partai: h.partai,
            kelas: h.kelas,
            gender: h.gender,
            babak: (h as any).babak || 'Selesai',
            atlet_merah: h.atletMerah?.nama,
            kontingen_merah: h.atletMerah?.kontingen,
            skor_merah: h.skorAkhirMerah,
            atlet_biru: h.atletBiru?.nama,
            kontingen_biru: h.atletBiru?.kontingen,
            skor_biru: h.skorAkhirBiru,
            winner: h.winner,
            status: 'Selesai',
            tanggal: new Date(h.timestamp || Date.now()).toISOString(),
            full_history: h
          }, { onConflict: 'id' });
        }
      }
    }

    return { success: true, count };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message };
  }
}

/**
 * Subscribe to Supabase Realtime for instant multi-device sync
 */
export function subscribeToSupabaseRealtime(
  onArenaStateChange: (arenaId: string, payload: any) => void
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channel: RealtimeChannel = client
      .channel('silat-arenas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arenas_state' },
        (payload) => {
          if (payload.new && (payload.new as any).arena_id) {
            const row = payload.new as any;
            onArenaStateChange(row.arena_id, {
              state: row.state_data,
              tgrState: row.tgr_state_data,
              info: row.info_data
            });
          }
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Failed to setup Supabase Realtime channel:', err);
    return null;
  }
}

export const SUPABASE_SQL_SAMPLE = `-- Jalankan skrip ini di SQL Editor dashboard Supabase Anda:
CREATE TABLE IF NOT EXISTS arenas_state (
  arena_id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  mode_aktif TEXT DEFAULT 'tanding',
  state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  tgr_state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  info_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  arena_id TEXT NOT NULL,
  partai INT,
  kelas TEXT,
  gender TEXT,
  babak TEXT,
  atlet_merah TEXT,
  kontingen_merah TEXT,
  skor_merah INT DEFAULT 0,
  atlet_biru TEXT,
  kontingen_biru TEXT,
  skor_biru INT DEFAULT 0,
  winner TEXT,
  status TEXT DEFAULT 'Selesai',
  tanggal TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  full_history JSONB
);

ALTER TABLE arenas_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access arenas_state" ON arenas_state FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access matches" ON matches FOR ALL USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE arenas_state;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
`;
