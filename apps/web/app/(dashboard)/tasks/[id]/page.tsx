'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { tasksAPI, jobsAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Play, CheckCircle, Clock, AlertCircle, Timer, Package, CheckCheck, Pause, FileText } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDateTime, formatDate } from '@/lib/utils/formatters'
import { handleApiError } from '@/lib/utils/error-handler'
import { ActivityTimeline } from '@/components/features/tasks/ActivityTimeline'
import { FileList } from '@/components/features/files/FileList'
import { FileUpload } from '@/components/features/files/FileUpload'
import { filesAPI } from '@/lib/api/client'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [elapsedTime, setElapsedTime] = useState<string>('')
  const [files, setFiles] = useState<any[]>([])
  const [noteText, setNoteText] = useState('')
  const [noteSubmitting, setNoteSubmitting] = useState(false)
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0)

  // Üretim ekleme (inline form)
  const [productionQuantity, setProductionQuantity] = useState('')
  const [productionNotes, setProductionNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Durdurma
  const [showPauseForm, setShowPauseForm] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  const [pausing, setPausing] = useState(false)

  // Geçen süre hesaplama
  useEffect(() => {
    if (!task || task.status !== 'in_progress' || !task.started_at) return

    const updateElapsedTime = () => {
      const start = new Date(task.started_at)
      const now = new Date()
      const diff = now.getTime() - start.getTime()

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      setElapsedTime(`${hours}sa ${minutes}dk`)
    }

    updateElapsedTime()
    const interval = setInterval(updateElapsedTime, 60000) // Her dakika güncelle

    return () => clearInterval(interval)
  }, [task])

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

      // Dosyaları yükle
      loadFiles()
    } catch (error) {
      handleApiError(error, 'Task load')
      toast.error('Görev yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function loadFiles() {
    try {
      // Sadece bu süreç adımına ait dosyaları getir
      const response = await filesAPI.getFiles({
        ref_type: 'job_step',
        ref_id: params.id as string,
      })
      const stepFiles = Array.isArray(response?.data) ? response.data :
                       Array.isArray(response) ? response : []
      setFiles(stepFiles)
    } catch (error) {
      handleApiError(error, 'Files load')
    }
  }

  async function handleDownloadAll() {
    if (files.length === 0) {
      toast.error('İndirilecek dosya bulunamadı')
      return
    }

    toast.success(`${files.length} dosya indiriliyor...`)

    for (const file of files) {
      try {
        const response = await filesAPI.getDownloadUrl(file.id)
        const downloadUrl = response.data.download_url

        const link = document.createElement('a')
        link.href = downloadUrl
        link.download = file.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Tarayıcıların aynı anda birden fazla indirmeyi engellemesini önlemek için kısa gecikme
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Dosya indirilemedi: ${file.filename}`, error)
        toast.error(`${file.filename} indirilemedi`)
      }
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

  async function handleAddProduction() {
    if (!productionQuantity) {
      toast.error('Üretim miktarı giriniz')
      return
    }

    try {
      setSubmitting(true)
      await tasksAPI.addProduction(params.id as string, {
        production_quantity: parseFloat(productionQuantity),
        production_notes: productionNotes,
      })
      toast.success('Üretim kaydedildi')
      setProductionQuantity('')
      setProductionNotes('')
      loadTask()
    } catch (error) {
      handleApiError(error, 'Add production')
      toast.error('Üretim eklenirken hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePause() {
    if (!pauseReason.trim()) {
      toast.error('Lütfen bir sebep girin')
      return
    }

    try {
      setPausing(true)
      await fetch(`http://localhost:5000/api/jobs/steps/${params.id}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason: pauseReason })
      })

      toast.success('Süreç durduruldu')
      setPauseReason('')
      setShowPauseForm(false)
      await loadTask()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Süreç durdurulamadı')
    } finally {
      setPausing(false)
    }
  }

  async function handleComplete() {
    if (!confirm('Bu görevi tamamlandı olarak işaretlemek istediğinizden emin misiniz?')) {
      return
    }

    try {
      setActionLoading(true)
      await tasksAPI.complete(params.id as string, {
        production_quantity: task.production_quantity || 0,
        production_notes: task.production_notes || '',
      })
      toast.success('Görev tamamlandı! Bir sonraki süreç aktif edildi.')
      router.push('/tasks')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Görev tamamlanamadı')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleResumeTask() {
    try {
      setActionLoading(true)
      await jobsAPI.resumeStep(params.id as string)
      toast.success('Görev devam ettirildi')
      loadTask()
    } catch (error) {
      handleApiError(error, 'Resume task')
      toast.error('Görev devam ettirilemedi')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleAddNote() {
    if (!task) return
    const trimmed = noteText.trim()
    if (!trimmed) {
      toast.error('Lütfen bir not girin')
      return
    }

    try {
      setNoteSubmitting(true)
      const response = await jobsAPI.addStepNote(task.id, { note: trimmed })
      const notePayload = response?.data ?? response
      setTask((prev: any) => {
        if (!prev) return prev
        const prevNotes = Array.isArray(prev.notes) ? prev.notes : []
        return {
          ...prev,
          notes: [...prevNotes, notePayload],
        }
      })
      setNoteText('')
      setTimelineRefreshKey((prev) => prev + 1)
      toast.success('Not eklendi')
    } catch (error) {
      handleApiError(error, 'Add note')
      toast.error('Not eklenemedi')
    } finally {
      setNoteSubmitting(false)
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

  // Acil iş kontrolü
  const isUrgent = task.job.due_date && new Date(task.job.due_date).getTime() - new Date().getTime() < 24 * 60 * 60 * 1000
  const isOverdue = task.job.due_date && new Date(task.job.due_date) < new Date()
  const notes = Array.isArray(task.notes) ? task.notes : []

  return (
    <div className="max-w-full mx-auto space-y-6 p-6">
      {/* Back Button */}
      <Link href="/tasks">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Görevlere Dön
        </Button>
      </Link>

      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">{task.process.name}</h1>
          <Badge className={statusBadge.class}>
            <statusBadge.Icon className="w-3 h-3 mr-1" />
            {statusBadge.label}
          </Badge>
          {isOverdue && (
            <Badge className="bg-red-100 text-red-700">GECİKMİŞ</Badge>
          )}
          {isUrgent && !isOverdue && (
            <Badge className="bg-orange-100 text-orange-700">ACİL</Badge>
          )}
        </div>
        <p className="text-sm text-gray-500 font-mono">{task.process.code}</p>
      </div>

      {/* 3 Kolonlu Açık Layout */}
      <div className="grid grid-cols-12 gap-6">
            {/* Column 1: Timeline (3 cols) */}
            <div className="col-span-3 border-r pr-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">İş Hikayesi</h2>
                <p className="text-xs text-gray-500">Bu adım için aktiviteler</p>
              </div>
              <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                {task.job && task.job.id && (
                  <ActivityTimeline
                    key={timelineRefreshKey}
                    jobId={task.job.id}
                    stepId={task.id}
                    compact={true}
                    reverse={true}
                  />
                )}
              </div>
            </div>

            {/* Column 2: Details (6 cols) */}
            <div className="col-span-6 space-y-4">
              {/* İş Bilgileri */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">İş Bilgileri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">İş Başlığı</p>
                      <p className="font-medium">{task.job.title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">İş Numarası:</span>
                        <p className="font-mono font-medium">{task.job.job_number}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Müşteri:</span>
                        <p className="font-medium">{task.job.customer_name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Bayi:</span>
                        <p className="font-medium">
                          {task.job?.dealer?.name || task.job?.dealer_name || '-'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Makine:</span>
                        <p className="font-medium">{task.machine?.name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Termin:</span>
                        {task.job.due_date ? (
                          <p
                            className={`font-medium flex items-center gap-1 ${
                              isOverdue ? 'text-red-600' : isUrgent ? 'text-orange-600' : ''
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {formatDate(task.job.due_date)}
                          </p>
                        ) : (
                          <p>-</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* İş Açıklaması */}
              {task.job.description && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">İş Açıklaması</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{task.job.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* İlgili Dosyalar */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    İlgili Dosyalar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File List - Silme izni yok */}
                  {files.length > 0 && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">Mevcut Dosyalar</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleDownloadAll}
                          className="h-8"
                        >
                          Hepsini İndir
                        </Button>
                      </div>
                      <FileList
                        files={files}
                        allowDelete={false}
                      />
                    </>
                  )}

                  {/* File Upload - Operatör dosya yükleyebilir */}
                  <FileUpload
                    refType="job_step"
                    refId={task.id}
                    onUploadComplete={() => loadFiles()}
                  />

                  {files.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Bu sürece ait dosya bulunmuyor.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Süreç Detayları */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Süreç Detayları</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {task.estimated_duration && (
                      <div>
                        <p className="text-gray-500">Tahmini Süre:</p>
                        <div className="flex items-center gap-2 font-medium">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {task.estimated_duration} dakika
                        </div>
                      </div>
                    )}

                    {task.started_at && (
                      <div>
                        <p className="text-gray-500">Başlangıç:</p>
                        <p className="font-medium">{formatDateTime(task.started_at)}</p>
                      </div>
                    )}

                    {task.status === 'in_progress' && elapsedTime && (
                      <div>
                        <p className="text-gray-500">Geçen Süre:</p>
                        <div className="flex items-center gap-2 font-medium text-yellow-700">
                          <Timer className="w-4 h-4 animate-pulse" />
                          {elapsedTime}
                        </div>
                      </div>
                    )}

                    {task.completed_at && (
                      <div>
                        <p className="text-gray-500">Tamamlanma:</p>
                        <p className="font-medium">{formatDateTime(task.completed_at)}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Column 3: Actions (3 cols) */}
            <div className="col-span-3 border-l pl-6 space-y-4">
              <div className="mb-2">
                <h2 className="text-lg font-semibold text-gray-900">Aksiyonlar</h2>
                <p className="text-xs text-gray-500">İşlem yapın</p>
              </div>

              {/* Toplam Üretim - Sadece has_production true ise göster */}
              {task.has_production && (task.status === 'in_progress' || task.status === 'completed') && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Toplam Üretim</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-blue-700">
                      {task.production_quantity || 0}
                      {task.required_quantity && (
                        <span className="text-lg text-blue-600">
                          {' / '}{task.required_quantity}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">adet</p>
                  </div>
                </div>
              )}

              {task.status === 'blocked' && (
                <Button
                  onClick={handleResumeTask}
                  disabled={actionLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {actionLoading ? 'Devam Ettiriliyor...' : 'Görevi Devam Ettir'}
                </Button>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Üretim Notları</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {notes.length === 0 ? (
                      <p className="py-2 text-center text-xs text-gray-500">
                        Henüz not eklenmemiş.
                      </p>
                    ) : (
                      notes.map((note: any, index: number) => (
                        <div key={note.id || `${note.created_at}-${index}`} className="rounded-md border border-gray-200 bg-gray-50 p-2">
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span>{note.author_name || 'Bilinmeyen Kullanıcı'}</span>
                            {note.created_at && (
                              <span>{formatDateTime(note.created_at)}</span>
                            )}
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{note.note}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="step_note" className="text-sm">Yeni Not</Label>
                    <Textarea
                      id="step_note"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={2}
                      placeholder="Üretim hakkında not ekle"
                      className="bg-white"
                    />
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={handleAddNote}
                      disabled={noteSubmitting || !noteText.trim()}
                    >
                      {noteSubmitting ? 'Kaydediliyor...' : 'Notu Kaydet'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Başlat Butonu */}
              {task.status === 'ready' && (
                <Button
                  onClick={handleStart}
                  disabled={actionLoading}
                  className="w-full"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Görevi Başlat
                </Button>
              )}

              {/* Devam Eden İşlemler */}
              {task.status === 'in_progress' && (
                <>
                  {/* Inline Üretim Formu - Sadece has_production true ise göster */}
                  {task.has_production && (
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2 text-green-900">
                          <Package className="w-4 h-4" />
                          Üretim Gir
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="production_quantity" className="text-sm">Miktar *</Label>
                          <Input
                            id="production_quantity"
                            type="number"
                            value={productionQuantity}
                            onChange={(e) => setProductionQuantity(e.target.value)}
                            placeholder="Üretim miktarı"
                            className="bg-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="production_notes" className="text-sm">Not</Label>
                          <Textarea
                            id="production_notes"
                            value={productionNotes}
                            onChange={(e) => setProductionNotes(e.target.value)}
                            placeholder="İsteğe bağlı..."
                            rows={2}
                            className="bg-white"
                          />
                        </div>
                        <Button
                          onClick={handleAddProduction}
                          disabled={submitting || !productionQuantity}
                          className="w-full"
                          size="sm"
                        >
                          {submitting ? 'Kaydediliyor...' : 'Üretimi Kaydet'}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {/* Durdur Butonu */}
                  {!showPauseForm ? (
                    <Button
                      onClick={() => setShowPauseForm(true)}
                      variant="outline"
                      className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Görevi Durdur
                    </Button>
                  ) : (
                    <Card className="bg-orange-50 border-orange-200">
                      <CardContent className="pt-4 space-y-3">
                        <Label className="text-sm font-medium">Durdurma Sebebi</Label>
                        <Textarea
                          value={pauseReason}
                          onChange={(e) => setPauseReason(e.target.value)}
                          placeholder="Neden durduruluyor?"
                          rows={2}
                          className="bg-white"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShowPauseForm(false)
                              setPauseReason('')
                            }}
                            disabled={pausing}
                            className="flex-1"
                          >
                            İptal
                          </Button>
                          <Button
                            size="sm"
                            onClick={handlePause}
                            disabled={pausing || !pauseReason.trim()}
                            className="flex-1 bg-orange-600 hover:bg-orange-700"
                          >
                            {pausing ? 'Durduruluyor...' : 'Durdur'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tamamla Butonu */}
                  <Button
                    onClick={handleComplete}
                    className="w-full gap-2"
                    variant="default"
                    disabled={actionLoading}
                  >
                    <CheckCheck className="w-4 h-4" />
                    Görevi Tamamla
                  </Button>
                </>
              )}

              {/* Tamamlanan */}
              {task.status === 'completed' && (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Görev tamamlandı</p>
                </div>
              )}
            </div>
      </div>
    </div>
  )
}
