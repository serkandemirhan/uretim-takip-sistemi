'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  ArrowLeft,
  Calendar,
  Package,
  User,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Plus,
  Building2,
  GitCompare,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import SupplierQuotationDialog from './SupplierQuotationDialog'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface RFQItem {
  id: string
  stock_id: string
  product_code: string
  product_name: string
  category: string
  quantity: number
  unit: string
}

interface SupplierQuotation {
  id: string
  quotation_number: string
  supplier_name: string
  supplier_contact: string
  quotation_date: string
  valid_until: string
  status: string
  items_count: number
}

interface RFQDetail {
  id: string
  rfq_number: string
  title: string
  description: string
  status: string
  due_date: string
  created_at: string
  updated_at: string
  created_by_name: string
  items: RFQItem[]
  quotations: SupplierQuotation[]
  quotations_count: number
}

export default function RFQDetailPage() {
  const router = useRouter()
  const params = useParams()
  const rfqId = params.id as string

  const [rfq, setRfq] = useState<RFQDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isQuotationDialogOpen, setIsQuotationDialogOpen] = useState(false)

  useEffect(() => {
    if (rfqId) {
      loadRFQDetail()
    }
  }, [rfqId])

  const loadRFQDetail = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/procurement/rfq/${rfqId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('RFQ detayları yüklenemedi')

      const data = await res.json()
      setRfq(data.data)
    } catch (error: any) {
      toast.error(error.message || 'Veriler yüklenirken hata oluştu')
      router.push('/procurement/rfq')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!rfq) return

    try {
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/procurement/rfq/${rfqId}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) throw new Error('Durum güncellenemedi')

      toast.success('RFQ durumu güncellendi')
      loadRFQDetail()
    } catch (error: any) {
      toast.error(error.message || 'Durum güncellenirken hata oluştu')
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-lg px-3 py-1">
            Taslak
          </Badge>
        )
      case 'sent':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-lg px-3 py-1">
            Gönderildi
          </Badge>
        )
      case 'closed':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200 text-lg px-3 py-1">
            Kapatıldı
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 text-lg px-3 py-1">
            İptal
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
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
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

  if (!rfq) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/procurement/rfq">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{rfq.rfq_number}</h1>
              {getStatusBadge(rfq.status)}
            </div>
            <p className="text-lg text-gray-700 font-medium">{rfq.title}</p>
            {rfq.description && (
              <p className="text-sm text-gray-600 mt-2">{rfq.description}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {rfq.status === 'draft' && (
            <Button
              onClick={() => handleStatusChange('sent')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Tedarikçilere Gönder
            </Button>
          )}
          {rfq.status === 'sent' && (
            <>
              <Button
                onClick={() => handleStatusChange('closed')}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Kapat
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStatusChange('cancelled')}
                className="text-red-600 hover:text-red-700"
              >
                <XCircle className="h-4 w-4 mr-2" />
                İptal Et
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Son Teklif Tarihi</p>
                <p className="text-lg font-semibold">{formatDateShort(rfq.due_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Malzeme Sayısı</p>
                <p className="text-lg font-semibold">{rfq.items.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Alınan Teklif</p>
                <p className="text-lg font-semibold">{rfq.quotations_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RFQ Information */}
      <Card>
        <CardHeader>
          <CardTitle>RFQ Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-600">RFQ Numarası</label>
              <p className="mt-1 text-lg font-mono">{rfq.rfq_number}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Durum</label>
              <div className="mt-1">{getStatusBadge(rfq.status)}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Oluşturan</label>
              <div className="mt-1 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span>{rfq.created_by_name}</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Oluşturma Tarihi</label>
              <p className="mt-1">{formatDate(rfq.created_at)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Son Teklif Tarihi</label>
              <div className="mt-1 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{formatDateShort(rfq.due_date)}</span>
              </div>
            </div>

            {rfq.updated_at && rfq.updated_at !== rfq.created_at && (
              <div>
                <label className="text-sm font-medium text-gray-600">Son Güncelleme</label>
                <p className="mt-1">{formatDate(rfq.updated_at)}</p>
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
            Malzeme Listesi ({rfq.items.length})
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
                  <th className="pb-3 font-medium text-gray-700 text-right">Miktar</th>
                  <th className="pb-3 font-medium text-gray-700">Birim</th>
                </tr>
              </thead>
              <tbody>
                {rfq.items.map((item, index) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 text-gray-600">{index + 1}</td>
                    <td className="py-3">
                      <div className="font-medium">{item.product_name}</div>
                    </td>
                    <td className="py-3 font-mono text-sm text-gray-600">
                      {item.product_code}
                    </td>
                    <td className="py-3">
                      {item.category && (
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 text-right font-bold text-lg">
                      {item.quantity.toFixed(2)}
                    </td>
                    <td className="py-3">
                      <Badge variant="outline" className="text-xs">
                        {item.unit}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Quotations Section */}
      {rfq.status !== 'draft' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Tedarikçi Teklifleri ({rfq.quotations?.length || 0})
              </CardTitle>
              <div className="flex gap-2">
                {rfq.quotations && rfq.quotations.length >= 2 && (
                  <Link href={`/procurement/rfq/${rfqId}/compare`}>
                    <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
                      <GitCompare className="h-4 w-4 mr-2" />
                      Karşılaştır
                    </Button>
                  </Link>
                )}
                <Button
                  onClick={() => setIsQuotationDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Teklif Ekle
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!rfq.quotations || rfq.quotations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Henüz teklif alınmadı</p>
                <p className="text-sm mt-2">
                  Tedarikçilerden gelen teklifleri kaydetmek için "Teklif Ekle" butonuna tıklayın
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {rfq.quotations.map((quotation) => (
                  <div
                    key={quotation.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/procurement/quotations/${quotation.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono text-sm font-semibold text-blue-600">
                            {quotation.quotation_number}
                          </span>
                          {quotation.status === 'pending' && (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                              Beklemede
                            </Badge>
                          )}
                          {quotation.status === 'accepted' && (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              Kabul Edildi
                            </Badge>
                          )}
                          {quotation.status === 'rejected' && (
                            <Badge className="bg-red-100 text-red-700 border-red-200">
                              Reddedildi
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Tedarikçi:</span>
                            <p className="font-medium">{quotation.supplier_name}</p>
                            {quotation.supplier_contact && (
                              <p className="text-xs text-gray-500">{quotation.supplier_contact}</p>
                            )}
                          </div>

                          <div>
                            <span className="text-gray-600">Teklif Tarihi:</span>
                            <p className="font-medium">{formatDateShort(quotation.quotation_date)}</p>
                            {quotation.valid_until && (
                              <p className="text-xs text-gray-500">
                                Geçerlilik: {formatDateShort(quotation.valid_until)}
                              </p>
                            )}
                          </div>

                          <div>
                            <span className="text-gray-600">Kalem Sayısı:</span>
                            <p className="font-medium">{quotation.items_count} malzeme</p>
                          </div>
                        </div>
                      </div>

                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Supplier Quotation Dialog */}
      <SupplierQuotationDialog
        open={isQuotationDialogOpen}
        onOpenChange={setIsQuotationDialogOpen}
        rfqId={rfqId}
        rfqItems={rfq.items}
        onSuccess={() => {
          setIsQuotationDialogOpen(false)
          loadRFQDetail()
        }}
      />

      {/* Help Text */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">RFQ İş Akışı</p>
              <ul className="space-y-1 list-disc list-inside text-blue-800">
                <li><strong>Taslak:</strong> RFQ oluşturuldu, henüz gönderilmedi</li>
                <li><strong>Gönderildi:</strong> Tedarikçilere gönderildi, teklifler bekleniyor</li>
                <li><strong>Kapatıldı:</strong> Teklifler değerlendirildi, satın alma siparişi oluşturulabilir</li>
                <li><strong>İptal:</strong> RFQ iptal edildi</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
