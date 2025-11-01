'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  User,
  Calendar,
  Clock,
  Settings,
  FileText,
  MessageSquare,
  CheckCircle2,
  Play,
  Pause,
  AlertCircle,
  Package,
  Edit as EditIcon,
  Save,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/formatters'
import { toast } from 'sonner'
import { FileUpload } from '@/components/features/files/FileUpload'
import { JobFilesRow } from '@/components/features/jobs/JobFilesRow'
import { filesAPI } from '@/lib/api/client'
import { cn } from '@/lib/utils/cn'

interface JobStep {
  id: string
  order_index?: number
  status: string
  process?: {
    id: string
    name: string
    code?: string
    description?: string
  }
  assigned_to?: {
    id: string
    full_name?: string
    name?: string
  }
  machine?: {
    id: string
    name: string
  }
  requirements?: string
  production_notes?: string
  due_date?: string
  due_time?: string
  started_at?: string
  completed_at?: string
  estimated_duration?: number
  actual_duration?: number
  production_quantity?: number
  production_unit?: string
  required_quantity?: number
  has_production?: boolean
  notes?: Array<{
    id: string
    note_text?: string
    note?: string
    created_at?: string
    author_name?: string
    user_id?: string | number
    user?: {
      id?: string | number
      full_name?: string
    }
  }>
}

interface ProcessDetailPanelProps {
  step: JobStep | null
  files?: any
  canUploadFiles?: boolean
  canDeleteFiles?: boolean
  users?: any[]
  machines?: any[]
  onStartStep?: (stepId: string) => void
  onCompleteStep?: (stepId: string) => void
  onPauseStep?: (stepId: string, reason: string) => void
  onResumeStep?: (stepId: string) => void
  onAddNote?: (stepId: string, note: string) => void
  onSave?: (stepId: string, data: any) => void
  onFileUploadComplete?: () => void
  actionLoading?: boolean
  currentUser?: any
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'ready':
      return 'bg-blue-50 text-blue-600 border-blue-100'
    case 'blocked':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'canceled':
      return 'bg-red-100 text-red-700 border-red-200'
    case 'pending':
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Bekliyor',
    ready: 'Hazır',
    in_progress: 'Devam Ediyor',
    completed: 'Tamamlandı',
    blocked: 'Durduruldu',
    canceled: 'İptal',
  }
  return labels[status] || status
}

function formatDuration(minutes?: number | null): string {
  if (!minutes) return '-'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  if (days > 0) {
    return `${days} gün ${remainingHours} saat`
  }
  if (hours > 0) {
    return `${hours} saat ${mins} dk`
  }
  return `${mins} dk`
}

export function ProcessDetailPanel({
  step,
  files,
  canUploadFiles = false,
  canDeleteFiles = false,
  users = [],
  machines = [],
  onStartStep,
  onCompleteStep,
  onPauseStep,
  onResumeStep,
  onAddNote,
  onSave,
  onFileUploadComplete,
  actionLoading = false,
  currentUser,
}: ProcessDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  const [showPauseForm, setShowPauseForm] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [stepFilesExpanded, setStepFilesExpanded] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    assigned_to: '',
    machine_id: '',
    due_date: '',
    due_time: '',
    estimated_duration_days: 0,
    estimated_duration_hours: 0,
  })

  const filesList = Array.isArray(files?.files) ? files.files : []
  const DEFAULT_STEP_VISIBLE_FILES = 8
  const hasMoreStepFiles = filesList.length > DEFAULT_STEP_VISIBLE_FILES
  const remainingStepFiles = Math.max(0, filesList.length - DEFAULT_STEP_VISIBLE_FILES)

  useEffect(() => {
    if (filesList.length <= DEFAULT_STEP_VISIBLE_FILES && stepFilesExpanded) {
      setStepFilesExpanded(false)
    }
  }, [filesList.length, stepFilesExpanded])

  // Initialize form when step changes
  useEffect(() => {
    if (step) {
      const durationMinutes = step.estimated_duration || 0
      const days = Math.floor(durationMinutes / (24 * 60))
      const hours = Math.floor((durationMinutes % (24 * 60)) / 60)

      setFormData({
        assigned_to: step.assigned_to?.id || '',
        machine_id: step.machine?.id || '',
        due_date: step.due_date ? step.due_date.split('T')[0] : '',
        due_time: step.due_time || '',
        estimated_duration_days: days,
        estimated_duration_hours: hours,
      })
    }
  }, [
    step?.id,
    step?.assigned_to?.id,
    step?.machine?.id,
    step?.due_date,
    step?.due_time,
    step?.estimated_duration,
  ])

  if (!step) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Detayları görmek için bir süreç seçin</p>
        </div>
      </div>
    )
  }

  const processName = step.process?.name || 'Süreç'
  const processDescription = step.process?.description
  const assignedName = step.assigned_to?.full_name || step.assigned_to?.name || 'Atanmamış'
  const machineName = step.machine?.name || 'Belirlenmedi'
  const requirements = step.requirements || ''
  const noteList = step.notes || []
  const currentUserId = currentUser?.id ? String(currentUser.id) : null
  const dueDateDisplay = step.due_date ? formatDate(step.due_date) : '-'
  const dueTimeDisplay = step.due_time?.trim() ? step.due_time : ''
  const terminDisplay =
    dueDateDisplay === '-' && !dueTimeDisplay
      ? '-'
      : `${dueDateDisplay}${dueTimeDisplay ? ` ${dueTimeDisplay}` : ''}`

  const canStart = ['ready', 'pending'].includes(step.status) && onStartStep
  const canPause = ['ready', 'in_progress'].includes(step.status) && onPauseStep
  const canResume = step.status === 'blocked' && onResumeStep
  const canComplete = step.status === 'in_progress' && onCompleteStep
  const canEdit = !['completed', 'canceled'].includes(step.status)

  const handleSave = async () => {
    if (!onSave) return

    try {
      setSubmitting(true)
      const totalMinutes = (formData.estimated_duration_days * 24 * 60) + (formData.estimated_duration_hours * 60)

      await onSave(step.id, {
        assigned_to: formData.assigned_to || null,
        machine_id: formData.machine_id || null,
        due_date: formData.due_date || null,
        due_time: formData.due_time || null,
        estimated_duration: totalMinutes,
      })

      toast.success('Süreç güncellendi')
      setIsEditing(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Süreç güncellenemedi')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePauseSubmit = async () => {
    const reason = pauseReason.trim()
    if (!reason) {
      toast.error('Lütfen bir durdurma sebebi girin')
      return
    }
    if (!onPauseStep) return

    try {
      setSubmitting(true)
      await onPauseStep(step.id, reason)
      toast.success('Süreç durduruldu')
      setPauseReason('')
      setShowPauseForm(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Süreç durdurulamadı')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStepFileDelete = async (fileId: string) => {
    if (!canDeleteFiles) return
    if (deletingFileId) return

    const confirmDelete = window.confirm('Bu dosyayı silmek istediğinizden emin misiniz?')
    if (!confirmDelete) return

    try {
      setDeletingFileId(fileId)
      await filesAPI.delete(fileId)
      toast.success('Dosya silindi')
      onFileUploadComplete?.()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Dosya silinemedi')
    } finally {
      setDeletingFileId(null)
    }
  }

  const handleNoteSubmit = async () => {
    const note = noteText.trim()
    if (!note) {
      toast.error('Not içeriği boş olamaz')
      return
    }
    if (!onAddNote) return

    try {
      setSubmitting(true)
      await onAddNote(step.id, note)
      toast.success('Not eklendi')
      setNoteText('')
      setShowNoteForm(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Not eklenemedi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <ScrollArea className="flex-1">
        <div className="px-6 py-4 space-y-6">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {(step.order_index ?? 0) + 1}
                  </span>
                  <h2 className="text-lg font-semibold text-gray-900">{processName}</h2>
                  <Badge variant="outline" className={getStatusColor(step.status)}>
                    {getStatusLabel(step.status)}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!isEditing && canEdit && onSave && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <EditIcon className="w-4 h-4 mr-2" />
                    Düzenle
                  </Button>
                )}
                {isEditing && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false)
                        const durationMinutes = step.estimated_duration || 0
                        const days = Math.floor(durationMinutes / (24 * 60))
                        const hours = Math.floor((durationMinutes % (24 * 60)) / 60)
                        setFormData({
                          assigned_to: step.assigned_to?.id || '',
                          machine_id: step.machine?.id || '',
                          due_date: step.due_date ? step.due_date.split('T')[0] : '',
                          due_time: step.due_time || '',
                          estimated_duration_days: days,
                          estimated_duration_hours: hours,
                        })
                      }}
                      disabled={submitting}
                    >
                      <X className="w-4 h-4 mr-2" />
                      İptal
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={submitting}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {submitting ? 'Kaydediliyor...' : 'Kaydet'}
                    </Button>
                  </>
                )}
                {!isEditing && canStart && (
                  <Button onClick={() => onStartStep(step.id)} disabled={actionLoading}>
                    <Play className="w-4 h-4 mr-2" />
                    {actionLoading ? 'Başlatılıyor...' : 'Başlat'}
                  </Button>
                )}
                {!isEditing && canPause && (
                  <Button
                    variant="outline"
                    onClick={() => setShowPauseForm(!showPauseForm)}
                    disabled={actionLoading}
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Durdur
                  </Button>
                )}
                {!isEditing && canResume && (
                  <Button onClick={() => onResumeStep && onResumeStep(step.id)} disabled={actionLoading}>
                    <Play className="w-4 h-4 mr-2" />
                    {actionLoading ? 'Devam Ettiriliyor...' : 'Devam Ettir'}
                  </Button>
                )}
                {!isEditing && canComplete && (
                  <Button
                    onClick={() => onCompleteStep(step.id)}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {actionLoading ? 'Tamamlanıyor...' : 'Tamamla'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Process Description */}
          {processDescription && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FileText className="w-4 h-4" />
                  Süreç Açıklaması
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {processDescription}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Editable Details */}
          <Card>
            <CardHeader className="pb-3">
              <div className="text-sm font-medium text-gray-700">Detaylar</div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">Sorumlu</Label>
                    {isEditing ? (
                      <select
                        value={formData.assigned_to}
                        onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">Seçilmedi</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name || user.username}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{assignedName}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">Makine</Label>
                    {isEditing ? (
                      <select
                        value={formData.machine_id}
                        onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="">Seçilmedi</option>
                        {machines.map((machine) => (
                          <option key={machine.id} value={machine.id}>
                            {machine.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{machineName}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">Termin Tarihi & Saati</Label>
                    {isEditing ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          type="date"
                          value={formData.due_date}
                          onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        />
                        <Input
                          type="time"
                          value={formData.due_time}
                          onChange={(e) => setFormData({ ...formData, due_time: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{terminDisplay}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">Tahmini Üretim Süresi</Label>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          value={formData.estimated_duration_days}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              estimated_duration_days: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-20"
                        />
                        <span className="text-xs text-gray-500">gün</span>
                        <Input
                          type="number"
                          min={0}
                          max={23}
                          value={formData.estimated_duration_hours}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              estimated_duration_hours: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-20"
                        />
                        <span className="text-xs text-gray-500">saat</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{formatDuration(step.estimated_duration)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">Başlangıç Tarihi</Label>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{step.started_at ? formatDate(step.started_at) : '-'}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1">Bitiş Tarihi</Label>
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{step.completed_at ? formatDate(step.completed_at) : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Production Info */}
          {step.has_production && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <Package className="w-4 h-4" />
                  Üretim Bilgisi
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Gereksinim:</span>
                  <span className="font-medium text-gray-900">
                    {step.required_quantity || '-'} {step.production_unit || ''}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Üretilen:</span>
                  <span className="font-medium text-gray-900">
                    {step.production_quantity || 0} {step.production_unit || ''}
                  </span>
                </div>
                {step.production_notes && (
                  <div className="pt-2 border-t">
                    <span className="text-xs text-gray-500">Notlar:</span>
                    <p className="text-sm text-gray-700 mt-1">{step.production_notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Requirements */}
          {requirements && (
            <Card>
              <CardHeader className="pb-3">
                <div className="text-sm font-medium text-gray-700">İş Gereksinimleri</div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{requirements}</p>
              </CardContent>
            </Card>
          )}

          {/* Pause Form */}
          {showPauseForm && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <div className="text-sm font-medium text-orange-900">Süreci Durdur</div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="Durdurma sebebini girin..."
                  className="bg-white"
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handlePauseSubmit}
                    disabled={submitting || !pauseReason.trim()}
                    size="sm"
                  >
                    {submitting ? 'Durduruluyor...' : 'Durdur'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPauseForm(false)
                      setPauseReason('')
                    }}
                    size="sm"
                  >
                    İptal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Files */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FileText className="w-4 h-4" />
                  Dosyalar ({filesList.length})
                </div>
                {hasMoreStepFiles && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-600 hover:text-gray-900"
                    onClick={() => setStepFilesExpanded((prev) => !prev)}
                  >
                    {stepFilesExpanded ? (
                      <>
                        <ChevronUp className="mr-1 h-4 w-4" />
                        Daralt
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-1 h-4 w-4" />
                        Tümünü Gör ({remainingStepFiles} daha)
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <FileUpload
                refType="job_step"
                refId={step.id}
                onUploadComplete={onFileUploadComplete}
                maxFiles={10}
                variant="compact"
                hasFiles={filesList.length > 0}
              >
                {filesList.length > 0 ? (
                  <JobFilesRow
                    files={filesList}
                    onDelete={canDeleteFiles ? handleStepFileDelete : undefined}
                    maxVisible={DEFAULT_STEP_VISIBLE_FILES}
                    showActions={true}
                    expanded={stepFilesExpanded}
                    onExpandedChange={setStepFilesExpanded}
                    showToggle={false}
                    deletingId={deletingFileId}
                  />
                ) : (
                  <p className="text-sm text-gray-500">Henüz dosya eklenmemiş</p>
                )}
              </FileUpload>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <MessageSquare className="w-4 h-4" />
                  Notlar ({noteList.length})
                </div>
                {onAddNote && !showNoteForm && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNoteForm(true)}
                  >
                    Not Ekle
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {showNoteForm && (
                <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Notunuzu girin..."
                    rows={3}
                    className="bg-white"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleNoteSubmit}
                      disabled={submitting || !noteText.trim()}
                      size="sm"
                    >
                      {submitting ? 'Ekleniyor...' : 'Ekle'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNoteForm(false)
                        setNoteText('')
                      }}
                      size="sm"
                    >
                      İptal
                    </Button>
                  </div>
                </div>
              )}

              {noteList.length > 0 ? (
                <div className="space-y-2">
                  {noteList.map((note) => {
                    const authorName = note.user?.full_name || note.author_name || 'Kullanıcı'
                    const content = note.note_text || note.note || ''
                    const noteAuthorId = note.user?.id
                      ? String(note.user.id)
                      : note.user_id
                        ? String(note.user_id)
                        : null
                    const isMine = currentUserId && noteAuthorId
                      ? currentUserId === noteAuthorId
                      : false
                    const timestamp = note.created_at
                      ? new Date(note.created_at).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : null

                    return (
                      <div
                        key={note.id}
                        className={cn('flex w-full', isMine ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={cn(
                            'max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm',
                            isMine ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900',
                          )}
                        >
                          <div
                            className={cn(
                              'mb-1 flex flex-wrap items-center gap-2 text-xs',
                              isMine ? 'text-white/80' : 'text-gray-500',
                            )}
                          >
                            <span>{isMine ? 'Siz' : authorName}</span>
                            {timestamp && (
                              <span>· {timestamp}</span>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap break-words">{content}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Henüz not eklenmemiş</p>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}
