'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { jobsAPI, usersAPI, processesAPI, machinesAPI, customersAPI, filesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Calendar,
  User,
  Building2,
  ArrowLeft,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Pause,
  XCircle,
  Edit,
  ChevronDown,
  Settings,
  Package,
  FileText,
  Timer,
  Save,
  X,
  Plus,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { getStatusLabel, getStatusColor, getPriorityLabel, getPriorityColor, formatDate } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { handleApiError, debugLog } from '@/lib/utils/error-handler'

import { FileUpload } from '@/components/features/files/FileUpload'
import { FileList } from '@/components/features/files/FileList'



export default function JobDetailPage() {
  const params = useParams()

  const [actionLoading, setActionLoading] = useState(false)
  const [showHoldDialog, setShowHoldDialog] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [actionReason, setActionReason] = useState('')
  const [jobFiles, setJobFiles] = useState<any>({ job_files: [], process_files: [] })
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    customer_id: '',
    due_date: '',
    priority: 'normal',
  })
  const [stepForms, setStepForms] = useState<any[]>([])
  const [newStep, setNewStep] = useState({
    process_id: '',
    assigned_to: '',
    machine_id: '',
    estimated_duration: '',
    is_parallel: false,
  })
  const [completionForms, setCompletionForms] = useState<
    Record<string, { quantity: string; unit: string; notes: string }>
  >({})
  const [stepActionLoading, setStepActionLoading] = useState<Record<string, boolean>>({})
  const [savingJob, setSavingJob] = useState(false)
  const [savingStepId, setSavingStepId] = useState<string | null>(null)
  const [addingStep, setAddingStep] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [processes, setProcesses] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [referenceLoaded, setReferenceLoaded] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (params.id) {
      loadJob()
    }
  }, [params.id])

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored))
      } catch {
        setCurrentUser(null)
      }
    }
  }, [])
  useEffect(() => {
    if (isEditing) {
      void ensureReferences()
      if (job) {
        initializeJobForm(job)
      }
      setExpandedSteps((prev) => {
        const next = { ...prev }
        job?.steps?.forEach((step: any) => {
          next[step.id] = true
        })
        return next
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing])

async function loadJob() {
  setLoading(true)
  try {
    // 1) İş (zorunlu)
    let payload: any = null
    try {
      const r = await jobsAPI.getById(params.id as string)
      payload = r?.data ?? r
      if (!payload?.id) throw new Error('job missing')
      setJob(payload)
      setCompletionForms(normalizeCompletionForms(payload.steps || []))
      if (isEditing) {
        initializeJobForm(payload)
      }
      setExpandedSteps((prev) => {
        const next: Record<string, boolean> = {}
        for (const step of payload.steps || []) {
          next[step.id] = prev[step.id] ?? false
        }
        return next
      })
    } catch (err) {
      handleApiError(err, 'Job GET failed:')
      toast.error('İş bilgisi yüklenemedi')
      setJob(null)
      return
    }

    // 2) Dosyalar (opsiyonel, ayrı try/catch)
    await Promise.all([
      (async () => {
        try {
          const fr = await filesAPI.getFilesByJob(params.id as string)
          const d = fr?.data ?? fr ?? {}
          setJobFiles({
            job_files: Array.isArray(d.job_files) ? d.job_files : [],
            process_files: Array.isArray(d.process_files) ? d.process_files : [],
          })
        } catch (e) {
          debugLog('Warning: Files GET failed:', e)
          setJobFiles({ job_files: [], process_files: [] })
        }
      })(),
    ])
  } finally {
    setLoading(false)
  }
}

function normalizeCompletionForms(steps: any[]) {
  const forms: Record<string, { quantity: string; unit: string; notes: string }> = {}
  for (const step of steps || []) {
    forms[step.id] = {
      quantity:
        step.production_quantity !== undefined && step.production_quantity !== null
          ? String(step.production_quantity)
          : '',
      unit: step.production_unit || '',
      notes: step.production_notes || '',
    }
  }
  return forms
}

function initializeJobForm(jobData: any) {
  setJobForm({
    title: jobData.title || '',
    description: jobData.description || '',
    customer_id: jobData.customer?.id || '',
    due_date: jobData.due_date ? jobData.due_date.split('T')[0] : '',
    priority: jobData.priority || 'normal',
  })
  const steps = (jobData.steps || []) as any[]
  setStepForms(
    steps.map((step: any) => ({
      id: step.id,
      process_id: step.process?.id || '',
      assigned_to: step.assigned_to?.id || '',
      machine_id: step.machine?.id || '',
      estimated_duration:
        step.estimated_duration != null ? String(step.estimated_duration) : '',
      is_parallel: !!step.is_parallel,
      status: step.status,
      name: step.process?.name || '',
    })),
  )
  setNewStep({
    process_id: '',
    assigned_to: '',
    machine_id: '',
    estimated_duration: '',
    is_parallel: false,
  })
  setCompletionForms(normalizeCompletionForms(steps))
}

async function ensureReferences() {
  if (referenceLoaded) return
  try {
    const [usersRes, processesRes, machinesRes, customersRes] = await Promise.all([
      usersAPI.getAll(),
      processesAPI.getAll(),
      machinesAPI.getAll(),
      customersAPI.getAll(),
    ])
    setUsers(usersRes.data || usersRes || [])

    const processPayload = processesRes?.data ?? processesRes ?? {}
    const processList = [
      ...((processPayload.groups ?? []).flatMap((g: any) => g.processes ?? [])),
      ...(processPayload.ungrouped ?? []),
    ]
    setProcesses(processList)

    setMachines(machinesRes.data || machinesRes || [])
    setCustomers(customersRes.data || customersRes || [])
    setReferenceLoaded(true)
  } catch (err) {
    handleApiError(err, 'Reference load')
    toast.error('Referans veriler alınamadı')
  }
}

function toggleEditing() {
  if (!isEditing) {
    if (job) {
      initializeJobForm(job)
    }
    void ensureReferences()
    setIsEditing(true)
  } else {
    setIsEditing(false)
  }
}

function cancelEditing() {
  if (job) {
    initializeJobForm(job)
  }
  setIsEditing(false)
}

async function handleSaveJob() {
  if (!job) return
  try {
    setSavingJob(true)
    const trimmedTitle = (jobForm.title || '').trim()
    const currentTitle = job.title || ''
    const jobDesc = job.description || ''
    const currentDueDate = job.due_date ? job.due_date.split('T')[0] : ''
    const currentPriority = job.priority || 'normal'

    const changes: Record<string, any> = {}
    if (trimmedTitle !== currentTitle) {
      changes.title = trimmedTitle
    }
    if ((jobForm.description || '') !== jobDesc) {
      changes.description = jobForm.description || ''
    }
    const formDueDate = jobForm.due_date || ''
    if ((formDueDate || '') !== (currentDueDate || '')) {
      changes.due_date = formDueDate || null
    }
    if (jobForm.priority !== currentPriority) {
      changes.priority = jobForm.priority
    }

    if (job.status === 'draft') {
      const draftPayload: Record<string, any> = { ...changes }
      const currentCustomerId = job.customer?.id || ''
      if ((jobForm.customer_id || '') !== currentCustomerId) {
        draftPayload.customer_id = jobForm.customer_id || null
      }
      if (Object.keys(draftPayload).length === 0) {
        toast.info('Değişiklik yapılmadı')
        setIsEditing(false)
        return
      }
      await jobsAPI.update(job.id, draftPayload)
      toast.success('İş bilgileri güncellendi')
      await loadJob()
      setIsEditing(false)
    } else {
      if (Object.keys(changes).length === 0) {
        toast.error('Revizyon oluşturmak için en az bir alanı değiştirmelisiniz')
        return
      }
      const revisionReason = window.prompt('Revizyon açıklaması girin')
      if (!revisionReason || !revisionReason.trim()) {
        toast.error('Revizyon açıklaması gerekli')
        return
      }
      const revisionPayload: Record<string, any> = {
        revision_reason: revisionReason.trim(),
      }
      Object.assign(revisionPayload, changes)
      await jobsAPI.createRevision(job.id, revisionPayload)
      toast.success('Revizyon oluşturuldu')
      await loadJob()
      setIsEditing(false)
    }
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'İş güncellenemedi')
  } finally {
    setSavingJob(false)
  }
}

function handleStepFieldChange(stepId: string, field: string, value: any) {
  setStepForms((prev) =>
    prev.map((step) =>
      step.id === stepId
        ? {
            ...step,
            [field]: value,
          }
        : step,
    ),
  )
}

function handleCompletionFieldChange(stepId: string, field: string, value: string) {
  setCompletionForms((prev) => {
    const current = prev[stepId] || { quantity: '', unit: '', notes: '' }
    return {
      ...prev,
      [stepId]: {
        ...current,
        [field]: value,
      },
    }
  })
}

async function handleStepSave(stepId: string) {
  const form = stepForms.find((step) => step.id === stepId)
  if (!form) return

  const payload: any = {
    assigned_to: form.assigned_to || null,
    machine_id: form.machine_id || null,
    is_parallel: form.is_parallel,
    estimated_duration: form.estimated_duration
      ? Number(form.estimated_duration)
      : null,
  }

  if (form.process_id) {
    payload.process_id = form.process_id
  }

  try {
    setSavingStepId(stepId)
    await jobsAPI.updateStep(stepId, payload)
    toast.success('Süreç güncellendi')
    await loadJob()
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'Süreç güncellenemedi')
  } finally {
    setSavingStepId(null)
  }
}

async function handleAddStep(e: React.FormEvent) {
  e.preventDefault()
  if (!job) return

  if (!newStep.process_id) {
    toast.error('Önce eklenecek süreci seçin')
    return
  }

  try {
    setAddingStep(true)
    await jobsAPI.addStep(job.id, {
      process_id: newStep.process_id,
      assigned_to: newStep.assigned_to || null,
      machine_id: newStep.machine_id || null,
      is_parallel: newStep.is_parallel,
      estimated_duration: newStep.estimated_duration
        ? Number(newStep.estimated_duration)
        : null,
    })
    toast.success('Yeni süreç eklendi')
    setNewStep({
      process_id: '',
      assigned_to: '',
      machine_id: '',
      estimated_duration: '',
      is_parallel: false,
    })
    await loadJob()
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'Süreç eklenemedi')
  } finally {
    setAddingStep(false)
  }
}

function handleNewStepChange(field: string, value: any) {
  setNewStep((prev) => ({
    ...prev,
    [field]: value,
  }))
}

const processOptions = useMemo(
  () => processes.map((process: any) => ({ value: process.id, label: process.name })),
  [processes],
)

async function handleDeleteStep(stepId: string, processName?: string) {
  if (
    !confirm(
      processName
        ? `"${processName}" sürecini silmek istediğinizden emin misiniz?`
        : 'Bu süreci silmek istediğinize emin misiniz?',
    )
  ) {
    return
  }

  try {
    await jobsAPI.deleteStep(stepId)
    toast.success('Süreç silindi')
    await loadJob()
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'Süreç silinemedi')
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

function getCompletionForm(stepId: string) {
  return completionForms[stepId] || { quantity: '', unit: '', notes: '' }
}

async function handleStartStep(stepId: string) {
  try {
    setStepActionLoading((prev) => ({ ...prev, [stepId]: true }))
    await jobsAPI.startStep(stepId)
    toast.success('Süreç başlatıldı')
    await loadJob()
  } catch (error: any) {
    toast.error(error?.response?.data?.error || 'Süreç başlatılamadı')
  } finally {
    setStepActionLoading((prev) => ({ ...prev, [stepId]: false }))
  }
}

  async function handleCompleteStep(step: any) {
    const form = getCompletionForm(step.id)
    const payload: any = {}

  const quantityRaw = form.quantity?.trim()
  if (quantityRaw) {
    const normalized = quantityRaw.replace(',', '.')
    const quantityValue = Number(normalized)
    if (Number.isNaN(quantityValue)) {
      toast.error('Üretim miktarı sayısal olmalıdır')
      return
    }
    payload.production_quantity = quantityValue
    payload.production_unit = form.unit?.trim() || step.production_unit || 'adet'
  } else if (step.production_quantity) {
    // Kullanıcı boş bıraktıysa mevcut miktarı sıfırla
    payload.production_quantity = null
    payload.production_unit = null
  }

  if (form.unit && !payload.production_unit && form.unit.trim()) {
    payload.production_unit = form.unit.trim()
  }

  payload.production_notes = form.notes?.trim() || null

  try {
    setStepActionLoading((prev) => ({ ...prev, [step.id]: true }))
    await jobsAPI.completeStep(step.id, payload)
    toast.success('Süreç tamamlandı')
    await loadJob()
  } catch (error: any) {
    toast.error(error?.response?.data?.error || 'Süreç tamamlanamadı')
  } finally {
    setStepActionLoading((prev) => ({ ...prev, [step.id]: false }))
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

  async function handlePauseStep(stepId: string, reason: string) {
    setStepActionLoading((prev) => ({ ...prev, [stepId]: true }))
    try {
      await jobsAPI.pauseStep(stepId, { reason })
      await loadJob()
    } catch (error) {
      throw error
    } finally {
      setStepActionLoading((prev) => ({ ...prev, [stepId]: false }))
    }
  }

  async function handleResumeStep(stepId: string) {
    setStepActionLoading((prev) => ({ ...prev, [stepId]: true }))
    try {
      await jobsAPI.resumeStep(stepId)
      await loadJob()
    } catch (error) {
      throw error
    } finally {
      setStepActionLoading((prev) => ({ ...prev, [stepId]: false }))
    }
  }

  async function handleAddStepNote(stepId: string, note: string) {
    try {
      await jobsAPI.addStepNote(stepId, { note })
      await loadJob()
    } catch (error) {
      throw error
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

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700'
      case 'ready':
        return 'bg-blue-100 text-blue-700'
      case 'blocked':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const ProcessStepCard = ({
    step,
    files,
    isEditingMode,
    editForm,
    onFieldChange,
    onSave,
    disabled,
    onDelete,
    canDelete,
    users,
    machines,
    processOptions,
    completionForm,
    onCompletionChange,
    onStartStep,
    onCompleteStep,
    actionLoading,
    canUploadFiles,
    canDeleteFiles,
    onPauseStep,
    onResumeStep,
    notes,
    onAddNote,
    isOpen,
    onToggle,
  }: {
    step: any
    files?: { files?: any[] }
    isEditingMode: boolean
    editForm?: any
    onFieldChange?: (stepId: string, field: string, value: any) => void
    onSave?: (stepId: string) => void
    disabled?: boolean
    onDelete?: (stepId: string, processName?: string) => void
    canDelete?: boolean
    users: any[]
    machines: any[]
    processOptions: { value: string; label: string }[]
    completionForm?: { quantity: string; unit: string; notes: string }
    onCompletionChange?: (stepId: string, field: string, value: string) => void
    onStartStep?: (stepId: string) => void
    onCompleteStep?: (step: any) => void
    actionLoading?: boolean
    canUploadFiles: boolean
    canDeleteFiles: boolean
    onPauseStep?: (stepId: string, reason: string) => Promise<void> | void
    onResumeStep?: (stepId: string) => Promise<void> | void
    notes?: any[]
    onAddNote?: (stepId: string, note: string) => Promise<void> | void
    isOpen: boolean
    onToggle: () => void
  }) => {
    const [showPauseForm, setShowPauseForm] = useState(false)
    const [pauseReason, setPauseReason] = useState('')
    const [pauseSubmitting, setPauseSubmitting] = useState(false)
    const [noteText, setNoteText] = useState('')
    const [noteSubmitting, setNoteSubmitting] = useState(false)

    useEffect(() => {
      setShowPauseForm(false)
      setPauseReason('')
      setPauseSubmitting(false)
    }, [step.status])

    const processName = step.process?.name || 'Süreç'
    const processCode = step.process?.code || ''
    const assignedUser = step.assigned_to
    const assignedName =
      assignedUser?.full_name || assignedUser?.name || 'Atanmamış'
    const assignedAvatarUrl =
      assignedUser?.avatarDownloadUrl ||
      assignedUser?.avatar_url ||
      assignedUser?.avatarUrl ||
      null
    const assignedInitials =
      assignedName && assignedName !== 'Atanmamış'
        ? assignedName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? '')
            .join('') || '?'
        : '?'
    const machineName = step.machine?.name || 'Belirlenmedi'
    const formatDateTime = (value?: string | null) =>
      value ? new Date(value).toLocaleString('tr-TR') : '-'
    const estimatedDuration = step.estimated_duration
      ? `${step.estimated_duration} dk`
      : '-'
    const actualDuration = step.actual_duration
      ? `${step.actual_duration} dk`
      : '-'
    const productionValue =
      step.production_quantity != null && step.production_quantity !== ''
        ? `${step.production_quantity} ${step.production_unit || ''}`.trim()
        : '-'
    const legacyProductionNote = step.production_notes || ''
    const filesList = Array.isArray(files?.files) ? files.files : []
    const completion = completionForm || { quantity: '', unit: '', notes: '' }
    const noteList = Array.isArray(notes)
      ? notes
      : Array.isArray(step.notes)
        ? step.notes
        : []

    const canStart = onStartStep && ['ready', 'pending'].includes(step.status)
    const handleFieldChange = (field: string, value: any) => {
      if (onFieldChange) {
        onFieldChange(step.id, field, value)
      }
    }

    const handleCompletionField = (field: string, value: string) => {
      if (onCompletionChange) {
        onCompletionChange(step.id, field, value)
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
        setPauseSubmitting(true)
        await onPauseStep(step.id, reason)
        toast.success('Süreç durduruldu')
        setPauseReason('')
        setShowPauseForm(false)
      } catch (error: any) {
        const message = error?.response?.data?.error || 'Süreç durdurulamadı'
        toast.error(message)
      } finally {
        setPauseSubmitting(false)
      }
    }

    const handleResume = async () => {
      if (!onResumeStep) return
      try {
        setPauseSubmitting(true)
        await onResumeStep(step.id)
        toast.success('Süreç devam ettirildi')
        setShowPauseForm(false)
        setPauseReason('')
      } catch (error: any) {
        const message = error?.response?.data?.error || 'Süreç devam ettirilemedi'
        toast.error(message)
      } finally {
        setPauseSubmitting(false)
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
        setNoteSubmitting(true)
        await onAddNote(step.id, note)
        toast.success('Not eklendi')
        setNoteText('')
      } catch (error: any) {
        const message = error?.response?.data?.error || 'Not eklenemedi'
        toast.error(message)
      } finally {
        setNoteSubmitting(false)
      }
    }

    return (
      <div className="rounded-lg border bg-white shadow-sm">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-xs font-semibold uppercase text-blue-600 ring-1 ring-blue-100">
              {assignedAvatarUrl ? (
                <img
                  src={assignedAvatarUrl}
                  alt={assignedName}
                  className="h-full w-full object-cover"
                />
              ) : (
                assignedInitials
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">
                  #{(step.order_index ?? 0) + 1} · {processName}
                </span>
                <Badge className={getStepStatusColor(step.status)}>
                  {getStepStatusLabel(step.status)}
                </Badge>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span>{processCode || 'Kod belirtilmedi'}</span>
                <span className="flex items-center gap-1 text-gray-600">
                  <User className="h-3 w-3" />
                  {assignedName}
                </span>
              </div>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-500 transition-transform',
              isOpen ? 'rotate-180' : '',
            )}
          />
        </button>
        {isOpen && (
          <div className="space-y-3 border-t px-4 py-3">
            {isEditingMode && editForm ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs uppercase ${getStatusBadge(
                      step.status,
                    )}`}
                  >
                    {step.status.replace('_', ' ')}
                  </span>
                  {canDelete && onDelete && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(step.id, step.process?.name)}
                      className="h-8 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Süreç</Label>
                    <select
                      value={editForm.process_id || ''}
                      onChange={(e) => handleFieldChange('process_id', e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      disabled={disabled}
                    >
                      <option value="">Süreç seçin</option>
                      {processOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sorumlu Kullanıcı</Label>
                    <select
                      value={editForm.assigned_to || ''}
                      onChange={(e) =>
                        handleFieldChange('assigned_to', e.target.value)
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      disabled={disabled}
                    >
                      <option value="">Seçilmedi</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name || user.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Makine</Label>
                    <select
                      value={editForm.machine_id || ''}
                      onChange={(e) =>
                        handleFieldChange('machine_id', e.target.value)
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      disabled={disabled}
                    >
                      <option value="">Seçilmedi</option>
                      {machines.map((machine) => (
                        <option key={machine.id} value={machine.id}>
                          {machine.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tahmini Süre (dk)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editForm.estimated_duration ?? ''}
                      onChange={(e) =>
                        handleFieldChange('estimated_duration', e.target.value)
                      }
                      disabled={disabled}
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={editForm.is_parallel ?? false}
                    onChange={(e) => handleFieldChange('is_parallel', e.target.checked)}
                    disabled={disabled}
                  />
                  Paralel çalışabilir
                </label>
                <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-gray-500">Başlama</p>
                    <p className="font-medium text-gray-900">
                      {formatDateTime(step.started_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Tamamlama</p>
                    <p className="font-medium text-gray-900">
                      {formatDateTime(step.completed_at)}
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-gray-500">Tahmini Süre</p>
                    <p className="font-medium text-gray-900">{estimatedDuration}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Gerçekleşen Süre</p>
                    <p className="font-medium text-gray-900">{actualDuration}</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onSave && onSave(step.id)}
                    disabled={disabled}
                  >
                    {disabled ? 'Kaydediliyor...' : 'Süreç Güncelle'}
                  </Button>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="text-xs uppercase text-gray-500">Üretim</p>
                  <p className="font-medium text-gray-900">{productionValue}</p>
                </div>
                {legacyProductionNote && (
                  <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Üretim Notu</p>
                        <p className="mt-1 whitespace-pre-line">{legacyProductionNote}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2.5">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Sorumlu</p>
                      <p className="text-sm font-medium text-gray-900">{assignedName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Settings className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Makine</p>
                      <p className="text-sm font-medium text-gray-900">{machineName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Timer className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Tahmini Süre</p>
                      <p className="text-sm font-medium text-gray-900">{estimatedDuration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Gerçekleşen Süre</p>
                      <p className="text-sm font-medium text-gray-900">{actualDuration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Başlama</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDateTime(step.started_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Tamamlama</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDateTime(step.completed_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Üretim</p>
                      <p className="text-sm font-medium text-gray-900">{productionValue}</p>
                    </div>
                  </div>
                </div>

                {legacyProductionNote && (
                  <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                    <div className="flex items-start gap-2">
                      <FileText className="mt-0.5 h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">Üretim Notu</p>
                        <p className="mt-1 whitespace-pre-line">{legacyProductionNote}</p>
                      </div>
                    </div>
                  </div>
                )}

                {canStart && (
                  <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                    <p className="mb-3 font-medium">
                      {step.status === 'pending'
                        ? 'Bu süreç beklemede görünüyor. Yine de başlatmak isterseniz aşağıdaki butonu kullanabilirsiniz.'
                        : 'Bu süreç hazır durumda. Başlatmak için aşağıdaki butonu kullanın.'}
                    </p>
                    <Button
                      type="button"
                      onClick={() => onStartStep(step.id)}
                      disabled={disabled || !!actionLoading}
                    >
                      {actionLoading ? 'Başlatılıyor...' : 'Süreci Başlat'}
                    </Button>
                  </div>
                )}

                {onCompleteStep && step.status === 'in_progress' && (
                  <div className="space-y-3 rounded-md bg-green-50 p-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Üretim Miktarı</Label>
                        <Input
                          value={completion.quantity}
                          onChange={(e) => handleCompletionField('quantity', e.target.value)}
                          placeholder="Örn: 120"
                          disabled={disabled || !!actionLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Birim</Label>
                        <Input
                          value={completion.unit}
                          onChange={(e) => handleCompletionField('unit', e.target.value)}
                          placeholder="adet"
                          disabled={disabled || !!actionLoading}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Üretim Notu</Label>
                      <Textarea
                        value={completion.notes}
                        onChange={(e) => handleCompletionField('notes', e.target.value)}
                        placeholder="Süreç hakkında not ekleyin"
                        rows={3}
                        disabled={disabled || !!actionLoading}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={() => onCompleteStep(step)}
                        disabled={disabled || !!actionLoading}
                      >
                        {actionLoading ? 'Tamamlanıyor...' : 'Süreci Tamamla'}
                      </Button>
                    </div>
                  </div>
                )}

                {onPauseStep && ['ready', 'in_progress'].includes(step.status) && (
                  <div className="space-y-3 rounded-md bg-orange-50 p-3 text-sm text-orange-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">
                        {step.status === 'in_progress'
                          ? 'Süreç şu anda devam ediyor. Durdurmak isterseniz sebep belirtebilirsiniz.'
                          : 'Süreç başlamadan önce durdurabilirsiniz.'}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPauseForm((prev) => !prev)}
                        disabled={pauseSubmitting || !!actionLoading}
                      >
                        {showPauseForm ? 'Vazgeç' : 'Süreci Durdur'}
                      </Button>
                    </div>
                    {showPauseForm && (
                      <div className="space-y-2">
                        <div>
                          <Label className="text-xs uppercase text-orange-700">Durdurma Sebebi</Label>
                          <Textarea
                            value={pauseReason}
                            onChange={(e) => setPauseReason(e.target.value)}
                            rows={3}
                            placeholder="Örn: Malzeme bekleniyor"
                            disabled={pauseSubmitting || !!actionLoading}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setShowPauseForm(false)
                              setPauseReason('')
                            }}
                            disabled={pauseSubmitting || !!actionLoading}
                          >
                            İptal
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handlePauseSubmit}
                            disabled={pauseSubmitting || !!actionLoading}
                          >
                            {pauseSubmitting ? 'Gönderiliyor...' : 'Durdur'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step.status === 'blocked' && (
                  <div className="space-y-3 rounded-md bg-orange-50 p-3 text-sm text-orange-800">
                    <div>
                      <p className="font-medium">Süreç durduruldu</p>
                      {step.block_reason && (
                        <p className="mt-1 whitespace-pre-wrap text-orange-700">
                          {step.block_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {step.blocked_at && (
                        <span className="text-xs text-orange-600">
                          {new Date(step.blocked_at).toLocaleString('tr-TR')}
                        </span>
                      )}
                      {onResumeStep && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleResume}
                          disabled={pauseSubmitting || !!actionLoading}
                        >
                          {pauseSubmitting ? 'Devam Ettiriliyor...' : 'Süreci Devam Ettir'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold text-gray-900">Süreç Dosyaları</h5>
                <span className="text-xs text-gray-500">{filesList.length} dosya</span>
              </div>
              <FileUpload
                refType="job_step"
                refId={step.id}
                onUploadComplete={loadJob}
                maxFiles={5}
                disabled={!canUploadFiles}
              />
              {filesList.length > 0 ? (
                <FileList
                  files={filesList}
                  onDelete={canDeleteFiles ? loadJob : undefined}
                  allowDelete={canDeleteFiles}
                  variant="grid"
                  itemWidth={116}
                />
              ) : (
                <p className="text-xs text-gray-500">Henüz dosya eklenmemiş.</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold text-gray-900">Üretim Notları</h5>
                <span className="text-xs text-gray-500">{noteList.length} kayıt</span>
              </div>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-dashed border-gray-200 bg-white p-2.5">
                {noteList.length === 0 ? (
                  <p className="text-center text-xs text-gray-500">Henüz not eklenmemiş.</p>
                ) : (
                  noteList.map((note: any) => (
                    <div key={note.id} className="rounded-md border border-gray-100 bg-gray-50 p-2">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-gray-500">
                        <span>{note.author_name || 'Bilinmeyen Kullanıcı'}</span>
                        {note.created_at && (
                          <span>
                            {new Date(note.created_at).toLocaleString('tr-TR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{note.note}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-2">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={2}
                  placeholder="Süreç hakkında not ekleyin"
                  disabled={noteSubmitting || !onAddNote}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleNoteSubmit}
                    disabled={noteSubmitting || !noteText.trim() || !onAddNote}
                  >
                    {noteSubmitting ? 'Gönderiliyor...' : 'Not Ekle'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
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
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? jobForm.title || job.title : job.title}
          </h1>
          <Badge className={getStatusColor(job.status)}>
            {getStatusLabel(job.status)}
          </Badge>
          <Badge
            variant="outline"
            className={getPriorityColor(isEditing ? jobForm.priority : job.priority)}
          >
            {getPriorityLabel(isEditing ? jobForm.priority : job.priority)}
          </Badge>
        </div>
        <p className="text-gray-600">
          {job.job_number} • Rev.{job.revision_no}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-end">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              onClick={cancelEditing}
              disabled={savingJob || savingStepId !== null || addingStep}
            >
              <X className="w-4 h-4 mr-2" />
              İptal
            </Button>
            <Button onClick={handleSaveJob} disabled={savingJob}>
              <Save className="w-4 h-4 mr-2" />
              {savingJob ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </>
        ) : (
          <>
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

            {(job.status === 'draft' || job.status === 'active' || job.status === 'on_hold') && (
              <Button variant="outline" onClick={toggleEditing}>
                <Edit className="w-4 h-4 mr-2" />
                Düzenle
              </Button>
            )}
          </>
        )}
        {job.id && (
          <Link href={`/jobs/${job.id}/revisions`}>
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Revizyon Geçmişi
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


      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Genel Bilgiler</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Başlık *</Label>
                    <Input
                      id="job_title"
                      value={jobForm.title}
                      onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                      disabled={savingJob}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job_customer">Müşteri</Label>
                    <select
                      id="job_customer"
                      value={jobForm.customer_id}
                      onChange={(e) =>
                        setJobForm({ ...jobForm, customer_id: e.target.value })
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      disabled={savingJob || job.status !== 'draft'}
                    >
                      <option value="">Seçilmedi</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="job_due_date">Teslim Tarihi</Label>
                      <Input
                        id="job_due_date"
                        type="date"
                        value={jobForm.due_date}
                        onChange={(e) =>
                          setJobForm({ ...jobForm, due_date: e.target.value })
                        }
                        disabled={savingJob}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job_priority">Öncelik</Label>
                      <select
                        id="job_priority"
                        value={jobForm.priority}
                        onChange={(e) =>
                          setJobForm({ ...jobForm, priority: e.target.value })
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                        disabled={savingJob}
                      >
                        <option value="low">Düşük</option>
                        <option value="normal">Normal</option>
                        <option value="high">Yüksek</option>
                        <option value="urgent">Acil</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Oluşturan</p>
                    <p className="text-sm font-medium text-gray-900">
                      {job.created_by?.name || '-'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {job.created_at
                        ? new Date(job.created_at).toLocaleString('tr-TR')
                        : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Müşteri</p>
                      <p className="text-sm font-medium text-gray-900">
                        {job.customer?.name || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Teslim Tarihi</p>
                      <p className="text-sm font-medium text-gray-900">
                        {job.due_date ? formatDate(job.due_date) : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Oluşturan</p>
                      <p className="text-sm font-medium text-gray-900">
                        {job.created_by?.name || '-'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {job.created_at
                          ? new Date(job.created_at).toLocaleString('tr-TR')
                          : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Açıklama</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Textarea
                  value={jobForm.description}
                  onChange={(e) =>
                    setJobForm({ ...jobForm, description: e.target.value })
                  }
                  rows={4}
                  disabled={savingJob}
                  placeholder="İşle ilgili açıklama girin"
                />
              ) : (
                <p className="whitespace-pre-wrap text-gray-700">
                  {job.description || 'Açıklama eklenmemiş'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>İş Dosyaları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <FileUpload refType="job" refId={job.id} onUploadComplete={loadJob} />
              <FileList files={jobFiles.job_files || []} onDelete={loadJob} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Süreçler</h3>
              <span className="text-sm text-gray-500">
                {(job.steps && job.steps.length) || 0} adım
              </span>
            </div>
            {job.steps && job.steps.length > 0 ? (
              <div className="space-y-3">
                {job.steps.map((step: any) => {
                  const processId = step.process?.id ?? step.process_id
                  const processFiles = jobFiles.process_files?.find(
                    (pf: any) => pf.process_id === processId
                  )
                  const currentRole = currentUser?.role
                  const isManager =
                    currentRole === 'yonetici' || currentRole === 'admin'
                  const isAssignee =
                    step.assigned_to?.id &&
                    currentUser?.id &&
                    String(step.assigned_to.id) === String(currentUser.id)
                  const canUploadFiles = Boolean(
                    isManager || isEditing || isAssignee,
                  )
                  const canDeleteFiles = Boolean(isManager || isEditing)

                  return (
                    <ProcessStepCard
                      key={step.id}
                      step={step}
                      files={processFiles}
                      isEditingMode={isEditing}
                      editForm={stepForms.find((item) => item.id === step.id)}
                      onFieldChange={handleStepFieldChange}
                      onSave={handleStepSave}
                      disabled={
                        savingStepId === step.id ||
                        savingJob ||
                        ['completed', 'canceled'].includes(step.status)
                      }
                      onDelete={handleDeleteStep}
                      canDelete={['pending', 'ready'].includes(step.status)}
                      users={users}
                      machines={machines}
                      processOptions={processOptions}
                      completionForm={completionForms[step.id]}
                      onCompletionChange={handleCompletionFieldChange}
                      onStartStep={handleStartStep}
                      onCompleteStep={handleCompleteStep}
                      actionLoading={stepActionLoading[step.id] || false}
                      canUploadFiles={canUploadFiles}
                      canDeleteFiles={canDeleteFiles}
                      onPauseStep={handlePauseStep}
                      onResumeStep={handleResumeStep}
                      notes={step.notes || []}
                      onAddNote={handleAddStepNote}
                      isOpen={expandedSteps[step.id] ?? false}
                      onToggle={() =>
                        setExpandedSteps((prev) => ({
                          ...prev,
                          [step.id]: !(prev[step.id] ?? false),
                        }))
                      }
                    />
                  )
                })}
                {isEditing && (
                  <div className="rounded-lg border border-dashed p-4">
                    <h4 className="font-semibold text-gray-900">Yeni Süreç Ekle</h4>
                    <p className="mb-4 text-xs text-gray-500">
                      İhtiyacınız olan süreçleri sırasıyla ekleyip sorumluluk ataması yapabilirsiniz.
                    </p>
                    <form onSubmit={handleAddStep} className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Süreç *</Label>
                        <select
                          value={newStep.process_id}
                          onChange={(e) => handleNewStepChange('process_id', e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                          required
                          disabled={addingStep}
                        >
                          <option value="">Süreç seçin</option>
                          {processOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Sorumlu Kullanıcı</Label>
                        <select
                          value={newStep.assigned_to}
                          onChange={(e) => handleNewStepChange('assigned_to', e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                          disabled={addingStep}
                        >
                          <option value="">Seçilmedi</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.full_name || user.username}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Makine</Label>
                        <select
                          value={newStep.machine_id}
                          onChange={(e) => handleNewStepChange('machine_id', e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                          disabled={addingStep}
                        >
                          <option value="">Seçilmedi</option>
                          {machines.map((machine) => (
                            <option key={machine.id} value={machine.id}>
                              {machine.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tahmini Süre (dk)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={newStep.estimated_duration}
                          onChange={(e) =>
                            handleNewStepChange('estimated_duration', e.target.value)
                          }
                          disabled={addingStep}
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={newStep.is_parallel}
                          onChange={(e) =>
                            handleNewStepChange('is_parallel', e.target.checked)
                          }
                          disabled={addingStep}
                        />
                        Paralel çalışabilir
                      </label>
                      <div className="flex items-end justify-end">
                        <Button type="submit" disabled={addingStep}>
                          <Plus className="mr-2 h-4 w-4" />
                          {addingStep ? 'Ekleniyor...' : 'Süreç Ekle'}
                        </Button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-gray-500">
                  Bu işe henüz süreç eklenmemiş.
                </CardContent>
              </Card>
            )}
          </div>

        </div>
      </div>

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
          <CardContent className="space-y-3">
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
          <CardContent className="space-y-3">
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
