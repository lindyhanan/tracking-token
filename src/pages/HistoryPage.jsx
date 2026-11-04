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

export default function HistoryPage() {
  const { user, profile } = useAuth()
  const { history, stats, loading, fetchHistory, deleteHistory, updateHistory, clearAllHistory } = useTokens()

  const currentUserName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Pengguna'

  const [search, setSearch]           = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [filterType, setFilterType]   = useState('all')

  const [deleteId, setDeleteId]       = useState(null)
  const [deleting, setDeleting]       = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [clearAllOpen, setClearAllOpen] = useState(false)
  const [clearingAll, setClearingAll]   = useState(false)
  const [clearAllError, setClearAllError] = useState('')

  const [editItem, setEditItem] = useState(null)
  const [editError, setEditError] = useState('')

  const filtered = (history || []).filter(h => {
    const matchAction = filterAction === 'all' || h.action_type === filterAction
    const matchType   = filterType   === 'all' || h.token_type  === filterType
    const performer   = h.performer?.full_name || currentUserName
    const matchSearch =
      search === '' ||
      (h.description || '').toLowerCase().includes(search.toLowerCase()) ||
      performer.toLowerCase().includes(search.toLowerCase())
    return matchAction && matchType && matchSearch
  })

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Riwayat Perubahan</h1>
          <p className="mt-0.5 text-xs text-slate-500">Catatan seluruh penambahan, pengurangan, dan pengeditan token</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportHistory history={filtered} />
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
        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          <Select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full sm:w-40">
            <option value="all">Semua Jenis</option>
            {(stats?.list || []).map(item => (
              <option key={item.type} value={item.type}>{item.label}</option>
            ))}
          </Select>
          <Select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="w-full sm:w-40">
            <option value="all">Semua Aksi</option>
            <option value="add">Penambahan</option>
            <option value="reduce">Pengurangan</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Memuat riwayat...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Belum ada riwayat</p>
              <p className="text-slate-400 text-sm mt-1">Riwayat akan muncul setelah ada aktivitas</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Waktu</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Jenis</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Jumlah</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Stok Sebelum</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Stok Sesudah</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Keterangan</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Oleh</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(h => {
                    const action      = actionConfig[h.action_type] || actionConfig.update
                    const ActionIcon  = action.icon
                    const Icon        = getTokenIcon(h.token_type)
                    const label       = formatTokenLabel(h.token_type)
                    const badgeVariant = getTokenBadgeVariant(h.token_type)
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatDate(h.performed_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-blue-600" />
                            <Badge variant={badgeVariant}>{label}</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <ActionIcon className={`w-3.5 h-3.5 ${h.action_type === 'add' ? 'text-green-500' : 'text-red-500'}`} />
                            <Badge variant={action.badge}>{action.label}</Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`font-semibold ${h.action_type === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                            {h.action_type === 'reduce' ? '-' : '+'}{h.quantity_changed}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-500">{h.stock_before}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={h.stock_after < h.stock_before ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                            {h.stock_after}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 max-w-[200px]">
                          <span className="line-clamp-2 text-xs leading-relaxed">{h.description || '-'}</span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 text-xs font-medium whitespace-nowrap">
                          {h.performer?.full_name || currentUserName}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditItem(h)}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                              title="Edit riwayat ini"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(h.id)}
                              className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                              title="Hapus riwayat ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/50">
              <p className="text-xs text-slate-400">{filtered.length} dari {history?.length || 0} riwayat</p>
            </div>
          )}
        </CardContent>
      </Card>

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
