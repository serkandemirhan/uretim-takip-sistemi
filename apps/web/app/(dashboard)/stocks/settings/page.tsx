'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, DollarSign, Euro, TrendingUp, Package } from 'lucide-react'
import { currencySettingsAPI } from '@/lib/api/client'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { handleError } from '@/lib/utils/error-handler'

export default function CurrencySettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<any>(null)

  const [form, setForm] = useState({
    usd_to_try: '',
    eur_to_try: '',
  })

  useEffect(() => {
    void loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const res = await currencySettingsAPI.get()
      const data = res?.data
      setSettings(data)
      if (data) {
        setForm({
          usd_to_try: data.usd_to_try?.toString() || '',
          eur_to_try: data.eur_to_try?.toString() || '',
        })
      }
    } catch (err) {
      handleError(err, { title: 'Ayarlar yüklenemedi' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    const usd = parseFloat(form.usd_to_try)
    const eur = parseFloat(form.eur_to_try)

    if (!usd || usd <= 0 || !eur || eur <= 0) {
      toast.error('Geçerli kur değerleri girin')
      return
    }

    setSaving(true)
    try {
      await currencySettingsAPI.update({
        usd_to_try: usd,
        eur_to_try: eur,
      })
      toast.success('Döviz kurları güncellendi')
      await loadSettings()
    } catch (err) {
      handleError(err, { title: 'Güncelleme hatası' })
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Döviz Kuru Ayarları</h1>
          <p className="text-muted-foreground">USD ve EUR kurlarını güncelleyin</p>
        </div>
        <Link href="/stocks/inventory">
          <Button variant="outline">
            <Package className="w-4 h-4 mr-2" />
            Stok Listesi
          </Button>
        </Link>
      </div>

      {/* Current Rates Display */}
      {settings && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">USD / TRY</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {settings.usd_to_try?.toFixed(4)} ₺
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                1 USD = {settings.usd_to_try?.toFixed(4)} TRY
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">EUR / TRY</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {settings.eur_to_try?.toFixed(4)} ₺
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                1 EUR = {settings.eur_to_try?.toFixed(4)} TRY
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Son Güncelleme</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {settings.updated_at
                  ? new Date(settings.updated_at).toLocaleString('tr-TR')
                  : '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {settings.updated_by_name || 'Sistem'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Update Form */}
      <Card>
        <CardHeader>
          <CardTitle>Kur Güncelleme</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                USD / TRY Kuru
              </label>
              <Input
                type="number"
                step="0.0001"
                value={form.usd_to_try}
                onChange={(e) => setForm({ ...form, usd_to_try: e.target.value })}
                placeholder="Örn: 32.5000"
              />
              <p className="text-xs text-muted-foreground">
                1 USD = ? TRY (Örn: 32.5000)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Euro className="w-4 h-4" />
                EUR / TRY Kuru
              </label>
              <Input
                type="number"
                step="0.0001"
                value={form.eur_to_try}
                onChange={(e) => setForm({ ...form, eur_to_try: e.target.value })}
                placeholder="Örn: 35.2500"
              />
              <p className="text-xs text-muted-foreground">
                1 EUR = ? TRY (Örn: 35.2500)
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Kurları Güncelle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Bilgilendirme</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Döviz kurları tüm stok değeri hesaplamalarında kullanılır</li>
                <li>Kurları güncelledikten sonra stok özet değerleri otomatik olarak yeniden hesaplanır</li>
                <li>Geçmiş hareketler etkilenmez, sadece güncel toplam değerler güncellenir</li>
                <li>Kurları düzenli olarak güncellemeniz önerilir</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Conversion Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>Hızlı Dönüştürme Hesaplayıcı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Miktar</label>
              <Input
                type="number"
                step="0.01"
                placeholder="100"
                id="convert-amount"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dönüştür</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="convert-from"
              >
                <option value="USD">USD → TRY</option>
                <option value="EUR">EUR → TRY</option>
                <option value="TRY-USD">TRY → USD</option>
                <option value="TRY-EUR">TRY → EUR</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sonuç</label>
              <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm items-center">
                <span id="convert-result" className="font-medium">-</span>
              </div>
            </div>
          </div>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                function calculate() {
                  const amount = parseFloat(document.getElementById('convert-amount').value) || 0;
                  const type = document.getElementById('convert-from').value;
                  const usd = ${form.usd_to_try || 1};
                  const eur = ${form.eur_to_try || 1};
                  let result = 0;

                  if (type === 'USD') result = amount * usd;
                  else if (type === 'EUR') result = amount * eur;
                  else if (type === 'TRY-USD') result = amount / usd;
                  else if (type === 'TRY-EUR') result = amount / eur;

                  document.getElementById('convert-result').textContent = result.toFixed(2);
                }

                document.getElementById('convert-amount')?.addEventListener('input', calculate);
                document.getElementById('convert-from')?.addEventListener('change', calculate);
              `,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}