'use client'

import { useEffect, useState } from 'react'
import { customersAPI } from '@/lib/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Building2, Phone, Mail, MapPin } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    try {
      setLoading(true)
      const response = await customersAPI.getAll()
      setCustomers(response.data || [])
    } catch (error) {
      console.error('Customers load error:', error)
      toast.error('Müşteriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Müşteriler</h1>
          <p className="text-gray-600 mt-1">Müşteri bilgilerini görüntüleyin ve yönetin</p>
        </div>
        <Link href="/customers/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Yeni Müşteri
          </Button>
        </Link>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Henüz müşteri bulunmuyor</p>
            <Link href="/customers/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                İlk Müşteriyi Ekle
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {customers.map((customer) => (
            <Link key={customer.id} href={`/customers/${customer.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-2 truncate">
                        {customer.name}
                      </h3>
                      
                      {customer.contact_person && (
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1">
                          👤 {customer.contact_person}
                        </p>
                      )}
                      
                      {customer.phone && (
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1 truncate">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          {customer.phone}
                        </p>
                      )}
                      
                      {customer.email && (
                        <p className="text-sm text-gray-600 mb-1 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {customer.email}
                        </p>
                      )}
                      
                      {customer.address && (
                        <p className="text-sm text-gray-600 flex items-start gap-1 line-clamp-2">
                          <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          {customer.address}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}