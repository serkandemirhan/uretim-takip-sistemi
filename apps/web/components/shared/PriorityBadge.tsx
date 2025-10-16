/**
 * Shared PriorityBadge Component
 * Used across the application for consistent priority display
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

export type Priority = 'low' | 'normal' | 'high' | 'urgent'

interface PriorityConfig {
  label: string
  className: string
  icon?: string
}

const priorityConfig: Record<Priority, PriorityConfig> = {
  low: {
    label: 'Düşük',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: '⬇️'
  },
  normal: {
    label: 'Normal',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: '➡️'
  },
  high: {
    label: 'Yüksek',
    className: 'bg-orange-100 text-orange-700 border-orange-300',
    icon: '⬆️'
  },
  urgent: {
    label: 'Acil',
    className: 'bg-red-100 text-red-700 border-red-300',
    icon: '🔥'
  }
}

interface PriorityBadgeProps {
  priority: Priority
  showIcon?: boolean
  className?: string
}

/**
 * PriorityBadge component for displaying priority levels
 *
 * @example
 * <PriorityBadge priority="high" />
 * <PriorityBadge priority="urgent" showIcon />
 */
export function PriorityBadge({
  priority,
  showIcon = false,
  className
}: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.normal

  return (
    <Badge
      variant="outline"
      className={cn(
        config.className,
        'font-medium',
        className
      )}
    >
      {showIcon && config.icon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </Badge>
  )
}

/**
 * Helper functions to get priority properties
 */
export function getPriorityLabel(priority: Priority): string {
  return priorityConfig[priority]?.label || priority
}

export function getPriorityClassName(priority: Priority): string {
  return priorityConfig[priority]?.className || ''
}

export function getPriorityIcon(priority: Priority): string | undefined {
  return priorityConfig[priority]?.icon
}
