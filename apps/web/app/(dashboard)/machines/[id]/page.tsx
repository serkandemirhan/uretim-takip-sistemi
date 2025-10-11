'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { machinesAPI, processesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit2, Save, X, Cpu, Workflow } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function MachineDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [machine, setMachine] = useState<any>(null)
  const [allProcesses, setAllProcesses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([])

  useEffect(() => {
    if (params.id) {
      loadData()
    }
  }, [params.id])

  async function loadData() {
    try {
      setLoading(true)
      
      // Makine detayını yükle
      const machineResponse = await machinesAPI.getById(params.id as string)
      setMachine(machineResponse.data)
      
      // Bağlı süreçleri set et
      const connectedProcessIds = machineResponse.data.processes.map((p: any) => p.id)
      setSelectedProcessIds(connectedProcessIds)
      
      // Tüm süreçleri yükle
      const processesResponse = await processesAPI.getAll()
      setAllProcesses(processesResponse.data || [])
      
    } catch (error) {
      console.error('Machine load error:', error)
      toast.error('Makine yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function toggleProcess(processId: string) {
    setSelectedProcessIds(prev =>
      prev.includes(processId)
        ? prev.filter(id => id !== processId)
        : [...prev, processId]
    )
  }

  async function handleSave() {
    try {
      await machinesAPI.update(params.id as string, {
        process_ids: selectedProcessIds
      })
      toast.success('Süreç bağlantıları güncellendi')
      setEditMode(false)
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Güncelleme başarısız')
    }
  }

  function cancelEdit() {
    // Orijinal süreçlere geri dön
    const connectedProcessIds = machine.processes.map((p: any) => p.id)
    setSelectedProcessIds(connectedProcessIds)
    setEditMode(false)
  }

  function getStatusBadge(status: string) {
    const badges = {
      active: { label: 'Aktif', class: 'bg-green-100 text-green-700' },
      maintenance: { label: 'Bakımda', class: 'bg-yellow-100 text-yellow-700' },
      inactive: { label: 'Pasif', class: 'bg-gray-100 text-gray-700' },
    }
    const badge = badges[status as keyof typeof badges] || badges.active
    return badge.label
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!machine) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Makine bulunamadı</p>
        <Link href="/machines">
          <Button className="mt-4">Makinelere Dön</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/machines">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Makinelere Dön
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{machine.name}</h1>
            <Badge className={
              machine.status === 'active' ? 'bg-green-100 text-green-700' :
              machine.status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }>
              {getStatusBadge(machine.status)}
            </Badge>
          </div>
          <p className="text-gray-600">
            <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">{machine.code}</code>
            {machine.type && <span className="ml-3">{machine.type}</span>}
          </p>
        </div>
      </div>

      {/* Makine Bilgileri */}
      <Card>
        <CardHeader>
          <CardTitle>Makine Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-600 mb-1">Durum</p>
              <p className="font-medium">{getStatusBadge(machine.status)}</p>
            </div>

            {machine.location && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Konum</p>
                <p className="font-medium">{machine.location}</p>
              </div>
            )}

            {machine.capacity_per_hour && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Kapasite (Saat/Birim)</p>
                <p className="font-medium">{machine.capacity_per_hour}</p>
              </div>
            )}

            {machine.notes && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 mb-1">Notlar</p>
                <p className="font-medium whitespace-pre-wrap">{machine.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Süreç Bağlantıları */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Workflow className="w-5 h-5" />
              Bağlı Süreçler ({selectedProcessIds.length})
            </CardTitle>
            {!editMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(true)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Düzenle
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Kaydet
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={cancelEdit}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!editMode ? (
            // Görüntüleme Modu
            <div>
              {machine.processes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Bu makine henüz hiçbir sürece bağlanmamış
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {machine.processes.map((process: any) => (
                    <div
                      key={process.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-blue-50 border-blue-200"
                    >
                      <div className="p-2 bg-blue-100 rounded">
                        <Workflow className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{process.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{process.code}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Düzenleme Modu
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Bu makine hangi süreçlerde kullanılabilir? (Birden fazla seçebilirsiniz)
              </p>

              {allProcesses.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">
                  Henüz süreç tanımlanmamış. <Link href="/processes" className="text-blue-600 hover:underline">Süreç ekleyin</Link>
                </p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allProcesses.map((process) => (
                    <label
                      key={process.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedProcessIds.includes(process.id)
                          ? 'bg-blue-50 border-blue-300'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProcessIds.includes(process.id)}
                        onChange={() => toggleProcess(process.id)}
                        className="w-4 h-4 rounded border-gray-300"
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
                      {process.is_production && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Üretim
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>{selectedProcessIds.length}</strong> süreç seçildi
                </p>
                {selectedProcessIds.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    ⚠️ En az bir süreç seçmelisiniz
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* İstatistikler / Geçmiş Görevler (Opsiyonel - İleride eklenebilir) */}
      <Card>
        <CardHeader>
          <CardTitle>Kullanım İstatistikleri</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">
            İstatistikler yakında eklenecek...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}