'use client'

import { useEffect, useMemo, useState } from 'react'
import { tasksAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, CheckCircle, CheckSquare, Clock, Kanban, LayoutList, Play } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/formatters'
import { handleError, handleApiError, debugLog } from '@/lib/utils/error-handler'

type TaskStatus = 'ready' | 'in_progress' | 'completed'

type StatusColumn = {
  key: TaskStatus
  label: string
  description: string
  emptyLabel: string
  icon: LucideIcon
  iconClass: string
  headerClass: string
}

const STATUS_COLUMNS: StatusColumn[] = [
  {
    key: 'ready',
    label: 'Atanmış / Başlamamış',
    description: 'Başlamayı bekleyen görevler',
    emptyLabel: 'Başlamayı bekleyen görev bulunmuyor',
    icon: AlertCircle,
    iconClass: 'text-blue-600',
    headerClass: 'bg-blue-50/60 border-blue-100',
  },
  {
    key: 'in_progress',
    label: 'Devam Eden',
    description: 'Üzerinde çalışılan görevler',
    emptyLabel: 'Şu anda devam eden görev yok',
    icon: Play,
    iconClass: 'text-yellow-600',
    headerClass: 'bg-yellow-50/60 border-yellow-100',
  },
  {
    key: 'completed',
    label: 'Tamamlanan',
    description: 'Tamamlanan görevler',
    emptyLabel: 'Henüz tamamlanmış görev yok',
    icon: CheckCircle,
    iconClass: 'text-green-600',
    headerClass: 'bg-green-50/60 border-green-100',
  },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')

  const statusBuckets = useMemo<Record<TaskStatus, any[]>>(
    () => ({
      ready: tasks.filter((task) => task.status === 'ready'),
      in_progress: tasks.filter((task) => task.status === 'in_progress'),
      completed: tasks.filter((task) => task.status === 'completed'),
    }),
    [tasks],
  )

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    try {
      setLoading(true)
      const response = await tasksAPI.getMyTasks()
      setTasks(response.data || [])
    } catch (error) {
      handleApiError(error, 'Tasks load')
      toast.error('Görevler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    const badges = {
      ready: { label: 'Hazır', icon: AlertCircle, class: 'bg-blue-100 text-blue-700' },
      in_progress: { label: 'Devam Ediyor', icon: Play, class: 'bg-yellow-100 text-yellow-700' },
      completed: { label: 'Tamamlandı', icon: CheckCircle, class: 'bg-green-100 text-green-700' },
    }
    return badges[status as keyof typeof badges] || badges.ready
  }

  // Görevleri grupla
  const readyTasks = statusBuckets.ready
  const inProgressTasks = statusBuckets.in_progress
  const completedTasks = statusBuckets.completed

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Görevlerim</h1>
          <p className="mt-1 text-gray-600">Size atanan görevleri görüntüleyin ve yönetin</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            className="gap-2"
            aria-pressed={viewMode === 'list'}
          >
            <LayoutList className="h-4 w-4" />
            Liste
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            onClick={() => setViewMode('kanban')}
            className="gap-2"
            aria-pressed={viewMode === 'kanban'}
          >
            <Kanban className="h-4 w-4" />
            Kanban
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Devam Eden</p>
                <p className="text-2xl font-bold text-yellow-600">{inProgressTasks.length}</p>
              </div>
              <Play className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Bekleyen</p>
                <p className="text-2xl font-bold text-blue-600">{readyTasks.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tamamlanan</p>
                <p className="text-2xl font-bold text-green-600">{completedTasks.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-gray-500">Size atanmış görev bulunmuyor</p>
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {STATUS_COLUMNS.map((column) => {
            const columnTasks = statusBuckets[column.key] || []
            const Icon = column.icon
            return (
              <Card key={column.key} className="flex h-full flex-col">
                <CardHeader className={`border-b ${column.headerClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                        <Icon className={`h-4 w-4 ${column.iconClass}`} />
                        {column.label}
                      </div>
                      <p className="text-xs text-gray-500">{column.description}</p>
                    </div>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-gray-600 shadow-sm">
                      {columnTasks.length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 px-2 py-4 sm:px-4">
                  {columnTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onUpdate={loadTasks} compact />
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="rounded border border-dashed border-gray-200 bg-white/70 p-6 text-center text-xs text-gray-500">
                      {column.emptyLabel}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <>
          {inProgressTasks.length > 0 && (
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                <Play className="h-5 w-5 text-yellow-600" />
                Devam Eden Görevler
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inProgressTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
                ))}
              </div>
            </div>
          )}

          {readyTasks.length > 0 && (
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                Bekleyen Görevler
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {readyTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
                ))}
              </div>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Tamamlanan Görevler
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Task Card Component
function TaskCard({ task, onUpdate, compact = false }: { task: any; onUpdate: () => void; compact?: boolean }) {
  const statusMap: Record<TaskStatus, { label: string; class: string }> = {
    ready: { label: 'Hazır', class: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'Devam Ediyor', class: 'bg-yellow-100 text-yellow-700' },
    completed: { label: 'Tamamlandı', class: 'bg-green-100 text-green-700' },
  }

  const statusKey = (typeof task.status === 'string' && task.status in statusMap
    ? task.status
    : 'ready') as TaskStatus
  const statusBadge = statusMap[statusKey]

  // Acil iş kontrolü (son teslim 24 saat içinde)
  const isUrgent = task.job.due_date && new Date(task.job.due_date).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000
  const isOverdue = task.job.due_date && new Date(task.job.due_date) < new Date()

  // Geçen süre hesaplama
  const getElapsedTime = () => {
    if (task.status !== 'in_progress' || !task.started_at) return null

    const start = new Date(task.started_at)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return hours > 0 ? `${hours}sa ${minutes}dk` : `${minutes}dk`
  }

  const elapsedTime = getElapsedTime()

  if (compact) {
    // Kompakt Kanban görünümü
    return (
      <Link href={`/tasks/${task.id}`}>
        <Card className={`hover:shadow-md transition-shadow cursor-pointer ${
          isOverdue ? 'border-l-4 border-l-red-500' : isUrgent ? 'border-l-4 border-l-orange-400' : 'border-l-4 border-l-transparent'
        }`}>
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{task.process.name}</h3>
                {(isOverdue || isUrgent) && (
                  <Badge className={isOverdue ? "bg-red-100 text-red-700 text-[10px] px-1.5 py-0" : "bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0"}>
                    {isOverdue ? 'GECİKMİŞ' : 'ACİL'}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-gray-600 line-clamp-1">{task.job.title}</p>
              <p className="text-[10px] text-gray-500 font-mono">{task.job.job_number}</p>

              {elapsedTime && (
                <div className="text-[10px] text-yellow-700 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 animate-pulse" />
                  {elapsedTime}
                </div>
              )}

              {task.status === 'completed' && task.production_quantity && (
                <div className="text-[10px] text-green-700 font-medium">
                  ✓ {task.production_quantity} {task.production_unit}
                </div>
              )}

              {task.job.due_date && (
                <div className={`text-[10px] flex items-center gap-1 ${
                  isOverdue ? 'text-red-600 font-medium' : isUrgent ? 'text-orange-600 font-medium' : 'text-gray-500'
                }`}>
                  <Clock className="w-3 h-3" />
                  {formatDate(task.job.due_date)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  // Normal liste görünümü
  return (
    <Link href={`/tasks/${task.id}`}>
      <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${
        isOverdue ? 'border-red-500 border-2' : isUrgent ? 'border-orange-400 border-2' : ''
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex gap-2 flex-wrap">
              <Badge className={statusBadge.class}>
                {statusBadge.label}
              </Badge>
              {isOverdue && (
                <Badge className="bg-red-100 text-red-700">
                  GECİKMİŞ
                </Badge>
              )}
              {isUrgent && !isOverdue && (
                <Badge className="bg-orange-100 text-orange-700">
                  ACİL
                </Badge>
              )}
            </div>
            {task.job.due_date && (
              <div className={`text-xs flex items-center gap-1 ${
                isOverdue ? 'text-red-600 font-medium' : isUrgent ? 'text-orange-600 font-medium' : 'text-gray-500'
              }`}>
                <Clock className="w-3 h-3" />
                {formatDate(task.job.due_date)}
              </div>
            )}
          </div>
          <CardTitle className="text-base">{task.process.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-gray-600">{task.job.title}</p>
              <p className="text-xs text-gray-500 font-mono">{task.job.job_number}</p>
            </div>

            {task.job.customer_name && (
              <div className="text-xs text-gray-500">
                🏢 {task.job.customer_name}
              </div>
            )}

            {task.machine && (
              <div className="text-xs text-gray-500">
                🖨️ {task.machine.name}
              </div>
            )}

            {/* Geçen Süre */}
            {elapsedTime && (
              <div className="text-xs text-yellow-700 font-medium flex items-center gap-1">
                <Clock className="w-3 h-3 animate-pulse" />
                Geçen: {elapsedTime}
              </div>
            )}

            {/* Tahmini Süre */}
            {task.estimated_duration && task.status !== 'completed' && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Tahmini: {task.estimated_duration} dk
              </div>
            )}

            {/* Üretim Miktarı (Tamamlandıysa) */}
            {task.status === 'completed' && task.production_quantity && (
              <div className="text-xs text-green-700 font-medium">
                ✓ {task.production_quantity} {task.production_unit}
              </div>
            )}
          </div>

          <div className="mt-4">
            <Button
              size="sm"
              className="w-full"
              variant={task.status === 'completed' ? 'outline' : 'default'}
            >
              {task.status === 'completed' ? 'Görüntüle' : 'Detay'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
