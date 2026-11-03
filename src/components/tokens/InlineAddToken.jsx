import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'

export default function InlineAddToken({ onAdd }) {
  const [type, setType] = useState('glass')
  const [quantity, setQuantity] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      alert('Jumlah harus angka positif')
      return
    }
    await onAdd({ token_type: type, total_stock: qty, description: description.trim() })
    setQuantity('')
    setDescription('')
  }

  return (
    <form className="flex flex-col sm:flex-row gap-2 mb-4" onSubmit={handleSubmit}>
      <Select value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-32">
        <option value="glass">Gelas</option>
        <option value="tumbler">Tumbler</option>
      </Select>
      <Input
        type="number"
        min="1"
        placeholder="Jumlah"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
        className="h-10 w-24"
      />
      <Input
        placeholder="Keterangan (opsional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="flex-1 h-10"
      />
      <Button type="submit" className="h-10 gap-1">
        <Plus className="h-4 w-4" />
        Tambah
      </Button>
    </form>
  )
}
