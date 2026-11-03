-- ============================================================
-- Jalankan query ini di Supabase SQL Editor jika database menolak
-- jenis token baru (menghapus batasan hanya 'glass' dan 'tumbler')
-- ============================================================

-- 1. Hapus batasan check constraint jenis token jika ada
ALTER TABLE public.token_tracking DROP CONSTRAINT IF EXISTS token_tracking_token_type_check;
ALTER TABLE public.tokens DROP CONSTRAINT IF EXISTS tokens_token_type_check;

-- 2. Pastikan kolom token_type bertipe teks bebas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'token_tracking' AND column_name = 'token_type'
  ) THEN
    ALTER TABLE public.token_tracking ALTER COLUMN token_type TYPE TEXT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tokens' AND column_name = 'token_type'
  ) THEN
    ALTER TABLE public.tokens ALTER COLUMN token_type TYPE TEXT;
  END IF;
END $$;
