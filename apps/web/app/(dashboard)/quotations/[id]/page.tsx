'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { quotationsAPI, stocksAPI, customersAPI, unitsAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  X,
  Edit,
  Search,
  Package,
  Calculator,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type UnitOption = {
  id: string
  code: string
  name: string
  description?: string | null
  is_active: boolean
}

const DEFAULT_CURRENCIES = ['TRY', 'EUR', 'USD']

const createEmptyManualItem = () => ({
  product_name: '',
  product_code: '',
  quantity: '1',
  unit: '',
  unit_cost: '',
  notes: '',
  currency: 'TRY',
})

export default function QuotationDetailPage() {
  const params = useParams()

  const [quotation, setQuotation] = useState<any>(null)
  const [stocks, setStocks] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    customer_id: '',
    description: '',
    status: 'draft',
  })

  const [stockSearch, setStockSearch] = useState('')
  const [selectedStockIds, setSelectedStockIds] = useState<Set<string>>(new Set())
  const [addingItems, setAddingItems] = useState(false)
  const [showStockPanel, setShowStockPanel] = useState(false)
  const [showManualItemForm, setShowManualItemForm] = useState(false)
  const [manualItem, setManualItem] = useState(createEmptyManualItem())
  const [addingManualItem, setAddingManualItem] = useState(false)
  const [unitOptions, setUnitOptions] = useState<UnitOption[]>([])
  const [unitOptionsLoading, setUnitOptionsLoading] = useState(true)

  useEffect(() => {
    if (params.id) {
      loadQuotation()
      loadStocks()
      loadCustomers()
      loadUnitOptions()
    }
  }, [params.id])

  async function loadUnitOptions() {
    try {
      setUnitOptionsLoading(true)
      const response = await unitsAPI.getAll()
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : []
      setUnitOptions(list)
    } catch (error) {
      console.error('Ölçü birimleri yüklenemedi:', error)
    } finally {
      setUnitOptionsLoading(false)
    }
  }

  useEffect(() => {
    if (!unitOptions || unitOptions.length === 0) {
      return
    }
    setManualItem((prev) => {
      if (prev.unit) {
        return prev
      }
      const firstActive = unitOptions.find((unit) => unit.is_active)
      if (firstActive) {
        return { ...prev, unit: firstActive.code }
      }
      return prev
    })
  }, [unitOptions])

  async function loadQuotation() {
    try {
      setLoading(true)
      const response = await quotationsAPI.getById(params.id as string)
      const data = response.data
      setQuotation(data)
      setFormData({
        name: data.name || '',
        customer_id: data.customer_id || '',
        description: data.description || '',
        status: data.status || 'draft',
      })
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Teklif yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function loadStocks() {
    try {
      const response = await stocksAPI.getAll()
      setStocks(response.data || [])
    } catch (error) {
      console.error('Stoklar yüklenemedi:', error)
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

  async function handleSave() {
    try {
      setSaving(true)
      await quotationsAPI.update(params.id as string, formData)
      toast.success('Teklif güncellendi')
      setIsEditing(false)
      await loadQuotation()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Teklif güncellenemedi')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddSelectedItems() {
    if (selectedStockIds.size === 0) {
      toast.error('Lütfen en az bir ürün seçin')
      return
    }

    try {
      setAddingItems(true)
      const items = Array.from(selectedStockIds).map((stock_id) => ({
        stock_id,
        quantity: 1,
      }))

      await quotationsAPI.addItems(params.id as string, items)
      toast.success(`${items.length} ürün eklendi`)
      setSelectedStockIds(new Set())
      await loadQuotation()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ürünler eklenemedi')
    } finally {
      setAddingItems(false)
    }
  }

  function resetManualItemForm() {
    setManualItem(createEmptyManualItem())
  }

  function handleManualItemChange(field: string, value: string) {
    setManualItem((prev) => ({
      ...prev,
      [field]: field === 'currency' ? value.toUpperCase() : value,
    }))
  }

  const manualItemTotal = (() => {
    const quantity = parseFloat(manualItem.quantity)
    const unitCost = parseFloat(manualItem.unit_cost)
    if (Number.isNaN(quantity) || Number.isNaN(unitCost)) {
      return 0
    }
    return quantity * unitCost
  })()

const materialsGridTemplate =
  'grid grid-cols-[40px_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,1.6fr)_minmax(0,0.55fr)_minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,1.1fr)_40px] gap-2'

  async function handleAddManualItem() {
    const productName = manualItem.product_name.trim()
    if (!productName) {
      toast.error('Ürün adı gerekli')
      return
    }
    const currencyCode = (manualItem.currency || '').trim().toUpperCase()
    if (!currencyCode) {
      toast.error('Para birimi gerekli')
      return
    }
    if (!manualItem.unit) {
      toast.error('Lütfen birim seçin')
      return
    }

    const quantityValue = parseFloat(manualItem.quantity)
    const unitCostValue = parseFloat(manualItem.unit_cost)
    const safeQuantity = Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 1
    const safeUnitCost = Number.isFinite(unitCostValue) && unitCostValue >= 0 ? unitCostValue : 0

    try {
      setAddingManualItem(true)
      await quotationsAPI.addItems(params.id as string, [
        {
          product_name: productName,
          product_code: manualItem.product_code.trim() || undefined,
          quantity: safeQuantity,
          unit: manualItem.unit || undefined,
          unit_cost: safeUnitCost,
           currency: currencyCode,
          notes: manualItem.notes.trim() || undefined,
        },
      ])

      toast.success('Yeni satır eklendi')
      resetManualItemForm()
      await loadQuotation()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Satır eklenemedi')
    } finally {
      setAddingManualItem(false)
    }
  }

  async function handleUpdateItem(itemId: string, field: string, value: any) {
    try {
      const updateData: any = {}
      updateData[field] =
        field === 'currency'
          ? value
            ? String(value).toUpperCase()
            : null
          : value

      await quotationsAPI.updateItem(params.id as string, itemId, updateData)
      await loadQuotation()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Kalem güncellenemedi')
    }
  }

  async function handleDeleteItem(itemId: string, productName: string) {
    if (!confirm(`"${productName}" ürününü listeden çıkarmak istediğinizden emin misiniz?`)) {
      return
    }

    try {
      await quotationsAPI.deleteItem(params.id as string, itemId)
      toast.success('Ürün kaldırıldı')
      await loadQuotation()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Ürün kaldırılamadı')
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

  // Stok gruplarına göre organize et
  const groupedStocks = stocks.reduce((acc: any, stock: any) => {
    const category = stock.category || 'Diğer'
    if (!acc[category]) acc[category] = []
    acc[category].push(stock)
    return acc
  }, {})

  const filteredGroupedStocks = Object.entries(groupedStocks).reduce(
    (acc: any, [category, categoryStocks]: [string, any]) => {
      const filtered = categoryStocks.filter((stock: any) =>
        stock.product_name?.toLowerCase().includes(stockSearch.toLowerCase()) ||
        stock.product_code?.toLowerCase().includes(stockSearch.toLowerCase())
      )
      if (filtered.length > 0) {
        acc[category] = filtered
      }
      return acc
    },
    {}
  )

  const items = quotation?.items || []
  const totalCost = quotation?.total_cost || 0
  const totalCostTry = quotation?.total_cost_try ?? totalCost
  const currencyTotals: Array<{ currency: string; amount: number; amount_try: number }> =
    quotation?.currency_totals ?? []
  const versionLabel =
    quotation?.version_label ??
    `Ver${quotation?.version_major ?? 1}.${quotation?.version_minor ?? 0}`
  const versionLabelDisplay = versionLabel.toUpperCase()
  const lastUpdatedText = quotation?.updated_at
    ? new Date(quotation.updated_at).toLocaleString('tr-TR')
    : null

  const normalizedUnitOptions = useMemo(
    () =>
      unitOptions.map((unit) => ({
        value: unit.code,
        label: unit.name || unit.code,
        isActive: unit.is_active,
      })),
    [unitOptions],
  )

  const unitSelectOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string; isActive: boolean }>()

    normalizedUnitOptions.forEach((option) => {
      map.set(option.value, option)
    })

    items.forEach((item: any) => {
      const unitCode = item.unit
      if (unitCode && !map.has(unitCode)) {
        map.set(unitCode, {
          value: unitCode,
          label: `${unitCode} (pasif)`,
          isActive: false,
        })
      }
    })

    if (manualItem.unit && !map.has(manualItem.unit)) {
      map.set(manualItem.unit, {
        value: manualItem.unit,
        label: manualItem.unit,
        isActive: true,
      })
    }

    return Array.from(map.values())
  }, [normalizedUnitOptions, items, manualItem.unit])

  const unitSelectOptionsWithPlaceholder = useMemo(() => {
    if (unitSelectOptions.length === 0) {
      return [
        {
          value: '',
          label: unitOptionsLoading ? 'Ölçü birimleri yükleniyor...' : 'Önce ölçü birimi tanımlayın',
          isActive: false,
        },
      ]
    }

    return [
      {
        value: '',
        label: 'Birim seçin',
        isActive: true,
      },
      ...unitSelectOptions.map((option) => ({
        ...option,
        label: option.label + (option.isActive ? '' : ' (pasif)'),
      })),
    ]
  }, [unitSelectOptions, unitOptionsLoading])

  const currencyOptions = useMemo(() => {
    const set = new Set(DEFAULT_CURRENCIES)
    items.forEach((item: any) => {
      if (item.currency) {
        set.add(String(item.currency).toUpperCase())
      }
    })
    if (quotation?.currency) {
      set.add(String(quotation.currency).toUpperCase())
    }
    if (manualItem.currency) {
      set.add(manualItem.currency.toUpperCase())
    }
    return Array.from(set)
  }, [items, quotation?.currency, manualItem.currency])

  const orderedCurrencyTotals = useMemo(() => {
    const priority = new Map(DEFAULT_CURRENCIES.map((currency, index) => [currency, index]))
    return [...currencyTotals].sort((a, b) => {
      const aPriority = priority.has(a.currency) ? priority.get(a.currency)! : DEFAULT_CURRENCIES.length
      const bPriority = priority.has(b.currency) ? priority.get(b.currency)! : DEFAULT_CURRENCIES.length
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      return a.currency.localeCompare(b.currency)
    })
  }, [currencyTotals])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Teklif bulunamadı</p>
        <Link href="/quotations">
          <Button className="mt-4">Tekliflere Dön</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/quotations">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tekliflere Dön
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            {isEditing ? (
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-2xl font-bold"
                disabled={saving}
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900">{quotation.name}</h1>
            )}
            <Badge className={getStatusColor(quotation.status)}>
              {getStatusLabel(quotation.status)}
            </Badge>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-gray-600">
            <span>{quotation.quotation_number}</span>
            <span>•</span>
            <span>{versionLabelDisplay}</span>
            {lastUpdatedText && (
              <>
                <span>•</span>
                <span>Değiştirilme: {lastUpdatedText}</span>
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                <X className="mr-2 h-4 w-4" />
                İptal
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Düzenle
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Müşteri</div>
            {isEditing ? (
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                disabled={saving}
              >
                <option value="">Seçilmedi</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-lg font-semibold text-gray-900">
                {quotation.customer_name || '-'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Oluşturan</div>
            <div className="text-lg font-semibold text-gray-900">
              {quotation.created_by_name || 'Bilinmiyor'}
            </div>
            <div className="text-xs text-gray-500">
              {quotation.created_at
                ? new Date(quotation.created_at).toLocaleString('tr-TR')
                : ''}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-500">Toplam Maliyet</div>
            <div className="text-2xl font-bold text-blue-600">
              {Number(totalCostTry || 0).toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              TRY
            </div>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              {orderedCurrencyTotals.length === 0 ? (
                <span>Henüz maliyet bilgisi yok</span>
              ) : (
                orderedCurrencyTotals.map((total) => (
                  <div key={total.currency} className="flex items-center justify-between gap-2">
                    <span>
                      {Number(total.amount || 0).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      {total.currency}
                    </span>
                    {total.currency !== 'TRY' && (
                      <span className="text-xs text-gray-500">
                        ≈{' '}
                        {Number(total.amount_try || 0).toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        TRY
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="text-xs text-gray-500">{items.length} ürün</div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {(isEditing || quotation.description) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Açıklama</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Teklif hakkında notlar..."
                disabled={saving}
              />
            ) : (
              <p className="whitespace-pre-wrap text-gray-700">
                {quotation.description || 'Açıklama eklenmemiş'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Malzeme Listesi</span>
              <div className="flex items-center gap-2">
                <Button
                  variant={showManualItemForm ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (showManualItemForm) {
                      resetManualItemForm()
                    }
                    setShowManualItemForm((prev) => !prev)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Yeni Satır
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStockPanel(!showStockPanel)}
                >
                  <Package className="mr-2 h-4 w-4" />
                  {showStockPanel ? 'Stok Kartlarını Gizle' : 'Stok Kartlarından Ekle'}
                </Button>
                <Calculator className="h-5 w-5 text-gray-400" />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div
                className={`${materialsGridTemplate} border-b pb-2 text-xs font-semibold text-gray-600`}
              >
                <div className="text-center">#</div>
                <div>Ürün Adı</div>
                <div>Ürün Kodu</div>
                <div>Açıklama</div>
                <div className="text-right">Miktar</div>
                <div className="text-center">Birim</div>
                <div className="text-right">Birim Fiyat / Para Birimi</div>
                <div className="text-right">Toplam</div>
                <div></div>
              </div>

              {showManualItemForm && (
                <div
                  className={`${materialsGridTemplate} items-center rounded border border-dashed border-blue-300 bg-blue-50/60 px-2 py-3 text-sm`}
                >
                  <div className="flex justify-center text-xs font-semibold uppercase text-blue-500">
                    Yeni
                  </div>
                  <Input
                    value={manualItem.product_name}
                    onChange={(e) => handleManualItemChange('product_name', e.target.value)}
                    placeholder="Ürün adı *"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={manualItem.product_code}
                    onChange={(e) => handleManualItemChange('product_code', e.target.value)}
                    placeholder="Ürün kodu"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={manualItem.notes}
                    onChange={(e) => handleManualItemChange('notes', e.target.value)}
                    placeholder="Açıklama"
                    className="h-8 text-xs"
                  />
                  <Input
                    value={manualItem.quantity}
                    onChange={(e) => handleManualItemChange('quantity', e.target.value)}
                    type="number"
                    step="0.001"
                    min="0"
                    className="h-8 text-xs text-right"
                  />
                  <select
                    value={manualItem.unit}
                    onChange={(e) => handleManualItemChange('unit', e.target.value)}
                    className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs text-center"
                    disabled={unitOptionsLoading || unitSelectOptions.length === 0}
                  >
                    {unitSelectOptionsWithPlaceholder.map((option) => (
                      <option
                        key={option.value || 'placeholder'}
                        value={option.value}
                        disabled={!option.value && unitSelectOptions.length === 0}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <select
                      value={manualItem.currency}
                      onChange={(e) => handleManualItemChange('currency', e.target.value)}
                      className="h-8 min-w-[80px] rounded-md border border-gray-300 bg-white px-2 text-xs"
                    >
                      {currencyOptions.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={manualItem.unit_cost}
                      onChange={(e) => handleManualItemChange('unit_cost', e.target.value)}
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8 min-w-[110px] text-xs text-right"
                    />
                  </div>
                  <div className="flex flex-col items-end rounded bg-white px-2 py-1 text-xs font-semibold text-blue-700">
                    <span>
                      {manualItemTotal.toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      {manualItem.currency || 'TRY'}
                    </span>
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddManualItem}
                      disabled={
                        addingManualItem || unitSelectOptions.length === 0 || currencyOptions.length === 0
                      }
                    >
                      {addingManualItem ? 'Ekleniyor...' : 'Ekle'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        resetManualItemForm()
                        setShowManualItemForm(false)
                      }}
                      disabled={addingManualItem}
                    >
                      Vazgeç
                    </Button>
                  </div>
                </div>
              )}

              {items.length === 0 ? (
                <p className="rounded border border-dashed border-gray-300 py-6 text-center text-sm text-gray-500">
                  Henüz ürün eklenmedi. Stok kartlarından veya «Yeni Satır» ile malzeme ekleyin.
                </p>
              ) : (
                items.map((item: any, index: number) => {
                  const quantityValue = Number(item.quantity ?? 0)
                  const unitCostValue = Number(item.unit_cost ?? 0)
                  const currencyCode = (item.currency || 'TRY').toUpperCase()
                  const totalDisplay = Number(item.total_cost || 0).toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                  })
                  const totalDisplayTry = Number(item.total_cost_try || 0).toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })

                  return (
                    <div
                      key={item.id}
                      className={`${materialsGridTemplate} items-center rounded border bg-gray-50 px-2 py-3 text-sm hover:bg-gray-100`}
                    >
                      <div className="flex justify-center">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                          {index + 1}
                        </span>
                      </div>
                      <Input
                        key={`${item.id}-name-${item.product_name ?? ''}`}
                        defaultValue={item.product_name ?? ''}
                        placeholder="Ürün adı"
                        className="h-8 text-xs"
                        onBlur={(e) => {
                          const value = e.target.value.trim()
                          const original = item.product_name ?? ''
                          if (!value) {
                            e.target.value = original
                            toast.error('Ürün adı gerekli')
                            return
                          }
                          if (value === original) return
                          handleUpdateItem(item.id, 'product_name', value)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur()
                          }
                        }}
                      />
                      <Input
                        key={`${item.id}-code-${item.product_code ?? ''}`}
                        defaultValue={item.product_code ?? ''}
                        placeholder="Ürün kodu"
                        className="h-8 text-xs"
                        onBlur={(e) => {
                          const value = e.target.value.trim()
                          const original = item.product_code ?? ''
                          if (value === original) return
                          handleUpdateItem(item.id, 'product_code', value || null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur()
                          }
                        }}
                      />
                      <Input
                        key={`${item.id}-notes-${item.notes ?? ''}`}
                        defaultValue={item.notes ?? ''}
                        placeholder="Açıklama"
                        className="h-8 text-xs"
                        onBlur={(e) => {
                          const value = e.target.value.trim()
                          const original = item.notes ?? ''
                          if (value === original) return
                          handleUpdateItem(item.id, 'notes', value || null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur()
                          }
                        }}
                      />
                      <Input
                        key={`${item.id}-quantity-${item.quantity ?? ''}`}
                        type="number"
                        step="0.001"
                        min="0"
                        defaultValue={item.quantity ?? ''}
                        className="h-8 text-xs text-right"
                        onBlur={(e) => {
                          const raw = e.target.value
                          if (!raw.trim()) {
                            e.target.value = item.quantity ?? ''
                            return
                          }
                          const parsed = parseFloat(raw)
                          if (Number.isNaN(parsed) || parsed < 0) {
                            toast.error('Miktar geçersiz')
                            e.target.value = item.quantity ?? ''
                            return
                          }
                          if (parsed === quantityValue) return
                          handleUpdateItem(item.id, 'quantity', parsed)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur()
                          }
                        }}
                      />
                      <select
                        value={item.unit || ''}
                        onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value || null)}
                        className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs text-center"
                      >
                        {unitSelectOptionsWithPlaceholder.map((option) => (
                          <option key={option.value || 'placeholder'} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <select
                          value={currencyCode}
                          onChange={(e) => handleUpdateItem(item.id, 'currency', e.target.value)}
                          className="h-8 min-w-[80px] rounded-md border border-gray-300 bg-white px-2 text-xs"
                        >
                          {currencyOptions.map((currency) => (
                            <option key={`${item.id}-${currency}`} value={currency}>
                              {currency}
                            </option>
                          ))}
                        </select>
                        <Input
                          key={`${item.id}-unitcost-${item.unit_cost ?? ''}`}
                          type="number"
                          step="0.01"
                          min="0"
                          defaultValue={item.unit_cost ?? ''}
                          className="h-8 min-w-[110px] text-xs text-right"
                          onBlur={(e) => {
                            const raw = e.target.value
                            if (!raw.trim()) {
                              e.target.value = item.unit_cost ?? ''
                              return
                            }
                            const parsed = parseFloat(raw)
                            if (Number.isNaN(parsed) || parsed < 0) {
                              toast.error('Birim fiyat geçersiz')
                              e.target.value = item.unit_cost ?? ''
                              return
                            }
                            if (parsed === unitCostValue) return
                            handleUpdateItem(item.id, 'unit_cost', parsed)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur()
                            }
                          }}
                        />
                      </div>
                      <div className="flex flex-col items-end rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                        <span>
                          {totalDisplay} {currencyCode}
                        </span>
                        {currencyCode !== 'TRY' && (
                          <span className="text-[11px] font-normal text-gray-600">
                            ≈ {totalDisplayTry} TRY
                          </span>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id, item.product_name)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}

              <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-semibold text-blue-900">TOPLAM MALİYET (TRY)</span>
                  <span className="text-2xl font-bold text-blue-700">
                    {Number(totalCostTry || 0).toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    TRY
                  </span>
                </div>
                {orderedCurrencyTotals.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs text-blue-900">
                    {orderedCurrencyTotals.map((total) => (
                      <div key={`summary-${total.currency}`} className="flex items-center justify-between gap-2">
                        <span>
                          {Number(total.amount || 0).toLocaleString('tr-TR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          {total.currency}
                        </span>
                        {total.currency !== 'TRY' && (
                          <span className="text-[11px] text-blue-700/80">
                            ≈ {Number(total.amount_try || 0).toLocaleString('tr-TR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            TRY
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Right Sidebar: Stock Cards Panel */}
      {showStockPanel && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowStockPanel(false)}
          />

          {/* Sliding Panel */}
          <div className="fixed right-0 top-0 bottom-0 w-[500px] bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Stok Kartları</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStockPanel(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Ürün ara..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Selected Count & Add Button */}
              {selectedStockIds.size > 0 && (
                <div className="mb-4 rounded-lg bg-blue-50 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-blue-900">
                      {selectedStockIds.size} ürün seçildi
                    </span>
                    <Button size="sm" onClick={handleAddSelectedItems} disabled={addingItems}>
                      <Plus className="mr-1 h-3 w-3" />
                      {addingItems ? 'Ekleniyor...' : 'Seçilenleri Ekle'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Stock List */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {Object.keys(filteredGroupedStocks).length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    {stockSearch ? 'Arama sonucu bulunamadı' : 'Stok kartı bulunamadı'}
                  </p>
                ) : (
                  Object.entries(filteredGroupedStocks).map(([category, categoryStocks]: [string, any]) => (
                    <div key={category} className="rounded-lg border">
                      <div className="bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
                        {category}
                      </div>
                      <div className="divide-y">
                        {categoryStocks.map((stock: any) => {
                          const isSelected = selectedStockIds.has(stock.id)
                          return (
                            <button
                              key={stock.id}
                              type="button"
                              onClick={() => {
                                const newSet = new Set(selectedStockIds)
                                if (isSelected) {
                                  newSet.delete(stock.id)
                                } else {
                                  newSet.add(stock.id)
                                }
                                setSelectedStockIds(newSet)
                              }}
                              className={`group flex w-full items-center justify-between px-3 py-2 text-left transition-colors ${
                                isSelected
                                  ? 'bg-blue-50'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="rounded"
                                />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {stock.product_name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {stock.product_code} • {stock.unit_price || 0} {stock.currency}
                                  </div>
                                </div>
                              </div>
                              <Package className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
