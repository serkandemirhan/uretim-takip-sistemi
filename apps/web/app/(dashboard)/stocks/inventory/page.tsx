'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, Plus, Trash2, AlertTriangle, Package, ArrowUpDown, ShoppingCart, Settings } from 'lucide-react'
import { stocksAPI, stockMovementsAPI, jobsAPI } from '@/lib/api/client'
import Link from 'next/link'
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

export default function StocksInventoryPage() {
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

  useEffect(() => {
    void loadStocks()
    void loadSummary()
  }, [])

  useEffect(() => {
    filterStocks()
  }, [stocks, q, showCriticalOnly])

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
          {filteredStocks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Stok bulunamadı
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Ürün Kodu</th>
                    <th className="text-left p-2">Ürün Adı</th>
                    <th className="text-left p-2">Kategori</th>
                    <th className="text-right p-2">Mevcut</th>
                    <th className="text-right p-2">Min</th>
                    <th className="text-right p-2">Birim Fiyat</th>
                    <th className="text-left p-2">Tedarikçi</th>
                    <th className="text-right p-2">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStocks.map((stock) => (
                    <tr
                      key={stock.id}
                      className={`border-b hover:bg-muted/50 ${stock.is_critical ? 'bg-orange-50' : ''}`}
                    >
                      <td className="p-2 font-mono text-sm">{stock.product_code}</td>
                      <td className="p-2 font-medium">{stock.product_name}</td>
                      <td className="p-2 text-sm">{stock.category || '-'}</td>
                      <td className="p-2 text-right">
                        <span className={stock.is_critical ? 'text-orange-600 font-bold' : ''}>
                          {stock.current_quantity} {stock.unit}
                        </span>
                      </td>
                      <td className="p-2 text-right text-sm text-muted-foreground">
                        {stock.min_quantity}
                      </td>
                      <td className="p-2 text-right">
                        {stock.unit_price
                          ? `${stock.unit_price.toLocaleString('tr-TR')} ${stock.currency}`
                          : '-'}
                      </td>
                      <td className="p-2 text-sm">{stock.supplier_name || '-'}</td>
                      <td className="p-2">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(stock)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(stock.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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