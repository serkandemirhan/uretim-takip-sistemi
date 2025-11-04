'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Settings2, Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react'
import { processesAPI } from '@/lib/api/client'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface Job {
  id: string
  job_number: string
  title: string
  customer_name: string
  dealer_name?: string | null
  progress: number
  delivery_date?: string | null
  steps?: Array<{
    id: string
    process_id: string
    status: string
    order_index: number
    process_name?: string
    process_code?: string
    process_group_id?: string | null
    process_group_name?: string | null
    notes?: string | null
    completed_at?: string | null
    completed_by?: string | null
    completed_by_name?: string | null
    file_count?: number
    assigned_to?: {
      id: string | null
      name: string
    } | null
    machine?: {
      id: string | null
      name: string
    } | null
    production_notes?: string | null
    started_at?: string | null
    production_quantity?: number | null
    production_unit?: string | null
    block_reason?: string | null
    blocked_at?: string | null
  }>
}

interface ProcessJobsTableProps {
  jobs: Job[]
  showColumnSettings: boolean
  setShowColumnSettings: (show: boolean) => void
}

type ProcessGroup = {
  id: string
  name: string
  description?: string | null
  processes: Process[]
}

type Process = {
  id: string
  name: string
  code: string
  order_index: number
}

function getStepStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    completed: 'bg-green-500',
    in_progress: 'bg-blue-500',
    waiting: 'bg-yellow-500',
    blocked: 'bg-red-500',
    on_hold: 'bg-gray-400',
    not_started: 'bg-gray-200',
  }
  return colorMap[status] || colorMap.not_started
}

export function ProcessJobsTable({ jobs, showColumnSettings, setShowColumnSettings }: ProcessJobsTableProps) {
  const { user } = useAuth()
  const [processGroups, setProcessGroups] = useState<ProcessGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  // User-specific storage keys - memoized to prevent unnecessary re-creation
  const STORAGE_KEY_WIDTHS = useMemo(() => `processJobsTable_columnWidths_v2_${user?.id || 'guest'}`, [user?.id])
  const STORAGE_KEY_ORDER = useMemo(() => `processJobsTable_columnOrder_${user?.id || 'guest'}`, [user?.id])
  const STORAGE_KEY_VISIBILITY = useMemo(() => `processJobsTable_columnVisibility_${user?.id || 'guest'}`, [user?.id])
  // Default widths and visibility for base columns
  const defaultWidths: Record<string, number> = {
    no: 110,
    title: 240,
    customer: 150,
    dealer: 140,
    delivery: 130,
    progress: 120,
  }
  const defaultVisibility: Record<string, boolean> = {
    no: true,
    title: true,
    customer: true,
    dealer: true,
    delivery: true,
    progress: true,
  }

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(defaultWidths)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(defaultVisibility)
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  useEffect(() => {
    // Load base column settings from localStorage first
    if (typeof window !== 'undefined' && user?.id) {
      const savedWidths = localStorage.getItem(STORAGE_KEY_WIDTHS)
      if (savedWidths) {
        try {
          const parsedWidths = JSON.parse(savedWidths)
          setColumnWidths(prev => ({ ...prev, ...parsedWidths }))
        } catch (e) {
          console.error('Failed to parse saved column widths:', e)
        }
      }

      const savedVisibility = localStorage.getItem(STORAGE_KEY_VISIBILITY)
      if (savedVisibility) {
        try {
          const parsedVisibility = JSON.parse(savedVisibility)
          setColumnVisibility(prev => ({ ...prev, ...parsedVisibility }))
        } catch (e) {
          console.error('Failed to parse saved column visibility:', e)
        }
      }
    }

    loadProcessGroups()
  }, [user?.id, STORAGE_KEY_WIDTHS, STORAGE_KEY_VISIBILITY])

  // Save column widths when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(columnWidths).length > 0 && user?.id) {
      localStorage.setItem(STORAGE_KEY_WIDTHS, JSON.stringify(columnWidths))
    }
  }, [columnWidths, STORAGE_KEY_WIDTHS, user?.id])

  // Save column order when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && columnOrder.length > 0 && user?.id) {
      localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(columnOrder))
    }
  }, [columnOrder, STORAGE_KEY_ORDER, user?.id])

  // Save column visibility when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(columnVisibility).length > 0 && user?.id) {
      localStorage.setItem(STORAGE_KEY_VISIBILITY, JSON.stringify(columnVisibility))
    }
  }, [columnVisibility, STORAGE_KEY_VISIBILITY, user?.id])

  async function loadProcessGroups() {
    try {
      setLoading(true)
      const res = await processesAPI.getAll()
      const data = res?.data ?? res ?? {}
      const groups: ProcessGroup[] = (data.groups ?? []).map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        processes: (g.processes ?? [])
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            code: p.code,
            order_index: p.order_index ?? 0,
          })),
      })).sort((a: ProcessGroup, b: ProcessGroup) => a.name.localeCompare(b.name))

      setProcessGroups(groups)

      // Initialize widths and visibility for process group columns
      const processWidths: Record<string, number> = {}
      const processVisibility: Record<string, boolean> = {}
      groups.forEach(g => {
        processWidths[g.id] = 120
        processVisibility[g.id] = true
      })

      // Load saved settings from localStorage
      if (typeof window !== 'undefined') {
        // Load saved widths
        const savedWidths = localStorage.getItem(STORAGE_KEY_WIDTHS)
        if (savedWidths) {
          try {
            const parsedWidths = JSON.parse(savedWidths)
            // Merge with defaults
            Object.keys(parsedWidths).forEach(key => {
              processWidths[key] = parsedWidths[key]
            })
          } catch (e) {
            console.error('Failed to parse saved column widths:', e)
          }
        }

        // Load saved visibility
        const savedVisibility = localStorage.getItem(STORAGE_KEY_VISIBILITY)
        if (savedVisibility) {
          try {
            const parsedVisibility = JSON.parse(savedVisibility)
            // Merge with defaults
            Object.keys(parsedVisibility).forEach(key => {
              processVisibility[key] = parsedVisibility[key]
            })
          } catch (e) {
            console.error('Failed to parse saved column visibility:', e)
          }
        }
      }

      // Set widths and visibility
      setColumnWidths(prev => ({ ...prev, ...processWidths }))
      setColumnVisibility(prev => ({ ...prev, ...processVisibility }))

      // Initialize column order - check localStorage first
      const defaultOrder = ['no', 'title', 'customer', 'dealer', 'delivery', ...groups.map(g => g.id), 'progress']

      if (typeof window !== 'undefined') {
        const savedOrder = localStorage.getItem(STORAGE_KEY_ORDER)
        if (savedOrder) {
          try {
            const parsedOrder = JSON.parse(savedOrder)
            // Validate saved order includes all current columns
            const allColumns = new Set(defaultOrder)
            const validOrder = parsedOrder.filter((col: string) => allColumns.has(col))

            // Add any missing columns to the end
            defaultOrder.forEach(col => {
              if (!validOrder.includes(col)) {
                validOrder.push(col)
              }
            })

            setColumnOrder(validOrder)
          } catch (e) {
            console.error('Failed to parse saved column order:', e)
            setColumnOrder(defaultOrder)
          }
        } else {
          setColumnOrder(defaultOrder)
        }
      } else {
        setColumnOrder(defaultOrder)
      }
    } catch (error) {
      console.error('Failed to load process groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingColumn(column)

    const startX = e.clientX
    const startWidth = columnWidths[column]

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX
      const newWidth = Math.max(60, startWidth + diff)
      setColumnWidths(prev => ({ ...prev, [column]: newWidth }))
    }

    const handleMouseUp = () => {
      setResizingColumn(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleDragStart = (e: React.DragEvent, column: string) => {
    setDraggingColumn(column)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault()
    if (draggingColumn && draggingColumn !== column) {
      setDragOverColumn(column)
    }
  }

  const handleDrop = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault()
    if (draggingColumn && draggingColumn !== targetColumn) {
      const newOrder = [...columnOrder]
      const dragIndex = newOrder.indexOf(draggingColumn)
      const dropIndex = newOrder.indexOf(targetColumn)

      newOrder.splice(dragIndex, 1)
      newOrder.splice(dropIndex, 0, draggingColumn)

      setColumnOrder(newOrder)
    }
    setDraggingColumn(null)
    setDragOverColumn(null)
  }

  const handleDragEnd = () => {
    setDraggingColumn(null)
    setDragOverColumn(null)
  }

  // Auto-fit column width on double-click - optimized version
  const handleAutoFitColumn = (colId: string) => {
    // Use a simplified approach - check actual DOM elements instead of measuring text
    let maxWidth = 60 // Minimum width

    // Measure header
    const headerLabel = getColumnLabel(colId)
    maxWidth = Math.max(maxWidth, headerLabel.length * 8 + 40) // Approximate 8px per character

    // For text columns, use a simple heuristic
    let longestText = ''

    jobs.forEach(job => {
      let cellText = ''

      if (colId === 'no') {
        cellText = `#${job.job_number}`
      } else if (colId === 'title') {
        cellText = job.title
      } else if (colId === 'customer') {
        cellText = job.customer_name || '—'
      } else if (colId === 'dealer') {
        cellText = job.dealer_name || '—'
      } else if (colId === 'delivery') {
        cellText = job.delivery_date ? new Date(job.delivery_date).toLocaleDateString('tr-TR') : '—'
      } else if (colId === 'progress') {
        cellText = '100%' // Fixed width
      } else {
        // Process group column - count dots
        const group = processGroups.find(g => g.id === colId)
        if (group) {
          const jobSteps = job.steps || []
          const groupSteps = jobSteps.filter(step => step.process_group_id === group.id)
          // Each dot is approximately 22px (4px width + 6px gap)
          const dotsWidth = groupSteps.length * 22 + 24
          maxWidth = Math.max(maxWidth, dotsWidth)
        }
      }

      if (cellText.length > longestText.length) {
        longestText = cellText
      }
    })

    // Approximate width: 7-8px per character for most fonts
    if (longestText) {
      const approximateWidth = longestText.length * 7.5 + 24
      maxWidth = Math.max(maxWidth, approximateWidth)
    }

    // Cap maximum width
    maxWidth = Math.min(maxWidth, 400)

    setColumnWidths(prev => ({ ...prev, [colId]: Math.ceil(maxWidth) }))
  }

  const toggleSort = (key: string) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' }
      if (prev.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return null
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-blue-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-blue-600" />
    )
  }

  const sortedJobs = useMemo(() => {
    if (!sortConfig) return jobs

    const getComparable = (job: Job) => {
      switch (sortConfig.key) {
        case 'no':
          return (job.job_number || '').toString().toLowerCase()
        case 'title':
          return (job.title || '').toString().toLowerCase()
        case 'customer':
          return (job.customer_name || '').toString().toLowerCase()
        case 'dealer':
          return (job.dealer_name || '').toString().toLowerCase()
        case 'delivery': {
          const d = job.delivery_date
          return d ? new Date(d).getTime() : null
        }
        case 'progress':
          return typeof job.progress === 'number' ? job.progress : Number(job.progress)
        default:
          return null
      }
    }

    const arr = [...jobs]
    arr.sort((a, b) => {
      const av = getComparable(a) as any
      const bv = getComparable(b) as any
      if (av == null && bv == null) return 0
      if (av == null) return sortConfig.direction === 'asc' ? -1 : 1
      if (bv == null) return sortConfig.direction === 'asc' ? 1 : -1
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortConfig.direction === 'asc' ? av - bv : bv - av
      }
      const as = String(av)
      const bs = String(bv)
      return sortConfig.direction === 'asc'
        ? as.localeCompare(bs, 'tr')
        : bs.localeCompare(as, 'tr')
    })
    return arr
  }, [jobs, sortConfig])

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }
  // Get column labels for settings dialog
  const getColumnLabel = (colId: string): string => {
    const labels: Record<string, string> = {
      no: 'No',
      title: 'İş Adı',
      customer: 'Müşteri',
      dealer: 'Bayi',
      delivery: 'Teslim Tarihi',
      progress: 'İlerleme',
    }

    if (labels[colId]) return labels[colId]

    const group = processGroups.find(g => g.id === colId)
    return group?.name || colId
  }

  // Toggle column visibility
  const toggleColumnVisibility = (colId: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [colId]: !prev[colId]
    }))
  }

  return (
    <div className="w-full bg-white border-t border-b overflow-hidden">
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm min-w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columnOrder.filter(colId => columnVisibility[colId] !== false).map((colId) => {
                // Fixed columns
                if (colId === 'no') {
                  return (
                    <th
                      key="no"
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'no')}
                      onDragOver={(e) => handleDragOver(e, 'no')}
                      onDrop={(e) => handleDrop(e, 'no')}
                      onDragEnd={handleDragEnd}
                      className={`group px-2 py-2 text-left font-medium text-gray-700 relative cursor-move select-none ${
                        draggingColumn === 'no' ? 'opacity-50' : ''
                      } ${dragOverColumn === 'no' ? 'bg-blue-100' : ''}`}
                      style={{ width: columnWidths.no }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort('no')}
                        className="inline-flex items-center gap-2 hover:text-gray-900"
                      >
                        <span>No</span>
                        {getSortIcon('no')}
                      </button>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent opacity-0 transition-colors group-hover:bg-gray-300 hover:bg-blue-500 hover:opacity-100 group-hover:opacity-100"
                        onMouseDown={(e) => handleMouseDown(e, 'no')}
                        onDoubleClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAutoFitColumn('no')
                        }}
                        title="Çift tıklayarak otomatik genişlet"
                      />
                    </th>
                  )
                }
                if (colId === 'title') {
                  return (
                    <th
                      key="title"
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'title')}
                      onDragOver={(e) => handleDragOver(e, 'title')}
                      onDrop={(e) => handleDrop(e, 'title')}
                      onDragEnd={handleDragEnd}
                      className={`group px-2 py-2 text-left font-medium text-gray-700 relative cursor-move select-none ${
                        draggingColumn === 'title' ? 'opacity-50' : ''
                      } ${dragOverColumn === 'title' ? 'bg-blue-100' : ''}`}
                      style={{ width: columnWidths.title }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort('title')}
                        className="inline-flex items-center gap-2 hover:text-gray-900"
                      >
                        <span>İş Adı</span>
                        {getSortIcon('title')}
                      </button>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent opacity-0 transition-colors group-hover:bg-gray-300 hover:bg-blue-500 hover:opacity-100 group-hover:opacity-100"
                        onMouseDown={(e) => handleMouseDown(e, 'title')}
                        onDoubleClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAutoFitColumn('title')
                        }}
                        title="Çift tıklayarak otomatik genişlet"
                      />
                    </th>
                  )
                }
                if (colId === 'customer') {
                  return (
                    <th
                      key="customer"
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'customer')}
                      onDragOver={(e) => handleDragOver(e, 'customer')}
                      onDrop={(e) => handleDrop(e, 'customer')}
                      onDragEnd={handleDragEnd}
                      className={`group px-2 py-2 text-left font-medium text-gray-700 relative cursor-move select-none ${
                        draggingColumn === 'customer' ? 'opacity-50' : ''
                      } ${dragOverColumn === 'customer' ? 'bg-blue-100' : ''}`}
                      style={{ width: columnWidths.customer }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort('customer')}
                        className="inline-flex items-center gap-2 hover:text-gray-900"
                      >
                        <span>Müşteri</span>
                        {getSortIcon('customer')}
                      </button>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent opacity-0 transition-colors group-hover:bg-gray-300 hover:bg-blue-500 hover:opacity-100 group-hover:opacity-100"
                        onMouseDown={(e) => handleMouseDown(e, 'customer')}
                        onDoubleClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAutoFitColumn('customer')
                        }}
                        title="Çift tıklayarak otomatik genişlet"
                      />
                    </th>
                  )
                }
                if (colId === 'dealer') {
                  return (
                    <th
                      key="dealer"
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'dealer')}
                      onDragOver={(e) => handleDragOver(e, 'dealer')}
                      onDrop={(e) => handleDrop(e, 'dealer')}
                      onDragEnd={handleDragEnd}
                      className={`group px-2 py-2 text-left font-medium text-gray-700 relative cursor-move select-none ${
                        draggingColumn === 'dealer' ? 'opacity-50' : ''
                      } ${dragOverColumn === 'dealer' ? 'bg-blue-100' : ''}`}
                      style={{ width: columnWidths.dealer }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort('dealer')}
                        className="inline-flex items-center gap-2 hover:text-gray-900"
                      >
                        <span>Bayi</span>
                        {getSortIcon('dealer')}
                      </button>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent opacity-0 transition-colors group-hover:bg-gray-300 hover:bg-blue-500 hover:opacity-100 group-hover:opacity-100"
                        onMouseDown={(e) => handleMouseDown(e, 'dealer')}
                        onDoubleClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAutoFitColumn('dealer')
                        }}
                        title="Çift tıklayarak otomatik genişlet"
                      />
                    </th>
                  )
                }
                if (colId === 'delivery') {
                  return (
                    <th
                      key="delivery"
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'delivery')}
                      onDragOver={(e) => handleDragOver(e, 'delivery')}
                      onDrop={(e) => handleDrop(e, 'delivery')}
                      onDragEnd={handleDragEnd}
                      className={`group px-2 py-2 text-left font-medium text-gray-700 relative cursor-move select-none ${
                        draggingColumn === 'delivery' ? 'opacity-50' : ''
                      } ${dragOverColumn === 'delivery' ? 'bg-blue-100' : ''}`}
                      style={{ width: columnWidths.delivery }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort('delivery')}
                        className="inline-flex items-center gap-2 hover:text-gray-900"
                      >
                        <span>Teslim Tarihi</span>
                        {getSortIcon('delivery')}
                      </button>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent opacity-0 transition-colors group-hover:bg-gray-300 hover:bg-blue-500 hover:opacity-100 group-hover:opacity-100"
                        onMouseDown={(e) => handleMouseDown(e, 'delivery')}
                        onDoubleClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAutoFitColumn('delivery')
                        }}
                        title="Çift tıklayarak otomatik genişlet"
                      />
                    </th>
                  )
                }
                if (colId === 'progress') {
                  return (
                    <th
                      key="progress"
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'progress')}
                      onDragOver={(e) => handleDragOver(e, 'progress')}
                      onDrop={(e) => handleDrop(e, 'progress')}
                      onDragEnd={handleDragEnd}
                      className={`group px-2 py-2 text-center font-medium text-gray-700 relative cursor-move select-none ${
                        draggingColumn === 'progress' ? 'opacity-50' : ''
                      } ${dragOverColumn === 'progress' ? 'bg-blue-100' : ''}`}
                      style={{ width: columnWidths.progress }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort('progress')}
                        className="inline-flex items-center gap-2 hover:text-gray-900"
                      >
                        <span>İlerleme</span>
                        {getSortIcon('progress')}
                      </button>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent opacity-0 transition-colors group-hover:bg-gray-300 hover:bg-blue-500 hover:opacity-100 group-hover:opacity-100"
                        onMouseDown={(e) => handleMouseDown(e, 'progress')}
                        onDoubleClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAutoFitColumn('progress')
                        }}
                        title="Çift tıklayarak otomatik genişlet"
                      />
                    </th>
                  )
                }

                // Process group columns
                const group = processGroups.find(g => g.id === colId)
                if (group) {
                  return (
                    <th
                      key={group.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, group.id)}
                      onDragOver={(e) => handleDragOver(e, group.id)}
                      onDrop={(e) => handleDrop(e, group.id)}
                      onDragEnd={handleDragEnd}
                      className={`group px-2 py-2 text-center font-medium text-gray-700 relative cursor-move select-none ${
                        draggingColumn === group.id ? 'opacity-50' : ''
                      } ${dragOverColumn === group.id ? 'bg-blue-100' : ''}`}
                      style={{ width: columnWidths[group.id] }}
                    >
                      <div>{group.name}</div>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent opacity-0 transition-colors group-hover:bg-gray-300 hover:bg-blue-500 hover:opacity-100 group-hover:opacity-100"
                        onMouseDown={(e) => handleMouseDown(e, group.id)}
                        onDoubleClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAutoFitColumn(group.id)
                        }}
                        title="Çift tıklayarak otomatik genişlet"
                      />
                    </th>
                  )
                }

                return null
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedJobs.map((job) => {
              const jobSteps = job.steps || []

              const renderCell = (colId: string) => {
                if (colId === 'no') {
                  return (
                    <td key="no" className="px-2 py-1.5">
                      <div className="font-mono text-xs text-gray-600">
                        #{job.job_number}
                      </div>
                    </td>
                  )
                }
                if (colId === 'title') {
                  return (
                    <td key="title" className="px-2 py-1.5">
                      <Link href={`/jobs/${job.id}`} className="block">
                        <div className="font-medium text-gray-900 hover:text-blue-600">
                          {job.title}
                        </div>
                      </Link>
                    </td>
                  )
                }
                if (colId === 'customer') {
                  return (
                    <td key="customer" className="px-2 py-1.5">
                      <div className="text-sm text-gray-700">
                        {job.customer_name || '—'}
                      </div>
                    </td>
                  )
                }
                if (colId === 'dealer') {
                  return (
                    <td key="dealer" className="px-2 py-1.5">
                      <div className="text-sm text-gray-700">
                        {job.dealer_name || '—'}
                      </div>
                    </td>
                  )
                }
                if (colId === 'delivery') {
                  return (
                    <td key="delivery" className="px-2 py-1.5">
                      <div className="text-sm text-gray-700">
                        {job.delivery_date
                          ? new Date(job.delivery_date).toLocaleDateString('tr-TR')
                          : '—'}
                      </div>
                    </td>
                  )
                }
                if (colId === 'progress') {
                  return (
                    <td key="progress" className="px-2 py-1.5">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              job.progress >= 75
                                ? 'bg-green-600'
                                : job.progress >= 50
                                ? 'bg-blue-600'
                                : job.progress >= 25
                                ? 'bg-yellow-600'
                                : 'bg-red-600'
                            }`}
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700">{job.progress}%</span>
                      </div>
                    </td>
                  )
                }

                // Process group column
                const group = processGroups.find(g => g.id === colId)
                if (group) {
                  // Match steps by process_group_id (more reliable than matching process IDs)
                  const groupSteps = jobSteps.filter(step =>
                    step.process_group_id === group.id
                  )

                  return (
                    <td key={group.id} className="px-2 py-1.5">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {groupSteps.length > 0 ? (
                          groupSteps.map(step => {
                            const process = group.processes.find(p => p.id === step.process_id)
                            const status = step.status || 'not_started'
                            const colorClass = getStepStatusColor(status)

                            const statusLabels: Record<string, string> = {
                              completed: 'Tamamlandı',
                              in_progress: 'Devam Ediyor',
                              waiting: 'Bekliyor',
                              blocked: 'Sorunlu',
                              on_hold: 'Askıda',
                              not_started: 'Başlamadı'
                            }
                            const statusLabel = statusLabels[status] || status

                            return (
                              <div
                                key={step.id}
                                className={`relative w-4 h-4 rounded-full ${colorClass} transition-all hover:scale-125 cursor-pointer group`}
                              >
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-80 max-w-sm">
                                  <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 space-y-2">
                                    <div>
                                      <div className="font-semibold text-sm">
                                        {process?.code || process?.name || 'Süreç'}
                                      </div>
                                      <div className="text-gray-300 text-[11px]">
                                        {process?.name}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 pb-2 border-b border-gray-700">
                                      <div className={`w-2 h-2 rounded-full ${colorClass}`}></div>
                                      <span className="font-medium">{statusLabel}</span>
                                    </div>

                                    {step.completed_at && (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-gray-300">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          <span>Tamamlanma:</span>
                                        </div>
                                        <div className="text-[11px] text-gray-400 pl-4">
                                          {new Date(step.completed_at).toLocaleString('tr-TR')}
                                        </div>
                                      </div>
                                    )}

                                    {step.completed_by_name && (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-gray-300">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                          </svg>
                                          <span>Tamamlayan:</span>
                                        </div>
                                        <div className="text-[11px] text-gray-400 pl-4">
                                          {step.completed_by_name}
                                        </div>
                                      </div>
                                    )}

                                    {step.assigned_to?.name && (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-gray-300">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                          </svg>
                                          <span>Sorumlu:</span>
                                        </div>
                                        <div className="text-[11px] text-gray-400 pl-4">
                                          {step.assigned_to.name}
                                        </div>
                                      </div>
                                    )}

                                    {step.production_notes && (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-gray-300">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                          <span>Üretim Açıklamaları:</span>
                                        </div>
                                        <div className="text-[11px] text-gray-400 pl-4 max-h-20 overflow-y-auto whitespace-pre-wrap">
                                          {step.production_notes}
                                        </div>
                                      </div>
                                    )}

                                    {step.notes && (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-gray-300">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                          <span>Notlar:</span>
                                        </div>
                                        <div className="text-[11px] text-gray-400 pl-4 max-h-20 overflow-y-auto">
                                          {step.notes}
                                        </div>
                                      </div>
                                    )}

                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                  )
                }

                return null
              }

              return (
                <tr key={job.id} className="hover:bg-blue-100 transition-colors">
                  {columnOrder.filter(colId => columnVisibility[colId] !== false).map((colId) => renderCell(colId))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Column Settings Dialog */}
      <Dialog open={showColumnSettings} onOpenChange={setShowColumnSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kolon Ayarları</DialogTitle>
            <DialogDescription>
              Tabloda görmek istediğiniz kolonları seçin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {columnOrder.map((colId) => (
              <div key={colId} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                <Label htmlFor={`col-${colId}`} className="flex items-center gap-2 cursor-pointer flex-1">
                  {columnVisibility[colId] ? (
                    <Eye className="w-4 h-4 text-blue-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium">{getColumnLabel(colId)}</span>
                </Label>
                <Switch
                  id={`col-${colId}`}
                  checked={columnVisibility[colId] !== false}
                  onCheckedChange={() => toggleColumnVisibility(colId)}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
