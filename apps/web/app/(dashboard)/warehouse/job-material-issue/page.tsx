'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Search,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Calendar,
  Minus,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface Job {
  id: string
  job_number: string
  title: string
  status: string
  customer_name: string
}

interface Reservation {
  id: string
  stock_id: string
  stock_code: string
  stock_name: string
  unit: string
  category: string
  available_quantity: number
  reserved_quantity: number
  used_quantity: number
  remaining_quantity: number
  planned_usage_date: string
  status: string
}

export default function JobMaterialIssuePage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [issuing, setIssuing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [issueQuantities, setIssueQuantities] = useState<{ [key: string]: string }>({})

  // Load active jobs
  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/jobs?status=in_progress,pending`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('İşler yüklenemedi')

      const data = await res.json()
      setJobs(data.jobs || data)
    } catch (error: any) {
      toast.error(error.message || 'İşler yüklenirken hata oluştu')
    }
  }

  const loadReservations = async (jobId: string) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/stock-reservations/job/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Rezervasyonlar yüklenemedi')

      const data = await res.json()
      // Only show active or partially used reservations
      const activeReservations = data.filter(
        (r: Reservation) => r.status === 'active' || r.status === 'partially_used'
      )
      setReservations(activeReservations)

      // Initialize issue quantities
      const quantities: { [key: string]: string } = {}
      activeReservations.forEach((r: Reservation) => {
        quantities[r.id] = ''
      })
      setIssueQuantities(quantities)
    } catch (error: any) {
      toast.error(error.message || 'Rezervasyonlar yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job)
    loadReservations(job.id)
  }

  const handleQuantityChange = (reservationId: string, value: string) => {
    setIssueQuantities({
      ...issueQuantities,
      [reservationId]: value,
    })
  }

  const handleIssue = async (reservation: Reservation) => {
    const quantity = parseFloat(issueQuantities[reservation.id])

    if (!quantity || quantity <= 0) {
      toast.error('Geçerli bir miktar girin')
      return
    }

    if (quantity > reservation.remaining_quantity) {
      toast.error(`Maksimum ${reservation.remaining_quantity} ${reservation.unit} çıkartılabilir`)
      return
    }

    if (quantity > reservation.available_quantity) {
      toast.error('Depoda yeterli stok yok!')
      return
    }

    try {
      setIssuing(true)
      const token = localStorage.getItem('token')

      // Create stock movement (withdrawal)
      const res = await fetch(`${API_URL}/api/stock-movements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stock_id: reservation.stock_id,
          movement_type: 'out',
          quantity: quantity,
          reference_type: 'job',
          reference_id: selectedJob?.id,
          job_id: selectedJob?.id,
          reservation_id: reservation.id,
          notes: `${selectedJob?.job_number} işi için malzeme çıkışı`,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Mal çıkışı yapılamadı')
      }

      toast.success(`${quantity} ${reservation.unit} ${reservation.stock_name} çıkışı yapıldı`)

      // Reload reservations
      if (selectedJob) {
        loadReservations(selectedJob.id)
      }

      // Clear quantity
      setIssueQuantities({
        ...issueQuantities,
        [reservation.id]: '',
      })
    } catch (error: any) {
      toast.error(error.message || 'Mal çıkışı yapılırken hata oluştu')
    } finally {
      setIssuing(false)
    }
  }

  const handleQuickIssue = (reservation: Reservation, percentage: number) => {
    const quantity = (reservation.remaining_quantity * percentage).toFixed(2)
    handleQuantityChange(reservation.id, quantity)
  }

  const filteredJobs = jobs.filter(
    (job) =>
      job.job_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">İşe Malzeme Çıkışı</h1>
        <p className="text-sm text-gray-600 mt-1">Rezerve edilmiş malzemeleri işlere çıkartın</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Left Side - Job Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              İş Seçimi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>İş Ara</Label>
                <Input
                  type="text"
                  placeholder="İş numarası, başlık veya müşteri..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="max-h-[600px] overflow-y-auto space-y-2">
                {filteredJobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aktif iş bulunamadı</p>
                  </div>
                ) : (
                  filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => handleJobSelect(job)}
                      className={cn(
                        'p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md',
                        selectedJob?.id === job.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{job.job_number}</div>
                          <div className="text-sm text-gray-600 mt-1">{job.title}</div>
                          {job.customer_name && (
                            <div className="text-xs text-gray-500 mt-1">{job.customer_name}</div>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            job.status === 'in_progress' && 'bg-green-100 text-green-700 border-green-200',
                            job.status === 'pending' && 'bg-yellow-100 text-yellow-700 border-yellow-200'
                          )}
                        >
                          {job.status === 'in_progress' ? 'Devam Ediyor' : 'Beklemede'}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Side - Material Issue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Malzeme Çıkışı
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedJob ? (
              <div className="text-center py-12 text-gray-500">
                <ArrowRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Lütfen sol taraftan bir iş seçin</p>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Yükleniyor...</p>
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Bu iş için aktif rezervasyon bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {reservations.map((reservation) => (
                  <div key={reservation.id} className="p-4 border rounded-lg space-y-3">
                    {/* Material Info */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{reservation.stock_name}</div>
                        <div className="text-sm text-gray-600">{reservation.stock_code}</div>
                        {reservation.category && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {reservation.category}
                          </Badge>
                        )}
                      </div>
                      {reservation.status === 'partially_used' && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                          Kısmi Kullanılmış
                        </Badge>
                      )}
                    </div>

                    {/* Stock Info */}
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Depoda</p>
                        <p className="font-medium text-green-600">
                          {reservation.available_quantity} {reservation.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Rezerve</p>
                        <p className="font-medium text-blue-600">
                          {reservation.reserved_quantity} {reservation.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Kullanılmış</p>
                        <p className="font-medium text-gray-600">
                          {reservation.used_quantity} {reservation.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Kalan</p>
                        <p className="font-medium text-orange-600">
                          {reservation.remaining_quantity} {reservation.unit}
                        </p>
                      </div>
                    </div>

                    {/* Planned Date */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Planlanan: {new Date(reservation.planned_usage_date).toLocaleDateString('tr-TR')}
                      </span>
                    </div>

                    {/* Issue Form */}
                    <div className="space-y-2 pt-2 border-t">
                      <Label>Çıkartılacak Miktar ({reservation.unit})</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={Math.min(reservation.remaining_quantity, reservation.available_quantity)}
                          value={issueQuantities[reservation.id] || ''}
                          onChange={(e) => handleQuantityChange(reservation.id, e.target.value)}
                          placeholder="0.00"
                          className="flex-1"
                        />
                        <Button
                          onClick={() => handleIssue(reservation)}
                          disabled={issuing || !issueQuantities[reservation.id]}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Minus className="h-4 w-4 mr-2" />
                          Çıkart
                        </Button>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickIssue(reservation, 0.25)}
                          className="flex-1"
                        >
                          25%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickIssue(reservation, 0.5)}
                          className="flex-1"
                        >
                          50%
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickIssue(reservation, 1)}
                          className="flex-1"
                        >
                          Tamamı
                        </Button>
                      </div>

                      {/* Warning if not enough stock */}
                      {reservation.available_quantity < reservation.remaining_quantity && (
                        <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <p>
                            Dikkat: Depoda yeterli stok yok! İhtiyaç: {reservation.remaining_quantity}{' '}
                            {reservation.unit}, Mevcut: {reservation.available_quantity} {reservation.unit}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Help Text */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Package className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">Kullanım Talimatları</p>
              <ul className="space-y-1 list-disc list-inside text-blue-800">
                <li>Sol taraftan aktif bir iş seçin</li>
                <li>Rezerve edilmiş malzemeler otomatik olarak gösterilir</li>
                <li>Çıkartmak istediğiniz miktarı girin ve "Çıkart" butonuna tıklayın</li>
                <li>Hızlı butonları (25%, 50%, Tamamı) kullanarak kolayca miktar seçebilirsiniz</li>
                <li>Mal çıkışı yapıldığında rezervasyonun "Kullanılmış" miktarı otomatik güncellenir</li>
                <li>Tüm miktar kullanıldığında rezervasyon "Tamamen Kullanılmış" durumuna geçer</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
