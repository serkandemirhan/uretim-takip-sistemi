'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { User, CheckCircle2, Clock, AlertCircle, Pause, XCircle, Circle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface JobStep {
  id: string
  order_index?: number
  status: string
  process?: {
    name: string
    code?: string
    description?: string
    group_name?: string
    group_id?: string
  }
  assigned_to?: {
    id: string
    full_name?: string
    name?: string
    avatar_url?: string
    avatarUrl?: string
    avatarDownloadUrl?: string
  }
}

interface ProcessListSidebarProps {
  steps: JobStep[]
  selectedStepId: string | null
  onSelectStep: (stepId: string) => void
  position?: 'left' | 'right'
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-600 fill-green-100" />
    case 'in_progress':
      return <Clock className="w-4 h-4 text-blue-600 fill-blue-100" />
    case 'ready':
      return <Circle className="w-4 h-4 text-cyan-600 fill-cyan-100" />
    case 'blocked':
      return <Pause className="w-4 h-4 text-orange-600 fill-orange-100" />
    case 'canceled':
      return <XCircle className="w-4 h-4 text-red-600 fill-red-100" />
    case 'pending':
    default:
      return <AlertCircle className="w-4 h-4 text-gray-500 fill-gray-100" />
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'ready':
      return 'bg-blue-50 text-blue-600 border-blue-100'
    case 'blocked':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'canceled':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'pending':
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Bekliyor',
    ready: 'Hazır',
    in_progress: 'Devam',
    completed: 'Tamamlandı',
    blocked: 'Durduruldu',
    canceled: 'İptal',
  }
  return labels[status] || status
}

export function ProcessListSidebar({
  steps,
  selectedStepId,
  onSelectStep,
  position = 'left',
}: ProcessListSidebarProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

  // Group steps by process group
  const groups = useMemo(() => {
    const groupMap: Record<string, { name: string; steps: JobStep[]; order: number }> = {}

    steps.forEach((step) => {
      const rawGroupId = step.process?.group_id
      const fallbackName = step.process?.group_name || 'Grupsuz'
      const normalizedName = fallbackName.trim().toLowerCase().replace(/\s+/g, '-') || 'grupsuz'
      const groupId = rawGroupId != null && rawGroupId !== ''
        ? String(rawGroupId)
        : `name:${normalizedName}`
      const groupName = fallbackName
      const groupOrder = step.process?.group_order_index ?? step.order_index ?? 999

      if (!groupMap[groupId]) {
        groupMap[groupId] = { name: groupName, steps: [], order: groupOrder }
      }
      groupMap[groupId].steps.push(step)
      groupMap[groupId].order = Math.min(groupMap[groupId].order, groupOrder)
    })

    return Object.entries(groupMap)
      .map(([id, data]) => ({
        id,
        name: data.name,
        steps: data.steps.sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999)),
        order: data.order,
      }))
      .sort((a, b) => a.order - b.order)
  }, [steps])

  const visibleGroups = useMemo(() => {
    if (selectedGroup === 'all') {
      return groups
    }
    const group = groups.find((g) => g.id === selectedGroup)
    return group ? [group] : []
  }, [groups, selectedGroup])

  const borderClass = position === 'right' ? 'border-l' : 'border-r'

  if (steps.length === 0) {
    return (
      <div className={cn('w-80 bg-gray-50 p-4 text-center text-sm text-gray-500', borderClass)}>
        Henüz süreç eklenmemiş
      </div>
    )
  }

  return (
    <div className={cn('w-80 bg-gray-50 flex flex-col', borderClass)}>
      {/* Group Tabs */}
      <div className="bg-white border-b">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setSelectedGroup('all')}
            className={cn(
              'px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
              selectedGroup === 'all'
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            Tümü ({steps.length})
          </button>
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => setSelectedGroup(group.id)}
              className={cn(
                'px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
                selectedGroup === group.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              {group.name} ({group.steps.length})
            </button>
          ))}
        </div>
      </div>

      {/* Process List - Grouped by Process Group */}
      <ScrollArea className="flex-1">
        <div className="p-1 space-y-3">
          {visibleGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                {group.name}
              </div>
              {group.steps.map((step, index) => {
                const isSelected = step.id === selectedStepId
                const processName = step.process?.name || 'Süreç'
                const assignedName = step.assigned_to?.full_name || step.assigned_to?.name || '-'
                const avatarUrl =
                  step.assigned_to?.avatarDownloadUrl ||
                  step.assigned_to?.avatar_url ||
                  step.assigned_to?.avatarUrl
                const initials =
                  assignedName && assignedName !== '-'
                    ? assignedName
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part: string) => part[0]?.toUpperCase() ?? '')
                        .join('') || '?'
                    : '?'

                const stepNumber =
                  typeof step.order_index === 'number'
                    ? step.order_index + 1
                    : index + 1

                return (
                  <button
                    key={step.id}
                    onClick={() => onSelectStep(step.id)}
                    className={cn(
                      'w-full text-left transition-all px-2 py-1.5 hover:bg-gray-100 flex items-center gap-2 border-l-2',
                      isSelected
                        ? 'bg-blue-50 border-l-blue-500'
                        : 'bg-white border-l-transparent hover:border-l-gray-300'
                    )}
                  >
                    {/* Process Number */}
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-700 flex-shrink-0">
                      {stepNumber}
                    </span>

                    {/* Status Icon */}
                    <span className="flex-shrink-0">{getStatusIcon(step.status)}</span>

                    {/* Process Name */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-xs text-gray-900 truncate">
                        {processName}
                      </div>
                    </div>

                    {/* Avatar */}
                    <div className="relative flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={assignedName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
