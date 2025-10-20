import { cn } from '@/lib/utils/cn'

interface StatusBadgeProps {
  status: string
  type?: 'pr' | 'gr' | 'material'
}

const statusConfig: Record<string, Record<string, { label: string; className: string }>> = {
  pr: {
    draft: { label: 'Taslak', className: 'bg-gray-100 text-gray-800' },
    pending_approval: { label: 'Onay Bekliyor', className: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Onaylandı', className: 'bg-green-100 text-green-800' },
    rejected: { label: 'Reddedildi', className: 'bg-red-100 text-red-800' },
    completed: { label: 'Tamamlandı', className: 'bg-blue-100 text-blue-800' }
  },
  gr: {
    pending_inspection: { label: 'Kontrol Bekliyor', className: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Onaylandı', className: 'bg-green-100 text-green-800' },
    partially_approved: { label: 'Kısmen Onaylandı', className: 'bg-orange-100 text-orange-800' },
    rejected: { label: 'Reddedildi', className: 'bg-red-100 text-red-800' }
  },
  material: {
    pending: { label: 'Bekliyor', className: 'bg-gray-100 text-gray-800' },
    allocated: { label: 'Rezerve Edildi', className: 'bg-blue-100 text-blue-800' },
    consumed: { label: 'Tüketildi', className: 'bg-green-100 text-green-800' },
    returned: { label: 'İade Edildi', className: 'bg-purple-100 text-purple-800' }
  }
}

export default function StatusBadge({ status, type = 'pr' }: StatusBadgeProps) {
  const config = statusConfig[type]?.[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-800'
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  )
}
