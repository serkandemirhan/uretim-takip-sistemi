'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { purchaseRequestsAPI } from '@/lib/api/procurement'
import { jobsAPI, apiClient } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, X, Search, Package } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/utils/error-handler'
import PriorityBadge from '@/components/features/procurement/PriorityBadge'

interface MaterialItem {
  product_id: string
  product_code: string
  product_name: string
  quantity: number
  unit: string
  unit_price?: number
  currency?: string
  notes?: string
}

export default function NewPurchaseRequestPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [jobs, setJobs] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [stocks, setStocks] = useState<any[]>([])
  const [stockSearch, setStockSearch] = useState('')
  const [showStockPanel, setShowStockPanel] = useState(false)

  const [formData, setFormData] = useState({
    quotation_id: '',
    job_id: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    required_date: '',
    notes: '',
  })

  const [items, setItems] = useState<MaterialItem[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [jobsRes, stocksRes, quotationsRes] = await Promise.all([
        jobsAPI.getAll(),
        apiClient.get('/api/stocks'),
        apiClient.get('/api/quotations'),
      ])

      setJobs(jobsRes.data || [])
      setStocks(stocksRes.data?.data || stocksRes.data || [])
      setQuotations(quotationsRes.data?.data || quotationsRes.data || [])
    } catch (error) {
      handleApiError(error, 'Load data')
    }
  }

  const filteredStocks = stocks.filter((stock) => {
    const term = stockSearch.toLowerCase()
    return (
      stock.product_code?.toLowerCase().includes(term) ||
      stock.product_name?.toLowerCase().includes(term)
    )
  })

  function addStockItem(stock: any) {
    const exists = items.find((item) => item.product_id === stock.id)
    if (exists) {
      toast.error('Bu ürün zaten eklenmiş')
      return
    }

    setItems([
      ...items,
      {
        product_id: stock.id,
        product_code: stock.product_code,
        product_name: stock.product_name,
        quantity: 1,
        unit: stock.unit || 'adet',
        unit_price: 0,
        currency: 'TRY',
        notes: '',
      },
    ])
    setShowStockPanel(false)
    setStockSearch('')
    toast.success('Ürün eklendi')
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof MaterialItem, value: any) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (items.length === 0) {
      toast.error('En az bir ürün eklemelisiniz')
      return
    }

    setLoading(true)

    try {
      const requestData = {
        quotation_id: formData.quotation_id || null,
        job_id: formData.job_id || null,
        priority: formData.priority,
        required_date: formData.required_date || null,
        notes: formData.notes || null,
        items: items.map((item) => ({
          product_id: item.product_id,
          product_code: item.product_code,
          product_name: item.product_name,
          quantity: Number(item.quantity),
          unit: item.unit,
          unit_price: item.unit_price ? Number(item.unit_price) : null,
          currency: item.currency || 'TRY',
          notes: item.notes || null,
        })),
      }

      const response = await purchaseRequestsAPI.create(requestData)
      toast.success('Satın alma talebi oluşturuldu!')
      router.push(`/procurement/requests/${response.data.id}`)
    } catch (error: any) {
      handleApiError(error, 'Purchase request create')
      toast.error(error.response?.data?.error || 'Talep oluşturulurken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-full space-y-6">
      <Link href="/procurement/requests">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Taleplere Dön
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">Yeni Satın Alma Talebi</h1>
        <p className="text-gray-600 mt-1">Yeni bir satın alma talebi oluşturun</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Temel Bilgiler */}
          <Card>
            <CardHeader>
              <CardTitle>Talep Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job_id">İş (İsteğe Bağlı)</Label>
                <select
                  id="job_id"
                  value={formData.job_id}
                  onChange={(e) => setFormData({ ...formData, job_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={loading}
                >
                  <option value="">İş Seç</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} - {job.job_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quotation_id">Teklif (İsteğe Bağlı)</Label>
                <select
                  id="quotation_id"
                  value={formData.quotation_id}
                  onChange={(e) => setFormData({ ...formData, quotation_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={loading}
                >
                  <option value="">Teklif Seç</option>
                  {quotations.map((quot) => (
                    <option key={quot.id} value={quot.id}>
                      {quot.quotation_number} - {quot.title || 'Başlıksız'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="priority">Öncelik</Label>
                  <select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={loading}
                  >
                    <option value="low">Düşük</option>
                    <option value="medium">Normal</option>
                    <option value="high">Yüksek</option>
                    <option value="urgent">Acil</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="required_date">İhtiyaç Tarihi</Label>
                  <Input
                    id="required_date"
                    type="date"
                    value={formData.required_date}
                    onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notlar</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Talep ile ilgili notlar..."
                  rows={4}
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Önizleme */}
          <Card>
            <CardHeader>
              <CardTitle>Talep Özeti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Öncelik:</span>
                <PriorityBadge priority={formData.priority} />
              </div>
              {formData.job_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">İş:</span>
                  <span className="font-medium">
                    {jobs.find((j) => j.id === formData.job_id)?.title || '-'}
                  </span>
                </div>
              )}
              {formData.quotation_id && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Teklif:</span>
                  <span className="font-medium">
                    {quotations.find((q) => q.id === formData.quotation_id)?.quotation_number ||
                      '-'}
                  </span>
                </div>
              )}
              {formData.required_date && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">İhtiyaç Tarihi:</span>
                  <span className="font-medium">{formData.required_date}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-3 border-t">
                <span className="text-gray-600">Toplam Ürün:</span>
                <span className="font-bold">{items.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Malzeme Listesi */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Talep Edilen Malzemeler
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">Hangi malzemeler talep edilecek?</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowStockPanel(true)}
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-2" />
                Malzeme Ekle
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 mb-3">Henüz malzeme eklenmedi</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowStockPanel(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  İlk Malzemeyi Ekle
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-3 px-3 text-xs font-semibold text-gray-500 uppercase">
                  <span className="col-span-3">Ürün</span>
                  <span className="col-span-2">Miktar</span>
                  <span className="col-span-1">Birim</span>
                  <span className="col-span-2">Birim Fiyat</span>
                  <span className="col-span-3">Notlar</span>
                  <span className="col-span-1"></span>
                </div>
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-3 items-center border rounded-lg bg-gray-50 p-3"
                  >
                    <div className="col-span-3">
                      <p className="text-sm font-semibold text-gray-900">{item.product_name}</p>
                      <p className="text-xs text-gray-500">{item.product_code}</p>
                    </div>

                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="col-span-1">
                      <Input
                        type="text"
                        value={item.unit}
                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                        className="h-9 text-sm"
                        placeholder="adet"
                      />
                    </div>

                    <div className="col-span-2 flex gap-1">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price || ''}
                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        className="h-9 text-sm flex-1"
                        placeholder="0.00"
                      />
                      <select
                        value={item.currency}
                        onChange={(e) => updateItem(index, 'currency', e.target.value)}
                        className="h-9 border border-gray-300 rounded-md px-2 text-sm"
                      >
                        <option value="TRY">TRY</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>

                    <div className="col-span-3">
                      <Input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => updateItem(index, 'notes', e.target.value)}
                        className="h-9 text-sm"
                        placeholder="Opsiyonel notlar"
                      />
                    </div>

                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading || items.length === 0}>
            {loading ? 'Oluşturuluyor...' : 'Talep Oluştur (Taslak)'}
          </Button>
          <Link href="/procurement/requests">
            <Button type="button" variant="outline" disabled={loading}>
              İptal
            </Button>
          </Link>
        </div>
      </form>

      {/* Stock Selection Panel */}
      {showStockPanel && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowStockPanel(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Malzeme Seç</h2>
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

            <div className="flex flex-col flex-1 overflow-hidden p-4">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Ürün kodu veya adı ara..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredStocks.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-500">
                    {stockSearch ? 'Arama sonucu bulunamadı' : 'Stokta ürün bulunmuyor'}
                  </p>
                ) : (
                  filteredStocks.map((stock) => {
                    const alreadyAdded = items.some((item) => item.product_id === stock.id)
                    return (
                      <button
                        key={stock.id}
                        type="button"
                        onClick={() => addStockItem(stock)}
                        disabled={alreadyAdded}
                        className={`flex w-full items-center justify-between px-4 py-3 text-left border rounded-lg transition-colors ${
                          alreadyAdded
                            ? 'bg-gray-50 cursor-not-allowed opacity-50'
                            : 'hover:bg-blue-50 hover:border-blue-300'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {stock.product_name}
                          </div>
                          <div className="text-xs text-gray-500">{stock.product_code}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            {stock.quantity} {stock.unit}
                          </div>
                          <div className="text-xs text-gray-500">Mevcut Stok</div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
