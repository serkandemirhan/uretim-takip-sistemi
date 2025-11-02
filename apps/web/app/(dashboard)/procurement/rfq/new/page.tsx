'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  ArrowLeft,
  Save,
  Calendar,
  Package,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface MaterialNeed {
  stock_id: string
  product_code: string
  product_name: string
  category: string
  unit: string
  current_quantity: number
  available_quantity: number
  suggested_order_quantity: number
  issue_type: 'project' | 'stock_level' | 'both'
}

interface RFQItem {
  stock_id: string
  quantity: number
}

export default function NewRFQPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const materialIds = searchParams.get('materials')?.split(',') || []

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [materials, setMaterials] = useState<MaterialNeed[]>([])

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  useEffect(() => {
    loadMaterialDetails()
  }, [])

  const loadMaterialDetails = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      // Fetch all materials from needs analysis
      const res = await fetch(`${API_URL}/api/procurement/needs-analysis?filter=all`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Malzeme bilgileri yüklenemedi')

      const data = await res.json()
      const allMaterials = data.data || []

      // Filter to only selected materials
      const selected = allMaterials.filter((m: MaterialNeed) =>
        materialIds.includes(m.stock_id)
      )

      setMaterials(selected)

      // Initialize quantities with suggested order quantities
      const initialQuantities: Record<string, number> = {}
      selected.forEach((m: MaterialNeed) => {
        initialQuantities[m.stock_id] = m.suggested_order_quantity
      })
      setQuantities(initialQuantities)

      // Set default title
      setTitle(`Malzeme Talebi - ${new Date().toLocaleDateString('tr-TR')}`)

      // Set default due date (7 days from now)
      const defaultDueDate = new Date()
      defaultDueDate.setDate(defaultDueDate.getDate() + 7)
      setDueDate(defaultDueDate.toISOString().split('T')[0])
    } catch (error: any) {
      toast.error(error.message || 'Veriler yüklenirken hata oluştu')
      router.push('/procurement/needs-analysis')
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = (stockId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    setQuantities((prev) => ({ ...prev, [stockId]: numValue }))
  }

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      toast.error('Lütfen RFQ başlığı girin')
      return
    }

    if (!dueDate) {
      toast.error('Lütfen son teklif tarihi seçin')
      return
    }

    // Build items and validate quantities
    const items: RFQItem[] = Object.entries(quantities).map(([stock_id, quantity]) => ({
      stock_id,
      quantity,
    }))
    const hasInvalidQuantity = items.some((i) => i.quantity <= 0)
    if (hasInvalidQuantity || items.length === 0) {
      toast.error('Tüm malzemeler için geçerli miktar girin')
      return
    }

    try {
      setSubmitting(true)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/procurement/rfq`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          due_date: dueDate,
          items,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Teklif Talebi oluşturulamadı')
      }

      const result = await res.json()
      toast.success(`Teklif Talebi başarıyla oluşturuldu: ${result.rfq_number}`)

      // Redirect to RFQ detail page
      router.push(`/procurement/rfq/${result.rfq_id}`)
    } catch (error: any) {
      toast.error(error.message || 'RFQ oluşturulurken hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (materials.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Malzeme Seçilmedi</h2>
            <p className="text-gray-600 mb-4">
              Teklif Talebi oluşturmak için malzeme seçmeniz gerekiyor.
            </p>
            <Link href="/procurement/needs-analysis">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                İhtiyaç Analizine Dön
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/procurement/needs-analysis">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Yeni Teklif Talebi Oluştur</h1>
            <p className="text-sm text-gray-600 mt-1">
              {materials.length} malzeme için fiyat teklifi talebi
            </p>
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {submitting ? 'Oluşturuluyor...' : 'Teklif Talebi Oluştur'}
        </Button>
      </div>

      {/* RFQ Details Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Teklif Talebi Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Başlık <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="Teklif Talebi başlığı girin..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Açıklama</label>
            <Textarea
              placeholder="Teklif Talebi hakkında ek bilgiler..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Son Teklif Tarihi <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Malzeme Listesi ({materials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm">
                  <th className="pb-3 font-medium text-gray-700">#</th>
                  <th className="pb-3 font-medium text-gray-700">Malzeme</th>
                  <th className="pb-3 font-medium text-gray-700">Kod</th>
                  <th className="pb-3 font-medium text-gray-700">Kategori</th>
                  <th className="pb-3 font-medium text-gray-700 text-right">Mevcut Stok</th>
                  <th className="pb-3 font-medium text-gray-700 text-right">Kullanılabilir</th>
                  <th className="pb-3 font-medium text-gray-700 text-right">
                    Talep Miktarı <span className="text-red-500">*</span>
                  </th>
                  <th className="pb-3 font-medium text-gray-700">Birim</th>
                  <th className="pb-3 font-medium text-gray-700">Durum</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material, index) => (
                  <tr key={material.stock_id} className="border-b hover:bg-gray-50">
                    <td className="py-3 text-gray-600">{index + 1}</td>
                    <td className="py-3">
                      <div className="font-medium">{material.product_name}</div>
                    </td>
                    <td className="py-3 text-sm text-gray-600">{material.product_code}</td>
                    <td className="py-3">
                      {material.category && (
                        <Badge variant="outline" className="text-xs">
                          {material.category}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-sm">{material.current_quantity.toFixed(2)}</span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-sm text-green-600 font-medium">
                        {material.available_quantity.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={quantities[material.stock_id] || ''}
                        onChange={(e) => updateQuantity(material.stock_id, e.target.value)}
                        className="w-32 text-right font-bold"
                      />
                    </td>
                    <td className="py-3">
                      <Badge variant="outline" className="text-xs">
                        {material.unit}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {material.issue_type === 'both' && (
                        <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
                          Proje + Stok
                        </Badge>
                      )}
                      {material.issue_type === 'project' && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                          Proje Eksik
                        </Badge>
                      )}
                      {material.issue_type === 'stock_level' && (
                        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                          Min. Stok
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">Teklif Talebi Oluşturma Hakkında</p>
              <ul className="space-y-1 list-disc list-inside text-blue-800">
                <li>Teklif Talebi numarası otomatik olarak oluşturulacaktır</li>
                <li>Talep miktarlarını ihtiyacınıza göre düzenleyebilirsiniz</li>
                <li>Teklif Talebi oluşturulduktan sonra tedarikçilere gönderebilirsiniz</li>
                <li>Tedarikçi teklifleri Teklif Talebi detay sayfasından yönetilecektir</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
