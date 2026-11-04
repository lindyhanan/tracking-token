import { useEffect, useId, useState } from 'react'
import { Loader2, X, Pencil, Calendar, Package, ArrowUpDown, FileText, Hash } from 'lucide-react'
import { formatTokenLabel } from '@/lib/tokenUtils'

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 disabled:bg-slate-50 disabled:text-slate-500'

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
    if (!open || !historyItem) return
    setForm({
      performed_at: toDatetimeLocal(historyItem.performed_at) || toDatetimeLocal(new Date().toISOString()),
      token_type: historyItem.token_type || availableTypes[0] || 'tumbler',
      action_type: historyItem.action_type || 'reduce',
      quantity_changed: String(historyItem.quantity_changed || 1),
      description: historyItem.description || '',
    })
    setError('')
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

  // Gabungkan jenis token unik dari availableTypes dan token_type item saat ini
  const allTypes = Array.from(new Set([...availableTypes, historyItem.token_type].filter(Boolean)))

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <h2 id={`${formId}-title`} className="text-base font-semibold text-slate-900">
                Edit Catatan Riwayat
              </h2>
              <p className="text-xs text-slate-500">
                Ubah rincian transaksi riwayat dan sinkronkan persediaan
              </p>
            </div>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                {error}
              </div>
            )}

            {/* Waktu Transaksi */}
            <div>
              <label htmlFor={`${formId}-waktu`} className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Waktu Transaksi <span className="text-red-500">*</span>
              </label>
              <input
                id={`${formId}-waktu`}
                type="datetime-local"
                value={form.performed_at}
                onChange={(e) => setForm((f) => ({ ...f, performed_at: e.target.value }))}
                disabled={saving}
                className={fieldClass}
                required
              />
            </div>

            {/* Grid 2 Kolom: Jenis Token & Aksi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Jenis Token */}
              <div>
                <label htmlFor={`${formId}-type`} className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
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

              {/* Aksi */}
              <div>
                <label htmlFor={`${formId}-action`} className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  Aksi yang Dilakukan <span className="text-red-500">*</span>
                </label>
                <select
                  id={`${formId}-action`}
                  value={form.action_type}
                  onChange={(e) => setForm((f) => ({ ...f, action_type: e.target.value }))}
                  disabled={saving}
                  className={fieldClass}
                >
                  <option value="reduce">Pengurangan (Diambil)</option>
                  <option value="add">Penambahan (Stok Masuk)</option>
                </select>
              </div>
            </div>

            {/* Jumlah Unit */}
            <div>
              <label htmlFor={`${formId}-qty`} className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Jumlah Unit <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id={`${formId}-qty`}
                  type="text"
                  inputMode="numeric"
                  placeholder="Masukkan jumlah unit"
                  value={form.quantity_changed}
                  onChange={(e) => setForm((f) => ({ ...f, quantity_changed: e.target.value.replace(/\D/g, '') }))}
                  disabled={saving}
                  className={`${fieldClass} pr-14`}
                  required
                />
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  unit
                </span>
              </div>
              {!isValidQty && form.quantity_changed && (
                <p className="mt-1 text-xs text-red-500">Jumlah harus berupa bilangan bulat positif lebih dari 0.</p>
              )}
            </div>

            {/* Keterangan */}
            <div>
              <label htmlFor={`${formId}-desc`} className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Keterangan
              </label>
              <textarea
                id={`${formId}-desc`}
                rows={3}
                placeholder="Tuliskan keterangan aktivitas..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={saving}
                className={`${fieldClass} resize-none`}
                maxLength={250}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-6 py-4">
            <p className="text-xs text-slate-400">
              * Stok persediaan di dashboard akan otomatis disesuaikan
            </p>
            <div className="flex gap-2">
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
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
