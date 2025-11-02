'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Save, Calendar } from 'lucide-react'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface RFQItem {
  id: string
  stock_id: string
  product_code: string
  product_name: string
  category: string
  quantity: number
  unit: string
}

interface Supplier {
  id: string
  name: string
}

interface QuotationItem {
  rfq_item_id: string
  unit_price: string
  quantity: string
  lead_time_days: string
  currency: string
  notes: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  rfqId: string
  rfqItems: RFQItem[]
  onSuccess: () => void
}

export default function SupplierQuotationDialog({
  open,
  onOpenChange,
  rfqId,
  rfqItems,
  onSuccess,
}: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)

  const [formData, setFormData] = useState({
    supplier_id: '',
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: '',
    payment_terms: '',
    delivery_terms: '',
    notes: '',
  })

  const [items, setItems] = useState<Record<string, QuotationItem>>({})

  useEffect(() => {
    if (open) {
      loadSuppliers()
      initializeItems()
      // Set default valid until date (30 days from now)
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + 30)
      setFormData((prev) => ({
        ...prev,
        valid_until: validUntil.toISOString().split('T')[0],
      }))
    }
  }, [open])

  const loadSuppliers = async () => {
    try {
      setLoadingSuppliers(true)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/procurement/suppliers?is_active=true`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Tedarikçi listesi yüklenemedi')

      const data = await res.json()
      setSuppliers(data.data || [])
    } catch (error: any) {
      toast.error(error.message || 'Tedarikçiler yüklenirken hata oluştu')
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const initializeItems = () => {
    const initialItems: Record<string, QuotationItem> = {}
    rfqItems.forEach((item) => {
      initialItems[item.id] = {
        rfq_item_id: item.id,
        unit_price: '',
        quantity: item.quantity.toString(),
        lead_time_days: '',
        currency: 'TRY',
        notes: '',
      }
    })
    setItems(initialItems)
  }

  const updateItem = (itemId: string, field: keyof QuotationItem, value: string) => {
    setItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.supplier_id) {
      toast.error('Lütfen tedarikçi seçin')
      return
    }

    // Validate all items have unit price
    const itemsArray = Object.values(items)
    const hasInvalidPrice = itemsArray.some((item) => !item.unit_price || parseFloat(item.unit_price) <= 0)
    if (hasInvalidPrice) {
      toast.error('Lütfen tüm malzemeler için birim fiyat girin')
      return
    }

    try {
      setSubmitting(true)
      const token = localStorage.getItem('token')

      const payload = {
        ...formData,
        items: itemsArray.map((item) => ({
          ...item,
          unit_price: parseFloat(item.unit_price),
          quantity: parseFloat(item.quantity),
          lead_time_days: item.lead_time_days ? parseInt(item.lead_time_days) : null,
        })),
      }

      const res = await fetch(`${API_URL}/api/procurement/rfq/${rfqId}/quotations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Teklif oluşturulamadı')
      }

      const result = await res.json()
      toast.success(`Teklif başarıyla oluşturuldu: ${result.quotation_number}`)
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Teklif oluşturulurken hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  const calculateTotal = () => {
    return Object.values(items).reduce((total, item) => {
      const price = parseFloat(item.unit_price) || 0
      const qty = parseFloat(item.quantity) || 0
      return total + price * qty
    }, 0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tedarikçi Teklifi Ekle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Supplier and Basic Info */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Teklif Bilgileri</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier_id">
                  Tedarikçi <span className="text-red-500">*</span>
                </Label>
                <select
                  id="supplier_id"
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm mt-1"
                  required
                >
                  <option value="">Tedarikçi seçin...</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="quotation_date">
                  Teklif Tarihi <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quotation_date"
                  type="date"
                  value={formData.quotation_date}
                  onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="valid_until">Geçerlilik Tarihi</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="payment_terms">Ödeme Koşulları</Label>
                <Input
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  placeholder="Örn: 30 gün vade"
                  className="mt-1"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="delivery_terms">Teslimat Koşulları</Label>
                <Input
                  id="delivery_terms"
                  value={formData.delivery_terms}
                  onChange={(e) => setFormData({ ...formData, delivery_terms: e.target.value })}
                  placeholder="Örn: 15 gün içinde"
                  className="mt-1"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Notlar</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {/* Items Table */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Malzeme Fiyatları</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Malzeme</th>
                    <th className="pb-2">Kod</th>
                  <th className="pb-2 text-right">Talep Miktarı</th>
                    <th className="pb-2 text-right">Teklif Miktar</th>
                    <th className="pb-2 text-right">Birim Fiyat *</th>
                    <th className="pb-2">Para Birimi</th>
                    <th className="pb-2 text-right">Tutar</th>
                    <th className="pb-2">Teslimat (Gün)</th>
                  </tr>
                </thead>
                <tbody>
                  {rfqItems.map((rfqItem, index) => {
                    const item = items[rfqItem.id]
                    if (!item) return null

                    const total =
                      (parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 0)

                    return (
                      <tr key={rfqItem.id} className="border-b">
                        <td className="py-2">{index + 1}</td>
                        <td className="py-2">
                          <div className="font-medium">{rfqItem.product_name}</div>
                          {rfqItem.category && (
                            <Badge variant="outline" className="text-xs mt-1">
                              {rfqItem.category}
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 text-xs text-gray-600">{rfqItem.product_code}</td>
                        <td className="py-2 text-right">
                          {rfqItem.quantity} {rfqItem.unit}
                        </td>
                        <td className="py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateItem(rfqItem.id, 'quantity', e.target.value)}
                            className="w-24 text-right"
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(rfqItem.id, 'unit_price', e.target.value)}
                            className="w-28 text-right"
                            required
                          />
                        </td>
                        <td className="py-2">
                          <select
                            value={item.currency}
                            onChange={(e) => updateItem(rfqItem.id, 'currency', e.target.value)}
                            className="w-20 px-2 py-1 rounded-md border border-gray-300 text-xs"
                          >
                            <option value="TRY">TRY</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                          </select>
                        </td>
                        <td className="py-2 text-right font-bold">
                          {total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2">
                          <Input
                            type="number"
                            value={item.lead_time_days}
                            onChange={(e) =>
                              updateItem(rfqItem.id, 'lead_time_days', e.target.value)
                            }
                            className="w-20"
                            placeholder="Gün"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td colSpan={7} className="py-3 text-right">
                      Toplam Tutar:
                    </td>
                    <td className="py-3 text-right text-lg">
                      {calculateTotal().toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TRY
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              İptal
            </Button>
            <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              {submitting ? 'Kaydediliyor...' : 'Teklifi Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Need to import Card separately
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`border rounded-lg ${className}`}>{children}</div>
}
