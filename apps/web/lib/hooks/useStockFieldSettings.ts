import { useEffect, useState } from 'react'
import { stockFieldSettingsAPI } from '@/lib/api/client'

export type StockFieldSetting = {
  field_key: string
  custom_label: string
  is_active: boolean
  display_order: number
  field_type: 'group' | 'category' | 'string' | 'properties'
}

/**
 * Hook: Aktif stok alanlarını yönetir
 *
 * Kullanım:
 * const { activeFields, getLabel, isFieldActive, loading } = useStockFieldSettings()
 *
 * activeFields: Sadece aktif olan alanlar (display_order'a göre sıralı)
 * getLabel: Alan için custom label getir (örn: 'group1' → 'Malzeme Tipi')
 * isFieldActive: Alanın aktif olup olmadığını kontrol et
 */
export function useStockFieldSettings() {
  const [settings, setSettings] = useState<StockFieldSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // İlk yüklemede ve ayarlar değiştiğinde yeniden yükle
  useEffect(() => {
    loadSettings()

    // Global event listener - ayarlar değiştiğinde yeniden yükle
    const handleUpdate = () => {
      loadSettings()
    }
    window.addEventListener('stock-field-settings-updated', handleUpdate)

    return () => {
      window.removeEventListener('stock-field-settings-updated', handleUpdate)
    }
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      setError(null)
      const response = await stockFieldSettingsAPI.getAll({ active_only: false })
      const data = Array.isArray(response?.data) ? response.data : []
      setSettings(data)
    } catch (err: any) {
      console.error('Stock field settings yüklenemedi:', err)
      setError(err?.response?.data?.error || 'Ayarlar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  // Sadece aktif alanlar, sıralı
  const activeFields = settings
    .filter((s) => s.is_active)
    .sort((a, b) => a.display_order - b.display_order)

  // Alan için label getir
  const getLabel = (field_key: string): string => {
    const setting = settings.find((s) => s.field_key === field_key)
    return setting?.custom_label || field_key
  }

  // Alan aktif mi?
  const isFieldActive = (field_key: string): boolean => {
    const setting = settings.find((s) => s.field_key === field_key)
    return setting?.is_active || false
  }

  // Tip bazında aktif alanlar
  const getActiveFieldsByType = (field_type: StockFieldSetting['field_type']) => {
    return activeFields.filter((f) => f.field_type === field_type)
  }

  // Tüm aktif alan anahtarları (array)
  const activeFieldKeys = activeFields.map((f) => f.field_key)

  return {
    settings,
    activeFields,
    activeFieldKeys,
    getLabel,
    isFieldActive,
    getActiveFieldsByType,
    loading,
    error,
    refresh: loadSettings,
  }
}

/**
 * Utility: Stock field'ları filtrele
 * Sadece aktif alanları içerecek şekilde stock objesini filtreler
 */
export function filterStockByActiveFields(
  stock: any,
  activeFieldKeys: string[]
): Record<string, any> {
  const filtered: Record<string, any> = {}

  // Temel alanlar her zaman dahil
  const baseFields = [
    'id',
    'product_code',
    'product_name',
    'category',
    'unit',
    'current_quantity',
    'reserved_quantity',
    'available_quantity',
    'min_quantity',
    'unit_price',
    'currency',
    'supplier_name',
    'description',
    'is_critical',
    'is_active',
    'created_at',
    'updated_at',
  ]

  // Temel alanları ekle
  baseFields.forEach((key) => {
    if (stock[key] !== undefined) {
      filtered[key] = stock[key]
    }
  })

  // Aktif custom alanları ekle
  activeFieldKeys.forEach((key) => {
    if (stock[key] !== undefined) {
      filtered[key] = stock[key]
    }
  })

  return filtered
}
