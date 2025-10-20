'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
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
  AlarmClock,
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
  ChevronsDown,
  ChevronsUp,
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

const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR

function splitDurationMinutes(totalMinutes?: number | null) {
  if (totalMinutes == null) {
    return { days: 1, hours: 0 }
  }
  const safeMinutes = Math.max(0, Number(totalMinutes) || 0)
  const days = Math.floor(safeMinutes / MINUTES_PER_DAY)
  const hours = Math.floor((safeMinutes % MINUTES_PER_DAY) / MINUTES_PER_HOUR)
  return { days, hours }
}

function combineDurationMinutes(days: number | string | null | undefined, hours: number | string | null | undefined) {
  const safeDays = Math.max(0, Math.floor(Number(days) || 0))
  const safeHoursRaw = Math.max(0, Math.floor(Number(hours) || 0))
  const extraDays = Math.floor(safeHoursRaw / HOURS_PER_DAY)
  const normalizedHours = safeHoursRaw % HOURS_PER_DAY
  return (safeDays + extraDays) * MINUTES_PER_DAY + normalizedHours * MINUTES_PER_HOUR
}

function formatDurationLabel(totalMinutes?: number | null) {
  const { days, hours } = splitDurationMinutes(totalMinutes)
  return `${days} gün ${hours} saat`
}



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
  is_parallel: false,
  due_date: '',
  due_time: '',
  estimated_duration: MINUTES_PER_DAY,
  estimated_duration_days: 1,
  estimated_duration_hours: 0,
  requirements: '',
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

  useEffect(() => {
    if (!job || referenceLoaded) {
      return
    }

    const role = currentUser?.role
    const userId = currentUser?.id ? String(currentUser.id) : null
    const isManager = role === 'yonetici' || role === 'admin'
    const isAssignee =
      !!userId &&
      Array.isArray(job.steps) &&
      job.steps.some((step: any) => {
        const assignedId =
          step?.assigned_to?.id ??
          (typeof step?.assigned_to === 'string' ? step.assigned_to : null)
        return assignedId && String(assignedId) === userId
      })

    if (isManager || isAssignee) {
      void ensureReferences()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, currentUser, referenceLoaded])

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
      hydrateStepForms(payload.steps || [])
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

function normalizeDate(value?: string | null) {
  if (!value) return ''
  if (value.includes('T')) {
    return value.split('T')[0] || ''
  }
  if (value.includes(' ')) {
    return value.split(' ')[0] || ''
  }
  return value.trim()
}

function normalizeTime(value?: string | null) {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  const [hours = '', minutes = ''] = trimmed.split(':')
  if (!hours) return ''
  const normalizedMinutes = minutes ? minutes : '00'
  return `${hours.padStart(2, '0')}:${normalizedMinutes.padStart(2, '0')}`
}

function getDefaultStepDueDate(jobDueDate?: string | null) {
  const normalizedJobDate = normalizeDate(jobDueDate)
  if (normalizedJobDate) {
    return normalizedJobDate
  }
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().slice(0, 10)
}

function hydrateStepForms(steps: any[]) {
  setStepForms(
    steps.map((step: any) => ({
      id: step.id,
      process_id: step.process?.id || '',
      assigned_to: step.assigned_to?.id || '',
      machine_id: step.machine?.id || '',
      is_parallel: !!step.is_parallel,
      status: step.status,
      name: step.process?.name || '',
      due_date: normalizeDate(step.due_date),
      due_time: normalizeTime(step.due_time),
      requirements: step.requirements || '',
      original_due_date: normalizeDate(step.due_date),
      original_due_time: normalizeTime(step.due_time),
      original_assigned_to: step.assigned_to?.id || '',
      original_machine_id: step.machine?.id || '',
      ...(() => {
        const rawMinutes =
          step.estimated_duration != null ? Number(step.estimated_duration) : null
        const { days, hours } = splitDurationMinutes(rawMinutes)
        const combined = combineDurationMinutes(days, hours)
        const originalMinutes =
          step.estimated_duration != null ? Number(step.estimated_duration) : combined
        return {
          estimated_duration_days: days,
          estimated_duration_hours: hours,
          estimated_duration_minutes: combined,
          original_estimated_duration_minutes: originalMinutes,
        }
      })(),
    })),
  )
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
  hydrateStepForms(steps)
  setNewStep({
    process_id: '',
    assigned_to: '',
    machine_id: '',
    is_parallel: false,
    due_date: '',
    due_time: '',
    estimated_duration: MINUTES_PER_DAY,
    estimated_duration_days: 1,
    estimated_duration_hours: 0,
    requirements: '',
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

function toggleEditing() {}

function cancelEditing() {}

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
  const nextValue =
    field === 'due_date'
      ? normalizeDate(value)
      : field === 'due_time'
        ? normalizeTime(value)
        : value
  setStepForms((prev) => {
    let found = false
    const updated = prev.map((step) => {
      if (step.id === stepId) {
        found = true
        if (field === 'estimated_duration_days' || field === 'estimated_duration_hours') {
          const numeric = Math.max(0, Math.floor(Number(nextValue) || 0))
          const nextStep = {
            ...step,
            [field]: numeric,
          }
          const totalMinutes = combineDurationMinutes(
            nextStep.estimated_duration_days,
            nextStep.estimated_duration_hours,
          )
          const normalized = splitDurationMinutes(totalMinutes)
          return {
            ...nextStep,
            estimated_duration_days: normalized.days,
            estimated_duration_hours: normalized.hours,
            estimated_duration_minutes: totalMinutes,
          }
        }
        return {
          ...step,
          [field]: nextValue,
        }
      }
      return step
    })
    if (found) {
      return updated
    }

    const baseStep = job?.steps?.find((item: any) => item.id === stepId)
    const baseMinutes = baseStep?.estimated_duration != null ? Number(baseStep.estimated_duration) : null
    let { days, hours } = splitDurationMinutes(baseMinutes)
    if (field === 'estimated_duration_days') {
      days = Math.max(0, Math.floor(Number(nextValue) || 0))
    }
    if (field === 'estimated_duration_hours') {
      hours = Math.max(0, Math.floor(Number(nextValue) || 0))
    }
    const combined = combineDurationMinutes(days, hours)
    const normalized = splitDurationMinutes(combined)
    const fallback = {
      id: stepId,
      process_id: baseStep?.process?.id || '',
      assigned_to: baseStep?.assigned_to?.id || '',
      machine_id: baseStep?.machine?.id || '',
      estimated_duration_days: normalized.days,
      estimated_duration_hours: normalized.hours,
      estimated_duration_minutes: combined,
      original_estimated_duration_minutes: baseMinutes ?? combined,
      is_parallel: !!baseStep?.is_parallel,
      status: baseStep?.status,
      name: baseStep?.process?.name || '',
      due_date: field === 'due_date' ? nextValue : normalizeDate(baseStep?.due_date),
      due_time: field === 'due_time' ? nextValue : normalizeTime(baseStep?.due_time),
      original_due_date: normalizeDate(baseStep?.due_date),
      original_due_time: normalizeTime(baseStep?.due_time),
      original_assigned_to: baseStep?.assigned_to?.id || '',
      original_machine_id: baseStep?.machine?.id || '',
    }
    return [...updated, fallback]
  })
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

  const dueDate = normalizeDate(form.due_date)
  const dueTime = normalizeTime(form.due_time)

  if (!dueDate || !dueTime) {
    toast.error('Her süreç için termin tarihi ve saati zorunludur')
    return
  }

  const payload: any = {
    assigned_to: form.assigned_to || null,
    machine_id: form.machine_id || null,
    is_parallel: form.is_parallel,
    estimated_duration: combineDurationMinutes(
      form.estimated_duration_days,
      form.estimated_duration_hours,
    ),
    due_date: dueDate,
    due_time: dueTime,
    requirements: form.requirements || null,
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

async function handleAddStep(e?: React.FormEvent, directProcessId?: string) {
  e?.preventDefault()
  if (!job) return

  const processId = directProcessId || newStep.process_id
  if (!processId) {
    toast.error('Önce eklenecek süreci seçin')
    return
  }

  try {
    setAddingStep(true)
    const defaultDueDate = newStep.due_date
      ? normalizeDate(newStep.due_date)
      : getDefaultStepDueDate(job.due_date)
    const defaultDueTime = newStep.due_time
      ? normalizeTime(newStep.due_time)
      : '23:59'
    const durationMinutes = combineDurationMinutes(
      newStep.estimated_duration_days,
      newStep.estimated_duration_hours,
    )
    await jobsAPI.addStep(job.id, {
      process_id: processId,
      assigned_to: newStep.assigned_to || null,
      machine_id: newStep.machine_id || null,
      is_parallel: newStep.is_parallel,
      estimated_duration: durationMinutes,
      due_date: defaultDueDate,
      due_time: defaultDueTime,
      requirements: newStep.requirements || null,
    })
    toast.success('Yeni süreç eklendi')
    setNewStep({
      process_id: '',
      assigned_to: '',
      machine_id: '',
      is_parallel: false,
      due_date: '',
      due_time: '',
      estimated_duration: MINUTES_PER_DAY,
      estimated_duration_days: 1,
      estimated_duration_hours: 0,
      requirements: '',
    })
    await loadJob()
  } catch (err: any) {
    toast.error(err?.response?.data?.error || 'Süreç eklenemedi')
  } finally {
    setAddingStep(false)
  }
}

function handleNewStepChange(field: string, value: any) {
  setNewStep((prev) => {
    if (field === 'estimated_duration_days' || field === 'estimated_duration_hours') {
      const numeric = Math.max(0, Math.floor(Number(value) || 0))
      const next = {
        ...prev,
        [field]: numeric,
      }
      const combined = combineDurationMinutes(next.estimated_duration_days, next.estimated_duration_hours)
      const normalized = splitDurationMinutes(combined)
      return {
        ...next,
        estimated_duration_days: normalized.days,
        estimated_duration_hours: normalized.hours,
        estimated_duration: combined,
      }
    }
    return {
      ...prev,
      [field]: value,
    }
  })
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

  async function handleActivateStep(stepId: string) {
    setStepActionLoading((prev) => ({ ...prev, [stepId]: true }))
    try {
      await jobsAPI.activateStep(stepId)
      await loadJob()
    } catch (error: any) {
      const message = error?.response?.data?.error || 'Süreç hazır duruma getirilemedi'
      toast.error(message)
    } finally {
      setStepActionLoading((prev) => ({ ...prev, [stepId]: false }))
    }
  }

  async function handleReopenStep(stepId: string, reason?: string) {
    setStepActionLoading((prev) => ({ ...prev, [stepId]: true }))
    try {
      await jobsAPI.reopenStep(stepId, { reason })
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
    canAdjustSchedule,
    users,
    machines,
    processOptions,
    completionForm,
    onCompletionChange,
    onStartStep,
    onActivateStep,
    onCompleteStep,
    actionLoading,
    canUploadFiles,
    canDeleteFiles,
    onPauseStep,
    onResumeStep,
    onReopenStep,
    isStepCompleted = false,
    isStepCanceled = false,
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
    canAdjustSchedule: boolean
    users: any[]
    machines: any[]
    processOptions: { value: string; label: string }[]
    completionForm?: { quantity: string; unit: string; notes: string }
    onCompletionChange?: (stepId: string, field: string, value: string) => void
    onStartStep?: (stepId: string) => void
    onActivateStep?: (stepId: string) => Promise<void> | void
    onCompleteStep?: (step: any) => void
    actionLoading?: boolean
    canUploadFiles: boolean
    canDeleteFiles: boolean
    onPauseStep?: (stepId: string, reason: string) => Promise<void> | void
    onResumeStep?: (stepId: string) => Promise<void> | void
    onReopenStep?: (stepId: string, reason?: string) => Promise<void> | void
    isStepCompleted?: boolean
    isStepCanceled?: boolean
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
    const processDescription =
      step.process?.description || (step as any).process_description || ''
    const requirements = step.requirements || (step as any).requirements || ''
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
            .filter((part: string) => Boolean(part))
            .slice(0, 2)
            .map((part: string) => part[0]?.toUpperCase() ?? '')
            .join('') || '?'
        : '?'
    const machineName = step.machine?.name || 'Belirlenmedi'
    const formatDateTime = (value?: string | null) =>
      value ? new Date(value).toLocaleString('tr-TR') : '-'
    const originalStepDurationMinutes = step.estimated_duration != null ? Number(step.estimated_duration) : null
    const initialDurationSplit = splitDurationMinutes(
      editForm?.estimated_duration_minutes ?? originalStepDurationMinutes,
    )
    const rawDurationDays = editForm?.estimated_duration_days ?? initialDurationSplit.days
    const rawDurationHours = editForm?.estimated_duration_hours ?? initialDurationSplit.hours
    const currentDurationMinutes = combineDurationMinutes(rawDurationDays, rawDurationHours)
    const normalizedCurrent = splitDurationMinutes(currentDurationMinutes)
    const currentDurationDays = normalizedCurrent.days
    const currentDurationHours = normalizedCurrent.hours
    const originalDurationMinutes =
      editForm?.original_estimated_duration_minutes ??
      (originalStepDurationMinutes != null
        ? originalStepDurationMinutes
        : currentDurationMinutes)
    const estimatedDurationLabel = formatDurationLabel(originalDurationMinutes)
    const actualDuration =
      step.actual_duration != null
        ? formatDurationLabel(Number(step.actual_duration))
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
    const dueDateValue = editForm?.due_date ?? normalizeDate(step.due_date)
    const dueTimeValue = editForm?.due_time ?? normalizeTime(step.due_time)
    const scheduleForm = {
      due_date: dueDateValue,
      due_time: dueTimeValue,
    }
    const originalDueDate = editForm?.original_due_date ?? dueDateValue
    const originalDueTime = editForm?.original_due_time ?? dueTimeValue
    const currentAssignedTo = editForm?.assigned_to ?? (step.assigned_to?.id || '')
    const originalAssignedTo = editForm?.original_assigned_to ?? (step.assigned_to?.id || '')
    const currentMachineId = editForm?.machine_id ?? (step.machine?.id || '')
    const originalMachineId = editForm?.original_machine_id ?? (step.machine?.id || '')

    const hasScheduleChanges =
      canAdjustSchedule &&
      (scheduleForm.due_date !== originalDueDate || scheduleForm.due_time !== originalDueTime)
    const hasAssignmentChanges =
      canAdjustSchedule && currentAssignedTo !== originalAssignedTo
    const hasMachineChanges = canAdjustSchedule && currentMachineId !== originalMachineId
    const hasDurationChanges =
      canAdjustSchedule && currentDurationMinutes !== originalDurationMinutes
    const hasPendingChanges =
      hasScheduleChanges || hasAssignmentChanges || hasMachineChanges || hasDurationChanges
    const plannedDateDisplay = (() => {
      if (!dueDateValue) return '-'
      const dateObj = new Date(`${dueDateValue}T00:00:00`)
      const dateLabel = Number.isNaN(dateObj.getTime())
        ? dueDateValue
        : dateObj.toLocaleDateString('tr-TR')
      return dueTimeValue ? `${dateLabel} ${dueTimeValue}` : dateLabel
    })()

    const canStart = onStartStep && ['ready', 'pending'].includes(step.status)
    const canActivate = onActivateStep && canAdjustSchedule && step.status === 'pending'
    const canReopen = onReopenStep && canAdjustSchedule && step.status === 'completed'
    const canTogglePause = onPauseStep && ['ready', 'in_progress'].includes(step.status)
    const canResume = onResumeStep && step.status === 'blocked'
    const isStepCompletedFlag = Boolean(isStepCompleted ?? (step.status === 'completed'))
    const isStepCanceledFlag = Boolean(isStepCanceled ?? (step.status === 'canceled'))
    const fieldsDisabled = disabled || isStepCompletedFlag || isStepCanceledFlag

    const handleReopenClick = async () => {
      if (!onReopenStep) return
      let reasonInput = ''
      if (typeof window !== 'undefined') {
        const response = window.prompt('Süreç yeniden açılacak. Sebep girin (opsiyonel):', '')
        if (response === null) {
          return
        }
        reasonInput = (response || '').trim()
      }
      try {
        await onReopenStep(step.id, reasonInput)
        toast.success('Süreç yeniden açıldı (revizyon güncellendi)')
      } catch (error: any) {
        const message = error?.response?.data?.error || 'Süreç yeniden açılamadı'
        toast.error(message)
      }
    }

    const actionButtons: ReactElement[] = []

    if (canActivate) {
      actionButtons.push(
        <Button
          key="activate"
          type="button"
          onClick={() => onActivateStep && onActivateStep(step.id)}
          disabled={fieldsDisabled || !!actionLoading}
        >
          {actionLoading ? 'Aktifleştiriliyor...' : 'Süreci Aktif Et'}
        </Button>,
      )
    }

    if (canStart) {
      actionButtons.push(
        <Button
          key="start"
          type="button"
          onClick={() => onStartStep && onStartStep(step.id)}
          disabled={fieldsDisabled || !!actionLoading}
        >
          {actionLoading ? 'Başlatılıyor...' : 'Süreci Başlat'}
        </Button>,
      )
    }

    if (canTogglePause) {
      actionButtons.push(
        <Button
          key="pause"
          type="button"
          variant="outline"
          onClick={() => setShowPauseForm((prev) => !prev)}
          disabled={!!actionLoading}
        >
          {showPauseForm ? 'Durdurma Formunu Gizle' : 'Süreci Durdur'}
        </Button>,
      )
    }

    if (canResume) {
      actionButtons.push(
        <Button
          key="resume"
          type="button"
          onClick={handleResume}
          disabled={pauseSubmitting || !!actionLoading}
        >
          {pauseSubmitting ? 'Devam Ettiriliyor...' : 'Süreci Devam Ettir'}
        </Button>,
      )
    }

    if (canReopen) {
      actionButtons.push(
        <Button
          key="reopen"
          type="button"
          variant="outline"
          onClick={handleReopenClick}
          disabled={fieldsDisabled || !!actionLoading}
        >
          {actionLoading ? 'İşlem yapılıyor...' : 'Süreci Yeniden Aç'}
        </Button>,
      )
    }
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
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
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
          <div className="space-y-3 border-t px-4 py-3 max-w-full">
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
                      disabled={fieldsDisabled}
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
                      disabled={fieldsDisabled}
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
                      disabled={fieldsDisabled}
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
                    <Label>Termin Tarihi</Label>
                    <Input
                      type="date"
                      value={scheduleForm.due_date}
                      onChange={(e) => handleFieldChange('due_date', e.target.value)}
                      disabled={fieldsDisabled}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Termin Saati</Label>
                    <Input
                      type="time"
                      value={scheduleForm.due_time}
                      onChange={(e) => handleFieldChange('due_time', e.target.value)}
                      disabled={fieldsDisabled}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tahmini Süre</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        value={Number(editForm.estimated_duration_days ?? currentDurationDays)}
                        onChange={(e) =>
                          handleFieldChange('estimated_duration_days', e.target.value)
                        }
                        disabled={fieldsDisabled}
                        className="h-9 w-24"
                      />
                      <span className="text-xs text-gray-500">gün</span>
                      <Input
                        type="number"
                        min={0}
                        max={23}
                        value={Number(editForm.estimated_duration_hours ?? currentDurationHours)}
                        onChange={(e) =>
                          handleFieldChange('estimated_duration_hours', e.target.value)
                        }
                        disabled={fieldsDisabled}
                        className="h-9 w-24"
                      />
                      <span className="text-xs text-gray-500">saat</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>İş Gereksinimleri</Label>
                  <Textarea
                    value={editForm.requirements ?? ''}
                    onChange={(e) => handleFieldChange('requirements', e.target.value)}
                    disabled={fieldsDisabled}
                    placeholder="Bu adımın nasıl yapılması gerektiğini açıklayın..."
                    className="min-h-[100px]"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={editForm.is_parallel ?? false}
                    onChange={(e) => handleFieldChange('is_parallel', e.target.checked)}
                    disabled={fieldsDisabled}
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
                    <p className="font-medium text-gray-900">
                      {formatDurationLabel(currentDurationMinutes)}
                    </p>
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

                {requirements && (
                  <div className="rounded-md bg-sky-50 p-3 text-sm text-sky-800">
                    <p className="font-semibold text-sky-900 mb-1">İş Gereksinimleri</p>
                    <p className="whitespace-pre-line">{requirements}</p>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="flex items-center gap-2.5">
                    <User className="h-4 w-4 text-gray-400" />
                    <div className="min-w-[200px]">
                      <p className="text-xs uppercase text-gray-500">Sorumlu</p>
                      {canAdjustSchedule ? (
                        <select
                          value={currentAssignedTo}
                          onChange={(e) => handleFieldChange('assigned_to', e.target.value)}
                          className="h-8 w-full min-w-[160px] rounded border border-gray-300 px-2 text-sm"
                          disabled={disabled}
                        >
                          <option value="">Seçilmedi</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.full_name || user.username}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{assignedName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Üretim</p>
                      <p className="text-sm font-medium text-gray-900">{productionValue}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Settings className="h-4 w-4 text-gray-400" />
                    <div className="min-w-[200px]">
                      <p className="text-xs uppercase text-gray-500">Makine</p>
                      {canAdjustSchedule ? (
                        <select
                          value={currentMachineId}
                          onChange={(e) => handleFieldChange('machine_id', e.target.value)}
                          className="h-8 w-full min-w-[160px] rounded border border-gray-300 px-2 text-sm"
                          disabled={disabled}
                        >
                          <option value="">Seçilmedi</option>
                          {machines.map((machine) => (
                            <option key={machine.id} value={machine.id}>
                              {machine.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{machineName}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <AlarmClock className="h-4 w-4 text-gray-400" />
                    <div className="min-w-[200px]">
                      <p className="text-xs uppercase text-gray-500">Termin</p>
                      {canAdjustSchedule ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <Input
                            type="date"
                            value={scheduleForm.due_date}
                            onChange={(e) => handleFieldChange('due_date', e.target.value)}
                            disabled={disabled}
                            required
                            className="h-8 w-auto min-w-[120px] text-sm"
                          />
                          <Input
                            type="time"
                            value={scheduleForm.due_time}
                            onChange={(e) => handleFieldChange('due_time', e.target.value)}
                            disabled={disabled}
                            required
                            className="h-8 w-auto min-w-[100px] text-sm"
                          />
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{plannedDateDisplay}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Timer className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-xs uppercase text-gray-500">Tahmini Süre</p>
                      {canAdjustSchedule ? (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              value={Number(editForm?.estimated_duration_days ?? currentDurationDays)}
                              onChange={(e) => handleFieldChange('estimated_duration_days', e.target.value)}
                              disabled={disabled}
                              className="h-8 w-20 text-sm"
                            />
                            <span className="text-xs text-gray-500">gün</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              max={23}
                              value={Number(editForm?.estimated_duration_hours ?? currentDurationHours)}
                              onChange={(e) => handleFieldChange('estimated_duration_hours', e.target.value)}
                              disabled={disabled}
                              className="h-8 w-20 text-sm"
                            />
                            <span className="text-xs text-gray-500">saat</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{estimatedDurationLabel}</p>
                      )}
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

                {requirements && (
                  <div className="rounded-md bg-sky-50 p-3 text-sm text-sky-800">
                    <p className="font-semibold text-sky-900 mb-1">İş Gereksinimleri</p>
                    <p className="whitespace-pre-line">{requirements}</p>
                  </div>
                )}

                {actionButtons.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {actionButtons}
                  </div>
                )}

                {canAdjustSchedule && hasPendingChanges && (
                  <div className="mt-3">
                    <Button
                      type="button"
                      onClick={() => onSave && onSave(step.id)}
                      disabled={disabled}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      {disabled ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
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

                {canTogglePause && showPauseForm && (
                  <div className="space-y-3 rounded-md bg-orange-50 p-3 text-sm text-orange-800">
                    <p className="font-medium">
                      {step.status === 'in_progress'
                        ? 'Süreç şu anda devam ediyor. Durdurma sebebini belirterek adımı beklemeye alabilirsiniz.'
                        : 'Süreç başlamadan önce durdurma sebebi belirtebilirsiniz.'}
                    </p>
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
                    {step.blocked_at && (
                      <span className="text-xs text-orange-600">
                        {new Date(step.blocked_at).toLocaleString('tr-TR')}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h5 className="text-sm font-semibold text-gray-900">Süreç Dosyaları</h5>
                <span className="text-xs text-gray-500">{filesList.length} dosya</span>
              </div>
              <div className="w-full">
                <FileUpload
                  refType="job_step"
                  refId={step.id}
                  onUploadComplete={loadJob}
                  maxFiles={5}
                  disabled={!canUploadFiles}
                  className="w-full"
                />
                {filesList.length > 0 ? (
                  <FileList
                    files={filesList}
                    onDelete={canDeleteFiles ? loadJob : undefined}
                    allowDelete={canDeleteFiles}
                    variant="grid"
                    itemWidth={120}
                    className="w-full"
                  />
                ) : (
                  <p className="text-xs text-gray-500">Henüz dosya eklenmemiş.</p>
                )}
              </div>
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
              <Link href={`/jobs/${job.id}/edit`}>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Düzenle
                </Button>
              </Link>
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
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Süreçler</h3>
                <span className="text-sm text-gray-500">
                  · {(job.steps && job.steps.length) || 0} adım
                </span>
              </div>
              {!isEditing && job.steps && job.steps.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const allExpanded = job.steps.every((step: any) => expandedSteps[step.id])
                    const newState: Record<string, boolean> = {}
                    job.steps.forEach((step: any) => {
                      newState[step.id] = !allExpanded
                    })
                    setExpandedSteps(newState)
                  }}
                  className="text-xs text-gray-600 hover:text-gray-900"
                >
                  {job.steps.every((step: any) => expandedSteps[step.id]) ? (
                    <>
                      <ChevronsUp className="h-4 w-4 mr-1" />
                      Tümünü Kapat
                    </>
                  ) : (
                    <>
                      <ChevronsDown className="h-4 w-4 mr-1" />
                      Tümünü Aç
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* İki Kolonlu Yapı: Sol = Eklenen Süreçler, Sağ = Mevcut Süreçler */}
            {isEditing ? (
              <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
                {/* Sol: Eklenen Süreçler (Kompakt Liste) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Eklenen Süreçler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {job.steps && job.steps.length > 0 ? (
                      <div className="space-y-2">
                        {job.steps.map((step: any, index: number) => {
                          const editForm = stepForms.find((item) => item.id === step.id)
                          const canDelete = ['pending', 'ready'].includes(step.status)

                          return (
                            <div key={step.id} className="rounded-lg border bg-gray-50 p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                                  {index + 1}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-gray-900">
                                      {step.process?.name || 'Süreç'}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {step.process?.group_name ? `(${step.process.group_name})` : ''}
                                    </span>
                                  </div>
                                </div>
                                {canDelete && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteStep(step.id, step.process?.name)}
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>

                              {/* Kompakt Form */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <Label className="text-xs">Sorumlu</Label>
                                  <select
                                    value={editForm?.assigned_to || ''}
                                    onChange={(e) => handleStepFieldChange(step.id, 'assigned_to', e.target.value)}
                                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                                    disabled={savingStepId === step.id}
                                  >
                                    <option value="">Seçilmedi</option>
                                    {users.map((user) => (
                                      <option key={user.id} value={user.id}>
                                        {user.full_name || user.username}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-xs">Makine</Label>
                                  <select
                                    value={editForm?.machine_id || ''}
                                    onChange={(e) => handleStepFieldChange(step.id, 'machine_id', e.target.value)}
                                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                                    disabled={savingStepId === step.id}
                                  >
                                    <option value="">Seçilmedi</option>
                                    {machines.map((machine) => (
                                      <option key={machine.id} value={machine.id}>
                                        {machine.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <Label className="text-xs">Termin Tarihi</Label>
                                  <Input
                                    type="date"
                                    value={editForm?.due_date ?? ''}
                                    onChange={(e) => handleStepFieldChange(step.id, 'due_date', e.target.value)}
                                    className="h-7 text-xs"
                                    disabled={savingStepId === step.id}
                                    required
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Termin Saati</Label>
                                  <Input
                                    type="time"
                                    value={editForm?.due_time ?? ''}
                                    onChange={(e) => handleStepFieldChange(step.id, 'due_time', e.target.value)}
                                    className="h-7 text-xs"
                                    disabled={savingStepId === step.id}
                                    required
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Tahmini Süre</Label>
                                  <div className="flex items-center gap-1">
                                    <Input
                                      type="number"
                                      min={0}
                                      value={Number(editForm?.estimated_duration_days ?? currentDurationDays)}
                                      onChange={(e) => handleStepFieldChange(step.id, 'estimated_duration_days', e.target.value)}
                                      className="h-7 w-16 text-xs"
                                      disabled={savingStepId === step.id}
                                    />
                                    <span className="text-[10px] uppercase text-gray-500">gün</span>
                                    <Input
                                      type="number"
                                      min={0}
                                      max={23}
                                      value={Number(editForm?.estimated_duration_hours ?? currentDurationHours)}
                                      onChange={(e) => handleStepFieldChange(step.id, 'estimated_duration_hours', e.target.value)}
                                      className="h-7 w-16 text-xs"
                                      disabled={savingStepId === step.id}
                                    />
                                    <span className="text-[10px] uppercase text-gray-500">saat</span>
                                  </div>
                                </div>
                                <div className="flex items-end">
                                  <label className="flex items-center gap-1 text-xs text-gray-600">
                                    <input
                                      type="checkbox"
                                      checked={editForm?.is_parallel ?? false}
                                      onChange={(e) => handleStepFieldChange(step.id, 'is_parallel', e.target.checked)}
                                      disabled={savingStepId === step.id}
                                      className="rounded"
                                    />
                                    Paralel
                                  </label>
                                </div>
                              </div>

                              <div className="mt-2 flex justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleStepSave(step.id)}
                                  disabled={savingStepId === step.id}
                                  className="h-7 text-xs"
                                >
                                  {savingStepId === step.id ? 'Kaydediliyor...' : 'Kaydet'}
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-sm text-gray-500 py-8">
                        Henüz süreç eklenmedi. Sağdaki listeden süreç ekleyin.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Sağ: Mevcut Süreçler (Tıklayarak Ekle) */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Mevcut Süreçler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {processes.length > 0 ? (
                        // Süreçleri gruplara göre ayır
                        (() => {
                          const grouped = processes.reduce((acc: any, process: any) => {
                            const groupName = process.group_name || 'Grupsuz'
                            if (!acc[groupName]) acc[groupName] = []
                            acc[groupName].push(process)
                            return acc
                          }, {})

                          return Object.entries(grouped).map(([groupName, groupProcesses]: [string, any]) => (
                            <div key={groupName} className="border rounded-lg">
                              <div className="bg-gray-100 px-3 py-2 font-medium text-sm text-gray-700">
                                {groupName}
                              </div>
                              <div className="divide-y">
                                {groupProcesses.map((process: any) => (
                                  <button
                                    key={process.id}
                                    type="button"
                                    onClick={() => handleAddStep(undefined, process.id)}
                                    disabled={addingStep}
                                    className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center justify-between group"
                                  >
                                    <span className="text-sm text-gray-900">{process.name}</span>
                                    <Plus className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))
                        })()
                      ) : (
                        <p className="text-center text-sm text-gray-500 py-8">
                          Süreç bulunamadı
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Düzenleme modunda değilse - Normal görünüm
              <div className="space-y-3 max-w-5xl">
                {job.steps && job.steps.length > 0 ? (
                  job.steps.map((step: any) => {
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
                    const canAdjustSchedule = Boolean(isManager || isAssignee)

                    return (
                      <ProcessStepCard
                        key={step.id}
                        step={step}
                        files={processFiles}
                        isEditingMode={isEditing}
                        editForm={stepForms.find((item) => item.id === step.id)}
                        onFieldChange={handleStepFieldChange}
                        onSave={handleStepSave}
                        disabled={savingStepId === step.id || savingJob}
                        onDelete={handleDeleteStep}
                        canDelete={['pending', 'ready'].includes(step.status)}
                        canAdjustSchedule={canAdjustSchedule}
                        isStepCompleted={step.status === 'completed'}
                        isStepCanceled={step.status === 'canceled'}
                        users={users}
                        machines={machines}
                        processOptions={processOptions}
                        completionForm={completionForms[step.id]}
                        onCompletionChange={handleCompletionFieldChange}
                        onStartStep={handleStartStep}
                        onActivateStep={handleActivateStep}
                        onCompleteStep={handleCompleteStep}
                        actionLoading={stepActionLoading[step.id] || false}
                        canUploadFiles={canUploadFiles}
                        canDeleteFiles={canDeleteFiles}
                        onPauseStep={handlePauseStep}
                        onResumeStep={handleResumeStep}
                        onReopenStep={handleReopenStep}
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
                  })
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-sm text-gray-500">
                      Bu işe henüz süreç eklenmemiş.
                    </CardContent>
                  </Card>
                )}
              </div>
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
