'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ArrowUpCircle, Search, Plus } from 'lucide-react'
import { stockMovementsAPI, stocksAPI, jobsAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { handleError } from '@/lib/utils/error-handler'
import { FileUpload } from '@/components/features/files/FileUpload'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'

type Stock = {
  id: string
  product_code: string
  product_name: string
  unit: string
  current_quantity: number
  category?: string
}

type Job = {
  id: string
  job_number: string
  title: string
  customer_name?: string
}

export default function NewStockInPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [stocks, setStocks] = useState<Stock[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [showStockSheet, setShowStockSheet] = useState(false)
  const [showJobSheet, setShowJobSheet] = useState(false)
  const [stockSearch, setStockSearch] = useState('')
  const [jobSearch, setJobSearch] = useState('')

  const [form, setForm] = useState({
    stock_id: '',
    quantity: '',
    unit_price: '',
    currency: 'TRY',
    job_id: '',
    purpose: '',
    document_no: '',
    notes: '',
  })

  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  useEffect(() => {
    void loadStocks()
    void loadJobs()
  }, [])

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

  function selectStock(stock: Stock) {
    setForm({ ...form, stock_id: stock.id })
    setShowStockSheet(false)
  }

  function selectJob(job: Job) {
    setForm({ ...form, job_id: job.id })
    setShowJobSheet(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.stock_id || !form.quantity) {
      toast.error('Lütfen stok kartı ve miktar giriniz')
      return
    }

    try {
      setSaving(true)

      const payload = {
        stock_id: form.stock_id,
        movement_type: 'IN' as const,
        quantity: parseFloat(form.quantity),
        unit_price: form.unit_price ? parseFloat(form.unit_price) : undefined,
        currency: form.currency || 'TRY',
        job_id: form.job_id || undefined,
        purpose: form.purpose || undefined,
        document_no: form.document_no || undefined,
        notes: form.notes || undefined,
      }

      const response = await stockMovementsAPI.create(payload)

      // Upload files if any
      if (uploadedFiles.length > 0 && response?.data?.id) {
        // Files are already uploaded to S3 and linked via FileUpload component
        console.log('Files uploaded:', uploadedFiles)
      }

      toast.success('Stok girişi kaydedildi')
      router.push('/stocks/movements')
    } catch (err) {
      handleError(err, { title: 'Kaydetme hatası' })
    } finally {
      setSaving(false)
    }
  }

  const selectedStock = stocks.find(s => s.id === form.stock_id)
  const selectedJob = jobs.find(j => j.id === form.job_id)

  const filteredStocks = stocks.filter(s =>
    s.product_name.toLowerCase().includes(stockSearch.toLowerCase()) ||
    s.product_code.toLowerCase().includes(stockSearch.toLowerCase())
  )

  const filteredJobs = jobs.filter(j =>
    j.job_number.toLowerCase().includes(jobSearch.toLowerCase()) ||
    j.title.toLowerCase().includes(jobSearch.toLowerCase())
  )

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/stocks/movements">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ArrowUpCircle className="w-8 h-8 text-green-600" />
            Yeni Stok Girişi
          </h1>
          <p className="text-muted-foreground">Depoya stok giriş kaydı oluşturun</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Giriş Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stock Selection */}
            <div className="space-y-2">
              <Label>Stok Kartı *</Label>
              <div className="flex gap-2">
                <Input
                  value={selectedStock ? `${selectedStock.product_name} (${selectedStock.product_code})` : ''}
                  placeholder="Stok kartı seçiniz"
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowStockSheet(true)}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Seç
                </Button>
              </div>
            </div>

            {/* Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Miktar *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Birim</Label>
                <Input
                  value={selectedStock?.unit || '-'}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {/* Price */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Birim Fiyat</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Para Birimi</Label>
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

            {/* Job Selection */}
            <div className="space-y-2">
              <Label>Proje (İsteğe Bağlı)</Label>
              <div className="flex gap-2">
                <Input
                  value={selectedJob ? `${selectedJob.job_number} - ${selectedJob.title}` : ''}
                  placeholder="Proje seçiniz (isteğe bağlı)"
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowJobSheet(true)}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Seç
                </Button>
                {form.job_id && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setForm({ ...form, job_id: '' })}
                  >
                    Temizle
                  </Button>
                )}
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label>Amaç</Label>
              <Input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                placeholder="Giriş amacı"
              />
            </div>

            {/* Document No */}
            <div className="space-y-2">
              <Label>Belge No</Label>
              <Input
                value={form.document_no}
                onChange={(e) => setForm({ ...form, document_no: e.target.value })}
                placeholder="İrsaliye/Fatura no"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ek notlar"
                rows={3}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>Belgeler</Label>
              <FileUpload
                refType="stock_movement"
                refId="temp"
                onFilesChange={(files) => setUploadedFiles(files.map(f => f.id))}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/stocks/movements')}
                disabled={saving}
              >
                İptal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Stock Selection Sheet */}
      <Sheet open={showStockSheet} onOpenChange={setShowStockSheet}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Stok Kartı Seç</SheetTitle>
            <SheetDescription>Aşağıdaki listeden stok kartı seçiniz</SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-4">
            <Input
              placeholder="Ürün adı veya kodu ile ara..."
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
            />

            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold">Kod</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold">Ürün Adı</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold">Kategori</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold">Stok</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold">Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStocks.map((stock, index) => (
                    <tr
                      key={stock.id}
                      className={cn(
                        'border-b hover:bg-blue-50 cursor-pointer transition-colors',
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      )}
                      onClick={() => selectStock(stock)}
                    >
                      <td className="px-4 py-2 text-sm font-mono">{stock.product_code}</td>
                      <td className="px-4 py-2 text-sm font-medium">{stock.product_name}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{stock.category || '-'}</td>
                      <td className="px-4 py-2 text-sm text-right">
                        {stock.current_quantity} {stock.unit}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            selectStock(stock)
                          }}
                        >
                          Seç
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Job Selection Sheet */}
      <Sheet open={showJobSheet} onOpenChange={setShowJobSheet}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Proje Seç</SheetTitle>
            <SheetDescription>Aşağıdaki listeden proje seçiniz</SheetDescription>
          </SheetHeader>

          <div className="py-4 space-y-4">
            <Input
              placeholder="Proje numarası veya başlık ile ara..."
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
            />

            <div className="border rounded-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold">Proje No</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold">Başlık</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold">Müşteri</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold">Aksiyon</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job, index) => (
                    <tr
                      key={job.id}
                      className={cn(
                        'border-b hover:bg-blue-50 cursor-pointer transition-colors',
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      )}
                      onClick={() => selectJob(job)}
                    >
                      <td className="px-4 py-2 text-sm font-mono">{job.job_number}</td>
                      <td className="px-4 py-2 text-sm font-medium">{job.title}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{job.customer_name || '-'}</td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            selectJob(job)
                          }}
                        >
                          Seç
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
