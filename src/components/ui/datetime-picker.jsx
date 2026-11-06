import { useEffect, useMemo, useState } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight, Check, RotateCcw } from 'lucide-react'

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

function pad(n) {
  return String(n).padStart(2, '0')
}

export function toDatetimeLocalString(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(d.getTime())) {
    const now = new Date()
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseValue(val) {
  if (!val) return new Date()
  const d = new Date(val)
  return Number.isNaN(d.getTime()) ? new Date() : d
}

export default function DateTimePicker({
  id,
  value,
  onChange,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)

  const currentDate = useMemo(() => parseValue(value), [value])

  // Draft state saat picker dibuka (baru diterapkan saat klik "Oke")
  const [viewYear, setViewYear] = useState(() => currentDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(() => currentDate.getMonth())
  const [draftYear, setDraftYear] = useState(() => currentDate.getFullYear())
  const [draftMonth, setDraftMonth] = useState(() => currentDate.getMonth())
  const [draftDay, setDraftDay] = useState(() => currentDate.getDate())
  const [draftHour, setDraftHour] = useState(() => pad(currentDate.getHours()))
  const [draftMinute, setDraftMinute] = useState(() => pad(currentDate.getMinutes()))

  useEffect(() => {
    if (!open) return
    const d = parseValue(value)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
    setDraftYear(d.getFullYear())
    setDraftMonth(d.getMonth())
    setDraftDay(d.getDate())
    setDraftHour(pad(d.getHours()))
    setDraftMinute(pad(d.getMinutes()))
  }, [open, value])

  const formattedDisplay = useMemo(() => {
    const d = parseValue(value)
    const datePart = d.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    return { datePart, timePart }
  }, [value])

  // Bangun grid hari untuk bulan yang sedang dilihat
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

    const cells = []
    // Hari dari bulan sebelumnya
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        monthOffset: -1,
      })
    }
    // Hari di bulan ini
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d,
        monthOffset: 0,
      })
    }
    // Genapkan hingga kelipatan 7
    const remaining = (7 - (cells.length % 7)) % 7
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        day: d,
        monthOffset: 1,
      })
    }
    return cells
  }, [viewYear, viewMonth])

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const handleSelectCell = (cell) => {
    const targetDate = new Date(viewYear, viewMonth + cell.monthOffset, cell.day)
    setDraftYear(targetDate.getFullYear())
    setDraftMonth(targetDate.getMonth())
    setDraftDay(targetDate.getDate())
    setViewYear(targetDate.getFullYear())
    setViewMonth(targetDate.getMonth())
  }

  const handleSetNow = () => {
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    setDraftYear(now.getFullYear())
    setDraftMonth(now.getMonth())
    setDraftDay(now.getDate())
    setDraftHour(pad(now.getHours()))
    setDraftMinute(pad(now.getMinutes()))
  }

  const handleConfirm = () => {
    const h = Math.min(23, Math.max(0, Number(draftHour) || 0))
    const m = Math.min(59, Math.max(0, Number(draftMinute) || 0))
    const finalDate = new Date(draftYear, draftMonth, draftDay, h, m)
    onChange(toDatetimeLocalString(finalDate))
    setOpen(false)
  }

  const today = new Date()
  const hoursList = Array.from({ length: 24 }, (_, i) => pad(i))
  const minutesList = Array.from({ length: 60 }, (_, i) => pad(i))

  return (
    <>
      {/* Tombol pemicu yang rapi dan rounded */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-left text-xs sm:text-sm text-slate-800 shadow-2xs transition-all hover:border-blue-400 hover:bg-slate-50/60 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Calendar className="h-3.5 w-3.5" />
          </span>
          <span className="font-medium text-slate-800 truncate">
            {formattedDisplay.datePart}
          </span>
        </span>

        <span className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            <Clock className="h-3 w-3 text-slate-500" />
            {formattedDisplay.timePart}
          </span>
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
            Ubah
          </span>
        </span>
      </button>

      {/* Dialog pemilih Tanggal & Waktu dengan tombol Oke */}
      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[1px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pilih Tanggal dan Waktu"
            className="w-full max-w-[310px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Header Bulan & Tahun */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-slate-800">
                {MONTHS_ID[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 space-y-3">
              {/* Grid Hari Kalender */}
              <div>
                <div className="grid grid-cols-7 mb-1">
                  {DAYS_ID.map((dayName) => (
                    <div
                      key={dayName}
                      className="text-center text-[10px] font-semibold uppercase text-slate-400 py-1"
                    >
                      {dayName}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((cell, idx) => {
                    const cellDate = new Date(viewYear, viewMonth + cell.monthOffset, cell.day)
                    const isCurrentMonth = cell.monthOffset === 0
                    const isSelected =
                      cellDate.getFullYear() === draftYear &&
                      cellDate.getMonth() === draftMonth &&
                      cellDate.getDate() === draftDay
                    const isToday =
                      cellDate.getFullYear() === today.getFullYear() &&
                      cellDate.getMonth() === today.getMonth() &&
                      cellDate.getDate() === today.getDate()

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectCell(cell)}
                        className={`h-8 w-full rounded-xl text-xs transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : isToday
                              ? 'border border-blue-300 bg-blue-50/60 text-blue-700 font-semibold'
                              : isCurrentMonth
                                ? 'text-slate-700 hover:bg-slate-100 font-medium'
                                : 'text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {cell.day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Pemilih Jam & Menit */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  Waktu
                </span>
                <div className="flex items-center gap-1.5">
                  <select
                    aria-label="Jam"
                    value={draftHour}
                    onChange={(e) => setDraftHour(e.target.value)}
                    className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                  >
                    {hoursList.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-bold text-slate-500">:</span>
                  <select
                    aria-label="Menit"
                    value={draftMinute}
                    onChange={(e) => setDraftMinute(e.target.value)}
                    className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                  >
                    {minutesList.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Footer Konfirmasi (Sekarang, Batal, Oke) */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-3.5 py-2.5">
              <button
                type="button"
                onClick={handleSetNow}
                className="inline-flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                Sekarang
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-2xs cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  Oke
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
