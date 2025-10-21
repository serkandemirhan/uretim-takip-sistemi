'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  AlertTriangle,
  Package,
  ArrowUpDown,
  ShoppingCart,
  Settings,
  SlidersHorizontal,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import { stocksAPI, stockMovementsAPI, jobsAPI } from '@/lib/api/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { handleError } from '@/lib/utils/error-handler'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

type Stock = {
  id: string
  product_code: string
  product_name: string
  category?: string | null
  unit: string
  current_quantity: number
  min_quantity: number
  unit_price?: number | null
  currency: string
  supplier_name?: string | null
  description?: string | null
  is_critical: boolean
}

type StockFormValues = {
  product_code: string
  product_name: string
  category: string
  unit: string
  current_quantity: string
  min_quantity: string
  unit_price: string
  currency: string
  supplier_name: string
  description: string
}

const EMPTY_FORM: StockFormValues = {
  product_code: '',
  product_name: '',
  category: '',
  unit: 'adet',
  current_quantity: '0',
  min_quantity: '0',
  unit_price: '',
  currency: 'TRY',
  supplier_name: '',
  description: '',
}

const STORAGE_KEY = 'stocks-inventory-table-settings-v1'

type ColumnId =
  | 'product_code'
  | 'product_name'
  | 'category'
  | 'current_quantity'
  | 'min_quantity'
  | 'unit_price'
  | 'supplier_name'
  | 'actions'

type ColumnDefinition = {
  label: string
  align: 'left' | 'right'
  hideable?: boolean
  defaultWidth: number
  minWidth?: number
}

const COLUMN_DEFINITIONS: Record<ColumnId, ColumnDefinition> = {
  product_code: {
    label: 'Ürün Kodu',
    align: 'left',
    hideable: true,
    defaultWidth: 160,
    minWidth: 120,
  },
  product_name: {
    label: 'Ürün Adı',
    align: 'left',
    hideable: false,
    defaultWidth: 220,
    minWidth: 180,
  },
  category: {
    label: 'Kategori',
    align: 'left',
    hideable: true,
    defaultWidth: 160,
    minWidth: 140,
  },
  current_quantity: {
    label: 'Mevcut',
    align: 'right',
    hideable: false,
    defaultWidth: 160,
    minWidth: 140,
  },
  min_quantity: {
    label: 'Min',
    align: 'right',
    hideable: true,
    defaultWidth: 120,
    minWidth: 100,
  },
  unit_price: {
    label: 'Birim Fiyat',
    align: 'right',
    hideable: true,
    defaultWidth: 160,
    minWidth: 140,
  },
  supplier_name: {
    label: 'Tedarikçi',
    align: 'left',
    hideable: true,
    defaultWidth: 180,
    minWidth: 140,
  },
  actions: {
    label: 'İşlemler',
    align: 'right',
    hideable: true,
    defaultWidth: 160,
    minWidth: 140,
  },
}

const COLUMN_IDS = Object.keys(COLUMN_DEFINITIONS) as ColumnId[]

const DEFAULT_COLUMN_ORDER: ColumnId[] = [...COLUMN_IDS]

const NON_HIDEABLE_COLUMNS = COLUMN_IDS.filter(
  (columnId) => COLUMN_DEFINITIONS[columnId].hideable === false
)

const DEFAULT_COLUMN_VISIBILITY: Record<ColumnId, boolean> = COLUMN_IDS.reduce(
  (acc, columnId) => {
    acc[columnId] = true
    return acc
  },
  {} as Record<ColumnId, boolean>
)

NON_HIDEABLE_COLUMNS.forEach((columnId) => {
  DEFAULT_COLUMN_VISIBILITY[columnId] = true
})

export default function StocksInventoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([])
  const [q, setQ] = useState('')
  const [showCriticalOnly, setShowCriticalOnly] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [saving, setSaving] = useState(false)
  const [activeStockId, setActiveStockId] = useState<string | null>(null)
  const [form, setForm] = useState<StockFormValues>(EMPTY_FORM)

  const [summary, setSummary] = useState<any>(null)
  const [columnOrder, setColumnOrder] = useState<ColumnId[]>([...DEFAULT_COLUMN_ORDER])
  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnId, boolean>>({
    ...DEFAULT_COLUMN_VISIBILITY,
  })
  const [columnWidths, setColumnWidths] = useState<Partial<Record<ColumnId, number>>>({})
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  const [tableSettingsLoaded, setTableSettingsLoaded] = useState(false)
  const [draggingColumn, setDraggingColumn] = useState<ColumnId | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null)

  const visibleColumns = useMemo(
    () => columnOrder.filter((columnId) => columnVisibility[columnId] !== false) as ColumnId[],
    [columnOrder, columnVisibility]
  )

  useEffect(() => {
    void loadStocks()
    void loadSummary()
  }, [])

  useEffect(() => {
    filterStocks()
  }, [stocks, q, showCriticalOnly])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const storedRaw = window.localStorage.getItem(STORAGE_KEY)
      if (!storedRaw) {
        setTableSettingsLoaded(true)
        return
      }

      const parsed = JSON.parse(storedRaw)
      if (parsed && typeof parsed === 'object') {
        const parsedOrder = Array.isArray(parsed.order)
          ? (parsed.order.filter((value: unknown): value is ColumnId =>
              COLUMN_IDS.includes(value as ColumnId)
            ) as ColumnId[])
          : []
        const parsedVisibility =
          parsed.visibility && typeof parsed.visibility === 'object'
            ? parsed.visibility
            : {}
        const parsedWidths =
          parsed.widths && typeof parsed.widths === 'object' ? parsed.widths : {}

        setColumnOrder(sanitizeOrder(parsedOrder))
        setColumnVisibility(sanitizeVisibility(parsedVisibility))
        setColumnWidths(sanitizeWidths(parsedWidths))
      }
    } catch (error) {
      console.error('Kolon ayarları yüklenemedi:', error)
    } finally {
      setTableSettingsLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!tableSettingsLoaded || typeof window === 'undefined') {
      return
    }

    const payload = {
      order: columnOrder,
      visibility: columnVisibility,
      widths: columnWidths,
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      console.error('Kolon ayarları kaydedilemedi:', error)
    }
  }, [columnOrder, columnVisibility, columnWidths, tableSettingsLoaded])

  async function loadStocks() {
    setLoading(true)
    try {
      const res = await stocksAPI.getAll()
      const raw = Array.isArray(res?.data) ? res.data : []
      setStocks(raw)
    } catch (err) {
      handleError(err, { title: 'Stoklar yüklenemedi' })
    } finally {
      setLoading(false)
    }
  }

  async function loadSummary() {
    try {
      const res = await stocksAPI.getSummary()
      setSummary(res?.data || null)
    } catch (err) {
      console.error('Summary error:', err)
    }
  }

  function sanitizeOrder(order: ColumnId[]): ColumnId[] {
    const unique: ColumnId[] = []
    order.forEach((columnId) => {
      if (!unique.includes(columnId) && COLUMN_IDS.includes(columnId)) {
        unique.push(columnId)
      }
    })

    COLUMN_IDS.forEach((columnId) => {
      if (!unique.includes(columnId)) {
        unique.push(columnId)
      }
    })

    return unique
  }

  function sanitizeVisibility(rawVisibility: Record<string, unknown>): Record<ColumnId, boolean> {
    const next: Record<ColumnId, boolean> = { ...DEFAULT_COLUMN_VISIBILITY }

    COLUMN_IDS.forEach((columnId) => {
      const value = rawVisibility[columnId]
      if (typeof value === 'boolean') {
        next[columnId] = value
      }
    })

    NON_HIDEABLE_COLUMNS.forEach((columnId) => {
      next[columnId] = true
    })

    return next
  }

  function sanitizeWidths(rawWidths: Record<string, unknown>): Partial<Record<ColumnId, number>> {
    const next: Partial<Record<ColumnId, number>> = {}

    COLUMN_IDS.forEach((columnId) => {
      const value = rawWidths[columnId]
      if (typeof value === 'number' && !Number.isNaN(value)) {
        const minWidth = COLUMN_DEFINITIONS[columnId].minWidth ?? 120
        next[columnId] = Math.max(minWidth, Math.round(value))
      }
    })

    return next
  }

  function handleVisibilityToggle(columnId: ColumnId, checked: boolean) {
    if (!checked && NON_HIDEABLE_COLUMNS.includes(columnId)) {
      return
    }

    setColumnVisibility((prev) => {
      const next = { ...prev, [columnId]: checked }
      NON_HIDEABLE_COLUMNS.forEach((mandatory) => {
        next[mandatory] = true
      })
      return next
    })
  }

  function moveColumn(columnId: ColumnId, direction: 'up' | 'down') {
    setColumnOrder((prev) => {
      const currentIndex = prev.indexOf(columnId)
      if (currentIndex === -1) {
        return prev
      }

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (newIndex < 0 || newIndex >= prev.length) {
        return prev
      }

      const next = [...prev]
      next.splice(currentIndex, 1)
      next.splice(newIndex, 0, columnId)
      return next
    })
  }

  function handleDragStart(event: React.DragEvent<HTMLButtonElement>, columnId: ColumnId) {
    setDraggingColumn(columnId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', columnId)
  }

  function handleDragOver(event: React.DragEvent<HTMLTableCellElement>, columnId: ColumnId) {
    event.preventDefault()
    if (!draggingColumn || draggingColumn === columnId) {
      return
    }

    setDragOverColumn(columnId)
    event.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(columnId: ColumnId) {
    const sourceId = draggingColumn
    if (!sourceId || sourceId === columnId) {
      setDragOverColumn(null)
      setDraggingColumn(null)
      return
    }

    setColumnOrder((prev) => {
      const sourceIndex = prev.indexOf(sourceId)
      const targetIndex = prev.indexOf(columnId)
      if (sourceIndex === -1 || targetIndex === -1) {
        return prev
      }

      const next = [...prev]
      next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, sourceId)
      return next
    })

    setDragOverColumn(null)
    setDraggingColumn(null)
  }

  function handleDragEnd() {
    setDragOverColumn(null)
    setDraggingColumn(null)
  }

  function handleResizeMouseDown(event: React.MouseEvent<HTMLSpanElement>, columnId: ColumnId) {
    event.preventDefault()
    event.stopPropagation()

    const startX = event.clientX
    const startWidth = columnWidths[columnId] ?? COLUMN_DEFINITIONS[columnId].defaultWidth
    const minWidth = COLUMN_DEFINITIONS[columnId].minWidth ?? 120

    function onMouseMove(moveEvent: MouseEvent) {
      const delta = moveEvent.clientX - startX
      setColumnWidths((prev) => {
        const next = { ...prev }
        next[columnId] = Math.max(minWidth, Math.round(startWidth + delta))
        return next
      })
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function resetColumnSettings() {
    setColumnOrder([...DEFAULT_COLUMN_ORDER])
    setColumnVisibility({ ...DEFAULT_COLUMN_VISIBILITY })
    setColumnWidths({})
  }

  function renderCell(stock: Stock, columnId: ColumnId) {
    switch (columnId) {
      case 'product_code':
        return <span className="font-mono text-sm">{stock.product_code}</span>
      case 'product_name':
        return <span className="font-medium">{stock.product_name}</span>
      case 'category':
        return <span className="text-sm">{stock.category || '-'}</span>
      case 'current_quantity':
        return (
          <span className={stock.is_critical ? 'text-orange-600 font-bold' : ''}>
            {stock.current_quantity} {stock.unit}
          </span>
        )
      case 'min_quantity':
        return <span className="text-sm text-muted-foreground">{stock.min_quantity}</span>
      case 'unit_price':
        return stock.unit_price
          ? `${stock.unit_price.toLocaleString('tr-TR')} ${stock.currency}`
          : '-'
      case 'supplier_name':
        return <span className="text-sm">{stock.supplier_name || '-'}</span>
      case 'actions':
        return (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                void openEditDialog(stock)
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                void handleDelete(stock.id)
              }}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        )
      default:
        return null
    }
  }

  function filterStocks() {
    let result = [...stocks]

    if (showCriticalOnly) {
      result = result.filter(s => s.is_critical)
    }

    if (q.trim()) {
      const lowerQ = q.toLowerCase()
      result = result.filter(s =>
        s.product_name.toLowerCase().includes(lowerQ) ||
        s.product_code.toLowerCase().includes(lowerQ) ||
        s.category?.toLowerCase().includes(lowerQ)
      )
    }

    setFilteredStocks(result)
  }

  function openCreateDialog() {
    setDialogMode('create')
    setForm(EMPTY_FORM)
    setActiveStockId(null)
    setDialogOpen(true)
  }

  async function openEditDialog(stock: Stock) {
    setDialogMode('edit')
    setActiveStockId(stock.id)
    setForm({
      product_code: stock.product_code,
      product_name: stock.product_name,
      category: stock.category || '',
      unit: stock.unit || 'adet',
      current_quantity: stock.current_quantity.toString(),
      min_quantity: stock.min_quantity.toString(),
      unit_price: stock.unit_price?.toString() || '',
      currency: stock.currency || 'TRY',
      supplier_name: stock.supplier_name || '',
      description: stock.description || '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.product_code || !form.product_name) {
      toast.error('Ürün kodu ve adı zorunludur')
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        product_code: form.product_code,
        product_name: form.product_name,
        category: form.category || null,
        unit: form.unit || 'adet',
        min_quantity: parseFloat(form.min_quantity) || 0,
        unit_price: form.unit_price ? parseFloat(form.unit_price) : null,
        currency: form.currency || 'TRY',
        supplier_name: form.supplier_name || null,
        description: form.description || null,
      }

      if (dialogMode === 'create') {
        payload.current_quantity = parseFloat(form.current_quantity) || 0
        await stocksAPI.create(payload)
        toast.success('Stok kartı oluşturuldu')
      } else if (activeStockId) {
        await stocksAPI.update(activeStockId, payload)
        toast.success('Stok kartı güncellendi')
      }

      setDialogOpen(false)
      await loadStocks()
      await loadSummary()
    } catch (err) {
      handleError(err, { title: 'Kaydetme hatası' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu stok kartını silmek istediğinize emin misiniz?')) return

    try {
      await stocksAPI.delete(id)
      toast.success('Stok kartı silindi')
      await loadStocks()
      await loadSummary()
    } catch (err) {
      handleError(err, { title: 'Silme hatası' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stok Yönetimi</h1>
          <p className="text-muted-foreground">Tüm stok kartları ve mevcut durumlar</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Yeni Stok Kartı
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Stok Değeri (TRY)</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.total_value?.TRY?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Toplam Stok Kalemi</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_stock_items}</div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-900">Kritik Seviye</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{summary.critical_stock_count}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Döviz Kurları</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                <div>USD: {summary.currency_rates?.USD_to_TRY?.toFixed(2)} ₺</div>
                <div>EUR: {summary.currency_rates?.EUR_to_TRY?.toFixed(2)} ₺</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/stocks/movements">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <ArrowUpDown className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Stok Hareketleri</h3>
                  <p className="text-sm text-muted-foreground">Giriş ve çıkış hareketlerini görüntüle</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/stocks/purchase-orders">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <ShoppingCart className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Satın Alma Emirleri</h3>
                  <p className="text-sm text-muted-foreground">Sipariş takibi ve teslim alma</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/stocks/settings">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Settings className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Döviz Kuru Ayarları</h3>
                  <p className="text-sm text-muted-foreground">USD ve EUR kurlarını güncelle</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <Input
              placeholder="Ara (ürün adı, kodu, kategori)..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-md"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showCriticalOnly}
                onChange={(e) => setShowCriticalOnly(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Sadece Kritik Stoklar</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Stock List */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end mb-4">
            <Button variant="outline" size="sm" onClick={() => setColumnSettingsOpen(true)}>
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Kolon Ayarları
            </Button>
          </div>
          {filteredStocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Stok bulunamadı
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <colgroup>
                  {visibleColumns.map((columnId) => {
                    const width = columnWidths[columnId] ?? COLUMN_DEFINITIONS[columnId].defaultWidth
                    return <col key={`col-${columnId}`} style={{ width: `${width}px` }} />
                  })}
                </colgroup>
                <thead>
                  <tr className="border-b">
                    {visibleColumns.map((columnId) => {
                      const definition = COLUMN_DEFINITIONS[columnId]
                      const width = columnWidths[columnId] ?? definition.defaultWidth
                      const minWidth = definition.minWidth ?? 120
                      const alignClass = definition.align === 'right' ? 'text-right' : 'text-left'
                      const isDragTarget = dragOverColumn === columnId

                      return (
                        <th
                          key={columnId}
                          className={`relative p-2 text-sm font-semibold ${alignClass} ${isDragTarget ? 'bg-blue-50' : ''}`}
                          style={{ width: `${width}px`, minWidth: `${minWidth}px` }}
                          onDragOver={(event) => handleDragOver(event, columnId)}
                          onDrop={() => handleDrop(columnId)}
                          onDragLeave={() => setDragOverColumn(null)}
                        >
                          <div className={`flex items-center gap-2 ${definition.align === 'right' ? 'justify-end' : ''}`}>
                            <button
                              type="button"
                              className="flex h-6 w-6 items-center justify-center rounded border border-transparent bg-transparent p-0 text-muted-foreground transition-colors hover:text-foreground focus:border-blue-500 focus:outline-none"
                              draggable
                              onDragStart={(event) => handleDragStart(event, columnId)}
                              onDragEnd={handleDragEnd}
                              aria-label={`${definition.label} sütununu taşı`}
                            >
                              <GripVertical className="h-4 w-4" />
                            </button>
                            <span className="whitespace-nowrap text-sm font-semibold">{definition.label}</span>
                          </div>
                          <span
                            className="absolute right-0 top-1/2 h-6 w-1.5 -translate-y-1/2 cursor-col-resize rounded bg-transparent hover:bg-blue-300"
                            onMouseDown={(event) => handleResizeMouseDown(event, columnId)}
                            aria-hidden="true"
                          />
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {filteredStocks.map((stock) => (
                    <tr
                      key={stock.id}
                      className={`border-b hover:bg-muted/50 cursor-pointer transition-colors ${stock.is_critical ? 'bg-orange-50' : ''}`}
                      onClick={() => router.push(`/stocks/movements?stock_id=${stock.id}`)}
                      title="Stok hareketlerini görüntülemek için tıklayın"
                    >
                      {visibleColumns.map((columnId) => {
                        const definition = COLUMN_DEFINITIONS[columnId]
                        const width = columnWidths[columnId] ?? definition.defaultWidth
                        const minWidth = definition.minWidth ?? 120
                        const alignClass = definition.align === 'right' ? 'text-right' : 'text-left'

                        return (
                          <td
                            key={`${stock.id}-${columnId}`}
                            className={`p-2 align-top ${alignClass}`}
                            style={{ width: `${width}px`, minWidth: `${minWidth}px` }}
                            onClick={columnId === 'actions' ? (event) => event.stopPropagation() : undefined}
                          >
                            {renderCell(stock, columnId)}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={columnSettingsOpen} onOpenChange={setColumnSettingsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Tablo Kolon Ayarları</DialogTitle>
            <DialogDescription>
              Kolonların sırasını ve görünürlüğünü buradan yönetebilirsiniz. Genişliği değiştirmek için tablo
              başlıklarının sağ kenarını tutup sürükleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {columnOrder.map((columnId) => {
              const definition = COLUMN_DEFINITIONS[columnId]
              const isVisible = columnVisibility[columnId] !== false
              const isMandatory = definition.hideable === false
              const currentIndex = columnOrder.indexOf(columnId)

              return (
                <div
                  key={`column-setting-${columnId}`}
                  className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center rounded-md bg-gray-100 p-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{definition.label}</span>
                        {isMandatory && <span className="text-xs text-muted-foreground">(zorunlu)</span>}
                      </div>
                      <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={isVisible}
                          onChange={(event) => handleVisibilityToggle(columnId, event.target.checked)}
                          disabled={isMandatory}
                        />
                        <span>{isVisible ? 'Görünür' : 'Gizli'}</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveColumn(columnId, 'up')}
                      disabled={currentIndex === 0}
                      aria-label={`${definition.label} kolonunu yukarı taşı`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveColumn(columnId, 'down')}
                      disabled={currentIndex === columnOrder.length - 1}
                      aria-label={`${definition.label} kolonunu aşağı taşı`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={resetColumnSettings}>
              Varsayılanlara Sıfırla
            </Button>
            <Button onClick={() => setColumnSettingsOpen(false)}>Tamam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Yeni Stok Kartı' : 'Stok Kartını Düzenle'}
            </DialogTitle>
            <DialogDescription>
              Stok kartı bilgilerini girin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Ürün Kodu *</label>
                <Input
                  value={form.product_code}
                  onChange={(e) => setForm({ ...form, product_code: e.target.value })}
                  disabled={dialogMode === 'edit'}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Kategori</label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Ürün Adı *</label>
              <Input
                value={form.product_name}
                onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {dialogMode === 'create' && (
                <div>
                  <label className="text-sm font-medium">Başlangıç Miktarı</label>
                  <Input
                    type="number"
                    value={form.current_quantity}
                    onChange={(e) => setForm({ ...form, current_quantity: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Min. Stok</label>
                <Input
                  type="number"
                  value={form.min_quantity}
                  onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Birim</label>
                <Input
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Birim Fiyat</label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
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
              <label className="text-sm font-medium">Tedarikçi</label>
              <Input
                value={form.supplier_name}
                onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Açıklama</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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
    </div>
  )
}