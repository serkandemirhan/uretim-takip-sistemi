'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Package,
  AlertTriangle,
  TrendingDown,
  ShoppingCart,
  Filter,
  Download,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface MaterialNeed {
  planned_usage_date: string
  job_id: string
  job_number: string
  job_title: string
  job_status: string
  stock_id: string
  stock_name: string
  stock_code: string
  category: string
  reserved_quantity: number
  used_quantity: number
  remaining_need: number
  current_physical_stock: number
  total_reserved: number
  total_on_order: number
  truly_available: number
  unit: string
  reservation_status: string
}

interface StockSummary {
  stock_id: string
  stock_code: string
  stock_name: string
  category: string
  unit: string
  current_physical_stock: number
  total_reserved: number
  total_on_order: number
  truly_available: number
  total_needed: number
  shortage: number
  earliest_need_date: string
  jobs_count: number
  needs: MaterialNeed[]
}

export default function PurchasingNeedsAnalysisPage() {
  const [needs, setNeeds] = useState<MaterialNeed[]>([])
  const [loading, setLoading] = useState(true)
  const [daysAhead, setDaysAhead] = useState(30)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    loadNeeds()
  }, [daysAhead])

  const loadNeeds = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/stock-reservations/upcoming-needs?days=${daysAhead}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Veriler yüklenemedi')

      const data = await res.json()
      setNeeds(data)
    } catch (error: any) {
      toast.error(error.message || 'Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // Group needs by stock
  const stockSummaries = useMemo(() => {
    const grouped: { [key: string]: StockSummary } = {}

    needs.forEach((need) => {
      if (!grouped[need.stock_id]) {
        grouped[need.stock_id] = {
          stock_id: need.stock_id,
          stock_code: need.stock_code,
          stock_name: need.stock_name,
          category: need.category,
          unit: need.unit,
          current_physical_stock: need.current_physical_stock,
          total_reserved: need.total_reserved,
          total_on_order: need.total_on_order,
          truly_available: need.truly_available,
          total_needed: 0,
          shortage: 0,
          earliest_need_date: need.planned_usage_date,
          jobs_count: 0,
          needs: [],
        }
      }

      grouped[need.stock_id].needs.push(need)
      grouped[need.stock_id].total_needed += need.remaining_need
      grouped[need.stock_id].jobs_count = new Set(grouped[need.stock_id].needs.map((n) => n.job_id)).size

      // Update earliest date
      if (need.planned_usage_date < grouped[need.stock_id].earliest_need_date) {
        grouped[need.stock_id].earliest_need_date = need.planned_usage_date
      }
    })

    // Calculate shortage
    Object.values(grouped).forEach((summary) => {
      const availableAfterReserved = summary.truly_available
      const totalOnOrder = summary.total_on_order
      const totalNeeded = summary.total_needed

      // Shortage = needed - (available + on_order)
      summary.shortage = Math.max(0, totalNeeded - (availableAfterReserved + totalOnOrder))
    })

    return Object.values(grouped).sort((a, b) => {
      // Sort by shortage (critical first), then by earliest date
      if (a.shortage !== b.shortage) return b.shortage - a.shortage
      return a.earliest_need_date.localeCompare(b.earliest_need_date)
    })
  }, [needs])

  // Filter summaries
  const filteredSummaries = useMemo(() => {
    return stockSummaries.filter((summary) => {
      const matchesSearch =
        summary.stock_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        summary.stock_code.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = selectedCategory === 'all' || summary.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [stockSummaries, searchTerm, selectedCategory])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(stockSummaries.map((s) => s.category).filter(Boolean))
    return Array.from(cats).sort()
  }, [stockSummaries])

  // Calculate stats
  const stats = useMemo(() => {
    const criticalCount = stockSummaries.filter((s) => s.shortage > 0).length
    const totalShortage = stockSummaries.reduce((sum, s) => sum + s.shortage, 0)
    const totalNeeded = stockSummaries.reduce((sum, s) => sum + s.total_needed, 0)
    const totalOnOrder = stockSummaries.reduce((sum, s) => sum + s.total_on_order, 0)

    return {
      totalMaterials: stockSummaries.length,
      criticalCount,
      totalShortage,
      totalNeeded,
      totalOnOrder,
    }
  }, [stockSummaries])

  const getShortageColor = (shortage: number) => {
    if (shortage === 0) return 'text-green-600'
    if (shortage > 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getShortageIcon = (shortage: number) => {
    if (shortage > 0) return <AlertTriangle className="h-4 w-4 text-red-600" />
    return null
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Malzeme İhtiyaç Analizi</h1>
        <p className="text-sm text-gray-600 mt-1">
          Rezervasyonlara göre yaklaşan malzeme ihtiyaçları ve eksikler
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Malzeme</p>
                <p className="text-2xl font-bold">{stats.totalMaterials}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Kritik Eksik</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam İhtiyaç</p>
                <p className="text-2xl font-bold text-blue-600">{stats.totalNeeded.toFixed(0)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Siparişte</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.totalOnOrder.toFixed(0)}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-yellow-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Eksik</p>
                <p className="text-2xl font-bold text-red-600">{stats.totalShortage.toFixed(0)}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Ara</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Malzeme adı veya kodu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-64">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Kategori</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
              >
                <option value="all">Tüm Kategoriler</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-48">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Zaman Aralığı</label>
              <select
                value={daysAhead}
                onChange={(e) => setDaysAhead(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
              >
                <option value={7}>7 Gün</option>
                <option value={14}>14 Gün</option>
                <option value={30}>30 Gün</option>
                <option value={60}>60 Gün</option>
                <option value={90}>90 Gün</option>
              </select>
            </div>

            <Button variant="outline" onClick={loadNeeds}>
              <Filter className="h-4 w-4 mr-2" />
              Yenile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle>Malzeme İhtiyaçları ve Eksikler</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSummaries.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Seçilen kriterlere göre malzeme ihtiyacı bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm">
                    <th className="pb-3 font-medium text-gray-700 w-8"></th>
                    <th className="pb-3 font-medium text-gray-700">Malzeme</th>
                    <th className="pb-3 font-medium text-gray-700">Kod</th>
                    <th className="pb-3 font-medium text-gray-700">Kategori</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">Fiziksel Stok</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">Rezerve</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">Kullanılabilir</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">Siparişte</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">Toplam İhtiyaç</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">Eksik</th>
                    <th className="pb-3 font-medium text-gray-700">İlk İhtiyaç</th>
                    <th className="pb-3 font-medium text-gray-700 text-center">İş Sayısı</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummaries.map((summary) => (
                    <tr
                      key={summary.stock_id}
                      className={cn(
                        'border-b hover:bg-gray-50',
                        summary.shortage > 0 && 'bg-red-50 hover:bg-red-100'
                      )}
                    >
                      <td className="py-3">{getShortageIcon(summary.shortage)}</td>
                      <td className="py-3">
                        <div className="font-medium">{summary.stock_name}</div>
                      </td>
                      <td className="py-3 text-sm text-gray-600">{summary.stock_code}</td>
                      <td className="py-3">
                        {summary.category && (
                          <Badge variant="outline" className="text-xs">
                            {summary.category}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {summary.current_physical_stock.toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-blue-600">
                        {summary.total_reserved.toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-medium text-green-600">
                        {summary.truly_available.toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-yellow-600">
                        {summary.total_on_order.toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-bold text-blue-700">
                        {summary.total_needed.toFixed(2)}
                      </td>
                      <td className={cn('py-3 text-right font-bold', getShortageColor(summary.shortage))}>
                        {summary.shortage > 0 ? summary.shortage.toFixed(2) : '-'}
                      </td>
                      <td className="py-3 text-sm">
                        {new Date(summary.earliest_need_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant="outline" className="text-xs">
                          {summary.jobs_count} iş
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Link href={`/stocks?search=${summary.stock_code}`}>
                            <Button variant="ghost" size="sm">
                              Detay
                            </Button>
                          </Link>
                          {summary.shortage > 0 && (
                            <Link href={`/purchase-requests/new?stock_id=${summary.stock_id}`}>
                              <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                Satın Al
                              </Button>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Package className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">Kullanım Talimatları</p>
              <ul className="space-y-1 list-disc list-inside text-blue-800">
                <li>
                  <strong>Fiziksel Stok:</strong> Depoda mevcut bulunan miktar
                </li>
                <li>
                  <strong>Rezerve:</strong> Projelere tahsis edilmiş ancak henüz kullanılmamış miktar
                </li>
                <li>
                  <strong>Kullanılabilir:</strong> Fiziksel - Rezerve = Gerçekten kullanılabilir miktar
                </li>
                <li>
                  <strong>Siparişte:</strong> Onaylanmış ve tedarikçiden beklenen miktar
                </li>
                <li>
                  <strong>Eksik:</strong> İhtiyaç - (Kullanılabilir + Siparişte) - Kırmızı olanlar acil!
                </li>
                <li>Eksik olan malzemeler için "Satın Al" butonuyla RFQ oluşturabilirsiniz</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
