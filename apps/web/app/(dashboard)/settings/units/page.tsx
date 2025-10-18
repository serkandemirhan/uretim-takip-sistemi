'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { unitsAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Plus,
  Pencil,
  Save,
  X,
  Trash2,
  RefreshCcw,
  Check,
  ArrowLeft,
} from 'lucide-react'

type Unit = {
  id: string
  code: string
  name: string
  description?: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

type UnitForm = {
  code: string
  name: string
  description: string
  is_active: boolean
}

const EMPTY_FORM: UnitForm = {
  code: '',
  name: '',
  description: '',
  is_active: true,
}

export default function UnitSettingsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [newUnit, setNewUnit] = useState<UnitForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<UnitForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void loadUnits()
  }, [showInactive])

  const activeUnitsCount = useMemo(
    () => units.filter((unit) => unit.is_active).length,
    [units],
  )

  async function loadUnits() {
    try {
      setLoading(true)
      const res = await unitsAPI.getAll({ include_inactive: showInactive })
      const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      setUnits(raw)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Ölçü birimleri yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  function handleNewUnitChange(field: keyof UnitForm, value: string | boolean) {
    setNewUnit((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCreateUnit() {
    const code = newUnit.code.trim().toUpperCase()
    const name = newUnit.name.trim()
    if (!code || !name) {
      toast.error('Kod ve ad zorunludur')
      return
    }

    try {
      setCreating(true)
      await unitsAPI.create({
        code,
        name,
        description: newUnit.description.trim() || undefined,
        is_active: newUnit.is_active,
      })
      toast.success('Ölçü birimi eklendi')
      setNewUnit(EMPTY_FORM)
      await loadUnits()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Ölçü birimi eklenemedi')
    } finally {
      setCreating(false)
    }
  }

  function startEdit(unit: Unit) {
    setEditingId(unit.id)
    setEditForm({
      code: unit.code,
      name: unit.name,
      description: unit.description || '',
      is_active: unit.is_active,
    })
  }

  function cancelEdit() {
    if (saving) return
    setEditingId(null)
    setEditForm(EMPTY_FORM)
  }

  function handleEditChange(field: keyof UnitForm, value: string | boolean) {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleUpdateUnit(unitId: string) {
    const code = editForm.code.trim().toUpperCase()
    const name = editForm.name.trim()
    if (!code || !name) {
      toast.error('Kod ve ad zorunludur')
      return
    }

    try {
      setSaving(true)
      await unitsAPI.update(unitId, {
        code,
        name,
        description: editForm.description.trim() || undefined,
        is_active: editForm.is_active,
      })
      toast.success('Ölçü birimi güncellendi')
      cancelEdit()
      await loadUnits()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Ölçü birimi güncellenemedi')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(unit: Unit) {
    if (!unit.is_active) {
      await handleReactivate(unit.id)
      return
    }

    if (!confirm(`"${unit.name}" birimini pasif etmek istediğinize emin misiniz?`)) {
      return
    }

    try {
      setSaving(true)
      await unitsAPI.deactivate(unit.id)
      toast.success('Ölçü birimi pasif edildi')
      await loadUnits()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Ölçü birimi pasif edilemedi')
    } finally {
      setSaving(false)
    }
  }

  async function handleReactivate(unitId: string) {
    try {
      setSaving(true)
      await unitsAPI.update(unitId, { is_active: true })
      toast.success('Ölçü birimi aktifleştirildi')
      await loadUnits()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Ölçü birimi aktifleştirilemedi')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="mt-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Ayarlara Dön
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ölçü Birimleri</h1>
          <p className="text-gray-600">
            Teklifler ve stoklarda kullanılacak ölçü birimlerini tanımlayın.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold text-gray-900">
              Tanımlı Ölçü Birimleri
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInactive((prev) => !prev)}
              >
                {showInactive ? <X className="mr-2 h-4 w-4" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                {showInactive ? 'Sadece aktifleri göster' : 'Pasif birimleri dahil et'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => loadUnits()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Yenile
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-800">Yeni Ölçü Birimi Ekle</h3>
            <div className="grid gap-3 md:grid-cols-[160px_1fr]">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">Kod *</label>
                <Input
                  value={newUnit.code}
                  onChange={(e) => handleNewUnitChange('code', e.target.value.toUpperCase())}
                  placeholder="Örn: ADET"
                  maxLength={50}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-gray-700">Ad *</label>
                <Input
                  value={newUnit.name}
                  onChange={(e) => handleNewUnitChange('name', e.target.value)}
                  placeholder="Örn: Adet"
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Açıklama</label>
                <Input
                  value={newUnit.description}
                  onChange={(e) => handleNewUnitChange('description', e.target.value)}
                  placeholder="İsteğe bağlı açıklama"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button onClick={handleCreateUnit} disabled={creating}>
                <Plus className="mr-2 h-4 w-4" />
                {creating ? 'Ekleniyor...' : 'Ekle'}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {showInactive
                ? `Toplam ${units.length} birim (${activeUnitsCount} aktif)`
                : `Aktif birimler: ${activeUnitsCount}`}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[640px] table-fixed text-left text-sm">
              <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-600">
                <tr>
                  <th className="w-32 px-4 py-3">Kod</th>
                  <th className="px-4 py-3">Ad</th>
                  <th className="px-4 py-3">Açıklama</th>
                  <th className="w-28 px-4 py-3 text-center">Durum</th>
                  <th className="w-40 px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      <div className="inline-flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Yükleniyor...
                      </div>
                    </td>
                  </tr>
                ) : units.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      {showInactive
                        ? 'Herhangi bir ölçü birimi bulunamadı.'
                        : 'Aktif ölçü birimi bulunmuyor.'}
                    </td>
                  </tr>
                ) : (
                  units.map((unit) => {
                    const isEditing = editingId === unit.id

                    return (
                      <tr key={unit.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3 align-middle">
                          {isEditing ? (
                            <Input
                              value={editForm.code}
                              onChange={(e) => handleEditChange('code', e.target.value.toUpperCase())}
                              className="h-8 text-sm"
                            />
                          ) : (
                            <span className="font-semibold text-gray-900">{unit.code}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {isEditing ? (
                            <Input
                              value={editForm.name}
                              onChange={(e) => handleEditChange('name', e.target.value)}
                              className="h-8 text-sm"
                            />
                          ) : (
                            <span className="text-gray-800">{unit.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          {isEditing ? (
                            <Input
                              value={editForm.description}
                              onChange={(e) => handleEditChange('description', e.target.value)}
                              className="h-8 text-sm"
                            />
                          ) : unit.description ? (
                            <span className="text-gray-600">{unit.description}</span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center align-middle">
                          <Badge className={unit.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}>
                            {unit.is_active ? 'Aktif' : 'Pasif'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right align-middle">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateUnit(unit.id)}
                                  disabled={saving}
                                >
                                  <Save className="mr-2 h-4 w-4" />
                                  Kaydet
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={cancelEdit}
                                  disabled={saving}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  İptal
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => startEdit(unit)}
                                  disabled={saving}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Düzenle
                                </Button>
                                <Button
                                  variant={unit.is_active ? 'ghost' : 'outline'}
                                  size="sm"
                                  onClick={() => handleDeactivate(unit)}
                                  className={unit.is_active ? 'text-red-600 hover:text-red-700' : ''}
                                  disabled={saving}
                                >
                                  {unit.is_active ? (
                                    <>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Pasifleştir
                                    </>
                                  ) : (
                                    <>
                                      <Check className="mr-2 h-4 w-4" />
                                      Aktifleştir
                                    </>
                                  )}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
