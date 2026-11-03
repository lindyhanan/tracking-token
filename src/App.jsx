import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import { AuthProvider, useAuth } from '@/hooks/useAuth'
import AppLayout from '@/components/layout/AppLayout'

import DashboardPage from '@/pages/DashboardPage'
import TokensPage from '@/pages/TokensPage'
import HistoryPage from '@/pages/HistoryPage'
import UsersPage from '@/pages/UsersPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'

import { Loader2 } from 'lucide-react'

// Protected Route untuk memastikan user sudah login
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#071326]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-white font-semibold text-lg">PT Besmindo Materi Sewatama</h2>
          <p className="text-slate-400 text-sm mt-2">Memeriksa status login pengguna...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Redirect cerdas untuk rute root (/)
// Saat membuka web: wajib login terlebih dahulu baru bisa masuk dashboard
function RootRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#071326]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-white font-semibold text-lg">PT Besmindo Materi Sewatama</h2>
          <p className="text-slate-400 text-sm mt-2">Memeriksa status login pengguna...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to="/dashboard" replace />
}

// Routing utama
function AppRoutes() {
  return (
    <Routes>
      {/* Saat membuka web (/): arahkan ke login jika belum login, atau ke dashboard jika sudah login */}
      <Route path="/" element={<RootRedirect />} />

      {/* Halaman Auth Publik */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Halaman yang Memerlukan Login (Dilindungi ProtectedRoute) */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tokens" element={<TokensPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Route>

      {/* Rute tidak dikenal dialihkan melalui RootRedirect */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}

// Root App
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
