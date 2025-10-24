'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { rolesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { handleApiError } from '@/lib/utils/error-handler'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, ColumnDef, Action } from '@/components/shared/data-table'

type Role = {
  id: string
  name: string
  code: string
  description: string | null
  is_active: boolean
  user_count: number
}

export default function RolesPage() {
  const router = useRouter()
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

  // Column definitions
  const columns: ColumnDef<Role>[] = [
    {
      id: 'name',
      header: 'Rol',
      accessor: 'name',
      width: 250,
      render: (value) => (
        <span className="font-medium text-gray-900">{value}</span>
      ),
    },
    {
      id: 'code',
      header: 'Kod',
      accessor: 'code',
      width: 120,
      render: (value) => (
        <Badge variant="outline" className="uppercase">
          {value}
        </Badge>
      ),
    },
    {
      id: 'description',
      header: 'Açıklama',
      accessor: 'description',
      render: (value) => (
        <span className="text-sm text-gray-600">{value || '-'}</span>
      ),
    },
    {
      id: 'user_count',
      header: 'Kullanıcı',
      accessor: 'user_count',
      width: 120,
      className: 'text-center',
      headerClassName: 'text-center',
      render: (value) => (
        <span className="text-sm text-gray-600">{value}</span>
      ),
    },
    {
      id: 'is_active',
      header: 'Durum',
      accessor: 'is_active',
      width: 120,
      className: 'text-center',
      headerClassName: 'text-center',
      render: (value) => (
        <Badge
          className={
            value
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-200 text-gray-600'
          }
        >
          {value ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
  ]

  // Actions
  const actions: Action<Role>[] = [
    {
      label: 'Düzenle',
      icon: <Pencil className="mr-2 h-4 w-4" />,
      variant: 'outline',
      size: 'sm',
      onClick: (role) => router.push(`/roles/${role.id}`),
    },
    {
      label: 'Sil',
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      variant: 'ghost',
      size: 'sm',
      onClick: handleDelete,
    },
  ]

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
        <CardContent>
          <DataTable
            data={roles}
            columns={columns}
            actions={actions}
            loading={loading}
            emptyState={
              <div className="py-10 text-center text-sm text-gray-500">
                Şu anda tanımlı rol bulunmuyor.
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}
