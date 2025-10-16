'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { customersAPI } from '@/lib/api/client'
import { handleApiError } from '@/lib/utils/error-handler'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import Link from 'next/link'
import { ArrowLeft, Edit, Save, X, Plus, Trash2 } from 'lucide-react'

type DealerForm = {
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

type Dealer = DealerForm & {
  id: string
  created_at?: string | null
  updated_at?: string | null
}

type CustomerDetail = {
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
  notes?: string | null
  short_code?: string | null
  postal_code?: string | null
  is_active?: boolean
  dealers: Dealer[]
}

const emptyDealerForm: DealerForm = {
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

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [form, setForm] = useState<any>({})
  const [savingCustomer, setSavingCustomer] = useState(false)

  const [newDealer, setNewDealer] = useState<DealerForm>(emptyDealerForm)
  const [addingDealer, setAddingDealer] = useState(false)
  const [editingDealerId, setEditingDealerId] = useState<string | null>(null)
  const [dealerEditForm, setDealerEditForm] = useState<DealerForm>(emptyDealerForm)
  const [savingDealer, setSavingDealer] = useState(false)

  const loadCustomer = async () => {
    setLoading(true)
    try {
      const res = await customersAPI.getById(String(id))
      const data: CustomerDetail = res?.data ?? res
      setCustomer(data)
      setForm({
        name: data.name || '',
        code: data.code || '',
        contact_person: data.contact_person || '',
        phone: data.phone || '',
        phone_secondary: data.phone_secondary || '',
        gsm: data.gsm || '',
        email: data.email || '',
        address: data.address || '',
        city: data.city || '',
        tax_office: data.tax_office || '',
        tax_number: data.tax_number || '',
        notes: data.notes || '',
        short_code: data.short_code || '',
        postal_code: data.postal_code || '',
        is_active: data.is_active !== false,
      })
    } catch (error) {
      handleApiError(error, 'Customer detail')
      toast.error('Müşteri getirilemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCustomer()
  }, [id])

  const handleCustomerField = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSaveCustomer = async () => {
    if (!customer) return
    setSavingCustomer(true)
    try {
      await customersAPI.update(customer.id, form)
      toast.success('Müşteri bilgileri güncellendi')
      await loadCustomer()
    } catch (error) {
      handleApiError(error, 'Customer update')
      toast.error('Müşteri güncellenemedi')
    } finally {
      setSavingCustomer(false)
    }
  }

  const handleCreateDealer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer) return
    if (!newDealer.name.trim()) {
      toast.error('Bayi adı zorunludur')
      return
    }
    setAddingDealer(true)
    try {
      await customersAPI.createDealer(customer.id, newDealer)
      toast.success('Bayi eklendi')
      setNewDealer(emptyDealerForm)
      await loadCustomer()
    } catch (error) {
      handleApiError(error, 'Dealer create')
      toast.error('Bayi eklenemedi')
    } finally {
      setAddingDealer(false)
    }
  }

  const startDealerEdit = (dealer: Dealer) => {
    setEditingDealerId(dealer.id)
    setDealerEditForm({
      name: dealer.name || '',
      address: dealer.address || '',
      district: dealer.district || '',
      city: dealer.city || '',
      contact_person: dealer.contact_person || '',
      contact_phone: dealer.contact_phone || '',
      tax_office: dealer.tax_office || '',
      tax_number: dealer.tax_number || '',
      phone1: dealer.phone1 || '',
      phone2: dealer.phone2 || '',
      email: dealer.email || '',
      website: dealer.website || '',
      postal_code: dealer.postal_code || '',
      notes: dealer.notes || '',
    })
  }

  const cancelDealerEdit = () => {
    setEditingDealerId(null)
    setDealerEditForm(emptyDealerForm)
  }

  const handleUpdateDealer = async () => {
    if (!customer || !editingDealerId) return
    if (!dealerEditForm.name.trim()) {
      toast.error('Bayi adı zorunludur')
      return
    }
    setSavingDealer(true)
    try {
      await customersAPI.updateDealer(customer.id, editingDealerId, dealerEditForm)
      toast.success('Bayi güncellendi')
      cancelDealerEdit()
      await loadCustomer()
    } catch (error) {
      handleApiError(error, 'Dealer update')
      toast.error('Bayi güncellenemedi')
    } finally {
      setSavingDealer(false)
    }
  }

  const handleDeleteDealer = async (dealerId: string) => {
    if (!customer) return
    if (!confirm('Bu bayiyi silmek istediğinize emin misiniz?')) return
    setSavingDealer(true)
    try {
      await customersAPI.deleteDealer(customer.id, dealerId)
      toast.success('Bayi silindi')
      await loadCustomer()
    } catch (error) {
      handleApiError(error, 'Dealer delete')
      toast.error('Bayi silinemedi')
    } finally {
      setSavingDealer(false)
    }
  }

  const hasChanges = useMemo(() => {
    if (!customer) return false
    return (
      form.name !== (customer.name || '') ||
      form.code !== (customer.code || '') ||
      form.contact_person !== (customer.contact_person || '') ||
      form.phone !== (customer.phone || '') ||
      form.phone_secondary !== (customer.phone_secondary || '') ||
      form.gsm !== (customer.gsm || '') ||
      form.email !== (customer.email || '') ||
      form.address !== (customer.address || '') ||
      form.city !== (customer.city || '') ||
      form.tax_office !== (customer.tax_office || '') ||
      form.tax_number !== (customer.tax_number || '') ||
      form.notes !== (customer.notes || '') ||
      form.short_code !== (customer.short_code || '') ||
      form.postal_code !== (customer.postal_code || '') ||
      Boolean(form.is_active) !== (customer.is_active !== false)
    )
  }, [customer, form])

  if (loading) return <div className="p-6">Yükleniyor…</div>
  if (!customer) return <div className="p-6">Kayıt bulunamadı</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-gray-500">Müşteri detayları ve bayi yönetimi</p>
        </div>
        <div className="flex gap-2">
          <Link href="/customers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Listeye Dön
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleSaveCustomer}
            disabled={savingCustomer || !hasChanges}
          >
            {savingCustomer ? (
              'Kaydediliyor...'
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" /> Kaydet
              </span>
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Müşteri Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Firma Adı *</Label>
              <Input
                value={form.name}
                onChange={(e) => handleCustomerField('name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Kısa Kod</Label>
              <Input
                value={form.short_code}
                onChange={(e) => handleCustomerField('short_code', e.target.value)}
                placeholder="Kısa tanım"
              />
            </div>
            <div className="space-y-2">
              <Label>Müşteri Kodu</Label>
              <Input
                value={form.code}
                onChange={(e) => handleCustomerField('code', e.target.value)}
                placeholder="ERP kodu vb."
              />
            </div>
            <div className="space-y-2">
              <Label>Yetkili Kişi</Label>
              <Input
                value={form.contact_person}
                onChange={(e) => handleCustomerField('contact_person', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefon 1</Label>
              <Input
                value={form.phone}
                onChange={(e) => handleCustomerField('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefon 2</Label>
              <Input
                value={form.phone_secondary}
                onChange={(e) => handleCustomerField('phone_secondary', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>GSM</Label>
              <Input
                value={form.gsm}
                onChange={(e) => handleCustomerField('gsm', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => handleCustomerField('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Şehir</Label>
              <Input
                value={form.city}
                onChange={(e) => handleCustomerField('city', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Posta Kodu</Label>
              <Input
                value={form.postal_code}
                onChange={(e) => handleCustomerField('postal_code', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Vergi Dairesi</Label>
              <Input
                value={form.tax_office}
                onChange={(e) => handleCustomerField('tax_office', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Vergi No</Label>
              <Input
                value={form.tax_number}
                onChange={(e) => handleCustomerField('tax_number', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Adres</Label>
            <Textarea
              rows={3}
              value={form.address}
              onChange={(e) => handleCustomerField('address', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Notlar</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => handleCustomerField('notes', e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              id="is_active"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300"
              checked={Boolean(form.is_active)}
              onChange={(e) => handleCustomerField('is_active', e.target.checked)}
            />
            Aktif müşteri
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bayi Yönetimi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleCreateDealer} className="space-y-4 rounded-lg border border-dashed p-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Plus className="h-4 w-4" /> Yeni Bayi Ekle
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Bayi Adı *</Label>
                <Input
                  value={newDealer.name}
                  onChange={(e) => setNewDealer({ ...newDealer, name: e.target.value })}
                  required
                  disabled={addingDealer}
                />
              </div>
              <div className="space-y-2">
                <Label>Şehir</Label>
                <Input
                  value={newDealer.city}
                  onChange={(e) => setNewDealer({ ...newDealer, city: e.target.value })}
                  disabled={addingDealer}
                />
              </div>
              <div className="space-y-2">
                <Label>Semt / İlçe</Label>
                <Input
                  value={newDealer.district}
                  onChange={(e) => setNewDealer({ ...newDealer, district: e.target.value })}
                  disabled={addingDealer}
                />
              </div>
              <div className="space-y-2">
                <Label>Yetkili</Label>
                <Input
                  value={newDealer.contact_person}
                  onChange={(e) => setNewDealer({ ...newDealer, contact_person: e.target.value })}
                  disabled={addingDealer}
                />
              </div>
              <div className="space-y-2">
                <Label>Yetkili Telefonu</Label>
                <Input
                  value={newDealer.contact_phone}
                  onChange={(e) => setNewDealer({ ...newDealer, contact_phone: e.target.value })}
                  disabled={addingDealer}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon 1</Label>
                <Input
                  value={newDealer.phone1}
                  onChange={(e) => setNewDealer({ ...newDealer, phone1: e.target.value })}
                  disabled={addingDealer}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon 2</Label>
                <Input
                  value={newDealer.phone2}
                  onChange={(e) => setNewDealer({ ...newDealer, phone2: e.target.value })}
                  disabled={addingDealer}
                />
              </div>
              <div className="space-y-2">
                <Label>E-posta</Label>
                <Input
                  type="email"
                  value={newDealer.email}
                  onChange={(e) => setNewDealer({ ...newDealer, email: e.target.value })}
                  disabled={addingDealer}
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={newDealer.website}
                  onChange={(e) => setNewDealer({ ...newDealer, website: e.target.value })}
                  disabled={addingDealer}
                />
              </div>
              <div className="space-y-2">
                <Label>Vergi Dairesi</Label>
                <Input
                  value={newDealer.tax_office}
                  onChange={(e) => setNewDealer({ ...newDealer, tax_office: e.target.value })}
                  disabled={addingDealer}
                />
              </div>
              <div className="space-y-2">
                <Label>Vergi Numarası</Label>
                <Input
                  value={newDealer.tax_number}
                  onChange={(e) => setNewDealer({ ...newDealer, tax_number: e.target.value })}
                  disabled={addingDealer}
                />
              </div>
              <div className="space-y-2">
                <Label>Posta Kodu</Label>
                <Input
                  value={newDealer.postal_code}
                  onChange={(e) => setNewDealer({ ...newDealer, postal_code: e.target.value })}
                  disabled={addingDealer}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adres</Label>
              <Textarea
                rows={2}
                value={newDealer.address}
                onChange={(e) => setNewDealer({ ...newDealer, address: e.target.value })}
                disabled={addingDealer}
              />
            </div>
            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea
                rows={2}
                value={newDealer.notes}
                onChange={(e) => setNewDealer({ ...newDealer, notes: e.target.value })}
                disabled={addingDealer}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={addingDealer}>
                {addingDealer ? 'Ekleniyor...' : 'Bayi Ekle'}
              </Button>
            </div>
          </form>

          <div className="space-y-3">
            {customer.dealers.length === 0 ? (
              <p className="text-sm text-gray-500">Henüz kayıtlı bayi bulunmuyor.</p>
            ) : (
              customer.dealers.map((dealer) => {
                const isEditing = editingDealerId === dealer.id
                return (
                  <Card key={dealer.id} className="border border-gray-200">
                    <CardContent className="space-y-3 pt-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">
                            {dealer.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {dealer.city || 'Şehir belirtilmemiş'}
                            {dealer.district ? ` • ${dealer.district}` : ''}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelDealerEdit}
                              disabled={savingDealer}
                            >
                              <X className="h-4 w-4 mr-1" /> İptal
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startDealerEdit(dealer)}
                              disabled={savingDealer}
                            >
                              <Edit className="h-4 w-4 mr-1" /> Düzenle
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteDealer(dealer.id)}
                            disabled={savingDealer}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Sil
                          </Button>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-2">
                              <Label>Bayi Adı *</Label>
                              <Input
                                value={dealerEditForm.name}
                                onChange={(e) => setDealerEditForm({ ...dealerEditForm, name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Şehir</Label>
                              <Input
                                value={dealerEditForm.city}
                                onChange={(e) => setDealerEditForm({ ...dealerEditForm, city: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Semt</Label>
                              <Input
                                value={dealerEditForm.district}
                                onChange={(e) => setDealerEditForm({ ...dealerEditForm, district: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Yetkili</Label>
                              <Input
                                value={dealerEditForm.contact_person}
                                onChange={(e) => setDealerEditForm({ ...dealerEditForm, contact_person: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Yetkili Telefonu</Label>
                              <Input
                                value={dealerEditForm.contact_phone}
                                onChange={(e) => setDealerEditForm({ ...dealerEditForm, contact_phone: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Telefon 1</Label>
                              <Input
                                value={dealerEditForm.phone1}
                                onChange={(e) => setDealerEditForm({ ...dealerEditForm, phone1: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Telefon 2</Label>
                              <Input
                                value={dealerEditForm.phone2}
                                onChange={(e) => setDealerEditForm({ ...dealerEditForm, phone2: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>E-posta</Label>
                              <Input
                                value={dealerEditForm.email}
                                onChange={(e) => setDealerEditForm({ ...dealerEditForm, email: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Website</Label>
                              <Input
                                value={dealerEditForm.website}
                                onChange={(e) => setDealerEditForm({ ...dealerEditForm, website: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Vergi Dairesi</Label>
                              <Input
                                value={dealerEditForm.tax_office}
                                onChange={(e) => setDealerEditForm({ ...dealerEditForm, tax_office: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Vergi No</Label>
                              <Input
                                value={dealerEditForm.tax_number}
                                onChange={(e) => setDealerEditForm({ ...dealerEditForm, tax_number: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Posta Kodu</Label>
                              <Input
                                value={dealerEditForm.postal_code}
                                onChange={(e) => setDealerEditForm({ ...dealerEditForm, postal_code: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Adres</Label>
                            <Textarea
                              rows={2}
                              value={dealerEditForm.address}
                              onChange={(e) => setDealerEditForm({ ...dealerEditForm, address: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Notlar</Label>
                            <Textarea
                              rows={2}
                              value={dealerEditForm.notes}
                              onChange={(e) => setDealerEditForm({ ...dealerEditForm, notes: e.target.value })}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              onClick={cancelDealerEdit}
                              type="button"
                              disabled={savingDealer}
                            >
                              <X className="h-4 w-4 mr-1" /> İptal
                            </Button>
                            <Button onClick={handleUpdateDealer} type="button" disabled={savingDealer}>
                              {savingDealer ? 'Kaydediliyor...' : 'Kaydet'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                          <div>
                            <span className="text-xs uppercase text-gray-500">Yetkili</span>
                            <div>{dealer.contact_person || '—'}</div>
                          </div>
                          <div>
                            <span className="text-xs uppercase text-gray-500">Telefonlar</span>
                            <div>
                              {[dealer.phone1, dealer.phone2, dealer.contact_phone]
                                .filter(Boolean)
                                .join(' / ') || '—'}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs uppercase text-gray-500">E-posta</span>
                            <div>{dealer.email || '—'}</div>
                          </div>
                          <div>
                            <span className="text-xs uppercase text-gray-500">Web</span>
                            <div>{dealer.website || '—'}</div>
                          </div>
                          <div>
                            <span className="text-xs uppercase text-gray-500">Vergi Bilgisi</span>
                            <div>
                              {[dealer.tax_office, dealer.tax_number].filter(Boolean).join(' • ') || '—'}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs uppercase text-gray-500">Posta Kodu</span>
                            <div>{dealer.postal_code || '—'}</div>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-xs uppercase text-gray-500">Adres</span>
                            <div>{dealer.address || '—'}</div>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-xs uppercase text-gray-500">Notlar</span>
                            <div>{dealer.notes || '—'}</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
