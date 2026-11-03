import { useState, useEffect } from 'react'
import { Users, RefreshCw, Shield, User, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabaseClient'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
      } else {
        setUsers(data || [])
      }
    } catch (err) {
      console.error('Exception fetching users:', err)
    } finally {
      setLoading(false)
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
    return (
      (u.full_name || '').toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola Pengguna</h1>
          <p className="text-slate-500 text-sm mt-0.5">Daftar pengguna sistem terdaftar</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Cari nama pengguna..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Memuat data pengguna...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Belum ada pengguna terdaftar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Pengguna
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Terdaftar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-sm uppercase">
                            {u.full_name?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">
                              {u.full_name || 'Tanpa Nama'}
                            </p>
                            <p className="text-slate-400 text-xs font-mono">
                              {u.id ? `${u.id.slice(0, 8)}...` : '-'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="gap-1">
                          {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                          {u.role === 'admin' ? 'Admin' : 'Member'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{formatDate(u.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filteredUsers.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/50">
              <p className="text-xs text-slate-400">{filteredUsers.length} pengguna terdaftar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
