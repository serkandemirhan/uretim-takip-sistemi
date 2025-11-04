'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, ArrowUpCircle, ArrowDownCircle, Plus, Package, Upload, X, Calendar, CheckCircle, Clock, Ban, TrendingDown, ArrowLeft, Filter, MoreVertical } from 'lucide-react'
import { stockMovementsAPI, stocksAPI, jobsAPI, customersAPI } from '@/lib/api/client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { handleError } from '@/lib/utils/error-handler'
import { FileUpload } from '@/components/features/files/FileUpload'
import { FileList } from '@/components/features/files/FileList'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

type Movement = {
  id: string
  stock_id: string
  product_code: string
  product_name: string
  unit: string
  movement_type: 'IN' | 'OUT'
  quantity: number
  unit_price?: number
  currency?: string
  total_value: number
  job_id?: string
  job_number?: string
  job_title?: string
  purpose?: string
  document_no?: string
  notes?: string
  created_at: string
  created_by_name?: string
}

type Stock = {
  id: string
  product_code: string
  product_name: string
  unit: string
  current_quantity: number
}

type Job = {
  id: string
  job_number: string
  title: string
}

type Customer = {
  id: string
  name: string
  company_name?: string
}

type Reservation = {
  id: string
  job_id: string
  job_number: string
  job_title: string
  stock_id: string
  reserved_quantity: number
  used_quantity: number
  remaining_quantity: number
  planned_usage_date: string
  status: string
  notes?: string
  created_by_name?: string
  created_at: string
}

export default function StockMovementsPage() {
  const searchParams = useSearchParams()
  const stockIdFilter = searchParams.get('stock_id')

  const [loading, setLoading] = useState(true)
  const [movements, setMovements] = useState<Movement[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loadingReservations, setLoadingReservations] = useState(false)
  const [showAllReservations, setShowAllReservations] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [useReservationDialogOpen, setUseReservationDialogOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [useQuantity, setUseQuantity] = useState('')
  const [useNotes, setUseNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Filters
  const [filterDateRange, setFilterDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [filterCustomerId, setFilterCustomerId] = useState('')
  const [filterJobId, setFilterJobId] = useState('')
  const [filterMovementType, setFilterMovementType] = useState<'all' | 'IN' | 'OUT'>('all')

  const [form, setForm] = useState({
    stock_id: '',
    movement_type: 'IN' as 'IN' | 'OUT',
    quantity: '',
    unit_price: '',
    currency: 'TRY',
    recipient_type: 'job' as 'job' | 'customer' | 'general',
    job_id: '',
    customer_id: '',
    purpose: '',
    document_no: '',
    notes: '',
  })

  useEffect(() => {
    void loadMovements()
    void loadStocks()
    void loadJobs()
    void loadCustomers()
    if (stockIdFilter) {
      void loadReservations()
    }
  }, [stockIdFilter])

  async function loadMovements() {
    setLoading(true)
    try {
      const res = await stockMovementsAPI.getAll()
      const raw = Array.isArray(res?.data) ? res.data : []
      setMovements(raw)
    } catch (err) {
      handleError(err, { title: 'Stok hareketleri yüklenemedi' })
    } finally {
      setLoading(false)
    }
  }

  async function loadStocks() {
    try {
      const res = await stocksAPI.getAll()
      const raw = Array.isArray(res?.data) ? res.data : []
      setStocks(raw)
    } catch (err) {
      console.error('Stocks error:', err)
    }
  }

  async function loadJobs() {
    try {
      const res = await jobsAPI.getAll()
      const raw = Array.isArray(res?.data) ? res.data : []
      setJobs(raw)
    } catch (err) {
      console.error('Jobs error:', err)
    }
  }

  async function loadCustomers() {
    try {
      const res = await customersAPI.getAll()
      const raw = Array.isArray(res?.data) ? res.data : []
      setCustomers(raw)
    } catch (err) {
      console.error('Customers error:', err)
    }
  }

  async function loadReservations() {
    if (!stockIdFilter) return

    setLoadingReservations(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/stock-reservations?stock_id=${stockIdFilter}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) throw new Error('Rezervasyonlar yüklenemedi')

      const data = await res.json()
      setReservations(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Reservations error:', err)
      setReservations([])
    } finally {
      setLoadingReservations(false)
    }
  }

  function openDialogForEntry() {
    setForm({
      stock_id: stockIdFilter || '',
      movement_type: 'IN',
      quantity: '',
      unit_price: '',
      currency: 'TRY',
      recipient_type: 'job',
      job_id: '',
      customer_id: '',
      purpose: '',
      document_no: '',
      notes: '',
    })
    setDialogOpen(true)
  }

  function openDialogForExit() {
    setForm({
      stock_id: stockIdFilter || '',
      movement_type: 'OUT',
      quantity: '',
      unit_price: '',
      currency: 'TRY',
      recipient_type: 'job',
      job_id: '',
      customer_id: '',
      purpose: '',
      document_no: '',
      notes: '',
    })
    setDialogOpen(true)
  }

  function openUseReservationDialog(reservation: Reservation) {
    setSelectedReservation(reservation)
    setUseQuantity(reservation.remaining_quantity.toString())
    setUseNotes('')
    setUseReservationDialogOpen(true)
  }

  async function handleUseReservation() {
    if (!selectedReservation) return

    const qty = parseFloat(useQuantity)
    if (isNaN(qty) || qty <= 0) {
      toast.error('Geçerli bir miktar giriniz')
      return
    }

    if (qty > selectedReservation.remaining_quantity) {
      toast.error(`Kalan rezervasyon miktarından fazla olamaz (${selectedReservation.remaining_quantity} mevcut)`)
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/stock-reservations/${selectedReservation.id}/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quantity: qty,
          notes: useNotes || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Stok çıkışı yapılamadı')
      }

      toast.success('Stok çıkışı başarıyla kaydedildi')
      setUseReservationDialogOpen(false)
      setSelectedReservation(null)
      await loadMovements()
      await loadReservations()
    } catch (err: any) {
      toast.error(err.message || 'Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  async function handleSave() {
    if (!form.stock_id || !form.quantity) {
      toast.error('Stok ve miktar zorunludur')
      return
    }

    const qty = parseFloat(form.quantity)
    if (qty <= 0) {
      toast.error('Miktar 0\'dan büyük olmalıdır')
      return
    }

    // Validate recipient based on type
    if (form.movement_type === 'OUT') {
      if (form.recipient_type === 'job' && !form.job_id) {
        toast.error('Lütfen proje seçiniz')
        return
      }
      if (form.recipient_type === 'customer' && !form.customer_id) {
        toast.error('Lütfen müşteri seçiniz')
        return
      }
    }

    setSaving(true)
    try {
      // Build purpose based on recipient type
      let purpose = form.purpose
      let job_id = null

      if (form.movement_type === 'OUT') {
        if (form.recipient_type === 'job') {
          job_id = form.job_id
          const selectedJob = jobs.find(j => j.id === form.job_id)
          if (selectedJob) {
            purpose = `Proje: ${selectedJob.job_number} - ${selectedJob.title}${purpose ? ' | ' + purpose : ''}`
          }
        } else if (form.recipient_type === 'customer') {
          const selectedCustomer = customers.find(c => c.id === form.customer_id)
          if (selectedCustomer) {
            purpose = `Müşteri: ${selectedCustomer.name}${selectedCustomer.company_name ? ' (' + selectedCustomer.company_name + ')' : ''}${purpose ? ' | ' + purpose : ''}`
          }
        } else if (form.recipient_type === 'general') {
          purpose = purpose || 'Genel Kullanım'
        }
      }

      const payload: any = {
        stock_id: form.stock_id,
        movement_type: form.movement_type,
        quantity: qty,
        unit_price: form.unit_price ? parseFloat(form.unit_price) : null,
        currency: form.currency || null,
        job_id: job_id,
        purpose: purpose || null,
        document_no: form.document_no || null,
        notes: form.notes || null,
      }

      await stockMovementsAPI.create(payload)
      toast.success(`Stok ${form.movement_type === 'IN' ? 'girişi' : 'çıkışı'} kaydedildi`)
      setDialogOpen(false)
      await loadMovements()
    } catch (err) {
      handleError(err, { title: 'Kaydetme hatası' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const selectedStock = stocks.find(s => s.id === form.stock_id)
  const filteredStock = stockIdFilter ? stocks.find(s => s.id === stockIdFilter) : null

  // Apply all filters
  const filteredMovements = movements.filter(m => {
    // Stock filter
    if (stockIdFilter && m.stock_id !== stockIdFilter) return false

    // Movement type filter
    if (filterMovementType !== 'all' && m.movement_type !== filterMovementType) return false

    // Job filter
    if (filterJobId && m.job_id !== filterJobId) return false

    // Customer filter (check in purpose field)
    if (filterCustomerId) {
      const customer = customers.find(c => c.id === filterCustomerId)
      if (!customer || !m.purpose?.includes(customer.name)) return false
    }

    // Date range filter
    if (filterDateRange !== 'all' && m.created_at) {
      const moveDate = new Date(m.created_at)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (filterDateRange === 'today') {
        const moveDay = new Date(moveDate)
        moveDay.setHours(0, 0, 0, 0)
        if (moveDay.getTime() !== today.getTime()) return false
      } else if (filterDateRange === 'week') {
        const weekAgo = new Date(today)
        weekAgo.setDate(today.getDate() - 7)
        if (moveDate < weekAgo) return false
      } else if (filterDateRange === 'month') {
        const monthAgo = new Date(today)
        monthAgo.setMonth(today.getMonth() - 1)
        if (moveDate < monthAgo) return false
      }
    }

    return true
  })

  const filteredReservations = showAllReservations
    ? reservations
    : reservations.filter(r => r.status === 'active' || r.status === 'partially_used')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/stocks/inventory">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Stok Hareketleri</h1>
            <p className="text-muted-foreground">Tüm giriş ve çıkış hareketleri</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={openDialogForEntry} variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            Stok Girişi
          </Button>
          <Button onClick={openDialogForExit} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
            <ArrowDownCircle className="w-4 h-4 mr-2" />
            Stok Çıkışı
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tarih Aralığı</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value as any)}
              >
                <option value="all">Tümü</option>
                <option value="today">Bugün</option>
                <option value="week">Bu Hafta</option>
                <option value="month">Bu Ay</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Hareket Tipi</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterMovementType}
                onChange={(e) => setFilterMovementType(e.target.value as any)}
              >
                <option value="all">Tümü</option>
                <option value="IN">Sadece Girişler</option>
                <option value="OUT">Sadece Çıkışlar</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Proje</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterJobId}
                onChange={(e) => setFilterJobId(e.target.value)}
              >
                <option value="">Tüm Projeler</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.job_number} - {job.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Müşteri</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterCustomerId}
                onChange={(e) => setFilterCustomerId(e.target.value)}
              >
                <option value="">Tüm Müşteriler</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(filterDateRange !== 'all' || filterMovementType !== 'all' || filterJobId || filterCustomerId) && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Aktif Filtreler:</span>
              {filterDateRange !== 'all' && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {filterDateRange === 'today' && 'Bugün'}
                  {filterDateRange === 'week' && 'Bu Hafta'}
                  {filterDateRange === 'month' && 'Bu Ay'}
                </span>
              )}
              {filterMovementType !== 'all' && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {filterMovementType === 'IN' ? 'Girişler' : 'Çıkışlar'}
                </span>
              )}
              {filterJobId && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Proje: {jobs.find(j => j.id === filterJobId)?.job_number}
                </span>
              )}
              {filterCustomerId && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Müşteri: {customers.find(c => c.id === filterCustomerId)?.name}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterDateRange('all')
                  setFilterMovementType('all')
                  setFilterJobId('')
                  setFilterCustomerId('')
                }}
                className="h-6 px-2 text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Temizle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter Info */}
      {filteredStock && (
        <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-blue-100 shadow-md">
          <CardContent className="py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-lg">
                  <Package className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Filter className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Aktif Filtre</span>
                  </div>
                  <p className="text-xl font-bold text-blue-900 mb-1">
                    {filteredStock.product_name}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-semibold text-blue-800">
                      Kod: <span className="font-mono">{filteredStock.product_code}</span>
                    </span>
                    <span className="text-blue-700">•</span>
                    <span className="font-semibold text-blue-800">
                      Mevcut Stok: <span className="text-lg font-bold text-blue-900">{filteredStock.current_quantity}</span> {filteredStock.unit}
                    </span>
                  </div>
                </div>
              </div>
              <Link href="/stocks/movements">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <X className="w-4 h-4 mr-1" />
                  Filtreyi Kaldır
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reservations List - Only shown when filtered by stock */}
      {stockIdFilter && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Stok Rezervasyonları
                {!showAllReservations && (
                  <span className="text-sm font-normal text-muted-foreground">
                    (Sadece Aktifler)
                  </span>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllReservations(!showAllReservations)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showAllReservations ? 'Sadece Aktifler' : 'Tümünü Göster'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingReservations ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {showAllReservations
                  ? 'Bu stok için rezervasyon kaydı yok'
                  : 'Aktif rezervasyon kaydı yok'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Durum</th>
                      <th className="text-left p-2">Proje</th>
                      <th className="text-right p-2">Rezerve</th>
                      <th className="text-right p-2">Kullanılan</th>
                      <th className="text-right p-2">Kalan</th>
                      <th className="text-left p-2">Planlanan Tarih</th>
                      <th className="text-left p-2">Kullanıcı</th>
                      <th className="text-left p-2">Oluşturma Tarihi</th>
                      <th className="text-left p-2">Notlar</th>
                      <th className="text-right p-2">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReservations.map((reservation) => {
                      const getStatusBadge = (status: string) => {
                        switch (status) {
                          case 'active':
                            return (
                              <span className="inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-1 rounded text-sm border border-blue-200">
                                <Clock className="w-4 h-4" />
                                Aktif
                              </span>
                            )
                          case 'partially_used':
                            return (
                              <span className="inline-flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-1 rounded text-sm border border-orange-200">
                                <Clock className="w-4 h-4" />
                                Kısmi Kullanıldı
                              </span>
                            )
                          case 'fully_used':
                            return (
                              <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded text-sm border border-green-200">
                                <CheckCircle className="w-4 h-4" />
                                Tamamlandı
                              </span>
                            )
                          case 'cancelled':
                            return (
                              <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-50 px-2 py-1 rounded text-sm border border-gray-200">
                                <Ban className="w-4 h-4" />
                                İptal
                              </span>
                            )
                          default:
                            return (
                              <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-50 px-2 py-1 rounded text-sm">
                                {status}
                              </span>
                            )
                        }
                      }

                      return (
                        <tr key={reservation.id} className="border-b hover:bg-muted/50">
                          <td className="p-2">{getStatusBadge(reservation.status)}</td>
                          <td className="p-2">
                            <Link
                              href={`/jobs/${reservation.job_id}`}
                              className="hover:underline text-blue-600"
                            >
                              <div className="font-medium">{reservation.job_number}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {reservation.job_title}
                              </div>
                            </Link>
                          </td>
                          <td className="p-2 text-right font-medium">
                            {reservation.reserved_quantity.toLocaleString('tr-TR')}
                          </td>
                          <td className="p-2 text-right text-orange-600 font-medium">
                            {reservation.used_quantity.toLocaleString('tr-TR')}
                          </td>
                          <td className="p-2 text-right text-green-600 font-medium">
                            {reservation.remaining_quantity.toLocaleString('tr-TR')}
                          </td>
                          <td className="p-2 text-sm">
                            {new Date(reservation.planned_usage_date).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="p-2 text-sm">{reservation.created_by_name || '-'}</td>
                          <td className="p-2 text-sm">
                            {new Date(reservation.created_at).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="p-2 text-sm max-w-[200px] truncate">
                            {reservation.notes || '-'}
                          </td>
                          <td className="p-2 text-right">
                            {(reservation.status === 'active' || reservation.status === 'partially_used') && (
                              <Button
                                size="sm"
                                onClick={() => openUseReservationDialog(reservation)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                <TrendingDown className="w-4 h-4 mr-1" />
                                Stok Çıkışı
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
      )}

      {/* Movements List */}
      <Card>
        <CardHeader>
          <CardTitle>Stok Hareketleri</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredMovements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {stockIdFilter ? 'Bu stok için hareket kaydı yok' : 'Henüz hareket kaydı yok'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-semibold text-gray-600">Tarih</th>
                    <th className="text-left p-2 font-semibold text-gray-600">Tip</th>
                    <th className="text-left p-2 font-semibold text-gray-600">Ürün Kodu</th>
                    <th className="text-left p-2 font-semibold text-gray-600">Ürün Adı</th>
                    <th className="text-right p-2 font-semibold text-gray-600">Miktar</th>
                    <th className="text-right p-2">Birim Fiyat</th>
                    <th className="text-right p-2">Toplam</th>
                    <th className="text-left p-2">Proje</th>
                    <th className="text-left p-2">Amaç</th>
                    <th className="text-left p-2">Kullanıcı</th>
                    <th className="text-right p-2">Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((movement) => (
                    <tr key={movement.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 text-sm">
                        {new Date(movement.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="p-2">
                        {movement.movement_type === 'IN' ? (
                          <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded text-sm">
                            <ArrowUpCircle className="w-4 h-4" />
                            Giriş
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded text-sm">
                            <ArrowDownCircle className="w-4 h-4" />
                            Çıkış
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <span className="font-mono text-sm">{movement.product_code}</span>
                      </td>
                      <td className="p-2">
                        <div className="font-medium">{movement.product_name}</div>
                      </td>
                      <td className="p-2 text-right font-medium">
                        {movement.quantity} {movement.unit}
                      </td>
                      <td className="p-2 text-right">
                        {movement.unit_price
                          ? `${movement.unit_price.toLocaleString('tr-TR')} ${movement.currency}`
                          : '-'}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {movement.total_value > 0
                          ? `${movement.total_value.toLocaleString('tr-TR')} ${movement.currency}`
                          : '-'}
                      </td>
                      <td className="p-2 text-sm">
                        {movement.job_number ? (
                          <div>
                            <div className="font-medium">{movement.job_number}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {movement.job_title}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-2 text-sm">{movement.purpose || '-'}</td>
                      <td className="p-2 text-sm">{movement.created_by_name || '-'}</td>
                      <td className="p-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem
                              onClick={() => {
                                setForm({
                                  ...form,
                                  stock_id: movement.stock_id,
                                  movement_type: movement.movement_type,
                                  quantity: movement.quantity.toString(),
                                  unit_price: movement.unit_price?.toString() || '',
                                  currency: movement.currency || 'TRY',
                                  job_id: movement.job_id || '',
                                  recipient_type: movement.job_id ? 'job' : 'general',
                                })
                                setDialogOpen(true)
                              }}
                            >
                              {movement.movement_type === 'IN' ? (
                                <>
                                  <ArrowUpCircle className="w-4 h-4 mr-2 text-green-600" />
                                  Benzer Giriş Yap
                                </>
                              ) : (
                                <>
                                  <ArrowDownCircle className="w-4 h-4 mr-2 text-red-600" />
                                  Benzer Çıkış Yap
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/stocks/movements/${movement.id}`} className="cursor-pointer">
                                <Upload className="w-4 h-4 mr-2" />
                                Belgeler
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {form.movement_type === 'IN' ? (
                <>
                  <ArrowUpCircle className="h-5 w-5 text-green-600" />
                  Stok Girişi
                </>
              ) : (
                <>
                  <ArrowDownCircle className="h-5 w-5 text-red-600" />
                  Stok Çıkışı
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {form.movement_type === 'IN'
                ? 'Depoya yeni stok ekleyin'
                : 'Depodan stok çıkışı yapın'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Stok *</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                value={form.stock_id}
                onChange={(e) => setForm({ ...form, stock_id: e.target.value })}
                disabled={!!stockIdFilter}
              >
                <option value="">Seçiniz...</option>
                {stocks.map((stock) => (
                  <option key={stock.id} value={stock.id}>
                    {stock.product_code} - {stock.product_name} (Mevcut: {stock.current_quantity} {stock.unit})
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient Type Selection - Only for OUT movements */}
            {form.movement_type === 'OUT' && (
              <div>
                <label className="text-sm font-medium">Çıkış Türü *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.recipient_type}
                  onChange={(e) => setForm({ ...form, recipient_type: e.target.value as any, job_id: '', customer_id: '' })}
                >
                  <option value="job">Proje</option>
                  <option value="customer">Müşteri</option>
                  <option value="general">Genel Kullanım</option>
                </select>
              </div>
            )}

            {/* Conditional Recipient Selection */}
            {form.movement_type === 'OUT' && form.recipient_type === 'job' && (
              <div>
                <label className="text-sm font-medium">Proje *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.job_id}
                  onChange={(e) => setForm({ ...form, job_id: e.target.value })}
                >
                  <option value="">Seçiniz...</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.job_number} - {job.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.movement_type === 'OUT' && form.recipient_type === 'customer' && (
              <div>
                <label className="text-sm font-medium">Müşteri *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.customer_id}
                  onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                >
                  <option value="">Seçiniz...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}{customer.company_name ? ` (${customer.company_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Miktar * {selectedStock && `(${selectedStock.unit})`}</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Birim Fiyat</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Para Birimi</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  <option value="TRY">TRY</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Ek Açıklama (Opsiyonel)</label>
              <Input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="Ek bilgi veya açıklama..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">Belge No (Fatura/İrsaliye)</label>
              <Input
                value={form.document_no}
                onChange={(e) => setForm({ ...form, document_no: e.target.value })}
                placeholder="Örn: FT-2024-001"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Notlar</label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Kaydet
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Use Reservation Dialog */}
      <Dialog open={useReservationDialogOpen} onOpenChange={setUseReservationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rezervasyondan Stok Çıkışı</DialogTitle>
            <DialogDescription>
              Rezerve edilen malzemeden çıkış yapın
            </DialogDescription>
          </DialogHeader>

          {selectedReservation && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-900">
                  <div className="font-medium">{selectedReservation.job_number}</div>
                  <div className="text-xs">{selectedReservation.job_title}</div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-blue-600">Rezerve:</span>
                    <div className="font-medium">{selectedReservation.reserved_quantity}</div>
                  </div>
                  <div>
                    <span className="text-orange-600">Kullanılan:</span>
                    <div className="font-medium">{selectedReservation.used_quantity}</div>
                  </div>
                  <div>
                    <span className="text-green-600">Kalan:</span>
                    <div className="font-medium">{selectedReservation.remaining_quantity}</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Çıkış Miktarı *</label>
                <Input
                  type="number"
                  step="0.01"
                  value={useQuantity}
                  onChange={(e) => setUseQuantity(e.target.value)}
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maksimum: {selectedReservation.remaining_quantity}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Not (Opsiyonel)</label>
                <Input
                  value={useNotes}
                  onChange={(e) => setUseNotes(e.target.value)}
                  placeholder="Ek açıklama..."
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setUseReservationDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleUseReservation} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Stok Çıkışı Yap
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}