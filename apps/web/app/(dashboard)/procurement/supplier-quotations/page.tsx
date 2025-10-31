'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowUpDown,
  Eye,
  GitCompare,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface Quotation {
  id: string
  quotation_number: string
  quotation_date: string
  valid_until: string
  status: string
  currency: string
  payment_terms: string
  delivery_terms: string
  notes: string
  supplier_id: string
  supplier_name: string
  supplier_contact: string
  supplier_email: string
  supplier_phone: string
  rfq_id: string
  rfq_number: string
  rfq_title: string
  rfq_due_date: string
  total_amount: number
  item_count: number
}

interface Stats {
  total: number
  pending: number
  submitted: number
  selected: number
  rejected: number
  expired: number
}

interface Supplier {
  id: string
  name: string
}

export default function SupplierQuotationsPage() {
  const router = useRouter()

  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    loadData()
  }, [statusFilter, supplierFilter, dateFrom, dateTo])

  const loadData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)
      if (supplierFilter) params.append('supplier_id', supplierFilter)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      if (searchTerm) params.append('search', searchTerm)

      const res = await fetch(`${API_URL}/api/procurement/supplier-quotations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Teklifler yüklenemedi')

      const result = await res.json()
      setQuotations(result.data.quotations || [])
      setStats(result.data.stats || null)
      setSuppliers(result.data.suppliers || [])
    } catch (error: any) {
      toast.error(error.message || 'Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadData()
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
        throw new Error(errorData.error || 'Durum güncellenemedi')
      }

      toast.success('Teklif durumu güncellendi')
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Durum güncellenirken hata oluştu')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: {
        icon: Clock,
        text: 'Beklemede',
        className: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      },
      submitted: {
        icon: FileText,
        text: 'Gönderildi',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      selected: {
        icon: CheckCircle,
        text: 'Kabul Edildi',
        className: 'bg-green-50 text-green-700 border-green-200',
      },
      rejected: {
        icon: XCircle,
        text: 'Reddedildi',
        className: 'bg-red-50 text-red-700 border-red-200',
      },
      expired: {
        icon: AlertCircle,
        text: 'Süresi Doldu',
        className: 'bg-gray-50 text-gray-600 border-gray-200',
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return null

    const Icon = config.icon

    return (
      <Badge variant="outline" className={cn('text-xs px-2 py-1 border', config.className)}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${currency}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Tedarikçi Teklifleri</h1>
          <p className="text-sm text-gray-500">
            Tüm tedarikçilerden gelen teklifleri görüntüleyin ve yönetin
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-gray-500 mb-1">Toplam</div>
              <div className="text-2xl font-semibold text-gray-900">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-400">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-gray-500 mb-1">Beklemede</div>
              <div className="text-2xl font-semibold text-gray-900">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-gray-500 mb-1">Gönderildi</div>
              <div className="text-2xl font-semibold text-gray-900">{stats.submitted}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-400">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-gray-500 mb-1">Kabul Edildi</div>
              <div className="text-2xl font-semibold text-gray-900">{stats.selected}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-400">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-gray-500 mb-1">Reddedildi</div>
              <div className="text-2xl font-semibold text-gray-900">{stats.rejected}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-gray-300">
            <CardContent className="pt-4 pb-3">
              <div className="text-sm text-gray-500 mb-1">Süresi Doldu</div>
              <div className="text-2xl font-semibold text-gray-900">{stats.expired}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Teklif no, tedarikçi, RFQ ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} className="whitespace-nowrap">
                <Search className="w-4 h-4 mr-2" />
                Ara
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Tüm Durumlar</option>
                <option value="pending">Beklemede</option>
                <option value="submitted">Gönderildi</option>
                <option value="selected">Kabul Edildi</option>
                <option value="rejected">Reddedildi</option>
                <option value="expired">Süresi Doldu</option>
              </select>

              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Tüm Tedarikçiler</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>

              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm"
                placeholder="Başlangıç Tarihi"
              />

              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm"
                placeholder="Bitiş Tarihi"
              />

              {(statusFilter || supplierFilter || dateFrom || dateTo || searchTerm) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('')
                    setSupplierFilter('')
                    setDateFrom('')
                    setDateTo('')
                    setSearchTerm('')
                    setTimeout(loadData, 100)
                  }}
                  className="whitespace-nowrap"
                >
                  Filtreleri Temizle
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tedarikçi Teklifleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : quotations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Teklif bulunamadı</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Teklif No
                    </th>
                    <th className="text-left py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Tedarikçi
                    </th>
                    <th className="text-left py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      RFQ
                    </th>
                    <th className="text-left py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Tarih
                    </th>
                    <th className="text-right py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Toplam Tutar
                    </th>
                    <th className="text-center py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Kalem
                    </th>
                    <th className="text-left py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      Durum
                    </th>
                    <th className="text-right py-2 px-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                      İşlem
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quotation, index) => (
                    <tr
                      key={quotation.id}
                      className={cn(
                        'border-b hover:bg-gray-50 transition-colors',
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      )}
                    >
                      <td className="py-2.5 px-4">
                        <div className="font-mono text-sm text-blue-600 font-medium">
                          {quotation.quotation_number}
                        </div>
                        <div className="text-xs text-gray-500">
                          Geçerlilik: {formatDate(quotation.valid_until)}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-gray-900">{quotation.supplier_name}</div>
                        <div className="text-xs text-gray-500">{quotation.supplier_contact}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-gray-900">{quotation.rfq_number}</div>
                        <div className="text-xs text-gray-500 line-clamp-1">
                          {quotation.rfq_title}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-sm text-gray-700">
                        {formatDate(quotation.quotation_date)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(quotation.total_amount, quotation.currency)}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center text-sm text-gray-700">
                        {quotation.item_count}
                      </td>
                      <td className="py-2.5 px-4">{getStatusBadge(quotation.status)}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/procurement/rfq/${quotation.rfq_id}/compare`}>
                            <Button variant="outline" size="sm" className="whitespace-nowrap">
                              <GitCompare className="w-3 h-3 mr-1" />
                              Karşılaştır
                            </Button>
                          </Link>

                          {quotation.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(quotation.id, 'selected')}
                                className="text-green-600 hover:bg-green-50 whitespace-nowrap"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Kabul
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(quotation.id, 'rejected')}
                                className="text-red-600 hover:bg-red-50 whitespace-nowrap"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reddet
                              </Button>
                            </>
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
    </div>
  )
}
