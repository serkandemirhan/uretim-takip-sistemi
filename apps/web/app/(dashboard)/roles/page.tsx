'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { rolesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Role = {
  id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
  user_count: number
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    void loadRoles()
  }, [])

  async function loadRoles() {
    try {
      setLoading(true)
      const response = await rolesAPI.getAll()
      const data = response?.data ?? response ?? []
      setRoles(Array.isArray(data) ? data : [])
    } catch (error) {
      handleApiError(error, 'Roles load')
      toast.error('Roller yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(role: Role) {
    if (!confirm(`"${role.name}" rolünü silmek istediğinizden emin misiniz?`)) {
      return
    }
    try {
      setDeletingId(role.id)
      await rolesAPI.delete(role.id)
      toast.success('Rol silindi')
      await loadRoles()
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        'Rol silinemedi. Role atanmış kullanıcılar olabilir.'
      toast.error(msg)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Roller</h1>
          <p className="text-sm text-gray-500">
            Kullanıcı rollerini ve yetki tanımlarını yönetin.
          </p>
        </div>
        <Link href="/roles/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Rol
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-sm font-medium text-gray-700">
            Rol Listesi
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-64">Rol</TableHead>
              <TableHead className="w-32">Kod</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead className="w-32 text-center">Kullanıcı</TableHead>
              <TableHead className="w-32 text-center">Durum</TableHead>
              <TableHead className="w-40 text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    Roller yükleniyor...
                  </div>
                </TableCell>
              </TableRow>
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-gray-500">
                  Şu anda tanımlı rol bulunmuyor.
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{role.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase">
                      {role.code}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {role.description || '-'}
                  </TableCell>
                  <TableCell className="text-center text-sm text-gray-600">
                    {role.user_count}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      className={
                        role.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-200 text-gray-600'
                      }
                    >
                      {role.is_active ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/roles/${role.id}`}>
                        <Button variant="outline" size="sm">
                          <Pencil className="mr-2 h-4 w-4" />
                          Düzenle
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(role)}
                        disabled={deletingId === role.id}
                        className="text-red-600 hover:bg-red-50"
                      >
                        {deletingId === role.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Sil
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
