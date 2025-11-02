'use client'

import React, { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { dashboardAPI, jobsAPI } from '@/lib/api/client'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, Play, RefreshCcw, X, GripVertical, ChevronDown, ChevronRight, Settings, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { handleApiError } from '@/lib/utils/error-handler'
import { TaskDetailPanel } from '@/components/features/tasks/TaskDetailPanel'

type Task = {
  id: string
  status: string
  order_index: number
  started_at: string | null
  completed_at: string | null
  estimated_duration: number | null
  actual_duration: number | null
  production_quantity: number | null
  production_unit: string | null
  created_at: string | null
  job: {
    id: string
    job_number: string
    title: string
    description: string | null
    created_at: string | null
    customer_name: string | null
  }
  process: {
    id: string
    name: string
    code: string
  }
  assigned_to?: {
    id: string
    name: string
  } | null
  machine?: {
    id: string
    name: string
  } | null
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'Beklemede', className: 'bg-gray-100 text-gray-700' },
  ready: { label: 'Hazır', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Devam Ediyor', className: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Tamamlandı', className: 'bg-green-100 text-green-700' },
  blocked: { label: 'Engellendi', className: 'bg-red-100 text-red-700' },
  canceled: { label: 'İptal', className: 'bg-gray-200 text-gray-600' },
}

type ColumnConfig = {
  key: string
  label: string
  width?: string
  type?: 'string' | 'number' | 'date'
  filterType?: 'text' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
  accessor: (task: Task) => string | number | null
  render?: (task: Task) => ReactNode
}

const STATUS_OPTIONS = [
  { value: 'pending', label: STATUS_LABELS.pending.label },
  { value: 'ready', label: STATUS_LABELS.ready.label },
  { value: 'in_progress', label: STATUS_LABELS.in_progress.label },
  { value: 'completed', label: STATUS_LABELS.completed.label },
  { value: 'blocked', label: STATUS_LABELS.blocked.label },
  { value: 'canceled', label: STATUS_LABELS.canceled.label },
]

const STORAGE_KEY_PREFIX = 'tasks_table_settings_'

export default function AllTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    null,
  )
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  // Grouping (multi-column, up to 3)
  const [groupByColumns, setGroupByColumns] = useState<string[]>([])
  const MAX_GROUP_COLUMNS = 3
  const [dragOverGroupArea, setDragOverGroupArea] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  // Drag state via ref to avoid re-renders during DnD
  const draggedColumnRef = useRef<string | null>(null)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const columnConfigs = useMemo<ColumnConfig[]>(
    () => [
      {
        key: 'status',
        label: 'Durum',
        width: 'w-36',
        filterType: 'select',
        options: STATUS_OPTIONS,
        accessor: (task) => task.status,
        render: (task) => {
          const statusInfo = STATUS_LABELS[task.status] || STATUS_LABELS.pending
          return (
            <Badge className={cn(statusInfo.className, 'px-1.5 py-0 text-[11px] leading-none')}>{statusInfo.label}</Badge>
          )
        },
      },
      {
        key: 'order_index',
        label: 'Sıra',
        width: 'w-20',
        type: 'number',
        placeholder: 'Örn. 5',
        accessor: (task) => task.order_index + 1,
      },
      {
        key: 'job_number',
        label: 'İş No',
        width: 'w-40',
        placeholder: 'İş numarası',
        accessor: (task) => task.job.job_number,
      },
      {
        key: 'job_title',
        label: 'İş Başlığı',
        width: 'w-[300px]',
        placeholder: 'Başlık arayın',
        accessor: (task) => task.job.title,
        render: (task) => {
          const text = task.job.title || '—'
          const truncated = text.length > 50 ? text.slice(0, 50) + '…' : text
          return (
            <span
              className="block truncate whitespace-nowrap text-sm text-gray-700"
              title={text !== '—' ? text : undefined}
            >
              {truncated}
            </span>
          )
        },
      },
      {
        key: 'job_description',
        label: 'İş Açıklaması',
        width: 'w-[360px]',
        placeholder: 'Açıklama ara',
        accessor: (task) => task.job.description,
        render: (task) => {
          const text = task.job.description || '—'
          const truncated = text.length > 50 ? text.slice(0, 50) + '…' : text
          return (
            <p
              className="block truncate whitespace-nowrap text-sm text-gray-600"
              title={text !== '—' ? text : undefined}
            >
              {truncated}
            </p>
          )
        },
      },
      {
        key: 'customer_name',
        label: 'Müşteri',
        width: 'w-48',
        placeholder: 'Müşteri ara',
        accessor: (task) => task.job.customer_name,
      },
      {
        key: 'process_name',
        label: 'Süreç',
        width: 'w-48',
        placeholder: 'Süreç ara',
        accessor: (task) => task.process?.name ?? null,
      },
      {
        key: 'process_code',
        label: 'Süreç Kodu',
        width: 'w-32',
        placeholder: 'Kod ara',
        accessor: (task) => task.process?.code ?? null,
      },
      {
        key: 'assigned_to',
        label: 'Sorumlu',
        width: 'w-48',
        placeholder: 'İsim ara',
        accessor: (task) => task.assigned_to?.name ?? null,
      },
      {
        key: 'machine',
        label: 'Makine',
        width: 'w-44',
        placeholder: 'Makine ara',
        accessor: (task) => task.machine?.name ?? null,
      },
      {
        key: 'task_created',
        label: 'Görev Oluşturma',
        width: 'w-56',
        type: 'date',
        placeholder: 'YYYY-AA-GG',
        accessor: (task) => task.created_at,
        render: (task) => (
          <span className="text-sm text-gray-700">
            {task.created_at ? new Date(task.created_at).toLocaleString('tr-TR') : '—'}
          </span>
        ),
      },
      {
        key: 'job_created',
        label: 'İş Oluşturma',
        width: 'w-56',
        type: 'date',
        placeholder: 'YYYY-AA-GG',
        accessor: (task) => task.job.created_at,
        render: (task) => (
          <span className="text-sm text-gray-700">
            {task.job.created_at ? new Date(task.job.created_at).toLocaleString('tr-TR') : '—'}
          </span>
        ),
      },
      {
        key: 'started_at',
        label: 'Başlangıç',
        width: 'w-56',
        type: 'date',
        placeholder: 'YYYY-AA-GG',
        accessor: (task) => task.started_at,
        render: (task) => (
          <span className="text-sm text-gray-700">
            {task.started_at ? new Date(task.started_at).toLocaleString('tr-TR') : '—'}
          </span>
        ),
      },
      {
        key: 'completed_at',
        label: 'Tamamlama',
        width: 'w-56',
        type: 'date',
        placeholder: 'YYYY-AA-GG',
        accessor: (task) => task.completed_at,
        render: (task) => (
          <span className="text-sm text-gray-700">
            {task.completed_at ? new Date(task.completed_at).toLocaleString('tr-TR') : '—'}
          </span>
        ),
      },
      {
        key: 'estimated_duration',
        label: 'Tahmini Süre (dk)',
        width: 'w-40',
        type: 'number',
        placeholder: 'Örn. 120',
        accessor: (task) => task.estimated_duration,
        render: (task) => (
          <span className="text-sm text-gray-700">
            {task.estimated_duration != null ? `${task.estimated_duration} dk` : '—'}
          </span>
        ),
      },
      {
        key: 'actual_duration',
        label: 'Gerçekleşen Süre (dk)',
        width: 'w-44',
        type: 'number',
        placeholder: 'Örn. 95',
        accessor: (task) => task.actual_duration,
        render: (task) => (
          <span className="text-sm text-gray-700">
            {task.actual_duration != null ? `${task.actual_duration} dk` : '—'}
          </span>
        ),
      },
      {
        key: 'production_quantity',
        label: 'Üretim Miktarı',
        width: 'w-40',
        type: 'number',
        placeholder: 'Örn. 10',
        accessor: (task) => task.production_quantity,
        render: (task) => (
          <span className="text-sm text-gray-700">
            {task.production_quantity != null ? `${task.production_quantity}` : '—'}
          </span>
        ),
      },
      {
        key: 'production_unit',
        label: 'Üretim Birimi',
        width: 'w-32',
        placeholder: 'Birim ara',
        accessor: (task) => task.production_unit,
      },
    ],
    [],
  )

  const [filters, setFilters] = useState<Record<string, string>>(() =>
    Object.fromEntries(columnConfigs.map((column) => [column.key, ''])),
  )
  // Draft filters bound to inputs; debounced into filters
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>(() =>
    Object.fromEntries(columnConfigs.map((column) => [column.key, ''])),
  )

  // Column ordering defaults and helpers
  const DEFAULT_COLUMN_ORDER = useMemo(() => columnConfigs.map((c) => c.key), [columnConfigs])
  useEffect(() => {
    // Initialize order if empty
    if (columnOrder.length === 0 && DEFAULT_COLUMN_ORDER.length > 0) {
      setColumnOrder(DEFAULT_COLUMN_ORDER)
    }
  }, [DEFAULT_COLUMN_ORDER, columnOrder.length])

  // localStorage key based on user
  const getUserStorageKey = () => {
    if (typeof window === 'undefined') return null
    const user = localStorage.getItem('user')
    if (!user) return null
    try {
      const userData = JSON.parse(user)
      return `${STORAGE_KEY_PREFIX}${userData.id || 'default'}`
    } catch {
      return `${STORAGE_KEY_PREFIX}default`
    }
  }

  // Load settings from localStorage
  useEffect(() => {
    const storageKey = getUserStorageKey()
    if (!storageKey) return

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const settings = JSON.parse(saved)

        if (settings.columnWidths) {
          setColumnWidths(settings.columnWidths)
        }

        if (settings.visibleColumns) {
          setVisibleColumns(new Set(settings.visibleColumns))
        } else {
          // Default: all columns visible
          setVisibleColumns(new Set(columnConfigs.map(col => col.key)))
        }
        if (settings.order) {
          const allowed = settings.order.filter((k: string) => columnConfigs.some((c) => c.key === k))
          if (allowed.length > 0) setColumnOrder(allowed)
        } else {
          setColumnOrder(columnConfigs.map((c) => c.key))
        }
      } else {
        // Default: all columns visible
        setVisibleColumns(new Set(columnConfigs.map(col => col.key)))
        setColumnOrder(columnConfigs.map((c) => c.key))
      }
    } catch (error) {
      console.error('Failed to load table settings:', error)
      setVisibleColumns(new Set(columnConfigs.map(col => col.key)))
      setColumnOrder(columnConfigs.map((c) => c.key))
    }
  }, [columnConfigs])

  // Keep draft filters keys in sync with column configs
  useEffect(() => {
    const nextKeys = new Set(columnConfigs.map(c => c.key))
    setDraftFilters(prev => {
      const merged: Record<string,string> = {}
      nextKeys.forEach(k => { merged[k] = prev[k] ?? '' })
      return merged
    })
    setFilters(prev => {
      const merged: Record<string,string> = {}
      nextKeys.forEach(k => { merged[k] = prev[k] ?? '' })
      return merged
    })
  }, [columnConfigs])

  // Debounce draftFilters into filters (250ms)
  useEffect(() => {
    const h = setTimeout(() => {
      setFilters(draftFilters)
    }, 250)
    return () => clearTimeout(h)
  }, [draftFilters])

  // Save settings to localStorage
  useEffect(() => {
    const storageKey = getUserStorageKey()
    if (!storageKey) return

    const settings = {
      columnWidths,
      visibleColumns: Array.from(visibleColumns),
      order: columnOrder,
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save table settings:', error)
    }
  }, [columnWidths, visibleColumns, columnOrder])

  useEffect(() => {
    void loadTasks()
  }, [])

  async function loadTasks() {
    try {
      setLoading(true)
      const response = await dashboardAPI.getAllTasks()
      const data = response?.data ?? response ?? []
      setTasks(Array.isArray(data) ? data : [])
    } catch (error) {
      handleApiError(error, 'Tasks load')
      toast.error('Görevler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function handleStart(taskId: string) {
    try {
      await jobsAPI.startStep(taskId)
      toast.success('Görev başlatıldı')
      void loadTasks()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Görev başlatılamadı')
    }
  }

  async function handleComplete(task: Task) {
    try {
      const quantityValue = window.prompt('Üretim miktarı girin (opsiyonel)', '')
      const quantity = quantityValue ? Number(quantityValue) : undefined
      if (quantityValue && Number.isNaN(quantity)) {
        toast.error('Geçerli bir sayı girin')
        return
      }
      await jobsAPI.completeStep(task.id, {
        production_quantity: quantity,
        production_unit: quantity ? task.production_unit || 'adet' : undefined,
        production_notes: undefined,
      })
      toast.success('Görev tamamlandı')
      void loadTasks()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Görev tamamlanamadı')
    }
  }

  useEffect(() => {
    setFilters((prev) => {
      const next: Record<string, string> = {}
      for (const column of columnConfigs) {
        next[column.key] = prev[column.key] ?? ''
      }
      return next
    })
  }, [columnConfigs])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      return columnConfigs.every((column) => {
        const filterValue = filters[column.key]
        if (!filterValue) {
          return true
        }

        const rawValue = column.accessor(task)
        if (rawValue == null) {
          return false
        }

        const normalizedFilter = filterValue.trim().toLowerCase()

        if (column.filterType === 'select') {
          return String(rawValue).toLowerCase() === normalizedFilter
        }

        if (column.type === 'number') {
          return String(rawValue).toLowerCase().includes(normalizedFilter)
        }

        if (column.type === 'date') {
          const dateString = new Date(rawValue as string).toLocaleString('tr-TR').toLowerCase()
          return dateString.includes(normalizedFilter)
        }

        return String(rawValue).toLowerCase().includes(normalizedFilter)
      })
    })
  }, [tasks, filters, columnConfigs])

  const sortedTasks = useMemo(() => {
    if (!sortConfig) {
      return filteredTasks
    }

    const column = columnConfigs.find((col) => col.key === sortConfig.key)
    if (!column) {
      return filteredTasks
    }

    const getComparableValue = (task: Task) => {
      const value = column.accessor(task)
      if (value == null) return null

      if (column.type === 'number') {
        return typeof value === 'number' ? value : Number(value)
      }

      if (column.type === 'date') {
        return value ? new Date(value as string).getTime() : null
      }

      return String(value).toLowerCase()
    }

    const sorted = [...filteredTasks].sort((a, b) => {
      const aValue = getComparableValue(a)
      const bValue = getComparableValue(b)

      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue, 'tr')
          : bValue.localeCompare(aValue, 'tr')
      }

      return 0
    })

    return sorted
  }, [filteredTasks, sortConfig, columnConfigs])

  const groupedTasks = useMemo(() => {
    if (!groupByColumns || groupByColumns.length === 0) {
      return null
    }

    const groups = new Map<string, Task[]>()

    sortedTasks.forEach((task) => {
      const key = groupByColumns
        .map((colKey) => {
          const col = columnConfigs.find((c) => c.key === colKey)
          if (!col) return '(Bilinmiyor)'
          const value = col.accessor(task)
          return value == null || value === '' ? '(Boş)' : String(value)
        })
        .join(' | ')

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(task)
    })

    return Array.from(groups.entries()).map(([key, tasks]) => ({
      groupKey: key,
      tasks,
      count: tasks.length,
    }))
  }, [sortedTasks, groupByColumns, columnConfigs])

  function toggleSort(key: string) {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) {
        return { key, direction: 'asc' }
      }

      if (prev.direction === 'asc') {
        return { key, direction: 'desc' }
      }

      return null
    })
  }

  function getSortIcon(colKey: string) {
    if (!sortConfig || sortConfig.key !== colKey) return null
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-blue-600" />
    )
  }

  function resetFilters() {
    const empty = Object.fromEntries(columnConfigs.map((column) => [column.key, ''])) as Record<string,string>
    setDraftFilters(empty)
    setFilters(empty)
    setSortConfig(null)
  }

  function handleDragStart(e: React.DragEvent, columnKey: string) {
    draggedColumnRef.current = columnKey
    e.dataTransfer.effectAllowed = 'move'
    try {
      e.dataTransfer.setData('text/plain', columnKey)
    } catch {}
  }

  function handleDragEnd() {
    draggedColumnRef.current = null
  }

  // Restrict grouping for numeric/date-like columns similar to inventory
  const NON_GROUPABLE_COLUMNS = useMemo(() => new Set<string>([
    'order_index',
    'estimated_duration',
    'actual_duration',
    'production_quantity',
    // dates
    'task_created',
    'job_created',
    'started_at',
    'completed_at',
  ]), [])

  function handleGroupAreaDragEnter(e: React.DragEvent) {
    e.preventDefault()
    const col = draggedColumnRef.current || e.dataTransfer.getData('text/plain')
    const allowed = col && !NON_GROUPABLE_COLUMNS.has(col) && groupByColumns.length < MAX_GROUP_COLUMNS
    setDragOverGroupArea(Boolean(allowed))
  }

  function handleGroupAreaDragOver(e: React.DragEvent) {
    e.preventDefault()
    const col = draggedColumnRef.current || e.dataTransfer.getData('text/plain')
    const allowed = col && !NON_GROUPABLE_COLUMNS.has(col) && groupByColumns.length < MAX_GROUP_COLUMNS
    e.dataTransfer.dropEffect = allowed ? 'copy' : 'none'
    setDragOverGroupArea(Boolean(allowed))
  }

  function handleGroupAreaDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverGroupArea(false)
    }
  }

  function handleGroupAreaDrop(e: React.DragEvent) {
    e.preventDefault()
    const col = draggedColumnRef.current || e.dataTransfer.getData('text/plain')
    setDragOverGroupArea(false)
    if (!col || NON_GROUPABLE_COLUMNS.has(col)) return
    setGroupByColumns((prev) => {
      if (prev.includes(col)) return prev
      if (prev.length >= MAX_GROUP_COLUMNS) return prev
      const next = [...prev, col]
      return next
    })
    setExpandedGroups(new Set())
  }

  function toggleGroup(groupKey: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  function removeGroupColumn(colKey: string) {
    setGroupByColumns((prev) => prev.filter((k) => k !== colKey))
  }

  function clearGrouping() {
    setGroupByColumns([])
    setExpandedGroups(new Set())
  }

  function handleResizeStart(e: React.MouseEvent, columnKey: string) {
    e.preventDefault()
    setResizingColumn(columnKey)

    const startX = e.clientX
    const column = columnConfigs.find(col => col.key === columnKey)
    const startWidth = columnWidths[columnKey] || (() => {
      if (!column?.width) return 200
      // Tailwind width parsing: support w-56 (56*4=224px) and arbitrary w-[420px]
      const w = column.width
      const bracketPx = w.match(/w-\[(\d+)px\]/)
      if (bracketPx) return Number(bracketPx[1])
      const num = parseInt(w.replace(/\D/g, ''))
      return isNaN(num) ? 200 : num * 4
    })()

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX
      const newWidth = Math.max(80, startWidth + diff)
      setColumnWidths(prev => ({ ...prev, [columnKey]: newWidth }))
    }

    const handleMouseUp = () => {
      setResizingColumn(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  function toggleColumnVisibility(columnKey: string) {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(columnKey)) {
        next.delete(columnKey)
      } else {
        next.add(columnKey)
      }
      return next
    })
  }

  function resetTableSettings() {
    setColumnWidths({})
    setVisibleColumns(new Set(columnConfigs.map(col => col.key)))
    setColumnOrder(columnConfigs.map((c) => c.key))
    toast.success('Tablo ayarları sıfırlandı')
  }

  const visibleColumnConfigs = useMemo(() => {
    const orderIndex: Record<string, number> = {}
    columnOrder.forEach((k, i) => { orderIndex[k] = i })
    const base = visibleColumns.size === 0
      ? columnConfigs
      : columnConfigs.filter((col) => visibleColumns.has(col.key))
    return base.sort((a, b) => (orderIndex[a.key] ?? 0) - (orderIndex[b.key] ?? 0))
  }, [columnConfigs, visibleColumns, columnOrder])

  // Ensure columns visible by default on first paint
  useEffect(() => {
    if (visibleColumns.size === 0 && columnConfigs.length > 0) {
      setVisibleColumns(new Set(columnConfigs.map((c) => c.key)))
    }
  }, [columnConfigs, visibleColumns.size])

  // Provide default fixed widths for specific columns (e.g., job_title, job_description)
  useEffect(() => {
    if (Object.keys(columnWidths).length > 0) return
    const defaults: Record<string, number> = {
      job_title: 300,
      job_description: 360,
    }
    const hasAny = Object.keys(defaults).some((k) => defaults[k])
    if (hasAny) {
      setColumnWidths((prev) => ({ ...defaults, ...prev }))
    }
  }, [columnWidths])

  function moveColumn(key: string, direction: 'up' | 'down') {
    setColumnOrder((prev) => {
      const idx = prev.indexOf(key)
      if (idx === -1) return prev
      const newIndex = direction === 'up' ? idx - 1 : idx + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev
      const next = [...prev]
      next.splice(idx, 1)
      next.splice(newIndex, 0, key)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tüm Görevler</h1>
          <p className="text-sm text-gray-500">Sistemdeki tüm iş adımlarını takip edin.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)} className="gap-2">
            <Settings className="h-4 w-4" />
            Tablo Ayarları
          </Button>
          <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
            <X className="h-4 w-4" />
            Filtreleri Sıfırla
          </Button>
          <Button variant="outline" size="sm" onClick={loadTasks} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
        </div>
      </div>

      {/* Gruplama Alanı (Inventory stil) */}
      <div
        onDragEnter={handleGroupAreaDragEnter}
        onDragOver={handleGroupAreaDragOver}
        onDragLeave={handleGroupAreaDragLeave}
        onDrop={handleGroupAreaDrop}
        className={cn(
          'min-w-[180px] h-10 border-2 border-dashed rounded-md flex items-center gap-2 px-3 transition-colors',
          dragOverGroupArea
            ? 'border-blue-500 bg-blue-50'
            : groupByColumns.length > 0
            ? 'border-gray-300 bg-gray-50'
            : 'border-gray-300 bg-white'
        )}
      >
        {groupByColumns.length === 0 ? (
          <span className="text-xs text-muted-foreground whitespace-nowrap pointer-events-none">
            Gruplamak için kolon sürükleyin
          </span>
        ) : (
          <div className="flex items-center gap-2 w-full">
            {groupByColumns.map((colKey) => {
              const def = columnConfigs.find((c) => c.key === colKey)
              return (
                <div
                  key={colKey}
                  className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium pointer-events-none"
                >
                  <span>{def?.label || colKey}</span>
                  <button
                    onClick={() => removeGroupColumn(colKey)}
                    className="hover:bg-blue-200 rounded-full p-0.5 pointer-events-auto"
                    aria-label="Grup sütununu kaldır"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
            {groupByColumns.length < MAX_GROUP_COLUMNS && (
              <span className="text-xs text-muted-foreground pointer-events-none">+{MAX_GROUP_COLUMNS - groupByColumns.length} daha</span>
            )}
            {groupByColumns.length > 0 && (
              <button onClick={clearGrouping} className="ml-auto text-xs text-red-600 hover:text-red-800 pointer-events-auto">
                Temizle
              </button>
            )}
          </div>
        )}
      </div>

      <Card>
        <div className="w-full overflow-x-auto rounded-md border border-gray-200">
          <Table className="w-full min-w-[1400px] text-sm">
            <TableHeader className="bg-gray-100 text-gray-700 border-b border-gray-200 !normal-case">
              <TableRow className="bg-gray-100 hover:bg-transparent">
                {visibleColumnConfigs.map((column) => {
                  const isActive = sortConfig?.key === column.key
                  const sortLabel = isActive ? (sortConfig?.direction === 'asc' ? 'Artan' : 'Azalan') : 'Sırala'
                  const width = columnWidths[column.key] || (column.width ? undefined : 200)

                  return (
                    <TableHead
                      key={column.key}
                      className={cn('group relative !px-3 !py-1 text-xs font-semibold tracking-wide align-middle !normal-case', column.width)}
                      style={width ? { width: `${width}px` } : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded border border-transparent bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground focus:border-blue-500 focus:outline-none"
                          draggable
                          onDragStart={(e) => handleDragStart(e, column.key)}
                          onDragEnd={handleDragEnd}
                          aria-label={`${column.label} sütununu taşı`}
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className="flex items-center gap-2 hover:text-gray-900 transition-colors cursor-move"
                          draggable
                          onDragStart={(e) => handleDragStart(e, column.key)}
                          onDragEnd={handleDragEnd}
                        >
                          <span className="truncate text-sm font-semibold text-gray-700">{column.label}</span>
                          {getSortIcon(column.key)}
                          <span className="sr-only">{sortLabel}</span>
                        </button>
                      </div>
                      {/* Resize Handle */}
                      <div
                        className="absolute right-0 top-1/2 h-6 w-1.5 -translate-y-1/2 cursor-col-resize rounded bg-transparent transition-colors group-hover:bg-gray-300 hover:bg-blue-400"
                        onMouseDown={(e) => handleResizeStart(e, column.key)}
                        aria-hidden="true"
                      />
                    </TableHead>
                  )
                })}
                <TableHead className="w-40 text-right !px-3 !py-1">Aksiyonlar</TableHead>
              </TableRow>
              <TableRow className="bg-gray-50">
                {visibleColumnConfigs.map((column) => {
                  const width = columnWidths[column.key] || (column.width ? undefined : 200)
                  return (
                    <TableCell key={`${column.key}-filter`} className={cn('!px-3 !py-1', column.width)} style={width ? { width: `${width}px` } : undefined}>
                      {column.filterType === 'select' ? (
                        <select
                          value={draftFilters[column.key] ?? ''}
                          onChange={(event) =>
                            setDraftFilters((prev) => ({ ...prev, [column.key]: event.target.value }))
                          }
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700"
                        >
                          <option value="">Tümü</option>
                          {column.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={draftFilters[column.key] ?? ''}
                          onChange={(event) =>
                            setDraftFilters((prev) => ({ ...prev, [column.key]: event.target.value }))
                          }
                          placeholder={column.placeholder}
                          className="h-8 text-xs"
                        />
                      )}
                    </TableCell>
                  )
                })}
                <TableCell className="!px-3 !py-1" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnConfigs.length + 1} className="py-10 text-center text-sm text-gray-500">
                    Görevler yükleniyor...
                  </TableCell>
                </TableRow>
              ) : sortedTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={visibleColumnConfigs.length + 1} className="py-10 text-center text-sm text-gray-500">
                    Seçili filtrelere göre görev bulunamadı.
                  </TableCell>
                </TableRow>
              ) : groupedTasks ? (
                // Gruplu Görünüm
                groupedTasks.map((group) => {
                  const isExpanded = expandedGroups.has(group.groupKey)

                  return (
                    <React.Fragment key={group.groupKey}>
                      {/* Grup Başlığı */}
                      <TableRow className="bg-gray-200 border-b-2 border-gray-300 cursor-pointer">
                        <TableCell
                          colSpan={visibleColumnConfigs.length + 1}
                          onClick={() => toggleGroup(group.groupKey)}
                          className="!px-3 !py-1.5"
                        >
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 truncate whitespace-nowrap overflow-hidden">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span>{group.groupKey}</span>
                            <Badge variant="outline" className="ml-2 bg-white px-1.5 py-0 text-[11px] leading-none">
                              {group.count} görev
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Grup İçeriği */}
                      {isExpanded && group.tasks.map((task, index) => {
                        const canStart = task.status === 'ready'
                        const canComplete = task.status === 'in_progress'
                        const isSelected = selectedTask?.id === task.id
                        const isEven = index % 2 === 0

                        return (
                          <TableRow
                            key={task.id}
                            className={cn(
                              'border-b transition-colors cursor-pointer hover:bg-blue-100',
                              isSelected
                                ? 'bg-blue-100'
                                : isEven
                                ? 'bg-white'
                                : 'bg-gray-50'
                            )}
                            onClick={() => setSelectedTask(task)}
                          >
                            {visibleColumnConfigs.map((column) => {
                              const rawValue = column.accessor(task)
                              const displayValue =
                                rawValue === null || rawValue === undefined
                                  ? '—'
                                  : typeof rawValue === 'string'
                                  ? rawValue.trim() === ''
                                    ? '—'
                                    : rawValue
                                  : rawValue
                              const width = columnWidths[column.key] || (column.width ? undefined : 200)

                              return (
                                <TableCell
                                  key={column.key}
                                  className={cn('!px-3 !py-1 align-middle text-sm text-gray-700', column.width)}
                                  style={width ? { width: `${width}px` } : undefined}
                                >
                                  <div className="truncate whitespace-nowrap overflow-hidden">
                                    {column.render ? column.render(task) : displayValue}
                                  </div>
                                </TableCell>
                              )
                            })}
                             <TableCell className="!px-3 !py-1 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 py-0 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleStart(task.id)
                                  }}
                                  disabled={!canStart}
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Başlat
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 py-0 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleComplete(task)
                                  }}
                                  disabled={!canComplete}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Tamamla
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </React.Fragment>
                  )
                })
              ) : (
                // Normal Görünüm
                sortedTasks.map((task, index) => {
                  const canStart = task.status === 'ready'
                  const canComplete = task.status === 'in_progress'
                  const isSelected = selectedTask?.id === task.id
                  const isEven = index % 2 === 0

                  return (
                    <TableRow
                      key={task.id}
                      className={cn(
                        'border-b transition-colors cursor-pointer hover:bg-blue-100',
                        isSelected
                          ? 'bg-blue-100'
                          : isEven
                          ? 'bg-white'
                          : 'bg-gray-50'
                      )}
                      onClick={() => setSelectedTask(task)}
                    >
                      {visibleColumnConfigs.map((column) => {
                        const rawValue = column.accessor(task)
                        const displayValue =
                          rawValue === null || rawValue === undefined
                            ? '—'
                            : typeof rawValue === 'string'
                            ? rawValue.trim() === ''
                              ? '—'
                              : rawValue
                            : rawValue
                        const width = columnWidths[column.key] || (column.width ? undefined : 200)

                        return (
                          <TableCell
                            key={column.key}
                            className={cn('!px-3 !py-1 align-middle text-sm text-gray-700', column.width)}
                            style={width ? { width: `${width}px` } : undefined}
                          >
                            <div className="truncate whitespace-nowrap overflow-hidden">
                              {column.render ? column.render(task) : displayValue}
                            </div>
                          </TableCell>
                        )
                      })}
                      <TableCell className="!px-3 !py-1 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 py-0 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStart(task.id)
                            }}
                            disabled={!canStart}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Başlat
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 py-0 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleComplete(task)
                            }}
                            disabled={!canComplete}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Tamamla
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <TaskDetailPanel
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={(taskId, updates) => {
          // Handle task updates here if needed
          console.log('Task updated:', taskId, updates)
        }}
        onStart={handleStart}
        onComplete={handleComplete}
        onPause={(taskId) => {
          // TODO: Implement pause functionality
          toast.info('Durdurma özelliği yakında eklenecek')
        }}
      />

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Tablo Kolon Ayarları</DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {columnOrder.map((key, idx) => {
              const column = columnConfigs.find((c) => c.key === key)
              if (!column) return null
              const isVisible = visibleColumns.has(key)
              return (
                <div key={`col-setting-${key}`} className="flex items-center justify-between rounded border border-gray-200 bg-white p-1.5 pl-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex items-center justify-center rounded bg-gray-100 p-1 flex-shrink-0">
                      <GripVertical className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{column.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                      <span className="whitespace-nowrap">{isVisible ? 'Görünür' : 'Gizli'}</span>
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5"
                        checked={isVisible}
                        onChange={() => toggleColumnVisibility(key)}
                      />
                    </label>
                    <div className="h-5 w-px bg-gray-200"></div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveColumn(key, 'up')}
                      disabled={idx === 0}
                      aria-label={`${column.label} kolonunu yukarı taşı`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveColumn(key, 'down')}
                      disabled={idx === columnOrder.length - 1}
                      aria-label={`${column.label} kolonunu aşağı taşı`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="sm:justify-between flex items-center mt-3">
            <Button variant="ghost" onClick={resetTableSettings}>
              Varsayılanlara Sıfırla
            </Button>
            <Button onClick={() => setShowSettingsDialog(false)}>Tamam</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
