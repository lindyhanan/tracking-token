import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar on the left */}
      <Sidebar />

      {/* Main content area — min-w-0 allows flex item to shrink below its natural width */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <Header />
        {/* Page content */}
        <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
