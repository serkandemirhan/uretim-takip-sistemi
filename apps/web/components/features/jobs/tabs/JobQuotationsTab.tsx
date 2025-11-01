'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, Loader2, Package, Plus, Search, TrendingUp } from 'lucide-react'
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

interface JobQuotationsTabProps {
  jobId: string
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

export function JobQuotationsTab({ jobId }: JobQuotationsTabProps) {
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
      toast.error('Malzeme listeleri yüklenemedi')
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
      toast.success('Malzeme listesi durumu güncellendi')
      await loadJobQuotations(jobId)
    } catch (error: any) {
      handleApiError(error, 'Update quotation status in list')
      toast.error(error?.response?.data?.error || 'Malzeme listesi durumu güncellenemedi')
    } finally {
      setUpdatingQuotationId(null)
    }
  }

  const jobStatusLabel = job?.status ? getStatusLabel(job.status) : 'Durum bilgisi mevcut değil'
  const jobStatusColor = job?.status ? getStatusColor(job.status) : 'bg-gray-100 text-gray-700'
  const jobTitle = job?.job_number || job?.title || 'İş'
  const revisionLabel =
    typeof job?.revision_no === 'number' ? `Rev ${job.revision_no.toString().padStart(2, '0')}` : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Malzeme Listeleri</h1>
     
        <div className="flex flex-wrap gap-2">
      
      
          {jobId && (
            <Link href={`/jobs/${jobId}/quotation/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Malzeme Listesi
              </Button>
            </Link>
          )}

          </div> 
        </div>

      </div>

      

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Tüm Malzeme Listeleri</CardTitle>
            <p className="text-sm text-gray-500">Bu iş talebi için oluşturulan tüm malzeme listelerini yönetin.</p>
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
                placeholder="Malzeme listesi ara..."
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
                  ? 'Bu iş talebi için henüz malzeme listesi oluşturulmamış.'
                  : 'Seçili filtrelerle eşleşen malzeme listesi bulunamadı.'}
              </p>
              {jobQuotations.length === 0 ? (
                <Link href={`/jobs/${jobId}/quotation/new`}>
                  <Button size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    İlk Malzeme Listesini Oluştur
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
                    <TableHead className="min-w-[220px]">Malzeme Listesi</TableHead>
                    <TableHead className="min-w-[200px]">Açıklama</TableHead>
                    <TableHead className="min-w-[200px]">Durum</TableHead>
                    <TableHead className="text-center">Kalem</TableHead>
                    <TableHead className="min-w-[120px]">Toplam</TableHead>
                    <TableHead className="min-w-[140px]">Güncelleme</TableHead>
                    <TableHead className="text-right min-w-[140px]">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobQuotations.map((quotation) => {
                    const status = typeof quotation?.status === 'string' && quotation.status
                      ? quotation.status
                      : 'draft'
                    const items = Array.isArray(quotation?.items) ? quotation.items : []
                    const totalCost = items.reduce((acc: number, item: any) => {
                      const quantity = Number(item?.quantity ?? 0)
                      const unitPrice = Number(item?.unit_price ?? 0)
                      if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return acc
                      return acc + quantity * unitPrice
                    }, 0)
                    const updatedAt = quotation.updated_at || quotation.created_at || null
                    const updatedBy =
                      quotation.updated_by?.full_name ||
                      quotation.updated_by_name ||
                      quotation.created_by?.full_name ||
                      quotation.created_by_name ||
                      null

                    return (
                      <TableRow key={quotation.id}>
                        <TableCell className="space-y-1 align-top">
                          <Link
                            href={`/jobs/${jobId}/quotations/${quotation.id}`}
                            className="text-sm font-semibold text-blue-600 hover:underline"
                          >
                            {quotation?.name || 'Malzeme Listesi'}
                          </Link>
                          <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2">
                            <span>
                              {quotation?.quotation_number
                                ? `ML-${quotation.quotation_number}`
                                : `ML-${quotation?.id?.slice(0, 6)?.toUpperCase() ?? '—'}`}
                            </span>
                            {!!quotation?.customer?.name && (
                              <span className="flex items-center gap-1 text-gray-400">
                                <FileText className="h-3 w-3" />
                                {quotation.customer.name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <p className="text-sm text-gray-700">
                            {quotation?.description ? (
                              <span className="line-clamp-3">{quotation.description}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </p>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
                            <Badge className={getQuotationStatusColor(status)}>
                              {getQuotationStatusLabel(status)}
                            </Badge>
                            <select
                              value={status}
                              onChange={(event) => handleQuotationStatusChange(quotation.id, event.target.value)}
                              className="w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none lg:w-[160px]"
                              disabled={updatingQuotationId === quotation.id}
                            >
                              {QUOTATION_STATUS_OPTIONS.map((optionStatus) => {
                                return (
                                  <option key={optionStatus} value={optionStatus}>
                                    {getQuotationStatusLabel(optionStatus)}
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                        </TableCell>
                        <TableCell className="text-center align-top text-sm text-gray-700">
                          {items.length}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrencyTRY(totalCost)}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="text-sm text-gray-700">{updatedAt ? formatDate(updatedAt) : '—'}</div>
                          {updatedBy && (
                            <div className="text-xs text-gray-400">{updatedBy}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right align-top">
                          <Link href={`/jobs/${jobId}/quotations/${quotation.id}`}>
                            <Button variant="outline" size="sm">
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
