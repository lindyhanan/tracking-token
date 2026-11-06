import { useState } from 'react'
import { Minus, Trash2, ChevronDown, ChevronUp, Package, CheckSquare, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ReduceModal from './ReduceModal'
import { formatTokenLabel, getTokenIcon, getTokenBadgeVariant } from '@/lib/tokenUtils'

/**
 * Tabel utama token dengan fitur pilih banyak token & inline reduce modal
 */
export default function TokenTable({ tokens, onReduce, onDelete, loading }) {
  const [selectedToken, setSelectedToken] = useState(null)
  const [initialBatchTokens, setInitialBatchTokens] = useState([])
  const [checkedIds, setCheckedIds] = useState([])
  const [reduceOpen, setReduceOpen] = useState(false)
  const [sortField, setSortField] = useState('created_at')
  const [sortAsc, setSortAsc] = useState(false)

  const getRemaining = (t) => Math.max(0, (t.total_stock || 0) - (t.taken_quantity || 0))

  const availableTokens = tokens.filter((t) => getRemaining(t) > 0)
  const allAvailableChecked =
    availableTokens.length > 0 &&
    availableTokens.every((t) => checkedIds.includes(String(t.id)))

  const handleToggleCheck = (idStr) => {
    setCheckedIds((prev) =>
      prev.includes(idStr) ? prev.filter((item) => item !== idStr) : [...prev, idStr]
    )
  }

  const handleToggleAll = () => {
    if (allAvailableChecked) {
      setCheckedIds([])
    } else {
      setCheckedIds(availableTokens.map((t) => String(t.id)))
    }
  }

  const handleReduceClick = (token) => {
    setSelectedToken(token)
    setInitialBatchTokens([token])
    setReduceOpen(true)
  }

  const handleBatchReduceClick = () => {
    const selectedList = tokens.filter((t) => checkedIds.includes(String(t.id)))
    if (selectedList.length === 0) return
    setSelectedToken(selectedList[0])
    setInitialBatchTokens(selectedList)
    setReduceOpen(true)
  }

  const handleReduceSubmit = async (itemsOrQty, description, performedAt) => {
    let result
    if (Array.isArray(itemsOrQty)) {
      result = await onReduce(itemsOrQty, description, performedAt)
    } else {
      result = await onReduce(selectedToken, itemsOrQty, description, performedAt)
    }
    setCheckedIds([])
    return result
  }

  const handleSort = (field) => {
    if (sortField === field) setSortAsc((a) => !a)
    else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  const sorted = [...tokens].sort((a, b) => {
    let av = a[sortField]
    let bv = b[sortField]
    if (typeof av === 'string') {
      av = av.toLowerCase()
      bv = (bv || '').toLowerCase()
    }
    return sortAsc ? (av > bv ? 1 : -1) : av < bv ? 1 : -1
  })

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />
    return sortAsc ? (
      <ChevronUp className="w-3 h-3 text-violet-600" />
    ) : (
      <ChevronDown className="w-3 h-3 text-violet-600" />
    )
  }

  const getRemainingClass = (rem, total) => {
    if (total === 0) return 'text-slate-400'
    const pct = rem / total
    if (pct <= 0.1) return 'text-red-600 font-bold'
    if (pct <= 0.25) return 'text-amber-600 font-semibold'
    return 'text-emerald-600 font-semibold'
  }

  if (loading) {
    return (
      <div className="w-full min-w-0 p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Memuat data token...</p>
      </div>
    )
  }

  if (tokens.length === 0) {
    return (
      <div className="w-full min-w-0 p-12 text-center">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
          <Package className="w-7 h-7 text-slate-400" />
        </div>
        <p className="text-slate-600 font-medium">Belum ada data token</p>
        <p className="text-slate-400 text-sm mt-1">
          Tambahkan stok token melalui tombol "Tambah Stok" atau "Tambah Jenis Token"
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Bar Aksi Saat Banyak Token Dipilih */}
      {checkedIds.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-red-100 bg-red-50/70 px-4 py-2">
          <span className="text-xs font-medium text-red-800">
            <strong>{checkedIds.length}</strong> token dipilih
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCheckedIds([])}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleBatchReduceClick}
              className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 cursor-pointer"
            >
              <Minus className="h-3 w-3" />
              Kurangi ({checkedIds.length})
            </button>
          </div>
        </div>
      )}

      <div className="w-full min-w-0 overflow-x-auto">
        <table className="w-full min-w-[650px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-3 text-center w-10">
                <input
                  type="checkbox"
                  aria-label="Pilih semua token"
                  checked={allAvailableChecked}
                  disabled={availableTokens.length === 0}
                  onChange={handleToggleAll}
                  className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer disabled:opacity-40"
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-10">
                No
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                onClick={() => handleSort('token_type')}
              >
                <span className="flex items-center gap-1">
                  Jenis Token <SortIcon field="token_type" />
                </span>
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                onClick={() => handleSort('total_stock')}
              >
                <span className="flex items-center justify-end gap-1">
                  Stok Awal <SortIcon field="total_stock" />
                </span>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Diambil
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Sisa Stok
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Keterangan
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map((token, index) => {
              const idStr = String(token.id)
              const remaining = getRemaining(token)
              const isEmpty = remaining === 0
              const isChecked = checkedIds.includes(idStr)
              const Icon = getTokenIcon(token.token_type)
              const label = formatTokenLabel(token.token_type)
              const badgeVariant = getTokenBadgeVariant(token.token_type)
              const isGlass = token.token_type === 'glass'
              const isTumbler = token.token_type === 'tumbler'
              const iconBg = isGlass
                ? 'bg-violet-100 text-violet-600'
                : isTumbler
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-blue-100 text-blue-600'

              return (
                <tr
                  key={token.id}
                  className={`transition-colors ${
                    isChecked
                      ? 'bg-red-50/40 hover:bg-red-50/60'
                      : 'hover:bg-slate-50/80'
                  } ${isEmpty ? 'opacity-60' : ''}`}
                >
                  <td className="px-4 py-3.5 text-center">
                    <input
                      type="checkbox"
                      aria-label={`Pilih ${label}`}
                      checked={isChecked}
                      disabled={isEmpty}
                      onChange={() => handleToggleCheck(idStr)}
                      className="h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer disabled:opacity-40"
                    />
                  </td>
                  <td className="px-3 py-3.5 text-slate-400 font-mono text-xs">{index + 1}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <Badge variant={badgeVariant} className="font-medium">
                        {label}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-700">
                    {(token.total_stock || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3.5 text-right text-slate-600">
                    {(token.taken_quantity || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span
                      className={`text-base ${getRemainingClass(remaining, token.total_stock)}`}
                    >
                      {remaining.toLocaleString('id-ID')}
                    </span>
                    {isEmpty && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Habis
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 max-w-[200px]">
                    <span className="line-clamp-2 text-xs leading-relaxed">
                      {token.description || <span className="text-slate-300 italic">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        variant={isGlass ? 'glass' : isTumbler ? 'tumbler' : 'outline'}
                        onClick={() => handleReduceClick(token)}
                        disabled={isEmpty}
                        className="text-xs"
                      >
                        <Minus className="w-3 h-3" /> Kurangi
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(token.id)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 w-7 h-7 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-4 py-2.5 flex items-center justify-between bg-slate-50/50">
        <p className="text-xs text-slate-400">{tokens.length} entri data</p>
        <p className="text-xs text-slate-400">Centang baris untuk kurangi sekaligus</p>
      </div>

      <ReduceModal
        token={selectedToken}
        initialTokens={initialBatchTokens}
        tokens={tokens}
        open={reduceOpen}
        onClose={() => {
          setReduceOpen(false)
          setSelectedToken(null)
          setInitialBatchTokens([])
        }}
        onSubmit={handleReduceSubmit}
      />
    </>
  )
}
