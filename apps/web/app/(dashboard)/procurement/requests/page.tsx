'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  GitBranch,
  ChevronDown,
  Columns,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { purchaseRequestsAPI } from '@/lib/api/procurement'

interface PurchaseRequest {
  id: string
  request_number: string
  title: string
  status: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  requested_by_name: string
  items_count: number
}

export default function PurchaseRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const response = await purchaseRequestsAPI.list()
      setRequests(response.data || [])
    } catch (error) {
      toast.error('Satın alma talepleri yüklenemedi')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchesSearch =
        req.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.requested_by_name.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'all' || req.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [requests, searchTerm, statusFilter])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { text: 'Taslak', className: 'bg-gray-100 text-gray-700 border-gray-200' },
      pending_approval: { text: 'Onay Bekliyor', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      approved: { text: 'Onaylandı', className: 'bg-green-100 text-green-700 border-green-200' },
      rejected: { text: 'Reddedildi', className: 'bg-red-100 text-red-700 border-red-200' },
      processing: { text: 'İşlemde', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      partially_completed: { text: 'Kısmen Tamamlandı', className: 'bg-purple-100 text-purple-700 border-purple-200' },
      completed: { text: 'Tamamlandı', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || { text: status, className: 'bg-gray-100' }
    return <Badge className={cn('text-xs', config.className)}>{config.text}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { text: 'Düşük', className: 'bg-gray-100 text-gray-700' },
      medium: { text: 'Normal', className: 'bg-blue-100 text-blue-700' },
      high: { text: 'Yüksek', className: 'bg-orange-100 text-orange-700' },
      urgent: { text: 'Acil', className: 'bg-red-100 text-red-700' },
    }
    const config = priorityConfig[priority as keyof typeof priorityConfig] || { text: priority, className: 'bg-gray-100' }
    return <Badge className={cn('text-xs', config.className)}>{config.text}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Satın Alma Talepleri</h1>
          <p className="text-sm text-gray-600 mt-1">
            Oluşturulan malzeme ihtiyaç taleplerini yönetin
          </p>
        </div>
        <Link href="/procurement/requests/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Talep Oluştur
          </Button>
        </Link>
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
                  placeholder="Talep no, başlık veya oluşturan..."
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
                <option value="pending_approval">Onay Bekliyor</option>
                <option value="approved">Onaylandı</option>
                <option value="rejected">Reddedildi</option>
                <option value="completed">Tamamlandı</option>
              </select>
            </div>

            <Button variant="outline" onClick={loadRequests}>
              <Filter className="h-4 w-4 mr-2" />
              Yenile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tablo */}
      <Card>
        <CardHeader>
          <CardTitle>Talep Listesi ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Henüz satın alma talebi bulunmuyor</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm">
                    <th className="pb-3 font-medium text-gray-700">Talep No</th>
                    <th className="pb-3 font-medium text-gray-700">Başlık</th>
                    <th className="pb-3 font-medium text-gray-700">Durum</th>
                    <th className="pb-3 font-medium text-gray-700">Öncelik</th>
                    <th className="pb-3 font-medium text-gray-700 text-center">Kalem</th>
                    <th className="pb-3 font-medium text-gray-700">Oluşturan</th>
                    <th className="pb-3 font-medium text-gray-700">Tarih</th>
                    <th className="pb-3 font-medium text-gray-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => (
                    <tr
                      key={req.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/procurement/requests/${req.id}`)}
                    >
                      <td className="py-3">
                        <span className="font-mono text-sm font-medium text-blue-600">
                          {req.request_number}
                        </span>
                      </td>
                      <td className="py-3 font-medium text-gray-800">{req.title}</td>
                      <td className="py-3">{getStatusBadge(req.status)}</td>
                      <td className="py-3">{getPriorityBadge(req.priority)}</td>
                      <td className="py-3 text-center">
                        <Badge variant="outline" className="text-xs">
                          {req.items_count}
                        </Badge>
                      </td>
                      <td className="py-3 text-sm text-gray-600">{req.requested_by_name}</td>
                      <td className="py-3 text-sm text-gray-600">{formatDate(req.created_at)}</td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/procurement/requests/${req.id}`)
                          }}
                        >
                          Detay
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
    </div>
  )
}