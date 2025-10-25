'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Calendar,
  Package,
  Plus,
  Save,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export default function JobMaterialsPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const [job, setJob] = useState<any>(null)
  const [jobMaterials, setJobMaterials] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load job details and reservations
  useEffect(() => {
    loadData()
  }, [jobId])

  const loadData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      // Load job details
      const jobRes = await fetch(`${API_URL}/api/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!jobRes.ok) throw new Error('Job yüklenemedi')
      const jobData = await jobRes.json()
      setJob(jobData)

      // Load job materials
      const materialsRes = await fetch(`${API_URL}/api/job-materials?job_id=${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (materialsRes.ok) {
        const materialsData = await materialsRes.json()
        setJobMaterials(materialsData)
      }

      // Load reservations
      const reservationsRes = await fetch(`${API_URL}/api/stock-reservations/job/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (reservationsRes.ok) {
        const reservationsData = await reservationsRes.json()
        setReservations(reservationsData)
      }
    } catch (error: any) {
      toast.error(error.message || 'Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const createReservationsFromMaterials = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('token')

      // Prepare reservations data with default dates
      const today = new Date().toISOString().split('T')[0]
      const reservationsToCreate = jobMaterials
        .filter((material) => {
          // Only create if not already reserved
          const existingReservation = reservations.find(
            (res) => res.stock_id === material.product_id && res.status !== 'cancelled'
          )
          return !existingReservation
        })
        .map((material) => ({
          stock_id: material.product_id,
          job_material_id: material.id,
          reserved_quantity: material.quantity,
          planned_usage_date: today,
          notes: material.notes || '',
        }))

      if (reservationsToCreate.length === 0) {
        toast.info('Tüm malzemeler zaten rezerve edilmiş')
        return
      }

      const res = await fetch(`${API_URL}/api/stock-reservations/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_id: jobId,
          quotation_id: job?.quotation_id,
          reservations: reservationsToCreate,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Rezervasyon oluşturulamadı')
      }

      toast.success(`${reservationsToCreate.length} malzeme rezerve edildi`)
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Rezervasyon oluşturulurken hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const updateReservationDate = async (reservationId: string, newDate: string) => {
    try {
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/stock-reservations/${reservationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planned_usage_date: newDate,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Tarih güncellenemedi')
      }

      toast.success('Planlanan tarih güncellendi')
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Tarih güncellenirken hata oluştu')
    }
  }

  const cancelReservation = async (reservationId: string) => {
    if (!confirm('Bu rezervasyonu iptal etmek istediğinizden emin misiniz?')) return

    try {
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/stock-reservations/${reservationId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: 'Manuel iptal',
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Rezervasyon iptal edilemedi')
      }

      toast.success('Rezervasyon iptal edildi')
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'İptal edilirken hata oluştu')
    }
  }

  const getReservationForMaterial = (materialId: string, stockId: string) => {
    return reservations.find(
      (res) =>
        (res.job_material_id === materialId || res.stock_id === stockId) &&
        res.status !== 'cancelled'
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Aktif', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      partially_used: { label: 'Kısmi Kullanılmış', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      fully_used: { label: 'Tamamen Kullanılmış', color: 'bg-green-100 text-green-700 border-green-200' },
      cancelled: { label: 'İptal Edildi', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    return (
      <Badge variant="outline" className={cn('text-xs', config.color)}>
        {config.label}
      </Badge>
    )
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

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto" />
          <p className="mt-4 text-gray-600">İş bulunamadı</p>
        </div>
      </div>
    )
  }

  const hasUnreservedMaterials = jobMaterials.some(
    (material) => !getReservationForMaterial(material.id, material.product_id)
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/jobs/${jobId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Geri
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Malzeme Rezervasyonları</h1>
            <p className="text-sm text-gray-600 mt-1">
              {job.job_number} - {job.title}
            </p>
          </div>
        </div>

        {hasUnreservedMaterials && (
          <Button onClick={createReservationsFromMaterials} disabled={saving}>
            <Plus className="h-4 w-4 mr-2" />
            {saving ? 'Rezerve Ediliyor...' : 'Tüm Malzemeleri Rezerve Et'}
          </Button>
        )}
      </div>

      {/* Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Toplam Malzeme</p>
              <p className="text-2xl font-bold">{jobMaterials.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Rezerve Edilmiş</p>
              <p className="text-2xl font-bold text-blue-600">
                {reservations.filter((r) => r.status === 'active' || r.status === 'partially_used').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Kullanılmış</p>
              <p className="text-2xl font-bold text-green-600">
                {reservations.filter((r) => r.status === 'fully_used').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">İptal Edilmiş</p>
              <p className="text-2xl font-bold text-gray-600">
                {reservations.filter((r) => r.status === 'cancelled').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materials & Reservations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Malzeme Listesi ve Rezervasyonlar
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobMaterials.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Bu iş için henüz malzeme eklenmemiş</p>
              <Link href={`/jobs/${jobId}`}>
                <Button variant="link" className="mt-2">
                  İş detayına git
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm">
                    <th className="pb-3 font-medium text-gray-700">Malzeme</th>
                    <th className="pb-3 font-medium text-gray-700">Kod</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">Miktar</th>
                    <th className="pb-3 font-medium text-gray-700">Birim</th>
                    <th className="pb-3 font-medium text-gray-700">Planlanan Kullanım Tarihi</th>
                    <th className="pb-3 font-medium text-gray-700">Durum</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">Kullanılan</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {jobMaterials.map((material) => {
                    const reservation = getReservationForMaterial(material.id, material.product_id)
                    return (
                      <tr key={material.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <div className="font-medium">{material.product_name}</div>
                          {material.category && (
                            <div className="text-xs text-gray-500">{material.category}</div>
                          )}
                        </td>
                        <td className="py-3 text-sm text-gray-600">{material.product_code}</td>
                        <td className="py-3 text-right font-medium">{material.quantity}</td>
                        <td className="py-3 text-sm text-gray-600">{material.unit}</td>
                        <td className="py-3">
                          {reservation ? (
                            <Input
                              type="date"
                              value={reservation.planned_usage_date || ''}
                              onChange={(e) => updateReservationDate(reservation.id, e.target.value)}
                              className="w-48"
                              disabled={reservation.status === 'fully_used' || reservation.status === 'cancelled'}
                            />
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3">
                          {reservation ? (
                            getStatusBadge(reservation.status)
                          ) : (
                            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                              Rezerve Edilmemiş
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {reservation ? (
                            <div className="text-sm">
                              <span className="font-medium">{reservation.used_quantity}</span>
                              <span className="text-gray-400"> / {reservation.reserved_quantity}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {reservation && reservation.status !== 'cancelled' && reservation.used_quantity === 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelReservation(reservation.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
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
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">Malzeme Rezervasyonları Hakkında</p>
              <ul className="space-y-1 list-disc list-inside text-blue-800">
                <li>Her malzeme için planlanan kullanım tarihini seçin</li>
                <li>Satın almacı bu tarihlere göre tedarik planlaması yapacak</li>
                <li>İş başlamadan önce rezervasyonları iptal edebilirsiniz</li>
                <li>Depodan malzeme çıkışı yapıldığında otomatik olarak "Kullanılan" miktarı güncellenir</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
