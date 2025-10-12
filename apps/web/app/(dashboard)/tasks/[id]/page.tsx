'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { tasksAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Play, CheckCircle, Clock, AlertCircle, Cpu, Building2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDateTime, formatDate } from '@/lib/utils/formatters'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  
  // Tamamlama formu
  const [productionData, setProductionData] = useState({
    production_quantity: '',
    production_unit: '',
    production_notes: '',
  })

  useEffect(() => {
    if (params.id) {
      loadTask()
    }
  }, [params.id])

  async function loadTask() {
    try {
      setLoading(true)
      const response = await tasksAPI.getById(params.id as string)
      setTask(response.data)
      
      // Eğer daha önce veri girildiyse form'u doldur
      if (response.data.production_quantity) {
        setProductionData({
          production_quantity: response.data.production_quantity.toString(),
          production_unit: response.data.production_unit || '',
          production_notes: response.data.production_notes || '',
        })
      }
    } catch (error) {
      handleApiError(error, 'Task load')
      toast.error('Görev yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function handleStart() {
    if (!confirm('Bu görevi başlatmak istediğinizden emin misiniz?')) {
      return
    }

    try {
      setActionLoading(true)
      await tasksAPI.start(params.id as string)
      toast.success('Görev başlatıldı!')
      loadTask()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Görev başlatılamadı')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleComplete(e: React.FormEvent) {
    e.preventDefault()
    
    if (!confirm('Bu görevi tamamlandı olarak işaretlemek istediğinizden emin misiniz?')) {
      return
    }

    try {
      setActionLoading(true)
      await tasksAPI.complete(params.id as string, productionData)
      toast.success('Görev tamamlandı! Bir sonraki süreç aktif edildi.')
      router.push('/tasks')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Görev tamamlanamadı')
    } finally {
      setActionLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    const badges = {
      ready: { label: 'Hazır', icon: AlertCircle, class: 'bg-blue-100 text-blue-700' },
      in_progress: { label: 'Devam Ediyor', icon: Play, class: 'bg-yellow-100 text-yellow-700' },
      completed: { label: 'Tamamlandı', icon: CheckCircle, class: 'bg-green-100 text-green-700' },
    }
    const badge = badges[status as keyof typeof badges] || badges.ready
    return { ...badge, Icon: badge.icon }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Görev bulunamadı</p>
        <Link href="/tasks">
          <Button className="mt-4">Görevlere Dön</Button>
        </Link>
      </div>
    )
  }

  const statusBadge = getStatusBadge(task.status)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link href="/tasks">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Görevlere Dön
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{task.process.name}</h1>
            <Badge className={statusBadge.class}>
              <statusBadge.Icon className="w-3 h-3 mr-1" />
              {statusBadge.label}
            </Badge>
          </div>
          <p className="text-gray-600">
            <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">
              {task.process.code}
            </code>
          </p>
        </div>

        {/* Action Buttons */}
        {task.status === 'ready' && (
          <Button 
            onClick={handleStart}
            disabled={actionLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className="w-4 h-4 mr-2" />
            Görevi Başlat
          </Button>
        )}
      </div>

      {/* İş Bilgileri */}
      <Card>
        <CardHeader>
          <CardTitle>İş Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-1">İş Başlığı</p>
              <p className="font-medium text-lg">{task.job.title}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600 mb-1">İş Numarası</p>
                <p className="font-mono text-sm">{task.job.job_number}</p>
              </div>

              {task.job.due_date && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Teslim Tarihi</p>
                  <p className="font-medium">{formatDate(task.job.due_date)}</p>
                </div>
              )}
            </div>

            {task.job.customer_name && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{task.job.customer_name}</span>
              </div>
            )}

            {task.job.description && (
              <div>
                <p className="text-sm text-gray-600 mb-1">İş Açıklaması</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.job.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Süreç Detayları */}
      <Card>
        <CardHeader>
          <CardTitle>Süreç Detayları</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {task.machine && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Makine</p>
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{task.machine.name}</span>
                </div>
                <p className="text-xs text-gray-500 font-mono mt-1">{task.machine.code}</p>
              </div>
            )}

            {task.estimated_duration && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Tahmini Süre</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{task.estimated_duration} dakika</span>
                </div>
              </div>
            )}

            {task.started_at && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Başlangıç Zamanı</p>
                <p className="font-medium">{formatDateTime(task.started_at)}</p>
              </div>
            )}

            {task.completed_at && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Tamamlanma Zamanı</p>
                <p className="font-medium">{formatDateTime(task.completed_at)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Üretim Girişi / Tamamlama Formu */}
      {task.status === 'in_progress' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Üretim Girişi ve Tamamlama
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleComplete} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="production_quantity">Üretim Miktarı</Label>
                  <Input
                    id="production_quantity"
                    type="number"
                    step="0.01"
                    value={productionData.production_quantity}
                    onChange={(e) => setProductionData({ ...productionData, production_quantity: e.target.value })}
                    placeholder="Örn: 25"
                    disabled={actionLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="production_unit">Birim</Label>
                  <Input
                    id="production_unit"
                    value={productionData.production_unit}
                    onChange={(e) => setProductionData({ ...productionData, production_unit: e.target.value })}
                    placeholder="Örn: m², adet, kg"
                    disabled={actionLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="production_notes">Üretim Notları</Label>
                <Textarea
                  id="production_notes"
                  value={productionData.production_notes}
                  onChange={(e) => setProductionData({ ...productionData, production_notes: e.target.value })}
                  placeholder="Üretim sırasında yapılan işlemler, sorunlar veya özel notlar..."
                  rows={4}
                  disabled={actionLoading}
                />
                <p className="text-xs text-gray-500">
                  Örn: "İlk baskı renk farkı nedeniyle tekrarlandı. 2. baskı onaylandı."
                </p>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {actionLoading ? 'Tamamlanıyor...' : 'Görevi Tamamla'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tamamlanmış Görev Bilgileri */}
      {task.status === 'completed' && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5" />
              Tamamlanmış Görev
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {task.production_quantity && (
                <div>
                  <p className="text-sm text-green-700 mb-1">Üretim Miktarı</p>
                  <p className="font-medium text-green-900">
                    {task.production_quantity} {task.production_unit}
                  </p>
                </div>
              )}

              {task.production_notes && (
                <div>
                  <p className="text-sm text-green-700 mb-1">Üretim Notları</p>
                  <p className="text-sm text-green-900 whitespace-pre-wrap">
                    {task.production_notes}
                  </p>
                </div>
              )}

              {task.completed_at && (
                <div>
                  <p className="text-sm text-green-700 mb-1">Tamamlanma Zamanı</p>
                  <p className="font-medium text-green-900">
                    {formatDateTime(task.completed_at)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hazır Durumu Uyarısı */}
      {task.status === 'ready' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900 mb-1">Görev Hazır</h3>
                <p className="text-sm text-blue-700">
                  Bu görev başlatılmaya hazır. Görevi başlatmak için yukarıdaki butona tıklayın.
                  Görevi başlattığınızda süre ölçümü başlayacaktır.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}