'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { jobsAPI, customersAPI, processesAPI, usersAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save, Plus, X, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

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

  useEffect(() => {
    loadData()
  }, [params.id])

  async function loadData() {
    try {
      setLoading(true)
      const [jobRes, customersRes, processesRes, usersRes, machinesRes] = await Promise.all([
        jobsAPI.getById(params.id as string),
        customersAPI.getAll(),
        processesAPI.getAll(),
        usersAPI.getAll(),
        import('@/lib/api/client').then(m => m.apiClient.get('/api/machines'))
      ])
      
      const jobData = jobRes.data
      setJob(jobData)
      setCustomers(customersRes.data || [])
      setProcesses(processesRes.data || [])
      setUsers(usersRes.data || [])
      setMachines(machinesRes.data?.data || [])
      
      // Form'u doldur
      setFormData({
        title: jobData.title || '',
        description: jobData.description || '',
        customer_id: jobData.customer_id || '',
        due_date: jobData.due_date ? jobData.due_date.split('T')[0] : '',
        priority: jobData.priority || 'normal',
      })
      
    } catch (error) {
      console.error('Load error:', error)
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
      toast.error(error.response?.data?.error || 'Güncelleme başarısız')
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
      toast.error(error.response?.data?.error || 'Silme başarısız')
    }
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
    <div className="max-w-4xl space-y-6">
      <Link href={`/jobs/${params.id}`}>
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          İş Detayına Dön
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">İş Düzenle</h1>
        <p className="text-gray-600 mt-1">{job.job_number}</p>
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
                required
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_id">Müşteri</Label>
              <select
                id="customer_id"
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Öncelik</Label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
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

        {/* Süreçler */}
        <Card>
          <CardHeader>
            <CardTitle>Süreç Adımları</CardTitle>
          </CardHeader>
          <CardContent>
            {job.steps && job.steps.length > 0 ? (
              <div className="space-y-3">
                {job.steps.map((step: any, index: number) => (
                  <div key={step.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{step.process?.name}</div>
                      <div className="text-xs text-gray-500">
                        {step.assigned_to_profile?.full_name && `👤 ${step.assigned_to_profile.full_name}`}
                        {step.machine && ` • 🖨️ ${step.machine.name}`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        step.status === 'completed' ? 'bg-green-100 text-green-700' :
                        step.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                        step.status === 'ready' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {step.status}
                      </span>
                      {(step.status === 'pending' || step.status === 'ready') && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStep(step.id, step.process?.name)}
                          className="h-8 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Henüz süreç eklenmemiş</p>
            )}
            
            <p className="text-xs text-gray-500 mt-4">
              ℹ️ Sadece beklemede veya hazır durumdaki süreçler silinebilir
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
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