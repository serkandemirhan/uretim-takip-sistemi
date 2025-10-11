'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { rolesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function EditRolePage() {
  const params = useParams()
  const router = useRouter()
  const [role, setRole] = useState<any>(null)
  const [resources, setResources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, any>,
  })

  useEffect(() => {
    loadData()
  }, [params.id])

  async function loadData() {
    try {
      setLoading(true)
      const [roleRes, resourcesRes] = await Promise.all([
        rolesAPI.getById(params.id as string),
        rolesAPI.getResources(),
      ])
      
      const roleData = roleRes.data
      setRole(roleData)
      setResources(resourcesRes.data || [])
      
      setFormData({
        name: roleData.name || '',
        description: roleData.description || '',
        permissions: roleData.permissions || {},
      })
    } catch (error) {
      console.error('Load error:', error)
      toast.error('Rol yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function togglePermission(resource: string, permission: string) {
    setFormData(prev => ({
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
          [permission]: !(prev.permissions[resource]?.[permission] || false)
        }
      }
    }))
  }

  function toggleAllForResource(resource: string, value: boolean) {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [resource]: {
          can_view: value,
          can_create: value,
          can_update: value,
          can_delete: value,
        }
      }
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    try {
      setSaving(true)
      await rolesAPI.update(params.id as string, formData)
      toast.success('Rol başarıyla güncellendi!')
      router.push('/roles')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Güncelleme başarısız')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!role) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Rol bulunamadı</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/roles">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Rollere Dön
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Rol Düzenle</h1>
        <p className="text-gray-600 mt-1">{role.code}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Temel Bilgiler */}
        <Card>
          <CardHeader>
            <CardTitle>Rol Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

        {/* Yetkiler */}
        <Card>
          <CardHeader>
            <CardTitle>Yetkiler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">
                      Kaynak
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700 w-24">
                      Gör
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700 w-24">
                      Oluştur
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700 w-24">
                      Güncelle
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700 w-24">
                      Sil
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700 w-32">
                      İşlemler
                    </th>
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
                    
                    const allChecked = perms.can_view && perms.can_create && perms.can_update && perms.can_delete

                    return (
                      <tr key={resource.code} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium text-gray-900">{resource.name}</div>
                            <div className="text-xs text-gray-500">{resource.description}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={perms.can_view}
                            onChange={() => togglePermission(resource.code, 'can_view')}
                            className="w-4 h-4 rounded"
                            disabled={saving}
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={perms.can_create}
                            onChange={() => togglePermission(resource.code, 'can_create')}
                            className="w-4 h-4 rounded"
                            disabled={saving}
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={perms.can_update}
                            onChange={() => togglePermission(resource.code, 'can_update')}
                            className="w-4 h-4 rounded"
                            disabled={saving}
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={perms.can_delete}
                            onChange={() => togglePermission(resource.code, 'can_delete')}
                            className="w-4 h-4 rounded"
                            disabled={saving}
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
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

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
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