'use client'

import { useEffect, useState } from 'react'
import { processesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GripVertical, Save, X, Plus, Edit2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Process {
  id: string
  name: string
  code: string
  description?: string
  is_machine_based: boolean
  is_production: boolean
  order_index: number
  machine_count?: number
}

export default function ProcessesPage() {
  const [processes, setProcesses] = useState<Process[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    is_machine_based: false,
    is_production: false,
  })

  useEffect(() => {
    loadProcesses()
  }, [])

  async function loadProcesses() {
    try {
      setLoading(true)
      const response = await processesAPI.getAll()
      setProcesses(response.data || [])
    } catch (error) {
      console.error('Processes load error:', error)
      toast.error('Süreçler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(process: Process) {
    setEditingId(process.id)
    setEditForm({
      name: process.name,
      code: process.code,
      is_machine_based: process.is_machine_based,
      is_production: process.is_production,
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    try {
      await processesAPI.update(id, editForm)
      toast.success('Süreç güncellendi')
      setEditingId(null)
      loadProcesses()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Güncelleme başarısız')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" sürecini silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      // Silme API'si eklenecek
      toast.info('Silme özelliği yakında eklenecek')
    } catch (error: any) {
      toast.error('Silme işlemi başarısız')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Süreç Yönetimi</h1>
          <p className="text-gray-600 mt-1">
            Süreçleri tanımlayın, sıralayın ve makinelerle ilişkilendirin
          </p>
        </div>
        <Link href="/processes/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Süreç Ekle
          </Button>
        </Link>
      </div>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-800">
            💡 <strong>İpucu:</strong> Süreçleri sürükleyerek sırasını değiştirebilirsiniz. 
            Satır üzerinde düzenle butonuna tıklayarak hızlı güncelleme yapabilirsiniz.
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Süreç Listesi ({processes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {processes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">Henüz süreç tanımlanmamış</p>
              <Link href="/processes/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Süreci Ekle
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 w-12">#</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Süreç Adı</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Kod</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700 w-32">
                      Makine<br/>Bazlı
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700 w-32">
                      Üretim<br/>Süreci
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700 w-32">
                      Bağlı<br/>Makine
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 w-48">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((process, index) => (
                    <tr key={process.id} className="border-b hover:bg-gray-50 transition-colors">
                      {/* Sıra No & Drag Handle */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                          <span className="text-sm text-gray-500">{index + 1}</span>
                        </div>
                      </td>

                      {/* Süreç Adı */}
                      <td className="py-3 px-4">
                        {editingId === process.id ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          <span className="font-medium text-gray-900">{process.name}</span>
                        )}
                      </td>

                      {/* Kod */}
                      <td className="py-3 px-4">
                        {editingId === process.id ? (
                          <Input
                            value={editForm.code}
                            onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                            className="h-8 font-mono"
                          />
                        ) : (
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                            {process.code}
                          </code>
                        )}
                      </td>

                      {/* Makine Bazlı */}
                      <td className="py-3 px-4 text-center">
                        {editingId === process.id ? (
                          <input
                            type="checkbox"
                            checked={editForm.is_machine_based}
                            onChange={(e) => setEditForm({ ...editForm, is_machine_based: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        ) : (
                          <div className="flex justify-center">
                            {process.is_machine_based ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-gray-300">✗</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Üretim */}
                      <td className="py-3 px-4 text-center">
                        {editingId === process.id ? (
                          <input
                            type="checkbox"
                            checked={editForm.is_production}
                            onChange={(e) => setEditForm({ ...editForm, is_production: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        ) : (
                          <div className="flex justify-center">
                            {process.is_production ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-gray-300">✗</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Makine Sayısı */}
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm font-medium text-gray-700">
                          {process.machine_count || 0}
                        </span>
                      </td>

                      {/* İşlemler */}
                      <td className="py-3 px-4">
                        {editingId === process.id ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveEdit(process.id)}
                              className="h-8"
                            >
                              <Save className="w-3 h-3 mr-1" />
                              Kaydet
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEdit}
                              className="h-8"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEdit(process)}
                              className="h-8"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Güncelle
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(process.id, process.name)}
                              className="h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Sil
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}