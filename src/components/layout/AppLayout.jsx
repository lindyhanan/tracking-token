import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AppLayout() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const location = useLocation()

  // Tutup drawer mobile saat navigasi rute berubah
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar: Laptop tampil di kiri, HP sebagai drawer overlay */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header dengan tombol hamburger menu yang muncul di layar HP */}
        <Header onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Page content: padding compact di HP (p-3 sm:p-5), lebih lega di desktop (lg:p-6) */}
        <main className="min-w-0 flex-1 overflow-auto p-3 sm:p-5 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
