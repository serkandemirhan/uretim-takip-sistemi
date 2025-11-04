'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Settings,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  GripVertical,
} from 'lucide-react'

import { customersAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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

type Customer = {
  id: string
  name: string
  code?: string | null
  contact_person?: string | null
  phone?: string | null
  phone_secondary?: string | null
  gsm?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  tax_office?: string | null
  tax_number?: string | null
  short_code?: string | null
  postal_code?: string | null
  notes?: string | null
  created_at?: string | null
}

type CustomerFormValues = {
  name: string
  code: string
  short_code: string
  contact_person: string
  phone: string
  phone_secondary: string
  gsm: string
  email: string
  tax_office: string
  tax_number: string
  address: string
  city: string
  postal_code: string
  notes: string
}

const EMPTY_FORM: CustomerFormValues = {
  name: '',
  code: '',
  short_code: '',
  contact_person: '',
  phone: '',
  phone_secondary: '',
  gsm: '',
  email: '',
  tax_office: '',
  tax_number: '',
  address: '',
  city: '',
  postal_code: '',
  notes: '',
}

type ColumnConfig = {
  key: string
  label: string
  width?: string
  type?: 'string' | 'number' | 'date'
  filterType?: 'text' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
  accessor: (customer: Customer) => string | number | null | undefined
  render?: (customer: Customer) => ReactNode
}

const STORAGE_KEY_PREFIX = 'customers_table_settings_'

export default function CustomersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])

  const [panelOpen, setPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState<'create' | 'edit'>('create')
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null)
  const [form, setForm] = useState<CustomerFormValues>(EMPTY_FORM)
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)

  useEffect(() => {
    void loadCustomers()
  }, [])

  async function loadCustomers() {
    setLoading(true)
    try {
      const res = await customersAPI.getAll()
      const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      const list: Customer[] = raw.map((item: any) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        contact_person: item.contact_person,
        phone: item.phone,
        phone_secondary: item.phone_secondary,
        gsm: item.gsm,
        email: item.email,
        address: item.address,
        city: item.city,
        tax_office: item.tax_office,
        tax_number: item.tax_number,
        short_code: item.short_code,
        postal_code: item.postal_code,
        notes: item.notes,
        created_at: item.created_at,
      }))
      setCustomers(list)
    } catch (error) {
      handleError(error)
      toast.error('Müşteriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  // Table state
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [draftFilters, setDraftFilters] = useState<Record<string, string>>({})
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())
  const [columnOrder, setColumnOrder] = useState<string[]>([])

  const columnConfigs = useMemo<ColumnConfig[]>(() => [
    { key: 'name', label: 'Ad', width: 'w-64', placeholder: 'Ad ara', accessor: c => c.name },
    { key: 'short_code', label: 'Kısa Kod', width: 'w-32', placeholder: 'Kod ara', accessor: c => c.short_code, render: c => <Badge variant="outline">{c.short_code || c.code || '—'}</Badge> },
    { key: 'contact_person', label: 'Yetkili', width: 'w-48', placeholder: 'Yetkili ara', accessor: c => c.contact_person },
    { key: 'phone', label: 'Telefon', width: 'w-48', placeholder: 'Telefon ara', accessor: c => [c.phone, c.phone_secondary, c.gsm].filter(Boolean).join(' / ') },
    { key: 'email', label: 'E-posta', width: 'w-64', placeholder: 'E-posta ara', accessor: c => c.email },
    { key: 'city', label: 'Şehir', width: 'w-40', placeholder: 'Şehir ara', accessor: c => c.city },
    { key: 'address', label: 'Adres', width: 'w-80', placeholder: 'Adres ara', accessor: c => c.address },
    { key: 'tax_office', label: 'Vergi Dairesi', width: 'w-40', placeholder: 'Daire ara', accessor: c => c.tax_office },
    { key: 'tax_number', label: 'Vergi No', width: 'w-40', placeholder: 'No ara', accessor: c => c.tax_number },
    { key: 'created_at', label: 'Oluşturma Tarihi', width: 'w-44', type: 'date', accessor: c => c.created_at, render: c => c.created_at ? new Date(c.created_at).toLocaleDateString('tr-TR') : '—' },
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

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      return columnConfigs.every(column => {
        const filterValue = filters[column.key]
        if (!filterValue) return true

        const rawValue = column.accessor(customer)
        if (rawValue == null) return false

        const normalizedFilter = filterValue.trim().toLowerCase()
        if (column.filterType === 'select') return String(rawValue).toLowerCase() === normalizedFilter
        if (column.type === 'date') return new Date(rawValue as string).toLocaleDateString('tr-TR').includes(normalizedFilter)
        return String(rawValue).toLowerCase().includes(normalizedFilter)
      })
    })
  }, [customers, filters, columnConfigs])

  const sortedCustomers = useMemo(() => {
    if (!sortConfig) return filteredCustomers

    const column = columnConfigs.find(col => col.key === sortConfig.key)
    if (!column) return filteredCustomers

    const getComparable = (customer: Customer) => {
      const value = column.accessor(customer)
      if (value == null) return null
      if (column.type === 'number') return Number(value)
      if (column.type === 'date') return value ? new Date(value as string).getTime() : null
      return String(value).toLowerCase()
    }

    return [...filteredCustomers].sort((a, b) => {
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
  }, [filteredCustomers, sortConfig, columnConfigs])

  const visibleColumnConfigs = useMemo(() => {
    const orderIndex: Record<string, number> = {}
    columnOrder.forEach((k, i) => { orderIndex[k] = i })
    return columnConfigs
      .filter(col => visibleColumns.has(col.key))
      .sort((a, b) => (orderIndex[a.key] ?? 99) - (orderIndex[b.key] ?? 99))
  }, [columnConfigs, visibleColumns, columnOrder])

  const openCreatePanel = () => {
    setPanelMode('create')
    setActiveCustomerId(null)
    setForm(EMPTY_FORM)
    setPanelLoading(false)
    setPanelOpen(true)
  }

  const mapToForm = (customer: Partial<Customer>): CustomerFormValues => ({
    name: customer.name ?? '',
    code: customer.code ?? '',
    short_code: customer.short_code ?? '',
    contact_person: customer.contact_person ?? '',
    phone: customer.phone ?? '',
    phone_secondary: customer.phone_secondary ?? '',
    gsm: customer.gsm ?? '',
    email: customer.email ?? '',
    tax_office: customer.tax_office ?? '',
    tax_number: customer.tax_number ?? '',
    address: customer.address ?? '',
    city: customer.city ?? '',
    postal_code: customer.postal_code ?? '',
    notes: customer.notes ?? '',
  })

  const openEditPanel = async (customerId: string) => {
    setPanelMode('edit')
    setActiveCustomerId(customerId)
    setPanelOpen(true)
    setPanelLoading(true)
    try {
      const res = await customersAPI.getById(customerId)
      const data = (res?.data ?? res) as Customer
      setForm(mapToForm(data))
    } catch (error) {
      handleError(error)
      toast.error('Müşteri ayrıntıları yüklenemedi')
      setPanelOpen(false)
    } finally {
      setPanelLoading(false)
    }
  }

  const closePanel = () => {
    if (saving) return
    setPanelOpen(false)
    setPanelLoading(false)
    setActiveCustomerId(null)
    setForm(EMPTY_FORM)
  }

  const handleFormChange = (field: keyof CustomerFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const buildPayload = (values: CustomerFormValues) => {
    const payload: Record<string, string | null> = {}
    Object.entries(values).forEach(([key, value]) => {
      const trimmed = value.trim()
      payload[key] = trimmed === '' ? null : trimmed
    })
    payload.name = values.name.trim()
    return payload
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Müşteri adı zorunludur')
      return
    }

    setSaving(true)
    try {
      const payload = buildPayload(form)
      if (panelMode === 'create') {
        await customersAPI.create(payload)
        toast.success('Yeni müşteri eklendi')
      } else if (panelMode === 'edit' && activeCustomerId) {
        await customersAPI.update(activeCustomerId, payload)
        toast.success('Müşteri güncellendi')
      }
      await loadCustomers()
      closePanel()
    } catch (error) {
      handleError(error)
      toast.error(
        panelMode === 'create'
          ? 'Müşteri oluşturulamadı'
          : 'Müşteri güncellenemedi',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (customerId: string) => {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return
    try {
      await customersAPI.delete(customerId)
      toast.success('Müşteri silindi')
      if (customerId === activeCustomerId) {
        closePanel()
      }
      await loadCustomers()
    } catch (error) {
      handleError(error)
      toast.error('Müşteri silinemedi')
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

  const renderPanelContent = () => {
    if (panelLoading) {
      return (
        <div className="flex h-full items-center justify-center text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Yükleniyor…
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Müşteri Adı *</label>
            <Input
              value={form.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="Örn: ABC Reklam"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Müşteri Kodu</label>
            <Input
              value={form.code}
              onChange={(e) => handleFormChange('code', e.target.value)}
              placeholder="Örn: MR-001"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Kısa Kod</label>
            <Input
              value={form.short_code}
              onChange={(e) => handleFormChange('short_code', e.target.value)}
              placeholder="Örn: ABC"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Yetkili Kişi</label>
            <Input
              value={form.contact_person}
              onChange={(e) => handleFormChange('contact_person', e.target.value)}
              placeholder="Örn: Ayşe Yılmaz"
              disabled={saving}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Telefon</label>
            <Input
              value={form.phone}
              onChange={(e) => handleFormChange('phone', e.target.value)}
              placeholder="+90 212 ..."
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">İkinci Telefon</label>
            <Input
              value={form.phone_secondary}
              onChange={(e) => handleFormChange('phone_secondary', e.target.value)}
              placeholder="+90 212 ..."
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">GSM</label>
            <Input
              value={form.gsm}
              onChange={(e) => handleFormChange('gsm', e.target.value)}
              placeholder="+90 5xx ..."
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">E-posta</label>
            <Input
              value={form.email}
              onChange={(e) => handleFormChange('email', e.target.value)}
              placeholder="ornek@firma.com"
              disabled={saving}
              type="email"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Vergi Dairesi</label>
            <Input
              value={form.tax_office}
              onChange={(e) => handleFormChange('tax_office', e.target.value)}
              placeholder="Örn: Şişli"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Vergi No</label>
            <Input
              value={form.tax_number}
              onChange={(e) => handleFormChange('tax_number', e.target.value)}
              placeholder="Örn: 1234567890"
              disabled={saving}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Şehir</label>
            <Input
              value={form.city}
              onChange={(e) => handleFormChange('city', e.target.value)}
              placeholder="Örn: İstanbul"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Posta Kodu</label>
            <Input
              value={form.postal_code}
              onChange={(e) => handleFormChange('postal_code', e.target.value)}
              placeholder="Örn: 34394"
              disabled={saving}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-gray-500">Adres</label>
          <Textarea
            value={form.address}
            onChange={(e) => handleFormChange('address', e.target.value)}
            rows={3}
            placeholder="Adres bilgisi"
            disabled={saving}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-gray-500">Notlar</label>
          <Textarea
            value={form.notes}
            onChange={(e) => handleFormChange('notes', e.target.value)}
            rows={3}
            placeholder="İç notlar"
            disabled={saving}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Müşteri Yönetimi</h1>
          <p className="mt-1 text-gray-600">
            Bayileri listeler, ararsınız. Yeni bayiler ekleyip mevcut kayıtları düzenleyebilirsiniz.
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
          <Button variant="outline" size="sm" onClick={loadCustomers} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
          <Button onClick={openCreatePanel} className="gap-2">
            <Plus className="h-4 w-4" />
            Yeni Müşteri
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Yükleniyor…
            </div>
          ) : sortedCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Filtrelerle eşleşen müşteri kaydı bulunamadı.
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
                        <Input value={draftFilters[column.key] || ''} onChange={e => setDraftFilters(prev => ({ ...prev, [column.key]: e.target.value }))} placeholder={column.placeholder} className="h-8 text-xs" />
                      </TableCell>
                    ))}
                    <TableCell className="p-1" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="border-b transition-colors hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/customers/${customer.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          router.push(`/customers/${customer.id}`)
                        }
                      }}
                      aria-label={`Müşteri detayını aç: ${customer.name}`}
                    >
                      {visibleColumnConfigs.map(column => (
                        <TableCell key={column.key} className="px-3 py-2 text-sm" style={{ width: columnWidths[column.key] || 'auto' }}>
                          {column.render ? column.render(customer) : String(column.accessor(customer) ?? '—')}
                        </TableCell>
                      ))}
                      <TableCell className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-gray-600 hover:text-gray-900"
                            onClick={(event) => {
                              event.stopPropagation()
                              openEditPanel(customer.id)
                            }}
                            aria-label="Müşteriyi düzenle"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleDelete(customer.id)
                            }}
                            aria-label="Müşteriyi sil"
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

      {panelOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="hidden flex-1 bg-black/30 sm:block"
            onClick={closePanel}
            aria-hidden="true"
          />
          <div className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-xs uppercase text-gray-500">
                  {panelMode === 'create' ? 'Yeni Bayi' : 'Müşteri Bilgileri'}
                </p>
                <h2 className="text-lg font-semibold text-gray-900">
                  {panelMode === 'create'
                    ? 'Yeni Bayi Ekle'
                    : form.name || 'Müşteri düzenle'}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={closePanel}
                disabled={saving}
                aria-label="Paneli kapat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {renderPanelContent()}
            </div>

            <div className="flex items-center justify-between border-t px-5 py-4">
              {panelMode === 'edit' && activeCustomerId && (
                <Button
                  variant="outline"
                  className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleDelete(activeCustomerId)}
                  disabled={saving || panelLoading}
                >
                  <Trash2 className="h-4 w-4" />
                  Sil
                </Button>
              )}
              <div className="flex-1" />
              <Button
                onClick={handleSave}
                disabled={saving || panelLoading}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Kaydediliyor…
                  </>
                ) : (
                  'Kaydet'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
