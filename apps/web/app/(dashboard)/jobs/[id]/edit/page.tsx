'use client'

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Save, Plus, Trash2, GripVertical, Search, X, Workflow } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/utils/error-handler'

type EditableStep = {
  id: string
  processId: string
  processName: string
  assignedTo: string
  machineId: string
  status: string
  orderIndex: number
  isLocked: boolean
  isMachineBased: boolean
}

export default function EditJobPage() {
  const params = useParams()
  const router = useRouter()

  const [job, setJob] = useState<any>(null)
  const [customers, setCustomers] = useState<any[]>([])
  const [processes, setProcesses] = useState<any[]>([])
  const [processGroups, setProcessGroups] = useState<any[]>([])
  const [ungroupedProcesses, setUngroupedProcesses] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [dealers, setDealers] = useState<any[]>([])
  const [loadingDealers, setLoadingDealers] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer_id: '',
    dealer_id: '',
    due_date: '',
    priority: 'normal',
  })

  const [steps, setSteps] = useState<EditableStep[]>([])
  const [savingStepId, setSavingStepId] = useState<string | null>(null)
  const [draggingStepId, setDraggingStepId] = useState<string | null>(null)
  const dragStartOrderRef = useRef<Map<string, number>>(new Map())
  const [processPanelOpen, setProcessPanelOpen] = useState(false)
  const [processSearch, setProcessSearch] = useState('')
  const [selectedProcessIds, setSelectedProcessIds] = useState<Set<string>>(new Set())
  const [addingProcesses, setAddingProcesses] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  useEffect(() => {
    const customerId = formData.customer_id
    if (!customerId) {
      setDealers([])
      setFormData((prev) => (prev.dealer_id ? { ...prev, dealer_id: '' } : prev))
      return
    }

    let cancelled = false
    const fetchDealers = async () => {
      try {
        setLoadingDealers(true)
        const response = await customersAPI.getDealers(customerId)
        const list = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : []
        if (cancelled) return
        setDealers(list)
        setFormData((prev) => {
          if (list.some((dealer: any) => dealer.id === prev.dealer_id)) {
            return prev
          }
          if (!prev.dealer_id) {
            return prev
          }
          return { ...prev, dealer_id: '' }
        })
      } catch (error) {
        if (!cancelled) {
          handleApiError(error, 'Dealers load')
          setDealers([])
          setFormData((prev) => (prev.dealer_id ? { ...prev, dealer_id: '' } : prev))
        }
      } finally {
        if (!cancelled) {
          setLoadingDealers(false)
        }
      }
    }

    void fetchDealers()

    return () => {
      cancelled = true
    }
  }, [formData.customer_id])

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
      const fetchedGroups = (processPayload.groups ?? []).map((group: any) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        processes: (group.processes ?? []).map((process: any) => ({
          id: process.id,
          name: process.name,
          code: process.code,
          description: process.description,
          is_machine_based: !!process.is_machine_based,
          is_production: !!process.is_production,
          order_index: process.order_index ?? 0,
          group_id: group.id,
          group_name: group.name,
        })),
      }))

      const fetchedUngrouped = (processPayload.ungrouped ?? []).map((process: any) => ({
        id: process.id,
        name: process.name,
        code: process.code,
        description: process.description,
        is_machine_based: !!process.is_machine_based,
        is_production: !!process.is_production,
        order_index: process.order_index ?? 0,
        group_id: null,
        group_name: 'Grupsuz',
      }))

      setProcessGroups(fetchedGroups)
      setUngroupedProcesses(fetchedUngrouped)
      const processList = [
        ...fetchedGroups.flatMap((group: any) => group.processes ?? []),
        ...fetchedUngrouped,
      ]
      const processMapById = new Map<string, any>()
      processList.forEach((process: any) => {
        if (process?.id) {
          processMapById.set(process.id, process)
        }
      })
      setProcesses(processList)
      setUsers(usersRes.data || usersRes || [])
      setMachines(machinesRes.data || machinesRes || [])

      setFormData({
        title: jobData.title || '',
        description: jobData.description || '',
        customer_id: jobData.customer?.id || '',
        dealer_id: jobData.dealer?.id || '',
        due_date: jobData.due_date ? jobData.due_date.split('T')[0] : '',
        priority: jobData.priority || 'normal',
      })

      const stepList = (jobData.steps || []) as any[]
      const orderedSteps = stepList
        .slice()
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((step, index) => {
          const processId = step.process?.id || ''
          const processName = step.process?.name || 'Süreç'
          const processDetails = processMapById.get(processId)
          const isMachineBased = Boolean(
            processDetails?.is_machine_based ?? step.process?.is_machine_based,
          )

          return {
            id: step.id,
            processId,
            processName,
            assignedTo: step.assigned_to?.id || '',
            machineId: isMachineBased ? step.machine?.id || '' : '',
            status: step.status,
            orderIndex: step.order_index ?? index,
            isLocked: ['completed', 'canceled'].includes(step.status),
            isMachineBased,
          }
        })
      setSteps(orderedSteps)
      setSelectedProcessIds(new Set())
      setProcessPanelOpen(false)
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

  function handleStepFieldChange(stepId: string, field: 'assignedTo' | 'machineId', value: string) {
    setSteps((prev) =>
      prev.map((step) => {
        if (step.id !== stepId) {
          return step
        }
        if (field === 'machineId' && !step.isMachineBased) {
          return step
        }
        return { ...step, [field]: value }
      }),
    )
  }

  async function handleStepSave(stepId: string) {
    const step = steps.find((item) => item.id === stepId)
    if (!step) return

    try {
      setSavingStepId(stepId)
      await jobsAPI.updateStep(stepId, {
        assigned_to: step.assignedTo || null,
        machine_id: step.isMachineBased ? step.machineId || null : null,
      })
      toast.success('Süreç güncellendi')
      await loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Süreç güncellenemedi')
    } finally {
      setSavingStepId(null)
    }
  }

  const existingProcessIds = useMemo(
    () => new Set(steps.map((step) => step.processId)),
    [steps],
  )

  const filteredProcessGroups = useMemo(() => {
    const term = processSearch.trim().toLowerCase()
    const matchProcess = (process: any) => {
      if (!term) return true
      const name = (process?.name ?? '').toLowerCase()
      const code = (process?.code ?? '').toLowerCase()
      return name.includes(term) || code.includes(term)
    }

    const grouped = (processGroups ?? [])
      .map((group: any) => ({
        id: group.id,
        name: group.name,
        processes: (group.processes ?? []).filter(matchProcess),
      }))
      .filter((group: any) => group.processes.length > 0)

    const ungrouped = (ungroupedProcesses ?? []).filter(matchProcess)

    if (ungrouped.length > 0) {
      grouped.push({
        id: '__ungrouped__',
        name: 'Grupsuz Süreçler',
        processes: ungrouped,
      })
    }

    return grouped
  }, [processGroups, ungroupedProcesses, processSearch])

  const processSelectionCount = selectedProcessIds.size

  const openProcessPanel = () => {
    setProcessPanelOpen(true)
    setProcessSearch('')
    setSelectedProcessIds(new Set())
  }

  const closeProcessPanel = () => {
    setProcessPanelOpen(false)
    setProcessSearch('')
    setSelectedProcessIds(new Set())
  }

  const toggleProcessSelection = (processId: string) => {
    setSelectedProcessIds((prev) => {
      const next = new Set(prev)
      if (next.has(processId)) {
        next.delete(processId)
      } else {
        next.add(processId)
      }
      return next
    })
  }

  const reorderSteps = (
    list: EditableStep[],
    draggedId: string,
    targetId: string | null,
  ) => {
    const fromIndex = list.findIndex((step) => step.id === draggedId)
    if (fromIndex === -1) return list
    const draggedStep = list[fromIndex]
    if (draggedStep.isLocked) return list

    const working = list.slice()
    working.splice(fromIndex, 1)

    let insertionIndex = working.length
    if (targetId) {
      insertionIndex = working.findIndex((step) => step.id === targetId)
      if (insertionIndex === -1) {
        insertionIndex = working.length
      }
    }

    working.splice(insertionIndex, 0, draggedStep)

    return working.map((step, index) => ({ ...step, orderIndex: index }))
  }

  const handleStepDragStart = (stepId: string) => {
    const step = steps.find((item) => item.id === stepId)
    if (!step || step.isLocked) return
    setDraggingStepId(stepId)
    dragStartOrderRef.current = new Map(steps.map((item, index) => [item.id, index]))
  }

  const handleStepDragOver = (targetStepId: string) => {
    if (!draggingStepId || draggingStepId === targetStepId) return
    setSteps((prev) => reorderSteps(prev, draggingStepId, targetStepId))
  }

  const handleStepListDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!draggingStepId) return
    if (event.target !== event.currentTarget) return
    setSteps((prev) => reorderSteps(prev, draggingStepId, null))
  }

  const persistStepOrder = async () => {
    if (!job) return
    const previousOrder = dragStartOrderRef.current
    if (!previousOrder || previousOrder.size === 0) return
    const updates = steps
      .map((step, index) => ({ step, index }))
      .filter(({ step, index }) => previousOrder.get(step.id) !== index)
      .filter(({ step }) => !step.isLocked)

    if (updates.length === 0) return

    try {
      await Promise.all(
        updates.map(({ step, index }) =>
          jobsAPI.updateStep(step.id, {
            order_index: index,
          }),
        ),
      )
      toast.success('Süreç sıralaması güncellendi')
      await loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Sıralama güncellenemedi')
      await loadData()
    }
  }

  const handleStepDragEnd = () => {
    if (draggingStepId) {
      void persistStepOrder()
    }
    setDraggingStepId(null)
    dragStartOrderRef.current = new Map()
  }

  const handleAddSelectedProcesses = async () => {
    if (!job) return
    const ids = Array.from(selectedProcessIds).filter((id) => !existingProcessIds.has(id))
    if (ids.length === 0) {
      toast.error('Lütfen eklenecek süreçleri seçin')
      return
    }

    try {
      setAddingProcesses(true)
      const baseJobDate = job.due_date ? job.due_date.split('T')[0] : ''
      const computeDefaultDueDate = () => {
        if (baseJobDate) {
          return baseJobDate
        }
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow.toISOString().slice(0, 10)
      }
      const defaultDueDate = computeDefaultDueDate()
      for (const processId of ids) {
        await jobsAPI.addStep(job.id, {
          process_id: processId,
          due_date: defaultDueDate,
          due_time: '23:59',
        })
      }
      toast.success(`${ids.length} süreç eklendi`)
      closeProcessPanel()
      await loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Süreçler eklenemedi')
    } finally {
      setAddingProcesses(false)
    }
  }

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
    <div className="w-full max-w-full space-y-6">
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
        <div className="grid gap-6 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(360px,420px)_minmax(0,1fr)] items-start">
          <Card className="w-full">
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
                  setFormData((prev) => ({
                    ...prev,
                    customer_id: e.target.value,
                    dealer_id: '',
                  }))
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
              <Label htmlFor="dealer_id">Bayi</Label>
              <select
                id="dealer_id"
                value={formData.dealer_id}
                onChange={(e) => setFormData({ ...formData, dealer_id: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                disabled={
                  saving || !formData.customer_id || loadingDealers || dealers.length === 0
                }
              >
                <option value="">Bayi Seç (Opsiyonel)</option>
                {dealers.map((dealer) => (
                  <option key={dealer.id} value={dealer.id}>
                    {dealer.name}
                  </option>
                ))}
              </select>
              {loadingDealers && (
                <p className="text-xs text-gray-500">Bayi listesi yükleniyor…</p>
              )}
              {formData.customer_id && !loadingDealers && dealers.length === 0 && (
                <p className="text-xs text-gray-500">Bu müşteri için tanımlı bayi bulunmuyor.</p>
              )}
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

          <Card className="w-full">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Süreçler
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={openProcessPanel}>
                <Plus className="mr-2 h-4 w-4" />
                Süreç Ekle
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.length > 0 ? (
              <div className="space-y-2">
                <div className="hidden xl:grid grid-cols-[48px_minmax(200px,1fr)_minmax(160px,220px)_minmax(160px,220px)_auto] items-center gap-3 rounded-md bg-gray-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <span>Sıra</span>
                  <span>Süreç</span>
                  <span>Sorumlu</span>
                  <span>Makine</span>
                  <span className="text-right">İşlem</span>
                </div>
                <div
                  className="space-y-2"
                  onDragOver={handleStepListDragOver}
                  onDrop={(event) => event.preventDefault()}
                >
                  {steps.map((step, index) => {
                    const disabled = savingStepId === step.id || saving || step.isLocked
                    const canDelete = ['pending', 'ready'].includes(step.status)
                    const machineFieldDisabled = disabled || !step.isMachineBased

                    return (
                      <div
                        key={step.id}
                        className={`rounded-lg border bg-white px-3 py-2 shadow-sm transition ${step.isLocked ? 'opacity-80' : ''}`}
                        draggable={!step.isLocked}
                        onDragStart={() => handleStepDragStart(step.id)}
                        onDragEnd={handleStepDragEnd}
                        onDragOver={(event) => {
                          event.preventDefault()
                          handleStepDragOver(step.id)
                        }}
                        onDrop={(event) => event.preventDefault()}
                      >
                        <div className="flex flex-wrap items-center gap-4">
                          <div className={`flex items-center gap-2 flex-shrink-0 ${step.isLocked ? 'cursor-not-allowed text-gray-300' : 'cursor-grab text-gray-400 hover:text-gray-500'}`}>
                            <GripVertical className="h-4 w-4" />
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                              {index + 1}
                            </div>
                          </div>
                          <div className="min-w-[200px] flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{step.processName}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${getStatusBadge(step.status)}`}>
                                {step.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-[160px] flex-1 sm:flex-none">
                            <select
                              value={step.assignedTo}
                              onChange={(e) => handleStepFieldChange(step.id, 'assignedTo', e.target.value)}
                              className="h-9 w-full rounded border border-gray-300 px-2 text-sm"
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
                          <div className="min-w-[160px] flex-1 sm:flex-none">
                            {step.isMachineBased ? (
                              <select
                                value={step.machineId}
                                onChange={(e) => handleStepFieldChange(step.id, 'machineId', e.target.value)}
                                className="h-9 w-full rounded border border-gray-300 px-2 text-sm"
                                disabled={machineFieldDisabled}
                              >
                                <option value="">Seçilmedi</option>
                                {machines.map((machine) => (
                                  <option key={machine.id} value={machine.id}>
                                    {machine.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Makine gerekmez</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleStepSave(step.id)}
                              disabled={disabled}
                              className="whitespace-nowrap"
                            >
                              {savingStepId === step.id ? 'Kaydediliyor...' : 'Kaydet'}
                            </Button>
                            {canDelete && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteStep(step.id, step.processName)}
                                disabled={disabled}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <Workflow className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-3">Henüz süreç eklenmemiş</p>
                <Button type="button" variant="outline" size="sm" onClick={openProcessPanel}>
                  <Plus className="mr-2 h-4 w-4" />
                  İlk Süreci Ekle
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

        {processPanelOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-40"
              onClick={closeProcessPanel}
            />
            <div className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Süreç Seç</h2>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={closeProcessPanel} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-1 flex-col overflow-hidden p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Süreç adı veya kodu ara..."
                    value={processSearch}
                    onChange={(e) => setProcessSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto">
                  {filteredProcessGroups.length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-500">
                      {processSearch ? 'Arama sonucu bulunamadı' : 'Tanımlı süreç bulunmuyor'}
                    </p>
                  ) : (
                    filteredProcessGroups.map((group) => (
                      <div key={group.id} className="rounded-lg border">
                        <div className="bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
                          {group.name}
                        </div>
                        <div className="divide-y">
                          {group.processes.map((process: any) => {
                            const alreadyAdded = existingProcessIds.has(process.id)
                            const isSelected = selectedProcessIds.has(process.id)
                            return (
                              <button
                                key={process.id}
                                type="button"
                                onClick={() => {
                                  if (!alreadyAdded) toggleProcessSelection(process.id)
                                }}
                                className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors ${
                                  alreadyAdded
                                    ? 'cursor-not-allowed bg-green-50'
                                    : isSelected
                                      ? 'bg-blue-50'
                                      : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={alreadyAdded || isSelected}
                                    readOnly
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{process.name}</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                      <span>{process.code}</span>
                                      <div className="flex items-center gap-1">
                                        {process.is_machine_based && (
                                          <Badge variant="outline" className="text-[10px]">
                                            Makine Bazlı
                                          </Badge>
                                        )}
                                        {process.is_production && (
                                          <Badge variant="outline" className="text-[10px]">
                                            Üretim
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {alreadyAdded && (
                                  <span className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                                    Eklendi
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={closeProcessPanel}>
                    İptal
                  </Button>
                  <Button type="button" onClick={handleAddSelectedProcesses} disabled={addingProcesses || processSelectionCount === 0}>
                    <Plus className="mr-2 h-4 w-4" />
                    {addingProcesses ? 'Ekleniyor...' : 'Seçilenleri Ekle'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

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
