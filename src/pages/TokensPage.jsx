import { useMemo, useState } from 'react'
import {
  Plus,
  PlusCircle,
  Search,
  RefreshCw,
  AlertCircle,
  X,
  Trash2,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import TokenTable from '@/components/tokens/TokenTable'
import AddTokenModal from '@/components/tokens/AddTokenModal'
import CreateTokenTypeModal from '@/components/tokens/CreateTokenTypeModal'
import { useTokens } from '@/hooks/useTokens'
import { useAuth } from '@/hooks/useAuth'
import { formatTokenLabel, getTokenIcon } from '@/lib/tokenUtils'

const numberFormat = new Intl.NumberFormat('id-ID')

function StockCard({ title, value, total, icon: Icon }) {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {numberFormat.format(value)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            dari {numberFormat.format(total)} total stok ({percentage}%)
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-blue-600">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

export default function TokensPage() {
  const { isAdmin } = useAuth()
  const {
    tokens,
    loading,
    error,
    stats,
    addToken,
    reduceToken,
    deleteToken,
    fetchTokens,
  } = useTokens()

  const [addStockOpen, setAddStockOpen] = useState(false)
  const [createTypeOpen, setCreateTypeOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [actionError, setActionError] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const availableTypes = useMemo(() => {
    return (stats?.list || []).map((s) => s.type)
  }, [stats?.list])

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return tokens.filter((item) => {
      const type = String(item.token_type || '').toLowerCase()
      const description = String(item.description || '').toLowerCase()
      const typeLabel = formatTokenLabel(type).toLowerCase()
      const matchesType = filterType === 'all' || type === filterType
      const matchesSearch = !keyword || typeLabel.includes(keyword) || type.includes(keyword) || description.includes(keyword)
      return matchesType && matchesSearch
    })
  }, [tokens, search, filterType])

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    setActionError('')
    try {
      await fetchTokens()
    } catch (err) {
      setActionError(err?.message || 'Tidak dapat memperbarui data stok.')
    } finally {
      setRefreshing(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteId || deleting) return
    setDeleting(true)
    setActionError('')
    try {
      await deleteToken(deleteId)
      setDeleteId(null)
    } catch (err) {
      setActionError(err?.message || 'Tidak dapat menghapus data stok.')
      setDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  const hasFilters = search.trim() !== '' || filterType !== 'all'

  return (
    <div className="space-y-6 pb-8 min-w-0">
      {/* Judul halaman dan tindakan utama */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Manajemen Token
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">Kelola daftar persediaan token, stok awal, dan penambahan</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="gap-2 border-slate-300"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Perbarui
          </Button>

          {/* Tombol Tambah Jenis Token Baru */}
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateTypeOpen(true)}
            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
          >
            <PlusCircle className="h-4 w-4" />
            Tambah Jenis Token
          </Button>

          {/* Tombol Tambah Stok untuk token yang sudah ada */}
          <Button
            type="button"
            size="sm"
            onClick={() => setAddStockOpen(true)}
            className="gap-2 bg-blue-700 text-white hover:bg-blue-800 cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Tambah Stok
          </Button>
        </div>
      </header>

      {/* Ringkasan persediaan DINAMIS: otomatis bertambah setiap ada jenis token baru */}
      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-w-0"
        aria-label="Ringkasan persediaan"
      >
        {(stats?.list || []).map((item) => {
          const Icon = getTokenIcon(item.type)
          return (
            <StockCard
              key={item.type}
              title={`Sisa ${item.label} Saat Ini`}
              value={Number(item.remaining || 0)}
              total={Number(item.total || 0)}
              icon={Icon}
            />
          )
        })}
      </section>

      {(actionError || error) && (
        <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{actionError || error}</span>
          {actionError && (
            <button
              type="button"
              aria-label="Tutup pesan"
              onClick={() => setActionError('')}
              className="ml-auto text-red-500 hover:text-red-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Filter dan tabel */}
      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Daftar Persediaan</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {numberFormat.format(filtered.length)} dari {numberFormat.format(tokens.length)} catatan stok
              </p>
            </div>
            <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
              <div className="relative min-w-[200px] flex-1 sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  aria-label="Cari stok"
                  placeholder="Cari jenis atau keterangan..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-9 border-slate-300 pl-9 text-xs"
                />
              </div>
              <select
                aria-label="Filter jenis stok"
                value={filterType}
                onChange={(event) => setFilterType(event.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 sm:w-40"
              >
                <option value="all">Semua jenis token</option>
                {(stats?.list || []).map((item) => (
                  <option key={item.type} value={item.type}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!loading && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <Package className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-800">
              {hasFilters ? 'Data tidak ditemukan' : 'Belum ada data stok'}
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              {hasFilters
                ? 'Coba gunakan kata kunci atau filter jenis stok lainnya.'
                : 'Mulai dengan menambahkan jenis token baru melalui tombol "Tambah Jenis Token".'}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setSearch(''); setFilterType('all') }}
                className="mt-4 text-sm font-medium text-blue-700 hover:underline cursor-pointer"
              >
                Hapus filter
              </button>
            )}
          </div>
        ) : (
          <div className="min-w-0">
            <TokenTable
              tokens={filtered}
              loading={loading}
              onReduce={reduceToken}
              onDelete={(id) => setDeleteId(id)}
            />
          </div>
        )}
      </section>

      {/* Modal Tambah Stok */}
      <AddTokenModal
        open={addStockOpen}
        onClose={() => setAddStockOpen(false)}
        onSubmit={addToken}
        availableTypes={availableTypes}
      />

      {/* Modal Tambah Jenis Token Baru */}
      <CreateTokenTypeModal
        open={createTypeOpen}
        onClose={() => setCreateTypeOpen(false)}
        onSubmit={addToken}
      />

      {/* Konfirmasi hapus data stok */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-xs">
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-description" className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <h2 id="delete-title" className="text-lg font-semibold text-slate-900">Hapus data stok?</h2>
            <p id="delete-description" className="mt-2 text-sm leading-6 text-slate-600">
              Data persediaan yang dipilih akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? 'Menghapus...' : 'Hapus stok'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
