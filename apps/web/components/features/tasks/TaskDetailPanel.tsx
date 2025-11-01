'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Plus, Calendar, Star, Upload, FileText, User, Cpu, Play, CheckCircle, Pause, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { filesAPI } from '@/lib/api/client'
import { toast } from 'sonner'

interface TaskStep {
  id: string
  title: string
  completed: boolean
}

interface TaskDetailPanelProps {
  task: any
  isOpen: boolean
  onClose: () => void
  onUpdate?: (taskId: string, updates: any) => void
  onStart?: (taskId: string) => void
  onComplete?: (task: any) => void
  onPause?: (taskId: string) => void
}

export function TaskDetailPanel({ task, isOpen, onClose, onUpdate, onStart, onComplete, onPause }: TaskDetailPanelProps) {
  const [steps, setSteps] = useState<TaskStep[]>([])
  const [newStepTitle, setNewStepTitle] = useState('')
  const [notes, setNotes] = useState(task?.description || '')
  const [isAddingStep, setIsAddingStep] = useState(false)
  const [files, setFiles] = useState<any[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFiles = useCallback(async () => {
    if (!task?.id) return

    try {
      setLoadingFiles(true)
      const response = await filesAPI.getFiles({
        ref_type: 'job_step',
        ref_id: task.id
      })
      const filesList = response?.data ?? response ?? []
      setFiles(Array.isArray(filesList) ? filesList : [])
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoadingFiles(false)
    }
  }, [task?.id])

  useEffect(() => {
    if (task?.id && isOpen) {
      loadFiles()
    }
  }, [task?.id, isOpen, loadFiles])

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      const response = await filesAPI.getDownloadUrl(fileId)
      const downloadUrl = response?.url || response?.download_url

      if (downloadUrl) {
        window.open(downloadUrl, '_blank')
      } else {
        console.error('Download URL not found in response:', response)
        toast.error('Dosya indirilemedi')
      }
    } catch (error) {
      console.error('Download error:', error)
      toast.error('Dosya indirme hatası')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !task?.id) return

    try {
      setUploading(true)
      toast.info('Dosya yükleniyor...')

      // 1. Get upload URL
      const uploadUrlResponse = await filesAPI.getUploadUrl({
        ref_type: 'job_step',
        ref_id: task.id,
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
        size: file.size
      })

      const uploadUrl = uploadUrlResponse?.upload_url || uploadUrlResponse?.url
      const bucket = uploadUrlResponse?.bucket
      const objectKey = uploadUrlResponse?.object_key

      if (!uploadUrl || !bucket || !objectKey) {
        throw new Error('Upload URL alınamadı')
      }

      // 2. Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Dosya yüklenemedi')
      }

      // 3. Link file to task
      await filesAPI.link({
        ref_type: 'job_step',
        ref_id: task.id,
        bucket: bucket,
        object_key: objectKey,
        filename: file.name,
        size: file.size,
        content_type: file.type || 'application/octet-stream'
      })

      toast.success('Dosya başarıyla yüklendi')

      // 4. Reload files
      await loadFiles()

    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Dosya yükleme hatası')
    } finally {
      setUploading(false)
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (!isOpen || !task) return null

  const handleAddStep = () => {
    if (!newStepTitle.trim()) return

    const newStep: TaskStep = {
      id: Date.now().toString(),
      title: newStepTitle,
      completed: false,
    }

    setSteps([...steps, newStep])
    setNewStepTitle('')
    setIsAddingStep(false)
  }

  const toggleStepComplete = (stepId: string) => {
    setSteps(steps.map(step =>
      step.id === stepId ? { ...step, completed: !step.completed } : step
    ))
  }

  const deleteStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId))
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-700'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700'
      case 'low':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-[400px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <button className="rounded-full p-1.5 hover:bg-gray-100">
                <div className={cn(
                  "h-5 w-5 rounded-full border-2",
                  task.status === 'completed' ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                )} />
              </button>
              <h2 className="text-lg font-semibold text-gray-900 flex-1">
                {task.title || 'Görev Detayı'}
              </h2>
            </div>
            {task.priority && (
              <Badge className={cn('ml-7', getPriorityColor(task.priority))}>
                {task.priority}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-2">
            {task.status === 'ready' && onStart && (
              <Button
                className="flex-1"
                onClick={() => {
                  onStart(task.id)
                  onClose()
                }}
              >
                <Play className="h-4 w-4 mr-2" />
                Başlat
              </Button>
            )}

            {task.status === 'in_progress' && (
              <>
                {onComplete && (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      onComplete(task)
                      onClose()
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Tamamla
                  </Button>
                )}

                {onPause && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      onPause(task.id)
                      onClose()
                    }}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Durdur
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Steps Section */}
            <div className="space-y-2">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center gap-2 group hover:bg-gray-50 p-2 rounded-md -mx-2"
                >
                  <button
                    onClick={() => toggleStepComplete(step.id)}
                    className="rounded-full p-0.5 hover:bg-gray-200"
                  >
                    <div className={cn(
                      "h-4 w-4 rounded-full border-2",
                      step.completed ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    )} />
                  </button>
                  <span className={cn(
                    "flex-1 text-sm",
                    step.completed && 'line-through text-gray-400'
                  )}>
                    {step.title}
                  </span>
                  <button
                    onClick={() => deleteStep(step.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>
              ))}

              {isAddingStep ? (
                <div className="flex items-center gap-2 p-2">
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                  <Input
                    autoFocus
                    value={newStepTitle}
                    onChange={(e) => setNewStepTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddStep()
                      if (e.key === 'Escape') {
                        setIsAddingStep(false)
                        setNewStepTitle('')
                      }
                    }}
                    onBlur={() => {
                      if (newStepTitle.trim()) {
                        handleAddStep()
                      } else {
                        setIsAddingStep(false)
                      }
                    }}
                    placeholder="Adım başlığı"
                    className="h-8 text-sm border-0 shadow-none focus-visible:ring-0 px-0"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingStep(true)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 p-2 rounded-md w-full"
                >
                  <Plus className="h-4 w-4" />
                  Adım Ekle
                </button>
              )}
            </div>

            <div className="border-t pt-4 space-y-1">
              {/* Add to My Day */}
              <button className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-gray-50 text-sm text-gray-700">
                <Star className="h-5 w-5 text-gray-400" />
                <span>Günüme Ekle</span>
              </button>

              {/* Due Date */}
              <button className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-gray-50 text-sm text-gray-700">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div className="flex-1 text-left">
                  <div>Bitiş Tarihi Ekle</div>
                  {task.due_date && (
                    <div className="text-xs text-blue-600">
                      {new Date(task.due_date).toLocaleDateString('tr-TR', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              </button>

            </div>

            {/* Task Info - Sorumlu ve Makine */}
            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Görev Bilgileri</h3>

              {/* Sorumlu */}
              {task.assigned_to && (
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50">
                  <User className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Sorumlu</div>
                    <div className="text-sm font-medium text-gray-900">
                      {typeof task.assigned_to === 'object'
                        ? task.assigned_to?.full_name || task.assigned_to?.name
                        : task.assigned_to}
                    </div>
                  </div>
                </div>
              )}

              {/* Makine */}
              {task.machine && (
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50">
                  <Cpu className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">Makine</div>
                    <div className="text-sm font-medium text-gray-900">
                      {typeof task.machine === 'object'
                        ? task.machine?.name
                        : task.machine}
                    </div>
                  </div>
                </div>
              )}

              {/* İş ve Süreç Bilgisi */}
              {task.job && (
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">İş</div>
                    <div className="text-sm font-medium text-gray-900">
                      {task.job.job_number} - {task.job.title}
                    </div>
                    {task.process && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        Süreç: {task.process.name} ({task.process.code})
                      </div>
                    )}
                  </div>
                </div>
              )}

              {task.created_at && (
                <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
                  <span>Oluşturulma:</span>
                  <span className="font-medium text-gray-700">
                    {new Date(task.created_at).toLocaleDateString('tr-TR', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Files Section */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">
                  Dosyalar {files.length > 0 && `(${files.length})`}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  {uploading ? 'Yükleniyor...' : 'Dosya Ekle'}
                </Button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
                accept="*/*"
              />

              {loadingFiles ? (
                <div className="text-xs text-gray-500 italic">
                  Dosyalar yükleniyor...
                </div>
              ) : files.length === 0 ? (
                <div className="text-xs text-gray-500 italic">
                  Henüz dosya eklenmemiş.
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 border group"
                    >
                      <FileText className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {file.filename || 'Dosya'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {file.uploaded_by?.full_name || file.uploaded_by_name || 'Bilinmeyen'}
                          {file.created_at && ` • ${new Date(file.created_at).toLocaleDateString('tr-TR')}`}
                          {file.size && ` • ${(file.size / 1024).toFixed(1)} KB`}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100"
                        onClick={() => handleDownload(file.id, file.filename)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes Section */}
            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Notlar</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Not ekle..."
                className="w-full min-h-[100px] p-3 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {notes && (
                <div className="text-xs text-gray-500">
                  Son güncelleme: Şimdi
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
