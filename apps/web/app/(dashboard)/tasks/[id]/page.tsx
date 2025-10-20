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
import { ArrowLeft, Play, CheckCircle, Clock, AlertCircle, Cpu, Building2, Timer, TrendingUp, FileText, Plus, Pause, X, Package } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDateTime, formatDate } from '@/lib/utils/formatters'
import { handleApiError } from '@/lib/utils/error-handler'
import { ActivityTimeline } from '@/components/features/tasks/ActivityTimeline'
import { FileList } from '@/components/features/files/FileList'
import { filesAPI } from '@/lib/api/client'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [elapsedTime, setElapsedTime] = useState<string>('')
  const [files, setFiles] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])

  // Tamamlama formu
  const [productionData, setProductionData] = useState({
    production_quantity: '',
    production_unit: '',
    production_notes: '',
  })

  // Not ekleme
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)

  // Durdurma
  const [showPauseForm, setShowPauseForm] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  const [pausing, setPausing] = useState(false)

  // Üretim ekleme
  const [showProductionForm, setShowProductionForm] = useState(false)
  const [productionEntry, setProductionEntry] = useState({
    quantity: '',
    unit: 'adet'
  })

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

      // Eğer daha önce veri girildiyse form'u doldur
      if (response.data.production_quantity) {
        setProductionData({
          production_quantity: response.data.production_quantity.toString(),
          production_unit: response.data.production_unit || '',
          production_notes: response.data.production_notes || '',
        })
      }

      // Dosyaları yükle
      if (response.data.job?.id) {
        loadFiles(response.data.job.id, response.data.process?.id)
      }

      // Notları yükle
      loadNotes()
    } catch (error) {
      handleApiError(error, 'Task load')
      toast.error('Görev yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function loadFiles(jobId: string, processId?: string) {
    try {
      console.log('Loading files for job:', jobId, 'process:', processId)
      const response = await filesAPI.getFilesByJob(jobId)
      const data = response?.data || response || {}
      console.log('Files response:', data)

      // İş dosyaları ve bu sürece ait dosyaları birleştir
      const jobFiles = Array.isArray(data.job_files) ? data.job_files : []
      const processFiles = Array.isArray(data.process_files)
        ? data.process_files.find((pf: any) => pf.process_id === processId)?.files || []
        : []

      console.log('Job files:', jobFiles.length, 'Process files:', processFiles.length)
      setFiles([...jobFiles, ...processFiles])
    } catch (error) {
      console.error('Files load error:', error)
      handleApiError(error, 'Files load')
      // Dosya yükleme hatası kullanıcıya gösterilmesin, kritik değil
    }
  }

  async function loadNotes() {
    try {
      const response = await fetch(`http://localhost:5001/api/jobs/steps/${params.id}/notes`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      setNotes(data.notes || [])
    } catch (error) {
      console.error('Notes load error:', error)
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) {
      toast.error('Lütfen bir not girin')
      return
    }

    try {
      setAddingNote(true)
      await fetch(`http://localhost:5001/api/jobs/steps/${params.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ note: noteText })
      })

      toast.success('Not eklendi')
      setNoteText('')
      setShowNoteForm(false)
      await loadNotes()
    } catch (error: any) {
      toast.error('Not eklenirken hata oluştu')
    } finally {
      setAddingNote(false)
    }
  }

  async function handlePause() {
    if (!pauseReason.trim()) {
      toast.error('Lütfen bir sebep girin')
      return
    }

    try {
      setPausing(true)
      await fetch(`http://localhost:5001/api/jobs/steps/${params.id}/pause`, {
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

  async function handleStart() {
    if (!confirm('Bu görevi başlatmak istediğinizden emin misiniz?')) {
      return
    }

    try {
      setActionLoading(true)
      await tasksAPI.start(params.id as string)
      toast.success('Görev başlatıldı!')
      loadTask()
      loadNotes()
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
    <div className="max-w-7xl mx-auto space-y-6">
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
      </div>

      {/* 2 Kolonlu Layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* SOL KOLON */}
        <div className="space-y-6">
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

                <div className="grid gap-3 grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">İş Numarası</p>
                    <p className="font-mono text-sm font-medium">{task.job.job_number}</p>
                  </div>

                  {task.job.due_date && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Teslim Tarihi</p>
                      <p className="text-sm font-medium">{formatDate(task.job.due_date)}</p>
                    </div>
                  )}
                </div>

                {task.job.customer_name && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Müşteri</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium">{task.job.customer_name}</span>
                    </div>
                  </div>
                )}

                {task.job.created_by_name && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">İşi Oluşturan</p>
                    <p className="text-sm font-medium">{task.job.created_by_name}</p>
                  </div>
                )}
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

          {/* Üretim Notları Hikayesi */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Üretim Notları</CardTitle>
                {task.status === 'in_progress' && !showNoteForm && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowNoteForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Not Ekle
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Not Ekleme Formu */}
              {showNoteForm && (
                <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                  <Label className="text-sm font-medium mb-2 block">Yeni Not</Label>
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Üretim notu girin..."
                    rows={3}
                    className="mb-3"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowNoteForm(false)
                        setNoteText('')
                      }}
                      disabled={addingNote}
                    >
                      İptal
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddNote}
                      disabled={addingNote || !noteText.trim()}
                    >
                      {addingNote ? 'Ekleniyor...' : 'Kaydet'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Notlar Listesi */}
              {notes.length > 0 ? (
                <div className="space-y-3">
                  {notes.map((note: any) => (
                    <div key={note.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">{note.author_name || 'Bilinmeyen'}</p>
                        <p className="text-xs text-gray-500">{formatDateTime(note.created_at)}</p>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  Henüz not eklenmemiş.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Süreç Dosyaları */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Süreç Dosyaları
              </CardTitle>
            </CardHeader>
            <CardContent>
              {files.length > 0 ? (
                <FileList files={files} onDelete={() => loadFiles(task.job.id, task.process?.id)} />
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  Bu sürece ait dosya bulunmuyor.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SAĞ KOLON */}
        <div className="space-y-6">
          {/* Süreç Detayları */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Süreç Detayları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {task.machine && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Makine</p>
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium">{task.machine.name}</span>
                    </div>
                  </div>
                )}

                {task.estimated_duration && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tahmini Süre</p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium">{task.estimated_duration} dakika</span>
                    </div>
                  </div>
                )}

                {task.started_at && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Başlangıç</p>
                    <p className="text-sm font-medium">{formatDateTime(task.started_at)}</p>
                  </div>
                )}

                {task.completed_at && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tamamlanma</p>
                    <p className="text-sm font-medium">{formatDateTime(task.completed_at)}</p>
                  </div>
                )}

                {task.status === 'in_progress' && elapsedTime && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Geçen Süre</p>
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-yellow-600 animate-pulse" />
                      <span className="text-sm font-medium text-yellow-700">{elapsedTime}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Aksiyon Butonları */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aksiyonlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Başlat Butonu */}
              {task.status === 'ready' && (
                <Button
                  onClick={handleStart}
                  disabled={actionLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Görevi Başlat
                </Button>
              )}

              {task.status === 'in_progress' && (
                <>
                  {/* Süreci Durdur */}
                  {!showPauseForm ? (
                    <Button
                      type="button"
                      onClick={() => setShowPauseForm(true)}
                      variant="outline"
                      className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Süreci Durdur
                    </Button>
                  ) : (
                    <div className="p-4 border rounded-lg bg-orange-50 space-y-3">
                      <Label className="text-sm font-medium">Durdurma Sebebi</Label>
                      <Textarea
                        value={pauseReason}
                        onChange={(e) => setPauseReason(e.target.value)}
                        placeholder="Neden durduruluyor?"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
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
                          type="button"
                          size="sm"
                          onClick={handlePause}
                          disabled={pausing || !pauseReason.trim()}
                          className="flex-1 bg-orange-600 hover:bg-orange-700"
                        >
                          {pausing ? 'Durduruluyor...' : 'Durdur'}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* İş Hikayesi / Timeline */}
      {task.job && task.job.id && (
        <ActivityTimeline jobId={task.job.id} />
      )}
    </div>
  )
}
