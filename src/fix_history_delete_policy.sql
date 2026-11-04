-- ============================================================
-- SQL Lengkap: Izin Akses Tabel, Insert Riwayat, Hapus, & Rollback
-- Jalankan query ini di Supabase Dashboard:
-- SQL Editor > New Query > Paste > Run
-- ============================================================

-- 1. Berikan hak akses penuh (GRANT) ke role authenticated, anon, & service_role
GRANT ALL ON TABLE public.token_history TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.token_tracking TO authenticated, anon, service_role;

-- Berikan izin sequence (jika id menggunakan bigint auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- 2. Pastikan Row Level Security aktif
ALTER TABLE public.token_history ENABLE ROW LEVEL SECURITY;

-- 3. Policy LENGKAP untuk token_history (SELECT, INSERT, DELETE)
-- A. SELECT (Membaca Riwayat)
DROP POLICY IF EXISTS "History: read" ON public.token_history;
DROP POLICY IF EXISTS "History: read anon" ON public.token_history;
CREATE POLICY "History: read" ON public.token_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "History: read anon" ON public.token_history FOR SELECT TO anon USING (true);

-- B. INSERT (Menambah Riwayat saat Tambah/Kurang Stok)
DROP POLICY IF EXISTS "History: insert" ON public.token_history;
DROP POLICY IF EXISTS "History: insert anon" ON public.token_history;
CREATE POLICY "History: insert" ON public.token_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "History: insert anon" ON public.token_history FOR INSERT TO anon WITH CHECK (true);

-- C. DELETE (Menghapus Riwayat)
DROP POLICY IF EXISTS "History: delete" ON public.token_history;
DROP POLICY IF EXISTS "History: delete anon" ON public.token_history;
DROP POLICY IF EXISTS "History: delete all" ON public.token_history;
DROP POLICY IF EXISTS "History: admin delete" ON public.token_history;
CREATE POLICY "History: delete" ON public.token_history FOR DELETE TO authenticated USING (true);
CREATE POLICY "History: delete anon" ON public.token_history FOR DELETE TO anon USING (true);

-- D. UPDATE (Mengedit Riwayat)
DROP POLICY IF EXISTS "History: update" ON public.token_history;
DROP POLICY IF EXISTS "History: update anon" ON public.token_history;
CREATE POLICY "History: update" ON public.token_history FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "History: update anon" ON public.token_history FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 4. Pastikan izin UPDATE pada token_tracking agar rollback stok berhasil
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'token_tracking') THEN
    ALTER TABLE public.token_tracking ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Token tracking: authenticated update" ON public.token_tracking;
    CREATE POLICY "Token tracking: authenticated update" ON public.token_tracking
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
