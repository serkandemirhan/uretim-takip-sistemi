'use client'

import { AlertTriangle, Clock, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils/formatters'

interface Job {
  status: string
  due_date?: string
  delivery_date?: string
  deadline?: string
  progress?: number
  priority?: string
}

interface StatusWarningsProps {
  job: Job
}

function isJobOverdue(job: Job): boolean {
  const rawDueDate = job?.due_date ?? job?.delivery_date ?? job?.deadline
  if (!rawDueDate) return false
  const dueDate = new Date(rawDueDate)
  return dueDate.getTime() < Date.now()
}

function isJobAtRisk(job: Job): boolean {
  const status = (job?.status ?? '').toString().toLowerCase()
  const isActive = status === 'active' || status === 'in_progress'
  if (!isActive) return false

  const progress = typeof job?.progress === 'number' ? job.progress : null
  const isOverdue = isJobOverdue(job)

  return (progress !== null && progress < 50) || isOverdue
}

function getDaysUntilDue(job: Job): number | null {
  const rawDueDate = job?.due_date ?? job?.delivery_date ?? job?.deadline
  if (!rawDueDate) return null

  const dueDate = new Date(rawDueDate)
  const today = new Date()
  const diffTime = dueDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

export function StatusWarnings({ job }: StatusWarningsProps) {
  const status = (job?.status ?? '').toString().toLowerCase()
  const isOverdue = isJobOverdue(job)
  const isAtRisk = isJobAtRisk(job)
  const daysUntilDue = getDaysUntilDue(job)
  const progress = typeof job?.progress === 'number' ? job.progress : 0
  const priority = job?.priority?.toLowerCase()

  // Collect all warnings
  const warnings: { type: 'error' | 'warning' | 'info' | 'success'; message: string; icon: React.ReactNode }[] = []

  // Status-based warnings
  if (status === 'canceled' || status === 'cancelled') {
    warnings.push({
      type: 'error',
      message: 'İş iptal edildi',
      icon: <XCircle className="w-4 h-4" />
    })
  } else if (status === 'on_hold') {
    warnings.push({
      type: 'warning',
      message: 'İş beklemede',
      icon: <AlertCircle className="w-4 h-4" />
    })
  } else if (status === 'completed') {
    warnings.push({
      type: 'success',
      message: 'İş tamamlandı',
      icon: <CheckCircle2 className="w-4 h-4" />
    })
  }

  // Due date warnings
  if (status !== 'completed' && status !== 'canceled' && status !== 'cancelled') {
    if (isOverdue) {
      warnings.push({
        type: 'error',
        message: `Teslim tarihi geçti (${Math.abs(daysUntilDue || 0)} gün gecikme)`,
        icon: <AlertTriangle className="w-4 h-4" />
      })
    } else if (daysUntilDue !== null) {
      if (daysUntilDue <= 3 && daysUntilDue > 0) {
        warnings.push({
          type: 'warning',
          message: `${daysUntilDue} gün kaldı`,
          icon: <Clock className="w-4 h-4" />
        })
      } else if (daysUntilDue === 0) {
        warnings.push({
          type: 'error',
          message: 'Bugün teslim edilmeli',
          icon: <AlertTriangle className="w-4 h-4" />
        })
      }
    }
  }

  // Progress warnings
  if (status === 'active' || status === 'in_progress') {
    if (progress < 25) {
      warnings.push({
        type: 'error',
        message: `İlerleme çok düşük (%${progress})`,
        icon: <AlertTriangle className="w-4 h-4" />
      })
    } else if (progress < 50 && daysUntilDue !== null && daysUntilDue <= 7) {
      warnings.push({
        type: 'warning',
        message: `İlerleme yavaş (%${progress})`,
        icon: <AlertCircle className="w-4 h-4" />
      })
    }
  }

  // Priority warning
  if (priority === 'urgent' || priority === 'acil') {
    warnings.push({
      type: 'error',
      message: 'Acil öncelikli',
      icon: <AlertTriangle className="w-4 h-4" />
    })
  } else if (priority === 'high' || priority === 'yuksek') {
    warnings.push({
      type: 'warning',
      message: 'Yüksek öncelikli',
      icon: <AlertCircle className="w-4 h-4" />
    })
  }

  if (warnings.length === 0) {
    return null
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {warnings.map((warning, index) => {
        let badgeClass = ''
        switch (warning.type) {
          case 'error':
            badgeClass = 'bg-red-100 text-red-700 border-red-200'
            break
          case 'warning':
            badgeClass = 'bg-yellow-100 text-yellow-700 border-yellow-200'
            break
          case 'success':
            badgeClass = 'bg-green-100 text-green-700 border-green-200'
            break
          case 'info':
            badgeClass = 'bg-blue-100 text-blue-700 border-blue-200'
            break
        }

        return (
          <Badge
            key={index}
            variant="outline"
            className={`${badgeClass} flex items-center gap-1.5 px-2 py-1`}
          >
            {warning.icon}
            <span className="text-xs font-medium">{warning.message}</span>
          </Badge>
        )
      })}
    </div>
  )
}
