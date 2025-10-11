'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usersAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft } from 'lucide-react'
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
    role: 'operator',
  })

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

    setLoading(true)

    try {
      const response = await usersAPI.create(formData)
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
    <div className="max-w-3xl space-y-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Kullanıcı Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={loading}
              >
                <option value="operator">Operatör</option>
                <option value="yonetici">Yönetici</option>
                <option value="musteri_temsilcisi">Müşteri Temsilcisi</option>
                <option value="tasarimci">Tasarımcı</option>
                <option value="kesifci">Keşifçi</option>
                <option value="depocu">Depocu</option>
                <option value="satinalma">Satınalma</option>
              </select>
              <p className="text-xs text-gray-500">
                Kullanıcının sistemdeki yetki seviyesini belirler
              </p>
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

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
              </Button>
              <Link href="/users">
                <Button type="button" variant="outline" disabled={loading}>
                  İptal
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}