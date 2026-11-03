
import { useSyncExternalStore } from 'react'

// Notifikasi disimpan di browser
const STORAGE_KEY = 'tokentrack.notifications.v1'
const LOGIN_KEY = 'tokentrack.login-notified.v1'
const LIMIT = 50
const EMPTY = []

function readStorage() {
  if (typeof window === 'undefined') return EMPTY

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) || '[]'
    )

    if (!Array.isArray(parsed)) return EMPTY

    return parsed.filter(item =>
      item &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.createdAt === 'string'
    ).slice(0, LIMIT)
  } catch {
    return EMPTY
  }
}

let notifications = readStorage()
const listeners = new Set()

function emit() {
  listeners.forEach(listener => listener())
}

function persist() {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(notifications)
    )
  } catch {
    // Aplikasi tetap berjalan jika localStorage tidak tersedia
  }

  emit()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return notifications
}

function getServerSnapshot() {
  return EMPTY
}

// Sinkronisasi notifikasi antar tab browser
if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY) {
      notifications = readStorage()
      emit()
    }
  })
}

// Tambah notifikasi baru
export function addNotification({
  type = 'info',
  title,
  message = '',
}) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    type,
    title,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  }

  notifications = [item, ...notifications].slice(0, LIMIT)
  persist()

  return item
}

// Notifikasi login anonim
// Tidak berulang saat halaman di-refresh
export function notifyLoginOnce(userId) {
  if (!userId || typeof window === 'undefined') return

  try {
    if (
      window.sessionStorage.getItem(LOGIN_KEY) === userId
    ) {
      return
    }

    window.sessionStorage.setItem(LOGIN_KEY, userId)
  } catch {
    // Tetap lanjut jika sessionStorage tidak tersedia
  }

  addNotification({
    type: 'login',
    title: 'Login berhasil',
    message: 'Masuk sebagai Pengunjung',
  })
}

// Tandai seluruh notifikasi telah dibaca
export function markAllNotificationsRead() {
  if (!notifications.some(item => !item.read)) return

  notifications = notifications.map(item => ({
    ...item,
    read: true,
  }))

  persist()
}

// Hapus seluruh notifikasi
export function clearNotifications() {
  notifications = []
  persist()
}

// Hook untuk digunakan di Header
export function useNotifications() {
  const items = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  return {
    notifications: items,
    unreadCount: items.filter(item => !item.read).length,
    markAllRead: markAllNotificationsRead,
    clearAll: clearNotifications,
  }
}
