'use client'

import { useEffect, useState } from 'react'
import { usersAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Users, Plus, Edit2, Trash2, Save, X, Mail } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface User {
  id: string
  username: string
  email: string
  full_name: string
  role: string
  is_active: boolean
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    role: 'operator',
  })

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      setLoading(true)
      const response = await usersAPI.getAll()
      console.log('Users response:', response) // Debug için
      setUsers(response.data || [])
    } catch (error) {
      console.error('Users load error:', error)
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
      role: user.role,
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

  function getRoleBadge(role: string) {
    const roles: Record<string, { label: string; class: string }> = {
      yonetici: { label: 'Yönetici', class: 'bg-purple-100 text-purple-700' },
      musteri_temsilcisi: { label: 'Müşteri Temsilcisi', class: 'bg-blue-100 text-blue-700' },
      tasarimci: { label: 'Tasarımcı', class: 'bg-pink-100 text-pink-700' },
      kesifci: { label: 'Keşifçi', class: 'bg-teal-100 text-teal-700' },
      operator: { label: 'Operatör', class: 'bg-green-100 text-green-700' },
      depocu: { label: 'Depocu', class: 'bg-orange-100 text-orange-700' },
      satinalma: { label: 'Satınalma', class: 'bg-yellow-100 text-yellow-700' },
    }
    return roles[role] || { label: role, class: 'bg-gray-100 text-gray-700' }
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
                        {editingId === user.id ? (
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                            className="h-8 px-2 border border-gray-300 rounded text-sm"
                          >
                            <option value="yonetici">Yönetici</option>
                            <option value="musteri_temsilcisi">Müşteri Temsilcisi</option>
                            <option value="tasarimci">Tasarımcı</option>
                            <option value="kesifci">Keşifçi</option>
                            <option value="operator">Operatör</option>
                            <option value="depocu">Depocu</option>
                            <option value="satinalma">Satınalma</option>
                          </select>
                        ) : (
                          <Badge className={getRoleBadge(user.role).class}>
                            {getRoleBadge(user.role).label}
                          </Badge>
                        )}
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
    </div>
  )
}