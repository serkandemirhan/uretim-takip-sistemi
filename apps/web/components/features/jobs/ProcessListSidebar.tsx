'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
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
    group_order_index?: number
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

function getStatusDotClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-500'
    case 'in_progress':
    case 'active':
      return 'bg-blue-500'
    case 'ready':
    case 'waiting':
      return 'bg-green-500'
    case 'blocked':
    case 'canceled':
      return 'bg-red-500'
    case 'on_hold':
      return 'bg-amber-500'
    case 'pending':
    case 'draft':
    case 'not_started':
    default:
      return 'bg-gray-300'
  }
}

export function ProcessListSidebar({
  steps,
  selectedStepId,
  onSelectStep,
  position = 'left',
}: ProcessListSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

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

  // Tüm grupları başlangıçta açık yap
  useEffect(() => {
    const allGroupIds = new Set(groups.map(g => g.id))
    setExpandedGroups(allGroupIds)
  }, [groups])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

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
      {/* Process List - Accordion Groups */}
      <ScrollArea className="flex-1">
        <div className="p-1 space-y-2">
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.id)
            return (
            <div key={group.id} className="space-y-1">
              {/* Accordion Header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center gap-2 px-2 py-2 hover:bg-gray-100 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-600" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-600" />
                )}
                <div className="flex-1 text-left text-xs font-semibold uppercase tracking-wide text-gray-700">
                  {group.name}
                </div>
                <div className="text-[10px] text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                  {group.steps.length}
                </div>
              </button>

              {/* Accordion Content */}
              {isExpanded && group.steps.map((step, index) => {
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

                    {/* Status Color Dot */}
                    <span
                      className={cn(
                        'flex-shrink-0 h-3 w-3 rounded-full',
                        getStatusDotClass(step.status)
                      )}
                    />

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
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
