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
import { handleError } from '@/lib/utils/error-handler'

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
  created_at?: string | null
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
          created_at: item.created_at,
        }))
        setCustomers(list)
      } catch (e) {
        handleError(e)
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
        c.contact_person,
        c.phone,
        c.phone_secondary,
        c.gsm,
        c.email,
        c.city,
        c.tax_office,
        c.tax_number,
        c.short_code,
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
                    <th className="py-3 px-4">Yetkili</th>
                    <th className="py-3 px-4">Telefonlar</th>
                    <th className="py-3 px-4">E-posta</th>
                    <th className="py-3 px-4">Şehir</th>
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
                            {c.short_code || c.code || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4">{c.contact_person ?? '—'}</td>
                        <td className="py-3 px-4">
                          {[c.phone, c.phone_secondary, c.gsm]
                            .filter(Boolean)
                            .join(' / ') || '—'}
                        </td>
                        <td className="py-3 px-4">{c.email ?? '—'}</td>
                        <td className="py-3 px-4">{c.city ?? '—'}</td>
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
