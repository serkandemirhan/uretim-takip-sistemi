'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { usersAPI, userRolesAPI, filesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiRoleSelector } from '@/components/features/users/MultiRoleSelector'
import { ArrowLeft, UserCircle, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function NewUserPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    full_name: '',
    role: 'operator', // Backward compatibility için
  })
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])
  const [primaryRoleId, setPrimaryRoleId] = useState<string | undefined>()
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  function handleRolesChange(roleIds: string[], primaryId?: string) {
    setSelectedRoleIds(roleIds)
    setPrimaryRoleId(primaryId)
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      setAvatarFile(null)
      setAvatarPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim formatı yükleyebilirsiniz')
      event.target.value = ''
      return
    }

    const MAX_SIZE = 2 * 1024 * 1024 // 2MB
    if (file.size > MAX_SIZE) {
      toast.error('Avatar dosyası en fazla 2MB olabilir')
      event.target.value = ''
      return
    }

    setAvatarFile(file)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  function clearAvatar() {
    setAvatarFile(null)
    setAvatarPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (avatarInputRef.current) {
      avatarInputRef.current.value = ''
    }
  }

  async function uploadAvatar(userId: string) {
    if (!avatarFile) return

    try {
      const contentType = avatarFile.type || 'application/octet-stream'
      const uploadUrlRes = await filesAPI.getUploadUrl({
        filename: avatarFile.name,
        content_type: contentType,
        ref_type: 'user',
        ref_id: userId,
      })

      const { upload_url, object_key, folder_path } = uploadUrlRes?.data || {}
      if (!upload_url || !object_key) {
        throw new Error('Profil fotoğrafı için yükleme adresi alınamadı')
      }

      await axios.put(upload_url, avatarFile, {
        headers: { 'Content-Type': contentType },
      })

      const linkRes = await filesAPI.linkFile({
        object_key,
        filename: avatarFile.name,
        file_size: avatarFile.size,
        content_type: contentType,
        ref_type: 'user',
        ref_id: userId,
        folder_path,
      })

      const fileId = linkRes?.data?.id
      if (fileId) {
        await usersAPI.update(userId, {
          avatar_file_id: fileId,
          avatar_url: object_key,
        })
      }
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast.error('Avatar yüklenemedi, kullanıcı yine de oluşturuldu')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validasyon
    if (formData.password !== formData.password_confirm) {
      toast.error('Şifreler eşleşmiyor')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır')
      return
    }

    if (selectedRoleIds.length === 0) {
      toast.error('En az bir rol seçmelisiniz')
      return
    }

    setLoading(true)

    try {
      // 1. Kullanıcıyı oluştur (backward compatibility için role field'ı kullan)
      const response = await usersAPI.create({
        ...formData,
        role: formData.role, // Geçici olarak kullanılacak
      })

      const newUserId = response.data.id

      // 2. Seçilen rolleri ata
      await userRolesAPI.assignRoles(newUserId, {
        role_ids: selectedRoleIds,
        primary_role_id: primaryRoleId,
      })

      // 3. Avatar varsa yükle
      if (avatarFile) {
        await uploadAvatar(newUserId)
      }

      toast.success('Kullanıcı başarıyla oluşturuldu!')
      router.push('/users')
    } catch (error: any) {
      console.error('User create error:', error)
      toast.error(error.response?.data?.error || 'Kullanıcı oluşturulurken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/users">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kullanıcılara Dön
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Yeni Kullanıcı Ekle</h1>
        <p className="text-gray-600 mt-1">Sisteme yeni kullanıcı ekleyin</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Kullanıcı Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle>Kullanıcı Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Profil Fotoğrafı</Label>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 rounded-full bg-gray-100 ring-1 ring-gray-200 overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCircle className="h-10 w-10 text-gray-400" />
                  )}
                </div>
                <div className="space-y-2">
                  <Input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    disabled={loading}
                    onChange={handleAvatarChange}
                  />
                  <p className="text-xs text-gray-500">
                    PNG, JPG veya WEBP formatında, en fazla 2MB.
                  </p>
                  {avatarPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={clearAvatar}
                      disabled={loading}
                    >
                      <X className="h-3 w-3" />
                      Kaldır
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Ad Soyad *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Örn: Ali Kaya"
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Kullanıcı Adı *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                  placeholder="Örn: akaya"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500">
                  Sadece küçük harf ve rakam kullanın
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-posta *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Örn: akaya@firma.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">Şifre *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="En az 6 karakter"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_confirm">Şifre Tekrar *</Label>
                <Input
                  id="password_confirm"
                  type="password"
                  value={formData.password_confirm}
                  onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                  placeholder="Şifreyi tekrar girin"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roller */}
        <MultiRoleSelector
          selectedRoleIds={selectedRoleIds}
          primaryRoleId={primaryRoleId}
          onChange={handleRolesChange}
        />

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading || selectedRoleIds.length === 0}>
            {loading ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
          </Button>
          <Link href="/users">
            <Button type="button" variant="outline" disabled={loading}>
              İptal
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
