-- ============================================================
-- SQL untuk Memperbaiki "permission denied for table token_history"
-- Jalankan query ini di Supabase Dashboard:
-- SQL Editor > New Query > Paste > Run
-- ============================================================

-- 1. Berikan izin hak akses tabel (GRANT) ke role authenticated & anon
GRANT ALL ON TABLE public.token_history TO authenticated;
GRANT ALL ON TABLE public.token_history TO anon;
GRANT ALL ON TABLE public.token_history TO service_role;

-- Berikan izin sequence (jika id menggunakan bigint auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 2. Pastikan Row Level Security aktif
ALTER TABLE public.token_history ENABLE ROW LEVEL SECURITY;

-- 3. Pasang Policy DELETE
DROP POLICY IF EXISTS "History: delete" ON public.token_history;
DROP POLICY IF EXISTS "History: delete all" ON public.token_history;
DROP POLICY IF EXISTS "History: admin delete" ON public.token_history;

CREATE POLICY "History: delete" ON public.token_history
  FOR DELETE
  TO authenticated
  USING (true);

-- (Opsional) Jika user belum login / guest juga diizinkan menghapus:
CREATE POLICY "History: delete anon" ON public.token_history
  FOR DELETE
  TO anon
  USING (true);
