import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'

import { supabase } from '@/lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProfile = useCallback(async (userId, userEmail = '', userMetadata = {}) => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        console.warn('Gagal memuat profil:', profileError.message)
      }

      if (data) {
        setProfile(data)
      } else {
        // Fallback jika belum tersinkronisasi di tabel profiles
        setProfile({
          id: userId,
          full_name: userMetadata?.full_name || userEmail.split('@')[0] || 'Pengguna',
          role: 'member',
        })
      }
    } catch (err) {
      console.warn('Exception profil:', err)
      setProfile({
        id: userId,
        full_name: userMetadata?.full_name || userEmail.split('@')[0] || 'Pengguna',
        role: 'member',
      })
    }
  }, [])

  useEffect(() => {
    let mounted = true

    // Dapatkan sesi yang sedang aktif
    supabase.auth.getSession().then(({ data: { session: currentSession }, error: sessionError }) => {
      if (!mounted) return
      if (sessionError) {
        setError(sessionError.message)
      }

      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        fetchProfile(
          currentSession.user.id,
          currentSession.user.email,
          currentSession.user.user_metadata
        ).finally(() => {
          if (mounted) setLoading(false)
        })
      } else {
        setProfile(null)
        setLoading(false)
      }
    }).catch((err) => {
      if (mounted) {
        setError(err.message)
        setLoading(false)
      }
    })

    // Dengarkan perubahan status login/logout
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      setUser(newSession?.user ?? null)

      if (newSession?.user) {
        await fetchProfile(
          newSession.user.id,
          newSession.user.email,
          newSession.user.user_metadata
        )
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  // Masuk dengan Email dan Password
  const signIn = useCallback(async ({ email, password }) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) throw authError

      // Update state langsung agar tidak terjadi race condition saat redirect
      if (data?.session) {
        setSession(data.session)
        setUser(data.user)
        if (data.user) {
          await fetchProfile(data.user.id, data.user.email, data.user.user_metadata)
        }
      }

      return { data, error: null }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchProfile])

  // Daftar akun baru dengan Nama, Email, Password
  const signUp = useCallback(async ({ email, password, fullName }) => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })
      if (authError) throw authError

      if (data?.session) {
        setSession(data.session)
        setUser(data.user)
        if (data.user) {
          await fetchProfile(data.user.id, data.user.email, data.user.user_metadata)
        }
      }

      return { data, error: null }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchProfile])

  // Keluar dari akun
  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      setSession(null)
      setUser(null)
      setProfile(null)
      return { error: null }
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const value = useMemo(() => ({
    session,
    user,
    profile,
    loading,
    error,
    isAdmin: profile?.role === 'admin',
    isMember: profile?.role === 'member',
    isAuthenticated: Boolean(user),
    signIn,
    signUp,
    signOut,
  }), [session, user, profile, loading, error, signIn, signUp, signOut])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth harus digunakan dalam AuthProvider')
  }
  return context
}
