'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, FileText, Loader2, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import { jobsAPI, quotationsAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils/cn'
import { getStatusColor, getStatusLabel, formatDate } from '@/lib/utils/formatters'
import {
  QUOTATION_STATUS_OPTIONS,
  getQuotationStatusColor,
  getQuotationStatusLabel,
} from '@/lib/utils/quotations'
import { handleApiError } from '@/lib/utils/error-handler'

const JOB_QUOTATION_HEADER_FILTERS = [
  { value: 'all', label: 'Tümü' },
  { value: 'draft', label: 'Taslak' },
  { value: 'active', label: 'Onay Bekliyor' },
  { value: 'approved', label: 'Onaylanmış' },
] as const

type JobQuotationFilter = (typeof JOB_QUOTATION_HEADER_FILTERS)[number]['value']

type JobPayload = {
  id: string
  title?: string | null
  job_number?: string | null
  revision_no?: number | null
  status?: string | null
  customer?: string | { name?: string | null; id?: string } | null
  dealer?: string | { name?: string | null; id?: string } | null
  created_by?: string | { name?: string | null; id?: string } | null
  due_date?: string | null
  description?: string | null
}

function formatCurrencyTRY(value?: number | string | null) {
  const numeric = Number(value ?? 0)
  if (!Number.isFinite(numeric)) {
    return '—'
  }

  if (numeric === 0) {
    return '0,00 ₺'
  }

  try {
    return numeric.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })
  } catch {
    return `${numeric.toFixed(2)} ₺`
  }
}

export default function JobQuotationsPage() {
  const params = useParams()
  const jobId = useMemo(() => {
    const raw = params?.id
    if (Array.isArray(raw)) {
      return raw[0] ?? ''
    }
    return (raw as string) || ''
  }, [params])

  const [job, setJob] = useState<JobPayload | null>(null)
  const [jobLoading, setJobLoading] = useState(true)
  const [jobQuotations, setJobQuotations] = useState<any[]>([])
  const [quotationsLoading, setQuotationsLoading] = useState(false)
  const [updatingQuotationId, setUpdatingQuotationId] = useState<string | null>(null)
  const [quotationStatusFilter, setQuotationStatusFilter] = useState<JobQuotationFilter>('all')
  const [quotationSearchTerm, setQuotationSearchTerm] = useState('')

  const loadJob = useCallback(async (currentJobId: string) => {
    setJobLoading(true)
    try {
      const response = await jobsAPI.getById(currentJobId)
      const payload = (response?.data ?? response ?? null) as JobPayload | null

      if (payload?.id) {
        setJob(payload)
      } else {
        setJob(null)
      }
    } catch (error) {
      handleApiError(error, 'Load job for quotation list')
      toast.error('İş bilgisi yüklenemedi')
      setJob(null)
    } finally {
      setJobLoading(false)
    }
  }, [])

  const loadJobQuotations = useCallback(async (currentJobId: string) => {
    setQuotationsLoading(true)
    try {
      const response = await quotationsAPI.getAll({ job_id: currentJobId })
      const payload = response?.data ?? response ?? []

      setJobQuotations(Array.isArray(payload) ? payload : [])
    } catch (error) {
      handleApiError(error, 'Load quotations for job')
      toast.error('Teklifler yüklenemedi')
      setJobQuotations([])
    } finally {
      setQuotationsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!jobId) {
      setJobLoading(false)
      return
    }

    void loadJob(jobId)
    void loadJobQuotations(jobId)
  }, [jobId, loadJob, loadJobQuotations])

  const quotationStatusCounts = useMemo(() => {
    const counts: Record<JobQuotationFilter, number> = {
      all: 0,
      draft: 0,
      active: 0,
      approved: 0,
    }

    for (const quotation of jobQuotations) {
      counts.all += 1
      const status = typeof quotation?.status === 'string' ? quotation.status : 'draft'
      if (status === 'draft') {
        counts.draft += 1
      } else if (status === 'active') {
        counts.active += 1
      } else if (status === 'approved') {
        counts.approved += 1
      }
    }

    return counts
  }, [jobQuotations])

  const filteredJobQuotations = useMemo(() => {
    const term = quotationSearchTerm.trim().toLowerCase()

    return jobQuotations.filter((quotation) => {
      const status = typeof quotation?.status === 'string' ? quotation.status : 'draft'
      if (quotationStatusFilter !== 'all' && status !== quotationStatusFilter) {
        return false
      }

      if (!term) {
        return true
      }

      const fields = [
        quotation?.name,
        quotation?.quotation_number,
        quotation?.description,
        quotation?.customer?.name,
        quotation?.customer_name,
      ]

      return fields.some((field) => typeof field === 'string' && field.toLowerCase().includes(term))
    })
  }, [jobQuotations, quotationStatusFilter, quotationSearchTerm])

  const resetQuotationFilters = () => {
    setQuotationStatusFilter('all')
    setQuotationSearchTerm('')
  }

  const handleQuotationStatusChange = async (quotationId: string, nextStatus: string) => {
    if (!jobId) return

    try {
      setUpdatingQuotationId(quotationId)
      await quotationsAPI.update(quotationId, { status: nextStatus })
      toast.success('Teklif durumu güncellendi')
      await loadJobQuotations(jobId)
    } catch (error: any) {
      handleApiError(error, 'Update quotation status in list')
      toast.error(error?.response?.data?.error || 'Teklif durumu güncellenemedi')
    } finally {
      setUpdatingQuotationId(null)
    }
  }

  const jobStatus = job?.status ?? 'unknown'
  const jobStatusLabel = job?.status ? getStatusLabel(job.status) : 'Durum bilgisi mevcut değil'
  const jobStatusColor = job?.status ? getStatusColor(job.status) : 'bg-gray-100 text-gray-700'
  const jobTitle = job?.job_number || job?.title || 'İş'
  const revisionLabel =
    typeof job?.revision_no === 'number' ? `Rev ${job.revision_no.toString().padStart(2, '0')}` : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Teklifler</h1>
          <p className="text-sm text-gray-500">
            {job
              ? `${jobTitle}${revisionLabel ? ` (${revisionLabel})` : ''} işi için oluşturulan teklifler`
              : jobLoading
              ? 'İş bilgisi yükleniyor...'
              : 'İş bilgisi bulunamadı'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {jobId && (
            <Link href={`/jobs/${jobId}`}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                İşi Görüntüle
              </Button>
            </Link>
          )}
          {jobId && (
            <Link href={`/jobs/${jobId}/quotation/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Teklif
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* İş Talep Numarası */}
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">İş Talep Numarası</p>
              <p className="text-sm font-medium text-gray-900">
                {job?.job_number || (jobLoading ? 'Yükleniyor...' : '—')}
              </p>
            </div>

            {/* İş Başlığı */}
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">İş Başlığı</p>
              <p className="text-sm font-medium text-gray-900">
                {job?.title || (jobLoading ? 'Yükleniyor...' : '—')}
              </p>
            </div>

            {/* Müşteri */}
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Müşteri</p>
              <p className="text-sm font-medium text-gray-900">
                {jobLoading ? 'Yükleniyor...' : (
                  typeof job?.customer === 'string'
                    ? job.customer
                    : job?.customer?.name || '—'
                )}
              </p>
            </div>

            {/* Bayi */}
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Bayi</p>
              <p className="text-sm font-medium text-gray-900">
                {jobLoading ? 'Yükleniyor...' : (
                  typeof job?.dealer === 'string'
                    ? job.dealer
                    : job?.dealer?.name || '—'
                )}
              </p>
            </div>

            {/* Durum */}
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Durum</p>
              {jobLoading ? (
                <span className="text-sm text-gray-400">Yükleniyor...</span>
              ) : (
                <Badge className={cn(jobStatusColor)}>{jobStatusLabel}</Badge>
              )}
            </div>

            {/* Termin Tarihi */}
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1">Termin Tarihi</p>
              <p className="text-sm font-medium text-gray-900">
                {job?.due_date ? formatDate(job.due_date) : jobLoading ? 'Yükleniyor...' : 'Belirtilmemiş'}
              </p>
            </div>

            {/* Açıklama - Full width */}
            {job?.description && (
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-xs uppercase text-gray-500 mb-1">Açıklama</p>
                <p className="text-sm text-gray-700">
                  {job.description}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Tüm Teklifler</CardTitle>
            <p className="text-sm text-gray-500">Bu iş talebi için oluşturulan tüm teklifleri yönetin.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {JOB_QUOTATION_HEADER_FILTERS.map((filter) => {
              const isActive = quotationStatusFilter === filter.value
              return (
                <Button
                  key={filter.value}
                  size="sm"
                  variant={isActive ? 'default' : 'outline'}
                  onClick={() => setQuotationStatusFilter(filter.value)}
                  className={cn('flex items-center gap-2', !isActive && 'bg-white text-gray-700')}
                >
                  {filter.label}
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {quotationStatusCounts[filter.value] ?? 0}
                  </span>
                </Button>
              )
            })}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={quotationSearchTerm}
                onChange={(event) => setQuotationSearchTerm(event.target.value)}
                placeholder="Teklif ara..."
                className="pl-10"
              />
            </div>
          </div>

          {quotationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : filteredJobQuotations.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
              <p>
                {jobQuotations.length === 0
                  ? 'Bu iş talebi için henüz teklif oluşturulmamış.'
                  : 'Seçili filtrelerle eşleşen teklif bulunamadı.'}
              </p>
              {jobQuotations.length === 0 ? (
                <Link href={`/jobs/${jobId}/quotation/new`}>
                  <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    İlk Teklifi Oluştur
                  </Button>
                </Link>
              ) : (
                <Button size="sm" variant="outline" onClick={resetQuotationFilters}>
                  Filtreleri Temizle
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teklif</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Kalem</TableHead>
                    <TableHead>Toplam</TableHead>
                    <TableHead>Güncelleme</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobQuotations.map((quotation) => {
                    const totalValue = quotation.total_cost_try ?? quotation.total_cost ?? 0
                    const currentStatus = typeof quotation?.status === 'string' ? quotation.status : 'draft'
                    return (
                      <TableRow key={quotation.id}>
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            {typeof quotation.name === 'string' ? quotation.name : quotation.name?.name || 'İsimsiz'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {quotation.quotation_number || 'Numara yok'}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-xs">
                          <div className="truncate">
                            {typeof quotation.description === 'string' ? quotation.description : '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={getQuotationStatusColor(currentStatus)}>
                              {getQuotationStatusLabel(currentStatus)}
                            </Badge>
                            <select
                              value={currentStatus || 'draft'}
                              onChange={(event) => handleQuotationStatusChange(quotation.id, event.target.value)}
                              disabled={updatingQuotationId === quotation.id}
                              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
                            >
                              {QUOTATION_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {getQuotationStatusLabel(status)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {quotation.item_count ?? 0}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {formatCurrencyTRY(totalValue)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {quotation.updated_at ? formatDate(quotation.updated_at) : '-'}
                        </TableCell>
                        <TableCell className="flex justify-end">
                          <Link href={`/quotations/${quotation.id}`}>
                            <Button variant="ghost" size="sm">
                              <FileText className="mr-2 h-4 w-4" />
                              Görüntüle
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
