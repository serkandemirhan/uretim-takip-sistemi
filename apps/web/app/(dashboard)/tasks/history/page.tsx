'use client'

import { useEffect, useState } from 'react'
import { tasksAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Clock, TrendingUp, Briefcase, Filter } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils/formatters'

export default function ProductionHistoryPage() {
  const [history, setHistory] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
  })

  useEffect(() => {
    loadData()
  }, [filters])

  async function loadData() {
    try {
      setLoading(true)
      const [historyRes, statsRes] = await Promise.all([
        tasksAPI.getHistory(filters),
        tasksAPI.getStats(),
      ])
      setHistory(historyRes.data || [])
      setStats(statsRes.data || {})
    } catch (error) {
      console.error('Load error:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function formatDuration(minutes: number) {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    
    if (hours > 0) {
      return `${hours}s ${mins}dk`
    }
    return `${mins}dk`
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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Üretim Geçmişi</h1>
        <p className="text-gray-600 mt-1">Tamamladığınız görevler ve performans metrikleri</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Tamamlanan Görev
              </CardTitle>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_completed}</div>
              <p className="text-xs text-gray-500 mt-1">Son 30 gün</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Toplam Süre
              </CardTitle>
              <Clock className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_hours}s</div>
              <p className="text-xs text-gray-500 mt-1">Çalışma saati</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Ortalama Süre
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avg_duration_minutes}dk</div>
              <p className="text-xs text-gray-500 mt-1">Görev başına</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                İş Sayısı
              </CardTitle>
              <Briefcase className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_jobs}</div>
              <p className="text-xs text-gray-500 mt-1">Farklı iş</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Process Distribution */}
      {stats?.by_process && stats.by_process.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Süreç Dağılımı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.by_process.map((item: any, index: number) => {
                const percentage = Math.round((item.count / stats.total_completed) * 100)
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{item.process_name}</span>
                      <span className="text-gray-600">{item.count} görev ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date_from">Başlangıç Tarihi</Label>
              <Input
                id="date_from"
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_to">Bitiş Tarihi</Label>
              <Input
                id="date_to"
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <Card>
        <CardHeader>
          <CardTitle>Tamamlanan Görevler ({history.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Henüz tamamlanmış görev bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <Link key={item.id} href={`/jobs/${item.job.id}`}>
                  <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {item.process.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {item.job.title}
                        </p>
                        <code className="text-xs text-gray-500">
                          {item.job.job_number}
                        </code>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-green-600">
                          ✓ Tamamlandı
                        </div>
                        {item.completed_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            {formatDateTime(item.completed_at)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 pt-3 border-t">
                      {/* Duration */}
                      {item.actual_duration_minutes && (
                        <div className="text-sm">
                          <div className="text-gray-600 mb-1">Süre</div>
                          <div className="font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(item.actual_duration_minutes)}
                          </div>
                        </div>
                      )}

                      {/* Production */}
                      {item.production_quantity && (
                        <div className="text-sm">
                          <div className="text-gray-600 mb-1">Üretim</div>
                          <div className="font-medium">
                            {item.production_quantity} {item.production_unit}
                          </div>
                        </div>
                      )}

                      {/* Machine */}
                      {item.machine_name && (
                        <div className="text-sm">
                          <div className="text-gray-600 mb-1">Makine</div>
                          <div className="font-medium">
                            {item.machine_name}
                          </div>
                        </div>
                      )}

                      {/* Customer */}
                      {item.customer_name && (
                        <div className="text-sm">
                          <div className="text-gray-600 mb-1">Müşteri</div>
                          <div className="font-medium">
                            {item.customer_name}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {item.production_notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
                        <strong>Not:</strong> {item.production_notes}
                      </div>
                    )}

                    {/* Performance Indicator */}
                    {item.estimated_duration && item.actual_duration_minutes && (
                      <div className="mt-3 flex items-center gap-2">
                        {item.actual_duration_minutes <= item.estimated_duration ? (
                          <div className="text-xs text-green-600 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Hedeften {Math.round(((item.estimated_duration - item.actual_duration_minutes) / item.estimated_duration) * 100)}% hızlı
                          </div>
                        ) : (
                          <div className="text-xs text-orange-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Hedeften {Math.round(((item.actual_duration_minutes - item.estimated_duration) / item.estimated_duration) * 100)}% uzun
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}