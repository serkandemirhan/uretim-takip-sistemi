'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Search,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/formatters'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface JobMaterialsTabProps {
  jobId: string
}

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
  job_id: string | null
  quotation_id: string | null
  job_material_id?: string | null
  stock_id: string
  stock_code?: string | null
  stock_name?: string | null
  reserved_quantity: number
  used_quantity: number
  planned_usage_date: string | null
  status: string
  notes: string | null
}

export function JobMaterialsTab({ jobId }: JobMaterialsTabProps) {
  const [job, setJob] = useState<any>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'sufficient' | 'insufficient'>('all')
  const [reservationFilter, setReservationFilter] = useState<'all' | 'reserved' | 'pending' | 'used'>('all')

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showInsufficientStockWarning, setShowInsufficientStockWarning] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [reservationDate, setReservationDate] = useState('')
  const [reservationNotes, setReservationNotes] = useState('')

  useEffect(() => {
    if (!jobId) return
    void loadData()
  }, [jobId])

  const loadData = async () => {
    if (!jobId) return
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

  const cancelReservation = async (reservationId: string) => {
    if (!jobId || !reservationId) return
    try {
      const confirmDelete = window.confirm('Seçili rezervasyonu iptal etmek istediğinize emin misiniz?')
      if (!confirmDelete) return

      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/stock-reservations/${reservationId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: '' }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Rezervasyon iptal edilemedi')
      }

      toast.success('Rezervasyon iptal edildi')
      void loadData()
    } catch (error: any) {
      toast.error(error.message || 'Rezervasyon iptal edilirken hata oluştu')
    }
  }

  const createReservation = async () => {
    if (!selectedMaterial || !jobId) return

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
      void loadData()
    } catch (error: any) {
      toast.error(error.message || 'Rezervasyon oluşturulurken hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const materialRows = useMemo(() => {
    const grouped = new Map<string, {
      material: Material
      materials: Material[]
      reservationsMap: Map<string, Reservation>
      totalQuantity: number
    }>()

    let matIndex = 0
    for (const material of materials) {
      const key = material.product_code || material.stock_id || `material_${matIndex}`
      matIndex += 1
      const existing = grouped.get(key)
      const reservationsForMaterial = reservations.filter(
        (reservation) =>
          reservation.stock_id === material.stock_id &&
          reservation.quotation_id === material.quotation_id,
      )

      if (existing) {
        existing.totalQuantity += Number(material.quantity || 0)
        existing.materials.push(material)
        for (const res of reservationsForMaterial) {
          if (res && !existing.reservationsMap.has(res.id)) {
            existing.reservationsMap.set(res.id, res)
          }
        }
      } else {
        const reservationsMap = new Map<string, Reservation>()
        for (const res of reservationsForMaterial) {
          if (res && !reservationsMap.has(res.id)) {
            reservationsMap.set(res.id, res)
          }
        }

        grouped.set(key, {
          material,
          materials: [material],
          reservationsMap,
          totalQuantity: Number(material.quantity || 0),
        })
      }
    }

    return Array.from(grouped.values()).map(({ material, materials: materialList = [material], reservationsMap, totalQuantity }) => {
      const relatedReservations = Array.from(reservationsMap.values())
      const activeReservations = relatedReservations.filter((reservation) =>
        ['reserved', 'pending', 'approved', 'active', 'partially_used'].includes(reservation.status),
      )
      const usedReservations = relatedReservations.filter(
        (reservation) =>
          ['used', 'completed', 'fully_used', 'partially_used'].includes(reservation.status) ||
          Number(reservation.used_quantity || 0) > 0,
      )
      const isFullyCancelled =
        relatedReservations.length > 0 &&
        activeReservations.length === 0 &&
        usedReservations.length === 0 &&
        relatedReservations.every((reservation) => reservation.status === 'cancelled')

      const baseMaterial = materialList[materialList.length - 1] || material
      const reservedQuantity = activeReservations.reduce(
        (acc, reservation) => acc + Number(reservation.reserved_quantity || 0),
        0,
      )
      const usedQuantity = usedReservations.reduce(
        (acc, reservation) => acc + Number(reservation.used_quantity || 0),
        0,
      )

      const status = usedReservations.length > 0 ? 'used' : activeReservations.length > 0 ? 'reserved' : isFullyCancelled ? 'cancelled' : 'pending'

      const activeReservation = activeReservations.find((reservation) =>
        ['reserved', 'pending', 'approved', 'active'].includes(reservation.status),
      )

      const plannedUsageDate =
        activeReservations.find((reservation) => reservation.planned_usage_date)?.planned_usage_date ||
        relatedReservations.find((reservation) => reservation.planned_usage_date)?.planned_usage_date ||
        null

      return {
        material: {
          ...baseMaterial,
          quantity: totalQuantity,
        },
        reservedQuantity,
        usedQuantity,
        status,
        plannedUsageDate,
        activeReservation,
      }
    })
  }, [materials, reservations])

  const filteredMaterials = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return materialRows.filter((row) => {
      const { material, status } = row
      const hasEnoughStock = material.available_quantity >= material.quantity

      if (stockFilter === 'sufficient' && !hasEnoughStock) return false
      if (stockFilter === 'insufficient' && hasEnoughStock) return false
      if (reservationFilter !== 'all') {
        if (reservationFilter === 'pending') {
          if (!['pending', 'cancelled'].includes(status)) return false
        } else if (status !== reservationFilter) {
          return false
        }
      }

      if (!term) return true

      const fields = [
        material.product_name,
        material.product_code,
        material.quotation_name,
        material.quotation_number,
        material.category,
        material.supplier_name,
      ]

      return fields.some((field) => typeof field === 'string' && field.toLowerCase().includes(term))
    })
  }, [materialRows, searchTerm, stockFilter, reservationFilter])

  const summaryCounts = useMemo(() => {
    const totalApproved = materialRows.length
    const reservedCount = materialRows.filter((row) => row.status === 'reserved').length
    const usedCount = materialRows.filter((row) => row.status === 'used').length
    const pendingCount = Math.max(totalApproved - reservedCount - usedCount, 0)

    return {
      approved: totalApproved,
      reserved: reservedCount,
      pending: pendingCount,
      used: usedCount,
    }
  }, [materialRows])

  return (
    <div className="space-y-6">
      

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Onaylı Malzeme</p>
            <p className="text-2xl font-semibold text-gray-900">{summaryCounts.approved}</p>
          </CardContent>
        </Card>
        <Card className="border border-indigo-200">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Rezerve Edildi</p>
            <p className="text-2xl font-semibold text-gray-900">{summaryCounts.reserved}</p>
          </CardContent>
        </Card>
        <Card className="border border-orange-200">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Bekliyor</p>
            <p className="text-2xl font-semibold text-gray-900">{summaryCounts.pending}</p>
          </CardContent>
        </Card>
        <Card className="border border-emerald-200">
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Kullanıldı</p>
            <p className="text-2xl font-semibold text-gray-900">{summaryCounts.used}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle>Onaylanmış Teklif Malzemeleri</CardTitle>
          <p className="text-sm text-gray-500">
            Onaylanmış malzeme listelerindeki kalemleri stok ve rezervasyon durumuna göre görüntüleyin.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Malzeme adı veya kodu ara..."
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value as typeof stockFilter)}
                className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="all">Tüm Stok Durumları</option>
                <option value="sufficient">Stok Yeterli</option>
                <option value="insufficient">Stok Yetersiz</option>
              </select>
              <select
                value={reservationFilter}
                onChange={(event) => setReservationFilter(event.target.value as typeof reservationFilter)}
                className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="all">Tüm Rezervasyonlar</option>
                <option value="pending">Bekliyor</option>
                <option value="reserved">Rezerve Edildi</option>
                <option value="used">Kullanıldı</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-500">
              Veriler yükleniyor...
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
              Onaylanmış malzeme listesi bulunamadı veya filtrelerle eşleşen kayıt yok.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Teklif</TableHead>
                    <TableHead className="min-w-[200px]">Malzeme</TableHead>
                    <TableHead>Kod</TableHead>
                    <TableHead className="text-right">Gereksinim Miktarı</TableHead>
                    <TableHead className="text-right">Kullanılan Miktar</TableHead>
                    <TableHead className="text-right">Fiziksel Stok</TableHead>
                    <TableHead className="text-right">Rezerve</TableHead>
                    <TableHead className="text-right">Kullanılabilir</TableHead>
                    <TableHead className="text-center">Stok Durumu</TableHead>
                    <TableHead className="text-center">Rezervasyon Durumu</TableHead>
                    <TableHead className="text-center">Planlanan Tarih</TableHead>
                    <TableHead className="text-right min-w-[120px]">İşlem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map(({ material, reservedQuantity, usedQuantity, status, plannedUsageDate, activeReservation }) => {
                    const hasEnoughStock = material.available_quantity >= material.quantity
                    const plannedDateLabel = plannedUsageDate
                      ? formatDate(plannedUsageDate)
                      : '-'
                    const reservationStatusLabel =
                      status === 'reserved'
                        ? 'Rezerve'
                        : status === 'used'
                        ? 'Kullanıldı'
                        : status === 'cancelled'
                        ? 'İptal Edildi'
                        : 'Bekliyor'

                    return (
                      <TableRow key={material.id}>
                        <TableCell>
                          <div className="text-sm font-semibold text-gray-900">
                            {material.quotation_name || `ML-${material.quotation_number}`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {material.quotation_number || material.quotation_id}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-semibold text-gray-900">{material.product_name}</div>
                          <div className="text-xs text-gray-500">{material.category || material.notes || '—'}</div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">{material.product_code}</TableCell>
                        <TableCell className="text-right text-sm font-semibold text-gray-900">
                          {material.quantity.toLocaleString('tr-TR')} {material.unit}
                        </TableCell>
                        <TableCell className="text-right text-sm text-gray-700">
                          {usedQuantity.toLocaleString('tr-TR')} {material.unit}
                        </TableCell>
                        <TableCell className="text-right text-sm text-gray-700">
                          {material.stock_quantity?.toLocaleString('tr-TR') ?? '0'} {material.unit}
                        </TableCell>
                        <TableCell className="text-right text-sm text-gray-700">
                          {reservedQuantity.toLocaleString('tr-TR')} {material.unit}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right text-sm font-semibold',
                            hasEnoughStock ? 'text-emerald-600' : 'text-orange-600',
                          )}
                        >
                          {material.available_quantity.toLocaleString('tr-TR')} {material.unit}
                        </TableCell>
                        <TableCell className="text-center">
                          {hasEnoughStock ? (
                            <CheckCircle className="mx-auto h-4 w-4 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="mx-auto h-4 w-4 text-orange-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm text-gray-700">
                          {reservationStatusLabel}
                        </TableCell>
                        <TableCell className="text-center text-sm text-gray-700">{plannedDateLabel}</TableCell>
                        <TableCell className="text-right">
                          {status === 'pending' || status === 'cancelled' ? (
                            <Button size="sm" onClick={() => handleReserveClick(material)}>
                              Rezerv Et
                            </Button>
                          ) : status === 'reserved' && activeReservation ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => cancelReservation(activeReservation.id)}
                            >
                              İptal Et
                            </Button>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open)
        if (!open) {
          setSelectedMaterial(null)
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rezervasyon Oluştur</DialogTitle>
            <DialogDescription>
              Seçilen malzeme için rezervasyon oluşturun.
            </DialogDescription>
          </DialogHeader>

          {selectedMaterial && (
            <div className="space-y-4">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-semibold text-gray-900">{selectedMaterial.product_name}</p>
                <p className="text-xs text-gray-500">
                  {selectedMaterial.product_code} &bull; {selectedMaterial.quotation_name || `ML-${selectedMaterial.quotation_number}`}
                </p>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="reservationDate">Planlanan Kullanım Tarihi</Label>
                  <Input
                    id="reservationDate"
                    type="date"
                    value={reservationDate}
                    onChange={(event) => setReservationDate(event.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="reservationNotes">Not (Opsiyonel)</Label>
                  <Input
                    id="reservationNotes"
                    value={reservationNotes}
                    onChange={(event) => setReservationNotes(event.target.value)}
                    placeholder="Rezervasyon notu ekleyin"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false)
                setSelectedMaterial(null)
              }}
            >
              İptal
            </Button>
            <Button onClick={createReservation} disabled={saving}>
              {saving ? 'Oluşturuluyor...' : 'Rezervasyon Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInsufficientStockWarning} onOpenChange={setShowInsufficientStockWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stok Yetersiz</DialogTitle>
            <DialogDescription>
              Seçilen stok miktarı rezervasyon için yeterli değil. Buna rağmen devam etmek istiyor musunuz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowInsufficientStockWarning(false)}>
              Vazgeç
            </Button>
            <Button onClick={proceedWithInsufficientStock} variant="destructive">
              Yetersiz Stoka Rağmen Devam Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
