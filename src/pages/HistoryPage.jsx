import ExportHistory from '@/components/history/ExportHistory'
import EditHistoryModal from '@/components/history/EditHistoryModal'
import {
  Search, Clock, TrendingDown, TrendingUp, RefreshCw,
  Trash2, AlertTriangle, X, Pencil,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useState } from 'react'
import { useTokens } from '@/hooks/useTokens'
import { useAuth } from '@/hooks/useAuth'
import { formatTokenLabel, getTokenIcon, getTokenBadgeVariant } from '@/lib/tokenUtils'

const actionConfig = {
  add:    { label: 'Penambahan', icon: TrendingUp,   badge: 'add'    },
  reduce: { label: 'Pengurangan', icon: TrendingDown, badge: 'reduce' },
  update: { label: 'Update',     icon: RefreshCw,    badge: 'info'   },
}

function HistoryTable({ title, type, rows, loading, formatDate, currentUserName, onEdit, onDelete }) {
  const isAdd = type === 'add'
  const total = rows.reduce((acc, h) => acc + Number(h.quantity_changed || 0), 0)
  const qtyClass = isAdd ? 'text-emerald-600' : 'text-red-600'
  const sign = isAdd ? '+' : '-'

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">
          {rows.length} catatan · Total <span className={`font-semibold ${qtyClass}`}>{sign}{total.toLocaleString('id-ID')}</span>
        </p>
      </div>

      {loading ? (
        <p className="px-4 py-8 text-center text-sm text-slate-400">Memuat riwayat...</p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-400">Belum ada riwayat {title.toLowerCase()}</p>
      ) : (
        <>
          {/* HP: daftar ringkas */}
          <ul className="divide-y divide-slate-100 sm:hidden">
            {rows.map(h => (
              <li key={h.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">{formatTokenLabel(h.token_type)}</p>
                  <span className={`text-sm font-semibold tabular-nums ${qtyClass}`}>
                    {sign}{Number(h.quantity_changed || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{h.description || '-'}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-400">
                    {formatDate(h.performed_at)} · {h.performer?.full_name || currentUserName}
                  </p>
                  <div className="flex items-center">
                    <button type="button" onClick={() => onEdit(h)} title="Edit"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 cursor-pointer">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => onDelete(h.id)} title="Hapus"
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Laptop: tabel */}
          <div className="hidden sm:block w-full overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-left">Tanggal</th>
                  <th className="px-4 py-3 text-left">Jenis Token</th>
                  <th className="px-4 py-3 text-right">Jumlah</th>
                  <th className="px-4 py-3 text-left">Keterangan</th>
                  <th className="px-4 py-3 text-left">Oleh</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(h.performed_at)}</td>
                    <td className="px-4 py-3 text-slate-800 whitespace-nowrap">{formatTokenLabel(h.token_type)}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${qtyClass}`}>
                      {sign}{Number(h.quantity_changed || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[260px]">
                      <span className="line-clamp-2 text-xs">{h.description || '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                      {h.performer?.full_name || currentUserName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => onEdit(h)} title="Edit riwayat ini"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 cursor-pointer">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => onDelete(h.id)} title="Hapus riwayat ini"
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 cursor-pointer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}

export default function HistoryPage() {
  const { user, profile } = useAuth()
  const { history, stats, loading, fetchHistory, deleteHistory, updateHistory, clearAllHistory } = useTokens()

  const currentUserName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Pengguna'

  const [search, setSearch]           = useState('')
  const [filterType, setFilterType]   = useState('all')

  const [deleteId, setDeleteId]       = useState(null)
  const [deleting, setDeleting]       = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [clearAllOpen, setClearAllOpen] = useState(false)
  const [clearingAll, setClearingAll]   = useState(false)
  const [clearAllError, setClearAllError] = useState('')

  const [editItem, setEditItem] = useState(null)
  const [editError, setEditError] = useState('')

  // Filter berdasarkan jenis token & pencarian (berlaku untuk kedua tab)
  const baseFiltered = (history || []).filter(h => {
    const matchType   = filterType === 'all' || h.token_type === filterType
    const performer   = h.performer?.full_name || currentUserName
    const matchSearch =
      search === '' ||
      (h.description || '').toLowerCase().includes(search.toLowerCase()) ||
      performer.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const addList    = baseFiltered.filter(h => h.action_type === 'add')
  const reduceList = baseFiltered.filter(h => h.action_type === 'reduce')

  const formatDate = (iso) => {
    if (!iso) return '-'
    return new Date(iso).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteId || deleting) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deleteHistory(deleteId)
      setDeleteId(null)
    } catch (err) {
      setDeleteError(err?.message || 'Gagal menghapus riwayat. Silakan coba lagi.')
    } finally {
      setDeleting(false)
    }
  }

  const handleConfirmClearAll = async () => {
    if (clearingAll) return
    setClearingAll(true)
    setClearAllError('')
    try {
      await clearAllHistory()
      setClearAllOpen(false)
    } catch (err) {
      setClearAllError(err?.message || 'Gagal mengosongkan riwayat. Silakan coba lagi.')
    } finally {
      setClearingAll(false)
    }
  }

  const handleEditSubmit = async (historyId, updatedData) => {
    setEditError('')
    try {
      await updateHistory(historyId, updatedData)
      setEditItem(null)
    } catch (err) {
      setEditError(err?.message || 'Gagal menyimpan perubahan.')
      throw err
    }
  }

  return (
    <div className="space-y-5 pb-8 min-w-0">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Riwayat Perubahan</h1>
          <p className="mt-0.5 text-xs text-slate-500">Catatan seluruh penambahan, pengurangan, dan pengeditan token</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportHistory history={baseFiltered} />
          {history.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearAllOpen(true)}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus Semua
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchHistory}>
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Cari keterangan atau nama pengguna..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full sm:w-44">
          <option value="all">Semua Jenis Token</option>
          {(stats?.list || []).map(item => (
            <option key={item.type} value={item.type}>{item.label}</option>
          ))}
        </Select>
      </div>

      {/* Tabel Penambahan */}
      <HistoryTable
        title="Penambahan"
        type="add"
        rows={addList}
        loading={loading}
        formatDate={formatDate}
        currentUserName={currentUserName}
        onEdit={setEditItem}
        onDelete={setDeleteId}
      />

      {/* Tabel Pengurangan */}
      <HistoryTable
        title="Pengurangan"
        type="reduce"
        rows={reduceList}
        loading={loading}
        formatDate={formatDate}
        currentUserName={currentUserName}
        onEdit={setEditItem}
        onDelete={setDeleteId}
      />

      {/* Dialog konfirmasi hapus */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="del-hist-title"
            aria-describedby="del-hist-desc"
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <h2 id="del-hist-title" className="text-lg font-semibold text-slate-900">
              Hapus riwayat ini?
            </h2>
            <p id="del-hist-desc" className="mt-2 text-sm leading-6 text-slate-600">
              Entri riwayat akan dihapus dan stok token di dashboard akan <strong>dikembalikan ke kondisi sebelum perubahan</strong>.
            </p>

            {deleteError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setDeleteId(null); setDeleteError('') }}
                disabled={deleting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {deleting
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> Menghapus...</>
                  : <><Trash2 className="h-4 w-4" /> Hapus Riwayat</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog konfirmasi hapus semua riwayat */}
      {/* Modal Edit Riwayat */}
      <EditHistoryModal
        open={Boolean(editItem)}
        historyItem={editItem}
        onClose={() => { setEditItem(null); setEditError('') }}
        onSubmit={handleEditSubmit}
        availableTypes={(stats?.list || []).map((s) => s.type)}
      />

      {clearAllOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-hist-title"
            aria-describedby="clear-hist-desc"
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <h2 id="clear-hist-title" className="text-lg font-semibold text-slate-900">
              Kosongkan semua riwayat?
            </h2>
            <p id="clear-hist-desc" className="mt-2 text-sm leading-6 text-slate-600">
              Seluruh riwayat perubahan ({history?.length || 0} entri) akan dihapus dan stok token di dashboard akan <strong>dikembalikan ke setelan awal sebelum diubah</strong>.
            </p>

            {clearAllError && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                {clearAllError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setClearAllOpen(false); setClearAllError('') }}
                disabled={clearingAll}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                disabled={clearingAll}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {clearingAll
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> Mengosongkan...</>
                  : <><Trash2 className="h-4 w-4" /> Kosongkan Riwayat</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
