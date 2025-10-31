'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Search,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface Material {
  id: string
  quotation_id: string
  quotation_number: string
  quotation_name: string
  approved_at: string | null
  stock_id: string
  product_code: string
  product_name: string
  category: string | null
  quantity: number
  unit: string
  unit_price: number
  notes: string | null
  stock_quantity: number
  reserved_quantity: number
  available_quantity: number
  supplier_name: string | null
}

interface Reservation {
  id: string
  job_id: string
  quotation_id: string
  stock_id: string
  reserved_quantity: number
  used_quantity: number
  planned_usage_date: string
  status: string
  notes: string | null
  product_code: string
  product_name: string
}

export default function JobMaterialsPage() {
  const params = useParams()
  const jobId = params.id as string

  const [job, setJob] = useState<any>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'sufficient' | 'insufficient'>('all')
  const [reservationFilter, setReservationFilter] = useState<'all' | 'reserved' | 'pending'>('all')

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showInsufficientStockWarning, setShowInsufficientStockWarning] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [reservationDate, setReservationDate] = useState('')
  const [reservationNotes, setReservationNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [jobId])

  const loadData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const [jobRes, materialsRes, reservationsRes] = await Promise.all([
        fetch(`${API_URL}/api/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/quotations/job/${jobId}/approved-materials`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/stock-reservations/job/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (!jobRes.ok) throw new Error('Job yüklenemedi')
      const jobData = await jobRes.json()
      setJob(jobData)

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json()
        setMaterials(materialsData)
      }

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

  const handleReserveClick = (material: Material) => {
    setSelectedMaterial(material)
    setReservationDate(new Date().toISOString().split('T')[0])
    setReservationNotes(material.notes || '')

    const hasEnoughStock = material.available_quantity >= material.quantity

    if (hasEnoughStock) {
      setShowCreateDialog(true)
    } else {
      setShowInsufficientStockWarning(true)
    }
  }

  const proceedWithInsufficientStock = () => {
    setShowInsufficientStockWarning(false)
    setShowCreateDialog(true)
  }

  const createReservation = async () => {
    if (!selectedMaterial) return

    try {
      setSaving(true)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/stock-reservations/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_id: jobId,
          quotation_id: selectedMaterial.quotation_id,
          reservations: [
            {
              stock_id: selectedMaterial.stock_id,
              reserved_quantity: selectedMaterial.quantity,
              planned_usage_date: reservationDate,
              notes: reservationNotes,
            },
          ],
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Rezervasyon oluşturulamadı')
      }

      toast.success('Rezervasyon oluşturuldu')
      setShowCreateDialog(false)
      setSelectedMaterial(null)
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

  const getReservationForMaterial = (stockId: string) => {
    return reservations.find(
      (res) => res.stock_id === stockId && res.status !== 'cancelled'
    )
  }

  // Filter materials
  const filteredMaterials = materials.filter((material) => {
    const matchesSearch =
      material.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.product_code.toLowerCase().includes(searchTerm.toLowerCase())

    const hasEnoughStock = material.available_quantity >= material.quantity
    const matchesStockFilter =
      stockFilter === 'all' ||
      (stockFilter === 'sufficient' && hasEnoughStock) ||
      (stockFilter === 'insufficient' && !hasEnoughStock)

    const reservation = getReservationForMaterial(material.stock_id)
    const matchesReservationFilter =
      reservationFilter === 'all' ||
      (reservationFilter === 'reserved' && reservation) ||
      (reservationFilter === 'pending' && !reservation)

    return matchesSearch && matchesStockFilter && matchesReservationFilter
  })

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
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
          <p className="mt-4 text-gray-600">İş bulunamadı</p>
        </div>
      </div>
    )
  }

  const unreservedCount = materials.filter(
    (material) => !getReservationForMaterial(material.stock_id)
  ).length

  const stats = {
    total: materials.length,
    reserved: reservations.filter((r) => r.status === 'active' || r.status === 'partially_used')
      .length,
    pending: unreservedCount,
    used: reservations.filter((r) => r.status === 'fully_used').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Malzeme Rezervasyonları</h1>
          <p className="text-sm text-gray-500">
            {job.job_number} - {job.title}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/jobs/${jobId}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              İşe Dön
            </Button>
          </Link>
          <Link href={`/jobs/${jobId}/material-tracking`}>
            <Button variant="outline" size="sm">
              <TrendingUp className="mr-2 h-4 w-4" />
              Malzeme Takibi
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards - Minimalist with border accent */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-gray-400">
          <CardContent className="pt-4 pb-3">
            <div className="text-sm text-gray-500 mb-1">Onaylı Malzeme</div>
            <div className="text-2xl font-semibold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="pt-4 pb-3">
            <div className="text-sm text-gray-500 mb-1">Rezerve Edildi</div>
            <div className="text-2xl font-semibold text-gray-900">{stats.reserved}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-400">
          <CardContent className="pt-4 pb-3">
            <div className="text-sm text-gray-500 mb-1">Bekliyor</div>
            <div className="text-2xl font-semibold text-gray-900">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-400">
          <CardContent className="pt-4 pb-3">
            <div className="text-sm text-gray-500 mb-1">Kullanıldı</div>
            <div className="text-2xl font-semibold text-gray-900">{stats.used}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      {materials.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col gap-3">
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
                <div className="flex gap-2">
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">Tüm Stok Durumları</option>
                    <option value="sufficient">Yeterli Stok</option>
                    <option value="insufficient">Eksik Stok</option>
                  </select>
                  <select
                    value={reservationFilter}
                    onChange={(e) => setReservationFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">Tüm Rezervasyonlar</option>
                    <option value="reserved">Rezerve Edilmiş</option>
                    <option value="pending">Bekleyenler</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Onaylanmış Teklif Malzemeleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Bu iş için henüz onaylanmış teklif bulunmuyor</p>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Arama kriterlerine uygun malzeme bulunamadı.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Teklif
                    </th>
                    <th className="text-left py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Malzeme
                    </th>
                    <th className="text-left py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Kod
                    </th>
                    <th className="text-right py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Miktar
                    </th>
                    <th className="text-left py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Fiziksel Stok
                    </th>
                    <th className="text-left py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Rezerve
                    </th>
                    <th className="text-left py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Kullanılabilir
                    </th>
                    <th className="text-center py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Stok Durumu
                    </th>
                    <th className="text-left py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Rezervasyon Durumu
                    </th>
                    <th className="text-left py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Planlanan Tarih
                    </th>
                    <th className="text-right py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterials.map((material, index) => {
                    const reservation = getReservationForMaterial(material.stock_id)
                    const hasEnoughStock = material.available_quantity >= material.quantity

                    return (
                      <tr
                        key={material.id}
                        className={cn(
                          'border-b hover:bg-gray-50 transition-colors',
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        )}
                      >
                        <td className="py-2.5 px-4">
                          <div className="text-sm font-medium text-gray-900">
                            {material.quotation_number}
                          </div>
                          <div className="text-xs text-gray-500">{material.quotation_name}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-gray-900">{material.product_name}</div>
                          {material.category && (
                            <div className="text-xs text-gray-500">{material.category}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-sm text-gray-600">
                          {material.product_code}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="font-medium text-gray-900">{material.quantity}</div>
                          <div className="text-xs text-gray-500">{material.unit}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-gray-900">
                            {material.stock_quantity}
                          </div>
                          <div className="text-xs text-gray-500">{material.unit}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-gray-900">
                            {material.reserved_quantity}
                          </div>
                          <div className="text-xs text-gray-500">{material.unit}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div
                            className={cn(
                              'font-medium',
                              hasEnoughStock ? 'text-green-600' : 'text-red-600'
                            )}
                          >
                            {material.available_quantity}
                          </div>
                          <div className="text-xs text-gray-500">{material.unit}</div>
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          {hasEnoughStock ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-600 mx-auto" />
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {reservation ? (
                            reservation.status === 'fully_used' ? (
                              <span className="text-sm text-gray-700">Kullanıldı</span>
                            ) : (
                              <span className="text-sm text-blue-600 font-medium">
                                {reservation.used_quantity}/{reservation.reserved_quantity}
                              </span>
                            )
                          ) : (
                            <span className="text-sm text-gray-400">Bekliyor</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {reservation ? (
                            <Input
                              type="date"
                              value={reservation.planned_usage_date || ''}
                              onChange={(e) =>
                                updateReservationDate(reservation.id, e.target.value)
                              }
                              className="w-36 text-sm"
                              disabled={
                                reservation.status === 'fully_used' ||
                                reservation.status === 'cancelled'
                              }
                            />
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          {reservation ? (
                            <button
                              onClick={() => cancelReservation(reservation.id)}
                              disabled={
                                reservation.status === 'fully_used' ||
                                reservation.status === 'cancelled' ||
                                reservation.used_quantity > 0
                              }
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="İptal Et"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleReserveClick(material)}
                              className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                            >
                              Rezerve Et
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

      {/* Insufficient Stock Warning Dialog */}
      <Dialog open={showInsufficientStockWarning} onOpenChange={setShowInsufficientStockWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-orange-600">
              <AlertTriangle className="h-6 w-6" />
              <DialogTitle>Yetersiz Stok Uyarısı</DialogTitle>
            </div>
          </DialogHeader>

          {selectedMaterial && (
            <div className="space-y-4 py-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-900">
                  <strong>{selectedMaterial.product_name}</strong> için yeterli stok
                  bulunmamaktadır.
                </p>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Gerekli miktar:</span>
                    <span className="font-semibold">
                      {selectedMaterial.quantity} {selectedMaterial.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kullanılabilir stok:</span>
                    <span className="font-semibold text-red-600">
                      {selectedMaterial.available_quantity} {selectedMaterial.unit}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span>Eksik miktar:</span>
                    <span className="font-bold text-red-700">
                      {selectedMaterial.quantity - selectedMaterial.available_quantity}{' '}
                      {selectedMaterial.unit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Bu işlem satın alma süreci başlatacaktır.</strong>
                </p>
                <p className="text-xs text-blue-800 mt-2">
                  Rezervasyon oluşturulduğunda, satın alma departmanı eksik{' '}
                  {selectedMaterial.quantity - selectedMaterial.available_quantity}{' '}
                  {selectedMaterial.unit} için otomatik olarak bilgilendirilecek ve tedarik
                  süreci başlayacaktır.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowInsufficientStockWarning(false)
                setSelectedMaterial(null)
              }}
            >
              İptal
            </Button>
            <Button
              onClick={proceedWithInsufficientStock}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Devam Et ve Rezerve Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Reservation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Malzeme Rezervasyonu Oluştur</DialogTitle>
            <DialogDescription>Rezervasyon tarihi ve notları belirleyin</DialogDescription>
          </DialogHeader>

          {selectedMaterial && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Malzeme:</span>
                  <span className="font-medium">{selectedMaterial.product_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Kod:</span>
                  <span className="font-medium">{selectedMaterial.product_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Miktar:</span>
                  <span className="font-medium">
                    {selectedMaterial.quantity} {selectedMaterial.unit}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reservation-date">Planlanan Kullanım Tarihi *</Label>
                <Input
                  id="reservation-date"
                  type="date"
                  value={reservationDate}
                  onChange={(e) => setReservationDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reservation-notes">Notlar (Opsiyonel)</Label>
                <Input
                  id="reservation-notes"
                  type="text"
                  value={reservationNotes}
                  onChange={(e) => setReservationNotes(e.target.value)}
                  placeholder="Rezervasyon için not ekleyin"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setSelectedMaterial(null)
              }}
              disabled={saving}
            >
              İptal
            </Button>
            <Button onClick={createReservation} disabled={saving || !reservationDate}>
              {saving ? 'Oluşturuluyor...' : 'Rezervasyon Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
