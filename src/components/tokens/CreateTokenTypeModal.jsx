import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, X, PlusCircle, Calendar } from 'lucide-react'
import DateTimePicker from '@/components/ui/datetime-picker'

const fieldClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 disabled:bg-slate-50 disabled:text-slate-500'

function toDatetimeLocal(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Modal untuk MENAMBAH JENIS TOKEN BARU beserta stok awal.
 */
export default function CreateTokenTypeModal({ open, onClose, onSubmit }) {
  const formId = useId()
  const nameRef = useRef(null)
  const prevOpenRef = useRef(false)

  const [name, setName] = useState('')
  const [initialStock, setInitialStock] = useState('')
  const [description, setDescription] = useState('')
  const [performedAt, setPerformedAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setName('')
      setInitialStock('')
      setDescription('')
      setPerformedAt(toDatetimeLocal(new Date()))
      setError('')
      requestAnimationFrame(() => nameRef.current?.focus())
    }
    prevOpenRef.current = open
  }, [open])

  useEffect(() => {
    if (!open) return
    const onEsc = (e) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, saving, onClose])

  if (!open) return null

  const trimmedName = name.trim()
  const numericStock = Number(initialStock)
  const isValidName = trimmedName.length >= 2
  const isValidStock = /^\d+$/.test(initialStock) && numericStock >= 0
  const canSubmit = isValidName && isValidStock

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving || !canSubmit) return
    setError('')

    setSaving(true)
    try {
      const tokenType = trimmedName.toLowerCase().replace(/\s+/g, '_')
      const result = await onSubmit({
        token_type: tokenType,
        total_stock: numericStock,
        description: description.trim(),
        isNewType: true,
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
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <PlusCircle className="h-3.5 w-3.5" />
            </div>
            <h2 id={`${formId}-title`} className="text-sm font-semibold text-slate-900">
              Tambah Jenis Token Baru
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-3.5">
            {/* Nama Jenis Token */}
            <div>
              <label htmlFor={`${formId}-name`} className="block text-xs font-medium text-slate-700 mb-1">
                Nama Jenis Token <span className="text-red-500">*</span>
              </label>
              <input
                ref={nameRef}
                id={`${formId}-name`}
                type="text"
                placeholder="Contoh: Mug Keramik"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                className={fieldClass}
                maxLength={100}
              />
              {trimmedName.length > 0 && trimmedName.length < 2 && (
                <p className="mt-1 text-[11px] text-red-500">Nama minimal 2 karakter.</p>
              )}
            </div>

            {/* Stok Awal */}
            <div>
              <label htmlFor={`${formId}-stock`} className="block text-xs font-medium text-slate-700 mb-1">
                Stok Awal <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id={`${formId}-stock`}
                  type="text"
                  inputMode="numeric"
                  placeholder="Masukkan stok awal..."
                  value={initialStock}
                  onChange={(e) => setInitialStock(e.target.value.replace(/\D/g, ''))}
                  disabled={saving}
                  className={`${fieldClass} pr-12`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                  unit
                </span>
              </div>
            </div>

            {/* Keterangan */}
            <div>
              <label htmlFor={`${formId}-desc`} className="block text-xs font-medium text-slate-700 mb-1">
                Keterangan <span className="text-slate-400 font-normal text-[11px]">(opsional)</span>
              </label>
              <textarea
                id={`${formId}-desc`}
                rows={2}
                placeholder="Contoh: Token khusus untuk area produksi..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
                className={`${fieldClass} resize-none`}
                maxLength={200}
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

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Footer ringkas */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
            <div className="text-xs text-slate-500 truncate max-w-[180px]">
              {trimmedName ? (
                <span>
                  Jenis: <strong className="text-emerald-700">{trimmedName}</strong>
                </span>
              ) : (
                <span>Jenis Token Baru</span>
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-3.5 w-3.5" /> Simpan
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
