
import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim()

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Konfigurasi Supabase belum lengkap')
}

const url = new URL(supabaseUrl)

if (
  !['http:', 'https:'].includes(url.protocol) ||
  (url.pathname !== '/' && url.pathname !== '') ||
  url.search ||
  url.hash
) {
  throw new Error(
    'VITE_SUPABASE_URL harus berisi Project URL, tanpa /rest/v1 atau /auth/v1'
  )
}

// Bersihkan token lama di localStorage jika ada agar wajib login saat web dibuka
if (typeof window !== 'undefined') {
  try {
    Object.keys(window.localStorage).forEach((key) => {
      if (key.startsWith('sb-') || key.includes('supabase.auth')) {
        window.localStorage.removeItem(key)
      }
    })
  } catch {
    // Abaikan jika localStorage tidak dapat diakses
  }
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
