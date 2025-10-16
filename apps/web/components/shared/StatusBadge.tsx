/**
 * Shared StatusBadge Component
 * Used across the application for consistent status display
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

// Job Status Types
export type JobStatus = 'draft' | 'active' | 'in_progress' | 'completed' | 'canceled' | 'on_hold'

// Task/JobStep Status Types
export type TaskStatus = 'pending' | 'ready' | 'in_progress' | 'completed' | 'canceled' | 'blocked'

// Machine Status Types
export type MachineStatus = 'active' | 'maintenance' | 'inactive'

// All possible status types
export type Status = JobStatus | TaskStatus | MachineStatus

interface StatusConfig {
  label: string
  className: string
  icon?: string
}

// Job status configuration
const jobStatusConfig: Record<JobStatus, StatusConfig> = {
  draft: {
    label: 'Taslak',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: '📝'
  },
  active: {
    label: 'Aktif',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: '▶️'
  },
  in_progress: {
    label: 'Devam Ediyor',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: '⏳'
  },
  completed: {
    label: 'Tamamlandı',
    className: 'bg-green-100 text-green-700 border-green-300',
    icon: '✅'
  },
  canceled: {
    label: 'İptal',
    className: 'bg-red-100 text-red-700 border-red-300',
    icon: '❌'
  },
  on_hold: {
    label: 'Beklemede',
    className: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: '⏸️'
  }
}

// Task status configuration
const taskStatusConfig: Record<TaskStatus, StatusConfig> = {
  pending: {
    label: 'Bekliyor',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: '⏸️'
  },
  ready: {
    label: 'Hazır',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: '🎯'
  },
  in_progress: {
    label: 'Devam Ediyor',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: '⏳'
  },
  completed: {
    label: 'Tamamlandı',
    className: 'bg-green-100 text-green-700 border-green-300',
    icon: '✅'
  },
  canceled: {
    label: 'İptal',
    className: 'bg-red-100 text-red-700 border-red-300',
    icon: '❌'
  },
  blocked: {
    label: 'Engelli',
    className: 'bg-orange-100 text-orange-700 border-orange-300',
    icon: '🚫'
  }
}

// Machine status configuration
const machineStatusConfig: Record<MachineStatus, StatusConfig> = {
  active: {
    label: 'Uygun',
    className: 'bg-green-100 text-green-700 border-green-300',
    icon: '✅'
  },
  maintenance: {
    label: 'Bakımda',
    className: 'bg-orange-100 text-orange-700 border-orange-300',
    icon: '🔧'
  },
  inactive: {
    label: 'Pasif',
    className: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: '⏸️'
  }
}

interface StatusBadgeProps {
  status: Status
  type?: 'job' | 'task' | 'machine'
  showIcon?: boolean
  className?: string
}

/**
 * StatusBadge component for displaying status across the application
 *
 * @example
 * <StatusBadge status="active" type="job" />
 * <StatusBadge status="in_progress" type="task" showIcon />
 * <StatusBadge status="maintenance" type="machine" />
 */
export function StatusBadge({
  status,
  type = 'job',
  showIcon = false,
  className
}: StatusBadgeProps) {
  // Get configuration based on type
  const getConfig = (): StatusConfig => {
    if (type === 'task') {
      return taskStatusConfig[status as TaskStatus] || taskStatusConfig.pending
    } else if (type === 'machine') {
      return machineStatusConfig[status as MachineStatus] || machineStatusConfig.inactive
    } else {
      return jobStatusConfig[status as JobStatus] || jobStatusConfig.draft
    }
  }

  const config = getConfig()

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
 * Helper functions to get status properties
 */
export function getStatusLabel(status: Status, type: 'job' | 'task' | 'machine' = 'job'): string {
  if (type === 'task') {
    return taskStatusConfig[status as TaskStatus]?.label || status
  } else if (type === 'machine') {
    return machineStatusConfig[status as MachineStatus]?.label || status
  } else {
    return jobStatusConfig[status as JobStatus]?.label || status
  }
}

export function getStatusClassName(status: Status, type: 'job' | 'task' | 'machine' = 'job'): string {
  if (type === 'task') {
    return taskStatusConfig[status as TaskStatus]?.className || ''
  } else if (type === 'machine') {
    return machineStatusConfig[status as MachineStatus]?.className || ''
  } else {
    return jobStatusConfig[status as JobStatus]?.className || ''
  }
}
