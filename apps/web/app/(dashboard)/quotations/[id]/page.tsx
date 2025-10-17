'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { quotationsAPI, stocksAPI, customersAPI } from '@/lib/api/client'
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

  useEffect(() => {
    if (params.id) {
      loadQuotation()
      loadStocks()
      loadCustomers()
    }
  }, [params.id])

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

  async function handleUpdateItem(itemId: string, field: string, value: any) {
    try {
      const updateData: any = {}
      updateData[field] = value

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

  const items = quotation.items || []
  const totalCost = quotation.total_cost || 0

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
          <p className="text-gray-600">
            {quotation.quotation_number} • Versiyon {quotation.version}
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
              {Number(totalCost).toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              {quotation.currency || 'TRY'}
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
            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
                Henüz ürün eklenmedi. Sağdaki listeden ürün ekleyin.
              </p>
            ) : (
              <div className="space-y-3">
                {/* Header Row */}
                <div className="grid grid-cols-[40px_2fr_1fr_80px_1fr_1fr_40px] gap-2 border-b pb-2 text-xs font-semibold text-gray-600">
                  <div className="text-center">#</div>
                  <div>Ürün Adı</div>
                  <div className="text-right">Miktar</div>
                  <div className="text-center">Birim</div>
                  <div className="text-right">Birim Fiyat</div>
                  <div className="text-right">Toplam</div>
                  <div></div>
                </div>

                {/* Items */}
                {items.map((item: any, index: number) => (
                  <div key={item.id} className="grid grid-cols-[40px_2fr_1fr_80px_1fr_1fr_40px] gap-2 items-center rounded border bg-gray-50 px-2 py-2 text-sm hover:bg-gray-100">
                    <div className="flex justify-center">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                        {index + 1}
                      </span>
                    </div>
                    <div className="truncate">
                      <div className="font-medium text-gray-900 truncate">{item.product_name}</div>
                      <div className="text-xs text-gray-500 truncate">
                        {item.product_code && `${item.product_code}`}
                        {item.category && ` • ${item.category}`}
                      </div>
                    </div>
                    <div>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={item.quantity || ''}
                        onChange={(e) =>
                          handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs text-right"
                      />
                    </div>
                    <div className="text-center text-xs text-gray-600">
                      {item.unit || '-'}
                    </div>
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_cost || ''}
                        onChange={(e) =>
                          handleUpdateItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs text-right"
                      />
                    </div>
                    <div className="flex items-center justify-end rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                      {Number(item.total_cost || 0).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                      })}
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
                ))}

                {/* Summary */}
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-blue-900">
                      TOPLAM MALİYET
                    </span>
                    <span className="text-2xl font-bold text-blue-700">
                      {Number(totalCost).toLocaleString('tr-TR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      {quotation.currency || 'TRY'}
                    </span>
                  </div>
                </div>
              </div>
            )}
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
