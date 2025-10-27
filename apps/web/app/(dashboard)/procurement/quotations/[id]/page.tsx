'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Building2,
  Calendar,
  Package,
  FileText,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface QuotationItem {
  id: string
  rfq_item_id: string
  product_code: string
  product_name: string
  unit: string
  rfq_quantity: number
  quantity: number
  unit_price: number
  currency: string
  lead_time_days: number | null
  notes: string
  total_price: number
}

interface QuotationDetail {
  id: string
  quotation_number: string
  rfq_id: string
  rfq_number: string
  rfq_title: string
  supplier_id: string
  supplier_name: string
  supplier_contact: string
  supplier_email: string
  supplier_phone: string
  quotation_date: string
  valid_until: string
  payment_terms: string
  delivery_terms: string
  status: string
  notes: string
  created_at: string
  created_by_name: string
  items: QuotationItem[]
  total_amount: number
}

export default function QuotationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const quotationId = params.id as string

  const [quotation, setQuotation] = useState<QuotationDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (quotationId) {
      loadQuotationDetail()
    }
  }, [quotationId])

  const loadQuotationDetail = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/procurement/quotations/${quotationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Teklif detayları yüklenemedi')

      const data = await res.json()
      setQuotation(data.data)
    } catch (error: any) {
      toast.error(error.message || 'Veriler yüklenirken hata oluştu')
      router.push('/procurement/rfq')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!quotation) return

    try {
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/procurement/quotations/${quotationId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Durum güncellenemedi')

      toast.success('Teklif durumu güncellendi')
      loadQuotationDetail()
    } catch (error: any) {
      toast.error(error.message || 'Durum güncellenirken hata oluştu')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-lg px-3 py-1">
            <Clock className="w-4 h-4 mr-1" />
            Beklemede
          </Badge>
        )
      case 'accepted':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200 text-lg px-3 py-1">
            <CheckCircle className="w-4 h-4 mr-1" />
            Kabul Edildi
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 text-lg px-3 py-1">
            <XCircle className="w-4 h-4 mr-1" />
            Reddedildi
          </Badge>
        )
      case 'expired':
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-lg px-3 py-1">
            Süresi Doldu
          </Badge>
        )
      default:
        return <Badge variant="outline" className="text-lg px-3 py-1">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
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

  if (!quotation) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href={`/procurement/rfq/${quotation.rfq_id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              RFQ'ya Dön
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{quotation.quotation_number}</h1>
              {getStatusBadge(quotation.status)}
            </div>
            <p className="text-sm text-gray-600">
              RFQ: {quotation.rfq_number} - {quotation.rfq_title}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {quotation.status === 'pending' && (
            <>
              <Button
                onClick={() => handleStatusChange('accepted')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Kabul Et
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStatusChange('rejected')}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reddet
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Supplier Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Tedarikçi Bilgileri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-600">Tedarikçi</label>
              <p className="mt-1 text-lg font-semibold">{quotation.supplier_name}</p>
            </div>

            {quotation.supplier_contact && (
              <div>
                <label className="text-sm font-medium text-gray-600">Yetkili Kişi</label>
                <p className="mt-1">{quotation.supplier_contact}</p>
              </div>
            )}

            {quotation.supplier_email && (
              <div>
                <label className="text-sm font-medium text-gray-600">E-posta</label>
                <div className="mt-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a href={`mailto:${quotation.supplier_email}`} className="text-blue-600 hover:underline">
                    {quotation.supplier_email}
                  </a>
                </div>
              </div>
            )}

            {quotation.supplier_phone && (
              <div>
                <label className="text-sm font-medium text-gray-600">Telefon</label>
                <div className="mt-1 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{quotation.supplier_phone}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quotation Info */}
      <Card>
        <CardHeader>
          <CardTitle>Teklif Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-600">Teklif Numarası</label>
              <p className="mt-1 text-lg font-mono">{quotation.quotation_number}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Durum</label>
              <div className="mt-1">{getStatusBadge(quotation.status)}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Teklif Tarihi</label>
              <div className="mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{formatDate(quotation.quotation_date)}</span>
              </div>
            </div>

            {quotation.valid_until && (
              <div>
                <label className="text-sm font-medium text-gray-600">Geçerlilik Tarihi</label>
                <div className="mt-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatDate(quotation.valid_until)}</span>
                </div>
              </div>
            )}

            {quotation.payment_terms && (
              <div>
                <label className="text-sm font-medium text-gray-600">Ödeme Koşulları</label>
                <p className="mt-1">{quotation.payment_terms}</p>
              </div>
            )}

            {quotation.delivery_terms && (
              <div>
                <label className="text-sm font-medium text-gray-600">Teslimat Koşulları</label>
                <p className="mt-1">{quotation.delivery_terms}</p>
              </div>
            )}

            {quotation.notes && (
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-600">Notlar</label>
                <p className="mt-1 text-gray-700">{quotation.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Teklif Kalemleri ({quotation.items.length})
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
                  <th className="pb-3 font-medium text-gray-700 text-right">RFQ Miktar</th>
                  <th className="pb-3 font-medium text-gray-700 text-right">Teklif Miktar</th>
                  <th className="pb-3 font-medium text-gray-700 text-right">Birim Fiyat</th>
                  <th className="pb-3 font-medium text-gray-700 text-right">Toplam</th>
                  <th className="pb-3 font-medium text-gray-700 text-center">Teslimat</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item, index) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 text-gray-600">{index + 1}</td>
                    <td className="py-3">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-xs text-gray-500">{item.unit}</div>
                    </td>
                    <td className="py-3 font-mono text-sm text-gray-600">
                      {item.product_code}
                    </td>
                    <td className="py-3 text-right text-sm text-gray-600">
                      {item.rfq_quantity.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {item.quantity.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-bold">
                      {item.unit_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {item.currency}
                    </td>
                    <td className="py-3 text-right font-bold text-blue-600">
                      {item.total_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} {item.currency}
                    </td>
                    <td className="py-3 text-center text-sm">
                      {item.lead_time_days ? (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {item.lead_time_days} gün
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 bg-gray-50 font-bold">
                  <td colSpan={6} className="py-4 text-right text-lg">
                    TOPLAM TUTAR:
                  </td>
                  <td className="py-4 text-right text-xl text-green-600">
                    {quotation.total_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {quotation.status === 'accepted' && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Teklif Kabul Edildi</p>
                <p className="text-sm text-green-700 mt-1">
                  Bu teklif kabul edildi. Satın alma siparişi oluşturabilirsiniz.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Text */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">Teklif Durumları</p>
              <ul className="space-y-1 list-disc list-inside text-blue-800">
                <li><strong>Beklemede:</strong> Teklif değerlendiriliyor</li>
                <li><strong>Kabul Edildi:</strong> Teklif onaylandı, satın alma siparişi oluşturulabilir</li>
                <li><strong>Reddedildi:</strong> Teklif reddedildi</li>
                <li><strong>Süresi Doldu:</strong> Teklif geçerlilik süresi doldu</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
