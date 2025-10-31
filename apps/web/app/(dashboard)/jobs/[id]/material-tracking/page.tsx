'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Loader2,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface MaterialTracking {
  stock_id: string
  product_code: string
  product_name: string
  unit: string
  planned_quantity: number
  used_quantity: number
  remaining_quantity: number
  reserved_quantity: number
  reserved_used_quantity: number
  unused_reservation: number
  stock_current_quantity: number
  usage_percentage: number
  status: 'not_started' | 'in_progress' | 'completed' | 'exceeded' | 'unplanned'
}

export default function MaterialTrackingPage() {
  const params = useParams()
  const jobId = params.id as string

  const [job, setJob] = useState<any>(null)
  const [materials, setMaterials] = useState<MaterialTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [showLegend, setShowLegend] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showExceeded, setShowExceeded] = useState(false)

  useEffect(() => {
    loadData()
  }, [jobId])

  const loadData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const [jobRes, materialsRes] = await Promise.all([
        fetch(`${API_URL}/api/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/jobs/${jobId}/material-tracking`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (jobRes.ok) {
        const jobData = await jobRes.json()
        setJob(jobData.data)
      }

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json()
        setMaterials(materialsData.data || [])
      } else {
        toast.error('Malzeme takibi yüklenemedi')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: {
        icon: CheckCircle,
        text: 'Tamamlandı',
        color: 'bg-green-50 text-green-700 border-green-200',
      },
      in_progress: {
        icon: Clock,
        text: 'Devam Ediyor',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      exceeded: {
        icon: AlertTriangle,
        text: 'Fazla',
        color: 'bg-red-50 text-red-700 border-red-200',
      },
      unplanned: {
        icon: HelpCircle,
        text: 'Plansız',
        color: 'bg-orange-50 text-orange-700 border-orange-200',
      },
      not_started: {
        icon: Package,
        text: 'Bekliyor',
        color: 'bg-gray-50 text-gray-600 border-gray-200',
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return null

    const Icon = config.icon

    return (
      <Badge className={cn('text-xs px-2 py-1 border', config.color)}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    )
  }

  const getProgressBarColor = (percentage: number, isExceeded: boolean = false) => {
    if (isExceeded) return 'bg-red-500'
    if (percentage === 0) return 'bg-gray-300'
    if (percentage < 50) return 'bg-yellow-500'
    if (percentage < 100) return 'bg-blue-500'
    return 'bg-green-500'
  }

  // Filter materials
  const filteredMaterials = materials.filter((material) => {
    const matchesSearch =
      material.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.product_code.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = !showExceeded || material.status === 'exceeded' || material.status === 'unplanned'

    return matchesSearch && matchesFilter
  })

  // Stats
  const stats = {
    total: materials.length,
    completed: materials.filter((m) => m.status === 'completed').length,
    inProgress: materials.filter((m) => m.status === 'in_progress').length,
    unplanned: materials.filter((m) => m.status === 'unplanned').length,
    notStarted: materials.filter((m) => m.status === 'not_started').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Malzeme Takibi</h1>
          <p className="text-sm text-gray-500">
            {job
              ? `${job.job_number || job.title} - Planlanan vs Kullanılan Malzemeler`
              : 'Yükleniyor...'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/jobs/${jobId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              İşe Dön
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards - Minimalist with border accent */}
      {!loading && materials.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-gray-500 mb-1">Toplam Malzeme</div>
              <div className="text-2xl font-semibold text-gray-900">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-400">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-gray-500 mb-1">Tamamlanan</div>
              <div className="text-2xl font-semibold text-gray-900">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-gray-500 mb-1">Devam Eden</div>
              <div className="text-2xl font-semibold text-gray-900">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-400">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-gray-500 mb-1">Plansız Kullanım</div>
              <div className="text-2xl font-semibold text-gray-900">{stats.unplanned}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gray-300">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-gray-500 mb-1">Başlanmamış</div>
              <div className="text-2xl font-semibold text-gray-900">{stats.notStarted}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter Bar */}
      {!loading && materials.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Malzeme adı veya kodu ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={showExceeded ? 'default' : 'outline'}
                onClick={() => setShowExceeded(!showExceeded)}
                className="whitespace-nowrap"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showExceeded ? 'Tüm Malzemeler' : 'Sadece Fazla Kullanılanlar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Malzeme Kullanım Detayları
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : materials.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Bu iş için henüz onaylanmış malzeme listesi bulunmuyor.</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Arama kriterlerine uygun malzeme bulunamadı.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Malzeme
                    </TableHead>
                    <TableHead className="text-center uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Planlanan
                    </TableHead>
                    <TableHead className="text-center uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Kullanılan
                    </TableHead>
                    <TableHead className="text-center uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Kalan
                    </TableHead>
                    <TableHead className="text-center uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Rezerve
                    </TableHead>
                    <TableHead className="text-center uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Kullanılmamış Rez.
                    </TableHead>
                    <TableHead className="text-center uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Mevcut Stok
                    </TableHead>
                    <TableHead className="text-center uppercase text-xs tracking-wider font-semibold text-gray-600">
                      İlerleme
                    </TableHead>
                    <TableHead className="uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Durum
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material, index) => (
                    <TableRow
                      key={material.stock_id}
                      className={cn(
                        'hover:bg-gray-50 transition-colors',
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      )}
                    >
                      <TableCell className="py-2.5">
                        <div>
                          <div className="font-medium text-gray-900">
                            {material.product_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {material.product_code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <div className="font-medium text-gray-900">
                          {material.planned_quantity.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-500">{material.unit}</div>
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <div className="font-medium text-gray-900">
                          {material.used_quantity.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-500">{material.unit}</div>
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <div
                          className={cn(
                            'font-medium',
                            material.remaining_quantity < 0
                              ? 'text-red-600'
                              : material.remaining_quantity === 0
                              ? 'text-green-600'
                              : 'text-gray-900'
                          )}
                        >
                          {material.remaining_quantity.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-500">{material.unit}</div>
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <div className="font-medium text-gray-900">
                          {material.reserved_quantity.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-500">{material.unit}</div>
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <div className="font-medium text-gray-900">
                          {material.unused_reservation.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-500">{material.unit}</div>
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        <div
                          className={cn(
                            'font-medium',
                            material.stock_current_quantity < material.remaining_quantity
                              ? 'text-red-600'
                              : 'text-gray-900'
                          )}
                        >
                          {material.stock_current_quantity.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-500">{material.unit}</div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <div className="w-full min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full transition-all duration-300',
                                  getProgressBarColor(
                                    material.usage_percentage,
                                    material.status === 'exceeded'
                                  )
                                )}
                                style={{
                                  width: `${Math.min(material.usage_percentage, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium w-10 text-right text-gray-700">
                              {material.usage_percentage}%
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">{getStatusBadge(material.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collapsible Legend */}
      {!loading && materials.length > 0 && (
        <Card className="border-l-4 border-l-blue-200 bg-gray-50/50">
          <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowLegend(!showLegend)}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-blue-600" />
                Tanımlar
              </CardTitle>
              {showLegend ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </div>
          </CardHeader>
          {showLegend && (
            <CardContent className="text-sm text-gray-600 space-y-2 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-700 min-w-[140px]">Planlanan:</span>
                  <span>Onaylanmış malzeme listelerindeki toplam miktar</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-700 min-w-[140px]">Kullanılan:</span>
                  <span>Bu iş için yapılan stok çıkışlarının toplamı</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-700 min-w-[140px]">Kalan:</span>
                  <span>Planlanan - Kullanılan (Negatifse fazla kullanıldı)</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-700 min-w-[140px]">Rezerve:</span>
                  <span>Aktif rezervasyonların toplam miktarı</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-700 min-w-[140px]">Kullanılmamış Rez.:</span>
                  <span>Henüz stok çıkışı yapılmamış rezervasyon</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold text-gray-700 min-w-[140px]">Mevcut Stok:</span>
                  <span>Depodaki güncel stok miktarı</span>
                </div>
                <div className="flex gap-2 md:col-span-2">
                  <span className="font-semibold text-gray-700 min-w-[140px]">Plansız Kullanım:</span>
                  <span>
                    Malzeme listesinde planlanmamış ancak projeye stok çıkışı yapılmış malzemeler
                  </span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
