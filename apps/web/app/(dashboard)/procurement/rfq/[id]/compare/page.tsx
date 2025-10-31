'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Award,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// Exchange rates (can be updated or fetched from API)
const EXCHANGE_RATES: Record<string, number> = {
  TRY: 1,
  USD: 34.5,
  EUR: 37.2,
}

interface RFQItem {
  id: string
  product_code: string
  product_name: string
  quantity: number
  unit: string
}

interface QuotationItem {
  id: string
  rfq_item_id: string
  product_code: string
  product_name: string
  unit_price: number | null
  quantity: number
  currency: string
  lead_time_days: number | null
  notes: string
  total_price: number
}

interface Quotation {
  id: string
  quotation_number: string
  quotation_date: string
  valid_until: string
  payment_terms: string
  delivery_terms: string
  status: string
  notes: string
  supplier_name: string
  supplier_contact: string
  supplier_email: string
  supplier_phone: string
  total_amount: number
  items: QuotationItem[]
}

interface ComparisonData {
  rfq: {
    id: string
    rfq_number: string
    title: string
  }
  rfq_items: RFQItem[]
  quotations: Quotation[]
}

export default function QuotationComparisonPage() {
  const router = useRouter()
  const params = useParams()
  const rfqId = params.id as string

  const [data, setData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (rfqId) {
      loadComparisonData()
    }
  }, [rfqId])

  const loadComparisonData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/procurement/rfq/${rfqId}/quotations/compare`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Karşılaştırma verileri yüklenemedi')

      const result = await res.json()
      setData(result.data)
    } catch (error: any) {
      toast.error(error.message || 'Veriler yüklenirken hata oluştu')
      router.push(`/procurement/rfq/${rfqId}`)
    } finally {
      setLoading(false)
    }
  }

  const convertToTRY = (amount: number, currency: string): number => {
    const rate = EXCHANGE_RATES[currency] || 1
    return amount * rate
  }

  const handleStatusChange = async (quotationId: string, newStatus: string) => {
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

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Durum güncellenemedi' }))
        console.error('Status change error:', errorData)
        throw new Error(errorData.error || 'Durum güncellenemedi')
      }

      toast.success('Teklif durumu güncellendi')
      loadComparisonData()
    } catch (error: any) {
      console.error('Status change exception:', error)
      toast.error(error.message || 'Durum güncellenirken hata oluştu')
    }
  }

  const getBestPrice = (rfqItemId: string): number | null => {
    if (!data) return null

    const prices = data.quotations
      .filter((q) => q.status !== 'rejected')
      .map((q) => {
        const item = q.items.find((i) => i.rfq_item_id === rfqItemId)
        if (!item?.unit_price) return null
        // Convert to TRY for fair comparison
        return convertToTRY(item.unit_price, item.currency)
      })
      .filter((p) => p !== null) as number[]

    if (prices.length === 0) return null
    return Math.min(...prices)
  }

  const getTotalInTRY = (quotation: Quotation): number => {
    return quotation.items.reduce((sum, item) => {
      return sum + convertToTRY(item.total_price, item.currency)
    }, 0)
  }

  const getBestTotalPrice = (): number | null => {
    if (!data) return null

    const totals = data.quotations
      .filter((q) => q.status !== 'rejected')
      .map((q) => getTotalInTRY(q))

    if (totals.length === 0) return null
    return Math.min(...totals)
  }

  const areAllQuantitiesSame = (rfqItem: RFQItem): boolean => {
    if (!data) return true

    const quantities = data.quotations
      .map((q) => {
        const item = q.items.find((i) => i.rfq_item_id === rfqItem.id)
        return item?.quantity
      })
      .filter((q) => q !== undefined)

    return quantities.every((q) => q === quantities[0])
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Beklemede
          </Badge>
        )
      case 'selected':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Kabul Edildi
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Reddedildi
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
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

  if (!data || data.quotations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600 mb-4">Karşılaştırılacak teklif bulunamadı</p>
            <Link href={`/procurement/rfq/${rfqId}`}>
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                RFQ Detayına Dön
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const bestTotal = getBestTotalPrice()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/procurement/rfq/${rfqId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teklif Karşılaştırma</h1>
            <p className="text-sm text-gray-600 mt-1">
              {data.rfq.rfq_number} - {data.rfq.title}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Teklif Sayısı</p>
                <p className="text-2xl font-bold">{data.quotations.length}</p>
              </div>
              <Award className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Kabul Edildi</p>
                <p className="text-2xl font-bold text-green-600">
                  {data.quotations.filter((q) => q.status === 'selected').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">En İyi Teklif</p>
                <p className="text-2xl font-bold text-purple-600">
                  {bestTotal?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fiyat Karşılaştırması</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2">
                  <th className="text-left py-3 px-2 font-medium text-gray-700 sticky left-0 bg-white z-10">
                    Malzeme
                  </th>
                  {data.quotations.map((quotation) => (
                    <th key={quotation.id} className="py-3 px-4 text-center min-w-[200px]">
                      <div className="space-y-2">
                        <div className="font-mono text-xs text-blue-600">
                          {quotation.quotation_number}
                        </div>
                        <div className="font-semibold">{quotation.supplier_name}</div>
                        <div>{getStatusBadge(quotation.status)}</div>
                        {quotation.status === 'pending' && (
                          <div className="flex gap-1 justify-center mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 text-green-600 hover:bg-green-50"
                              onClick={() => handleStatusChange(quotation.id, 'selected')}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Kabul
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 text-red-600 hover:bg-red-50"
                              onClick={() => handleStatusChange(quotation.id, 'rejected')}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reddet
                            </Button>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rfq_items.map((rfqItem) => {
                  const bestPrice = getBestPrice(rfqItem.id)
                  const showQuantity = !areAllQuantitiesSame(rfqItem)

                  return (
                    <tr key={rfqItem.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2 sticky left-0 bg-white">
                        <div className="font-medium">{rfqItem.product_name}</div>
                        <div className="text-xs text-gray-500">
                          {rfqItem.product_code} • {rfqItem.quantity} {rfqItem.unit}
                        </div>
                      </td>
                      {data.quotations.map((quotation) => {
                        const item = quotation.items.find((i) => i.rfq_item_id === rfqItem.id)
                        const itemPriceInTRY = item?.unit_price
                          ? convertToTRY(item.unit_price, item.currency)
                          : null
                        const isBestPrice =
                          itemPriceInTRY === bestPrice && bestPrice !== null
                        const isRejected = quotation.status === 'rejected'

                        return (
                          <td
                            key={quotation.id}
                            className={cn(
                              'py-3 px-4 text-center',
                              isBestPrice && !isRejected && 'bg-green-50',
                              isRejected && 'opacity-50'
                            )}
                          >
                            {item ? (
                              <div className="space-y-1">
                                <div
                                  className={cn(
                                    'font-bold text-lg flex items-center justify-center gap-1',
                                    isBestPrice && !isRejected && 'text-green-700'
                                  )}
                                >
                                  {isBestPrice && !isRejected && (
                                    <Award className="w-4 h-4 text-green-600" />
                                  )}
                                  {item.unit_price?.toLocaleString('tr-TR', {
                                    minimumFractionDigits: 2,
                                  }) || '-'}{' '}
                                  {item.currency}
                                </div>
                                {showQuantity && (
                                  <div className="text-xs text-gray-600">
                                    Miktar: {item.quantity} {rfqItem.unit}
                                  </div>
                                )}
                                {item.lead_time_days && (
                                  <div className="text-xs text-gray-500">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    {item.lead_time_days} gün
                                  </div>
                                )}
                                <div className="text-xs font-semibold text-gray-700 pt-1 border-t">
                                  Toplam:{' '}
                                  {convertToTRY(item.total_price, item.currency).toLocaleString(
                                    'tr-TR',
                                    { minimumFractionDigits: 2 }
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-gray-400">-</div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}

                {/* Total Row */}
                <tr className="border-t-2 bg-gray-50 font-bold">
                  <td className="py-4 px-2 sticky left-0 bg-gray-50">
                    <div className="text-lg">TOPLAM TUTAR</div>
                  </td>
                  {data.quotations.map((quotation) => {
                    const totalInTRY = getTotalInTRY(quotation)
                    const isBest = Math.abs(totalInTRY - (bestTotal || 0)) < 0.01
                    const isRejected = quotation.status === 'rejected'

                    return (
                      <td
                        key={quotation.id}
                        className={cn(
                          'py-4 px-4 text-center',
                          isBest && !isRejected && 'bg-green-100',
                          isRejected && 'opacity-50'
                        )}
                      >
                        <div
                          className={cn(
                            'text-xl flex items-center justify-center gap-2',
                            isBest && !isRejected && 'text-green-700'
                          )}
                        >
                          {isBest && !isRejected && <Award className="w-5 h-5 text-green-600" />}
                          {totalInTRY.toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                          })}{' '}
                          TRY
                        </div>
                      </td>
                    )
                  })}
                </tr>

                {/* Additional Info Rows */}
                <tr className="border-b bg-gray-50">
                  <td className="py-3 px-2 font-medium sticky left-0 bg-gray-50">Teklif Tarihi</td>
                  {data.quotations.map((quotation) => (
                    <td key={quotation.id} className="py-3 px-4 text-center text-sm">
                      {formatDate(quotation.quotation_date)}
                    </td>
                  ))}
                </tr>

                <tr className="border-b bg-gray-50">
                  <td className="py-3 px-2 font-medium sticky left-0 bg-gray-50">Geçerlilik</td>
                  {data.quotations.map((quotation) => (
                    <td key={quotation.id} className="py-3 px-4 text-center text-sm">
                      {quotation.valid_until ? formatDate(quotation.valid_until) : '-'}
                    </td>
                  ))}
                </tr>

                <tr className="border-b bg-gray-50">
                  <td className="py-3 px-2 font-medium sticky left-0 bg-gray-50">
                    Ödeme Koşulları
                  </td>
                  {data.quotations.map((quotation) => (
                    <td key={quotation.id} className="py-3 px-4 text-center text-sm">
                      {quotation.payment_terms || '-'}
                    </td>
                  ))}
                </tr>

                <tr className="border-b bg-gray-50">
                  <td className="py-3 px-2 font-medium sticky left-0 bg-gray-50">
                    Teslimat Koşulları
                  </td>
                  {data.quotations.map((quotation) => (
                    <td key={quotation.id} className="py-3 px-4 text-center text-sm">
                      {quotation.delivery_terms || '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Award className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">Karşılaştırma İpuçları</p>
              <ul className="space-y-1 list-disc list-inside text-blue-800">
                <li>
                  <strong>Yeşil arka plan:</strong> Her malzeme için en iyi (en düşük) fiyat
                </li>
                <li>
                  <strong>Altın ikon (
                    <Award className="w-3 h-3 inline" />
                    ):</strong> En iyi fiyat işareti
                </li>
                <li>
                  <strong>Toplam:</strong> Tüm para birimleri TL'ye çevrilerek karşılaştırılır
                  (USD: {EXCHANGE_RATES.USD} TRY, EUR: {EXCHANGE_RATES.EUR} TRY)
                </li>
                <li>Reddedilen teklifler bulanık görünür ve karşılaştırmaya dahil edilmez</li>
                <li>Teklifleri doğrudan bu ekrandan kabul veya reddedebilirsiniz</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
