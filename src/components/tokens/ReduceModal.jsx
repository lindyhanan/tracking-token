import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, X, Minus, Package, AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatTokenLabel, getTokenIcon } from '@/lib/tokenUtils'

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 disabled:bg-slate-50 disabled:text-slate-500'

const fmt = new Intl.NumberFormat('id-ID')

export default function ReduceModal({ open, token, onClose, onSubmit }) {
  const formId      = useId()
  const quantityRef = useRef(null)

  const [quantity,    setQuantity]    = useState('')
  const [description, setDescription] = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')

  const total     = Number(token?.total_stock)    || 0
  const taken     = Number(token?.taken_quantity)  || 0
  const remaining = Math.max(0, total - taken)

  const TokenIcon  = getTokenIcon(token?.token_type)
  const typeName   = formatTokenLabel(token?.token_type || '')

  const numericQty  = Number(quantity)
  const isValidQty  = /^[1-9]\d*$/.test(quantity) && Number.isSafeInteger(numericQty)
  const isOverLimit = isValidQty && numericQty > remaining
  const afterReduce = Math.max(0, remaining - (isValidQty && !isOverLimit ? numericQty : 0))
  const isDescFilled = description.trim().length > 0
  const canSubmit   = isValidQty && !isOverLimit && remaining > 0

  // Persentase stok tersisa setelah pengurangan (untuk progress bar)
  const pctBefore = total > 0 ? Math.round((remaining / total) * 100) : 0
  const pctAfter  = total > 0 ? Math.round((afterReduce / total) * 100) : 0

  // Warna progress bar berdasarkan sisa stok
  const barColor =
    pctAfter <= 10 ? 'bg-red-500'
    : pctAfter <= 30 ? 'bg-orange-400'
    : 'bg-emerald-500'

  useEffect(() => {
    if (!open) return
    setQuantity('')
    setDescription('')
    setError('')
    const frame = requestAnimationFrame(() => quantityRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open, token?.id])

  useEffect(() => {
    if (!open) return
    const onEsc = (e) => { if (e.key === 'Escape' && !saving) onClose() }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, saving, onClose])

  if (!open || !token) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    setError('')

    if (!isValidQty) {
      setError('Masukkan jumlah unit pengambilan yang valid.')
      return
    }
    if (isOverLimit) {
      setError(`Jumlah melebihi stok tersedia (${fmt.format(remaining)} unit).`)
      return
    }
    if (!isDescFilled) {
      setError('Keterangan pengambilan wajib diisi.')
      return
    }

    setSaving(true)
    try {
      const result = await onSubmit(numericQty, description.trim())
      if (result === false || result?.error) {
        throw new Error(result?.error?.message || 'Pengambilan belum berhasil disimpan.')
      }
      onClose()
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan pengambilan. Silakan coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
      >

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600">
              <Minus className="h-4 w-4" />
            </div>
            <div>
              <h2 id={`${formId}-title`} className="text-base font-semibold text-slate-900">
                Kurangi Stok
              </h2>
              <p className="text-xs text-slate-500">Catat pengambilan token dari gudang</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5 px-6 py-5">

            {/* ── Info token ── */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5">
              <div className="flex items-center gap-2.5 mb-3">
                <TokenIcon className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="text-sm font-semibold text-slate-800">{typeName}</span>
                <span className="ml-auto text-xs text-slate-500">
                  Total: <span className="font-medium text-slate-700">{fmt.format(total)} unit</span>
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Stok tersedia</span>
                  <span className="font-medium text-slate-700">
                    {fmt.format(remaining)} unit ({pctBefore}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${pctBefore}%` }}
                  />
                </div>
              </div>

              {remaining === 0 && (
                <p className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Stok habis — tidak bisa dikurangi
                </p>
              )}
            </div>

            {/* ── Jumlah ── */}
            <div>
              <label htmlFor={`${formId}-qty`} className="block text-sm font-medium text-slate-700 mb-1.5">
                Jumlah Diambil <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={quantityRef}
                  id={`${formId}-qty`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
                  disabled={saving || remaining === 0}
                  className={`${fieldClass} pr-14 ${isOverLimit ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  unit
                </span>
              </div>
              {isOverLimit ? (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Melebihi stok tersedia ({fmt.format(remaining)} unit).
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-slate-500">
                  Maksimal <span className="font-medium">{fmt.format(remaining)} unit</span>
                </p>
              )}
            </div>

            {/* ── Preview sisa stok setelah pengurangan ── */}
            {isValidQty && !isOverLimit && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Simulasi setelah pengambilan</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold tabular-nums text-slate-900">
                      {fmt.format(afterReduce)}
                      <span className="ml-1 text-sm font-normal text-slate-500">unit</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">sisa stok ({pctAfter}%)</p>
                  </div>
                  {pctAfter <= 10 ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                      <AlertCircle className="h-3.5 w-3.5" /> Stok kritis
                    </span>
                  ) : pctAfter <= 30 ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg">
                      <AlertCircle className="h-3.5 w-3.5" /> Stok menipis
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Stok aman
                    </span>
                  )}
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${pctAfter}%` }}
                  />
                </div>
              </div>
            )}

            {/* ── Keterangan ── */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor={`${formId}-note`} className="text-sm font-medium text-slate-700">
                  Keterangan Pengambilan <span className="text-red-500">*</span>
                </label>
                <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded">Wajib diisi</span>
              </div>
              <textarea
                id={`${formId}-note`}
                rows={3}
                maxLength={250}
                required
                placeholder="Contoh: Digunakan untuk kegiatan rapat divisi lapangan"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving || remaining === 0}
                className={`${fieldClass} resize-none ${!isDescFilled && quantity ? 'border-amber-300' : ''}`}
              />
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-slate-400">Jelaskan alasan atau tujuan pengambilan token</p>
                <p className="text-xs text-slate-400">{description.length}/250</p>
              </div>
            </div>

            {/* ── Error ── */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</>
                : <><Minus className="h-4 w-4" /> Simpan Pengambilan</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
