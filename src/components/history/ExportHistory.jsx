import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { formatTokenLabel } from '@/lib/tokenUtils'

/**
 * Export riwayat token ke file CSV (bisa dibuka dengan Excel).
 * Menggunakan Blob API, tidak memerlukan paket eksternal.
 */
export default function ExportHistory({ history }) {
  const { user, profile } = useAuth()
  const currentUserName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Pengguna'

  const handleExport = () => {
    if (!history || history.length === 0) {
      alert('Tidak ada riwayat untuk diekspor')
      return
    }
    const headers = ['Waktu', 'Jenis Token', 'Aksi', 'Jumlah', 'Stok Sebelum', 'Stok Sesudah', 'Keterangan', 'Oleh']
    const rows = history.map((h) => [
      new Date(h.performed_at).toLocaleString('id-ID'),
      formatTokenLabel(h.token_type),
      h.action_type === 'add' ? 'Penambahan' : h.action_type === 'reduce' ? 'Pengurangan' : 'Update',
      h.quantity_changed,
      h.stock_before,
      h.stock_after,
      h.description?.replace(/\n/g, ' ') ?? '-',
      h.performer?.full_name || currentUserName,
    ])
    const csvContent = [headers, ...rows]
      .map((e) => e.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const now = new Date()
    const fileName = `riwayat-token-${now.toISOString().split('T')[0]}.csv`
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 border-slate-300">
      <Download className="h-4 w-4" /> Export CSV
    </Button>
  )
}
