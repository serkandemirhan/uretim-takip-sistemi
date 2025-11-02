'use client'

import { useEffect, useState } from 'react'
import { quotationsAPI, customersAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  Plus,
  Search,
  Eye,
  Trash2,
  FileText,
  Calendar,
  User,
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function QuotationsPage() {
  const router = useRouter()
  const [quotations, setQuotations] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterCustomer, setFilterCustomer] = useState<string>('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newQuotation, setNewQuotation] = useState({
    name: '',
    customer_id: '',
    description: '',
  })
  const [sortColumn, setSortColumn] = useState<string>('')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    loadQuotations()
    loadCustomers()
  }, [filterStatus, filterCustomer])

  async function loadQuotations() {
    try {
      setLoading(true)
      const params: any = {}
      if (filterStatus) params.status = filterStatus
      if (filterCustomer) params.customer_id = filterCustomer

      const response = await quotationsAPI.getAll(params)
      setQuotations(response.data || [])
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Teklifler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function loadCustomers() {
    try {
      const response = await customersAPI.getAll()
      setCustomers(response.data || [])
    } catch (error) {
      console.error('Müşteriler yüklenemedi:', error)
    }
  }

  async function handleCreate() {
    if (!newQuotation.name.trim()) {
      toast.error('Teklif adı gerekli')
      return
    }

    try {
      setCreating(true)
      const response = await quotationsAPI.create(newQuotation)
      toast.success('Teklif oluşturuldu')
      setShowCreateDialog(false)
      setNewQuotation({ name: '', customer_id: '', description: '' })

      // Yeni oluşturulan teklif detayına yönlendir
      if (response?.data?.id) {
        router.push(`/quotations/${response.data.id}`)
      } else {
        // ID yoksa liste sayfasını yenile
        await loadQuotations()
      }
    } catch (error: any) {
      console.error('Create quotation error:', error)
      const errorMsg = error.response?.data?.error || error.message || 'Teklif oluşturulamadı'
      toast.error(errorMsg)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" teklifini silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      await quotationsAPI.delete(id)
      toast.success('Teklif silindi')
      loadQuotations()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Teklif silinemedi')
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700'
      case 'active':
        return 'bg-blue-100 text-blue-700'
      case 'approved':
        return 'bg-green-100 text-green-700'
      case 'rejected':
        return 'bg-red-100 text-red-700'
      case 'archived':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      draft: 'Taslak',
      active: 'Aktif',
      approved: 'Onaylandı',
      rejected: 'Reddedildi',
      archived: 'Arşivlendi',
    }
    return labels[status] || status
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-30" />
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 inline" />
    )
  }

  const filteredQuotations = quotations.filter((q) =>
    q.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.quotation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedQuotations = [...filteredQuotations].sort((a, b) => {
    if (!sortColumn) return 0

    let aValue: any = a[sortColumn as keyof typeof a]
    let bValue: any = b[sortColumn as keyof typeof b]

    // Handle numeric comparisons
    if (sortColumn === 'total_cost' || sortColumn === 'item_count') {
      aValue = Number(aValue) || 0
      bValue = Number(bValue) || 0
    }

    // Handle date comparisons
    if (sortColumn === 'created_at') {
      aValue = new Date(aValue).getTime()
      bValue = new Date(bValue).getTime()
    }

    // Handle string comparisons
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue?.toLowerCase() || ''
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teklifler</h1>
          <p className="text-gray-600">Malzeme listeleri ve teklif yönetimi</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Teklif
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Teklif ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">Tüm Durumlar</option>
              <option value="draft">Taslak</option>
              <option value="active">Aktif</option>
              <option value="approved">Onaylandı</option>
              <option value="rejected">Reddedildi</option>
              <option value="archived">Arşivlendi</option>
            </select>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">Tüm Müşteriler</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Quotations List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        </div>
      ) : sortedQuotations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {searchTerm || filterStatus || filterCustomer
              ? 'Arama kriterlerine uygun teklif bulunamadı'
              : 'Henüz teklif oluşturulmamış. Yeni teklif oluşturmak için yukarıdaki butonu kullanın.'}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        Teklif
                        <SortIcon column="name" />
                      </TableHead>
                      <TableHead
                        className="hidden lg:table-cell cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('customer_name')}
                      >
                        Müşteri
                        <SortIcon column="customer_name" />
                      </TableHead>
                      <TableHead
                        className="hidden xl:table-cell cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('created_by_name')}
                      >
                        Oluşturan
                        <SortIcon column="created_by_name" />
                      </TableHead>
                      <TableHead
                        className="hidden lg:table-cell cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('created_at')}
                      >
                        Tarih
                        <SortIcon column="created_at" />
                      </TableHead>
                      <TableHead
                        className="hidden xl:table-cell text-center cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('item_count')}
                      >
                        Ürün
                        <SortIcon column="item_count" />
                      </TableHead>
                      <TableHead
                        className="text-right cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('total_cost')}
                      >
                        Toplam
                        <SortIcon column="total_cost" />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('status')}
                      >
                        Durum
                        <SortIcon column="status" />
                      </TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedQuotations.map((quotation) => (
                      <TableRow
                        key={quotation.id}
                        onClick={() => router.push(`/quotations/${quotation.id}`)}
                        className="cursor-pointer"
                      >
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold text-gray-900">
                              {quotation.name}
                            </span>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                              {quotation.quotation_number && (
                                <span className="font-mono">{quotation.quotation_number}</span>
                              )}
                              <span>{quotation.item_count || 0} ürün</span>
                            </div>
                            {quotation.description && (
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {quotation.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {quotation.customer_name || '-'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          {quotation.created_by_name || 'Bilinmiyor'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {quotation.created_at
                            ? new Date(quotation.created_at).toLocaleDateString('tr-TR')
                            : '-'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-center">
                          <span className="font-medium text-gray-700">
                            {quotation.item_count || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <span className="font-semibold text-gray-900">
                            {quotation.total_cost
                              ? `${Number(quotation.total_cost).toLocaleString('tr-TR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })} ${quotation.currency || 'TRY'}`
                              : '0.00 TRY'}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge className={getStatusColor(quotation.status)}>
                            {getStatusLabel(quotation.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-px text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/quotations/${quotation.id}`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation()
                                if (quotation.status === 'draft') {
                                  handleDelete(quotation.id, quotation.name)
                                }
                              }}
                              disabled={quotation.status !== 'draft'}
                              className={quotation.status === 'draft' ? 'text-red-600 hover:text-red-700' : 'text-gray-400'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4 md:hidden">
            {sortedQuotations.map((quotation) => (
              <Card key={quotation.id} className="transition-shadow hover:shadow-md">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {quotation.name}
                        </h3>
                        <Badge className={getStatusColor(quotation.status)}>
                          {getStatusLabel(quotation.status)}
                        </Badge>
                      </div>

                      <div className="grid gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-mono">{quotation.quotation_number}</span>
                        </div>

                        {quotation.customer_name && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span>{quotation.customer_name}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span>{quotation.created_by_name || 'Bilinmiyor'}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            {quotation.created_at
                              ? new Date(quotation.created_at).toLocaleDateString('tr-TR')
                              : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="text-gray-600">
                          <span className="font-semibold">{quotation.item_count || 0}</span>{' '}
                          ürün
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="font-semibold text-gray-900">
                          {quotation.total_cost
                            ? `${Number(quotation.total_cost).toLocaleString('tr-TR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} ${quotation.currency || 'TRY'}`
                            : '0.00 TRY'}
                        </span>
                      </div>

                      {quotation.description && (
                        <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                          {quotation.description}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/quotations/${quotation.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (quotation.status === 'draft') {
                            handleDelete(quotation.id, quotation.name)
                          }
                        }}
                        disabled={quotation.status !== 'draft'}
                        className={quotation.status === 'draft' ? 'text-red-600 hover:text-red-700' : 'text-gray-400'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Yeni Teklif Oluştur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Teklif Adı *
                </label>
                <Input
                  value={newQuotation.name}
                  onChange={(e) =>
                    setNewQuotation({ ...newQuotation, name: e.target.value })
                  }
                  placeholder="Örn: 2025 Broşür Baskısı"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Müşteri
                </label>
                <select
                  value={newQuotation.customer_id}
                  onChange={(e) =>
                    setNewQuotation({ ...newQuotation, customer_id: e.target.value })
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">Seçilmedi</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Açıklama
                </label>
                <textarea
                  value={newQuotation.description}
                  onChange={(e) =>
                    setNewQuotation({ ...newQuotation, description: e.target.value })
                  }
                  placeholder="Teklif hakkında notlar..."
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreate}
                  disabled={creating || !newQuotation.name.trim()}
                  className="flex-1"
                >
                  {creating ? 'Oluşturuluyor...' : 'Oluştur'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false)
                    setNewQuotation({ name: '', customer_id: '', description: '' })
                  }}
                  disabled={creating}
                  className="flex-1"
                >
                  İptal
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
