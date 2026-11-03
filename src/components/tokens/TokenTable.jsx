import { useState } from 'react'
import { Minus, Trash2, ChevronDown, ChevronUp, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import ReduceModal from './ReduceModal'
import { formatTokenLabel, getTokenIcon, getTokenBadgeVariant } from '@/lib/tokenUtils'

/**
 * Tabel utama token dengan inline reduce modal
 */
export default function TokenTable({ tokens, onReduce, onDelete, loading }) {
  const [selectedToken, setSelectedToken] = useState(null)
  const [reduceOpen, setReduceOpen] = useState(false)
  const [sortField, setSortField] = useState('created_at')
  const [sortAsc, setSortAsc] = useState(false)

  const handleReduceClick = (token) => {
    setSelectedToken(token)
    setReduceOpen(true)
  }

  const handleReduceSubmit = async (quantity, description) => {
    await onReduce(selectedToken, quantity, description)
  }

  const handleSort = (field) => {
    if (sortField === field) setSortAsc(a => !a)
    else { setSortField(field); setSortAsc(true) }
  }

  const sorted = [...tokens].sort((a, b) => {
    let av = a[sortField]; let bv = b[sortField]
    if (typeof av === 'string') av = av.toLowerCase(); bv = (bv || '').toLowerCase()
    return sortAsc ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
  })

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />
    return sortAsc ? <ChevronUp className="w-3 h-3 text-violet-600" /> : <ChevronDown className="w-3 h-3 text-violet-600" />
  }

  const getRemaining = (t) => Math.max(0, (t.total_stock || 0) - (t.taken_quantity || 0))
  const getRemainingClass = (rem, total) => {
    if (total === 0) return 'text-slate-400'
    const pct = rem / total
    if (pct <= 0.1) return 'text-red-600 font-bold'
    if (pct <= 0.25) return 'text-amber-600 font-semibold'
    return 'text-emerald-600 font-semibold'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Memuat data token...</p>
        </div>
      </div>
    )
  }

  if (tokens.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-12 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Package className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-600 font-medium">Belum ada data token</p>
          <p className="text-slate-400 text-sm mt-1">Tambahkan stok token melalui tombol "Tambah Stok" atau "Tambah Jenis Token"</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">No</th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => handleSort('token_type')}
                >
                  <span className="flex items-center gap-1">Jenis Token <SortIcon field="token_type" /></span>
                </th>
                <th
                  className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => handleSort('total_stock')}
                >
                  <span className="flex items-center justify-end gap-1">Stok Awal <SortIcon field="total_stock" /></span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Diambil</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Sisa Stok</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Keterangan</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map((token, index) => {
                const remaining = getRemaining(token)
                const isEmpty = remaining === 0
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
                    className={`hover:bg-slate-50/80 transition-colors ${isEmpty ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{index + 1}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
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
                      <span className={`text-base ${getRemainingClass(remaining, token.total_stock)}`}>
                        {remaining.toLocaleString('id-ID')}
                      </span>
                      {isEmpty && (
                        <Badge variant="destructive" className="ml-2 text-xs">Habis</Badge>
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
          <p className="text-xs text-slate-400">Klik tombol Kurangi untuk mencatat pengambilan</p>
        </div>
      </div>

      <ReduceModal
        token={selectedToken}
        open={reduceOpen}
        onClose={() => { setReduceOpen(false); setSelectedToken(null) }}
        onSubmit={handleReduceSubmit}
      />
    </>
  )
}
