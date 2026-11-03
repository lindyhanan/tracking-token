import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { formatTokenLabel } from '@/lib/tokenUtils'

// Menjaga kompatibilitas dengan komponen lama
function normalizeToken(row) {
  return {
    ...row,
    created_by:
      typeof row.created_by === 'string'
        ? { id: row.created_by }
        : row.created_by,
  }
}

function normalizeHistory(row) {
  return {
    ...row,
    performed_by:
      typeof row.performed_by === 'string'
        ? { id: row.performed_by }
        : row.performed_by,
  }
}

export function useTokens() {
  const { user, profile } = useAuth()

  const [tokens, setTokens] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const currentUserName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Pengguna'

  // Mengambil stok dari Supabase
  const fetchTokens = useCallback(async () => {
    const { data, error: dbError } = await supabase
      .from('token_tracking')
      .select('*')
      .order('created_at', { ascending: true })

    if (dbError) {
      setError(dbError.message)
      throw dbError
    }

    const rows = (data ?? []).map(normalizeToken)
    setTokens(rows)
    return rows
  }, [])

  // Mengambil riwayat dari Supabase
  const fetchHistory = useCallback(async () => {
    const { data, error: dbError } = await supabase
      .from('token_history')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(1000)

    if (dbError) {
      setError(dbError.message)
      throw dbError
    }

    // Ambil daftar profil untuk pencocokan nama
    let profilesMap = {}
    try {
      const { data: profs } = await supabase.from('profiles').select('id, full_name')
      if (profs && Array.isArray(profs)) {
        profilesMap = Object.fromEntries(
          profs.filter((p) => p?.id && p?.full_name).map((p) => [p.id, p.full_name])
        )
      }
    } catch {
      // Abaikan jika tabel profiles belum bisa diakses
    }

    const rows = (data ?? []).map((row) => {
      const normalized = normalizeHistory(row)
      const pId = typeof row.performed_by === 'object' ? row.performed_by?.id : row.performed_by
      // Gunakan nama dari tabel profil, atau jika cocok dengan user login saat ini, atau fallback ke nama user yang sedang login
      const name = profilesMap[pId] || currentUserName

      return {
        ...normalized,
        performer: {
          full_name: name,
        },
      }
    })

    setHistory(rows)
    return rows
  }, [currentUserName])

  // Refresh seluruh data
  const refreshAll = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      await Promise.all([
        fetchTokens(),
        fetchHistory(),
      ])
    } catch (err) {
      setError(err.message || 'Gagal mengambil data')
      throw err
    } finally {
      setLoading(false)
    }
  }, [fetchTokens, fetchHistory])

  // Fetch otomatis setelah user login
  useEffect(() => {
    if (!user?.id) {
      setTokens([])
      setHistory([])
      setLoading(false)
      return
    }

    refreshAll().catch(console.error)
  }, [user?.id, refreshAll])

  // Tambah stok atau buat jenis token baru
  const addToken = useCallback(async ({
    token_type,
    total_stock,
    description,
  }) => {
    try {
      if (!user?.id) {
        throw new Error('Pengguna belum login')
      }

      const normalizedType = String(token_type || '').trim().toLowerCase()
      if (!normalizedType) {
        throw new Error('Nama/jenis token wajib diisi')
      }

      const quantity = Number(total_stock)
      if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        throw new Error('Jumlah stok harus bilangan bulat positif lebih dari 0')
      }

      // Cek apakah token dengan jenis ini sudah ada di tabel
      const existingToken = tokens.find(
        t => String(t.token_type || '').trim().toLowerCase() === normalizedType
      )

      if (existingToken) {
        let rpcSuccess = false
        // Jika token lama, coba lewat RPC terlebih dahulu
        try {
          const { error: rpcError } = await supabase.rpc('add_token_stock', {
            p_token_type: normalizedType,
            p_quantity: quantity,
          })
          if (!rpcError) rpcSuccess = true
        } catch {
          rpcSuccess = false
        }

        // Jika RPC tidak tersedia atau gagal, update baris langsung
        if (!rpcSuccess) {
          const newTotal = Number(existingToken.total_stock || 0) + quantity
          const { error: updateError } = await supabase
            .from('token_tracking')
            .update({
              total_stock: newTotal,
              description: description || existingToken.description,
            })
            .eq('id', existingToken.id)

          if (updateError) throw updateError

          // Catat ke audit log riwayat
          await supabase.from('token_history').insert({
            token_id: existingToken.id,
            token_type: normalizedType,
            action_type: 'add',
            quantity_changed: quantity,
            stock_before: Number(existingToken.total_stock || 0) - Number(existingToken.taken_quantity || 0),
            stock_after: newTotal - Number(existingToken.taken_quantity || 0),
            description: description || 'Penambahan stok',
            performed_by: user.id,
          })
        }
      } else {
        // Jenis token baru: Tambahkan baris baru ke tabel
        const { data: inserted, error: insertError } = await supabase
          .from('token_tracking')
          .insert({
            token_type: normalizedType,
            total_stock: quantity,
            taken_quantity: 0,
            description: description || null,
            created_by: user.id,
          })
          .select()
          .single()

        if (insertError) throw insertError

        // Catat ke audit log riwayat
        await supabase.from('token_history').insert({
          token_id: inserted?.id,
          token_type: normalizedType,
          action_type: 'add',
          quantity_changed: quantity,
          stock_before: 0,
          stock_after: quantity,
          description: description || `Penambahan jenis token baru: ${formatTokenLabel(normalizedType)}`,
          performed_by: user.id,
        })
      }

      await refreshAll()
      return { success: true }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user?.id, tokens, refreshAll])

  // Kurangi stok melalui fungsi database yang atomik
  const reduceToken = useCallback(async (
    token,
    quantity,
    description = ''
  ) => {
    try {
      if (!user?.id) {
        throw new Error('Pengguna belum login')
      }

      if (!token?.id) {
        throw new Error('Token tidak ditemukan')
      }

      const qty = Number(quantity)
      if (!Number.isSafeInteger(qty) || qty <= 0) {
        throw new Error('Jumlah harus bilangan bulat positif')
      }

      let rpcSuccess = false
      try {
        const { error: dbError } = await supabase.rpc(
          'reduce_token_stock',
          {
            p_token_id: String(token.id),
            p_quantity: qty,
            p_description: description || '',
          }
        )
        if (!dbError) rpcSuccess = true
      } catch {
        rpcSuccess = false
      }

      // Fallback jika RPC reduce_token_stock tidak ada
      if (!rpcSuccess) {
        const currentTaken = Number(token.taken_quantity || 0)
        const currentTotal = Number(token.total_stock || 0)
        const remaining = Math.max(0, currentTotal - currentTaken)

        if (qty > remaining) {
          throw new Error(`Jumlah pengambilan melebihi sisa stok (${remaining} unit)`)
        }

        const newTaken = currentTaken + qty
        const { error: updateError } = await supabase
          .from('token_tracking')
          .update({ taken_quantity: newTaken })
          .eq('id', token.id)

        if (updateError) throw updateError

        await supabase.from('token_history').insert({
          token_id: token.id,
          token_type: token.token_type,
          action_type: 'reduce',
          quantity_changed: qty,
          stock_before: remaining,
          stock_after: remaining - qty,
          description: description || 'Pengambilan token',
          performed_by: user.id,
        })
      }

      await refreshAll()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user?.id, refreshAll])

  // Hapus satu entri riwayat
  const deleteHistory = useCallback(async (historyId) => {
    try {
      if (!user?.id) throw new Error('Pengguna belum login')

      const { data, error: dbError } = await supabase
        .from('token_history')
        .delete()
        .eq('id', historyId)
        .select('id')

      if (dbError) throw dbError

      if (!data?.length) {
        throw new Error('Gagal menghapus: Supabase RLS belum mengizinkan DELETE pada tabel token_history. Jalankan query fix_history_delete_policy.sql di Supabase SQL Editor.')
      }

      // Perbarui state lokal tanpa re-fetch penuh
      setHistory((prev) => prev.filter((h) => h.id !== historyId))
      return { success: true }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user?.id])

  // Hapus semua entri riwayat (kosongkan seluruh tabel riwayat)
  const clearAllHistory = useCallback(async () => {
    try {
      if (!user?.id) throw new Error('Pengguna belum login')

      const { data, error: dbError } = await supabase
        .from('token_history')
        .delete()
        .not('id', 'is', null)
        .select('id')

      if (dbError) throw dbError

      if (history.length > 0 && (!data || data.length === 0)) {
        throw new Error('Supabase RLS belum mengizinkan aksi DELETE pada tabel token_history. Pastikan query fix_history_delete_policy.sql sudah dijalankan di Supabase SQL Editor.')
      }

      setHistory([])
      return { success: true }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user?.id, history.length])

  // Hapus stok jika diizinkan
  const deleteToken = useCallback(async (tokenId) => {
    try {
      if (!user?.id) {
        throw new Error('Pengguna belum login')
      }

      const { data, error: dbError } = await supabase
        .from('token_tracking')
        .delete()
        .eq('id', tokenId)
        .select('id')

      if (dbError) throw dbError

      if (!data?.length) {
        throw new Error('Token tidak ditemukan atau tidak memiliki izin hapus')
      }

      await refreshAll()
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user?.id, refreshAll])

  // Statistik Dinamis berdasarkan data database (mendukung semua jenis token baru)
  const stats = useMemo(() => {
    const typesMap = new Map()

    // Hitung stok per jenis token
    tokens.forEach((t) => {
      const type = String(t.token_type || '').trim().toLowerCase()
      if (!type) return

      if (!typesMap.has(type)) {
        typesMap.set(type, {
          type,
          label: formatTokenLabel(type),
          total: 0,
          taken: 0,
          remaining: 0,
        })
      }

      const stat = typesMap.get(type)
      stat.total += Number(t.total_stock || 0)
      stat.taken += Number(t.taken_quantity || 0)
      stat.remaining = Math.max(0, stat.total - stat.taken)
    })

    // Jika tabel masih kosong, sediakan default Gelas & Tumbler
    if (typesMap.size === 0) {
      typesMap.set('glass', { type: 'glass', label: 'Gelas', total: 0, taken: 0, remaining: 0 })
      typesMap.set('tumbler', { type: 'tumbler', label: 'Tumbler', total: 0, taken: 0, remaining: 0 })
    }

    const list = Array.from(typesMap.values())
    const byType = Object.fromEntries(typesMap.entries())

    const totalAll = list.reduce((sum, item) => sum + item.total, 0)
    const takenAll = list.reduce((sum, item) => sum + item.taken, 0)
    const remainingAll = Math.max(0, totalAll - takenAll)

    return {
      glass: byType['glass'] || { type: 'glass', label: 'Gelas', total: 0, taken: 0, remaining: 0 },
      tumbler: byType['tumbler'] || { type: 'tumbler', label: 'Tumbler', total: 0, taken: 0, remaining: 0 },
      byType,
      list,
      totalAll,
      takenAll,
      remainingAll,
    }
  }, [tokens])

  // Data grafik bulanan dari riwayat asli
  const monthlyData = useMemo(() => {
    const months = new Map()

    history.forEach((h) => {
      if (h.action_type !== 'reduce') return

      const date = new Date(h.performed_at)
      if (Number.isNaN(date.getTime())) return

      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const key = `${year}-${month}`

      if (!months.has(key)) {
        months.set(key, {
          name: date.toLocaleDateString('id-ID', {
            month: 'short',
            year: '2-digit',
          }),
          total: 0,
          gelas: 0,
          tumbler: 0,
        })
      }

      const item = months.get(key)
      const qty = Number(h.quantity_changed || 0)
      item.total += qty

      const type = String(h.token_type || '').toLowerCase()
      if (type === 'glass' || type === 'gelas') {
        item.gelas += qty
      } else if (type === 'tumbler') {
        item.tumbler += qty
      } else {
        item[type] = (item[type] || 0) + qty
      }
    })

    return Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, value]) => value)
  }, [history])

  return {
    tokens,
    history,
    loading,
    error,
    stats,
    monthlyData,
    fetchTokens,
    fetchHistory,
    addToken,
    reduceToken,
    deleteToken,
    deleteHistory,
    clearAllHistory,
  }
}
