import { cn } from '@/lib/utils/cn'
import { ArrowUp, ArrowDown, Minus, AlertTriangle } from 'lucide-react'

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent'
  showIcon?: boolean
}

const priorityConfig = {
  low: {
    label: 'Düşük',
    className: 'bg-gray-100 text-gray-700',
    icon: ArrowDown
  },
  medium: {
    label: 'Orta',
    className: 'bg-blue-100 text-blue-700',
    icon: Minus
  },
  high: {
    label: 'Yüksek',
    className: 'bg-orange-100 text-orange-700',
    icon: ArrowUp
  },
  urgent: {
    label: 'Acil',
    className: 'bg-red-100 text-red-700',
    icon: AlertTriangle
  }
}

export default function PriorityBadge({ priority, showIcon = true }: PriorityBadgeProps) {
  const config = priorityConfig[priority]
  const Icon = config.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  )
}
