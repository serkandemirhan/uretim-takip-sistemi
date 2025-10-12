'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { jobsAPI, customersAPI, processesAPI ,usersAPI} from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Plus, X, GripVertical, Workflow } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface ProcessStep {
  process_id: string
  process_name?: string
  process_code?: string
  assigned_to?: string
  assigned_to_name?: string
  machine_id?: string
  machine_name?: string
  is_parallel: boolean
  estimated_duration?: number
}

export default function NewJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [processes, setProcesses] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [machines, setMachines] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer_id: '',
    due_date: '',
    priority: 'normal',
  })
  
  const [selectedSteps, setSelectedSteps] = useState<ProcessStep[]>([])
  const [showProcessSelector, setShowProcessSelector] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
  try {
    const [customersRes, processesRes, usersRes, machinesRes] = await Promise.all([
      customersAPI.getAll(),
      processesAPI.getAll(),
      usersAPI.getAll(), // ← GÜNCEL: Users API'den çek
      import('@/lib/api/client').then(m => m.apiClient.get('/api/machines'))
    ])
    
    setCustomers(customersRes.data || [])
    setProcesses(processesRes.data || [])
    setUsers(usersRes.data || []) // ← GÜNCEL: State'e set et
    setMachines(machinesRes.data?.data || [])
  } catch (error) {
    handleApiError(error, 'Load data')
  }
}

  function addProcess(process: any) {
    const newStep: ProcessStep = {
      process_id: process.id,
      process_name: process.name,
      process_code: process.code,
      assigned_to: '',
      machine_id: '',
      is_parallel: false,
      estimated_duration: undefined,
    }
    setSelectedSteps([...selectedSteps, newStep])
    setShowProcessSelector(false)
  }

  function removeStep(index: number) {
    setSelectedSteps(selectedSteps.filter((_, i) => i !== index))
  }

  function updateStep(index: number, field: keyof ProcessStep, value: any) {
    const updated = [...selectedSteps]
    updated[index] = { ...updated[index], [field]: value }
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
          machine_id: step.machine_id || null,
          is_parallel: step.is_parallel,
          estimated_duration: step.estimated_duration || null,
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
    <div className="max-w-4xl space-y-6">
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
        {/* Temel Bilgiler */}
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
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
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
              <div className="space-y-2">
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
        <Card>
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
                onClick={() => setShowProcessSelector(true)}
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProcessSelector(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Süreci Ekle
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedSteps.map((step, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start gap-3">
                      {/* Drag Handle */}
                      <div className="pt-2">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                      </div>

                      {/* Order Badge */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm flex-shrink-0 mt-1">
                        {index + 1}
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-3">
                        {/* Süreç Adı */}
                        <div>
                          <div className="font-medium text-gray-900">{step.process_name}</div>
                          <code className="text-xs text-gray-500">{step.process_code}</code>
                        </div>

                        {/* Atamalar */}
                        <div className="grid gap-3 md:grid-cols-2">
                          {/* Sorumlu Kullanıcı */}
                          <div className="space-y-1">
                            <Label className="text-xs">Sorumlu Kişi</Label>
                            <select
                              value={step.assigned_to}
                              onChange={(e) => updateStep(index, 'assigned_to', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                            >
                              <option value="">Seçiniz...</option>
                              {users.map(user => (
                                <option key={user.id} value={user.id}>
                                  {user.full_name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Makine */}
                          <div className="space-y-1">
                            <Label className="text-xs">Makine</Label>
                            <select
                              value={step.machine_id}
                              onChange={(e) => updateStep(index, 'machine_id', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                            >
                              <option value="">Seçiniz...</option>
                              {machines.map(machine => (
                                <option key={machine.id} value={machine.id}>
                                  {machine.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Ek Ayarlar */}
                        <div className="flex items-center gap-4 text-sm">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={step.is_parallel}
                              onChange={(e) => updateStep(index, 'is_parallel', e.target.checked)}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-gray-700">Paralel Çalışabilir</span>
                          </label>

                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Tahmini Süre (dk)</Label>
                            <Input
                              type="number"
                              value={step.estimated_duration || ''}
                              onChange={(e) => updateStep(index, 'estimated_duration', parseInt(e.target.value))}
                              placeholder="60"
                              className="w-20 h-7 text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProcessSelector(true)}
                  className="w-full border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Başka Süreç Ekle
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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

      {/* Process Selector Modal */}
      {showProcessSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Süreç Seç</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProcessSelector(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              {processes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Henüz süreç tanımlanmamış
                </p>
              ) : (
                <div className="space-y-2">
                  {processes
                    .filter(p => !selectedSteps.find(s => s.process_id === p.id))
                    .map((process) => (
                      <button
                        key={process.id}
                        type="button"
                        onClick={() => addProcess(process)}
                        className="w-full text-left p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{process.name}</div>
                            <code className="text-xs text-gray-500">{process.code}</code>
                          </div>
                          <div className="flex gap-2">
                            {process.is_machine_based && (
                              <Badge variant="outline" className="text-xs">
                                Makine Bazlı
                              </Badge>
                            )}
                            {process.is_production && (
                              <Badge variant="outline" className="text-xs">
                                Üretim
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}