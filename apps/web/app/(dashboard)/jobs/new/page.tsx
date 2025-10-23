'use client'

import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { jobsAPI, customersAPI, processesAPI, usersAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, X, GripVertical, Workflow, Search, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/utils/error-handler'

const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY

function splitDurationMinutes(totalMinutes?: number | null) {
  if (totalMinutes == null) {
    return { days: 1, hours: 0 }
  }
  const safeMinutes = Math.max(0, Math.floor(Number(totalMinutes) || 0))
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

interface ProcessStep {
  process_id: string
  process_name?: string
  process_code?: string
  process_description?: string
  assigned_to?: string
  assigned_to_name?: string
  machine_id?: string
  machine_name?: string
  is_parallel: boolean
  estimated_duration?: number
  estimated_duration_days?: number
  estimated_duration_hours?: number
  due_date?: string
  due_time?: string
  group_name?: string | null
  is_machine_based?: boolean
  requirements?: string
}

export default function NewJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [processes, setProcesses] = useState<any[]>([])
  const [processGroups, setProcessGroups] = useState<any[]>([])
  const [ungroupedProcesses, setUngroupedProcesses] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  const [dealers, setDealers] = useState<any[]>([])
  const [loadingDealers, setLoadingDealers] = useState(false)
  const [isAddingDealer, setIsAddingDealer] = useState(false)
  const [newDealerName, setNewDealerName] = useState('')
  const [creatingDealer, setCreatingDealer] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer_id: '',
    dealer_id: '',
    due_date: '',
    priority: 'normal',
  })
  
  const [selectedSteps, setSelectedSteps] = useState<ProcessStep[]>([])
  const [processPanelOpen, setProcessPanelOpen] = useState(false)
  const [processSearch, setProcessSearch] = useState('')
  const [selectedProcessIds, setSelectedProcessIds] = useState<Set<string>>(new Set())
  const [draggingStepId, setDraggingStepId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadDealersForCustomer = useCallback(
    async (customerId: string) => {
      try {
        setLoadingDealers(true)
        const response = await customersAPI.getDealers(customerId)
        const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
        setDealers(list)
        setFormData((prev) => {
          if (list.some((dealer: any) => dealer.id === prev.dealer_id)) {
            return prev
          }
          return { ...prev, dealer_id: '' }
        })
        return list
      } catch (error) {
        handleApiError(error, 'Dealers load')
        setDealers([])
        setFormData((prev) => ({ ...prev, dealer_id: '' }))
        return []
      } finally {
        setLoadingDealers(false)
      }
    },
    [],
  )

  useEffect(() => {
    const customerId = formData.customer_id
    if (!customerId) {
      setDealers([])
      setFormData((prev) => {
        if (!prev.dealer_id) {
          return prev
        }
        return { ...prev, dealer_id: '' }
      })
      setIsAddingDealer(false)
      setNewDealerName('')
      return
    }

    void loadDealersForCustomer(customerId)
  }, [formData.customer_id, loadDealersForCustomer])

  const handleCancelCreateDealer = () => {
    if (creatingDealer) {
      return
    }
    setIsAddingDealer(false)
    setNewDealerName('')
  }

  const handleCreateDealer = async () => {
    const customerId = formData.customer_id
    if (!customerId) {
      toast.error('Önce bir müşteri seçmelisiniz')
      return
    }

    const trimmedName = newDealerName.trim()
    if (!trimmedName) {
      toast.error('Bayi adı zorunludur')
      return
    }

    setCreatingDealer(true)
    try {
      const response = await customersAPI.createDealer(customerId, { name: trimmedName })
      const createdId = response?.data?.id ?? response?.id
      if (!createdId) {
        throw new Error('Oluşturulan bayinin kimliği alınamadı')
      }

      const dealerId = String(createdId)
      const list = await loadDealersForCustomer(customerId)
      if (!list.some((dealer: any) => dealer?.id === dealerId)) {
        setDealers((prev) => {
          const next = [...prev, { id: dealerId, name: trimmedName }]
          return next.sort((a, b) => (a?.name ?? '').localeCompare(b?.name ?? '', 'tr', { sensitivity: 'base' }))
        })
      }
      setFormData((prev) => ({ ...prev, dealer_id: dealerId }))
      setIsAddingDealer(false)
      setNewDealerName('')
      toast.success('Bayi eklendi')
    } catch (error) {
      handleApiError(error, 'Bayi ekleme')
    } finally {
      setCreatingDealer(false)
    }
  }

  async function loadData() {
    try {
      const [customersRes, processesRes, usersRes, machinesRes] = await Promise.all([
        customersAPI.getAll(),
        processesAPI.getAll(),
        usersAPI.getAll(),
        import('@/lib/api/client').then((m) => m.apiClient.get('/api/machines')),
      ])

      setCustomers(customersRes.data || [])

      const processPayload = processesRes?.data ?? processesRes ?? {}
      const fetchedGroups = (processPayload.groups ?? []).map((group: any) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        color: group.color,
        processes: (group.processes ?? []).map((process: any) => ({
          id: process.id,
          name: process.name,
          code: process.code,
          description: process.description,
          is_machine_based: !!process.is_machine_based,
          is_production: !!process.is_production,
          machine_count: process.machine_count ?? 0,
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
        machine_count: process.machine_count ?? 0,
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
      setProcesses(processList)

      setUsers(usersRes.data || [])
      setMachines(machinesRes.data?.data || [])
    } catch (error) {
      handleApiError(error, 'Load data')
    }
  }

  const processMap = useMemo(() => {
    const map = new Map<string, any>()
    processes.forEach((process) => {
      if (process?.id) {
        map.set(process.id, process)
      }
    })
    return map
  }, [processes])

  const existingProcessIds = useMemo(
    () => new Set(selectedSteps.map((step) => step.process_id)),
    [selectedSteps],
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
      .filter((group) => group.processes.length > 0)

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

  const reorderSteps = (
    list: ProcessStep[],
    draggedProcessId: string,
    targetProcessId: string | null,
  ) => {
    const sourceIndex = list.findIndex((step) => step.process_id === draggedProcessId)
    if (sourceIndex === -1) return list

    const working = list.slice()
    const [moved] = working.splice(sourceIndex, 1)

    let insertionIndex = working.length
    if (targetProcessId) {
      insertionIndex = working.findIndex((step) => step.process_id === targetProcessId)
      if (insertionIndex === -1) {
        insertionIndex = working.length
      }
    }

    working.splice(insertionIndex, 0, moved)

    const unchanged = working.every((item, idx) => item === list[idx])
    return unchanged ? list : working
  }

  const handleStepDragStart = (processId: string) => {
    setDraggingStepId(processId)
  }

  const handleStepDragEnd = () => {
    setDraggingStepId(null)
  }

  const handleStepDragOver = (targetProcessId: string) => {
    if (!draggingStepId || draggingStepId === targetProcessId) return
    setSelectedSteps((prev) => reorderSteps(prev, draggingStepId, targetProcessId))
  }

  const handleStepListDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!draggingStepId) return
    if (event.target !== event.currentTarget) return
    setSelectedSteps((prev) => reorderSteps(prev, draggingStepId, null))
  }

  const openProcessPanel = () => {
    setSelectedProcessIds(new Set())
    setProcessSearch('')
    setProcessPanelOpen(true)
  }

  const closeProcessPanel = () => {
    setProcessPanelOpen(false)
    setSelectedProcessIds(new Set())
    setProcessSearch('')
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

  const createStepFromProcess = (process: any): ProcessStep => {
    const now = new Date()
    let baseDate = formData.due_date
    let dateRef = baseDate ? new Date(`${baseDate}T00:00:00`) : new Date(now)
    if (Number.isNaN(dateRef.getTime())) {
      dateRef = new Date(now)
    }
    const dueDateObj = new Date(dateRef)
    dueDateObj.setDate(dueDateObj.getDate() + 1)
    const defaultDueDate = dueDateObj.toISOString().slice(0, 10)

    const defaultDurationMinutes = MINUTES_PER_DAY

    return {
      process_id: process.id,
      process_name: process.name,
      process_code: process.code,
      process_description: process.description || '',
      assigned_to: '',
      machine_id: '',
      is_parallel: false,
      estimated_duration: defaultDurationMinutes,
      estimated_duration_days: 1,
      estimated_duration_hours: 0,
      due_date: defaultDueDate,
      due_time: '23:59',
      group_name: process.group_name ?? null,
      is_machine_based: !!process.is_machine_based,
    }
  }

  const handleAddSelectedProcesses = () => {
    const candidateIds = Array.from(selectedProcessIds).filter(
      (id) => !existingProcessIds.has(id),
    )

    if (candidateIds.length === 0) {
      toast.error('Yeni süreç seçmediniz')
      return
    }

    const stepsToAdd = candidateIds
      .map((id) => {
        const process = processMap.get(id)
        if (!process) {
          return null
        }
        return createStepFromProcess(process)
      })
      .filter(Boolean) as ProcessStep[]

    if (stepsToAdd.length === 0) {
      toast.error('Seçilen süreçler eklenemedi')
      return
    }

    setSelectedSteps((prev) => [...prev, ...stepsToAdd])
    toast.success(`${stepsToAdd.length} süreç eklendi`)
    closeProcessPanel()
  }

  function removeStep(index: number) {
    setSelectedSteps(selectedSteps.filter((_, i) => i !== index))
  }

  function updateStep(index: number, field: keyof ProcessStep, value: any) {
    const updated = [...selectedSteps]
    const current = updated[index]
    if (!current) {
      return
    }

    if (field === 'machine_id' && !current.is_machine_based) {
      return
    }

    if (field === 'estimated_duration_days' || field === 'estimated_duration_hours') {
      const numeric = Math.max(0, Math.floor(Number(value) || 0))
      const next = {
        ...current,
        [field]: numeric,
      }
      const combined = combineDurationMinutes(next.estimated_duration_days, next.estimated_duration_hours)
      const normalized = splitDurationMinutes(combined)
      updated[index] = {
        ...next,
        estimated_duration: combined,
        estimated_duration_days: normalized.days,
        estimated_duration_hours: normalized.hours,
      }
      setSelectedSteps(updated)
      return
    }

    updated[index] = { ...current, [field]: value }
    setSelectedSteps(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (selectedSteps.length === 0) {
      toast.error('En az bir süreç eklemelisiniz')
      return
    }

    setLoading(true)

    try {
      const jobData = {
        ...formData,
        steps: selectedSteps.map(step => ({
          process_id: step.process_id,
          assigned_to: step.assigned_to || null,
          machine_id: step.is_machine_based ? step.machine_id || null : null,
          is_parallel: step.is_parallel,
          estimated_duration: combineDurationMinutes(
            step.estimated_duration_days ?? 1,
            step.estimated_duration_hours ?? 0,
          ),
          due_date: step.due_date || null,
          due_time: step.due_time || null,
          requirements: step.requirements || null,
        }))
      }

      const response = await jobsAPI.create(jobData)
      toast.success('İş başarıyla oluşturuldu!')
      router.push(`/jobs/${response.data.id}`)
    } catch (error: any) {
      handleApiError(error, 'Job create')
      toast.error(error.response?.data?.error || 'İş oluşturulurken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-full space-y-6">
      <Link href="/jobs">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          İşlere Dön
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Yeni İş Oluştur</h1>
        <p className="text-gray-600 mt-1">Yeni bir iş talebi oluşturun ve süreçleri tanımlayın</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(360px,420px)_minmax(0,1fr)] items-start">
          {/* Temel Bilgiler */}
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
                  placeholder="Örn: Totem Baskısı - 6m"
                  required
                  disabled={loading}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={loading}
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
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="dealer_id">Bayi</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!formData.customer_id) {
                      toast.error('Önce bir müşteri seçmelisiniz')
                      return
                    }
                    setIsAddingDealer(true)
                    setNewDealerName('')
                  }}
                  disabled={
                    loading ||
                    loadingDealers ||
                    creatingDealer ||
                    !formData.customer_id ||
                    isAddingDealer
                  }
                >
                  Yeni Ekle
                </Button>
              </div>
              <select
                id="dealer_id"
                value={formData.dealer_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, dealer_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={
                  loading ||
                  !formData.customer_id ||
                  loadingDealers ||
                  dealers.length === 0
                }
              >
                <option value="">Bayi Seç (Opsiyonel)</option>
                {dealers.map((dealer) => (
                  <option key={dealer.id} value={dealer.id}>
                    {dealer.name}
                  </option>
                ))}
              </select>
              {isAddingDealer && (
                <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
                  <div className="space-y-2">
                    <Input
                      value={newDealerName}
                      onChange={(e) => setNewDealerName(e.target.value)}
                      placeholder="Yeni bayi adı"
                      autoFocus
                      disabled={creatingDealer}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelCreateDealer}
                        disabled={creatingDealer}
                      >
                        Vazgeç
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateDealer}
                        disabled={creatingDealer}
                      >
                        {creatingDealer ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Kaydediliyor
                          </span>
                        ) : (
                          'Kaydet'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {loadingDealers && (
                <p className="text-xs text-gray-500">Bayi listesi yükleniyor…</p>
              )}
              {formData.customer_id && !loadingDealers && dealers.length === 0 && !isAddingDealer && (
                <p className="text-xs text-gray-500">
                  Bu müşteri için tanımlı bayi bulunmuyor.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="İş ile ilgili detaylar..."
                  rows={4}
                  disabled={loading}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div
                  className="space-y-2"
                  onDragOver={handleStepListDragOver}
                  onDrop={(event) => event.preventDefault()}
                >
                  <Label htmlFor="due_date">Teslim Tarihi</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Öncelik</Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={loading}
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

          {/* Süreç Seçimi */}
          <Card className="w-full h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Workflow className="w-5 h-5" />
                    Süreçler
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Bu iş için hangi süreçler çalıştırılacak?
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openProcessPanel}
                  disabled={loading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Süreç Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedSteps.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Workflow className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 mb-3">Henüz süreç eklenmedi</p>
                <Button type="button" variant="outline" size="sm" onClick={openProcessPanel}>
                    <Plus className="w-4 h-4 mr-2" />
                    İlk Süreci Ekle
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <span className="flex-shrink-0 w-[44px]">Sıra</span>
                    <span className="min-w-[200px] flex-1">Süreç</span>
                    <span className="hidden sm:block w-6" aria-hidden="true"></span>
                  </div>
                  {selectedSteps.map((step, index) => {
                    return (
                    <div
                      key={step.process_id}
                      className="border rounded-lg bg-gray-50 px-3 py-2"
                      draggable
                      onDragStart={() => handleStepDragStart(step.process_id)}
                      onDragEnd={handleStepDragEnd}
                      onDragOver={(event) => {
                        event.preventDefault()
                        handleStepDragOver(step.process_id)
                      }}
                      onDrop={(event) => event.preventDefault()}
                    >
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-2 flex-shrink-0 cursor-grab">
                          <GripVertical className="h-4 w-4 text-gray-400" />
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                            {index + 1}
                          </div>
                        </div>

                        <div className="min-w-[200px] flex-1">
                          <p className="text-sm font-semibold text-gray-900">{step.process_name}</p>
                          {step.group_name && (
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">
                              {step.group_name}
                            </p>
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(index)}
                          className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading || selectedSteps.length === 0}>
            {loading ? 'Oluşturuluyor...' : 'İş Oluştur (Taslak)'}
          </Button>
          <Link href="/jobs">
            <Button type="button" variant="outline" disabled={loading}>
              İptal
            </Button>
          </Link>
        </div>
      </form>

      {/* Process Selection Panel */}
      {processPanelOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={closeProcessPanel} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Süreç Seç</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={closeProcessPanel} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col flex-1 overflow-hidden p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Süreç adı veya kodu ara..."
                  value={processSearch}
                  onChange={(e) => setProcessSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
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
                                if (alreadyAdded) return
                                toggleProcessSelection(process.id)
                              }}
                              className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors ${
                                alreadyAdded
                                  ? 'bg-green-50 cursor-not-allowed'
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
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
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
                                {alreadyAdded && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-green-200 bg-green-50 text-green-700"
                                  >
                                    Eklendi
                                  </Badge>
                                )}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={closeProcessPanel}>
                  İptal
                </Button>
                <Button
                  onClick={handleAddSelectedProcesses}
                  disabled={processSelectionCount === 0}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Seçilenleri Ekle
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
