import { GlassWater, Coffee, Package } from 'lucide-react'

/**
 * Format label jenis token (contoh: 'glass' -> 'Gelas', 'tumbler' -> 'Tumbler', 'mug_kopi' -> 'Mug Kopi')
 */
export function formatTokenLabel(type) {
  if (!type) return 'Token'
  const lower = String(type).trim().toLowerCase()
  if (lower === 'glass' || lower === 'gelas') return 'Gelas'
  if (lower === 'tumbler') return 'Tumbler'
  return lower
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Dapatkan ikon Lucide yang sesuai berdasarkan nama/jenis token
 */
export function getTokenIcon(type) {
  const lower = String(type || '').trim().toLowerCase()
  if (lower === 'glass' || lower.includes('gelas')) return GlassWater
  if (lower === 'tumbler' || lower.includes('tumbler') || lower.includes('botol')) return Coffee
  if (lower.includes('cangkir') || lower.includes('mug') || lower.includes('cup')) return Coffee
  return Package
}

/**
 * Dapatkan variant badge Tailwind yang sesuai
 */
export function getTokenBadgeVariant(type) {
  const lower = String(type || '').trim().toLowerCase()
  if (lower === 'glass' || lower === 'gelas') return 'glass'
  if (lower === 'tumbler') return 'tumbler'
  return 'default'
}
