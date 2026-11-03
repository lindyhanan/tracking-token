-- ============================================================
-- TokenTrack Database Schema
-- Jalankan di Supabase SQL Editor (menu: SQL Editor > New Query)
-- ============================================================

-- 1. Tabel profiles (ekstensi dari auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel tokens (stok token)
CREATE TABLE IF NOT EXISTS public.tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_type TEXT NOT NULL CHECK (token_type IN ('glass', 'tumbler')),
  total_stock INTEGER NOT NULL DEFAULT 0 CHECK (total_stock >= 0),
  taken_quantity INTEGER NOT NULL DEFAULT 0 CHECK (taken_quantity >= 0),
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel token_history (audit log)
CREATE TABLE IF NOT EXISTS public.token_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID REFERENCES public.tokens(id) ON DELETE SET NULL,
  token_type TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('add', 'reduce', 'update')),
  quantity_changed INTEGER NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  description TEXT,
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS tokens_updated_at ON public.tokens;
CREATE TRIGGER tokens_updated_at
  BEFORE UPDATE ON public.tokens
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- TRIGGER: auto-create profile saat user baru register
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengguna Baru'),
    'member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_history ENABLE ROW LEVEL SECURITY;

-- Profiles: setiap user bisa baca semua, edit profil sendiri
CREATE POLICY "Profiles: read all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Admin bisa update semua profiles
CREATE POLICY "Profiles: admin update all" ON public.profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Tokens: semua authenticated user bisa baca
CREATE POLICY "Tokens: read" ON public.tokens FOR SELECT TO authenticated USING (true);

-- Tokens: hanya admin yang bisa insert/update/delete
CREATE POLICY "Tokens: admin insert" ON public.tokens FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Tokens: admin update" ON public.tokens FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Tokens: admin delete" ON public.tokens FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Token member bisa update taken_quantity (untuk mencatat pengambilan sendiri)
CREATE POLICY "Tokens: member reduce" ON public.tokens FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- History: semua authenticated user bisa baca, insert, dan delete
CREATE POLICY "History: read" ON public.token_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "History: insert" ON public.token_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "History: delete" ON public.token_history FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TABLE PRIVILEGES (GRANTS)
-- ============================================================
GRANT ALL ON TABLE public.profiles TO authenticated, anon;
GRANT ALL ON TABLE public.tokens TO authenticated, anon;
GRANT ALL ON TABLE public.token_history TO authenticated, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- ============================================================
-- CATATAN SETELAH MENJALANKAN SQL INI:
-- 1. Buka Supabase Dashboard > Authentication > Providers
--    Pastikan Email provider aktif
-- 2. Buka Authentication > URL Configuration
--    Set Site URL ke http://localhost:5173 (untuk development)
-- 3. Untuk user pertama (admin), register dulu lalu update manual:
--    UPDATE profiles SET role = 'admin' WHERE id = '<user-id-anda>';
-- ============================================================
