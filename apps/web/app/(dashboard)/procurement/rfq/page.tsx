'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Package,
  Eye,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface RFQ {
  id: string
  rfq_number: string
  title: string
  description: string
  status: string
  due_date: string
  created_at: string
  created_by_name: string
  items_count: number
  quotations_count: number
}

export default function RFQListPage() {
  const router = useRouter()
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadRFQs()
  }, [])

  const loadRFQs = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/procurement/rfq`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('RFQ listesi yüklenemedi')

      const data = await res.json()
      setRfqs(data.data || [])
    } catch (error: any) {
      toast.error(error.message || 'Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const filteredRFQs = useMemo(() => {
    return rfqs.filter((rfq) => {
      const matchesSearch =
        rfq.rfq_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfq.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rfq.created_by_name.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || rfq.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [rfqs, searchTerm, statusFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200">Taslak</Badge>
        )
      case 'sent':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">Gönderildi</Badge>
        )
      case 'closed':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">Kapatıldı</Badge>
        )
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">İptal</Badge>
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

  const isDueSoon = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const daysUntilDue = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilDue <= 3 && daysUntilDue >= 0
  }

  const isOverdue = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    return due < today
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RFQ (Fiyat Teklifi Talepleri)</h1>
          <p className="text-sm text-gray-600 mt-1">
            Tedarikçilere gönderilen fiyat teklifi taleplerini yönetin
          </p>
        </div>
        <Link href="/procurement/needs-analysis">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Yeni RFQ
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam RFQ</p>
                <p className="text-2xl font-bold">{rfqs.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aktif</p>
                <p className="text-2xl font-bold text-blue-600">
                  {rfqs.filter((r) => r.status === 'sent').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Taslak</p>
                <p className="text-2xl font-bold text-gray-600">
                  {rfqs.filter((r) => r.status === 'draft').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-gray-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Kapatıldı</p>
                <p className="text-2xl font-bold text-green-600">
                  {rfqs.filter((r) => r.status === 'closed').length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-600 opacity-50" />
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
                  placeholder="RFQ numarası, başlık veya oluşturan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-48">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Durum</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
              >
                <option value="all">Tümü</option>
                <option value="draft">Taslak</option>
                <option value="sent">Gönderildi</option>
                <option value="closed">Kapatıldı</option>
                <option value="cancelled">İptal</option>
              </select>
            </div>

            <Button variant="outline" onClick={loadRFQs}>
              <Filter className="h-4 w-4 mr-2" />
              Yenile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* RFQ List */}
      <Card>
        <CardHeader>
          <CardTitle>RFQ Listesi ({filteredRFQs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRFQs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz RFQ bulunmuyor</p>
              <p className="text-sm mt-2">
                Yeni bir RFQ oluşturmak için yukarıdaki "Yeni RFQ" butonuna tıklayın
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm">
                    <th className="pb-3 font-medium text-gray-700">RFQ No</th>
                    <th className="pb-3 font-medium text-gray-700">Başlık</th>
                    <th className="pb-3 font-medium text-gray-700">Durum</th>
                    <th className="pb-3 font-medium text-gray-700 text-center">Malzeme</th>
                    <th className="pb-3 font-medium text-gray-700 text-center">Teklif</th>
                    <th className="pb-3 font-medium text-gray-700">Son Teklif Tarihi</th>
                    <th className="pb-3 font-medium text-gray-700">Oluşturan</th>
                    <th className="pb-3 font-medium text-gray-700">Oluşturma Tarihi</th>
                    <th className="pb-3 font-medium text-gray-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRFQs.map((rfq) => (
                    <tr
                      key={rfq.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/procurement/rfq/${rfq.id}`)}
                    >
                      <td className="py-3">
                        <span className="font-mono text-sm font-medium text-blue-600">
                          {rfq.rfq_number}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="font-medium">{rfq.title}</div>
                        {rfq.description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {rfq.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3">{getStatusBadge(rfq.status)}</td>
                      <td className="py-3 text-center">
                        <Badge variant="outline" className="text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          {rfq.items_count}
                        </Badge>
                      </td>
                      <td className="py-3 text-center">
                        {rfq.quotations_count > 0 ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                            {rfq.quotations_count}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span
                            className={cn(
                              'text-sm',
                              isOverdue(rfq.due_date) && 'text-red-600 font-semibold',
                              isDueSoon(rfq.due_date) && !isOverdue(rfq.due_date) && 'text-orange-600 font-semibold'
                            )}
                          >
                            {formatDate(rfq.due_date)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-sm text-gray-600">{rfq.created_by_name}</td>
                      <td className="py-3 text-sm text-gray-600">
                        {formatDate(rfq.created_at)}
                      </td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/procurement/rfq/${rfq.id}`)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">RFQ Yönetimi Hakkında</p>
              <ul className="space-y-1 list-disc list-inside text-blue-800">
                <li>RFQ'ları tedarikçilere göndererek fiyat teklifleri alın</li>
                <li>Gelen teklifleri karşılaştırın ve en uygun teklifi seçin</li>
                <li>Seçilen teklife göre satın alma siparişi oluşturun</li>
                <li>Son teklif tarihi yaklaşan veya geçen RFQ'lar otomatik olarak vurgulanır</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
