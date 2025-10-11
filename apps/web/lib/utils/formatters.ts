import { format } from 'date-fns'
import { tr } from 'date-fns/locale'

export function formatTime(date: string | Date): string {
  return format(new Date(date), 'HH:mm', { locale: tr })
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Taslak',
    active: 'Aktif',
    in_progress: 'Devam Ediyor',
    on_hold: 'Beklemede',
    completed: 'Tamamlandı',
    canceled: 'İptal Edildi',
    pending: 'Bekliyor',
    ready: 'Hazır',
    blocked: 'Engellendi',
  }
  return labels[status] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    on_hold: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
    canceled: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-700',
    ready: 'bg-blue-100 text-blue-700',
    blocked: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: 'Düşük',
    normal: 'Normal',
    high: 'Yüksek',
    urgent: 'Acil',
  }
  return labels[priority] || priority
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'text-gray-600',
    normal: 'text-blue-600',
    high: 'text-orange-600',
    urgent: 'text-red-600',
  }
  return colors[priority] || 'text-gray-600'
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}