'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  jobsAPI,
  customersAPI,
  processesAPI,
  usersAPI,
  machinesAPI,
} from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/utils/error-handler'

type StepFormState = {
  id: string
  process_id: string
  assigned_to: string
  machine_id: string
  estimated_duration: string
  is_parallel: boolean
}

const defaultNewStep: StepFormState = {
  id: '',
  process_id: '',
  assigned_to: '',
  machine_id: '',
  estimated_duration: '',
  is_parallel: false,
}

export default function EditJobPage() {
  const params = useParams()
  const router = useRouter()

  const [job, setJob] = useState<any>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [processes, setProcesses] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer_id: '',
    due_date: '',
    priority: 'normal',
  })

  const [stepForms, setStepForms] = useState<StepFormState[]>([])
  const [savingStepId, setSavingStepId] = useState<string | null>(null)
  const [addingStep, setAddingStep] = useState(false)
  const [newStep, setNewStep] = useState<StepFormState>(defaultNewStep)

  useEffect(() => {
    if (params.id) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function loadData() {
    try {
      setLoading(true)
      const [jobRes, customersRes, processesRes, usersRes, machinesRes] =
        await Promise.all([
          jobsAPI.getById(params.id as string),
          customersAPI.getAll(),
          processesAPI.getAll(),
          usersAPI.getAll(),
          machinesAPI.getAll(),
        ])

      const jobData = jobRes.data ?? jobRes
      setJob(jobData)
      setCustomers(customersRes.data || customersRes || [])
      const processPayload = processesRes?.data ?? processesRes ?? {}
      const processList = [
        ...((processPayload.groups ?? []).flatMap((g: any) => g.processes ?? [])),
        ...(processPayload.ungrouped ?? []),
      ]
      setProcesses(processList)
      setUsers(usersRes.data || usersRes || [])
      setMachines(machinesRes.data || machinesRes || [])

      setFormData({
        title: jobData.title || '',
        description: jobData.description || '',
        customer_id: jobData.customer?.id || '',
        due_date: jobData.due_date ? jobData.due_date.split('T')[0] : '',
        priority: jobData.priority || 'normal',
      })

      const steps = (jobData.steps || []) as any[]
      setStepForms(
        steps.map((step) => ({
          id: step.id,
          process_id: step.process?.id || '',
          assigned_to: step.assigned_to?.id || '',
          machine_id: step.machine?.id || '',
          estimated_duration:
            step.estimated_duration != null ? String(step.estimated_duration) : '',
          is_parallel: !!step.is_parallel,
        })),
      )
      setNewStep(defaultNewStep)
    } catch (error) {
      handleApiError(error, 'Load')
      toast.error('İş yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSaving(true)
      await jobsAPI.update(params.id as string, formData)
      toast.success('İş başarıyla güncellendi!')
      router.push(`/jobs/${params.id}`)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Güncelleme başarısız')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteStep(stepId: string, processName: string) {
    if (!confirm(`"${processName}" sürecini silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      await jobsAPI.deleteStep(stepId)
      toast.success('Süreç silindi')
      loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Silme başarısız')
    }
  }

  function handleStepFieldChange(stepId: string, field: keyof StepFormState, value: any) {
    setStepForms((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, [field]: value } : step)),
    )
  }

  async function handleStepSave(stepId: string) {
    const form = stepForms.find((step) => step.id === stepId)
    if (!form || !job) return

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
      loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Süreç güncellenemedi')
    } finally {
      setSavingStepId(null)
    }
  }

  function handleNewStepChange(field: keyof StepFormState, value: any) {
    setNewStep((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAddStep(e: React.FormEvent) {
    e.preventDefault()
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
      setNewStep(defaultNewStep)
      loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Süreç eklenemedi')
    } finally {
      setAddingStep(false)
    }
  }

  const processOptions = useMemo(
    () => processes.map((process) => ({ value: process.id, label: process.name })),
    [processes],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">İş bulunamadı</p>
        <Link href="/jobs">
          <Button className="mt-4">İşlere Dön</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-6">
      <Link href={`/jobs/${params.id}`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          İş Detayına Dön
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">İşi Düzenle</h1>
        <p className="mt-1 text-gray-600">{job.job_number}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>İş Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Başlık *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_id">Müşteri</Label>
              <select
                id="customer_id"
                value={formData.customer_id}
                onChange={(e) =>
                  setFormData({ ...formData, customer_id: e.target.value })
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                disabled={saving}
              >
                <option value="">Müşteri Seç (İsteğe Bağlı)</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                disabled={saving}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="due_date">Teslim Tarihi</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Öncelik</Label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  disabled={saving}
                >
                  <option value="low">Düşük</option>
                  <option value="normal">Normal</option>
                  <option value="high">Yüksek</option>
                  <option value="urgent">Acil</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Süreç Adımları</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {job.steps && job.steps.length > 0 ? (
              <div className="space-y-4">
                {job.steps.map((step: any, index: number) => {
                  const form = stepForms.find((item) => item.id === step.id)
                  const isLocked = ['completed', 'canceled'].includes(step.status)
                  const disabled = savingStepId === step.id || saving || isLocked

                  return (
                    <div key={step.id} className="space-y-4 rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {index + 1}. {step.process?.name || 'Süreç'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {step.process?.code || 'Kod belirtilmedi'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs uppercase ${getStatusBadge(step.status)}`}
                          >
                            {step.status.replace('_', ' ')}
                          </span>
                          {(step.status === 'pending' || step.status === 'ready') && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteStep(step.id, step.process?.name)}
                              className="h-8 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label> Süreç </Label>
                          <select
                            value={form?.process_id || ''}
                            onChange={(e) =>
                              handleStepFieldChange(step.id, 'process_id', e.target.value)
                            }
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
                          <Label> Sorumlu Kullanıcı </Label>
                          <select
                            value={form?.assigned_to || ''}
                            onChange={(e) =>
                              handleStepFieldChange(step.id, 'assigned_to', e.target.value)
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
                          <Label> Makine </Label>
                          <select
                            value={form?.machine_id || ''}
                            onChange={(e) =>
                              handleStepFieldChange(step.id, 'machine_id', e.target.value)
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
                          <Label> Tahmini Süre (dk) </Label>
                          <Input
                            type="number"
                            min={0}
                            value={form?.estimated_duration ?? ''}
                            onChange={(e) =>
                              handleStepFieldChange(step.id, 'estimated_duration', e.target.value)
                            }
                            disabled={disabled}
                          />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-gray-600">
                          <input
                            type="checkbox"
                            checked={form?.is_parallel ?? false}
                            onChange={(e) =>
                              handleStepFieldChange(step.id, 'is_parallel', e.target.checked)
                            }
                            disabled={disabled}
                          />
                          Paralel çalışabilir
                        </label>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleStepSave(step.id)}
                          disabled={disabled}
                        >
                          {savingStepId === step.id ? 'Kaydediliyor...' : 'Süreç Güncelle'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-gray-500">
                Henüz süreç eklenmemiş
              </p>
            )}

            <div className="rounded-lg border border-dashed p-4">
              <h4 className="font-semibold text-gray-900">Yeni Süreç Ekle</h4>
              <p className="mb-4 text-xs text-gray-500">
                İhtiyacınız olan süreçleri sırasıyla ekleyip sorumluluk ataması yapabilirsiniz.
              </p>
              <form onSubmit={handleAddStep} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label> Süreç *</Label>
                  <select
                    value={newStep.process_id}
                    onChange={(e) => handleNewStepChange('process_id', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    required
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
                  <Label> Sorumlu Kullanıcı </Label>
                  <select
                    value={newStep.assigned_to}
                    onChange={(e) => handleNewStepChange('assigned_to', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
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
                  <Label> Makine </Label>
                  <select
                    value={newStep.machine_id}
                    onChange={(e) => handleNewStepChange('machine_id', e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
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
                  <Label> Tahmini Süre (dk) </Label>
                  <Input
                    type="number"
                    min={0}
                    value={newStep.estimated_duration}
                    onChange={(e) =>
                      handleNewStepChange('estimated_duration', e.target.value)
                    }
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={newStep.is_parallel}
                    onChange={(e) => handleNewStepChange('is_parallel', e.target.checked)}
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
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </Button>
          <Link href={`/jobs/${params.id}`}>
            <Button type="button" variant="outline" disabled={saving}>
              İptal
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
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
