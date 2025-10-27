'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layers, Settings2, SlidersHorizontal, ShieldCheck } from 'lucide-react'

const sections = [
  {
    title: 'Stok ve Malzeme',
    description: 'Stok kartları, ölçü birimleri ve üretimle ilgili temel ayarlar.',
    items: [
      {
        title: 'Ölçü Birimleri',
        description: 'Teklifler ve stok hareketlerinde kullanılacak birimleri tanımlayın.',
        href: '/settings/units',
        icon: Layers,
      },
      {
        title: 'Stok Alanları',
        description: 'Stok kartlarında kullanılacak özel alanları yapılandırın ve aktifleştirin.',
        href: '/settings/stock-fields',
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    title: 'İK ve Özlük',
    description: 'Çalışan özlük dokümanlarını, zorunluluk kurallarını ve denetim ayarlarını yönetin.',
    items: [
      {
        title: 'Doküman Tipleri & Kurallar',
        description: 'Özlük doküman tiplerini tanımlayın, zorunluluk kurallarını yapılandırın ve eşleştirmeleri yönetin.',
        href: '/settings/hr/documents',
        icon: ShieldCheck,
      },
    ],
  },
]

export default function SettingsOverviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ayarlar</h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            ReklamPRO deneyimini özelleştirin. Aşağıdaki kategorilerden birini seçerek detaylı ayar
            sayfalarına ulaşabilirsiniz.
          </p>
        </div>
        <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Settings2 className="h-6 w-6" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title} className="h-full">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">
                {section.title}
              </CardTitle>
              <p className="text-sm text-gray-600">{section.description}</p>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0">
                      Aç
                    </Button>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
