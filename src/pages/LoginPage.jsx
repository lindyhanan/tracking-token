import { useState } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const navigate = useNavigate()
  const { signIn, user, loading: authLoading } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Jika sudah ada sesi aktif, langsung alihkan ke dashboard
  if (!authLoading && user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.email || !form.password) {
      setError('Email dan kata sandi wajib diisi.')
      return
    }

    setLoading(true)
    try {
      await signIn({
        email: form.email.trim(),
        password: form.password,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Login error:', err)
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) {
        setError('Email atau kata sandi tidak valid. Silakan periksa kembali.')
      } else if (msg.includes('Email not confirmed')) {
        setError('Email belum dikonfirmasi. Silakan periksa kotak masuk email Anda.')
      } else {
        setError(msg || 'Gagal masuk. Silakan coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#071326] flex flex-col justify-between relative overflow-hidden text-slate-100">
      {/* Background Ambience - Biru Dongker Tua (Deep Navy) */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[420px] h-[420px] bg-[#16386b]/40 rounded-full blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[420px] h-[420px] bg-[#0c2347]/50 rounded-full blur-[100px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#122e56]/20 rounded-full blur-[140px]" />

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-[440px]">
          {/* Card Utama */}
          <div className="bg-white rounded-2xl shadow-2xl shadow-[#040b17]/60 border border-[#1b3a6b]/30 overflow-hidden text-slate-900">
            {/* Header Biru Dongker Tua Elegan */}
            <div className="bg-gradient-to-b from-[#0c2144] via-[#091b38] to-[#071730] px-8 pt-8 pb-7 text-center relative border-b border-[#163768]">
              {/* Badge Logo BMS */}
              <div className="w-20 h-20 rounded-2xl bg-white shadow-xl p-2.5 mx-auto mb-4 flex items-center justify-center border border-white/80 ring-4 ring-[#16386b]/50 transition-transform duration-300 hover:scale-105">
                <img
                  src="/LOGO BMS.avif"
                  alt="Logo PT Besmindo Materi Sewatama"
                  className="w-full h-full object-contain"
                />
              </div>

              <h1 className="text-xl font-bold tracking-tight text-white uppercase">
                PT Besmindo Materi Sewatama
              </h1>
              <p className="text-blue-200 text-xs font-medium mt-1 tracking-wider uppercase">
                TokenTrack — Sistem Monitoring Token
              </p>
            </div>

            {/* Form Konten */}
            <div className="p-7 sm:p-8 bg-white">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-[#0c2144] tracking-tight">
                  Masuk ke Akun
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Gunakan email dan kata sandi Anda untuk mengakses sistem
                </p>
              </div>

              {/* Alert Error */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span className="flex-1 leading-relaxed">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Input Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                    Alamat Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@besmindo.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="pl-10 h-11 border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0c2144] focus:ring-[#0c2144]/15"
                      required
                      autoComplete="email"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Input Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                      Kata Sandi
                    </Label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      className="pl-10 pr-10 h-11 border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0c2144] focus:ring-[#0c2144]/15"
                      required
                      autoComplete="current-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0c2144] focus:outline-none cursor-pointer"
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button - Biru Dongker Tua Solid Elegan */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 mt-2 bg-[#0c2144] hover:bg-[#122e5e] text-white font-medium rounded-lg text-sm shadow-md shadow-[#0c2144]/25 transition-all cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memverifikasi...
                    </span>
                  ) : (
                    'Masuk ke Sistem'
                  )}
                </Button>
              </form>

              {/* Link Daftar */}
              <div className="mt-6 text-center text-sm text-slate-500">
                Belum memiliki akun?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-[#0c2144] hover:text-[#194685] hover:underline transition-colors"
                >
                  Daftar sekarang
                </Link>
              </div>
            </div>

            {/* Footer Kartu */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0c2144]" />
              <span>Akses Terautentikasi &bull; Internal PT BMS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bawah Halaman */}
      <footer className="text-center py-4 text-xs text-blue-300/60 z-10">
        &copy; {new Date().getFullYear()} PT Besmindo Materi Sewatama. Hak Cipta Dilindungi.
      </footer>
    </div>
  )
}
