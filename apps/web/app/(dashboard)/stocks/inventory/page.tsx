'use client'

import { useEffect, useMemo, useRef, useState, type ChangeEvent, Fragment } from 'react'
import { toast } from 'sonner'
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  AlertTriangle,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShoppingCart,
  Settings,
  SlidersHorizontal,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  FileDown,
  X,
} from 'lucide-react'
import { stocksAPI } from '@/lib/api/client'
import { useStockFieldSettings } from '@/lib/hooks/useStockFieldSettings'
import { cn } from '@/lib/utils/cn'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Stock = {
  id: string
  product_code: string
  product_name: string
  category?: string | null
  unit: string
  current_quantity: number
  reserved_quantity: number
  available_quantity: number
  min_quantity: number
  unit_price?: number | null
  currency: string
  supplier_name?: string | null
  description?: string | null
  is_critical: boolean
  // Custom fields
  group1?: string | null
  group2?: string | null
  group3?: string | null
  group4?: string | null
  group5?: string | null
  group6?: string | null
  group7?: string | null
  group8?: string | null
  group9?: string | null
  group10?: string | null
  category1?: string | null
  category2?: string | null
  category3?: string | null
  category4?: string | null
  category5?: string | null
  category6?: string | null
  category7?: string | null
  category8?: string | null
  category9?: string | null
  category10?: string | null
  string1?: string | null
  string2?: string | null
  string3?: string | null
  string4?: string | null
  string5?: string | null
  string6?: string | null
  string7?: string | null
  string8?: string | null
  string9?: string | null
  string10?: string | null
  properties1?: string | null
  properties2?: string | null
  properties3?: string | null
  properties4?: string | null
  properties5?: string | null
  properties6?: string | null
  properties7?: string | null
  properties8?: string | null
  properties9?: string | null
  properties10?: string | null
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
  group1?: string
  group2?: string
  group3?: string
  group4?: string
  group5?: string
  category1?: string
  category2?: string
  category3?: string
  string1?: string
  string2?: string
  properties1?: string
  properties2?: string
  // Note: Adding all 10 fields makes form too large,
  // will add as needed in UI
}

const BASE_STOCK_TEMPLATE_COLUMNS: Array<{
  key: string
  label: string
  required?: boolean
  sample?: string
}> = [
  { key: 'product_code', label: 'Ürün Kodu', required: true, sample: 'STK-001' },
  { key: 'product_name', label: 'Ürün Adı', required: true, sample: 'Çelik Vida' },
  { key: 'category', label: 'Kategori', sample: 'Bağlantı Elemanları' },
  { key: 'unit', label: 'Birim', required: true, sample: 'adet' },
  { key: 'current_quantity', label: 'Mevcut Stok', sample: '0' },
  { key: 'min_quantity', label: 'Asgari Stok', sample: '10' },
  { key: 'unit_price', label: 'Birim Fiyat', sample: '12.5' },
  { key: 'currency', label: 'Para Birimi', sample: 'TRY' },
  { key: 'supplier_name', label: 'Tedarikçi', sample: 'Örnek Tedarik' },
  { key: 'description', label: 'Açıklama', sample: 'Paslanmaz çelik vida' },
  { key: 'is_critical', label: 'Kritik Stok (E/H)', sample: 'H' },
]

const CSV_TRUE_VALUES = new Set(['1', 'true', 'evet', 'e', 'yes', 'ok', 'aktif', 'var'])
const CSV_FALSE_VALUES = new Set(['0', 'false', 'hayır', 'hayir', 'h', 'no', 'pasif', 'yok'])

function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[";,\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function parseBooleanFromCsv(value: string | undefined | null): boolean | undefined {
  if (value === undefined || value === null) return undefined
  const normalized = value.trim().toLowerCase()
  if (!normalized) return undefined
  if (CSV_TRUE_VALUES.has(normalized)) return true
  if (CSV_FALSE_VALUES.has(normalized)) return false
  return undefined
}

function parseNumberFromCsv(value: string | undefined | null): number | undefined {
  if (value === undefined || value === null) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  let normalized = trimmed.replace(/\s/g, '')
  const hasComma = normalized.includes(',')
  const hasDot = normalized.includes('.')
  if (hasComma && hasDot) {
    normalized = normalized.replace(/\./g, '').replace(',', '.')
  } else if (hasComma) {
    normalized = normalized.replace(',', '.')
  }
  const parsed = Number(normalized)
  if (Number.isNaN(parsed)) return undefined
  return parsed
}

function detectDelimiter(line: string): string {
  if (line.includes(';') && line.includes(',')) {
    return line.indexOf(';') < line.indexOf(',') ? ';' : ','
  }
  if (line.includes(';')) return ';'
  return ','
}

function parseCsv(content: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let insideQuotes = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]

    if (char === '"') {
      if (insideQuotes && content[i + 1] === '"') {
        current += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === '\r') {
      continue
    } else if (char === '\n') {
      if (insideQuotes) {
        current += char
      } else {
        row.push(current)
        rows.push(row)
        row = []
        current = ''
      }
    } else if (char === delimiter && !insideQuotes) {
      row.push(current)
      current = ''
    } else {
      current += char
    }
  }

  row.push(current)
  rows.push(row)

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''))
}

function extractFieldKeyFromHeader(header: string): string | undefined {
  const match = header.match(/\[([^\]]+)\]/)
  return match?.[1]?.trim()
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

type ColumnId = string  // Dinamik kolonlar için string olarak değiştirdik

type ColumnDefinition = {
  label: string
  align: 'left' | 'right'
  hideable?: boolean
  defaultWidth: number
  minWidth?: number
}

const BASE_COLUMN_DEFINITIONS: Record<string, ColumnDefinition> = {
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
    label: 'Fiziksel Stok',
    align: 'right',
    hideable: false,
    defaultWidth: 140,
    minWidth: 120,
  },
  reserved_quantity: {
    label: 'Rezerve',
    align: 'right',
    hideable: true,
    defaultWidth: 120,
    minWidth: 100,
  },
  available_quantity: {
    label: 'Kullanılabilir',
    align: 'right',
    hideable: false,
    defaultWidth: 140,
    minWidth: 120,
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

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export default function StocksInventoryPage() {
  const router = useRouter()

  // Dinamik stok alanları
  const { activeFields, getLabel, isFieldActive, loading: fieldsLoading } = useStockFieldSettings()

  // Dinamik kolon tanımları - aktif alanları ekle
  const COLUMN_DEFINITIONS = useMemo(() => {
    const definitions: Record<string, ColumnDefinition> = { ...BASE_COLUMN_DEFINITIONS }

    // Aktif alanları ekle
    activeFields.forEach((field) => {
      definitions[field.field_key] = {
        label: field.custom_label,
        align: field.field_type === 'group' ? 'left' : 'left',
        hideable: true,
        defaultWidth: 140,
        minWidth: 120,
      }
    })

    return definitions
  }, [activeFields])

  const COLUMN_IDS = useMemo(() => Object.keys(COLUMN_DEFINITIONS), [COLUMN_DEFINITIONS])
  const DEFAULT_COLUMN_ORDER = useMemo(() => [...COLUMN_IDS], [COLUMN_IDS])
  const NON_HIDEABLE_COLUMNS = useMemo(
    () => COLUMN_IDS.filter((columnId) => COLUMN_DEFINITIONS[columnId]?.hideable === false),
    [COLUMN_IDS, COLUMN_DEFINITIONS]
  )
  const DEFAULT_COLUMN_VISIBILITY = useMemo(() => {
    const visibility: Record<string, boolean> = {}
    COLUMN_IDS.forEach((columnId) => {
      visibility[columnId] = true
    })
    NON_HIDEABLE_COLUMNS.forEach((columnId) => {
      visibility[columnId] = true
    })
    return visibility
  }, [COLUMN_IDS, NON_HIDEABLE_COLUMNS])

  const [loading, setLoading] = useState(true)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([])
  const [q, setQ] = useState('')
  const [showCriticalOnly, setShowCriticalOnly] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null)
  const [selectedStockId, setSelectedStockId] = useState<string | null>(null)
  const [hoveredStockId, setHoveredStockId] = useState<string | null>(null)
  const [groupByColumns, setGroupByColumns] = useState<string[]>([])
  const [dragOverGroupArea, setDragOverGroupArea] = useState(false)
  const MAX_GROUP_COLUMNS = 3
  const NON_GROUPABLE_COLUMNS = useMemo<Set<ColumnId>>(
    () => new Set<ColumnId>(['current_quantity', 'available_quantity', 'unit_price']),
    []
  )

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
  const [exportingCsv, setExportingCsv] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [importingCsv, setImportingCsv] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(25)

  const visibleColumns = useMemo(
    () => columnOrder.filter((columnId) => columnVisibility[columnId] !== false) as ColumnId[],
    [columnOrder, columnVisibility]
  )

  const headerDefinitions = useMemo(
    () => [
      ...BASE_STOCK_TEMPLATE_COLUMNS.map((column) => ({
        key: column.key,
        header: `${column.label} [${column.key}]`,
        label: column.label,
      })),
      ...activeFields.map((field) => ({
        key: field.field_key,
        header: `${field.custom_label} [${field.field_key}]`,
        label: field.custom_label,
      })),
    ],
    [activeFields]
  )

  function resolveHeaderKey(header: string): string | undefined {
    if (!header) return undefined
    const trimmed = header.trim()
    if (!trimmed) return undefined

    const bracketKey = extractFieldKeyFromHeader(trimmed)
    if (bracketKey) {
      const normalizedBracket = bracketKey.toLowerCase()
      const baseByKey = BASE_STOCK_TEMPLATE_COLUMNS.find(
        (column) => column.key.toLowerCase() === normalizedBracket
      )
      if (baseByKey) return baseByKey.key
      const dynamicByKey = activeFields.find(
        (field) => field.field_key.toLowerCase() === normalizedBracket
      )
      if (dynamicByKey) return dynamicByKey.field_key
      return bracketKey
    }

    const normalized = trimmed.toLowerCase()
    const baseMatch = BASE_STOCK_TEMPLATE_COLUMNS.find(
      (column) =>
        column.key.toLowerCase() === normalized || column.label.toLowerCase() === normalized
    )
    if (baseMatch) {
      return baseMatch.key
    }

    const dynamicMatch = activeFields.find((field) => {
      const fieldKey = field.field_key.toLowerCase()
      const labelNormalized = field.custom_label.trim().toLowerCase()
      return fieldKey === normalized || labelNormalized === normalized
    })

    return dynamicMatch?.field_key
  }

  const columnPixelWidths = useMemo(() => {
    const widths: Record<string, number> = {}
    visibleColumns.forEach((columnId) => {
      const definition = COLUMN_DEFINITIONS[columnId]
      widths[columnId] = columnWidths[columnId] ?? definition.defaultWidth
    })
    return widths
  }, [visibleColumns, columnWidths, COLUMN_DEFINITIONS])

  const minimumTableWidth = useMemo(() => {
    return visibleColumns.reduce((total, columnId) => {
      const definition = COLUMN_DEFINITIONS[columnId]
      return total + (columnPixelWidths[columnId] ?? definition?.minWidth ?? 120)
    }, 0)
  }, [visibleColumns, COLUMN_DEFINITIONS, columnPixelWidths])

  const sortedStocks = useMemo(() => {
    const sortableItems = [...filteredStocks]
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = (a as any)[sortConfig.key] ?? ''
        const bValue = (b as any)[sortConfig.key] ?? ''

        // Numeric comparison for numeric fields
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue
        }

        // String comparison
        const aStr = String(aValue).toLowerCase()
        const bStr = String(bValue).toLowerCase()

        if (aStr < bStr) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (aStr > bStr) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }
    return sortableItems
  }, [filteredStocks, sortConfig])

  const groupedStocks = useMemo(() => {
    if (groupByColumns.length === 0) {
      return null
    }

    const groups = new Map<string, Stock[]>()

    sortedStocks.forEach((stock) => {
      const groupKey = groupByColumns
        .map((col) => {
          const value = (stock as any)[col]
          return value !== null && value !== undefined ? String(value) : '(boş)'
        })
        .join(' | ')

      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(stock)
    })

    return Array.from(groups.entries()).map(([key, items]) => ({
      groupKey: key,
      items,
    }))
  }, [sortedStocks, groupByColumns])

  const totalPages = useMemo(() => {
    if (pageSize <= 0) return 1
    return Math.max(1, Math.ceil(sortedStocks.length / pageSize))
  }, [sortedStocks.length, pageSize])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const paginatedStocks = useMemo(() => {
    if (pageSize <= 0) return sortedStocks
    const startIndex = (page - 1) * pageSize
    return sortedStocks.slice(startIndex, startIndex + pageSize)
  }, [sortedStocks, page, pageSize])

  const pageRangeStart = sortedStocks.length === 0 ? 0 : (page - 1) * pageSize + 1
  const pageRangeEnd = sortedStocks.length === 0 ? 0 : Math.min(page * pageSize, sortedStocks.length)

  const pageTotals = useMemo(() => {
    return paginatedStocks.reduce(
      (acc, stock) => {
        const physical = Number(stock.current_quantity) || 0
        const reserved = Number(stock.reserved_quantity) || 0
        const available = Number(stock.available_quantity) || 0
        const unitPrice = Number(stock.unit_price) || 0

        acc.current += physical
        acc.reserved += reserved
        acc.available += available
        acc.value += physical * unitPrice
        return acc
      },
      { current: 0, reserved: 0, available: 0, value: 0 }
    )
  }, [paginatedStocks])

  const quantityFormatter = useMemo(
    () => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    []
  )
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }),
    []
  )

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      if (!cancelled) {
        await loadStocks()
        await loadSummary()
      }
    }

    fetchData()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    filterStocks()
  }, [stocks, q, showCriticalOnly])

  useEffect(() => {
    setPage(1)
  }, [q, showCriticalOnly])

  // Aktif alanların string key listesi (array reference yerine primitive karşılaştırma için)
  const activeFieldKeys = useMemo(() => activeFields.map(f => f.field_key).join(','), [activeFields])

  // Aktif alanlar değiştiğinde kolonları güncelle
  useEffect(() => {
    if (fieldsLoading || !tableSettingsLoaded) return

    // Yeni kolonları ekle
    setColumnOrder((prevOrder) => {
      const newOrder = [...prevOrder]

      // Aktif alanları ekle (actions'dan önce)
      activeFields.forEach((field) => {
        if (!newOrder.includes(field.field_key)) {
          const actionsIndex = newOrder.indexOf('actions')
          if (actionsIndex !== -1) {
            newOrder.splice(actionsIndex, 0, field.field_key)
          } else {
            newOrder.push(field.field_key)
          }
        }
      })

      // Artık aktif olmayan alanları kaldır
      const filtered = newOrder.filter((col) => {
        // Base kolonlar her zaman kalır
        if (BASE_COLUMN_DEFINITIONS[col]) return true
        // Aktif alanlarda varsa kalır
        return activeFields.some((f) => f.field_key === col)
      })

      // Eğer değişiklik yoksa aynı reference'i döndür (sonsuz loop önleme)
      if (JSON.stringify(filtered) === JSON.stringify(prevOrder)) {
        return prevOrder
      }

      return filtered
    })

    // Visibility'yi güncelle
    setColumnVisibility((prevVis) => {
      const newVis = { ...prevVis }

      // Aktif alanları görünür yap
      activeFields.forEach((field) => {
        newVis[field.field_key] = true
      })

      // Eğer değişiklik yoksa aynı reference'i döndür
      if (JSON.stringify(newVis) === JSON.stringify(prevVis)) {
        return prevVis
      }

      return newVis
    })
  }, [activeFieldKeys, fieldsLoading, tableSettingsLoaded])

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
        const definition = COLUMN_DEFINITIONS[columnId]
        if (definition) {
          const minWidth = definition.minWidth ?? 120
          next[columnId] = Math.max(minWidth, Math.round(value))
        }
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
    console.log('Drag start for column:', columnId)
    setDraggingColumn(columnId)
    event.dataTransfer.effectAllowed = 'copyMove'
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
    setDragOverGroupArea(false)
  }

  function handleGroupAreaDragOver(event: React.DragEvent<HTMLDivElement>) {
    console.log('Drag over group area detected')
    event.preventDefault()
    event.stopPropagation()
    if (
      draggingColumn &&
      draggingColumn !== 'actions' &&
      !NON_GROUPABLE_COLUMNS.has(draggingColumn) &&
      groupByColumns.length < MAX_GROUP_COLUMNS
    ) {
      console.log('Valid column dragging:', draggingColumn)
      setDragOverGroupArea(true)
      event.dataTransfer.dropEffect = 'copy'
    } else {
      event.dataTransfer.dropEffect = 'none'
    }
  }

  function handleGroupAreaDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (
      draggingColumn &&
      draggingColumn !== 'actions' &&
      !NON_GROUPABLE_COLUMNS.has(draggingColumn) &&
      groupByColumns.length < MAX_GROUP_COLUMNS
    ) {
      setDragOverGroupArea(true)
    }
  }

  function handleGroupAreaDrop(event: React.DragEvent<HTMLDivElement>) {
    console.log('Drop detected! Event:', event)
    event.preventDefault()
    event.stopPropagation()
    setDragOverGroupArea(false)

    const columnId = draggingColumn || event.dataTransfer.getData('text/plain')
    console.log('Drop detected! Column ID:', columnId)

    if (!columnId || columnId === 'actions' || NON_GROUPABLE_COLUMNS.has(columnId)) {
      console.log('Invalid column or actions column')
      return
    }

    setGroupByColumns((prev) => {
      if (prev.includes(columnId)) {
        console.log('Column already in group')
        return prev
      }
      if (prev.length >= MAX_GROUP_COLUMNS) {
        console.log('Maximum group columns reached')
        return prev
      }
      const newGroups = [...prev, columnId]
      console.log('Adding column to group. New groups:', newGroups)
      return newGroups
    })

    // Reset dragging state
    setDraggingColumn(null)
  }

  function handleGroupAreaDragLeave(event: React.DragEvent<HTMLDivElement>) {
    console.log('Drag leave group area')
    // Only set to false if we're actually leaving the container
    if (event.currentTarget === event.target || !event.currentTarget.contains(event.relatedTarget as Node)) {
      setDragOverGroupArea(false)
    }
  }

  function removeGroupColumn(columnId: string) {
    setGroupByColumns((prev) => prev.filter((col) => col !== columnId))
  }

  function clearGrouping() {
    setGroupByColumns([])
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
      case 'reserved_quantity':
        return (
          <span className="text-sm">
            {stock.reserved_quantity || 0} {stock.unit}
          </span>
        )
      case 'available_quantity':
        return (
          <span className={
            (stock.available_quantity || 0) <= 0
              ? 'text-red-600'
              : (stock.available_quantity || 0) <= (stock.min_quantity || 0)
              ? 'text-orange-600'
              : ''
          }>
            {stock.available_quantity || 0} {stock.unit}
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
        // Dinamik alanlar için
        const fieldSetting = activeFields.find((f) => f.field_key === columnId)
        if (fieldSetting) {
          const value = (stock as any)[columnId]

          // field_type'a göre rendering
          if (fieldSetting.field_type === 'group') {
            return value ? (
              <span className="text-sm">
                {value}
              </span>
            ) : '-'
          } else {
            return <span className="text-sm">{value || '-'}</span>
          }
        }
        return null
    }
  }

  function handleDownloadTemplate() {
    if (downloadingTemplate) return

    try {
      setDownloadingTemplate(true)

      const headers = headerDefinitions.map((column) => column.header)
      const sampleValues = Object.fromEntries(
        BASE_STOCK_TEMPLATE_COLUMNS.map((column) => [column.key, column.sample ?? ''])
      )
      const sampleRow = headerDefinitions.map((column) => sampleValues[column.key] ?? '')

      const csvRows = [headers, sampleRow]
      const csvContent = csvRows
        .map((row) => row.map(formatCsvValue).join(';'))
        .join('\r\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().slice(0, 10)
      link.href = url
      link.setAttribute('download', `stok_sablon_${timestamp}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('CSV şablonu indirildi')
    } catch (error) {
      console.error('CSV template export error', error)
      toast.error('Şablon indirilirken bir sorun oluştu')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  function handleExportCsv() {
    if (exportingCsv) return
    if (!stocks.length) {
      toast.info('İndirilecek stok kartı bulunmuyor')
      return
    }

    try {
      setExportingCsv(true)

      const headers = headerDefinitions.map((column) => column.header)
      const rows = stocks.map((stock) =>
        headerDefinitions.map((column) => {
          const value = (stock as any)[column.key]
          if (column.key === 'is_critical') {
            return value ? 'E' : 'H'
          }
          if (column.key === 'currency') {
            return (value || 'TRY').toString().toUpperCase()
          }
          return value ?? ''
        })
      )

      const csvContent = [headers, ...rows]
        .map((row) => row.map(formatCsvValue).join(';'))
        .join('\r\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().slice(0, 10)
      link.href = url
      link.setAttribute('download', `stok_listesi_${timestamp}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Stok listesi CSV olarak indirildi')
    } catch (error) {
      console.error('CSV export error', error)
      toast.error('CSV dışa aktarımı sırasında bir hata oluştu')
    } finally {
      setExportingCsv(false)
    }
  }

  function handleImportButtonClick() {
    if (fieldsLoading) {
      toast.info('Dinamik kolonlar yüklenirken lütfen tekrar deneyin')
      return
    }
    fileInputRef.current?.click()
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    void importFromFile(file)
    event.target.value = ''
  }

  async function importFromFile(file: File) {
    if (fieldsLoading) {
      toast.info('Dinamik kolonlar yüklenirken lütfen tekrar deneyin')
      return
    }

    setImportingCsv(true)
    try {
      const rawContent = await file.text()
      const normalizedContent = rawContent.replace(/^\uFEFF/, '')
      const [firstLine = ''] = normalizedContent.split(/\r?\n/)
      if (!firstLine.trim()) {
        toast.error('Dosya boş görünüyor')
        return
      }

      const delimiter = detectDelimiter(firstLine)
      const rows = parseCsv(normalizedContent, delimiter)
      if (rows.length < 2) {
        toast.error('Veri satırı bulunamadı')
        return
      }

      const headers = rows[0].map((header) => header.trim())
      const headerMap = new Map<number, string>()
      headers.forEach((header, index) => {
        const key = resolveHeaderKey(header)
        if (key) {
          headerMap.set(index, key)
        }
      })

      const missingRequired = BASE_STOCK_TEMPLATE_COLUMNS.filter(
        (column) => column.required && !Array.from(headerMap.values()).includes(column.key)
      )
      if (missingRequired.length) {
        toast.error(
          `Eksik zorunlu kolonlar: ${missingRequired.map((column) => column.label).join(', ')}`
        )
        return
      }

      const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell?.trim()))
      if (!dataRows.length) {
        toast.error('İçe aktarılacak veri bulunamadı')
        return
      }

      const existingMap = new Map(
        stocks.map((stock) => [stock.product_code.trim().toLowerCase(), stock])
      )

      let createdCount = 0
      let updatedCount = 0
      const failures: Array<{ code: string; reason: string }> = []

      for (const row of dataRows) {
        const record: Record<string, string> = {}
        headerMap.forEach((key, columnIndex) => {
          const rawValue = row[columnIndex] ?? ''
          record[key] = rawValue.trim()
        })

        const productCode = record.product_code?.trim()
        const productName = record.product_name?.trim()

        if (!productCode || !productName) {
          failures.push({
            code: productCode || '(boş)',
            reason: 'Ürün kodu ve adı zorunludur',
          })
          continue
        }

        const productCodeKey = productCode.toLowerCase()
        const existing = existingMap.get(productCodeKey)
        const isExisting = Boolean(existing?.id)

        const payload: any = {
          product_code: productCode,
          product_name: productName,
        }

        if (record.category !== undefined || !isExisting) {
          payload.category = record.category || null
        }

        if (record.unit !== undefined) {
          if (record.unit) {
            payload.unit = record.unit
          } else if (!isExisting) {
            payload.unit = 'adet'
          }
        } else if (!isExisting) {
          payload.unit = 'adet'
        }

        const minQuantityValue =
          record.min_quantity !== undefined ? parseNumberFromCsv(record.min_quantity) : undefined
        if (minQuantityValue !== undefined) {
          payload.min_quantity = minQuantityValue
        } else if (!isExisting) {
          payload.min_quantity = 0
        }

        const unitPriceValue =
          record.unit_price !== undefined ? parseNumberFromCsv(record.unit_price) : undefined
        if (unitPriceValue !== undefined) {
          payload.unit_price = unitPriceValue
        } else if (!isExisting) {
          payload.unit_price = null
        }

        if (record.currency !== undefined) {
          payload.currency = record.currency ? record.currency.toUpperCase() : 'TRY'
        } else if (!isExisting) {
          payload.currency = 'TRY'
        }

        if (record.supplier_name !== undefined || !isExisting) {
          payload.supplier_name = record.supplier_name || null
        }

        if (record.description !== undefined || !isExisting) {
          payload.description = record.description || null
        }

        if (record.is_critical !== undefined) {
          const isCritical = parseBooleanFromCsv(record.is_critical)
          if (typeof isCritical === 'boolean') {
            payload.is_critical = isCritical
          }
        }

        activeFields.forEach((field) => {
          if (record[field.field_key] !== undefined) {
            payload[field.field_key] = record[field.field_key] || null
          }
        })

        const currentQuantity =
          record.current_quantity !== undefined ? parseNumberFromCsv(record.current_quantity) : undefined

        try {
          if (existing?.id) {
            const updatePayload = { ...payload }
            if (currentQuantity !== undefined) {
              updatePayload.current_quantity = currentQuantity
            }
            await stocksAPI.update(existing.id, updatePayload)
            updatedCount += 1
          } else {
            const createPayload = {
              ...payload,
              current_quantity: currentQuantity ?? 0,
            }
            const created = await stocksAPI.create(createPayload)
            const createdId = created?.data?.id ?? created?.id
            if (createdId) {
              existingMap.set(productCodeKey, { ...(created?.data ?? created), id: createdId } as Stock)
            }
            createdCount += 1
          }
        } catch (error: any) {
          const reason =
            error?.response?.data?.error ||
            error?.message ||
            'Sunucu hatası'
          failures.push({ code: productCode, reason })
        }
      }

      await loadStocks()
      await loadSummary()

      const resultMessages: string[] = []
      if (createdCount) {
        resultMessages.push(`${createdCount} yeni stok oluşturuldu`)
      }
      if (updatedCount) {
        resultMessages.push(`${updatedCount} stok güncellendi`)
      }

      if (failures.length) {
        console.error('CSV import errors:', failures)
        const baseMessage = resultMessages.length ? resultMessages.join(', ') : ''
        toast.warning(
          `${baseMessage}${baseMessage ? '. ' : ''}${failures.length} satırda hata oluştu. Detaylar için konsolu kontrol edin.`
        )
      } else if (resultMessages.length) {
        toast.success(resultMessages.join(', '))
      } else {
        toast.info('Herhangi bir kayıt içe aktarılmadı')
      }
    } catch (error) {
      console.error('CSV import error', error)
      toast.error('CSV içe aktarımı sırasında bir hata oluştu')
    } finally {
      setImportingCsv(false)
    }
  }

  function requestSort(key: string) {
    let direction: 'ascending' | 'descending' = 'ascending'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  function getSortIcon(columnId: string) {
    if (sortConfig?.key !== columnId) {
      return null
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="h-4 w-4 text-blue-600" />
    }
    return <ArrowDown className="h-4 w-4 text-blue-600" />
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

    // Base form alanları
    const baseForm: any = {
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
    }

    // Aktif alanları ekle
    activeFields.forEach((field) => {
      baseForm[field.field_key] = (stock as any)[field.field_key] || ''
    })

    setForm(baseForm)
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

      // Aktif alanları payload'a ekle
      activeFields.forEach((field) => {
        payload[field.field_key] = (form as any)[field.field_key] || null
      })

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
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 space-y-6">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold">Stok Yönetimi</h1>
          <p className="text-muted-foreground">Tüm stok kartları ve mevcut durumlar</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/stocks/movements">
            <Button variant="outline" className="gap-2">
              <ArrowUpDown className="w-4 h-4" />
              Stok Hareketleri
            </Button>
          </Link>
          <Link href="/procurement/purchase-orders">
            <Button variant="outline" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              Satın Alma Emirleri
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Import & Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate || fieldsLoading}
              >
                <FileDown className="w-4 h-4 mr-2" />
                {downloadingTemplate ? 'Hazırlanıyor...' : 'CSV Şablon İndir'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportCsv}
                disabled={exportingCsv || stocks.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                {exportingCsv ? 'Dışa aktarılıyor...' : 'CSV Dışa Aktar'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleImportButtonClick}
                disabled={importingCsv || fieldsLoading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {importingCsv ? 'Yükleniyor...' : 'CSV İçe Aktar'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Stok Kartı
          </Button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-3 md:grid-cols-4 px-4 sm:px-6 lg:px-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4">
              <CardTitle className="text-xs font-medium">Toplam Stok Değeri (TRY)</CardTitle>
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold">
                {summary.total_value?.TRY?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4">
              <CardTitle className="text-xs font-medium">Toplam Stok Kalemi</CardTitle>
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold">{summary.total_stock_items}</div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4">
              <CardTitle className="text-xs font-medium text-orange-900">Kritik Seviye</CardTitle>
              <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-xl font-bold text-orange-900">{summary.critical_stock_count}</div>
            </CardContent>
          </Card>

          <Link href="/stocks/settings">
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-transparent hover:border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4">
                <CardTitle className="text-xs font-medium">Döviz Kurları</CardTitle>
                <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-xs">
                  <div>USD: {summary.currency_rates?.USD_to_TRY?.toFixed(2)} ₺</div>
                  <div>EUR: {summary.currency_rates?.EUR_to_TRY?.toFixed(2)} ₺</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Stock List */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center mb-4 gap-4">
            <div className="flex gap-3 items-center flex-1">
              {/* Grouping Area */}
              <div
                className={cn(
                  'min-w-[360px] h-10 border-2 border-dashed rounded-md flex flex-wrap items-center gap-2 px-3 transition-colors',
                  dragOverGroupArea
                    ? 'border-blue-500 bg-blue-50'
                    : groupByColumns.length > 0
                    ? 'border-gray-300 bg-gray-50'
                    : 'border-gray-300 bg-white'
                )}
                onDragEnter={handleGroupAreaDragEnter}
                onDragOver={handleGroupAreaDragOver}
                onDrop={handleGroupAreaDrop}
                onDragLeave={handleGroupAreaDragLeave}
              >
                {groupByColumns.length === 0 ? (
                  <span className="text-xs text-muted-foreground whitespace-nowrap pointer-events-none">
                    Gruplamak için kolon sürükleyin
                  </span>
                ) : (
                  <div className="flex items-center gap-2 w-full flex-wrap">
                    {groupByColumns.map((colId) => {
                      const definition = COLUMN_DEFINITIONS[colId]
                      return (
                        <div
                          key={colId}
                          className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium pointer-events-none"
                        >
                          <span>{definition?.label || colId}</span>
                          <button
                            onClick={() => removeGroupColumn(colId)}
                            className="hover:bg-blue-200 rounded-full p-0.5 pointer-events-auto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    })}
                    {groupByColumns.length < MAX_GROUP_COLUMNS && (
                      <span className="text-xs text-muted-foreground pointer-events-none">
                        +{MAX_GROUP_COLUMNS - groupByColumns.length} daha
                      </span>
                    )}
                    {groupByColumns.length > 0 && (
                      <button
                        onClick={clearGrouping}
                        className="ml-auto text-xs text-red-600 hover:text-red-800 pointer-events-auto"
                      >
                        Temizle
                      </button>
                    )}
                  </div>
                )}
              </div>

              <Input
                placeholder="Ara (ürün adı, kodu, kategori)..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="max-w-md"
              />
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={showCriticalOnly}
                  onChange={(e) => setShowCriticalOnly(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Sadece Kritik Stoklar</span>
              </label>
            </div>
            <Button variant="outline" size="sm" onClick={() => setColumnSettingsOpen(true)}>
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Kolon Ayarları
            </Button>
          </div>
          {sortedStocks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Stok bulunamadı
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto rounded-md border border-gray-200">
                <table
                  className="w-full border-collapse text-sm"
                  style={{ minWidth: Math.max(minimumTableWidth, 960) }}
                >
                  <colgroup>
                    {visibleColumns.map((columnId) => {
                      const definition = COLUMN_DEFINITIONS[columnId]
                      const width = columnPixelWidths[columnId] ?? definition.defaultWidth
                      const minWidth = definition.minWidth ?? 120
                      return (
                        <col
                          key={`col-${columnId}`}
                          style={{ width, minWidth }}
                        />
                      )
                    })}
                  </colgroup>
                  <thead className="bg-gray-100 text-gray-700 border-b border-gray-200">
                    <tr>
                      {visibleColumns.map((columnId) => {
                        const definition = COLUMN_DEFINITIONS[columnId]
                        const width = columnPixelWidths[columnId] ?? definition.defaultWidth
                        const minWidth = definition.minWidth ?? 120
                        const alignClass = definition.align === 'right' ? 'justify-end text-right' : 'text-left'
                        const isDragTarget = dragOverColumn === columnId

                        return (
                          <th
                            key={columnId}
                            className={cn(
                              'group relative px-3 py-1 text-xs font-semibold uppercase tracking-wide',
                              alignClass,
                              isDragTarget ? 'bg-blue-50' : ''
                            )}
                            style={{ width, minWidth }}
                            onDragOver={(event) => handleDragOver(event, columnId)}
                            onDrop={() => handleDrop(columnId)}
                            onDragLeave={() => setDragOverColumn(null)}
                          >
                            <div className={cn('flex items-center gap-2', definition.align === 'right' ? 'justify-end' : '')}>
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
                              {columnId !== 'actions' ? (
                                <button
                                  onClick={() => requestSort(columnId)}
                                  className="flex items-center gap-2 hover:text-gray-900 transition-colors"
                                  draggable
                                  onDragStart={(event) => handleDragStart(event, columnId)}
                                  onDragEnd={handleDragEnd}
                                  aria-label={`${definition.label} sütununu grupla`}
                                >
                                  <span className="truncate text-sm font-semibold text-gray-700">{definition.label}</span>
                                  {getSortIcon(columnId)}
                                </button>
                              ) : (
                                <span className="truncate text-sm font-semibold text-gray-700">{definition.label}</span>
                              )}
                            </div>
                            <span
                              className="absolute right-0 top-1/2 h-6 w-1.5 -translate-y-1/2 cursor-col-resize rounded bg-transparent transition-colors group-hover:bg-gray-300 hover:bg-blue-400"
                              onMouseDown={(event) => handleResizeMouseDown(event, columnId)}
                              aria-hidden="true"
                            />
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {groupedStocks ? (
                      // Gruplu rendering
                      groupedStocks.map((group, groupIndex) => (
                        <Fragment key={`group-${groupIndex}`}>
                          {/* Group Header Row */}
                          <tr className="bg-gray-200 border-b-2 border-gray-300">
                            <td
                              colSpan={visibleColumns.length}
                              className="px-3 py-1.5 font-semibold text-sm text-gray-800"
                            >
                              {group.groupKey} ({group.items.length} kayıt)
                            </td>
                          </tr>
                          {/* Group Items */}
                          {group.items.map((stock, index) => {
                            const isEven = index % 2 === 0
                            const isSelected = selectedStockId === stock.id
                            const isHovered = hoveredStockId === stock.id
                            const rowClass = cn(
                              'border-b transition-colors cursor-pointer',
                              isSelected || isHovered
                                ? 'bg-blue-100 hover:bg-blue-100/80'
                                : isEven
                                ? 'bg-white hover:bg-gray-100/80'
                                : 'bg-gray-50 hover:bg-gray-100/80',
                              stock.is_critical && !isSelected && !isHovered && 'bg-orange-50 hover:bg-orange-100/80'
                            )

                            return (
                              <tr
                                key={stock.id}
                                className={rowClass}
                                onMouseEnter={() => setHoveredStockId(stock.id)}
                                onMouseLeave={() => setHoveredStockId(null)}
                                onClick={() => {
                                  setSelectedStockId(stock.id)
                                  router.push(`/stocks/movements?stock_id=${stock.id}`)
                                }}
                                title="Stok hareketlerini görüntülemek için tıklayın"
                              >
                                {visibleColumns.map((columnId) => {
                                  const definition = COLUMN_DEFINITIONS[columnId]
                                  const width = columnPixelWidths[columnId] ?? definition.defaultWidth
                                  const minWidth = definition.minWidth ?? 120
                                  const alignClass = definition.align === 'right' ? 'text-right' : 'text-left'

                                  return (
                                    <td
                                      key={`${stock.id}-${columnId}`}
                                      className={cn('px-3 py-1 align-middle text-sm', alignClass)}
                                      style={{ width, minWidth }}
                                      onClick={columnId === 'actions' ? (event) => event.stopPropagation() : undefined}
                                    >
                                      <div className="truncate text-gray-900">
                                        {renderCell(stock, columnId)}
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            )
                          })}
                        </Fragment>
                      ))
                    ) : (
                      // Normal rendering (without grouping)
                      paginatedStocks.map((stock, index) => {
                        const isEven = index % 2 === 0
                        const isSelected = selectedStockId === stock.id
                        const isHovered = hoveredStockId === stock.id
                        const rowClass = cn(
                          'border-b transition-colors cursor-pointer',
                          isSelected || isHovered
                            ? 'bg-blue-100 hover:bg-blue-100/80'
                            : isEven
                            ? 'bg-white hover:bg-gray-100/80'
                            : 'bg-gray-50 hover:bg-gray-100/80',
                          stock.is_critical && !isSelected && !isHovered && 'bg-orange-50 hover:bg-orange-100/80'
                        )

                        return (
                          <tr
                            key={stock.id}
                            className={rowClass}
                            onMouseEnter={() => setHoveredStockId(stock.id)}
                            onMouseLeave={() => setHoveredStockId(null)}
                            onClick={() => {
                              setSelectedStockId(stock.id)
                              router.push(`/stocks/movements?stock_id=${stock.id}`)
                            }}
                            title="Stok hareketlerini görüntülemek için tıklayın"
                          >
                            {visibleColumns.map((columnId) => {
                              const definition = COLUMN_DEFINITIONS[columnId]
                              const width = columnPixelWidths[columnId] ?? definition.defaultWidth
                              const minWidth = definition.minWidth ?? 120
                              const alignClass = definition.align === 'right' ? 'text-right' : 'text-left'

                              return (
                                <td
                                  key={`${stock.id}-${columnId}`}
                                  className={cn('px-3 py-1 align-middle text-sm', alignClass)}
                                  style={{ width, minWidth }}
                                  onClick={columnId === 'actions' ? (event) => event.stopPropagation() : undefined}
                                >
                                  <div className="truncate text-gray-900">
                                    {renderCell(stock, columnId)}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="text-sm text-muted-foreground">
                    {pageRangeStart}-{pageRangeEnd} / {sortedStocks.length} kayıt
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Sayfa boyutu</span>
                      <select
                        value={pageSize}
                        onChange={(event) => {
                          const nextSize = Number(event.target.value)
                          setPageSize(nextSize)
                          setPage(1)
                        }}
                        className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Sayfa {page} / {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page >= totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={columnSettingsOpen} onOpenChange={setColumnSettingsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Tablo Kolon Ayarları</DialogTitle>
            <DialogDescription>
              Kolonların sırasını ve görünürlüğünü buradan yönetebilirsiniz.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {columnOrder.map((columnId) => {
              const definition = COLUMN_DEFINITIONS[columnId]

              // Eğer definition yoksa bu kolon kaldırılmış demektir, atla
              if (!definition) return null

              const isVisible = columnVisibility[columnId] !== false
              const isMandatory = definition.hideable === false
              const currentIndex = columnOrder.indexOf(columnId)

              return (
                <div
                  key={`column-setting-${columnId}`}
                  className="flex items-center justify-between rounded border border-gray-200 bg-white p-1.5 pl-2"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex items-center justify-center rounded bg-gray-100 p-1 flex-shrink-0">
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{definition.label}</span>
                        {isMandatory && <span className="text-[10px] text-muted-foreground flex-shrink-0">(zorunlu)</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                      <span className="whitespace-nowrap">{isVisible ? 'Görünür' : 'Gizli'}</span>
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5"
                        checked={isVisible}
                        onChange={(event) => handleVisibilityToggle(columnId, event.target.checked)}
                        disabled={isMandatory}
                      />
                    </label>
                    <div className="h-5 w-px bg-gray-200"></div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveColumn(columnId, 'up')}
                      disabled={currentIndex === 0}
                      aria-label={`${definition.label} kolonunu yukarı taşı`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveColumn(columnId, 'down')}
                      disabled={currentIndex === columnOrder.length - 1}
                      aria-label={`${definition.label} kolonunu aşağı taşı`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
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

            {/* Dinamik Aktif Alanlar */}
            {activeFields.length > 0 && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold mb-3 text-gray-700">Ek Bilgiler</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {activeFields.map((field) => (
                      <div key={field.field_key}>
                        <label className="text-sm font-medium">{field.custom_label}</label>
                        <Input
                          value={(form as any)[field.field_key] || ''}
                          onChange={(e) => setForm({ ...form, [field.field_key]: e.target.value })}
                          placeholder={`${field.custom_label} girin...`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
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
