'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { customersAPI } from '@/lib/api/client'
import { handleApiError, handleError } from '@/lib/utils/error-handler'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils/formatters'

type Dealer = {
  id: string
  name: string
  address?: string | null
  district?: string | null
  city?: string | null
  contact_person?: string | null
  contact_phone?: string | null
  tax_office?: string | null
  tax_number?: string | null
  phone1?: string | null
  phone2?: string | null
  email?: string | null
  website?: string | null
  postal_code?: string | null
  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type CustomerDetail = {
  id: string
  name: string
  code?: string | null
  short_code?: string | null
  contact_person?: string | null
  phone?: string | null
  phone_secondary?: string | null
  gsm?: string | null
  email?: string | null
  address?: string | null
  city?: string | null
  tax_office?: string | null
  tax_number?: string | null
  postal_code?: string | null
  notes?: string | null
  created_at?: string | null
  dealers: Dealer[]
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

type DealerFormValues = {
  name: string
  address: string
  district: string
  city: string
  contact_person: string
  contact_phone: string
  tax_office: string
  tax_number: string
  phone1: string
  phone2: string
  email: string
  website: string
  postal_code: string
  notes: string
}

const EMPTY_CUSTOMER_FORM: CustomerFormValues = {
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

const EMPTY_DEALER_FORM: DealerFormValues = {
  name: '',
  address: '',
  district: '',
  city: '',
  contact_person: '',
  contact_phone: '',
  tax_office: '',
  tax_number: '',
  phone1: '',
  phone2: '',
  email: '',
  website: '',
  postal_code: '',
  notes: '',
}

type PanelMode = 'customer' | 'dealer-create' | 'dealer-edit'

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)

  const [panelOpen, setPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState<PanelMode>('customer')
  const [saving, setSaving] = useState(false)

  const [customerForm, setCustomerForm] = useState<CustomerFormValues>(EMPTY_CUSTOMER_FORM)
  const [dealerForm, setDealerForm] = useState<DealerFormValues>(EMPTY_DEALER_FORM)
  const [activeDealerId, setActiveDealerId] = useState<string | null>(null)

  useEffect(() => {
    void loadCustomer()
  }, [params.id])

  async function loadCustomer() {
    if (!params.id) return
    setLoading(true)
    try {
      const res = await customersAPI.getById(String(params.id))
      const data: CustomerDetail = res?.data ?? res
      setCustomer(data)
      setCustomerForm(mapCustomerToForm(data))
    } catch (error) {
      handleApiError(error, 'Customer detail')
      toast.error('Müşteri bilgisi getirilemedi')
      setCustomer(null)
    } finally {
      setLoading(false)
    }
  }

  const dealerCount = useMemo(() => customer?.dealers?.length ?? 0, [customer])

  const mapCustomerToForm = (data: Partial<CustomerDetail> | null): CustomerFormValues => ({
    name: data?.name ?? '',
    code: data?.code ?? '',
    short_code: data?.short_code ?? '',
    contact_person: data?.contact_person ?? '',
    phone: data?.phone ?? '',
    phone_secondary: data?.phone_secondary ?? '',
    gsm: data?.gsm ?? '',
    email: data?.email ?? '',
    tax_office: data?.tax_office ?? '',
    tax_number: data?.tax_number ?? '',
    address: data?.address ?? '',
    city: data?.city ?? '',
    postal_code: data?.postal_code ?? '',
    notes: data?.notes ?? '',
  })

  const mapDealerToForm = (dealer: Partial<Dealer> | null): DealerFormValues => ({
    name: dealer?.name ?? '',
    address: dealer?.address ?? '',
    district: dealer?.district ?? '',
    city: dealer?.city ?? '',
    contact_person: dealer?.contact_person ?? '',
    contact_phone: dealer?.contact_phone ?? '',
    tax_office: dealer?.tax_office ?? '',
    tax_number: dealer?.tax_number ?? '',
    phone1: dealer?.phone1 ?? '',
    phone2: dealer?.phone2 ?? '',
    email: dealer?.email ?? '',
    website: dealer?.website ?? '',
    postal_code: dealer?.postal_code ?? '',
    notes: dealer?.notes ?? '',
  })

  const openCustomerPanel = () => {
    if (!customer) return
    setPanelMode('customer')
    setCustomerForm(mapCustomerToForm(customer))
    setPanelOpen(true)
  }

  const openDealerCreatePanel = () => {
    setPanelMode('dealer-create')
    setDealerForm(EMPTY_DEALER_FORM)
    setActiveDealerId(null)
    setPanelOpen(true)
  }

  const openDealerEditPanel = (dealer: Dealer) => {
    setPanelMode('dealer-edit')
    setDealerForm(mapDealerToForm(dealer))
    setActiveDealerId(dealer.id)
    setPanelOpen(true)
  }

  const closePanel = () => {
    if (saving) return
    setPanelOpen(false)
    setActiveDealerId(null)
    setDealerForm(EMPTY_DEALER_FORM)
  }

  const buildPayload = (values: Record<string, string>) => {
    const result: Record<string, string | null> = {}
    Object.entries(values).forEach(([key, value]) => {
      const trimmed = value.trim()
      result[key] = trimmed === '' ? null : trimmed
    })
    return result
  }

  const handlePanelSave = async () => {
    if (!customer) return

    if (panelMode === 'customer' && !customerForm.name.trim()) {
      toast.error('Müşteri adı zorunludur')
      return
    }

    if ((panelMode === 'dealer-create' || panelMode === 'dealer-edit') && !dealerForm.name.trim()) {
      toast.error('Bayi adı zorunludur')
      return
    }

    setSaving(true)
    try {
      if (panelMode === 'customer') {
        await customersAPI.update(customer.id, buildPayload(customerForm))
        toast.success('Müşteri güncellendi')
      } else if (panelMode === 'dealer-create') {
        await customersAPI.createDealer(customer.id, buildPayload(dealerForm))
        toast.success('Bayi eklendi')
      } else if (panelMode === 'dealer-edit' && activeDealerId) {
        await customersAPI.updateDealer(customer.id, activeDealerId, buildPayload(dealerForm))
        toast.success('Bayi güncellendi')
      }
      await loadCustomer()
      closePanel()
    } catch (error) {
      handleError(error)
      toast.error('İşlem gerçekleştirilemedi')
    } finally {
      setSaving(false)
    }
  }

  const handleDealerDelete = async (dealer: Dealer) => {
    if (!customer) return
    if (
      !confirm(
        `"${dealer.name}" bayisini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      )
    ) {
      return
    }

    try {
      await customersAPI.deleteDealer(customer.id, dealer.id)
      toast.success('Bayi silindi')
      if (activeDealerId === dealer.id) {
        closePanel()
      }
      await loadCustomer()
    } catch (error) {
      handleError(error)
      toast.error('Bayi silinemedi')
    }
  }

  const renderPanelTitle = () => {
    switch (panelMode) {
      case 'customer':
        return 'Müşteri Bilgilerini Düzenle'
      case 'dealer-create':
        return 'Yeni Bayi Ekle'
      case 'dealer-edit':
        return 'Bayi Bilgilerini Düzenle'
      default:
        return ''
    }
  }

  const renderPanelContent = () => {
    if (panelMode === 'customer') {
      return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Müşteri Adı *</label>
              <Input
                value={customerForm.name}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Örn: ABC Reklam"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Kısa Kod</label>
              <Input
                value={customerForm.short_code}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, short_code: e.target.value }))}
                placeholder="Örn: ABC"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Müşteri Kodu</label>
              <Input
                value={customerForm.code}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, code: e.target.value }))}
                placeholder="Örn: MR-001"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Yetkili Kişi</label>
              <Input
                value={customerForm.contact_person}
                onChange={(e) =>
                  setCustomerForm((prev) => ({ ...prev, contact_person: e.target.value }))
                }
                placeholder="Örn: Ayşe Yılmaz"
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Telefon</label>
              <Input
                value={customerForm.phone}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+90 212 ..."
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500">İkinci Telefon</label>
              <Input
                value={customerForm.phone_secondary}
                onChange={(e) =>
                  setCustomerForm((prev) => ({ ...prev, phone_secondary: e.target.value }))
                }
                placeholder="+90 212 ..."
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500">GSM</label>
              <Input
                value={customerForm.gsm}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, gsm: e.target.value }))}
                placeholder="+90 5xx ..."
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500">E-posta</label>
              <Input
                value={customerForm.email}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="ornek@firma.com"
                disabled={saving}
                type="email"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Vergi Dairesi</label>
              <Input
                value={customerForm.tax_office}
                onChange={(e) =>
                  setCustomerForm((prev) => ({ ...prev, tax_office: e.target.value }))
                }
                placeholder="Örn: Şişli"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Vergi No</label>
              <Input
                value={customerForm.tax_number}
                onChange={(e) =>
                  setCustomerForm((prev) => ({ ...prev, tax_number: e.target.value }))
                }
                placeholder="Örn: 1234567890"
                disabled={saving}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Şehir</label>
              <Input
                value={customerForm.city}
                onChange={(e) => setCustomerForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="Örn: İstanbul"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500">Posta Kodu</label>
              <Input
                value={customerForm.postal_code}
                onChange={(e) =>
                  setCustomerForm((prev) => ({ ...prev, postal_code: e.target.value }))
                }
                placeholder="Örn: 34394"
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Adres</label>
            <Textarea
              value={customerForm.address}
              onChange={(e) => setCustomerForm((prev) => ({ ...prev, address: e.target.value }))}
              rows={3}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Notlar</label>
            <Textarea
              value={customerForm.notes}
              onChange={(e) => setCustomerForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              disabled={saving}
            />
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Bayi Adı *</label>
            <Input
              value={dealerForm.name}
              onChange={(e) => setDealerForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Örn: X Reklam Bayi"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Yetkili Kişi</label>
            <Input
              value={dealerForm.contact_person}
              onChange={(e) =>
                setDealerForm((prev) => ({ ...prev, contact_person: e.target.value }))
              }
              placeholder="Örn: Mehmet Kara"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Telefon</label>
            <Input
              value={dealerForm.phone1}
              onChange={(e) => setDealerForm((prev) => ({ ...prev, phone1: e.target.value }))}
              placeholder="+90 212 ..."
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">İkinci Telefon</label>
            <Input
              value={dealerForm.phone2}
              onChange={(e) => setDealerForm((prev) => ({ ...prev, phone2: e.target.value }))}
              placeholder="+90 212 ..."
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">GSM</label>
            <Input
              value={dealerForm.contact_phone}
              onChange={(e) =>
                setDealerForm((prev) => ({ ...prev, contact_phone: e.target.value }))
              }
              placeholder="+90 5xx ..."
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">E-posta</label>
            <Input
              value={dealerForm.email}
              onChange={(e) => setDealerForm((prev) => ({ ...prev, email: e.target.value }))}
              type="email"
              placeholder="ornek@firma.com"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Vergi Dairesi</label>
            <Input
              value={dealerForm.tax_office}
              onChange={(e) =>
                setDealerForm((prev) => ({ ...prev, tax_office: e.target.value }))
              }
              placeholder="Örn: Şişli"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Vergi No</label>
            <Input
              value={dealerForm.tax_number}
              onChange={(e) =>
                setDealerForm((prev) => ({ ...prev, tax_number: e.target.value }))
              }
              placeholder="Örn: 1234567890"
              disabled={saving}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Şehir</label>
            <Input
              value={dealerForm.city}
              onChange={(e) => setDealerForm((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="Örn: Ankara"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">İlçe / Semt</label>
            <Input
              value={dealerForm.district}
              onChange={(e) => setDealerForm((prev) => ({ ...prev, district: e.target.value }))}
              placeholder="Örn: Çankaya"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Posta Kodu</label>
            <Input
              value={dealerForm.postal_code}
              onChange={(e) =>
                setDealerForm((prev) => ({ ...prev, postal_code: e.target.value }))
              }
              placeholder="Örn: 06460"
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-gray-500">Website</label>
            <Input
              value={dealerForm.website}
              onChange={(e) => setDealerForm((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="https://"
              disabled={saving}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-gray-500">Adres</label>
          <Textarea
            value={dealerForm.address}
            onChange={(e) => setDealerForm((prev) => ({ ...prev, address: e.target.value }))}
            rows={3}
            disabled={saving}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase text-gray-500">Notlar</label>
          <Textarea
            value={dealerForm.notes}
            onChange={(e) => setDealerForm((prev) => ({ ...prev, notes: e.target.value }))}
            rows={3}
            disabled={saving}
          />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Yükleniyor…
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-gray-500">Müşteri bulunamadı</p>
        <Button onClick={() => router.push('/customers')}>Müşterilere Dön</Button>
      </div>
    )
  }

  return (
    <div className="relative space-y-6">
      <Link href="/customers">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Müşterilere Dön
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">{customer.name}</CardTitle>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                {customer.short_code && (
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase text-gray-600">
                    {customer.short_code}
                  </span>
                )}
                {customer.code && <span>Kod: {customer.code}</span>}
                {customer.created_at && <span>Oluşturma: {formatDate(customer.created_at)}</span>}
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={openCustomerPanel}>
              <Pencil className="h-4 w-4" />
              Bilgileri Düzenle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase text-gray-500">İletişim Bilgileri</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Yetkili Kişi</p>
                    <p className="font-medium">{customer.contact_person || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Telefon</p>
                    <p className="font-medium">{customer.phone || '—'}</p>
                    {customer.phone_secondary && (
                      <p className="font-medium text-gray-500">{customer.phone_secondary}</p>
                    )}
                    {customer.gsm && (
                      <p className="font-medium text-gray-500">{customer.gsm}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">E-posta</p>
                    <p className="font-medium">{customer.email || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase text-gray-500">Vergi Bilgileri</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Vergi Dairesi</p>
                    <p className="font-medium">{customer.tax_office || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Building2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Vergi No</p>
                    <p className="font-medium">{customer.tax_number || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase text-gray-500">Adres Bilgileri</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Şehir</p>
                    <p className="font-medium">{customer.city || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Posta Kodu</p>
                    <p className="font-medium">{customer.postal_code || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Adres</p>
                    <p className="font-medium">{customer.address || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {customer.notes && (
            <div className="rounded-md border bg-gray-50 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">Notlar</h3>
              <p className="whitespace-pre-wrap text-sm text-gray-600">{customer.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Bayi Listesi</CardTitle>
              <p className="text-sm text-gray-500">Bu müşteriye bağlı {dealerCount} bayi</p>
            </div>
            <Button onClick={openDealerCreatePanel} className="gap-2">
              <Plus className="h-4 w-4" />
              Yeni Bayi
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {dealerCount === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              Henüz bayi tanımlanmamış. Yeni bayi eklemek için sağ üstteki butonu kullanın.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="w-[20%] px-3 py-3">Bayi</th>
                    <th className="w-[14%] px-3 py-3">Yetkili</th>
                    <th className="w-[14%] px-3 py-3">Telefon</th>
                    <th className="w-[16%] px-3 py-3">E-posta</th>
                    <th className="w-[12%] px-3 py-3">Şehir</th>
                    <th className="w-[16%] px-3 py-3">Adres</th>
                    <th className="w-[8%] px-3 py-3 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.dealers.map((dealer) => {
                    const phones = [dealer.phone1, dealer.phone2, dealer.contact_phone]
                      .filter(Boolean)
                      .join(' / ')
                    return (
                      <tr
                        key={dealer.id}
                        className="border-b transition-colors hover:bg-gray-50"
                      >
                        <td className="px-3 py-3 font-medium text-gray-900">
                          {dealer.name}
                        </td>
                        <td className="px-3 py-3 text-gray-700">
                          {dealer.contact_person || '—'}
                        </td>
                        <td className="px-3 py-3 text-gray-700">
                          {phones || '—'}
                        </td>
                        <td className="px-3 py-3 text-gray-700 break-all">
                          {dealer.email || '—'}
                        </td>
                        <td className="px-3 py-3 text-gray-700">
                          {[dealer.district, dealer.city].filter(Boolean).join(' / ') || '—'}
                        </td>
                        <td className="px-3 py-3 text-gray-700">
                          {dealer.address || '—'}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-gray-600 hover:text-gray-900"
                              onClick={() => openDealerEditPanel(dealer)}
                              aria-label="Bayiyi düzenle"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleDealerDelete(dealer)}
                              aria-label="Bayiyi sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
                  {panelMode === 'customer'
                    ? 'Müşteri'
                    : panelMode === 'dealer-create'
                      ? 'Yeni Bayi'
                      : 'Bayi Bilgileri'}
                </p>
                <h2 className="text-lg font-semibold text-gray-900">{renderPanelTitle()}</h2>
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

            <div className="flex-1 overflow-y-auto px-5 py-4">{renderPanelContent()}</div>

            <div className="flex items-center justify-end gap-2 border-t px-5 py-4">
              <Button variant="outline" onClick={closePanel} disabled={saving}>
                Vazgeç
              </Button>
              <Button onClick={handlePanelSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
