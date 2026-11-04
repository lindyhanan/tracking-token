import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Layers, History, Users, LogOut, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tokens', icon: Layers, label: 'Manajemen Token' },
  { to: '/history', icon: History, label: 'Riwayat' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { profile, user, signOut, isAdmin } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (err) {
      console.error('Logout error:', err)
      navigate('/login')
    }
  }

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Pengguna'

  return (
    <aside className="w-60 shrink-0 bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
          <img
            src="/LOGO BMS.avif"
            alt="Logo TokenTrack"
            className="w-full h-full object-contain"
          />
        </div>

        <div>
          <p className="text-white font-semibold text-sm leading-tight">
            PT BESMINDO MATERI SEWATAMA
          </p>
          <p className="text-slate-400 text-xs">
            Tracking Token
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider px-2 mb-2 mt-1">Menu</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
              isActive
                ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </NavLink>
        ))}

        {/* Menu Khusus Admin */}
        {isAdmin && (
          <>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider px-2 mb-2 mt-4">Admin</p>
            <NavLink
              to="/users"
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-600/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              )}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="flex-1">Kelola Pengguna</span>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </NavLink>
          </>
        )}
      </nav>

      {/* User & Logout */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-300 text-sm font-bold shrink-0 uppercase">
            {displayName[0] || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-xs font-medium truncate">{displayName}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </div>
    </aside>
  )
}
