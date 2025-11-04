'use client'

import { useEffect, useState, useMemo, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Plus,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCcw,
  X,
  Settings,
  GripVertical,
} from 'lucide-react'
import { purchaseOrdersAPI, stocksAPI } from '@/lib/api/client'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { handleError } from '@/lib/utils/error-handler'
import { cn } from '@/lib/utils/cn'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type PurchaseOrder = {
  id: string
  stock_id: string
  product_code: string
  product_name: string
  unit: string
  order_code: string
  quantity: number
  unit_price: number
  currency: string
  total_value: number
  supplier_name: string
  order_date: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  status: string
  notes?: string
  created_by_name?: string
}

type Stock = {
  id: string
  product_code: string
  product_name: string
  unit: string
}

type ColumnConfig = {
  key: string
  label: string
  width?: string
  type?: 'string' | 'number' | 'date'
  filterType?: 'text' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
  accessor: (order: PurchaseOrder) => string | number | null | undefined
  render?: (order: PurchaseOrder) => ReactNode
}

const STATUS_LABELS: Record<string, { label: string; className: string; icon: ReactNode }> = {
  PENDING: { label: 'Bekliyor', className: 'bg-orange-100 text-orange-700', icon: <Clock className="w-3 h-3" /> },
  DELIVERED: { label: 'Teslim Edildi', className: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  CANCELLED: { label: 'İptal', className: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
}

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([key, { label }]) => ({ value: key, label }))

const STORAGE_KEY_PREFIX = 'purchase_orders_table_settings_'

export default function PurchaseOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [deliverDialogOpen, setDeliverDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const [form, setForm] = useState({
    stock_id: '',
    order_code: '',
    quantity: '',
    unit_price: '',
    currency: 'TRY',
    supplier_name: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    notes: '',
  })

  const [deliverForm, setDeliverForm] = useState({
    document_no: '',
    notes: '',
  })

  // Table state
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({})
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())
  const [columnOrder, setColumnOrder] = useState<string[]>([])

  const columnConfigs = useMemo<ColumnConfig[]>(() => [
    { key: 'order_code', label: 'Sipariş Kodu', width: 'w-40', placeholder: 'Kod ara', accessor: o => o.order_code },
    { key: 'product_name', label: 'Ürün', width: 'w-64', placeholder: 'Ürün adı ara', accessor: o => o.product_name },
    { key: 'product_code', label: 'Ürün Kodu', width: 'w-40', placeholder: 'Kod ara', accessor: o => o.product_code },
    { key: 'quantity', label: 'Miktar', width: 'w-32', type: 'number', accessor: o => o.quantity, render: o => `${o.quantity} ${o.unit}` },
    { key: 'unit_price', label: 'Birim Fiyat', width: 'w-36', type: 'number', accessor: o => o.unit_price, render: o => `${o.unit_price.toLocaleString('tr-TR')} ${o.currency}` },
    { key: 'total_value', label: 'Toplam', width: 'w-40', type: 'number', accessor: o => o.total_value, render: o => `${o.total_value.toLocaleString('tr-TR')} ${o.currency}` },
    { key: 'supplier_name', label: 'Tedarikçi', width: 'w-48', placeholder: 'Tedarikçi ara', accessor: o => o.supplier_name },
    { key: 'order_date', label: 'Sipariş Tarihi', width: 'w-40', type: 'date', accessor: o => o.order_date, render: o => new Date(o.order_date).toLocaleDateString('tr-TR') },
    { key: 'expected_delivery_date', label: 'Teslim Tarihi', width: 'w-40', type: 'date', accessor: o => o.expected_delivery_date, render: o => o.expected_delivery_date ? new Date(o.expected_delivery_date).toLocaleDateString('tr-TR') : '—' },
    { key: 'status', label: 'Durum', width: 'w-40', filterType: 'select', options: STATUS_OPTIONS, accessor: o => o.status, render: o => {
        const statusInfo = STATUS_LABELS[o.status] || { label: o.status, className: 'bg-gray-100 text-gray-700', icon: <Clock className="w-3 h-3" /> }
        return <Badge className={cn(statusInfo.className, 'inline-flex items-center gap-1.5')}>{statusInfo.icon} {statusInfo.label}</Badge>
      }},
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

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      return columnConfigs.every(column => {
        const filterValue = filters[column.key]
        if (!filterValue) return true

        const rawValue = column.accessor(order)
        if (rawValue == null) return false

        const normalizedFilter = filterValue.trim().toLowerCase()
        if (column.filterType === 'select') return String(rawValue).toLowerCase() === normalizedFilter
        if (column.type === 'date') return new Date(rawValue as string).toLocaleDateString('tr-TR').includes(normalizedFilter)
        return String(rawValue).toLowerCase().includes(normalizedFilter)
      })
    })
  }, [orders, filters, columnConfigs])

  const sortedOrders = useMemo(() => {
    if (!sortConfig) return filteredOrders

    const column = columnConfigs.find(col => col.key === sortConfig.key)
    if (!column) return filteredOrders

    const getComparable = (order: PurchaseOrder) => {
      const value = column.accessor(order)
      if (value == null) return null
      if (column.type === 'number') return Number(value)
      if (column.type === 'date') return value ? new Date(value as string).getTime() : null
      return String(value).toLowerCase()
    }

    return [...filteredOrders].sort((a, b) => {
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
  }, [filteredOrders, sortConfig, columnConfigs])

  const visibleColumnConfigs = useMemo(() => {
    const orderIndex: Record<string, number> = {}
    columnOrder.forEach((k, i) => { orderIndex[k] = i })
    return columnConfigs
      .filter(col => visibleColumns.has(col.key))
      .sort((a, b) => (orderIndex[a.key] ?? 99) - (orderIndex[b.key] ?? 99))
  }, [columnConfigs, visibleColumns, columnOrder])

  useEffect(() => {
    void loadOrders()
    void loadStocks()
  }, [])

  async function loadOrders() {
    setLoading(true)
    try {
      const res = await purchaseOrdersAPI.getAll()
      const raw = Array.isArray(res?.data) ? res.data : []
      setOrders(raw)
    } catch (err) {
      handleError(err, { title: 'Satın alma emirleri yüklenemedi' })
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

  function openDialog() {
    setForm({
      stock_id: '',
      order_code: '',
      quantity: '',
      unit_price: '',
      currency: 'TRY',
      supplier_name: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      notes: '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.stock_id || !form.order_code || !form.quantity || !form.unit_price || !form.supplier_name) {
      toast.error('Tüm zorunlu alanları doldurun')
      return
    }

    setSaving(true)
    try {
      const payload = {
        stock_id: form.stock_id,
        order_code: form.order_code,
        quantity: parseFloat(form.quantity),
        unit_price: parseFloat(form.unit_price),
        currency: form.currency,
        supplier_name: form.supplier_name,
        order_date: form.order_date,
        expected_delivery_date: form.expected_delivery_date || null,
        notes: form.notes || null,
      }

      await purchaseOrdersAPI.create(payload)
      toast.success('Satın alma emri oluşturuldu')
      setDialogOpen(false)
      await loadOrders()
    } catch (err) {
      handleError(err, { title: 'Kaydetme hatası' })
    } finally {
      setSaving(false)
    }
  }

  function openDeliverDialog(orderId: string) {
    setSelectedOrderId(orderId)
    setDeliverForm({ document_no: '', notes: '' })
    setDeliverDialogOpen(true)
  }

  async function handleDeliver() {
    if (!selectedOrderId) return

    setSaving(true)
    try {
      await purchaseOrdersAPI.deliver(selectedOrderId, deliverForm)
      toast.success('Sipariş teslim alındı ve stok güncellendi')
      setDeliverDialogOpen(false)
      await loadOrders()
    } catch (err) {
      handleError(err, { title: 'Teslim alma hatası' })
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel(orderId: string) {
    if (!confirm('Bu siparişi iptal etmek istediğinize emin misiniz?')) return

    try {
      await purchaseOrdersAPI.cancel(orderId)
      toast.success('Sipariş iptal edildi')
      await loadOrders()
    } catch (err) {
      handleError(err, { title: 'İptal hatası' })
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const selectedStock = stocks.find(s => s.id === form.stock_id)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Satın Alma Emirleri</h1>
          <p className="text-muted-foreground">Sipariş takibi ve teslim alma</p>
        </div>
        <div className="flex gap-2">
          <Link href="/stocks/inventory">
            <Button variant="outline">
              <Package className="w-4 h-4 mr-2" />
              Stok Listesi
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setSettingsDialogOpen(true)} className="gap-2">
            <Settings className="h-4 w-4" />
            Tablo Ayarları
          </Button>
          <Button variant="outline" size="sm" onClick={resetFilters} className="gap-2">
            <X className="h-4 w-4" />
            Filtreleri Sıfırla
          </Button>
          <Button variant="outline" size="sm" onClick={loadOrders} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
          <Button onClick={openDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Sipariş
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen Siparişler</p>
                <p className="text-2xl font-bold">{orders.filter(o => o.status === 'PENDING').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Teslim Edilen</p>
                <p className="text-2xl font-bold">{orders.filter(o => o.status === 'DELIVERED').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Toplam Sipariş</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Orders List */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor…
            </div>
          ) : sortedOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Filtrelerle eşleşen sipariş kaydı bulunamadı.
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
                  {sortedOrders.map(order => (
                    <TableRow key={order.id} className="border-b hover:bg-muted/50">
                      {visibleColumnConfigs.map(column => (
                        <TableCell key={column.key} className="px-3 py-2 text-sm" style={{ width: columnWidths[column.key] || 'auto' }}>
                          {column.render ? column.render(order) : String(column.accessor(order) ?? '—')}
                        </TableCell>
                      ))}
                      <TableCell className="px-3 py-2">
                        <div className="flex justify-end gap-2">
                          {order.status === 'PENDING' && (
                            <>
                              <Button size="sm" variant="default" onClick={() => openDeliverDialog(order.id)}>Teslim Al</Button>
                              <Button size="sm" variant="outline" onClick={() => handleCancel(order.id)}>İptal</Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Satın Alma Emri</DialogTitle>
            <DialogDescription>
              Yeni sipariş kaydı oluştur
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Sipariş Kodu *</label>
                <Input
                  value={form.order_code}
                  onChange={(e) => setForm({ ...form, order_code: e.target.value })}
                  placeholder="Örn: PO-2024-001"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Stok *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.stock_id}
                  onChange={(e) => setForm({ ...form, stock_id: e.target.value })}
                >
                  <option value="">Seçiniz...</option>
                  {stocks.map((stock) => (
                    <option key={stock.id} value={stock.id}>
                      {stock.product_code} - {stock.product_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Tedarikçi *</label>
              <Input
                value={form.supplier_name}
                onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                placeholder="Tedarikçi adı"
              />
            </div>

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
                <label className="text-sm font-medium">Birim Fiyat *</label>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Sipariş Tarihi</label>
                <Input
                  type="date"
                  value={form.order_date}
                  onChange={(e) => setForm({ ...form, order_date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Beklenen Teslim Tarihi</label>
                <Input
                  type="date"
                  value={form.expected_delivery_date}
                  onChange={(e) => setForm({ ...form, expected_delivery_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Notlar</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
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

      {/* Deliver Dialog */}
      <Dialog open={deliverDialogOpen} onOpenChange={setDeliverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Siparişi Teslim Al</DialogTitle>
            <DialogDescription>
              Sipariş teslim alındı olarak işaretlenecek ve stok otomatik güncellenecek
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Belge No (İrsaliye/Fatura)</label>
              <Input
                value={deliverForm.document_no}
                onChange={(e) => setDeliverForm({ ...deliverForm, document_no: e.target.value })}
                placeholder="Örn: IRS-2024-001"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Notlar</label>
              <Textarea
                value={deliverForm.notes}
                onChange={(e) => setDeliverForm({ ...deliverForm, notes: e.target.value })}
                rows={3}
                placeholder="Teslim alma ile ilgili notlar..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setDeliverDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleDeliver} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Teslim Al ve Stoku Güncelle
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}