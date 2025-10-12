'use client'

import { useEffect, useState } from 'react'
import { usersAPI, userRolesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Users, Plus, Edit2, Trash2, Save, X, Mail, Star } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { handleApiError, debugLog } from '@/lib/utils/error-handler'
import { MultiRoleSelector } from '@/components/features/users/MultiRoleSelector'

interface UserRole {
  role_id: string
  role_code: string
  role_name: string
  is_primary: boolean
}

interface User {
  id: string
  username: string
  email: string
  full_name: string
  role?: string
  is_active: boolean
  roles: UserRole[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
  })
  const [managingRolesUser, setManagingRolesUser] = useState<User | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [primaryRoleId, setPrimaryRoleId] = useState<string | undefined>()
  const [savingRoles, setSavingRoles] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      setLoading(true)
      const response = await usersAPI.getAll()
      debugLog('Users response:', response) // Debug için
      const data = (response.data || []).map((user: any) => ({
        ...user,
        roles: Array.isArray(user.roles) ? user.roles : [],
      }))
      setUsers(data)
    } catch (error) {
      handleApiError(error, 'Users load')
      toast.error('Kullanıcılar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function startEdit(user: User) {
    setEditingId(user.id)
    setEditForm({
      full_name: user.full_name,
      email: user.email,
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: string) {
    try {
      await usersAPI.update(id, editForm)
      toast.success('Kullanıcı güncellendi')
      setEditingId(null)
      loadUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Güncelleme başarısız')
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" kullanıcısını silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      await usersAPI.delete(id)
      toast.success('Kullanıcı silindi')
      loadUsers()
    } catch (error: any) {
      toast.error('Silme işlemi başarısız')
    }
  }

  function openRoleManager(user: User) {
    const initialRoleIds = (user.roles || []).map(role => role.role_id)
    const primary = user.roles?.find(role => role.is_primary)

    setManagingRolesUser(user)
    setSelectedRoleIds(initialRoleIds)
    setPrimaryRoleId(primary?.role_id || initialRoleIds[0])
  }

  function closeRoleManager() {
    setManagingRolesUser(null)
    setSelectedRoleIds([])
    setPrimaryRoleId(undefined)
    setSavingRoles(false)
  }

  function handleRoleSelectionChange(roleIds: string[], nextPrimaryId?: string) {
    setSelectedRoleIds(roleIds)
    setPrimaryRoleId(prev => {
      if (roleIds.length === 0) return undefined
      if (nextPrimaryId) return nextPrimaryId
      if (prev && roleIds.includes(prev)) return prev
      return roleIds[0]
    })
  }

  async function saveRoles() {
    if (!managingRolesUser) return
    if (selectedRoleIds.length === 0) {
      toast.error('En az bir rol seçmelisiniz')
      return
    }

    const primaryId = primaryRoleId && selectedRoleIds.includes(primaryRoleId)
      ? primaryRoleId
      : selectedRoleIds[0]

    try {
      setSavingRoles(true)
      await userRolesAPI.assignRoles(managingRolesUser.id, {
        role_ids: selectedRoleIds,
        primary_role_id: primaryId,
      })
      toast.success('Roller güncellendi')
      closeRoleManager()
      loadUsers()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Roller güncellenemedi')
    } finally {
      setSavingRoles(false)
    }
  }

  function renderRoleBadges(user: User) {
    if (!user.roles || user.roles.length === 0) {
      return <span className="text-xs text-gray-500">Rol atanmamış</span>
    }

    return user.roles.map((role) => (
      <Badge
        key={`${user.id}-${role.role_id}`}
        className={`gap-1 ${role.is_primary ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
      >
        {role.is_primary && <Star className="h-3 w-3" />}
        {role.role_name || role.role_code}
      </Badge>
    ))
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
          <h1 className="text-3xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
          <p className="text-gray-600 mt-1">Kullanıcıları yönetin ve roller atayın</p>
        </div>
        <Link href="/users/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Kullanıcı
          </Button>
        </Link>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Kullanıcı Listesi ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Henüz kullanıcı bulunmuyor</p>
              <Link href="/users/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Kullanıcıyı Ekle
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700 w-12">#</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Ad Soyad</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Kullanıcı Adı</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">E-posta</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Roller</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700 w-48">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-500">{index + 1}</span>
                      </td>

                      {/* Ad Soyad */}
                      <td className="py-3 px-4">
                        {editingId === user.id ? (
                          <Input
                            value={editForm.full_name}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          <span className="font-medium text-gray-900">{user.full_name}</span>
                        )}
                      </td>

                      {/* Kullanıcı Adı */}
                      <td className="py-3 px-4">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {user.username}
                        </code>
                      </td>

                      {/* E-posta */}
                      <td className="py-3 px-4">
                        {editingId === user.id ? (
                          <Input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        )}
                      </td>

                      {/* Rol */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2">
                            {renderRoleBadges(user)}
                          </div>
                       
                        </div>
                      </td>

                      {/* İşlemler */}
                      <td className="py-3 px-4">
                        {editingId === user.id ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveEdit(user.id)}
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
                              onClick={() => startEdit(user)}
                              className="h-8"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Güncelle
                            </Button>
                          

                           
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => openRoleManager(user)}
                            >
                              Roller
                            </Button>

                              <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(user.id, user.full_name)}
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

      {managingRolesUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Rolleri Yönet</h3>
                <p className="text-sm text-gray-500">{managingRolesUser.full_name}</p>
              </div>
              <button
                type="button"
                className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                onClick={closeRoleManager}
                aria-label="Roller penceresini kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4">
              <MultiRoleSelector
                key={managingRolesUser.id}
                selectedRoleIds={selectedRoleIds}
                primaryRoleId={primaryRoleId}
                onChange={handleRoleSelectionChange}
              />
            </div>

            <div className="flex justify-end gap-3 border-t px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={closeRoleManager}
                disabled={savingRoles}
              >
                İptal
              </Button>
              <Button
                type="button"
                onClick={saveRoles}
                disabled={savingRoles || selectedRoleIds.length === 0}
              >
                {savingRoles ? 'Kaydediliyor...' : 'Rolleri Kaydet'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
