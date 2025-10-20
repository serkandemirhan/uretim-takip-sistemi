'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import StatusBadge from '@/components/features/procurement/StatusBadge'
import PriorityBadge from '@/components/features/procurement/PriorityBadge'
import { purchaseRequestsAPI } from '@/lib/api/procurement'
import { toast } from 'sonner'

export default function PurchaseRequestsPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    loadRequests()
  }, [filter])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const filters = filter !== 'all' ? { status: filter } : {}
      const response = await purchaseRequestsAPI.list(filters)
      setRequests(response.data || [])
    } catch (error) {
      toast.error('Satın alma talepleri yüklenemedi')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Satın Alma Talepleri</h1>
          <p className="text-sm text-gray-600">Purchase Requests yönetimi</p>
        </div>
        <Link href="/procurement/requests/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Talep
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'draft', 'pending_approval', 'approved'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? 'Tümü' :
             status === 'draft' ? 'Taslak' :
             status === 'pending_approval' ? 'Onay Bekliyor' :
             'Onaylananlar'}
          </Button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Yükleniyor...
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Henüz satın alma talebi yok
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request: any) => (
            <Card key={request.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        href={`/procurement/requests/${request.id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {request.request_number}
                      </Link>
                      <StatusBadge status={request.status} type="pr" />
                      <PriorityBadge priority={request.priority} />
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Kalemler:</span>
                        <span className="ml-2 font-medium">{request.items_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Toplam:</span>
                        <span className="ml-2 font-medium">{request.estimated_total?.toLocaleString('tr-TR')} ₺</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Talep Eden:</span>
                        <span className="ml-2">{request.requested_by_name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tarih:</span>
                        <span className="ml-2">{new Date(request.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>

                    {request.notes && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-1">{request.notes}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
