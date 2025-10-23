'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { stockFieldSettingsAPI } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Save, RotateCcw, Settings, Check, X } from 'lucide-react'
import Link from 'next/link'

type StockFieldSetting = {
  field_key: string
  custom_label: string
  is_active: boolean
  display_order: number
  field_type: 'group' | 'category' | 'string' | 'properties'
}

const FIELD_TYPE_LABELS = {
  group: 'Grup',
  category: 'Kategori',
  string: 'Metin Alanı',
  properties: 'Özellik',
}

const FIELD_TYPE_COLORS = {
  group: 'bg-blue-50 text-blue-700 ring-blue-700/10',
  category: 'bg-purple-50 text-purple-700 ring-purple-700/10',
  string: 'bg-green-50 text-green-700 ring-green-700/10',
  properties: 'bg-orange-50 text-orange-700 ring-orange-700/10',
}

export default function StockFieldSettingsPage() {
  const [settings, setSettings] = useState<StockFieldSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      const response = await stockFieldSettingsAPI.getAll()
      const data = Array.isArray(response?.data) ? response.data : []
      setSettings(data)
      setHasChanges(false)
    } catch (error: any) {
      console.error('Ayarlar yüklenemedi:', error)
      toast.error(error?.response?.data?.error || 'Ayarlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      await stockFieldSettingsAPI.updateBulk(settings)
      toast.success('Ayarlar kaydedildi')
      setHasChanges(false)
      // Sayfayı yeniden yükle ki diğer sayfalar güncellensin
      window.dispatchEvent(new Event('stock-field-settings-updated'))
    } catch (error: any) {
      console.error('Kaydetme hatası:', error)
      toast.error(error?.response?.data?.error || 'Ayarlar kaydedilemedi')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!confirm('Tüm ayarlar sıfırlanacak. Devam etmek istiyor musunuz?')) {
      return
    }

    try {
      setSaving(true)
      await stockFieldSettingsAPI.reset()
      toast.success('Ayarlar sıfırlandı')
      await loadSettings()
    } catch (error: any) {
      console.error('Sıfırlama hatası:', error)
      toast.error(error?.response?.data?.error || 'Ayarlar sıfırlanamadı')
    } finally {
      setSaving(false)
    }
  }

  function updateSetting(field_key: string, updates: Partial<StockFieldSetting>) {
    setSettings((prev) =>
      prev.map((s) => (s.field_key === field_key ? { ...s, ...updates } : s))
    )
    setHasChanges(true)
  }

  function toggleActive(field_key: string) {
    setSettings((prev) =>
      prev.map((s) => (s.field_key === field_key ? { ...s, is_active: !s.is_active } : s))
    )
    setHasChanges(true)
  }

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.field_type]) {
      acc[setting.field_type] = []
    }
    acc[setting.field_type].push(setting)
    return acc
  }, {} as Record<string, StockFieldSetting[]>)

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="mb-2 text-lg font-medium">Yükleniyor...</div>
          <div className="text-sm text-muted-foreground">Ayarlar getiriliyor</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stok Alanları Ayarları</h1>
          <p className="text-muted-foreground">
            Stok kartlarında kullanılacak özel alanları yapılandırın
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Sıfırla
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Settings className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Nasıl Kullanılır?</p>
              <ul className="space-y-1 text-blue-800">
                <li>• Aktif etmek istediğiniz alanları seçin (checkbox)</li>
                <li>• Alanın adını özelleştirin (örn: "group1" → "Malzeme Tipi")</li>
                <li>• Sadece aktif alanlar stok sayfalarında görünecektir</li>
                <li>• Değişiklikleri kaydetmeyi unutmayın!</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings by Type */}
      {Object.entries(groupedSettings).map(([fieldType, fields]) => (
        <Card key={fieldType}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>
                {FIELD_TYPE_LABELS[fieldType as keyof typeof FIELD_TYPE_LABELS]}
              </CardTitle>
              <Badge variant="outline" className={FIELD_TYPE_COLORS[fieldType as keyof typeof FIELD_TYPE_COLORS]}>
                {fields.filter((f) => f.is_active).length} / {fields.length} Aktif
              </Badge>
            </div>
            <CardDescription>
              {fieldType === 'group' && 'Ürünleri gruplandırmak için kullanılır'}
              {fieldType === 'category' && 'Ek kategori bilgileri için kullanılır'}
              {fieldType === 'string' && 'Serbest metin alanları'}
              {fieldType === 'properties' && 'Özellik ve parametreler (JSON destekli)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fields.map((setting) => (
                <div
                  key={setting.field_key}
                  className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                    setting.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleActive(setting.field_key)}
                    className={`flex h-6 w-6 items-center justify-center rounded border-2 transition-colors ${
                      setting.is_active
                        ? 'border-green-600 bg-green-600 text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {setting.is_active && <Check className="h-4 w-4" />}
                  </button>

                  {/* Field Key Badge */}
                  <div className="w-24">
                    <Badge variant="outline" className="font-mono text-xs">
                      {setting.field_key}
                    </Badge>
                  </div>

                  {/* Custom Label Input */}
                  <div className="flex-1">
                    <Input
                      value={setting.custom_label}
                      onChange={(e) =>
                        updateSetting(setting.field_key, { custom_label: e.target.value })
                      }
                      placeholder="Özel isim girin..."
                      disabled={!setting.is_active}
                      className={!setting.is_active ? 'bg-gray-100' : ''}
                    />
                  </div>

                  {/* Status Badge */}
                  <div className="w-20">
                    {setting.is_active ? (
                      <Badge className="bg-green-600">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        Pasif
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Save Warning */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 z-50">
          <Card className="border-orange-200 bg-orange-50 shadow-lg">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="text-sm text-orange-900">
                Kaydedilmemiş değişiklikler var
              </div>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                Kaydet
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
