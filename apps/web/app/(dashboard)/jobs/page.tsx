'use client'

import { useEffect, useState } from 'react'
import { jobsAPI, customersAPI } from '@/lib/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { getStatusLabel, getStatusColor, formatDate } from '@/lib/utils/formatters'

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    customer_id: '',
    priority: '',
    date_from: '',
    date_to: '',
  })
  
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 20,
    total: 0,
    total_pages: 0,
  })

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    loadJobs()
  }, [filters, pagination.page])

  async function loadCustomers() {
    try {
      const response = await customersAPI.getAll()
      setCustomers(response.data || [])
    } catch (error) {
      console.error('Customers load error:', error)
    }
  }

  async function loadJobs() {
    try {
      setLoading(true)
      const params = {
        ...filters,
        page: pagination.page,
        per_page: pagination.per_page,
      }
      
      const response = await jobsAPI.getAll(params)
      setJobs(response.data || [])
      
      if (response.meta) {
        setPagination(prev => ({
          ...prev,
          total: response.meta.total,
          total_pages: response.meta.total_pages,
        }))
      }
    } catch (error) {
      console.error('Jobs load error:', error)
      toast.error('İşler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to page 1
  }

  function clearFilters() {
    setFilters({
      search: '',
      status: '',
      customer_id: '',
      priority: '',
      date_from: '',
      date_to: '',
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  function hasActiveFilters() {
    return Object.values(filters).some(v => v !== '')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">İşler</h1>
          <p className="text-gray-600 mt-1">
            Toplam {pagination.total} iş
          </p>
        </div>
        <Link href="/jobs/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Yeni İş
          </Button>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search & Filter Toggle */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="İş başlığı, numarası veya müşteri adı ile ara..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? 'bg-blue-50' : ''}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtreler
                {hasActiveFilters() && (
                  <Badge className="ml-2 bg-blue-600">
                    {Object.values(filters).filter(v => v !== '').length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 pt-4 border-t">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Durum</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Tümü</option>
                    <option value="draft">Taslak</option>
                    <option value="active">Aktif</option>
                    <option value="in_progress">Devam Ediyor</option>
                    <option value="on_hold">Beklemede</option>
                    <option value="completed">Tamamlandı</option>
                    <option value="canceled">İptal Edildi</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Öncelik</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Tümü</option>
                    <option value="low">Düşük</option>
                    <option value="normal">Normal</option>
                    <option value="high">Yüksek</option>
                    <option value="urgent">Acil</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Müşteri</label>
                  <select
                    value={filters.customer_id}
                    onChange={(e) => handleFilterChange('customer_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Tümü</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Başlangıç</label>
                  <Input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Bitiş</label>
                  <Input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  />
                </div>

                {hasActiveFilters() && (
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      onClick={clearFilters}
                      className="w-full"
                    >
                      Filtreleri Temizle
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">
              {hasActiveFilters() ? 'Filtreye uygun iş bulunamadı' : 'Henüz iş bulunmuyor'}
            </p>
            {hasActiveFilters() ? (
              <Button variant="outline" onClick={clearFilters}>
                Filtreleri Temizle
              </Button>
            ) : (
              <Link href="/jobs/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  İlk İşi Oluştur
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {job.title}
                          </h3>
                          <Badge className={getStatusColor(job.status)}>
                            {getStatusLabel(job.status)}
                          </Badge>
                          {job.priority !== 'normal' && (
                            <Badge variant="outline" className={
                              job.priority === 'urgent' ? 'text-red-600 border-red-300' :
                              job.priority === 'high' ? 'text-orange-600 border-orange-300' :
                              'text-gray-600'
                            }>
                              {job.priority === 'urgent' ? 'Acil' :
                               job.priority === 'high' ? 'Yüksek' : 'Düşük'}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="font-mono">{job.job_number}</span>
                          {job.customer_name && (
                            <>
                              <span>•</span>
                              <span>🏢 {job.customer_name}</span>
                            </>
                          )}
                          {job.due_date && (
                            <>
                              <span>•</span>
                              <span>📅 {formatDate(job.due_date)}</span>
                            </>
                          )}
                        </div>

                        {/* Progress */}
                        {job.total_steps > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>İlerleme</span>
                              <span>{job.progress}% ({job.completed_steps}/{job.total_steps})</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-right text-sm text-gray-500">
                        <div>Rev.{job.revision_no}</div>
                        <div className="text-xs mt-1">
                          {new Date(job.created_at).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Sayfa {pagination.page} / {pagination.total_pages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Önceki
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.total_pages}
                >
                  Sonraki
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}