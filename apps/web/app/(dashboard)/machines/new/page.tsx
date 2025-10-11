'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { machinesAPI, processesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function NewMachinePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [processes, setProcesses] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: '',
    status: 'active',
    location: '',
    capacity_per_hour: '',
    notes: '',
    process_ids: [] as string[],
  })

  useEffect(() => {
    loadProcesses()
  }, [])

  async function loadProcesses() {
    try {
      const response = await processesAPI.getAll()
      setProcesses(response.data || [])
    } catch (error) {
      console.error('Processes load error:', error)
    }
  }

  function toggleProcess(processId: string) {
    setFormData(prev => ({
      ...prev,
      process_ids: prev.process_ids.includes(processId)
        ? prev.process_ids.filter(id => id !== processId)
        : [...prev.process_ids, processId]
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await machinesAPI.create(formData)
      toast.success('Makine başarıyla oluşturuldu!')
      router.push('/machines')
    } catch (error: any) {
      console.error('Machine create error:', error)
      toast.error(error.response?.data?.error || 'Makine oluşturulurken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/machines">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Makinelere Dön
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Yeni Makine Ekle</h1>
        <p className="text-gray-600 mt-1">Yeni makine tanımlayın ve süreçlere bağlayın</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Temel Bilgiler */}
        <Card>
          <CardHeader>
            <CardTitle>Makine Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Makine Adı *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Örn: HP Latex 360"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Makine Kodu *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="Örn: HP-360"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Makine Tipi</Label>
                <Input
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="Örn: Baskı Makinesi"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Durum</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={loading}
                >
                  <option value="active">Aktif</option>
                  <option value="maintenance">Bakımda</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Konum</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Örn: Üretim Katı - Sağ"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity_per_hour">Kapasite (Saat/Birim)</Label>
                <Input
                  id="capacity_per_hour"
                  type="number"
                  step="0.01"
                  value={formData.capacity_per_hour}
                  onChange={(e) => setFormData({ ...formData, capacity_per_hour: e.target.value })}
                  placeholder="Örn: 25.5"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Makine hakkında notlar..."
                rows={3}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Süreç Bağlantıları */}
        <Card>
          <CardHeader>
            <CardTitle>Süreç Bağlantıları</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Bu makine hangi süreçlerde kullanılabilir? (Birden fazla seçebilirsiniz)
            </p>

            {processes.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">
                Henüz süreç tanımlanmamış. <Link href="/processes" className="text-blue-600 hover:underline">Süreç ekleyin</Link>
              </p>
            ) : (
              <div className="space-y-2">
                {processes.map((process) => (
                  <label
                    key={process.id}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.process_ids.includes(process.id)}
                      onChange={() => toggleProcess(process.id)}
                      className="w-4 h-4 rounded border-gray-300"
                      disabled={loading}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{process.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{process.code}</div>
                    </div>
                    {process.is_machine_based && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Makine Bazlı
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {formData.process_ids.length > 0 && (
              <p className="text-sm text-green-600 mt-4">
                ✓ {formData.process_ids.length} süreç seçildi
              </p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Oluşturuluyor...' : 'Makine Oluştur'}
          </Button>
          <Link href="/machines">
            <Button type="button" variant="outline" disabled={loading}>
              İptal
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}