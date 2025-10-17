'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Package, CheckCircle, XCircle, Clock } from 'lucide-react'
import { purchaseOrdersAPI, stocksAPI } from '@/lib/api/client'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
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

export default function PurchaseOrdersPage() {
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const pendingOrders = orders.filter(o => o.status === 'PENDING')
  const deliveredOrders = orders.filter(o => o.status === 'DELIVERED')
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
                <p className="text-2xl font-bold">{pendingOrders.length}</p>
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
                <p className="text-2xl font-bold">{deliveredOrders.length}</p>
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
          {orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz sipariş kaydı yok
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Sipariş Kodu</th>
                    <th className="text-left p-2">Ürün</th>
                    <th className="text-right p-2">Miktar</th>
                    <th className="text-right p-2">Birim Fiyat</th>
                    <th className="text-right p-2">Toplam</th>
                    <th className="text-left p-2">Tedarikçi</th>
                    <th className="text-left p-2">Sipariş Tarihi</th>
                    <th className="text-left p-2">Teslim Tarihi</th>
                    <th className="text-left p-2">Durum</th>
                    <th className="text-right p-2">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono text-sm">{order.order_code}</td>
                      <td className="p-2">
                        <div className="font-medium">{order.product_name}</div>
                        <div className="text-xs text-muted-foreground">{order.product_code}</div>
                      </td>
                      <td className="p-2 text-right">
                        {order.quantity} {order.unit}
                      </td>
                      <td className="p-2 text-right">
                        {order.unit_price.toLocaleString('tr-TR')} {order.currency}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {order.total_value.toLocaleString('tr-TR')} {order.currency}
                      </td>
                      <td className="p-2 text-sm">{order.supplier_name}</td>
                      <td className="p-2 text-sm">
                        {new Date(order.order_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="p-2 text-sm">
                        {order.expected_delivery_date
                          ? new Date(order.expected_delivery_date).toLocaleDateString('tr-TR')
                          : '-'}
                      </td>
                      <td className="p-2">
                        {order.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-1 rounded text-sm">
                            <Clock className="w-4 h-4" />
                            Bekliyor
                          </span>
                        )}
                        {order.status === 'DELIVERED' && (
                          <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded text-sm">
                            <CheckCircle className="w-4 h-4" />
                            Teslim Edildi
                          </span>
                        )}
                        {order.status === 'CANCELLED' && (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded text-sm">
                            <XCircle className="w-4 h-4" />
                            İptal
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex justify-end gap-2">
                          {order.status === 'PENDING' && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openDeliverDialog(order.id)}
                              >
                                Teslim Al
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancel(order.id)}
                              >
                                İptal
                              </Button>
                            </>
                          )}
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