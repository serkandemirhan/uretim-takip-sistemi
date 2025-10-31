'use client'

import { useEffect, useState } from 'react'
import { jobsAPI, customersAPI } from '@/lib/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Filter, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { JobsStatsCards } from '@/components/features/jobs/JobsStatsCards'
import { ViewModeToggle, ViewMode } from '@/components/features/jobs/ViewModeToggle'
import { CompactJobsTable } from '@/components/features/jobs/CompactJobsTable'
import { ProcessJobsTable } from '@/components/features/jobs/ProcessJobsTable'
import { DetailedJobsTable } from '@/components/features/jobs/DetailedJobsTable'

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('process')

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
    per_page: 50, // Increased for table views
    total: 0,
    total_pages: 0,
  })

  // Mock stats - in production, get from API
  const [stats, setStats] = useState({
    active: 0,
    at_risk: 0,
    delayed: 0,
    on_hold: 0,
    completed: 0,
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

  const isJobAtRisk = (job: any) => {
    const status = (job?.status ?? '').toString().toLowerCase()
    const isActive = status === 'active' || status === 'in_progress'
    if (!isActive) return false

    const progress = typeof job?.progress === 'number' ? job.progress : null
    const rawDueDate = job?.due_date ?? job?.delivery_date ?? job?.deadline
    const dueDate = rawDueDate ? new Date(rawDueDate) : null
    const isOverdue = dueDate ? dueDate.getTime() < Date.now() : false

    return (progress !== null && progress < 50) || isOverdue
  }

  async function loadJobs() {
    try {
      setLoading(true)
      const statusFilter = filters.status
      const applyLocalRiskFilter = statusFilter === 'at_risk' || statusFilter === 'delayed'
      const params = {
        ...filters,
        status: applyLocalRiskFilter ? '' : statusFilter,
        page: pagination.page,
        per_page: pagination.per_page,
      }

      const response = await jobsAPI.getAll(params)
      const rawJobs = response.data || []

      const activeJobs = rawJobs.filter((j: any) => {
        const status = (j?.status ?? '').toString().toLowerCase()
        return status === 'active' || status === 'in_progress'
      })
      const riskyJobs = rawJobs.filter(isJobAtRisk)
      const severelyDelayedJobs = riskyJobs.filter((job: any) => {
        const progress = typeof job?.progress === 'number' ? job.progress : null
        return progress !== null && progress < 25
      })
      const onHoldJobs = rawJobs.filter((j: any) => (j?.status ?? '').toString().toLowerCase() === 'on_hold')
      const completedJobs = rawJobs.filter((j: any) => (j?.status ?? '').toString().toLowerCase() === 'completed')

      let jobsForView = rawJobs
      if (statusFilter === 'at_risk') {
        jobsForView = riskyJobs
      } else if (statusFilter === 'delayed') {
        jobsForView = severelyDelayedJobs
      }

      setJobs(jobsForView)

      if (response.meta) {
        setPagination(prev => ({
          ...prev,
          total: response.meta.total,
          total_pages: response.meta.total_pages,
        }))
      }

      setStats({
        active: activeJobs.length,
        at_risk: riskyJobs.length,
        delayed: severelyDelayedJobs.length,
        on_hold: onHoldJobs.length,
        completed: completedJobs.length,
      })
    } catch (error) {
      console.error('Jobs load error:', error)
      toast.error('İşler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function handleFilterChange(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  function handleStatusCardClick(statusFilter: string) {
    // Map card status to API status values
    const statusMap: Record<string, string> = {
      'active': 'active,in_progress',
      'at_risk': 'at_risk',
      'delayed': 'delayed',
      'on_hold': 'on_hold',
      'completed': 'completed'
    }

    const newStatus = statusMap[statusFilter] || statusFilter
    setFilters(prev => ({ ...prev, status: newStatus }))
    setPagination(prev => ({ ...prev, page: 1 }))
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
    <div className="w-full max-w-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            İşler
            <span className="text-gray-500 font-normal text-base ml-3">
              Toplam {pagination.total} iş
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/jobs/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Yeni İş
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <JobsStatsCards stats={stats} onFilterChange={handleStatusCardClick} />

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="space-y-4">
            {/* Search & Filter Toggle & View Mode */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
              {viewMode === 'process' && (
                <Button
                  variant="outline"
                  onClick={() => setShowColumnSettings(true)}
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Kolonlar
                </Button>
              )}
              <ViewModeToggle mode={viewMode} onChange={setViewMode} />
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 pt-4 border-t w-full">
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
          {/* Render appropriate view based on viewMode */}
          {viewMode === 'compact' && <CompactJobsTable jobs={jobs} />}
          {viewMode === 'process' && (
            <div className="-mx-4 sm:-mx-6 lg:-mx-8">
              <ProcessJobsTable
                jobs={jobs}
                showColumnSettings={showColumnSettings}
                setShowColumnSettings={setShowColumnSettings}
              />
            </div>
          )}
          {viewMode === 'detailed' && <DetailedJobsTable jobs={jobs} />}

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Sayfa {pagination.page} / {pagination.total_pages} - Toplam {pagination.total} iş
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
