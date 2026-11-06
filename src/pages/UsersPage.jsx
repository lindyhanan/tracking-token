import { useState, useEffect, useRef } from 'react'
import {
  Users,
  RefreshCw,
  Shield,
  User,
  Search,
  Camera,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  Pencil,
  X,
  Building2,
  Phone,
  AtSign,
  Mail,
  ChevronDown,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'
import { useAuth, getUserExtendedMeta } from '@/hooks/useAuth'

const fieldClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 disabled:bg-slate-50 disabled:text-slate-500'

const AVATAR_PRESETS = [
  { id: 'blue', bg: '#2563EB', label: 'Biru' },
  { id: 'violet', bg: '#7C3AED', label: 'Ungu' },
  { id: 'emerald', bg: '#059669', label: 'Hijau' },
  { id: 'rose', bg: '#E11D48', label: 'Merah' },
  { id: 'amber', bg: '#D97706', label: 'Emas' },
]

function makeSvgAvatar(initial, bgColor) {
  const letter = (initial || 'U').charAt(0).toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="64" fill="${bgColor}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, sans-serif" font-weight="700" font-size="56">${letter}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const size = 160
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const minSide = Math.min(img.width, img.height)
        const sx = (img.width - minSide) / 2
        const sy = (img.height - minSide) / 2
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => reject(new Error('Gagal membaca gambar'))
      img.src = e.target.result
    }
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsDataURL(file)
  })
}

export default function UsersPage() {
  const {
    user,
    profile,
    updateProfile,
    updatePassword,
    updateOtherUserProfile,
    deleteOtherUserProfile,
  } = useAuth()

  const fileInputRef = useRef(null)

  // Dropdown section mana yang sedang terbuka ('profile' | 'password' | null)
  const [activeDropdown, setActiveDropdown] = useState(null)

  // State daftar pengguna
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // State form profil saya (tanpa input role)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [department, setDepartment] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })

  // State form ubah password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [passMsg, setPassMsg] = useState({ type: '', text: '' })

  // State modal edit pengguna lain
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({
    full_name: '',
    username: '',
    department: '',
    role: 'member',
  })
  const [savingUserEdit, setSavingUserEdit] = useState(false)
  const [userEditError, setUserEditError] = useState('')

  // State konfirmasi hapus pengguna
  const [deletingUser, setDeletingUser] = useState(null)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [deleteUserError, setDeleteUserError] = useState('')

  useEffect(() => {
    if (!profile && !user) return
    const defaultUser = user?.email?.split('@')[0] || 'user'
    setFullName(profile?.full_name || defaultUser)
    setUsername(profile?.username || defaultUser)
    setDepartment(profile?.department || '')
    setPhone(profile?.phone || '')
    setAvatarUrl(profile?.avatar_url || '')
  }, [profile, user])

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
      } else {
        const enriched = (data || [])
          .map((u) => {
            const ext = getUserExtendedMeta(u.id)
            if (ext.deleted) return null
            return {
              ...u,
              full_name: ext.full_name || u.full_name || 'Pengguna',
              username:
                ext.username ||
                u.username ||
                (u.full_name || 'user').toLowerCase().replace(/\s+/g, '.'),
              role: u.role || ext.role || 'member',
              department: ext.department || u.department || '',
              avatar_url: ext.avatar_url || u.avatar_url || '',
            }
          })
          .filter(Boolean)
        setUsers(enriched)
      }
    } catch (err) {
      console.error('Exception fetching users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  const toggleDropdown = (key) => {
    setActiveDropdown((prev) => (prev === key ? null : key))
    setProfileMsg({ type: '', text: '' })
    setPassMsg({ type: '', text: '' })
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setProfileMsg({ type: 'error', text: 'Pilih file gambar (JPG, PNG, atau WEBP).' })
      return
    }
    try {
      const dataUrl = await compressImageFile(file)
      setAvatarUrl(dataUrl)
      setProfileMsg({ type: 'info', text: 'Foto siap disimpan. Klik Simpan Profil.' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Gagal memuat foto.' })
    } finally {
      e.target.value = ''
    }
  }

  const handlePresetAvatar = (bgColor) => {
    const svgUrl = makeSvgAvatar(fullName || username || 'U', bgColor)
    setAvatarUrl(svgUrl)
    setProfileMsg({ type: 'info', text: 'Avatar dipilih. Klik Simpan Profil.' })
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (savingProfile) return
    setProfileMsg({ type: '', text: '' })

    if (!fullName.trim()) {
      setProfileMsg({ type: 'error', text: 'Nama lengkap wajib diisi.' })
      return
    }
    if (!username.trim()) {
      setProfileMsg({ type: 'error', text: 'Username wajib diisi.' })
      return
    }

    setSavingProfile(true)
    try {
      await updateProfile({
        full_name: fullName.trim(),
        username: username.trim().replace(/\s+/g, '').toLowerCase(),
        department: department.trim(),
        phone: phone.trim(),
        avatar_url: avatarUrl,
      })
      setProfileMsg({ type: 'success', text: 'Profil berhasil diperbarui!' })
      await fetchUsers()
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: err?.message || 'Gagal menyimpan profil.',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSavePassword = async (e) => {
    e.preventDefault()
    if (savingPass) return
    setPassMsg({ type: '', text: '' })

    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'Password baru minimal 6 karakter.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'Konfirmasi password tidak cocok.' })
      return
    }

    setSavingPass(true)
    try {
      await updatePassword(newPassword)
      setNewPassword('')
      setConfirmPassword('')
      setPassMsg({ type: 'success', text: 'Password berhasil diperbarui!' })
    } catch (err) {
      setPassMsg({
        type: 'error',
        text: err?.message || 'Gagal mengubah password.',
      })
    } finally {
      setSavingPass(false)
    }
  }

  const openEditUserModal = (target) => {
    setEditingUser(target)
    setEditForm({
      full_name: target.full_name || '',
      username: target.username || '',
      department: target.department || '',
      role: target.role || 'member',
    })
    setUserEditError('')
  }

  const handleSaveOtherUser = async (e) => {
    e.preventDefault()
    if (!editingUser || savingUserEdit) return
    setUserEditError('')

    if (!editForm.full_name.trim()) {
      setUserEditError('Nama pengguna wajib diisi.')
      return
    }

    setSavingUserEdit(true)
    try {
      await updateOtherUserProfile(editingUser.id, {
        full_name: editForm.full_name.trim(),
        username: editForm.username.trim().replace(/\s+/g, '').toLowerCase(),
        department: editForm.department.trim(),
        role: editForm.role,
      })
      setEditingUser(null)
      await fetchUsers()
    } catch (err) {
      setUserEditError(err?.message || 'Gagal memperbarui data pengguna.')
    } finally {
      setSavingUserEdit(false)
    }
  }

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser || isDeletingUser) return
    setDeleteUserError('')
    setIsDeletingUser(true)
    try {
      await deleteOtherUserProfile(deletingUser.id)
      setUsers((prev) => prev.filter((u) => String(u.id) !== String(deletingUser.id)))
      if (editingUser && String(editingUser.id) === String(deletingUser.id)) {
        setEditingUser(null)
      }
      setDeletingUser(null)
    } catch (err) {
      setDeleteUserError(err?.message || 'Gagal menghapus pengguna.')
    } finally {
      setIsDeletingUser(false)
    }
  }

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '-'

  const filteredUsers = (users || []).filter((u) => {
    const term = search.toLowerCase()
    const matchSearch =
      !term ||
      (u.full_name || '').toLowerCase().includes(term) ||
      (u.username || '').toLowerCase().includes(term) ||
      (u.department || '').toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term)
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const currentRole = profile?.role || 'member'
  const initial = (fullName || username || 'U').charAt(0).toUpperCase()

  return (
    <div className="space-y-4 pb-8 min-w-0">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Kelola Akun &amp; Pengguna
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Pengaturan profil akun, keamanan password, dan akses pengguna sistem
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          className="rounded-xl gap-1.5 border-slate-300 text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Perbarui Data
        </Button>
      </div>

      {/* ── Bar Profil & Menu Dropdown (Profil Akun & Ubah Password) ── */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          {/* Info Singkat Akun */}
          <div className="flex items-center gap-3 min-w-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="h-11 w-11 rounded-2xl object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white text-sm font-bold">
                {initial}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
                <Badge
                  variant={currentRole === 'admin' ? 'default' : 'secondary'}
                  className="rounded-lg gap-1 text-[10px] px-2 py-0.5"
                >
                  {currentRole === 'admin' ? (
                    <Shield className="w-2.5 h-2.5" />
                  ) : (
                    <User className="w-2.5 h-2.5" />
                  )}
                  {currentRole === 'admin' ? 'Admin' : 'Member'}
                </Badge>
              </div>
              <p className="truncate text-xs text-slate-500">
                @{username} · {user?.email || '-'}
              </p>
            </div>
          </div>

          {/* Tombol Trigger Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleDropdown('profile')}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                activeDropdown === 'profile'
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <User className="h-3.5 w-3.5 text-blue-600" />
              Profil Akun
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  activeDropdown === 'profile' ? 'rotate-180 text-blue-600' : 'text-slate-400'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => toggleDropdown('password')}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                activeDropdown === 'password'
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-600" />
              Ubah Password
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  activeDropdown === 'password' ? 'rotate-180 text-amber-600' : 'text-slate-400'
                }`}
              />
            </button>
          </div>
        </div>

        {/* ── Dropdown 1: Form Profil Akun (Tanpa Input Role) ── */}
        {activeDropdown === 'profile' && (
          <form
            onSubmit={handleSaveProfile}
            className="border-t border-slate-100 bg-slate-50/40 px-4 py-4 space-y-3.5"
          >
            {/* Baris Foto Profil */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={fullName}
                      className="h-12 w-12 rounded-xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white text-base font-bold">
                      {initial}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Foto Profil</p>
                  <p className="text-[11px] text-slate-500">
                    Pilih foto perangkat atau warna avatar
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5 text-blue-600" />
                  Pilih Foto
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    Hapus
                  </button>
                )}
                <div className="flex items-center gap-1">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      title={`Avatar ${preset.label}`}
                      onClick={() => handlePresetAvatar(preset.bg)}
                      className="h-5 w-5 rounded-full border border-white shadow-2xs transition-transform hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: preset.bg }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Grid Input Profil (Tanpa Field Role) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Masukkan nama lengkap..."
                    className={`${fieldClass} pl-8`}
                    maxLength={80}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <AtSign className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                    placeholder="username"
                    className={`${fieldClass} pl-8`}
                    maxLength={40}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email Akun
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="email"
                    value={user?.email || '-'}
                    disabled
                    className={`${fieldClass} pl-8`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Divisi / Jabatan <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Contoh: Gudang / Operasional"
                    className={`${fieldClass} pl-8`}
                    maxLength={60}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  No. Telepon / WhatsApp <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 0812xxxx"
                    className={`${fieldClass} pl-8`}
                    maxLength={25}
                  />
                </div>
              </div>
            </div>

            {profileMsg.text && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
                  profileMsg.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : profileMsg.type === 'info'
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {profileMsg.type === 'error' ? (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveDropdown(null)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  'Simpan Profil'
                )}
              </button>
            </div>
          </form>
        )}

        {/* ── Dropdown 2: Form Ubah Password ── */}
        {activeDropdown === 'password' && (
          <form
            onSubmit={handleSavePassword}
            className="border-t border-slate-100 bg-slate-50/40 px-4 py-4 space-y-3.5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Password Baru <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter..."
                    className={`${fieldClass} pr-9`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPass ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Konfirmasi Password Baru <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru..."
                  className={fieldClass}
                />
              </div>
            </div>

            {passMsg.text && (
              <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs max-w-xl ${
                  passMsg.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {passMsg.type === 'error' ? (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>{passMsg.text}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveDropdown(null)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={savingPass || !newPassword}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                {savingPass ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memperbarui...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-3.5 w-3.5" /> Simpan Password
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* ── Tabel Daftar Pengguna Sistem ── */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Daftar Pengguna Sistem</h2>
            <p className="text-xs text-slate-500">
              {filteredUsers.length} pengguna terdaftar · Klik Kelola Akses untuk mengatur pengguna
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama, username, divisi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full rounded-xl border border-slate-300 bg-white pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-blue-600"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-8 rounded-xl border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-blue-600"
            >
              <option value="all">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>
          </div>
        </div>

        {loadingUsers ? (
          <div className="p-10 text-center">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2.5" />
            <p className="text-xs text-slate-400">Memuat data pengguna...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="w-9 h-9 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">Tidak ada pengguna ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Pengguna
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Username &amp; Divisi
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Akses Role
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Terdaftar
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((u) => {
                  const isMe = String(u.id) === String(user?.id)
                  const uAvatar = isMe ? avatarUrl || u.avatar_url : u.avatar_url
                  const uName = isMe ? fullName || u.full_name : u.full_name
                  const uUsername = isMe ? username || u.username : u.username
                  const uDept = isMe ? department || u.department : u.department
                  const uRole = isMe ? currentRole : u.role

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {uAvatar ? (
                            <img
                              src={uAvatar}
                              alt={uName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xs uppercase shrink-0">
                              {uName?.[0] || 'U'}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-800 text-xs">
                                {uName || 'Tanpa Nama'}
                              </p>
                              {isMe && (
                                <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                                  Anda
                                </span>
                              )}
                            </div>
                            <p className="text-slate-400 text-[11px] font-mono">
                              {u.id ? `${u.id.slice(0, 8)}...` : '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-slate-700">@{uUsername || 'user'}</p>
                        <p className="text-[11px] text-slate-400">{uDept || 'Belum diatur'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={uRole === 'admin' ? 'default' : 'secondary'}
                          className="rounded-lg gap-1 text-[11px]"
                        >
                          {uRole === 'admin' ? (
                            <Shield className="w-3 h-3" />
                          ) : (
                            <User className="w-3 h-3" />
                          )}
                          {uRole === 'admin' ? 'Admin' : 'Member'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditUserModal(u)}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            <Pencil className="h-3 w-3 text-blue-600" />
                            Kelola Akses
                          </button>
                          {!isMe && (
                            <button
                              type="button"
                              onClick={() => {
                                setDeletingUser(u)
                                setDeleteUserError('')
                              }}
                              title={`Hapus ${uName}`}
                              className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Modal Ringkas & Rounded untuk Edit Akses Pengguna ── */}
      {editingUser && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-3"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !savingUserEdit) setEditingUser(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Shield className="h-3.5 w-3.5" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Kelola Akses &amp; Data Pengguna
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                disabled={savingUserEdit}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOtherUser} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                    className={fieldClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          username: e.target.value.replace(/\s+/g, '').toLowerCase(),
                        }))
                      }
                      className={fieldClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Divisi / Jabatan
                    </label>
                    <input
                      type="text"
                      value={editForm.department}
                      onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                      placeholder="Operasional / Gudang"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Hak Akses Akun (Role) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                    className={fieldClass}
                  >
                    <option value="admin">Admin — Akses Penuh</option>
                    <option value="member">Member — Akses Standar</option>
                  </select>
                </div>

                {userEditError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {userEditError}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
                {String(editingUser.id) !== String(user?.id) ? (
                  <button
                    type="button"
                    disabled={savingUserEdit}
                    onClick={() => {
                      const target = editingUser
                      setEditingUser(null)
                      setDeletingUser(target)
                      setDeleteUserError('')
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus User
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-400">Akun Anda saat ini</span>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    disabled={savingUserEdit}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingUserEdit}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
                  >
                    {savingUserEdit ? (
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
      )}

      {/* ── Modal Konfirmasi Hapus Pengguna (Ringkas & Rounded) ── */}
      {deletingUser && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-3"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isDeletingUser) setDeletingUser(null)
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Hapus Pengguna?</h2>
                  <p className="text-[11px] text-slate-500">Tindakan ini akan mencabut akses akun</p>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-slate-600">
                Apakah Anda yakin ingin menghapus pengguna{' '}
                <strong className="text-slate-900">{deletingUser.full_name || 'ini'}</strong> (
                <span className="text-slate-500">@{deletingUser.username || 'user'}</span>) dari
                daftar pengguna sistem?
              </p>

              {deleteUserError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {deleteUserError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setDeletingUser(null)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {isDeletingUser ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" /> Hapus Pengguna
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
