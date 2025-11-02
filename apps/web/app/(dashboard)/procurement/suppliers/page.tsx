'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { handleError } from '@/lib/utils/error-handler'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

type Supplier = {
  id: string
  name: string
  contact_person?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  tax_number?: string | null
  payment_terms?: string | null
  credit_limit?: number | null
  currency?: string | null
  is_active?: boolean
  created_at?: string | null
}

type SupplierFormValues = {
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  tax_number: string
  payment_terms: string
  credit_limit: string
  currency: string
  is_active: boolean
}

const EMPTY_FORM: SupplierFormValues = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  tax_number: '',
  payment_terms: '',
  credit_limit: '',
  currency: 'TRY',
  is_active: true,
}

type SortConfig = {
  key: keyof Supplier
  direction: 'ascending' | 'descending'
}

export default function SuppliersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [q, setQ] = useState('')

  const [panelOpen, setPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState<'create' | 'edit'>('create')
  const [panelLoading, setPanelLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(null)
  const [form, setForm] = useState<SupplierFormValues>(EMPTY_FORM)
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)

  useEffect(() => {
    void loadSuppliers()
  }, [])

  async function loadSuppliers() {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/procurement/suppliers`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Tedarikçi listesi yüklenemedi')

      const data = await res.json()
      const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
      const list: Supplier[] = raw.map((item: any) => ({
        id: item.id,
        name: item.name,
        contact_person: item.contact_person,
        email: item.email,
        phone: item.phone,
        address: item.address,
        tax_number: item.tax_number,
        payment_terms: item.payment_terms,
        credit_limit: item.credit_limit,
        currency: item.currency,
        is_active: item.is_active,
        created_at: item.created_at,
      }))
      setSuppliers(list)
    } catch (error) {
      handleError(error)
      toast.error('Tedarikçiler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return suppliers
    return suppliers.filter((supplier) =>
      [
        supplier.name,
        supplier.contact_person,
        supplier.email,
        supplier.phone,
        supplier.tax_number,
        supplier.payment_terms,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [suppliers, q])

  const sortedSuppliers = useMemo(() => {
    const sortableItems = [...filtered]
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key] ?? ''
        const bValue = b[sortConfig.key] ?? ''

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1
        }
        return 0
      })
    }
    return sortableItems
  }, [filtered, sortConfig])

  const requestSort = (key: keyof Supplier) => {
    let direction: 'ascending' | 'descending' = 'ascending'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending'
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key: keyof Supplier) => {
    if (sortConfig?.key !== key) {
      return <ArrowUpDown className="h-3 w-3 text-gray-400" />
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="h-4 w-4 text-blue-600" />
    }
    return <ArrowDown className="h-4 w-4 text-blue-600" />
  }

  const openCreatePanel = () => {
    setPanelMode('create')
    setActiveSupplierId(null)
    setForm(EMPTY_FORM)
    setPanelLoading(false)
    setPanelOpen(true)
  }

  const mapToForm = (supplier: Partial<Supplier>): SupplierFormValues => ({
    name: supplier.name ?? '',
    contact_person: supplier.contact_person ?? '',
    email: supplier.email ?? '',
    phone: supplier.phone ?? '',
    address: supplier.address ?? '',
    tax_number: supplier.tax_number ?? '',
    payment_terms: supplier.payment_terms ?? '',
    credit_limit: supplier.credit_limit?.toString() ?? '',
    currency: supplier.currency ?? 'TRY',
    is_active: supplier.is_active ?? true,
  })

  const openEditPanel = async (supplierId: string) => {
    setPanelMode('edit')
    setActiveSupplierId(supplierId)
    setPanelOpen(true)
    setPanelLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/procurement/suppliers/${supplierId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Tedarikçi detayları yüklenemedi')

      const data = await res.json()
      const supplier = (data?.data ?? data) as Supplier
      setForm(mapToForm(supplier))
    } catch (error) {
      handleError(error)
      toast.error('Tedarikçi ayrıntıları yüklenemedi')
      setPanelOpen(false)
    } finally {
      setPanelLoading(false)
    }
  }

  const closePanel = () => {
    if (saving) return
    setPanelOpen(false)
    setPanelLoading(false)
    setActiveSupplierId(null)
    setForm(EMPTY_FORM)
  }

  const handleFormChange = (field: keyof SupplierFormValues, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const buildPayload = (values: SupplierFormValues) => {
    const payload: Record<string, string | number | boolean | null> = {}
    Object.entries(values).forEach(([key, value]) => {
      if (key === 'is_active') {
        payload[key] = value
      } else if (key === 'credit_limit') {
        const trimmed = String(value).trim()
        payload[key] = trimmed === '' ? null : parseFloat(trimmed)
      } else {
        const trimmed = String(value).trim()
        payload[key] = trimmed === '' ? null : trimmed
      }
    })
    payload.name = values.name.trim()
    return payload
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Tedarikçi adı zorunludur')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const payload = buildPayload(form)

      if (panelMode === 'create') {
        const res = await fetch(`${API_URL}/api/procurement/suppliers`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.message || 'Tedarikçi oluşturulamadı')
        }

        toast.success('Yeni tedarikçi eklendi')
      } else if (panelMode === 'edit' && activeSupplierId) {
        const res = await fetch(`${API_URL}/api/procurement/suppliers/${activeSupplierId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.message || 'Tedarikçi güncellenemedi')
        }

        toast.success('Tedarikçi güncellendi')
      }
      await loadSuppliers()
      closePanel()
    } catch (error) {
      handleError(error)
      toast.error(
        panelMode === 'create'
          ? 'Tedarikçi oluşturulamadı'
          : 'Tedarikçi güncellenemedi',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (supplierId: string) => {
    if (!confirm('Bu tedarikçiyi silmek istediğinize emin misiniz?')) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/procurement/suppliers/${supplierId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Tedarikçi silinemedi')
      }

      toast.success('Tedarikçi silindi')
      if (supplierId === activeSupplierId) {
        closePanel()
      }
      await loadSuppliers()
    } catch (error) {
      handleError(error)
      toast.error('Tedarikçi silinemedi')
    }
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
          <div className="col-span-2 space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Tedarikçi Adı *</label>
            <Input
              value={form.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              placeholder="Örn: ABC Tedarik Ltd."
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Yetkili Kişi</label>
            <Input
              value={form.contact_person}
              onChange={(e) => handleFormChange('contact_person', e.target.value)}
              placeholder="Örn: Mehmet Yılmaz"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Vergi Numarası</label>
            <Input
              value={form.tax_number}
              onChange={(e) => handleFormChange('tax_number', e.target.value)}
              placeholder="VKN/TCKN"
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

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-gray-500">Adres</label>
          <Textarea
            value={form.address}
            onChange={(e) => handleFormChange('address', e.target.value)}
            rows={3}
            placeholder="Tam adres bilgisi"
            disabled={saving}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Ödeme Koşulları</label>
            <Input
              value={form.payment_terms}
              onChange={(e) => handleFormChange('payment_terms', e.target.value)}
              placeholder="Örn: 30 gün vade"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Kredi Limiti</label>
            <div className="flex gap-2">
              <Input
                value={form.credit_limit}
                onChange={(e) => handleFormChange('credit_limit', e.target.value)}
                placeholder="0.00"
                disabled={saving}
                type="number"
                step="0.01"
                className="flex-1"
              />
              <select
                value={form.currency}
                onChange={(e) => handleFormChange('currency', e.target.value)}
                disabled={saving}
                className="w-24 rounded-md border border-gray-300 bg-white px-3 text-sm disabled:opacity-50"
              >
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={(e) => handleFormChange('is_active', e.target.checked)}
            disabled={saving}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700 cursor-pointer">
            Aktif tedarikçi
          </label>
        </div>
      </div>
    )
  }

  return (
    <div className="relative space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tedarikçi Yönetimi</h1>
          <p className="mt-1 text-gray-600">
            Tedarikçileri listeler, ararsınız. Yeni tedarikçiler ekleyip mevcut kayıtları düzenleyebilirsiniz.
          </p>
        </div>
        <Button onClick={openCreatePanel} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Tedarikçi
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Ara: ad, yetkili, telefon, e-posta…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-md"
        />
        <span className="text-sm text-gray-500">Toplam: {sortedSuppliers.length}</span>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-gray-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Yükleniyor…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="w-[20%] px-3 py-3">
                      <button onClick={() => requestSort('name')} className="flex items-center gap-2">
                        Tedarikçi Adı {getSortIcon('name')}
                      </button>
                    </th>
                    <th className="w-[14%] px-3 py-3">
                      <button onClick={() => requestSort('contact_person')} className="flex items-center gap-2">
                        Yetkili {getSortIcon('contact_person')}
                      </button>
                    </th>
                    <th className="w-[12%] px-3 py-3">Telefon</th>
                    <th className="w-[16%] px-3 py-3">
                      <button onClick={() => requestSort('email')} className="flex items-center gap-2">
                        E-posta {getSortIcon('email')}
                      </button>
                    </th>
                    <th className="w-[12%] px-3 py-3">Ödeme Koşulları</th>
                    <th className="w-[12%] px-3 py-3 text-right">Kredi Limiti</th>
                    <th className="w-[8%] px-3 py-3 text-center">Durum</th>
                    <th className="w-[8%] px-3 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSuppliers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-sm text-gray-500"
                      >
                        Kayıt bulunamadı
                      </td>
                    </tr>
                  ) : (
                    sortedSuppliers.map((supplier) => {
                      return (
                        <tr
                          key={supplier.id}
                          className="border-b transition-colors hover:bg-gray-50"
                        >
                          <td className="px-3 py-3 font-medium text-gray-900">
                            {supplier.name}
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            {supplier.contact_person || '—'}
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            {supplier.phone || '—'}
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            {supplier.email || '—'}
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            {supplier.payment_terms || '—'}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-700">
                            {supplier.credit_limit
                              ? `${supplier.credit_limit.toLocaleString('tr-TR')} ${supplier.currency || 'TRY'}`
                              : '—'}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {supplier.is_active ? (
                              <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                                Aktif
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                                Pasif
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-gray-600 hover:text-gray-900"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openEditPanel(supplier.id)
                                }}
                                aria-label="Tedarikçiyi düzenle"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleDelete(supplier.id)
                                }}
                                aria-label="Tedarikçiyi sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
                  {panelMode === 'create' ? 'Yeni Tedarikçi' : 'Tedarikçi Bilgileri'}
                </p>
                <h2 className="text-lg font-semibold text-gray-900">
                  {panelMode === 'create'
                    ? 'Yeni Tedarikçi Ekle'
                    : form.name || 'Tedarikçi düzenle'}
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
              {panelMode === 'edit' && activeSupplierId && (
                <Button
                  variant="outline"
                  className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleDelete(activeSupplierId)}
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
