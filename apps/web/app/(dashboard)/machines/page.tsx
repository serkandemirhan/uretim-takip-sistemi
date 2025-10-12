'use client'

import { useEffect, useState } from 'react'
import { machinesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Cpu, Save, X, Plus, Edit2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Machine {
  id: string
  name: string
  code: string
  type?: string
  status: string
  location?: string
  notes?: string
  process_count: number
  is_busy: boolean
  current_task?: any
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    status: 'active',
    notes: '',
  })

  useEffect(() => {
    loadMachines()
  }, [])

  async function loadMachines() {
    try {
      setLoading(true)
      const response = await machinesAPI.getAll()
      setMachines(response.data || [])
    } catch (error) {
      handleApiError(error, 'Machines load')
      toast.error('Makineler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(machine: Machine) {
    setEditingId(machine.id)
    setEditForm({
      name: machine.name,
      status: machine.status,
      notes: machine.notes || '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    try {
      await machinesAPI.update(id, editForm)
      toast.success('Makine güncellendi')
      setEditingId(null)
      loadMachines()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Güncelleme başarısız')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" makinesini silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      await machinesAPI.delete(id)
      toast.success('Makine silindi')
      loadMachines()
    } catch (error: any) {
      toast.error('Silme işlemi başarısız')
    }
  }

  function getStatusBadge(status: string) {
    const badges = {
      active: { label: 'Aktif', class: 'bg-green-100 text-green-700' },
      maintenance: { label: 'Bakımda', class: 'bg-yellow-100 text-yellow-700' },
      inactive: { label: 'Pasif', class: 'bg-gray-100 text-gray-700' },
    }
    const badge = badges[status as keyof typeof badges] || badges.active
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${badge.class}`}>
        {badge.label}
      </span>
    )
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
          <h1 className="text-3xl font-bold text-gray-900">Makine Yönetimi</h1>
          <p className="text-gray-600 mt-1">
            Makineleri yönetin ve süreçlere bağlayın
          </p>
        </div>
        <Link href="/machines/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Makine Ekle
          </Button>
        </Link>
      </div>

      {/* Info */}
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="pt-6">
          <p className="text-sm text-purple-800">
            💡 <strong>İpucu:</strong> Makineleri süreçlere bağlayarak, 
            iş oluştururken hangi makinenin hangi süreçte kullanılacağını belirleyebilirsiniz.
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Makine Listesi ({machines.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {machines.length === 0 ? (
            <div className="text-center py-12">
              <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Henüz makine tanımlanmamış</p>
              <Link href="/machines/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Makineyi Ekle
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 w-12">#</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Makine Adı</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Bağlı Süreç</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 w-32">Durum</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Not</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 w-48">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((machine, index) => (
                    <tr key={machine.id} className="border-b hover:bg-gray-50 transition-colors">
                      {/* # */}
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-500">{index + 1}</span>
                      </td>

                      {/* Makine Adı */}
                      <td className="py-3 px-4">
                        {editingId === machine.id ? (
                          <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          <div>
                            <div className="font-medium text-gray-900">{machine.name}</div>
                            <div className="text-xs text-gray-500 font-mono">{machine.code}</div>
                          </div>
                        )}
                      </td>

                      {/* Bağlı Süreç */}
                      <td className="py-3 px-4">
                        <Link href={`/machines/${machine.id}`}>
                          <Button variant="outline" size="sm" className="h-7">
                            {machine.process_count} Süreç
                          </Button>
                        </Link>
                      </td>

                      {/* Durum */}
                      <td className="py-3 px-4">
                        {editingId === machine.id ? (
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="h-8 px-2 border border-gray-300 rounded text-sm"
                          >
                            <option value="active">Aktif</option>
                            <option value="maintenance">Bakımda</option>
                            <option value="inactive">Pasif</option>
                          </select>
                        ) : (
                          getStatusBadge(machine.status)
                        )}
                      </td>

                      {/* Not */}
                      <td className="py-3 px-4">
                        {editingId === machine.id ? (
                          <Input
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            placeholder="Not ekle..."
                            className="h-8"
                          />
                        ) : (
                          <span className="text-sm text-gray-600 line-clamp-1">
                            {machine.notes || '—'}
                          </span>
                        )}
                      </td>

                      {/* İşlemler */}
                      <td className="py-3 px-4">
                        {editingId === machine.id ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveEdit(machine.id)}
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
                              onClick={() => startEdit(machine)}
                              className="h-8"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Güncelle
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(machine.id, machine.name)}
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