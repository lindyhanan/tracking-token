import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  ChevronDown,
  History,
  Layers,
  LogIn,
  LogOut,
  Menu,
  PackageMinus,
  PackagePlus,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { notifyLoginOnce, useNotifications } from '@/hooks/useNotifications'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/tokens': 'Manajemen Token',
  '/history': 'Riwayat',
  '/users': 'Pengguna',
}

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function formatTime(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '-'
    : `${dateTimeFormatter.format(date)} WIB`
}

function EventIcon({ type }) {
  if (type === 'login') return <LogIn className="h-4 w-4" />
  if (type === 'add') return <PackagePlus className="h-4 w-4" />
  if (type === 'reduce') return <PackageMinus className="h-4 w-4" />
  return <Bell className="h-4 w-4" />
}

// Header tidak fixed. Letakkan di dalam kolom konten AppLayout.
export default function Header({ title, onMenuClick }) {
  const { pathname } = useLocation()
  const { user, profile, loading, isAdmin, signOut } = useAuth()
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications()
  const [openPanel, setOpenPanel] = useState(null)
  const [accountError, setAccountError] = useState('')
  const panelRef = useRef(null)

  const heading = title || PAGE_TITLES[pathname] || 'TokenTrack'
  const name = profile?.full_name || user?.name || 'Pengunjung'
  const initial = name.charAt(0).toUpperCase()

  useEffect(() => {
    if (!loading && user?.id) notifyLoginOnce(user.id)
  }, [loading, user?.id])

  useEffect(() => {
    setOpenPanel(null)
  }, [pathname])

  useEffect(() => {
    if (!openPanel) return

    const closeOnOutside = event => {
      if (!panelRef.current?.contains(event.target)) setOpenPanel(null)
    }
    const closeOnEscape = event => {
      if (event.key === 'Escape') setOpenPanel(null)
    }

    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openPanel])

  async function handleSwitchAccount() {
    if (typeof signOut !== 'function') return
    if (!window.confirm('Apakah Anda yakin ingin keluar (logout)?')) return

    setAccountError('')
    try {
      await signOut()
      setOpenPanel(null)
    } catch (err) {
      setAccountError(err?.message || 'Gagal keluar')
    }
  }

  return (
    <header className="sticky top-0 z-30 h-14 w-full shrink-0 border-b border-slate-200 bg-white">
      <div className="flex h-full min-w-0 items-center justify-between gap-3 px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          {typeof onMenuClick === 'function' && (
            <button
              type="button"
              onClick={onMenuClick}
              aria-label="Buka sidebar"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <h1 className="truncate text-sm font-semibold text-slate-800 sm:text-base">
            {heading}
          </h1>
        </div>

        <div ref={panelRef} className="relative flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            aria-label={`Notifikasi: ${unreadCount} belum dibaca`}
            aria-expanded={openPanel === 'notifications'}
            aria-haspopup="dialog"
            onClick={() => setOpenPanel(current => current === 'notifications' ? null : 'notifications')}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-0.5 text-[10px] font-semibold leading-none text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-slate-200" />

          <button
            type="button"
            aria-label="Profil pengunjung"
            aria-expanded={openPanel === 'profile'}
            aria-haspopup="menu"
            onClick={() => setOpenPanel(current => current === 'profile' ? null : 'profile')}
            className="flex h-9 max-w-44 items-center gap-2 rounded-md px-1.5 hover:bg-slate-100"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
              {initial}
            </span>
            <span className="hidden max-w-24 truncate text-xs font-medium text-slate-700 sm:block">
              {name}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
          </button>

          {openPanel === 'notifications' && (
            <div
              role="dialog"
              aria-label="Notifikasi TokenTrack"
              className="absolute right-0 top-11 z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Notifikasi</p>
                  <p className="text-[11px] text-slate-500">{unreadCount} belum dibaca</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={markAllRead} disabled={!unreadCount}
                    title="Tandai semua dibaca" aria-label="Tandai semua dibaca"
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40">
                    <CheckCheck className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={clearAll} disabled={!notifications.length}
                    title="Hapus notifikasi" aria-label="Hapus semua notifikasi"
                    className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-3 py-8 text-center text-xs text-slate-500">Belum ada notifikasi.</p>
                ) : notifications.map(item => (
                  <div key={item.id} className={`flex gap-2.5 border-b border-slate-100 px-3 py-2.5 last:border-0 ${item.read ? '' : 'bg-blue-50/40'}`}>
                    <span className="mt-0.5 text-slate-500"><EventIcon type={item.type} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800">{item.title}</p>
                      {item.message && <p className="mt-0.5 break-words text-xs text-slate-600">{item.message}</p>}
                      <p className="mt-1 text-[10px] text-slate-400">{formatTime(item.createdAt)}</p>
                    </div>
                    {!item.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {openPanel === 'profile' && (
            <div role="menu" aria-label="Menu profil" className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-3 py-3">
                <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
              </div>
              <Link to="/history" role="menuitem" onClick={() => setOpenPanel(null)}
                className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50">
                <History className="h-4 w-4" /> Riwayat
              </Link>
              {typeof signOut === 'function' && (
                <button type="button" role="menuitem" onClick={handleSwitchAccount}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50">
                  <LogOut className="h-4 w-4" /> Keluar
                </button>
              )}
              {accountError && <p role="alert" className="px-3 py-2 text-xs text-red-600">{accountError}</p>}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
