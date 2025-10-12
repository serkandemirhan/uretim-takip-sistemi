'use client'

import { useEffect, useMemo, useState } from 'react'
import { dashboardAPI, jobsAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { CheckCircle, Play, Filter, RefreshCcw, FileText } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { handleError, handleApiError, debugLog } from '@/lib/utils/error-handler'

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

export default function AllTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterProcess, setFilterProcess] = useState<string>('all')

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

  const processes = useMemo(() => {
    const unique = new Map<string, string>()
    for (const task of tasks) {
      if (task.process?.id && task.process?.name) {
        unique.set(task.process.id, task.process.name)
      }
    }
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }))
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filterStatus !== 'all' && task.status !== filterStatus) return false
      if (filterProcess !== 'all' && task.process?.id !== filterProcess) return false
      return true
    })
  }, [tasks, filterStatus, filterProcess])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tüm Görevler</h1>
          <p className="text-sm text-gray-500">Sistemdeki tüm iş adımlarını takip edin.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadTasks} disabled={loading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Yenile
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Durum</label>
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'ready', 'in_progress', 'completed', 'blocked', 'canceled'].map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                      filterStatus === status
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                    )}
                    onClick={() => setFilterStatus(status)}
                  >
                    <Filter className="h-3 w-3" />
                    {status === 'all'
                      ? 'Tümü'
                      : STATUS_LABELS[status]?.label || status.toUpperCase()}
                  </button>
                ),
              )}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Süreç</label>
            <select
              value={filterProcess}
              onChange={(e) => setFilterProcess(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">Tümü</option>
              {processes.map((proc) => (
                <option key={proc.id} value={proc.id}>
                  {proc.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-40">Durum</TableHead>
                <TableHead className="w-64">İş / Müşteri</TableHead>
                <TableHead className="w-72">Görev Açıklaması</TableHead>
                <TableHead className="w-56">Sorumlu / Makine</TableHead>
                <TableHead className="w-52">Tarihler</TableHead>
                <TableHead className="w-48">Süre Bilgisi</TableHead>
                <TableHead className="w-40 text-right">Aksiyonlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-gray-500">
                    Görevler yükleniyor...
                  </TableCell>
                </TableRow>
              ) : filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-gray-500">
                    Seçili filtrelere göre görev bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.map((task) => {
                  const statusMeta = STATUS_LABELS[task.status] || STATUS_LABELS.pending
                  const canStart = task.status === 'ready'
                  const canComplete = task.status === 'in_progress'

                  return (
                    <TableRow key={task.id} className="align-top">
                      <TableCell className="space-y-1">
                        <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
                        <p className="text-xs text-gray-500">
                          #{task.order_index + 1} · {task.process?.code}
                        </p>
                        <p className="text-[11px] text-gray-400">ID: {task.id.slice(0, 8)}</p>
                      </TableCell>
                      <TableCell className="space-y-1" title={task.job.description || undefined}>
                        <p className="font-medium text-gray-900">{task.job.job_number}</p>
                        <p className="text-sm text-gray-600">{task.job.title}</p>
                        <p className="text-xs text-gray-500">Müşteri: {task.job.customer_name || '-'}</p>
                        {task.job.description && (
                          <p className="text-xs text-gray-400 line-clamp-2">{task.job.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="space-y-1">
                        <p className="font-medium text-gray-900 flex items-center gap-1">
                          <FileText className="h-3 w-3 text-gray-400" />
                          {task.process?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Görev Oluşturma:{' '}
                          {task.created_at ? new Date(task.created_at).toLocaleString('tr-TR') : '-'}
                        </p>
                        <p className="text-xs text-gray-500">
                          İş Oluşturma:{' '}
                          {task.job.created_at ? new Date(task.job.created_at).toLocaleString('tr-TR') : '-'}
                        </p>
                      </TableCell>
                      <TableCell className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-semibold text-gray-700">Sorumlu:</span>{' '}
                          {task.assigned_to?.name || 'Atanmamış'}
                        </p>
                        <p>
                          <span className="font-semibold text-gray-700">Makine:</span>{' '}
                          {task.machine?.name || '-'}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 space-y-1">
                        <p>
                          <span className="font-semibold text-gray-700">Başlangıç:</span>{' '}
                          {task.started_at ? new Date(task.started_at).toLocaleString('tr-TR') : '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-gray-700">Tamamlama:</span>{' '}
                          {task.completed_at ? new Date(task.completed_at).toLocaleString('tr-TR') : '-'}
                        </p>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 space-y-1">
                        <p>
                          <span className="font-semibold text-gray-700">Tahmini:</span>{' '}
                          {task.estimated_duration ? `${task.estimated_duration} dk` : '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-gray-700">Gerçekleşen:</span>{' '}
                          {task.actual_duration ? `${task.actual_duration} dk` : '-'}
                        </p>
                        <p>
                          <span className="font-semibold text-gray-700">Üretim:</span>{' '}
                          {task.production_quantity != null
                            ? `${task.production_quantity} ${task.production_unit || ''}`
                            : '-'}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStart(task.id)}
                            disabled={!canStart}
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Başlat
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleComplete(task)}
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
    </div>
  )
}
