'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { Plus } from 'lucide-react'

import { customersAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Customer = {
  id: string
  name: string
  code?: string
  contact_name?: string
  phone?: string
  email?: string
  city?: string
  country?: string
  tax_number?: string
  created_at?: string
}

export default function CustomersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [q, setQ] = useState('')

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await customersAPI.getAll()
        // API bazen data.data döndürebilir:
        const list: Customer[] = (res?.data ?? res ?? []).slice()
        setCustomers(list)
      } catch (e) {
        console.error(e)
        toast.error('Müşteriler yüklenemedi')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return customers
    return customers.filter((c) =>
      [
        c.name,
        c.code,
        c.contact_name,
        c.phone,
        c.email,
        c.city,
        c.country,
        c.tax_number,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    )
  }, [q, customers])

  const goDetail = (id: string) => router.push(`/customers/${id}`)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Müşteri Yönetimi</h1>
          <p className="text-gray-600 mt-1">
            Müşterileri tablo halinde listeleyin, arayın ve detaylarına gidin
          </p>
        </div>
        <Link href="/customers/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Müşteri
          </Button>
        </Link>
      </div>

      {/* Arama */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Ara: ad, kod, kişi, telefon, e-posta…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-md"
        />
        <div className="text-sm text-gray-500">
          Toplam: {filtered.length}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Müşteri Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Yükleniyor…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b">
                    {/* 5–6 önemli sütun */}
                    <th className="py-3 px-4">Ad</th>
                    <th className="py-3 px-4">Kod</th>
                    <th className="py-3 px-4">Yetkili / İletişim</th>
                    <th className="py-3 px-4">Telefon</th>
                    <th className="py-3 px-4">E-posta</th>
                    <th className="py-3 px-4">Şehir / Ülke</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-gray-500">
                        Kayıt bulunamadı
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/customers/${c.id}`)}

                        // erişilebilirlik için:
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') router.push(`/customers/${c.id}`)
                        }}
                        role="button"
                        aria-label={`Müşteri detayına git: ${c.name}`}
                      >
                        <td className="py-3 px-4 font-medium">{c.name}</td>
                        <td className="py-3 px-4">
                          <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {c.code ?? '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4">{c.contact_name ?? '—'}</td>
                        <td className="py-3 px-4">{c.phone ?? '—'}</td>
                        <td className="py-3 px-4">{c.email ?? '—'}</td>
                        <td className="py-3 px-4">
                          {[c.city, c.country].filter(Boolean).join(' / ') || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
