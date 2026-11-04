import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Layers, History, Users, LogOut, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tokens', icon: Layers, label: 'Manajemen Token' },
  { to: '/history', icon: History, label: 'Riwayat' },
]

function SidebarContent({ onClose, isMobile = false }) {
  const navigate = useNavigate()
  const { profile, user, signOut, isAdmin } = useAuth()

  const handleSignOut = async () => {
    try {
      if (typeof onClose === 'function') onClose()
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
      navigate('/login')
    }
  }

  const handleNavClick = () => {
    if (isMobile && typeof onClose === 'function') {
      onClose()
    }
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Pengguna'

  return (
    <div className="flex h-full flex-col">
      {/* Header / Logo */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4 sm:py-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg overflow-hidden shrink-0">
            <img
              src="/LOGO BMS.avif"
              alt="Logo TokenTrack"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="min-w-0">
            <p className="truncate text-white font-semibold text-xs sm:text-sm leading-tight">
              PT BESMINDO MATERI SEWATAMA
            </p>
            <p className="text-slate-400 text-[11px] sm:text-xs">
              Tracking Token
            </p>
          </div>
        </div>

        {/* Tombol Tutup Khusus Mobile */}
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider px-2 mb-2 mt-1">
          Menu Utama
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={handleNavClick}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
              isActive
                ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </NavLink>
        ))}

        {/* Menu Khusus Admin */}
        {isAdmin && (
          <>
            <p className="text-slate-500 text-[11px] font-semibold uppercase tracking-wider px-2 mb-2 mt-4">
              Administrator
            </p>
            <NavLink
              to="/users"
              onClick={handleNavClick}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              )}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">Kelola Pengguna</span>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          </>
        )}
      </nav>

      {/* User & Logout */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300 text-xs font-bold shrink-0 uppercase">
            {displayName[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-xs font-medium truncate">{displayName}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-xs sm:text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </div>
  )
}

export default function Sidebar({ mobileOpen = false, onClose }) {
  return (
    <>
      {/* ── DESKTOP / LAPTOP: Sidebar tetap di samping kiri (w-60) ── */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-slate-900 flex-col min-h-screen">
        <SidebarContent />
      </aside>

      {/* ── MOBILE / HP: Drawer meluncur dari kiri jika tombol menu dibuka ── */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden transition-all duration-300',
          mobileOpen ? 'visible' : 'invisible pointer-events-none'
        )}
      >
        {/* Backdrop gelap */}
        <div
          className={cn(
            'fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300',
            mobileOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onClose}
        />

        {/* Drawer panel */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[82vw] flex-col bg-slate-900 shadow-2xl transition-transform duration-300 ease-in-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <SidebarContent onClose={onClose} isMobile />
        </aside>
      </div>
    </>
  )
}
