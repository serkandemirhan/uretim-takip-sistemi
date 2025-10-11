'use client'

import { useEffect, useState } from 'react'
import { tasksAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckSquare, Clock, Play, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/formatters'

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTasks()
  }, [])

  async function loadTasks() {
    try {
      setLoading(true)
      const response = await tasksAPI.getMyTasks()
      setTasks(response.data || [])
    } catch (error) {
      console.error('Tasks load error:', error)
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
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const readyTasks = tasks.filter(t => t.status === 'ready')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Görevlerim</h1>
        <p className="text-gray-600 mt-1">Size atanan görevleri görüntüleyin ve yönetin</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Devam Eden</p>
                <p className="text-2xl font-bold text-yellow-600">{inProgressTasks.length}</p>
              </div>
              <Play className="w-8 h-8 text-yellow-600" />
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
              <AlertCircle className="w-8 h-8 text-blue-600" />
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
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No Tasks */}
      {tasks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Size atanmış görev bulunmuyor</p>
          </CardContent>
        </Card>
      )}

      {/* In Progress Tasks */}
      {inProgressTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-yellow-600" />
            Devam Eden Görevler
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {inProgressTasks.map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
            ))}
          </div>
        </div>
      )}

      {/* Ready Tasks */}
      {readyTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Bekleyen Görevler
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {readyTasks.map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Tamamlanan Görevler
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {completedTasks.map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={loadTasks} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Task Card Component
function TaskCard({ task, onUpdate }: { task: any; onUpdate: () => void }) {
  const statusBadge = {
    ready: { label: 'Hazır', class: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'Devam Ediyor', class: 'bg-yellow-100 text-yellow-700' },
    completed: { label: 'Tamamlandı', class: 'bg-green-100 text-green-700' },
  }[task.status]

  return (
    <Link href={`/tasks/${task.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between mb-2">
            <Badge className={statusBadge.class}>
              {statusBadge.label}
            </Badge>
            {task.job.due_date && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
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

            {task.estimated_duration && (
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Tahmini: {task.estimated_duration} dk
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