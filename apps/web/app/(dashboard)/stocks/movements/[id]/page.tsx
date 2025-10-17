'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { stockMovementsAPI } from '@/lib/api/client'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { handleError } from '@/lib/utils/error-handler'
import { FileUpload } from '@/components/features/files/FileUpload'
import { FileList } from '@/components/features/files/FileList'

type MovementDetail = {
  id: string
  stock_id: string
  product_code: string
  product_name: string
  unit: string
  movement_type: 'IN' | 'OUT'
  quantity: number
  unit_price?: number
  currency?: string
  total_value: number
  job_id?: string
  job_number?: string
  job_title?: string
  purpose?: string
  document_no?: string
  notes?: string
  created_at: string
  created_by_name?: string
}

export default function StockMovementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const movementId = params.id as string

  const [loading, setLoading] = useState(true)
  const [movement, setMovement] = useState<MovementDetail | null>(null)
  const [filesKey, setFilesKey] = useState(0)

  useEffect(() => {
    if (movementId) {
      void loadMovement()
    }
  }, [movementId])

  async function loadMovement() {
    setLoading(true)
    try {
      const res = await stockMovementsAPI.getById(movementId)
      setMovement(res?.data || null)
    } catch (err) {
      handleError(err, { title: 'Hareket detayı yüklenemedi' })
    } finally {
      setLoading(false)
    }
  }

  function handleFileUploadComplete() {
    setFilesKey(prev => prev + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!movement) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Hareket bulunamadı</p>
          <Link href="/stocks/movements">
            <Button variant="outline" className="mt-4">
              Geri Dön
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/stocks/movements">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Stok Hareketi Detayı</h1>
            <p className="text-muted-foreground">
              {movement.movement_type === 'IN' ? 'Stok Girişi' : 'Stok Çıkışı'}
            </p>
          </div>
        </div>
        {movement.movement_type === 'IN' ? (
          <span className="inline-flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg">
            <ArrowUpCircle className="w-5 h-5" />
            <span className="font-semibold">Giriş</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-red-700 bg-red-50 px-4 py-2 rounded-lg">
            <ArrowDownCircle className="w-5 h-5" />
            <span className="font-semibold">Çıkış</span>
          </span>
        )}
      </div>

      {/* Movement Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ürün Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Ürün Kodu</div>
              <div className="font-mono font-medium">{movement.product_code}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ürün Adı</div>
              <div className="font-medium">{movement.product_name}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Miktar</div>
              <div className="text-lg font-bold">
                {movement.quantity} {movement.unit}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finansal Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Birim Fiyat</div>
              <div className="font-medium">
                {movement.unit_price
                  ? `${movement.unit_price.toLocaleString('tr-TR')} ${movement.currency}`
                  : '-'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Toplam Değer</div>
              <div className="text-lg font-bold">
                {movement.total_value > 0
                  ? `${movement.total_value.toLocaleString('tr-TR')} ${movement.currency}`
                  : '-'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Para Birimi</div>
              <div className="font-medium">{movement.currency || 'TRY'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hareket Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Tarih</div>
              <div className="font-medium">
                {new Date(movement.created_at).toLocaleString('tr-TR')}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Kullanıcı</div>
              <div className="font-medium">{movement.created_by_name || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Belge No</div>
              <div className="font-medium">{movement.document_no || '-'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ek Bilgiler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {movement.job_number && (
              <div>
                <div className="text-sm text-muted-foreground">Proje</div>
                <div className="font-medium">
                  {movement.job_number} - {movement.job_title}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-muted-foreground">Amaç</div>
              <div className="font-medium">{movement.purpose || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Notlar</div>
              <div className="font-medium">{movement.notes || '-'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Belgeler ve Dosyalar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileUpload
            refType="stock_movement"
            refId={movementId}
            onUploadComplete={handleFileUploadComplete}
            maxFiles={10}
          />
          <FileList
            key={filesKey}
            refType="stock_movement"
            refId={movementId}
          />
        </CardContent>
      </Card>
    </div>
  )
}