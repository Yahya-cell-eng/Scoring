-- =======================================================
-- SISTEM SKORING DIGITAL PENCAK SILAT IPSI
-- Skema Database PostgreSQL Supabase
-- =======================================================
-- Jalankan skrip ini di SQL Editor dashboard Supabase Anda.

-- 1. Tabel Status Gelanggang Real-Time (Multi-Arena)
CREATE TABLE IF NOT EXISTS arenas_state (
  arena_id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  mode_aktif TEXT DEFAULT 'tanding', -- 'tanding' | 'seni'
  state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  tgr_state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  info_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabel Riwayat Hasil Pertandingan Tanding
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
  winner TEXT, -- 'merah' | 'biru' | 'seri'
  status TEXT DEFAULT 'Selesai',
  tanggal TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  full_history JSONB
);

-- 3. Tabel Riwayat Hasil Seni (TGR)
CREATE TABLE IF NOT EXISTS seni_results (
  id TEXT PRIMARY KEY,
  arena_id TEXT NOT NULL,
  peserta_nama TEXT,
  kontingen TEXT,
  kategori TEXT, -- 'tunggal' | 'ganda' | 'beregu' | 'solo_kreatif'
  kelas TEXT,
  gender TEXT,
  pool TEXT,
  skor_akhir NUMERIC(7,3) DEFAULT 0,
  hukuman NUMERIC(5,2) DEFAULT 0,
  waktu_tampil INT DEFAULT 0,
  rank INT,
  tanggal TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabel Roster Peserta & Distribusi Gelanggang
CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kontingen TEXT NOT NULL,
  kategori_type TEXT DEFAULT 'tanding', -- 'tanding' | 'seni'
  kategori_seni TEXT, -- 'tunggal' | 'ganda' | 'beregu' | 'solo_kreatif'
  kelas TEXT,
  gender TEXT,
  kategori_usia TEXT,
  gelanggang_id TEXT,
  status TEXT DEFAULT 'Terdaftar',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE arenas_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE seni_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses: Izinkan Akses Publik (Anon) untuk aplikasi pertandingan
DROP POLICY IF EXISTS "Public access arenas_state" ON arenas_state;
CREATE POLICY "Public access arenas_state" ON arenas_state FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access matches" ON matches;
CREATE POLICY "Public access matches" ON matches FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access seni_results" ON seni_results;
CREATE POLICY "Public access seni_results" ON seni_results FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access participants" ON participants;
CREATE POLICY "Public access participants" ON participants FOR ALL USING (true) WITH CHECK (true);

-- Aktifkan Supabase Realtime Replication pada tabel status dan hasil
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'arenas_state'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE arenas_state;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE matches;
  END IF;
END $$;
