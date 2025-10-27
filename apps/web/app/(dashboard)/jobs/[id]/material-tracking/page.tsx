'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Tamamlandı
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <Clock className="w-3 h-3 mr-1" />
            Devam Ediyor
          </Badge>
        )
      case 'exceeded':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Fazla Kullanıldı
          </Badge>
        )
      case 'unplanned':
        return (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200">
            <HelpCircle className="w-3 h-3 mr-1" />
            Plansız Kullanım
          </Badge>
        )
      case 'not_started':
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
            <Package className="w-3 h-3 mr-1" />
            Başlanmadı
          </Badge>
        )
      default:
        return null
    }
  }

  const getProgressBarColor = (percentage: number, isUnplanned: boolean = false) => {
    if (isUnplanned) return 'bg-orange-500'
    if (percentage === 0) return 'bg-gray-300'
    if (percentage < 50) return 'bg-yellow-500'
    if (percentage < 100) return 'bg-blue-500'
    if (percentage === 100) return 'bg-green-500'
    return 'bg-red-500'
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
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              İşe Dön
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      {!loading && materials.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">
                Toplam Malzeme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{materials.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">
                Tamamlanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {materials.filter((m) => m.status === 'completed').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">
                Devam Eden
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {materials.filter((m) => m.status === 'in_progress').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">
                Plansız Kullanım
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {materials.filter((m) => m.status === 'unplanned').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">
                Başlanmamış
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {materials.filter((m) => m.status === 'not_started').length}
              </div>
            </CardContent>
          </Card>
        </div>
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
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Malzeme</TableHead>
                    <TableHead className="text-center">Planlanan</TableHead>
                    <TableHead className="text-center">Kullanılan</TableHead>
                    <TableHead className="text-center">Kalan</TableHead>
                    <TableHead className="text-center">Rezerve</TableHead>
                    <TableHead className="text-center">Kullanılmamış Rez.</TableHead>
                    <TableHead className="text-center">Mevcut Stok</TableHead>
                    <TableHead className="text-center">İlerleme</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.stock_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">
                            {material.product_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {material.product_code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="font-medium">
                          {material.planned_quantity.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-500">{material.unit}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="font-medium text-blue-600">
                          {material.used_quantity.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-500">{material.unit}</div>
                      </TableCell>
                      <TableCell className="text-center">
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
                      <TableCell className="text-center">
                        <div className="font-medium text-purple-600">
                          {material.reserved_quantity.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-500">{material.unit}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="font-medium text-orange-600">
                          {material.unused_reservation.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-500">{material.unit}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div
                          className={cn(
                            'font-medium',
                            material.stock_current_quantity < material.remaining_quantity
                              ? 'text-red-600'
                              : 'text-green-600'
                          )}
                        >
                          {material.stock_current_quantity.toLocaleString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-500">{material.unit}</div>
                      </TableCell>
                      <TableCell>
                        <div className="w-full">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={cn(
                                  'h-full transition-all duration-300',
                                  getProgressBarColor(material.usage_percentage, material.status === 'unplanned')
                                )}
                                style={{
                                  width: `${Math.min(material.usage_percentage, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium w-10 text-right">
                              {material.usage_percentage}%
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(material.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      {!loading && materials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Açıklamalar</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <strong>Planlanan:</strong> Onaylanmış malzeme listelerindeki toplam miktar
              </div>
              <div>
                <strong>Kullanılan:</strong> Bu iş için yapılan stok çıkışlarının toplamı
              </div>
              <div>
                <strong>Kalan:</strong> Planlanan - Kullanılan (Negatifse fazla kullanıldı)
              </div>
              <div>
                <strong>Rezerve:</strong> Aktif rezervasyonların toplam miktarı
              </div>
              <div>
                <strong>Kullanılmamış Rez.:</strong> Henüz stok çıkışı yapılmamış rezervasyon
              </div>
              <div>
                <strong>Mevcut Stok:</strong> Depodaki güncel stok miktarı
              </div>
              <div className="md:col-span-2">
                <strong>Plansız Kullanım:</strong> Malzeme listesinde planlanmamış ancak projeye stok çıkışı yapılmış malzemeler (turuncu renkte gösterilir)
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
