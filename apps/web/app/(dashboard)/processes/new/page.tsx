'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label' // senin verdiğin Label bileşeni
import { toast } from 'sonner'
import { processesAPI } from '@/lib/api/client'
import { handleError } from '@/lib/utils/error-handler'

type FormState = {
  name: string
  code: string
  description: string
  is_machine_based: boolean
  is_production: boolean
  order_index: number
}

export default function NewProcessPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>({
    name: '',
    code: '',
    description: '',
    is_machine_based: false,
    is_production: false,
    order_index: 0,
  })

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((s) => ({ ...s, [key]: value }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Süreç adı ve kodu zorunludur')
      return
    }
    try {
      setSaving(true)
      await processesAPI.create({
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description?.trim() || '',
        is_machine_based: !!form.is_machine_based,
        is_production: !!form.is_production,
        order_index: Number(form.order_index) || 0,
      })
      toast.success('Süreç oluşturuldu')
      router.push('/processes')
    } catch (e: any) {
      handleError(e)
      toast.error(e?.response?.data?.error ?? 'Süreç oluşturulamadı')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Yeni Süreç</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Süreç Adı *</Label>
              <Input
                placeholder="Örn: Baskı Hazırlık"
                value={form.name}
                onChange={(e) => onChange('name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Kod *</Label>
              <Input
                placeholder="Örn: PRC-001"
                value={form.code}
                onChange={(e) => onChange('code', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Açıklama</Label>
            <Textarea
              placeholder="Kısa açıklama"
              value={form.description}
              onChange={(e) => onChange('description', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* basit checkbox satırı */}
            <div className="flex items-center gap-3">
              <input
                id="is_machine_based"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={form.is_machine_based}
                onChange={(e) => onChange('is_machine_based', e.target.checked)}
              />
              <Label htmlFor="is_machine_based">Makine Bazlı</Label>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="is_production"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={form.is_production}
                onChange={(e) => onChange('is_production', e.target.checked)}
              />
              <Label htmlFor="is_production">Üretim Süreci</Label>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Sıra (order_index)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={form.order_index}
                onChange={(e) => onChange('order_index', Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
            <Button variant="outline" onClick={() => router.back()} disabled={saving}>
              İptal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
