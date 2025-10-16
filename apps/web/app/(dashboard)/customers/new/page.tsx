'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { customersAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/utils/error-handler'

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    short_code: '',
    contact_person: '',
    phone: '',
    phone_secondary: '',
    gsm: '',
    email: '',
    address: '',
    city: '',
    postal_code: '',
    tax_office: '',
    tax_number: '',
    notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await customersAPI.create(formData)
      toast.success('Müşteri başarıyla oluşturuldu!')
      router.push('/customers')
    } catch (error: any) {
      handleApiError(error, 'Customer create')
      toast.error(error.response?.data?.error || 'Müşteri oluşturulurken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/customers">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Müşterilere Dön
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Yeni Müşteri Ekle</h1>
        <p className="text-gray-600 mt-1">Yeni müşteri bilgilerini girin</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Müşteri Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Firma Adı *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Örn: ABC Reklam Ajansı"
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Müşteri Kodu</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="ERP kodu"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="short_code">Kısa Kod</Label>
                <Input
                  id="short_code"
                  value={formData.short_code}
                  onChange={(e) => setFormData({ ...formData, short_code: e.target.value })}
                  placeholder="Kısa tanım"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_person">Yetkili Kişi</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Örn: Mehmet Karaca"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Örn: +90 532 000 1122"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_secondary">Telefon 2</Label>
                <Input
                  id="phone_secondary"
                  type="tel"
                  value={formData.phone_secondary}
                  onChange={(e) => setFormData({ ...formData, phone_secondary: e.target.value })}
                  placeholder="Örn: 0212 000 4455"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gsm">GSM</Label>
                <Input
                  id="gsm"
                  type="tel"
                  value={formData.gsm}
                  onChange={(e) => setFormData({ ...formData, gsm: e.target.value })}
                  placeholder="Örn: +90 555 111 2233"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Örn: info@firma.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Firma adresi..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">Şehir</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Örn: İstanbul"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal_code">Posta Kodu</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  placeholder="Örn: 34000"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tax_office">Vergi Dairesi</Label>
                <Input
                  id="tax_office"
                  value={formData.tax_office}
                  onChange={(e) => setFormData({ ...formData, tax_office: e.target.value })}
                  placeholder="Örn: Beyoğlu"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax_number">Vergi Numarası</Label>
                <Input
                  id="tax_number"
                  value={formData.tax_number}
                  onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })}
                  placeholder="Örn: 1234567890"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ek notlar..."
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Oluşturuluyor...' : 'Müşteri Oluştur'}
              </Button>
              <Link href="/customers">
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
