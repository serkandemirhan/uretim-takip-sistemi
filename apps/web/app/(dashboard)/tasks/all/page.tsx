'use client'

import React, { useEffect, useMemo, useState, type ReactNode } from 'react'
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
import { ArrowUpDown, CheckCircle, Play, RefreshCcw, X, GripVertical, ChevronDown, ChevronRight, Settings, Eye, EyeOff } from 'lucide-react'
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
  const [groupByColumn, setGroupByColumn] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
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
          return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
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
        width: 'w-56',
        placeholder: 'Başlık arayın',
        accessor: (task) => task.job.title,
      },
      {
        key: 'job_description',
        label: 'İş Açıklaması',
        width: 'w-64',
        placeholder: 'Açıklama ara',
        accessor: (task) => task.job.description,
        render: (task) => (
          <p className="max-w-[320px] text-xs text-gray-500 line-clamp-2" title={task.job.description || undefined}>
            {task.job.description || '—'}
          </p>
        ),
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
          <span className="text-xs text-gray-600">
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
          <span className="text-xs text-gray-600">
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
          <span className="text-xs text-gray-600">
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
          <span className="text-xs text-gray-600">
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
          <span className="text-xs text-gray-600">
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
          <span className="text-xs text-gray-600">
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
          <span className="text-xs text-gray-600">
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
      } else {
        // Default: all columns visible
        setVisibleColumns(new Set(columnConfigs.map(col => col.key)))
      }
    } catch (error) {
      console.error('Failed to load table settings:', error)
      setVisibleColumns(new Set(columnConfigs.map(col => col.key)))
    }
  }, [columnConfigs])

  // Save settings to localStorage
  useEffect(() => {
    const storageKey = getUserStorageKey()
    if (!storageKey) return

    const settings = {
      columnWidths,
      visibleColumns: Array.from(visibleColumns)
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save table settings:', error)
    }
  }, [columnWidths, visibleColumns])

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
    if (!groupByColumn) {
      return null
    }

    const column = columnConfigs.find((col) => col.key === groupByColumn)
    if (!column) {
      return null
    }

    const groups = new Map<string, Task[]>()

    sortedTasks.forEach((task) => {
      const value = column.accessor(task)
      const groupKey = value == null ? '(Boş)' : String(value)

      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(task)
    })

    return Array.from(groups.entries()).map(([key, tasks]) => ({
      groupKey: key,
      tasks,
      count: tasks.length
    }))
  }, [sortedTasks, groupByColumn, columnConfigs])

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

  function resetFilters() {
    setFilters(Object.fromEntries(columnConfigs.map((column) => [column.key, ''])))
    setSortConfig(null)
  }

  function handleDragStart(e: React.DragEvent, columnKey: string) {
    setDraggedColumn(columnKey)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (draggedColumn) {
      setGroupByColumn(draggedColumn)
      setExpandedGroups(new Set())
      setDraggedColumn(null)
    }
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

  function clearGrouping() {
    setGroupByColumn(null)
    setExpandedGroups(new Set())
  }

  function handleResizeStart(e: React.MouseEvent, columnKey: string) {
    e.preventDefault()
    setResizingColumn(columnKey)

    const startX = e.clientX
    const column = columnConfigs.find(col => col.key === columnKey)
    const startWidth = columnWidths[columnKey] || (column?.width ? parseInt(column.width.replace(/\D/g, '')) * 4 : 200)

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
    toast.success('Tablo ayarları sıfırlandı')
  }

  const visibleColumnConfigs = useMemo(() => {
    return columnConfigs.filter(col => visibleColumns.has(col.key))
  }, [columnConfigs, visibleColumns])

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

      {/* Gruplama Alanı */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 transition-colors",
          draggedColumn ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50"
        )}
      >
        {groupByColumn ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                Gruplandı:{' '}
                <span className="font-semibold text-blue-600">
                  {columnConfigs.find(col => col.key === groupByColumn)?.label}
                </span>
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearGrouping}>
              <X className="h-4 w-4 mr-1" />
              Gruplamayı Kaldır
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <GripVertical className="h-4 w-4" />
            <span>Gruplamak için bir sütunu buraya sürükleyin</span>
          </div>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1400px]">
            <TableHeader>
              <TableRow className="bg-gray-50">
                {visibleColumnConfigs.map((column) => {
                  const isActive = sortConfig?.key === column.key
                  const sortLabel = isActive ? (sortConfig?.direction === 'asc' ? 'Artan' : 'Azalan') : 'Sırala'
                  const width = columnWidths[column.key] || (column.width ? undefined : 200)

                  return (
                    <TableHead
                      key={column.key}
                      className={cn('align-middle relative', column.width)}
                      style={width ? { width: `${width}px` } : undefined}
                    >
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, column.key)}
                        className="flex items-center gap-1 cursor-move group"
                      >
                        <GripVertical className="h-4 w-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className="flex flex-1 items-center justify-between gap-2 text-left text-sm font-semibold text-gray-700"
                        >
                          <span>{column.label}</span>
                          <ArrowUpDown
                            className={cn('h-4 w-4 text-gray-400', isActive && 'text-gray-700')}
                            aria-hidden="true"
                          />
                          <span className="sr-only">{sortLabel}</span>
                        </button>
                      </div>
                      {/* Resize Handle */}
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 bg-gray-300 opacity-0 hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => handleResizeStart(e, column.key)}
                      />
                    </TableHead>
                  )
                })}
                <TableHead className="w-40 text-right">Aksiyonlar</TableHead>
              </TableRow>
              <TableRow className="bg-gray-50">
                {visibleColumnConfigs.map((column) => {
                  const width = columnWidths[column.key] || (column.width ? undefined : 200)
                  return (
                    <TableCell
                      key={`${column.key}-filter`}
                      className={cn('py-2', column.width)}
                      style={width ? { width: `${width}px` } : undefined}
                    >
                      {column.filterType === 'select' ? (
                        <select
                          value={filters[column.key] ?? ''}
                          onChange={(event) =>
                            setFilters((prev) => ({ ...prev, [column.key]: event.target.value }))
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
                          value={filters[column.key] ?? ''}
                          onChange={(event) =>
                            setFilters((prev) => ({ ...prev, [column.key]: event.target.value }))
                          }
                          placeholder={column.placeholder}
                          className="h-8 text-xs"
                        />
                      )}
                    </TableCell>
                  )
                })}
                <TableCell />
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
                      <TableRow className="bg-gray-100 hover:bg-gray-200 cursor-pointer">
                        <TableCell
                          colSpan={visibleColumnConfigs.length + 1}
                          onClick={() => toggleGroup(group.groupKey)}
                          className="py-3"
                        >
                          <div className="flex items-center gap-2 font-semibold text-gray-900">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span>{group.groupKey}</span>
                            <Badge variant="outline" className="ml-2 bg-white">
                              {group.count} görev
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Grup İçeriği */}
                      {isExpanded && group.tasks.map((task) => {
                        const canStart = task.status === 'ready'
                        const canComplete = task.status === 'in_progress'
                        const isSelected = selectedTask?.id === task.id

                        return (
                          <TableRow
                            key={task.id}
                            className={cn(
                              "align-top cursor-pointer",
                              isSelected ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
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
                                  className={cn('align-top text-xs text-gray-700', column.width)}
                                  style={width ? { width: `${width}px` } : undefined}
                                >
                                  {column.render ? column.render(task) : displayValue}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
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
                sortedTasks.map((task) => {
                  const canStart = task.status === 'ready'
                  const canComplete = task.status === 'in_progress'
                  const isSelected = selectedTask?.id === task.id

                  return (
                    <TableRow
                      key={task.id}
                      className={cn(
                        "align-top cursor-pointer",
                        isSelected ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-gray-50"
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
                            className={cn('align-top text-xs text-gray-700', column.width)}
                            style={width ? { width: `${width}px` } : undefined}
                          >
                            {column.render ? column.render(task) : displayValue}
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tablo Ayarları</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Column Visibility */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Görünür Sütunlar</h3>
              <div className="grid grid-cols-2 gap-3">
                {columnConfigs.map((column) => {
                  const isVisible = visibleColumns.has(column.key)
                  return (
                    <button
                      key={column.key}
                      onClick={() => toggleColumnVisibility(column.key)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-left",
                        isVisible
                          ? "border-blue-500 bg-blue-50 hover:bg-blue-100"
                          : "border-gray-200 bg-white hover:bg-gray-50"
                      )}
                    >
                      {isVisible ? (
                        <Eye className="h-4 w-4 text-blue-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={cn(
                        "text-sm font-medium",
                        isVisible ? "text-blue-900" : "text-gray-600"
                      )}>
                        {column.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                {visibleColumns.size} / {columnConfigs.length} sütun görünür
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetTableSettings}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Sıfırla
                </Button>
                <Button onClick={() => setShowSettingsDialog(false)}>
                  Tamam
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
