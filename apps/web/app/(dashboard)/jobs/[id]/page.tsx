'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { jobsAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, User, Building2, ArrowLeft, Play, CheckCircle, Clock, AlertCircle,Pause, XCircle, Edit  } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { getStatusLabel, getStatusColor, getPriorityLabel, getPriorityColor, formatDate } from '@/lib/utils/formatters'

import { FileUpload } from '@/components/features/files/FileUpload'
import { FileList } from '@/components/features/files/FileList'
import { filesAPI } from '@/lib/api/client'



export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()

  const [actionLoading, setActionLoading] = useState(false)
  const [showHoldDialog, setShowHoldDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [actionReason, setActionReason] = useState('')
  const [jobFiles, setJobFiles] = useState<any>({ job_files: [], process_files: [] })
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [revisions, setRevisions] = useState<any[]>([]) 
  const [showRevisionForm, setShowRevisionForm] = useState(false) 
  const [revisionForm, setRevisionForm] = useState({ 
  description: '',
})

  useEffect(() => {
    if (params.id) {
      loadJob()
    }
  }, [params.id])

async function loadJob() {
  try {
    setLoading(true)
    const [jobResponse, revisionsResponse, filesResponse] = await Promise.all([
      jobsAPI.getById(params.id as string),
      jobsAPI.getRevisions(params.id as string),
      filesAPI.getFilesByJob(params.id as string), // ← YENİ
    ])
    setJob(jobResponse.data)
    setRevisions(revisionsResponse.data || [])
    setJobFiles(filesResponse.data || { job_files: [], process_files: [] }) // ← YENİ
  } catch (error) {
    console.error('Job load error:', error)
    toast.error('İş yüklenirken hata oluştu')
  } finally {
    setLoading(false)
  }
}

async function handleCreateRevision(e: React.FormEvent) {
  e.preventDefault()
  
  if (!revisionForm.description) {
    toast.error('Revizyon açıklaması gerekli')
    return
  }

  try {
    await jobsAPI.createRevision(params.id as string, revisionForm)
    toast.success('Revizyon oluşturuldu!')
    setShowRevisionForm(false)
    setRevisionForm({ description: '' })
    loadJob()
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'Revizyon oluşturulamadı')
  }
}

  async function handleActivate() {
    if (!confirm('Bu işi aktif etmek istediğinizden emin misiniz? İlk süreç başlatılacaktır.')) {
      return
    }

    try {
      setActivating(true)
      await jobsAPI.activate(params.id as string)
      toast.success('İş aktif edildi! İlk süreç başlatılabilir.')
      loadJob() // Sayfayı yenile
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'İş aktif edilemedi')
    } finally {
      setActivating(false)
    }
  }

  async function handleHold() {
  if (!actionReason.trim()) {
    toast.error('Lütfen dondurma sebebini belirtin')
    return
  }

  try {
    setActionLoading(true)
    await jobsAPI.hold(params.id as string, actionReason)
    toast.success('İş donduruldu. İlgili kullanıcılara bildirim gönderildi.')
    setShowHoldDialog(false)
    setActionReason('')
    loadJob()
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'İş dondurulamadı')
  } finally {
    setActionLoading(false)
  }
}

async function handleResume() {
  if (!confirm('Bu işi devam ettirmek istediğinizden emin misiniz?')) {
    return
  }

  try {
    setActionLoading(true)
    await jobsAPI.resume(params.id as string)
    toast.success('İş devam ettirildi!')
    loadJob()
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'İş devam ettirilemedi')
  } finally {
    setActionLoading(false)
  }
}

async function handleCancel() {
  if (!actionReason.trim()) {
    toast.error('Lütfen iptal sebebini belirtin')
    return
  }

  try {
    setActionLoading(true)
    await jobsAPI.cancel(params.id as string, actionReason)
    toast.success('İş iptal edildi. İlgili kullanıcılara bildirim gönderildi.')
    setShowCancelDialog(false)
    setActionReason('')
    loadJob()
  } catch (error: any) {
    toast.error(error.response?.data?.error || 'İş iptal edilemedi')
  } finally {
    setActionLoading(false)
  }
}

  function getStepStatusIcon(status: string) {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />
      case 'ready':
        return <AlertCircle className="w-5 h-5 text-blue-600" />
      case 'in_progress':
        return <Play className="w-5 h-5 text-yellow-600" />
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  function getStepStatusColor(status: string) {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700'
      case 'ready':
        return 'bg-blue-100 text-blue-700'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700'
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'blocked':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  function getStepStatusLabel(status: string) {
    const labels: Record<string, string> = {
      pending: 'Beklemede',
      ready: 'Hazır',
      in_progress: 'Devam Ediyor',
      completed: 'Tamamlandı',
      blocked: 'Engellendi',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">İş bulunamadı</p>
        <Link href="/jobs">
          <Button className="mt-4">İşlere Dön</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/jobs">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          İşlere Dön
        </Button>
      </Link>


    {/* Header */}
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
          <Badge className={getStatusColor(job.status)}>
            {getStatusLabel(job.status)}
          </Badge>
          <Badge variant="outline" className={getPriorityColor(job.priority)}>
            {getPriorityLabel(job.priority)}
          </Badge>
        </div>
        <p className="text-gray-600">
          {job.job_number} • Rev.{job.revision_no}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {/* Draft - Aktif Et Butonu */}
        {job.status === 'draft' && (
          <Button 
            onClick={handleActivate}
            disabled={activating || actionLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {activating ? 'Aktif Ediliyor...' : 'İşi Aktif Et'}
          </Button>
        )}

        {/* Active/In Progress - Dondur ve İptal */}
        {(job.status === 'active' || job.status === 'in_progress') && (
          <>
            <Button
              variant="outline"
              onClick={() => setShowHoldDialog(true)}
              disabled={actionLoading}
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <Pause className="w-4 h-4 mr-2" />
              Dondur
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(true)}
              disabled={actionLoading}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <XCircle className="w-4 h-4 mr-2" />
              İptal Et
            </Button>
          </>
        )}

        {/* On Hold - Devam Ettir */}
        {job.status === 'on_hold' && (
          <Button
            onClick={handleResume}
            disabled={actionLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {actionLoading ? 'Devam Ettiriliyor...' : 'Devam Ettir'}
          </Button>
        )}

        {/* Düzenle Butonu (Draft, Active, On Hold için) */}
        {(job.status === 'draft' || job.status === 'active' || job.status === 'on_hold') && (
          <Link href={`/jobs/${job.id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Düzenle
            </Button>
          </Link>
        )}
      </div>
    </div>

      {/* Draft Warning */}
      {job.status === 'draft' && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-900 mb-1">Taslak Durumda</h3>
                <p className="text-sm text-yellow-700">
                  Bu iş henüz taslak durumunda. İşi aktif ettiğinizde ilk süreç başlatılabilir hale gelecektir.
                  {(!job.steps || job.steps.length === 0) && (
                    <span className="block mt-1 font-medium">
                      ⚠️ Bu işe henüz süreç eklenmemiş!
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* On Hold Warning */}
      {job.status === 'on_hold' && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Pause className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-orange-900 mb-1">İş Donduruldu</h3>
                <p className="text-sm text-orange-700">
                  Bu iş dondurulmuş durumda. Tüm süreçler beklemede. Devam ettirmek için yukarıdaki butona tıklayın.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Canceled Warning */}
      {job.status === 'canceled' && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900 mb-1">İş İptal Edildi</h3>
                <p className="text-sm text-red-700">
                  Bu iş iptal edilmiştir. Tüm süreçler durduruldu.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Info */}
      {job.status === 'completed' && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-green-900 mb-1">İş Tamamlandı</h3>
                <p className="text-sm text-green-700">
                  Bu iş başarıyla tamamlanmıştır. Tüm süreçler bitmiştir.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Müşteri</p>
                <p className="font-medium">{job.customer?.name || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Teslim Tarihi</p>
                <p className="font-medium">
                  {job.due_date ? formatDate(job.due_date) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Oluşturan</p>
                <p className="font-medium">{job.created_by?.name || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {job.description && (
        <Card>
          <CardHeader>
            <CardTitle>Açıklama</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
          </CardContent>
        </Card>
      )}
      {/* Dosyalar */}
      <Card>
        <CardHeader>
          <CardTitle>Dosyalar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* İş Dosyaları */}
            <div>
              <h3 className="font-medium mb-3">İş Dosyaları</h3>
              <div className="space-y-4">
                <FileUpload
                  refType="job"
                  refId={job.id}
                  onUploadComplete={loadJob}
                />
                <FileList
                  files={jobFiles.job_files || []}
                  onDelete={loadJob}
                />
              </div>
            </div>

            {/* Süreç Dosyaları */}
            {job.steps && job.steps.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Süreç Dosyaları</h3>
                <div className="space-y-4">
                  {job.steps.map((step: any) => {
                    const processFiles = jobFiles.process_files?.find(
                      (pf: any) => pf.process_id === step.process_id
                    )

                    return (
                      <div key={step.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {step.process?.name}
                            </h4>
                            <code className="text-xs text-gray-500">
                              {step.process?.code}
                            </code>
                          </div>
                          {processFiles && (
                            <span className="text-sm text-gray-600">
                              {processFiles.files.length} dosya
                            </span>
                          )}
                        </div>

                        <div className="space-y-4">
                          <FileUpload
                            refType="job_step"
                            refId={step.id}
                            onUploadComplete={loadJob}
                            maxFiles={5}
                          />
                          {processFiles && (
                            <FileList
                              files={processFiles.files}
                              onDelete={loadJob}
                              showFolder={false}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Revizyon Geçmişi */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Revizyon Geçmişi (Rev.{job.revision_no})</CardTitle>
            {job.status !== 'completed' && job.status !== 'canceled' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRevisionForm(!showRevisionForm)}
              >
                {showRevisionForm ? 'İptal' : '+ Yeni Revizyon'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Revizyon Formu */}
          {showRevisionForm && (
            <form onSubmit={handleCreateRevision} className="mb-6 p-4 border rounded-lg bg-blue-50">
              <h3 className="font-medium mb-3">Yeni Revizyon Oluştur</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="revision_description">Revizyon Açıklaması *</Label>
                  <Textarea
                    id="revision_description"
                    value={revisionForm.description}
                    onChange={(e) => setRevisionForm({ description: e.target.value })}
                    placeholder="Örn: Makine değişti (HP → Epson), Totem boyu 6m → 8m"
                    rows={3}
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Yapılan değişiklikleri açıklayın
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm">
                    Revizyon Oluştur
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowRevisionForm(false)
                      setRevisionForm({ description: '' })
                    }}
                  >
                    İptal
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Revizyon Listesi */}
          {revisions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Henüz revizyon oluşturulmamış
            </p>
          ) : (
            <div className="space-y-4">
              {revisions.map((revision, index) => (
                <div
                  key={revision.id}
                  className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-semibold flex-shrink-0">
                    {revisions.length - index}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900">
                        Rev.{revision.changes?.revision_no?.new || 'N/A'}
                      </h4>
                      <span className="text-sm text-gray-500">
                        {new Date(revision.created_at).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {revision.user_name && (
                      <p className="text-sm text-gray-600 mb-2">
                        👤 {revision.user_name}
                      </p>
                    )}
                    {revision.changes?.description && (
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        {revision.changes.description}
                      </p>
                    )}
                    {revision.changes?.changes && Object.keys(revision.changes.changes).length > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        <strong>Değişiklikler:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {Object.entries(revision.changes.changes).map(([key, value]: [string, any]) => (
                            <li key={key}>
                              {key}: {value.old ? `${value.old} → ` : ''}{value.new}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      

      {/* Steps Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Süreç Adımları ({job.steps?.length || 0})</CardTitle>
            {job.status === 'draft' && job.steps?.length > 0 && (
              <Badge variant="outline" className="text-orange-600">
                Aktif edilmemiş
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!job.steps || job.steps.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-gray-500 mb-4">Bu işe henüz süreç eklenmemiş</p>
              <p className="text-sm text-gray-400">
                İşi düzenleyerek süreç ekleyebilirsiniz
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Vertical Line */}
              <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-gray-200" />

              {/* Steps */}
              <div className="space-y-6">
                {job.steps.map((step: any, index: number) => (
                  <div key={step.id} className="relative flex gap-4">
                    {/* Circle with Icon */}
                    <div className="relative z-10">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                        step.status === 'completed' ? 'bg-green-100 border-green-500' :
                        step.status === 'in_progress' ? 'bg-yellow-100 border-yellow-500' :
                        step.status === 'ready' ? 'bg-blue-100 border-blue-500' :
                        'bg-gray-100 border-gray-300'
                      }`}>
                        {getStepStatusIcon(step.status)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <div className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">
                                {index + 1}. {step.process?.name}
                              </h4>
                              <Badge className={getStepStatusColor(step.status)}>
                                {getStepStatusLabel(step.status)}
                              </Badge>
                              {step.is_parallel && (
                                <Badge variant="outline" className="text-xs">
                                  Paralel
                                </Badge>
                              )}
                            </div>
                            <code className="text-xs text-gray-500">{step.process?.code}</code>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid gap-2 text-sm">
                          {step.assigned_to_profile && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <User className="w-4 h-4" />
                              <span>{step.assigned_to_profile.full_name}</span>
                            </div>
                          )}

                          {step.machine && (
                            <div className="flex items-center gap-2 text-gray-600">
                              🖨️ {step.machine.name}
                            </div>
                          )}

                          {step.estimated_duration && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock className="w-4 h-4" />
                              <span>Tahmini: {step.estimated_duration} dakika</span>
                            </div>
                          )}

                          {step.started_at && (
                            <div className="text-xs text-gray-500 mt-2">
                              Başlangıç: {new Date(step.started_at).toLocaleString('tr-TR')}
                            </div>
                          )}

                          {step.completed_at && (
                            <div className="text-xs text-gray-500">
                              Bitiş: {new Date(step.completed_at).toLocaleString('tr-TR')}
                            </div>
                          )}

                          {step.production_notes && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                              <strong>Not:</strong> {step.production_notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        
      </Card>

      {/* Hold Dialog */}
      {showHoldDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pause className="w-5 h-5 text-orange-600" />
                İşi Dondur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Bu işi dondurmak istediğinizden emin misiniz? Tüm aktif süreçler bekletilecek ve ilgili kullanıcılara bildirim gönderilecektir.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="hold_reason">Dondurma Sebebi *</Label>
                <Textarea
                  id="hold_reason"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Örn: Malzeme bekleniyor, müşteri talebi, vb."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleHold}
                  disabled={actionLoading || !actionReason.trim()}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {actionLoading ? 'Donduruluyor...' : 'Dondur'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowHoldDialog(false)
                    setActionReason('')
                  }}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  İptal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancel Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                İşi İptal Et
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  ⚠️ Dikkat: Bu işlem geri alınamaz!
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Tüm tamamlanmamış süreçler iptal edilecek ve ilgili kullanıcılara bildirim gönderilecektir.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cancel_reason">İptal Sebebi *</Label>
                <Textarea
                  id="cancel_reason"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Örn: Müşteri talebi, bütçe aşımı, vb."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCancel}
                  disabled={actionLoading || !actionReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {actionLoading ? 'İptal Ediliyor...' : 'İptal Et'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCancelDialog(false)
                    setActionReason('')
                  }}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  Vazgeç
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


    </div>
  )
}