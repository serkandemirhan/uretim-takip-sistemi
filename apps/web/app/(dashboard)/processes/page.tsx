'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { GripVertical, Save, Plus, X ,Trash2} from 'lucide-react'

import { processesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { handleError, handleApiError, debugLog } from '@/lib/utils/error-handler'

type Process = {
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
  const [loading, setLoading] = useState(true)
  const [processes, setProcesses] = useState<Process[]>([])

  // DnD
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [orderDirty, setOrderDirty] = useState(false)

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Process>>({})
  const [savingRow, setSavingRow] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await processesAPI.getAll()
        const list: Process[] = (res?.data ?? res ?? []).slice()
        list.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        setProcesses(list)
      } catch (e) {
        handleError(e)
        toast.error('Süreçler yüklenemedi')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  // ---- Drag & Drop (native) ----
  const handleDragStart = (id: string) => setDraggingId(id)

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, overId: string) => {
    e.preventDefault()
    if (!draggingId || draggingId === overId) return
    const from = processes.findIndex(p => p.id === draggingId)
    const to = processes.findIndex(p => p.id === overId)
    if (from === -1 || to === -1) return
    const next = processes.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setProcesses(next)
    setOrderDirty(true)
  }

  const handleDragEnd = () => setDraggingId(null)

  const deleteProcess = async (id: string) => {
  const target = processes.find(p => p.id === id)
  if (!target) return
  if (!confirm(`“${target.name}” sürecini silmek istiyor musun?`)) return
  try {
    // optimistik: ekrandan çıkar
    setProcesses(prev => prev.filter(p => p.id !== id))
    await processesAPI.delete(id)
    toast.success('Süreç silindi')
  } catch (e) {
    handleError(e)
    toast.error('Süreç silinemedi')
    // geri al (isteğe bağlı)
    setProcesses(prev => {
      if (prev.some(p => p.id === id)) return prev
      return [...prev, target].sort((a,b)=>(a.order_index??0)-(b.order_index??0))
    })
  }
}


  const saveOrder = async () => {
    try {
      await Promise.all(
        processes.map((p, idx) =>
          processesAPI.update(p.id, { order_index: idx + 1 })
        )
      )
      toast.success('Sıralama kaydedildi')
      setOrderDirty(false)
    } catch (e) {
      handleError(e)
      toast.error('Sıralama kaydedilemedi')
    }
  }

  // ---- Inline edit ----
  const startEdit = (p: Process) => {
    setEditingId(p.id)
    setEditForm({
      name: p.name,
      code: p.code,
      description: p.description ?? '',
      is_machine_based: p.is_machine_based,
      is_production: p.is_production,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async (id: string) => {
    if (!editForm.name?.trim() || !editForm.code?.trim()) {
      toast.error('Süreç adı ve kodu zorunludur')
      return
    }
    try {
      setSavingRow(id)
      await processesAPI.update(id, {
        name: editForm.name.trim(),
        code: editForm.code.trim(),
        description: (editForm.description ?? '').trim(),
        is_machine_based: !!editForm.is_machine_based,
        is_production: !!editForm.is_production,
      })
      // UI’yi güncelle
      setProcesses(prev =>
        prev.map(p =>
          p.id === id
            ? {
                ...p,
                name: editForm.name!.trim(),
                code: editForm.code!.trim(),
                description: (editForm.description ?? '').trim(),
                is_machine_based: !!editForm.is_machine_based,
                is_production: !!editForm.is_production,
              }
            : p
        )
      )
      toast.success('Süreç güncellendi')
      cancelEdit()
    } catch (e: any) {
      handleError(e)
      // Unique code ihlalinde 409 beklenir
      const msg = e?.response?.data?.error ?? 'Güncelleme başarısız'
      toast.error(msg)
    } finally {
      setSavingRow(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Süreç Yönetimi</h1>
          <p className="text-gray-600 mt-1">Süreçleri tanımlayın, sıralayın ve makinelerle ilişkilendirin</p>
        </div>
        <Link href="/processes/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Süreç Ekle
          </Button>
        </Link>
      </div>

      {orderDirty && (
        <div className="flex justify-end">
          <Button onClick={saveOrder} className="gap-2">
            <Save className="w-4 h-4" />
            Sıralamayı Kaydet
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Süreç Listesi ({processes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Yükleniyor…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 w-20">#</th>
                    <th className="py-3 px-4">Süreç Adı</th>
                    <th className="py-3 px-4">Kod</th>
                    <th className="py-3 px-4">Makine Bazlı</th>
                    <th className="py-3 px-4">Üretim Süreci</th>
                    <th className="py-3 px-4">Bağlı Makine</th>
                    <th className="py-3 px-4 w-48">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((p, index) => {
                    const isEditing = editingId === p.id
                    return (
                      <tr
                        key={p.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                        draggable
                        onDragStart={() => handleDragStart(p.id)}
                        onDragOver={(e) => handleDragOver(e, p.id)}
                        onDragEnd={handleDragEnd}
                      >
                        {/* sıra & drag handle */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                            <span className="text-sm text-gray-500">{index + 1}</span>
                          </div>
                        </td>

                        {/* ad */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input
                              value={editForm.name ?? ''}
                              onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
                            />
                          ) : (
                            p.name
                          )}
                        </td>

                        {/* kod */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input
                              value={editForm.code ?? ''}
                              onChange={(e) => setEditForm(f => ({ ...f, code: e.target.value }))}
                            />
                          ) : (
                            <span className="bg-gray-100 px-2 py-1 rounded text-xs">{p.code}</span>
                          )}
                        </td>

                        {/* makine bazlı */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={!!editForm.is_machine_based}
                              onChange={(e) => setEditForm(f => ({ ...f, is_machine_based: e.target.checked }))}
                            />
                          ) : p.is_machine_based ? '✓' : '✗'}
                        </td>

                        {/* üretim */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={!!editForm.is_production}
                              onChange={(e) => setEditForm(f => ({ ...f, is_production: e.target.checked }))}
                            />
                          ) : p.is_production ? '✓' : '✗'}
                        </td>

                        {/* bağlı makine */}
                        <td className="py-3 px-4">{p.machine_count ?? 0}</td>

                        {/* işlem */}
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => saveEdit(p.id)}
                                  disabled={savingRow === p.id}
                                >
                                  {savingRow === p.id ? 'Kaydediliyor…' : 'Kaydet'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={cancelEdit}
                                  className="gap-1"
                                >
                                  <X className="w-4 h-4" />
                                  İptal
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEdit(p)}
                                >
                                  Güncelle
                                </Button>
                              <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => deleteProcess(p.id)}
                                    className="inline-flex items-center gap-1"
                                    >
                                    <Trash2 className="w-4 h-4" />
                                    Sil
                                    </Button>

                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
