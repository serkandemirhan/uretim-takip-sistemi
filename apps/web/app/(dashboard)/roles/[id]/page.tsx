'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { rolesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'

type Permissions = Record<
  string,
  {
    can_view: boolean
    can_create: boolean
    can_update: boolean
    can_delete: boolean
  }
>

type ProcessMeta = {
  id: string
  name: string
  code: string | null
}

export default function EditRolePage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState<any>(null)
  const [resources, setResources] = useState<any[]>([])
  const [processes, setProcesses] = useState<ProcessMeta[]>([])

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    permissions: {} as Permissions,
    process_permissions: [] as string[],
  })

  useEffect(() => {
    void loadData()
  }, [params.id])

  async function loadData() {
    try {
      setLoading(true)
      const [roleRes, resourcesRes] = await Promise.all([
        rolesAPI.getById(params.id as string),
        rolesAPI.getResources(),
      ])

      const roleData = roleRes.data
      const payload = resourcesRes.data || {}

      setRole(roleData)
      setResources(payload.resources || [])
      setProcesses(payload.processes || [])

      setFormData({
        name: roleData.name || '',
        code: roleData.code || '',
        description: roleData.description || '',
        permissions: roleData.permissions || {},
        process_permissions: roleData.process_permissions || [],
      })
    } catch (error) {
      handleApiError(error, 'Load role')
      toast.error('Rol bilgileri yüklenemedi')
      setRole(null)
    } finally {
      setLoading(false)
    }
  }

  function togglePermission(resource: string, key: keyof Permissions[string]) {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [resource]: {
          ...(prev.permissions[resource] || {
            can_view: false,
            can_create: false,
            can_update: false,
            can_delete: false,
          }),
          [key]: !(prev.permissions[resource]?.[key] || false),
        },
      },
    }))
  }

  function toggleAllForResource(resource: string, value: boolean) {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [resource]: {
          can_view: value,
          can_create: value,
          can_update: value,
          can_delete: value,
        },
      },
    }))
  }

  function toggleProcess(processId: string) {
    setFormData((prev) => {
      const current = prev.process_permissions
      const has = current.includes(processId)
      return {
        ...prev,
        process_permissions: has
          ? current.filter((id) => id !== processId)
          : [...current, processId],
      }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      setSaving(true)
      await rolesAPI.update(params.id as string, {
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
        process_permissions: formData.process_permissions,
      })
      toast.success('Rol güncellendi')
      router.push('/roles')
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Güncelleme başarısız')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!role) {
    return (
      <div className="py-12 text-center text-gray-500">
        Rol bulunamadı
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/roles">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Rollere Dön
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Rol Düzenle</h1>
        <p className="mt-1 text-sm text-gray-500">Kod: {formData.code}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Rol Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Rol Adı *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label>Kod</Label>
                <Input value={formData.code} disabled className="uppercase" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yetkiler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50 text-sm text-gray-700">
                    <th className="px-4 py-3 text-left">Kaynak</th>
                    <th className="px-4 py-3 text-center">Gör</th>
                    <th className="px-4 py-3 text-center">Oluştur</th>
                    <th className="px-4 py-3 text-center">Güncelle</th>
                    <th className="px-4 py-3 text-center">Sil</th>
                    <th className="px-4 py-3 text-center">Tümü</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((resource) => {
                    const perms = formData.permissions[resource.code] || {
                      can_view: false,
                      can_create: false,
                      can_update: false,
                      can_delete: false,
                    }
                    const allChecked = Object.values(perms).every(Boolean)
                    return (
                      <tr key={resource.code} className="border-b text-sm text-gray-600">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{resource.name}</div>
                          <div className="text-xs text-gray-500">{resource.description}</div>
                        </td>
                        {(['can_view', 'can_create', 'can_update', 'can_delete'] as const).map((key) => (
                          <td key={key} className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={perms[key]}
                              onChange={() => togglePermission(resource.code, key)}
                              disabled={saving}
                            />
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAllForResource(resource.code, !allChecked)}
                            disabled={saving}
                            className="h-7 text-xs"
                          >
                            {allChecked ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Süreç Erişimleri</CardTitle>
          </CardHeader>
          <CardContent>
            {processes.length === 0 ? (
              <p className="text-sm text-gray-500">Sistem üzerinde tanımlı süreç bulunamadı.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {processes.map((process) => {
                  const checked = formData.process_permissions.includes(process.id)
                  return (
                    <label
                      key={process.id}
                      className="flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={checked}
                        onChange={() => toggleProcess(process.id)}
                        disabled={saving}
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm">
                          {process.code ? `${process.code} • ${process.name}` : process.name}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </Button>
          <Link href="/roles">
            <Button type="button" variant="outline" disabled={saving}>
              İptal
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
