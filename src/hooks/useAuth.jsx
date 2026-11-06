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
const LOCAL_META_KEY = 'tokentrack_users_extended_meta_v1'

function readAllLocalMeta() {
  try {
    const raw = localStorage.getItem(LOCAL_META_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeLocalMetaForUser(userId, patch) {
  if (!userId) return {}
  try {
    const all = readAllLocalMeta()
    const current = all[userId] || {}
    const updated = { ...current, ...patch, updated_at: new Date().toISOString() }
    all[userId] = updated
    localStorage.setItem(LOCAL_META_KEY, JSON.stringify(all))
    return updated
  } catch {
    return patch
  }
}

export function getUserExtendedMeta(userId) {
  if (!userId) return {}
  const all = readAllLocalMeta()
  return all[userId] || {}
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchProfile = useCallback(async (userId, userEmail = '', userMetadata = {}) => {
    const localMeta = getUserExtendedMeta(userId)
    const defaultUsername =
      localMeta.username ||
      userMetadata?.username ||
      userEmail?.split('@')[0] ||
      'user'

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
        const merged = {
          ...data,
          full_name:
            data.full_name ||
            localMeta.full_name ||
            userMetadata?.full_name ||
            defaultUsername,
          username: data.username || localMeta.username || userMetadata?.username || defaultUsername,
          role: data.role || localMeta.role || userMetadata?.role || 'member',
          avatar_url:
            data.avatar_url ||
            localMeta.avatar_url ||
            userMetadata?.avatar_url ||
            '',
          department:
            data.department ||
            localMeta.department ||
            userMetadata?.department ||
            '',
          phone: data.phone || localMeta.phone || userMetadata?.phone || '',
        }
        setProfile(merged)
      } else {
        setProfile({
          id: userId,
          full_name:
            localMeta.full_name ||
            userMetadata?.full_name ||
            userEmail.split('@')[0] ||
            'Pengguna',
          username: defaultUsername,
          role: localMeta.role || userMetadata?.role || 'member',
          avatar_url: localMeta.avatar_url || userMetadata?.avatar_url || '',
          department: localMeta.department || userMetadata?.department || '',
          phone: localMeta.phone || userMetadata?.phone || '',
        })
      }
    } catch (err) {
      console.warn('Exception profil:', err)
      setProfile({
        id: userId,
        full_name:
          localMeta.full_name ||
          userMetadata?.full_name ||
          userEmail.split('@')[0] ||
          'Pengguna',
        username: defaultUsername,
        role: localMeta.role || userMetadata?.role || 'member',
        avatar_url: localMeta.avatar_url || userMetadata?.avatar_url || '',
        department: localMeta.department || userMetadata?.department || '',
        phone: localMeta.phone || userMetadata?.phone || '',
      })
    }
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth
      .getSession()
      .then(({ data: { session: currentSession }, error: sessionError }) => {
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
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message)
          setLoading(false)
        }
      })

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
  const signIn = useCallback(
    async ({ email, password }) => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
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
    },
    [fetchProfile]
  )

  // Daftar akun baru dengan Nama, Email, Password
  const signUp = useCallback(
    async ({ email, password, fullName }) => {
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
    },
    [fetchProfile]
  )

  // Update profil pengguna yang sedang login (Nama, Username, Foto Profil, Akses Role, Divisi, No HP)
  const updateProfile = useCallback(
    async (updates) => {
      if (!user?.id) throw new Error('Pengguna belum login')

      const nextFullName =
        updates.full_name !== undefined ? String(updates.full_name).trim() : profile?.full_name
      const nextUsername =
        updates.username !== undefined ? String(updates.username).trim() : profile?.username
      const nextRole = updates.role !== undefined ? updates.role : profile?.role || 'member'
      const nextAvatar =
        updates.avatar_url !== undefined ? updates.avatar_url : profile?.avatar_url || ''
      const nextDept =
        updates.department !== undefined
          ? String(updates.department).trim()
          : profile?.department || ''
      const nextPhone =
        updates.phone !== undefined ? String(updates.phone).trim() : profile?.phone || ''

      // 1. Simpan metadata lokal agar instan & persisten
      writeLocalMetaForUser(user.id, {
        full_name: nextFullName,
        username: nextUsername,
        role: nextRole,
        avatar_url: nextAvatar,
        department: nextDept,
        phone: nextPhone,
      })

      // 2. Update di tabel profiles Supabase (kolom standar: full_name, role)
      const { error: dbErr } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            full_name: nextFullName,
            role: nextRole,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )

      if (dbErr) {
        // Fallback update jika upsert terkendala RLS insert
        await supabase
          .from('profiles')
          .update({
            full_name: nextFullName,
            role: nextRole,
          })
          .eq('id', user.id)
      }

      // 3. Update user_metadata di Supabase Auth (hindari menyimpan base64 besar ke JWT metadata jika > 2KB)
      const metaPayload = {
        full_name: nextFullName,
        username: nextUsername,
        role: nextRole,
        department: nextDept,
        phone: nextPhone,
      }
      if (nextAvatar && nextAvatar.length < 2048) {
        metaPayload.avatar_url = nextAvatar
      } else if (!nextAvatar) {
        metaPayload.avatar_url = ''
      }

      try {
        const { data: authData } = await supabase.auth.updateUser({
          data: metaPayload,
        })
        if (authData?.user) {
          setUser(authData.user)
        }
      } catch (e) {
        console.warn('Info update auth metadata:', e)
      }

      const updatedProfile = {
        ...profile,
        id: user.id,
        full_name: nextFullName,
        username: nextUsername,
        role: nextRole,
        avatar_url: nextAvatar,
        department: nextDept,
        phone: nextPhone,
      }
      setProfile(updatedProfile)
      return updatedProfile
    },
    [user?.id, profile]
  )

  // Ubah password akun yang sedang login
  const updatePassword = useCallback(
    async (newPassword) => {
      if (!user?.id) throw new Error('Pengguna belum login')
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password baru minimal 6 karakter')
      }

      const { data, error: pwError } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (pwError) throw pwError
      return data
    },
    [user?.id]
  )

  // Update data pengguna lain (untuk pengelolaan akses / admin)
  const updateOtherUserProfile = useCallback(
    async (targetUserId, updates) => {
      if (!targetUserId) throw new Error('ID pengguna tidak valid')

      writeLocalMetaForUser(targetUserId, updates)

      const dbPatch = {}
      if (updates.full_name !== undefined) dbPatch.full_name = updates.full_name
      if (updates.role !== undefined) dbPatch.role = updates.role

      if (Object.keys(dbPatch).length > 0) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update(dbPatch)
          .eq('id', targetUserId)

        if (updateErr) throw updateErr
      }

      if (String(targetUserId) === String(user?.id)) {
        setProfile((prev) => ({ ...prev, ...updates }))
      }

      return { success: true }
    },
    [user?.id]
  )

  // Hapus akun pengguna lain (untuk admin)
  const deleteOtherUserProfile = useCallback(
    async (targetUserId) => {
      if (!targetUserId) throw new Error('ID pengguna tidak valid')
      if (String(targetUserId) === String(user?.id)) {
        throw new Error('Tidak dapat menghapus akun yang sedang Anda gunakan saat ini.')
      }

      // Tandai terhapus di penyimpanan metadata lokal
      writeLocalMetaForUser(targetUserId, { deleted: true })

      // Hapus dari tabel profiles di Supabase
      const { error: delErr } = await supabase
        .from('profiles')
        .delete()
        .eq('id', targetUserId)

      if (delErr) {
        console.warn('Info hapus profil dari database:', delErr.message)
      }

      return { success: true }
    },
    [user?.id]
  )

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

  const value = useMemo(
    () => ({
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
      updateProfile,
      updatePassword,
      updateOtherUserProfile,
      deleteOtherUserProfile,
      refreshProfile: () =>
        user ? fetchProfile(user.id, user.email, user.user_metadata) : Promise.resolve(),
    }),
    [
      session,
      user,
      profile,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      updateProfile,
      updatePassword,
      updateOtherUserProfile,
      deleteOtherUserProfile,
      fetchProfile,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth harus digunakan dalam AuthProvider')
  }
  return context
}
