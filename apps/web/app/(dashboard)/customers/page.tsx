'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

import { customersAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { handleError } from '@/lib/utils/error-handler'
import { formatDate } from '@/lib/utils/formatters'

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

export default function CustomersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [q, setQ] = useState('')

  const [panelOpen, setPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState<'create' | 'edit'>('create')
  const [panelLoading, setPanelLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null)
  const [form, setForm] = useState<CustomerFormValues>(EMPTY_FORM)

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

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return customers
    return customers.filter((customer) =>
      [
        customer.name,
        customer.short_code,
        customer.code,
        customer.contact_person,
        customer.phone,
        customer.phone_secondary,
        customer.gsm,
        customer.email,
        customer.city,
        customer.tax_office,
        customer.tax_number,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [customers, q])

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
        <Button onClick={openCreatePanel} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Müşteri
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Ara: ad, kod, kişi, telefon, e-posta…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-md"
        />
        <span className="text-sm text-gray-500">Toplam: {filtered.length}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bayi Listesi</CardTitle>
        </CardHeader>
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
                    <th className="w-[18%] px-3 py-3">Ad</th>
                    <th className="w-[10%] px-3 py-3">Kod</th>
                    <th className="w-[14%] px-3 py-3">Yetkili</th>
                    <th className="w-[14%] px-3 py-3">Telefon</th>
                    <th className="w-[16%] px-3 py-3">E-posta</th>
                    <th className="w-[12%] px-3 py-3">Şehir</th>
                    <th className="w-[10%] px-3 py-3">Vergi Dairesi</th>
                    <th className="w-[12%] px-3 py-3">Oluşturma</th>
                    <th className="w-[8%] px-3 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-8 text-center text-sm text-gray-500"
                      >
                        Kayıt bulunamadı
                      </td>
                    </tr>
                  ) : (
                    filtered.map((customer) => {
                      const phones = [customer.phone, customer.phone_secondary, customer.gsm]
                        .filter(Boolean)
                        .join(' / ')
                      return (
                        <tr
                          key={customer.id}
                          className="border-b transition-colors hover:bg-gray-50"
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
                          <td className="px-3 py-3 font-medium text-gray-900">
                            {customer.name}
                          </td>
                          <td className="px-3 py-3">
                            <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold uppercase text-gray-600">
                              {customer.short_code || customer.code || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            {customer.contact_person || '—'}
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            {phones || '—'}
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            {customer.email || '—'}
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            {customer.city || '—'}
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            {customer.tax_office || '—'}
                          </td>
                          <td className="px-3 py-3 text-gray-700">
                            {customer.created_at ? formatDate(customer.created_at) : '—'}
                          </td>
                          <td className="px-3 py-3">
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
