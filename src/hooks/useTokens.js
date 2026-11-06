import { useState, useEffect, useCallback, useMemo, createContext, useContext, createElement } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { formatTokenLabel } from '@/lib/tokenUtils'

const TokensContext = createContext(null)

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

function useTokensValue() {
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

  // Sinkronisasi realtime dari Supabase agar dashboard langsung terupdate
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('realtime-tokentrack-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'token_tracking' },
        () => {
          fetchTokens().catch(console.error)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'token_history' },
        () => {
          fetchHistory().catch(console.error)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, fetchTokens, fetchHistory])

  // Tambah stok atau buat jenis token baru
  const addToken = useCallback(async ({
    token_type,
    total_stock,
    description,
    performed_at,
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

      // 1. Cek apakah token dengan jenis ini sudah ada di database
      let targetToken = tokens.find(
        (t) => String(t.token_type || '').trim().toLowerCase() === normalizedType
      )
      if (!targetToken) {
        const { data: dbToken } = await supabase
          .from('token_tracking')
          .select('*')
          .ilike('token_type', normalizedType)
          .maybeSingle()
        targetToken = dbToken
      }

      let tokenId = targetToken?.id
      let stockBefore = 0
      let stockAfter = quantity

      if (targetToken) {
        // Token sudah ada: Tambahkan ke total_stock
        const currentTotal = Number(targetToken.total_stock || 0)
        const currentTaken = Number(targetToken.taken_quantity || 0)
        stockBefore = Math.max(0, currentTotal - currentTaken)
        const newTotal = currentTotal + quantity
        stockAfter = stockBefore + quantity

        const { error: updateError } = await supabase
          .from('token_tracking')
          .update({
            total_stock: newTotal,
            description: description || targetToken.description,
          })
          .eq('id', targetToken.id)

        if (updateError) throw updateError
        tokenId = targetToken.id
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
        tokenId = inserted?.id
        stockBefore = 0
        stockAfter = quantity
      }

      // 2. Catat ke riwayat (token_history) secara pasti
      const nowIso = performed_at ? new Date(performed_at).toISOString() : new Date().toISOString()
      const historyRecord = {
        token_id: tokenId || null,
        token_type: normalizedType,
        action_type: 'add',
        quantity_changed: quantity,
        stock_before: stockBefore,
        stock_after: stockAfter,
        description: description || (targetToken ? `Penambahan stok: +${quantity} unit` : `Penambahan jenis token baru: ${formatTokenLabel(normalizedType)}`),
        performed_by: user.id,
        performed_at: nowIso,
      }

      let insertResult = await supabase.from('token_history').insert(historyRecord).select()

      if (insertResult.error) {
        console.warn('Gagal insert token_history penambahan dengan relasi, mencoba fallback:', insertResult.error)
        // Fallback 1: tanpa token_id jika foreign key token bermasalah
        insertResult = await supabase.from('token_history').insert({
          ...historyRecord,
          token_id: null,
        }).select()
      }

      if (insertResult.error) {
        console.warn('Gagal insert token_history tanpa token_id, mencoba fallback minimal:', insertResult.error)
        // Fallback 2: tanpa token_id dan performed_by jika foreign key profiles bermasalah
        insertResult = await supabase.from('token_history').insert({
          token_type: normalizedType,
          action_type: 'add',
          quantity_changed: quantity,
          stock_before: stockBefore,
          stock_after: stockAfter,
          description: historyRecord.description,
          performed_at: nowIso,
        }).select()
      }

      if (insertResult.error) {
        console.error('Semua percobaan insert ke token_history gagal:', insertResult.error)
        throw new Error(`Gagal mencatat ke riwayat: ${insertResult.error.message || 'Izin database RLS ditolak'}`)
      }

      // Update state history seketika
      if (insertResult.data && insertResult.data[0]) {
        const newHist = {
          ...normalizeHistory(insertResult.data[0]),
          performer: { full_name: currentUserName },
        }
        setHistory((prev) => [newHist, ...prev])
      }

      await refreshAll()
      return { success: true }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user?.id, tokens, refreshAll, currentUserName])

  // Kurangi stok (mendukung satu token maupun banyak token sekaligus)
  const reduceToken = useCallback(async (
    tokenOrItems,
    quantityOrDesc,
    descriptionOrDate = '',
    performedAtArg = null
  ) => {
    try {
      if (!user?.id) {
        throw new Error('Pengguna belum login')
      }

      let rawItems = []
      let description = ''
      let performed_at = null

      if (Array.isArray(tokenOrItems)) {
        rawItems = tokenOrItems
        if (typeof quantityOrDesc === 'string') {
          description = quantityOrDesc
          performed_at = descriptionOrDate || null
        } else {
          description = descriptionOrDate || ''
          performed_at = performedAtArg || null
        }
      } else {
        rawItems = [{ token: tokenOrItems, quantity: quantityOrDesc }]
        description = descriptionOrDate || ''
        performed_at = performedAtArg || null
      }

      if (rawItems.length === 0) {
        throw new Error('Pilih minimal satu token untuk diambil')
      }

      // Validasi semua item terlebih dahulu sebelum mengupdate database
      const validatedItems = rawItems.map(({ token, quantity }) => {
        if (!token?.id) {
          throw new Error('Token tidak ditemukan')
        }

        const qty = Number(quantity)
        const label = formatTokenLabel(token.token_type)
        if (!Number.isSafeInteger(qty) || qty <= 0) {
          throw new Error(`Jumlah pengambilan ${label} harus bilangan bulat positif`)
        }

        const currentTaken = Number(token.taken_quantity || 0)
        const currentTotal = Number(token.total_stock || 0)
        const remaining = Math.max(0, currentTotal - currentTaken)

        if (qty > remaining) {
          throw new Error(`Jumlah pengambilan ${label} melebihi sisa stok (${remaining} unit)`)
        }

        return {
          token,
          qty,
          currentTaken,
          remaining,
          newTaken: currentTaken + qty,
        }
      })

      const nowIso = performed_at ? new Date(performed_at).toISOString() : new Date().toISOString()
      const historyRecords = []
      const updatedTakenMap = new Map()

      // Update stok masing-masing token di database
      for (const item of validatedItems) {
        const { error: updateError } = await supabase
          .from('token_tracking')
          .update({ taken_quantity: item.newTaken })
          .eq('id', item.token.id)

        if (updateError) throw updateError

        updatedTakenMap.set(String(item.token.id), item.newTaken)

        historyRecords.push({
          token_id: item.token.id || null,
          token_type: item.token.token_type,
          action_type: 'reduce',
          quantity_changed: item.qty,
          stock_before: item.remaining,
          stock_after: item.remaining - item.qty,
          description: description || 'Pengambilan token',
          performed_by: user.id,
          performed_at: nowIso,
        })
      }

      // Update state token seketika
      setTokens((prev) =>
        prev.map((t) =>
          updatedTakenMap.has(String(t.id))
            ? { ...t, taken_quantity: updatedTakenMap.get(String(t.id)) }
            : t
        )
      )

      // Catat semua ke riwayat token_history secara pasti
      let insertResult = await supabase.from('token_history').insert(historyRecords).select()

      if (insertResult.error) {
        console.warn('Gagal insert token_history pengurangan dengan relasi, mencoba fallback:', insertResult.error)
        // Fallback 1: tanpa token_id
        insertResult = await supabase.from('token_history').insert(
          historyRecords.map((rec) => ({ ...rec, token_id: null }))
        ).select()
      }

      if (insertResult.error) {
        console.warn('Gagal insert token_history tanpa token_id, mencoba fallback minimal:', insertResult.error)
        // Fallback 2: tanpa token_id dan performed_by
        insertResult = await supabase.from('token_history').insert(
          historyRecords.map((rec) => ({
            token_type: rec.token_type,
            action_type: 'reduce',
            quantity_changed: rec.quantity_changed,
            stock_before: rec.stock_before,
            stock_after: rec.stock_after,
            description: rec.description,
            performed_at: rec.performed_at,
          }))
        ).select()
      }

      if (insertResult.error) {
        console.error('Semua percobaan insert pengurangan ke token_history gagal:', insertResult.error)
        throw new Error(`Gagal mencatat pengambilan ke riwayat: ${insertResult.error.message || 'Izin database RLS ditolak'}`)
      }

      // Update state history seketika
      if (insertResult.data && insertResult.data.length > 0) {
        const newHists = insertResult.data.map((row) => ({
          ...normalizeHistory(row),
          performer: { full_name: currentUserName },
        }))
        setHistory((prev) => [...newHists, ...prev])
      }

      await refreshAll()
      return { success: true }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user?.id, refreshAll, currentUserName])

  // Hapus satu entri riwayat dan kembalikan stok dashboard ke kondisi sebelum diubah
  const deleteHistory = useCallback(async (historyId) => {
    try {
      if (!user?.id) throw new Error('Pengguna belum login')

      // 1. Dapatkan entri riwayat yang ingin dihapus
      let targetHistory = history.find((h) => String(h.id) === String(historyId))
      if (!targetHistory) {
        const { data: fetchedHist } = await supabase
          .from('token_history')
          .select('*')
          .eq('id', historyId)
          .maybeSingle()
        targetHistory = fetchedHist
      }

      if (!targetHistory) {
        throw new Error('Data riwayat tidak ditemukan')
      }

      // 2. Temukan data token yang bersangkutan (dari memory atau database)
      const hType = String(targetHistory.token_type || '').trim().toLowerCase()
      const hTypeAlt = hType === 'glass' ? 'gelas' : hType === 'gelas' ? 'glass' : hType

      // Cari di state tokens terlebih dahulu
      let tokenRow = tokens.find((t) => {
        const idMatches = targetHistory.token_id && String(t.id) === String(targetHistory.token_id)
        const tType = String(t.token_type || '').trim().toLowerCase()
        return idMatches || tType === hType || tType === hTypeAlt
      })

      // Jika belum ditemukan di state, cari langsung dari database
      if (!tokenRow) {
        const { data: d1 } = await supabase.from('token_tracking').select('*')
        if (d1 && d1.length > 0) {
          tokenRow = d1.find((t) => {
            const idMatches = targetHistory.token_id && String(t.id) === String(targetHistory.token_id)
            const tType = String(t.token_type || '').trim().toLowerCase()
            return idMatches || tType === hType || tType === hTypeAlt
          })
        }
      }
      if (!tokenRow) {
        const { data: d2 } = await supabase.from('tokens').select('*')
        if (d2 && d2.length > 0) {
          tokenRow = d2.find((t) => {
            const idMatches = targetHistory.token_id && String(t.id) === String(targetHistory.token_id)
            const tType = String(t.token_type || '').trim().toLowerCase()
            return idMatches || tType === hType || tType === hTypeAlt
          })
        }
      }

      // 3. Rollback stok: jika transaksi gajadi/dihapus, kembalikan persediaan ke semula
      if (tokenRow) {
        const qty = Number(targetHistory.quantity_changed || 0)

        if (targetHistory.action_type === 'reduce') {
          // PENGURANGAN BATAL / GAJADI DIAMBIL:
          // Kurangi taken_quantity sebesar qty (misal 10 - 10 = 0)
          // Sehingga "Diambil" kembali ke 0, dan sisa stok kembali utuh!
          const currentTaken = Number(tokenRow.taken_quantity || 0)
          const revertedTaken = Math.max(0, currentTaken - qty)

          // Update database token_tracking dan tokens
          await supabase.from('token_tracking').update({ taken_quantity: revertedTaken }).eq('id', tokenRow.id)
          await supabase.from('tokens').update({ taken_quantity: revertedTaken }).eq('id', tokenRow.id)

          // Update state lokal seketika
          setTokens((prev) =>
            prev.map((t) =>
              String(t.id) === String(tokenRow.id) || String(t.token_type).trim().toLowerCase() === hType
                ? { ...t, taken_quantity: revertedTaken }
                : t
            )
          )
        } else if (targetHistory.action_type === 'add') {
          // PENAMBAHAN BATAL:
          // Kurangi total_stock sebesar qty
          const currentTotal = Number(tokenRow.total_stock || 0)
          const revertedTotal = Math.max(0, currentTotal - qty)

          await supabase.from('token_tracking').update({ total_stock: revertedTotal }).eq('id', tokenRow.id)
          await supabase.from('tokens').update({ total_stock: revertedTotal }).eq('id', tokenRow.id)

          setTokens((prev) =>
            prev.map((t) =>
              String(t.id) === String(tokenRow.id) || String(t.token_type).trim().toLowerCase() === hType
                ? { ...t, total_stock: revertedTotal }
                : t
            )
          )
        }
      }

      // 4. Hapus entri riwayat dari tabel token_history
      const { data, error: dbError } = await supabase
        .from('token_history')
        .delete()
        .eq('id', historyId)
        .select('id')

      if (dbError) throw dbError

      // Hapus dari state riwayat seketika
      setHistory((prev) => prev.filter((h) => String(h.id) !== String(historyId)))

      // 5. Sinkronkan seluruh data di background
      await refreshAll()
      return { success: true }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user?.id, history, tokens, refreshAll])

  // Edit satu entri riwayat dan sesuaikan stok dashboard secara otomatis
  const updateHistory = useCallback(async (historyId, updatedData) => {
    try {
      if (!user?.id) throw new Error('Pengguna belum login')

      // 1. Ambil data riwayat lama
      let oldHistory = history.find((h) => String(h.id) === String(historyId))
      if (!oldHistory) {
        const { data: fetched } = await supabase.from('token_history').select('*').eq('id', historyId).maybeSingle()
        oldHistory = fetched
      }
      if (!oldHistory) throw new Error('Data riwayat tidak ditemukan')

      // 2. Ambil seluruh data token terbaru dari database
      const { data: allTokensDb } = await supabase.from('token_tracking').select('*')
      const currentTokens = allTokensDb || tokens

      // Helper mencari token berdasarkan type atau id
      const findTokenByType = (typeStr, tokenId) => {
        const tType = String(typeStr || '').trim().toLowerCase()
        const altType = tType === 'glass' ? 'gelas' : tType === 'gelas' ? 'glass' : tType
        return currentTokens.find((t) => {
          const idMatch = tokenId && String(t.id) === String(tokenId)
          const typeMatch = String(t.token_type || '').trim().toLowerCase()
          return idMatch || typeMatch === tType || typeMatch === altType
        })
      }

      const oldToken = findTokenByType(oldHistory.token_type, oldHistory.token_id)
      const oldQty = Number(oldHistory.quantity_changed || 0)
      const newQty = Number(updatedData.quantity_changed || 0)

      // 3. Batalkan dampak transaksi lama pada stok
      if (oldToken) {
        if (oldHistory.action_type === 'reduce') {
          // Batal ambil lama: taken_quantity dikurangi oldQty
          const currentTaken = Number(oldToken.taken_quantity || 0)
          const revertedTaken = Math.max(0, currentTaken - oldQty)
          oldToken.taken_quantity = revertedTaken
          await supabase.from('token_tracking').update({ taken_quantity: revertedTaken }).eq('id', oldToken.id)
          await supabase.from('tokens').update({ taken_quantity: revertedTaken }).eq('id', oldToken.id)
        } else if (oldHistory.action_type === 'add') {
          // Batal tambah lama: total_stock dikurangi oldQty
          const currentTotal = Number(oldToken.total_stock || 0)
          const revertedTotal = Math.max(0, currentTotal - oldQty)
          oldToken.total_stock = revertedTotal
          await supabase.from('token_tracking').update({ total_stock: revertedTotal }).eq('id', oldToken.id)
          await supabase.from('tokens').update({ total_stock: revertedTotal }).eq('id', oldToken.id)
        }
      }

      // 4. Terapkan dampak transaksi baru pada stok
      const newToken = findTokenByType(updatedData.token_type, null) || oldToken

      let stockBefore = 0
      let stockAfter = 0

      if (newToken) {
        const curTotal = Number(newToken.total_stock || 0)
        const curTaken = Number(newToken.taken_quantity || 0)
        const curRemaining = Math.max(0, curTotal - curTaken)

        if (updatedData.action_type === 'reduce') {
          // Terapkan pengambilan baru: taken_quantity ditambah newQty
          const appliedTaken = curTaken + newQty
          stockBefore = curRemaining
          stockAfter = Math.max(0, curRemaining - newQty)

          await supabase.from('token_tracking').update({ taken_quantity: appliedTaken }).eq('id', newToken.id)
          await supabase.from('tokens').update({ taken_quantity: appliedTaken }).eq('id', newToken.id)
        } else if (updatedData.action_type === 'add') {
          // Terapkan penambahan baru: total_stock ditambah newQty
          const appliedTotal = curTotal + newQty
          stockBefore = curRemaining
          stockAfter = curRemaining + newQty

          await supabase.from('token_tracking').update({ total_stock: appliedTotal }).eq('id', newToken.id)
          await supabase.from('tokens').update({ total_stock: appliedTotal }).eq('id', newToken.id)
        }
      }

      // 5. Update data di tabel token_history
      const historyUpdate = {
        token_id: newToken?.id || oldHistory.token_id || null,
        token_type: updatedData.token_type,
        action_type: updatedData.action_type,
        quantity_changed: newQty,
        description: updatedData.description || null,
        performed_at: updatedData.performed_at,
        stock_before: stockBefore,
        stock_after: stockAfter,
      }

      const { error: updateHistErr } = await supabase
        .from('token_history')
        .update(historyUpdate)
        .eq('id', historyId)

      if (updateHistErr) throw updateHistErr

      // 6. Update state lokal seketika
      setHistory((prev) =>
        prev.map((h) =>
          String(h.id) === String(historyId)
            ? { ...h, ...historyUpdate }
            : h
        )
      )

      await refreshAll()
      return { success: true }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user?.id, history, tokens, refreshAll])

  // Hapus semua entri riwayat dan kembalikan seluruh stok dashboard ke setelan awal
  const clearAllHistory = useCallback(async () => {
    try {
      if (!user?.id) throw new Error('Pengguna belum login')

      // 1. Ambil seluruh riwayat saat ini untuk menghitung total rollback stok
      const { data: allHistory, error: histError } = await supabase
        .from('token_history')
        .select('*')

      if (histError) throw histError

      // 2. Ambil seluruh data stok token
      const { data: allTokens, error: tokError } = await supabase
        .from('token_tracking')
        .select('*')

      if (tokError) throw tokError

      // 3. Rollback seluruh perubahan stok berdasarkan riwayat yang akan dihapus
      if (allTokens && allHistory && allHistory.length > 0) {
        for (const token of allTokens) {
          const tokenHistories = allHistory.filter((h) =>
            (h.token_id && String(h.token_id) === String(token.id)) ||
            (h.token_type && String(h.token_type).trim().toLowerCase() === String(token.token_type).trim().toLowerCase())
          )

          let netTotalDelta = 0
          let netTakenDelta = 0

          for (const h of tokenHistories) {
            const qty = Number(h.quantity_changed || 0)
            if (h.action_type === 'add') {
              netTotalDelta += qty
            } else if (h.action_type === 'reduce') {
              netTakenDelta += qty
            }
          }

          const restoredTotal = Math.max(0, Number(token.total_stock || 0) - netTotalDelta)
          const restoredTaken = Math.max(0, Number(token.taken_quantity || 0) - netTakenDelta)

          if (netTotalDelta !== 0 || netTakenDelta !== 0) {
            await supabase
              .from('token_tracking')
              .update({
                total_stock: restoredTotal,
                taken_quantity: restoredTaken,
              })
              .eq('id', token.id)

            await supabase
              .from('tokens')
              .update({
                total_stock: restoredTotal,
                taken_quantity: restoredTaken,
              })
              .eq('id', token.id)
          }
        }
      }

      // 4. Hapus seluruh data di tabel riwayat
      const { data, error: dbError } = await supabase
        .from('token_history')
        .delete()
        .not('id', 'is', null)
        .select('id')

      if (dbError) throw dbError

      if (history.length > 0 && (!data || data.length === 0)) {
        throw new Error('Supabase RLS belum mengizinkan aksi DELETE pada tabel token_history. Pastikan query fix_history_delete_policy.sql sudah dijalankan di Supabase SQL Editor.')
      }

      // 5. Refresh seluruh data agar dashboard langsung menampilkan setelan awal
      await refreshAll()
      return { success: true }
    } catch (err) {
      setError(err.message)
      throw err
    }
  }, [user?.id, history.length, refreshAll])

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
    updateHistory,
    clearAllHistory,
  }
}

export function TokensProvider({ children }) {
  const value = useTokensValue()
  return createElement(TokensContext.Provider, { value }, children)
}

export function useTokens() {
  const context = useContext(TokensContext)
  if (context) return context
  return useTokensValue()
}
