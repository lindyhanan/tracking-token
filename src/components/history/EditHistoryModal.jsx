import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, X, Pencil, Calendar } from 'lucide-react'
import { formatTokenLabel } from '@/lib/tokenUtils'
import DateTimePicker from '@/components/ui/datetime-picker'

const fieldClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 disabled:bg-slate-50 disabled:text-slate-500'

function toDatetimeLocal(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EditHistoryModal({
  open,
  historyItem,
  onClose,
  onSubmit,
  availableTypes = [],
}) {
  const formId = useId()
  const prevOpenRef = useRef(false)

  const [form, setForm] = useState({
    performed_at: '',
    token_type: '',
    action_type: 'reduce',
    quantity_changed: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open && historyItem && !prevOpenRef.current) {
      setForm({
        performed_at:
          toDatetimeLocal(historyItem.performed_at) || toDatetimeLocal(new Date().toISOString()),
        token_type: historyItem.token_type || availableTypes[0] || 'tumbler',
        action_type: historyItem.action_type || 'reduce',
        quantity_changed: String(historyItem.quantity_changed || 1),
        description: historyItem.description || '',
      })
      setError('')
    }
    prevOpenRef.current = open
  }, [open, historyItem, availableTypes])

  useEffect(() => {
    if (!open) return
    const onEsc = (e) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, saving, onClose])

  if (!open || !historyItem) return null

  const numericQty = Number(form.quantity_changed)
  const isValidQty = /^[1-9]\d*$/.test(form.quantity_changed) && Number.isSafeInteger(numericQty)
  const canSubmit = isValidQty && form.token_type && form.performed_at

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving || !canSubmit) return
    setError('')
    setSaving(true)

    try {
      const isoDate = new Date(form.performed_at).toISOString()

      await onSubmit(historyItem.id, {
        performed_at: isoDate,
        token_type: form.token_type,
        action_type: form.action_type,
        quantity_changed: numericQty,
        description: form.description.trim(),
      })
      onClose()
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan perubahan riwayat.')
    } finally {
      setSaving(false)
    }
  }

  const allTypes = Array.from(new Set([...availableTypes, historyItem.token_type].filter(Boolean)))

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-3"
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
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Pencil className="h-3.5 w-3.5" />
            </div>
            <h2 id={`${formId}-title`} className="text-sm font-semibold text-slate-900">
              Edit Catatan Riwayat
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-3.5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            {/* Grid 2 Kolom: Jenis Token & Aksi */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label htmlFor={`${formId}-type`} className="block text-xs font-medium text-slate-700 mb-1">
                  Jenis Token <span className="text-red-500">*</span>
                </label>
                <select
                  id={`${formId}-type`}
                  value={form.token_type}
                  onChange={(e) => setForm((f) => ({ ...f, token_type: e.target.value }))}
                  disabled={saving}
                  className={fieldClass}
                >
                  {allTypes.map((t) => (
                    <option key={t} value={t}>
                      {formatTokenLabel(t)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`${formId}-action`} className="block text-xs font-medium text-slate-700 mb-1">
                  Aksi <span className="text-red-500">*</span>
                </label>
                <select
                  id={`${formId}-action`}
                  value={form.action_type}
                  onChange={(e) => setForm((f) => ({ ...f, action_type: e.target.value }))}
                  disabled={saving}
                  className={fieldClass}
                >
                  <option value="reduce">Pengurangan</option>
                  <option value="add">Penambahan</option>
                </select>
              </div>
            </div>

            {/* Jumlah Unit */}
            <div>
              <label htmlFor={`${formId}-qty`} className="block text-xs font-medium text-slate-700 mb-1">
                Jumlah Unit <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id={`${formId}-qty`}
                  type="text"
                  inputMode="numeric"
                  placeholder="Masukkan jumlah unit..."
                  value={form.quantity_changed}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      quantity_changed: e.target.value.replace(/\D/g, ''),
                    }))
                  }
                  disabled={saving}
                  className={`${fieldClass} pr-12`}
                  required
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
                  unit
                </span>
              </div>
              {!isValidQty && form.quantity_changed && (
                <p className="mt-1 text-[11px] text-red-500">
                  Jumlah harus bilangan bulat lebih dari 0.
                </p>
              )}
            </div>

            {/* Keterangan */}
            <div>
              <label htmlFor={`${formId}-desc`} className="block text-xs font-medium text-slate-700 mb-1">
                Keterangan
              </label>
              <textarea
                id={`${formId}-desc`}
                rows={2}
                placeholder="Tuliskan keterangan aktivitas..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={saving}
                className={`${fieldClass} resize-none`}
                maxLength={250}
              />
            </div>

            {/* Waktu Transaksi */}
            <div>
              <label
                htmlFor={`${formId}-waktu`}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Tanggal &amp; Waktu <span className="text-red-500">*</span>
              </label>
              <DateTimePicker
                id={`${formId}-waktu`}
                value={form.performed_at}
                onChange={(val) => setForm((f) => ({ ...f, performed_at: val }))}
                disabled={saving}
              />
            </div>
          </div>

          {/* Footer ringkas */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
            <span className="text-[11px] text-slate-400">Stok otomatis disesuaikan</span>
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  'Simpan'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
