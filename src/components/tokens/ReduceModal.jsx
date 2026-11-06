import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  Loader2,
  X,
  Minus,
  Plus,
  AlertCircle,
  Calendar,
  Check,
} from 'lucide-react'
import { formatTokenLabel, getTokenIcon } from '@/lib/tokenUtils'
import { useTokens } from '@/hooks/useTokens'
import DateTimePicker from '@/components/ui/datetime-picker'

const fieldClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/10 disabled:bg-slate-50 disabled:text-slate-500'

const fmt = new Intl.NumberFormat('id-ID')

function toDatetimeLocal(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getRemainingStock(t) {
  if (!t) return 0
  return Math.max(0, (Number(t.total_stock) || 0) - (Number(t.taken_quantity) || 0))
}

export default function ReduceModal({
  open,
  token,
  initialTokens,
  tokens: propTokens,
  onClose,
  onSubmit,
}) {
  const formId = useId()
  const firstInputRef = useRef(null)
  const prevOpenRef = useRef(false)
  const { tokens: contextTokens } = useTokens()

  const allTokens = useMemo(() => {
    const list = propTokens && propTokens.length > 0 ? propTokens : contextTokens || []
    if (token && !list.some((t) => String(t.id) === String(token.id))) {
      return [token, ...list]
    }
    return list
  }, [propTokens, contextTokens, token])

  const tokenMap = useMemo(() => {
    const map = new Map()
    allTokens.forEach((t) => {
      if (t?.id != null) map.set(String(t.id), t)
    })
    return map
  }, [allTokens])

  const [selectedIds, setSelectedIds] = useState([])
  const [quantities, setQuantities] = useState({})
  const [description, setDescription] = useState('')
  const [performedAt, setPerformedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      let defaultIds = []
      if (Array.isArray(initialTokens) && initialTokens.length > 0) {
        defaultIds = initialTokens
          .filter((t) => t?.id != null && getRemainingStock(t) > 0)
          .map((t) => String(t.id))
        if (defaultIds.length === 0) {
          defaultIds = initialTokens.filter((t) => t?.id != null).map((t) => String(t.id))
        }
      } else if (token?.id != null) {
        defaultIds = [String(token.id)]
      } else {
        const firstAvail = allTokens.find((t) => getRemainingStock(t) > 0) || allTokens[0]
        if (firstAvail?.id != null) {
          defaultIds = [String(firstAvail.id)]
        }
      }

      setSelectedIds(defaultIds)
      setQuantities({})
      setDescription('')
      setPerformedAt(toDatetimeLocal(new Date()))
      setError('')

      requestAnimationFrame(() => firstInputRef.current?.focus())
    }
    prevOpenRef.current = open
  }, [open, token, initialTokens, allTokens])

  useEffect(() => {
    if (!open) return
    const onEsc = (e) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, saving, onClose])

  if (!open || allTokens.length === 0) return null

  const availableToSelectTokens = allTokens.filter((t) => getRemainingStock(t) > 0)
  const allAvailableSelected =
    availableToSelectTokens.length > 0 &&
    availableToSelectTokens.every((t) => selectedIds.includes(String(t.id)))

  const handleToggleToken = (idStr) => {
    if (saving) return
    const target = tokenMap.get(idStr)
    const rem = getRemainingStock(target)

    setSelectedIds((prev) => {
      const exists = prev.includes(idStr)
      if (exists) {
        if (prev.length <= 1) return prev
        return prev.filter((item) => item !== idStr)
      }
      if (rem <= 0) return prev
      return [...prev, idStr]
    })
    setError('')
  }

  const handleSelectAllAvailable = () => {
    if (saving) return
    if (allAvailableSelected) {
      const fallbackId =
        token?.id != null && getRemainingStock(token) > 0
          ? String(token.id)
          : availableToSelectTokens[0]
            ? String(availableToSelectTokens[0].id)
            : selectedIds[0]
      setSelectedIds(fallbackId ? [fallbackId] : [])
    } else {
      setSelectedIds(availableToSelectTokens.map((t) => String(t.id)))
    }
    setError('')
  }

  const handleQtyChange = (idStr, rawValue) => {
    const clean = rawValue.replace(/\D/g, '')
    setQuantities((prev) => ({
      ...prev,
      [idStr]: clean,
    }))
    setError('')
  }

  const selectedEvaluations = selectedIds
    .map((idStr) => {
      const t = tokenMap.get(idStr)
      if (!t) return null
      const total = Number(t.total_stock) || 0
      const taken = Number(t.taken_quantity) || 0
      const remaining = Math.max(0, total - taken)
      const qtyStr = quantities[idStr] || ''
      const numericQty = Number(qtyStr)
      const isValidQty = /^[1-9]\d*$/.test(qtyStr) && Number.isSafeInteger(numericQty)
      const isOverLimit = isValidQty && numericQty > remaining
      const afterReduce = Math.max(0, remaining - (isValidQty && !isOverLimit ? numericQty : 0))

      return {
        idStr,
        token: t,
        typeName: formatTokenLabel(t.token_type || ''),
        TokenIcon: getTokenIcon(t.token_type),
        remaining,
        qtyStr,
        numericQty,
        isValidQty,
        isOverLimit,
        afterReduce,
      }
    })
    .filter(Boolean)

  const isDescFilled = description.trim().length > 0
  const allSelectedValid =
    selectedEvaluations.length > 0 &&
    selectedEvaluations.every((item) => item.remaining > 0 && item.isValidQty && !item.isOverLimit)
  const canSubmit = allSelectedValid && isDescFilled

  const totalUnitsToTake = selectedEvaluations.reduce(
    (sum, item) => sum + (item.isValidQty && !item.isOverLimit ? item.numericQty : 0),
    0
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    setError('')

    if (selectedEvaluations.length === 0) {
      setError('Pilih minimal satu token.')
      return
    }

    for (const item of selectedEvaluations) {
      if (item.remaining <= 0) {
        setError(`Stok ${item.typeName} habis.`)
        return
      }
      if (!item.isValidQty) {
        setError(`Isi jumlah ${item.typeName} yang valid.`)
        return
      }
      if (item.isOverLimit) {
        setError(`Jumlah ${item.typeName} melebihi stok (${fmt.format(item.remaining)}).`)
        return
      }
    }

    if (!isDescFilled) {
      setError('Keterangan wajib diisi.')
      return
    }

    setSaving(true)
    try {
      const payload = selectedEvaluations.map((item) => ({
        token: item.token,
        quantity: item.numericQty,
      }))

      const result = await onSubmit(payload, description.trim(), performedAt || null)
      if (result === false || result?.error) {
        throw new Error(result?.error?.message || 'Gagal menyimpan.')
      }
      onClose()
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan pengambilan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        {/* Header ringkas */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Minus className="h-3.5 w-3.5" />
            </div>
            <h2 id={`${formId}-title`} className="text-sm font-semibold text-slate-900">
              Kurangi Stok Token
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Tutup"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-3.5">
            {/* Pilihan Token (Chips ringkas) */}
            {allTokens.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-600">
                    Pilih Token ({selectedIds.length})
                  </span>
                  {availableToSelectTokens.length > 1 && (
                    <button
                      type="button"
                      onClick={handleSelectAllAvailable}
                      disabled={saving}
                      className="text-xs font-medium text-red-600 hover:underline cursor-pointer"
                    >
                      {allAvailableSelected ? 'Reset' : 'Pilih Semua'}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allTokens.map((t) => {
                    const idStr = String(t.id)
                    const isSelected = selectedIds.includes(idStr)
                    const rem = getRemainingStock(t)
                    const isOut = rem <= 0
                    const label = formatTokenLabel(t.token_type)

                    return (
                      <button
                        key={idStr}
                        type="button"
                        disabled={saving || (isOut && !isSelected)}
                        onClick={() => handleToggleToken(idStr)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors cursor-pointer disabled:cursor-not-allowed ${
                          isSelected
                            ? 'border-red-300 bg-red-50 text-red-700 font-medium'
                            : isOut
                              ? 'border-slate-200 bg-slate-100 text-slate-400 opacity-60'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50/40'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="h-3 w-3 text-red-600 shrink-0" />
                        ) : (
                          <Plus className="h-3 w-3 text-slate-400 shrink-0" />
                        )}
                        <span>{label}</span>
                        <span className="text-[11px] opacity-75">({fmt.format(rem)})</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Daftar Baris Input per Token (Fit & Compact) */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
              {selectedEvaluations.map((item, idx) => {
                const {
                  idStr,
                  typeName,
                  TokenIcon,
                  remaining,
                  qtyStr,
                  isValidQty,
                  isOverLimit,
                  afterReduce,
                } = item

                return (
                  <div
                    key={idStr}
                    className={`flex items-center justify-between gap-2.5 rounded-lg border px-3 py-2 ${
                      isOverLimit
                        ? 'border-red-300 bg-red-50/30'
                        : 'border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200 text-blue-600">
                        <TokenIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {typeName}
                        </p>
                        {isOverLimit ? (
                          <p className="text-[11px] text-red-600 font-medium">
                            Maks {fmt.format(remaining)} unit
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500">
                            Stok: {fmt.format(remaining)}
                            {isValidQty && (
                              <span className="text-emerald-700 font-medium">
                                {' '}→ Sisa {fmt.format(afterReduce)}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        ref={idx === 0 ? firstInputRef : null}
                        id={`${formId}-qty-${idStr}`}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="Jumlah"
                        value={qtyStr}
                        onChange={(e) => handleQtyChange(idStr, e.target.value)}
                        disabled={saving || remaining === 0}
                        className={`h-8 w-20 sm:w-24 rounded-md border bg-white px-2.5 text-right text-xs font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400 focus:ring-2 ${
                          isOverLimit
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
                            : 'border-slate-300 focus:border-red-500 focus:ring-red-500/10'
                        }`}
                      />
                      <button
                        type="button"
                        disabled={saving || remaining === 0}
                        onClick={() => handleQtyChange(idStr, String(remaining))}
                        title="Ambil semua stok"
                        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        Maks
                      </button>

                      {selectedEvaluations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleToggleToken(idStr)}
                          disabled={saving}
                          aria-label={`Hapus ${typeName}`}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Keterangan */}
            <div>
              <label
                htmlFor={`${formId}-note`}
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Keterangan <span className="text-red-500">*</span>
              </label>
              <textarea
                id={`${formId}-note`}
                rows={2}
                maxLength={250}
                required
                placeholder="Alasan / keperluan pengambilan..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
                className={`${fieldClass} resize-none text-xs`}
              />
            </div>

            {/* Tanggal & Waktu */}
            <div>
              <label
                htmlFor={`${formId}-date`}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Tanggal &amp; Waktu
              </label>
              <DateTimePicker
                id={`${formId}-date`}
                value={performedAt}
                onChange={setPerformedAt}
                disabled={saving}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer ringkas */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
            <div className="text-xs text-slate-500">
              {totalUnitsToTake > 0 ? (
                <span>
                  Total: <strong className="text-red-600">-{fmt.format(totalUnitsToTake)} unit</strong>
                </span>
              ) : (
                <span>{selectedEvaluations.length} token dipilih</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || !canSubmit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Minus className="h-3.5 w-3.5" /> Simpan
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
