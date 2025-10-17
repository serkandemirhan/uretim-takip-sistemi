'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, ArrowUpCircle, ArrowDownCircle, Plus, Package, Upload } from 'lucide-react'
import { stockMovementsAPI, stocksAPI, jobsAPI } from '@/lib/api/client'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { handleError } from '@/lib/utils/error-handler'
import { FileUpload } from '@/components/features/files/FileUpload'
import { FileList } from '@/components/features/files/FileList'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Movement = {
  id: string
  stock_id: string
  product_code: string
  product_name: string
  unit: string
  movement_type: 'IN' | 'OUT'
  quantity: number
  unit_price?: number
  currency?: string
  total_value: number
  job_id?: string
  job_number?: string
  job_title?: string
  purpose?: string
  document_no?: string
  notes?: string
  created_at: string
  created_by_name?: string
}

type Stock = {
  id: string
  product_code: string
  product_name: string
  unit: string
  current_quantity: number
}

type Job = {
  id: string
  job_number: string
  title: string
}

export default function StockMovementsPage() {
  const [loading, setLoading] = useState(true)
  const [movements, setMovements] = useState<Movement[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    stock_id: '',
    movement_type: 'IN' as 'IN' | 'OUT',
    quantity: '',
    unit_price: '',
    currency: 'TRY',
    job_id: '',
    purpose: '',
    document_no: '',
    notes: '',
  })

  useEffect(() => {
    void loadMovements()
    void loadStocks()
    void loadJobs()
  }, [])

  async function loadMovements() {
    setLoading(true)
    try {
      const res = await stockMovementsAPI.getAll()
      const raw = Array.isArray(res?.data) ? res.data : []
      setMovements(raw)
    } catch (err) {
      handleError(err, { title: 'Stok hareketleri yüklenemedi' })
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

  async function loadJobs() {
    try {
      const res = await jobsAPI.getAll()
      const raw = Array.isArray(res?.data) ? res.data : []
      setJobs(raw)
    } catch (err) {
      console.error('Jobs error:', err)
    }
  }

  function openDialog() {
    setForm({
      stock_id: '',
      movement_type: 'IN',
      quantity: '',
      unit_price: '',
      currency: 'TRY',
      job_id: '',
      purpose: '',
      document_no: '',
      notes: '',
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.stock_id || !form.quantity) {
      toast.error('Stok ve miktar zorunludur')
      return
    }

    const qty = parseFloat(form.quantity)
    if (qty <= 0) {
      toast.error('Miktar 0\'dan büyük olmalıdır')
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        stock_id: form.stock_id,
        movement_type: form.movement_type,
        quantity: qty,
        unit_price: form.unit_price ? parseFloat(form.unit_price) : null,
        currency: form.currency || null,
        job_id: form.job_id || null,
        purpose: form.purpose || null,
        document_no: form.document_no || null,
        notes: form.notes || null,
      }

      await stockMovementsAPI.create(payload)
      toast.success(`Stok ${form.movement_type === 'IN' ? 'girişi' : 'çıkışı'} kaydedildi`)
      setDialogOpen(false)
      await loadMovements()
    } catch (err) {
      handleError(err, { title: 'Kaydetme hatası' })
    } finally {
      setSaving(false)
    }
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
          <h1 className="text-3xl font-bold">Stok Hareketleri</h1>
          <p className="text-muted-foreground">Tüm giriş ve çıkış hareketleri</p>
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
            Yeni Hareket
          </Button>
        </div>
      </div>

      {/* Movements List */}
      <Card>
        <CardContent className="pt-6">
          {movements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz hareket kaydı yok
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Tarih</th>
                    <th className="text-left p-2">Tip</th>
                    <th className="text-left p-2">Ürün</th>
                    <th className="text-right p-2">Miktar</th>
                    <th className="text-right p-2">Birim Fiyat</th>
                    <th className="text-right p-2">Toplam</th>
                    <th className="text-left p-2">Proje</th>
                    <th className="text-left p-2">Amaç</th>
                    <th className="text-left p-2">Kullanıcı</th>
                    <th className="text-right p-2">Detay</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 text-sm">
                        {new Date(movement.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="p-2">
                        {movement.movement_type === 'IN' ? (
                          <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded text-sm">
                            <ArrowUpCircle className="w-4 h-4" />
                            Giriş
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded text-sm">
                            <ArrowDownCircle className="w-4 h-4" />
                            Çıkış
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="font-medium">{movement.product_name}</div>
                        <div className="text-xs text-muted-foreground">{movement.product_code}</div>
                      </td>
                      <td className="p-2 text-right font-medium">
                        {movement.quantity} {movement.unit}
                      </td>
                      <td className="p-2 text-right">
                        {movement.unit_price
                          ? `${movement.unit_price.toLocaleString('tr-TR')} ${movement.currency}`
                          : '-'}
                      </td>
                      <td className="p-2 text-right font-medium">
                        {movement.total_value > 0
                          ? `${movement.total_value.toLocaleString('tr-TR')} ${movement.currency}`
                          : '-'}
                      </td>
                      <td className="p-2 text-sm">
                        {movement.job_number ? (
                          <div>
                            <div className="font-medium">{movement.job_number}</div>
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {movement.job_title}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-2 text-sm">{movement.purpose || '-'}</td>
                      <td className="p-2 text-sm">{movement.created_by_name || '-'}</td>
                      <td className="p-2 text-right">
                        <Link href={`/stocks/movements/${movement.id}`}>
                          <Button size="sm" variant="ghost">
                            <Upload className="w-4 h-4 mr-1" />
                            Belgeler
                          </Button>
                        </Link>
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
            <DialogTitle>Yeni Stok Hareketi</DialogTitle>
            <DialogDescription>
              Stok giriş veya çıkış kaydı oluştur
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Hareket Tipi *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.movement_type}
                  onChange={(e) => setForm({ ...form, movement_type: e.target.value as 'IN' | 'OUT' })}
                >
                  <option value="IN">Giriş (Stok Ekle)</option>
                  <option value="OUT">Çıkış (Stok Azalt)</option>
                </select>
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
                      {stock.product_code} - {stock.product_name} (Mevcut: {stock.current_quantity} {stock.unit})
                    </option>
                  ))}
                </select>
              </div>
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
                <label className="text-sm font-medium">Birim Fiyat</label>
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

            {form.movement_type === 'OUT' && (
              <div>
                <label className="text-sm font-medium">Proje (Opsiyonel)</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.job_id}
                  onChange={(e) => setForm({ ...form, job_id: e.target.value })}
                >
                  <option value="">Genel Amaçlı</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.job_number} - {job.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Amaç / Açıklama</label>
              <Input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="Örn: Fire, kayıp, proje ihtiyacı..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">Belge No (Fatura/İrsaliye)</label>
              <Input
                value={form.document_no}
                onChange={(e) => setForm({ ...form, document_no: e.target.value })}
                placeholder="Örn: FT-2024-001"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Notlar</label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
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