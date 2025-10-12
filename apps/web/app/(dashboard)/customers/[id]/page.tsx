'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { customersAPI } from '@/lib/api/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [c, setC] = useState<any>(null)

  useEffect(() => {
    (async () => {
      try {
        const res = await customersAPI.getById(String(id))
        setC(res?.data ?? res)
      } catch (e) {
        handleError(e)
        toast.error('Müşteri getirilemedi')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return <div className="p-6">Yükleniyor…</div>
  if (!c) return <div className="p-6">Kayıt bulunamadı</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{c.name}</h1>
        <Button variant="outline" onClick={() => router.back()}>Geri</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Özet</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div><span className="text-sm text-gray-500">Kod</span><div>{c.code ?? '—'}</div></div>
          <div><span className="text-sm text-gray-500">Yetkili</span><div>{c.contact_name ?? '—'}</div></div>
          <div><span className="text-sm text-gray-500">Telefon</span><div>{c.phone ?? '—'}</div></div>
          <div><span className="text-sm text-gray-500">E-posta</span><div>{c.email ?? '—'}</div></div>
          <div><span className="text-sm text-gray-500">Konum</span><div>{[c.city, c.country].filter(Boolean).join(' / ') || '—'}</div></div>
          <div><span className="text-sm text-gray-500">Vergi No</span><div>{c.tax_number ?? '—'}</div></div>
        </CardContent>
      </Card>
    </div>
  )
}
