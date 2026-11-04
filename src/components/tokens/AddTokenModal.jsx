import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, X, Plus, Calendar } from 'lucide-react'
import { formatTokenLabel } from '@/lib/tokenUtils'

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 disabled:bg-slate-50 disabled:text-slate-500'

const formatNumber = new Intl.NumberFormat('id-ID')

function toDatetimeLocal(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Modal untuk MENAMBAH STOK pada jenis token yang sudah ada.
 */
export default function AddTokenModal({ open, onClose, onSubmit, availableTypes = [] }) {
  const formId = useId()
  const qtyRef = useRef(null)

  const [selectedType, setSelectedType] = useState('')
  const [quantity, setQuantity] = useState('')
  const [description, setDescription] = useState('')
  const [performedAt, setPerformedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    const defaultType = availableTypes[0] || ''
    setSelectedType(defaultType)
    setQuantity('')
    setDescription('')
    setPerformedAt(toDatetimeLocal(new Date()))
    setError('')
    const frame = requestAnimationFrame(() => qtyRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open, availableTypes])

  useEffect(() => {
    if (!open) return
    const onEsc = (e) => { if (e.key === 'Escape' && !saving) onClose() }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, saving, onClose])

  if (!open) return null

  const numericQty = Number(quantity)
  const isValidQty = /^[1-9]\d*$/.test(quantity) && Number.isSafeInteger(numericQty)
  const canSubmit = isValidQty && selectedType

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving || !canSubmit) return
    setError('')

    setSaving(true)
    try {
      const result = await onSubmit({
        token_type: selectedType,
        total_stock: numericQty,
        description: description.trim(),
        performed_at: performedAt || new Date().toISOString(),
      })
      if (result?.error) throw new Error(result.error.message)
      onClose()
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan. Silakan coba lagi.')
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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id={`${formId}-title`} className="text-base font-semibold text-slate-900">
              Tambah Stok Token
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Tambah jumlah stok pada jenis token yang sudah ada</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            {/* Jenis Token */}
            <div>
              <label htmlFor={`${formId}-type`} className="block text-sm font-medium text-slate-700 mb-1.5">
                Jenis Token <span className="text-red-500">*</span>
              </label>
              {availableTypes.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Belum ada jenis token. Tambahkan jenis token baru terlebih dahulu.</p>
              ) : (
                <select
                  id={`${formId}-type`}
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  disabled={saving}
                  className={fieldClass}
                >
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>{formatTokenLabel(t)}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Jumlah */}
            <div>
              <label htmlFor={`${formId}-qty`} className="block text-sm font-medium text-slate-700 mb-1.5">
                Jumlah Masuk <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={qtyRef}
                  id={`${formId}-qty`}
                  type="text"
                  inputMode="numeric"
                  placeholder="Masukkan jumlah"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
                  disabled={saving}
                  className={`${fieldClass} pr-14`}
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">unit</span>
              </div>
              {isValidQty && (
                <p className="mt-1 text-xs text-slate-500">
                  Akan menambah <span className="font-semibold text-blue-700">+{formatNumber.format(numericQty)} unit</span> ke stok {formatTokenLabel(selectedType)}
                </p>
              )}
            </div>

            {/* Keterangan */}
            <div>
              <label htmlFor={`${formId}-desc`} className="block text-sm font-medium text-slate-700 mb-1.5">
                Keterangan <span className="text-slate-400 font-normal text-xs">(opsional)</span>
              </label>
              <input
                id={`${formId}-desc`}
                type="text"
                placeholder="Contoh: Pengadaan stok minggu ini"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
                className={fieldClass}
                maxLength={200}
              />
            </div>

            {/* Tanggal & Waktu */}
            <div>
              <label htmlFor={`${formId}-date`} className="block text-sm font-medium text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Tanggal &amp; Waktu
                </span>
              </label>
              <input
                id={`${formId}-date`}
                type="datetime-local"
                value={performedAt}
                onChange={(e) => setPerformedAt(e.target.value)}
                disabled={saving}
                className={fieldClass}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
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
              className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...</> : <><Plus className="h-4 w-4" /> Tambah Stok</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
