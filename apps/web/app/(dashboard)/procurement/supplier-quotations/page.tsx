'use client'

import { useEffect, useState, useMemo, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  MoreVertical,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ArrowUpDown,
  GitCompare,
  RefreshCcw,
  Settings,
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

type ColumnConfig = {
  key: string
  label: string
  width?: string
  type?: 'string' | 'number' | 'date'
  filterType?: 'text' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
  accessor: (quotation: Quotation) => string | number | null | undefined
  render?: (quotation: Quotation) => ReactNode
}

const STATUS_CONFIG: Record<string, { icon: ReactNode; text: string; className: string }> = {
  pending: { icon: <Clock className="w-3 h-3" />, text: 'Beklemede', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  submitted: { icon: <FileText className="w-3 h-3" />, text: 'Gönderildi', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  selected: { icon: <CheckCircle className="w-3 h-3" />, text: 'Kabul Edildi', className: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { icon: <XCircle className="w-3 h-3" />, text: 'Reddedildi', className: 'bg-red-50 text-red-700 border-red-200' },
  expired: { icon: <AlertCircle className="w-3 h-3" />, text: 'Süresi Doldu', className: 'bg-gray-50 text-gray-600 border-gray-200' },
}

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([key, { text }]) => ({ value: key, label: text }))

const STORAGE_KEY_PREFIX = 'supplier_quotations_table_settings_'

export default function SupplierQuotationsPage() {
  const router = useRouter()

  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

  // Table state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({})
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())
  const [columnOrder, setColumnOrder] = useState<string[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      // Fetch all quotations, filtering will be done on the client-side
      const res = await fetch(`${API_URL}/api/procurement/supplier-quotations`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Teklifler yüklenemedi')

      const result = await res.json()
      setQuotations(result.data.quotations || [])
      setStats(result.data.stats || null)
    } catch (error: any) {
      toast.error(error.message || 'Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handles changing the status of a quotation.
   *
   * @param {string} quotationId - The ID of the quotation to update.
   * @param {string} newStatus - The new status to set for the quotation.
   * @returns {Promise<void>} A promise that resolves when the status is updated.
   */
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

  const columnConfigs = useMemo<ColumnConfig[]>(() => [
    { key: 'quotation_number', label: 'Teklif No', width: 'w-40', placeholder: 'No ara', accessor: q => q.quotation_number },
    { key: 'supplier_name', label: 'Tedarikçi', width: 'w-64', placeholder: 'Tedarikçi ara', accessor: q => q.supplier_name },
    { key: 'rfq', label: 'Talep (RFQ)', width: 'w-64', placeholder: 'Talep ara', accessor: q => `${q.rfq_number} ${q.rfq_title}`, render: q => (
        <Link href={`/procurement/rfq/${q.rfq_id}`} className="hover:underline text-blue-600" onClick={e => e.stopPropagation()}>
          <div className="font-medium">{q.rfq_number}</div>
          <div className="text-xs text-gray-500 line-clamp-1">{q.rfq_title}</div>
        </Link>
      )},
    { key: 'quotation_date', label: 'Teklif Tarihi', width: 'w-40', type: 'date', accessor: q => q.quotation_date, render: q => formatDate(q.quotation_date) },
    { key: 'total_amount', label: 'Toplam Tutar', width: 'w-48', type: 'number', accessor: q => q.total_amount, render: q => formatCurrency(q.total_amount, q.currency) },
    { key: 'item_count', label: 'Kalem', width: 'w-24', type: 'number', accessor: q => q.item_count, render: q => `${q.item_count} kalem` },
    { key: 'status', label: 'Durum', width: 'w-40', filterType: 'select', options: STATUS_OPTIONS, accessor: q => q.status, render: q => {
        const config = STATUS_CONFIG[q.status]
        if (!config) return <Badge variant="outline">{q.status}</Badge>
        return <Badge variant="outline" className={cn('text-xs px-2 py-1 border inline-flex items-center gap-1.5', config.className)}>{config.icon} {config.text}</Badge>
      }},
    { key: 'valid_until', label: 'Geçerlilik', width: 'w-40', type: 'date', accessor: q => q.valid_until, render: q => formatDate(q.valid_until) },
  ], [])

  const getUserStorageKey = () => {
    if (typeof window === 'undefined') return null
    const user = localStorage.getItem('user')
    if (!user) return null
    try {
      const userData = JSON.parse(user)
      return `${STORAGE_KEY_PREFIX}${userData.id || 'default'}`
    } catch {
      return `${STORAGE_KEY_PREFIX}default`
    }
  }

  useEffect(() => {
    const storageKey = getUserStorageKey()
    if (!storageKey) {
      setVisibleColumns(new Set(columnConfigs.map(c => c.key)))
      setColumnOrder(columnConfigs.map(c => c.key))
      return
    }

    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const settings = JSON.parse(saved)
        if (settings.columnWidths) setColumnWidths(settings.columnWidths)
        if (settings.visibleColumns) setVisibleColumns(new Set(settings.visibleColumns))
        else setVisibleColumns(new Set(columnConfigs.map(c => c.key)))
        if (settings.order) setColumnOrder(settings.order)
        else setColumnOrder(columnConfigs.map(c => c.key))
      } else {
        setVisibleColumns(new Set(columnConfigs.map(c => c.key)))
        setColumnOrder(columnConfigs.map(c => c.key))
      }
    } catch (error) {
      console.error('Failed to load table settings:', error)
      setVisibleColumns(new Set(columnConfigs.map(c => c.key)))
      setColumnOrder(columnConfigs.map(c => c.key))
    }
  }, [columnConfigs])

  useEffect(() => {
    const storageKey = getUserStorageKey()
    if (!storageKey) return

    const settings = {
      columnWidths,
      visibleColumns: Array.from(visibleColumns),
      order: columnOrder,
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save table settings:', error)
    }
  }, [columnWidths, visibleColumns, columnOrder])

  useEffect(() => {
    const h = setTimeout(() => setFilters(draftFilters), 250)
    return () => clearTimeout(h)
  }, [draftFilters])

  const filteredQuotations = useMemo(() => {
    return quotations.filter(quotation => {
      return columnConfigs.every(column => {
        const filterValue = filters[column.key]
        if (!filterValue) return true

        const rawValue = column.accessor(quotation)
        if (rawValue == null) return false

        const normalizedFilter = filterValue.trim().toLowerCase()
        if (column.filterType === 'select') return String(rawValue).toLowerCase() === normalizedFilter
        if (column.type === 'date') return new Date(rawValue as string).toLocaleDateString('tr-TR').includes(normalizedFilter)
        return String(rawValue).toLowerCase().includes(normalizedFilter)
      })
    })
  }, [quotations, filters, columnConfigs])

  const sortedQuotations = useMemo(() => {
    if (!sortConfig) return filteredQuotations

    const column = columnConfigs.find(col => col.key === sortConfig.key)
    if (!column) return filteredQuotations

    const getComparable = (quotation: Quotation) => {
      const value = column.accessor(quotation)
      if (value == null) return null
      if (column.type === 'number') return Number(value)
      if (column.type === 'date') return value ? new Date(value as string).getTime() : null
      return String(value).toLowerCase()
    }

    return [...filteredQuotations].sort((a, b) => {
      const aValue = getComparable(a)
      const bValue = getComparable(b)

      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue, 'tr') : bValue.localeCompare(aValue, 'tr')
      }
      return 0
    })
  }, [filteredQuotations, sortConfig, columnConfigs])

  const visibleColumnConfigs = useMemo(() => {
    const orderIndex: Record<string, number> = {}
    columnOrder.forEach((k, i) => { orderIndex[k] = i })
    return columnConfigs
      .filter(col => visibleColumns.has(col.key))
      .sort((a, b) => (orderIndex[a.key] ?? 99) - (orderIndex[b.key] ?? 99))
  }, [columnConfigs, visibleColumns, columnOrder])

  function toggleSort(key: string) {
    setSortConfig(prev => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' }
      if (prev.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  function getSortIcon(colKey: string) {
    if (!sortConfig || sortConfig.key !== colKey) return <ArrowUpDown className="h-4 w-4 text-gray-400" />
    return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4 text-blue-600" /> : <ArrowDown className="h-4 w-4 text-blue-600" />
  }

  function resetFilters() {
    setDraftFilters({})
    setFilters({})
    setSortConfig(null)
  }

  function handleResizeStart(e: React.MouseEvent, columnKey: string) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = columnWidths[columnKey] || 200

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX
      setColumnWidths(prev => ({ ...prev, [columnKey]: Math.max(80, startWidth + diff) }))
    }
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  function toggleColumnVisibility(columnKey: string) {
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(columnKey)) next.delete(columnKey)
      else next.add(columnKey)
      return next
    })
  }

  function moveColumn(key: string, direction: 'up' | 'down') {
    setColumnOrder(prev => {
      const idx = prev.indexOf(key)
      if (idx === -1) return prev
      const newIndex = direction === 'up' ? idx - 1 : idx + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev
      const next = [...prev]
      next.splice(idx, 1)
      next.splice(newIndex, 0, key)
      return next
    })
  }

  function resetTableSettings() {
    setColumnWidths({})
    setVisibleColumns(new Set(columnConfigs.map(c => c.key)))
    setColumnOrder(columnConfigs.map(c => c.key))
    toast.success('Tablo ayarları sıfırlandı')
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSettingsDialogOpen(true)} className="gap-2">
            <Settings className="h-4 w-4" />
            Tablo Ayarları
          </Button>
          <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
            <X className="h-4 w-4" />
            Filtreleri Sıfırla
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
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

      {/* Quotations Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tedarikçi Teklifleri ({sortedQuotations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : sortedQuotations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Filtrelerle eşleşen teklif bulunamadı.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    {visibleColumnConfigs.map(column => (
                      <TableHead key={column.key} className="group relative px-3 py-2" style={{ width: columnWidths[column.key] || 'auto' }}>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => toggleSort(column.key)} className="flex items-center gap-2 font-semibold text-gray-700">
                            {column.label}
                            {getSortIcon(column.key)}
                          </button>
                        </div>
                        <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-gray-300" onMouseDown={e => handleResizeStart(e, column.key)} />
                      </TableHead>
                    ))}
                    <TableHead className="w-40 text-right px-3 py-2 font-semibold text-gray-700">İşlemler</TableHead>
                  </TableRow>
                  <TableRow className="bg-gray-50">
                    {visibleColumnConfigs.map(column => (
                      <TableCell key={`${column.key}-filter`} className="p-1" style={{ width: columnWidths[column.key] || 'auto' }}>
                        {column.filterType === 'select' ? (
                          <select value={draftFilters[column.key] || ''} onChange={e => setDraftFilters(prev => ({ ...prev, [column.key]: e.target.value }))} className="h-8 w-full rounded-md border border-gray-300 px-2 py-1 text-xs">
                            <option value="">Tümü</option>
                            {column.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        ) : (
                          <Input value={draftFilters[column.key] || ''} onChange={e => setDraftFilters(prev => ({ ...prev, [column.key]: e.target.value }))} placeholder={column.placeholder} className="h-8 text-xs" />
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="p-1" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedQuotations.map((quotation) => (
                    <TableRow
                      key={quotation.id}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => router.push(`/procurement/quotations/${quotation.id}`)}
                    >
                      {visibleColumnConfigs.map(column => (
                        <TableCell key={column.key} className="px-3 py-2 text-sm" style={{ width: columnWidths[column.key] || 'auto' }}>
                          {column.render ? column.render(quotation) : String(column.accessor(quotation) ?? '—')}
                        </TableCell>
                      ))}
                      <TableCell className="px-3 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => router.push(`/procurement/quotations/${quotation.id}`)}>
                              Detayları Görüntüle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/procurement/rfq/${quotation.rfq_id}/compare`)}>
                              <GitCompare className="w-4 h-4 mr-2" />
                              Karşılaştır
                            </DropdownMenuItem>
                            {quotation.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => handleStatusChange(quotation.id, 'selected')} className="text-green-600 focus:bg-green-50 focus:text-green-700">
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Kabul Et
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(quotation.id, 'rejected')} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reddet
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tablo Ayarları</DialogTitle>
            <DialogDescription>Sütunların görünürlüğünü ve sırasını yönetin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <h4 className="text-sm font-medium">Sütun Sırası ve Görünürlüğü</h4>
            <div className="space-y-2 rounded-md border p-2 max-h-[400px] overflow-y-auto">
              {columnOrder.map(key => {
                const column = columnConfigs.find(c => c.key === key)
                if (!column) return null
                return (
                  <div key={key} className="flex items-center justify-between rounded-md p-2 hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-5 w-5 cursor-grab text-gray-400" />
                      <label htmlFor={`vis-${key}`} className="text-sm font-medium">{column.label}</label>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => moveColumn(key, 'up')}><ArrowUp className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => moveColumn(key, 'down')}><ArrowDown className="h-4 w-4" /></Button>
                      </div>
                      <input type="checkbox" id={`vis-${key}`} checked={visibleColumns.has(key)} onChange={() => toggleColumnVisibility(key)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex justify-between items-center mt-6">
            <Button variant="outline" onClick={resetTableSettings}>Ayarları Sıfırla</Button>
            <Button onClick={() => setSettingsDialogOpen(false)}>
              Kapat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
