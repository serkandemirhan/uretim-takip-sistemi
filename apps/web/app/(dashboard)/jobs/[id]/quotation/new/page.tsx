'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { jobsAPI, quotationsAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'
import { getStatusLabel, getStatusColor, formatDate } from '@/lib/utils/formatters'
import {
  QUOTATION_STATUS_OPTIONS,
  getQuotationStatusLabel,
  generateQuotationName,
} from '@/lib/utils/quotations'
import { handleApiError } from '@/lib/utils/error-handler'

const DEFAULT_STATUS: (typeof QUOTATION_STATUS_OPTIONS)[number] = 'draft'

type CreateQuotationPayload = Parameters<(typeof quotationsAPI)['create']>[0]

type JobPayload = {
  id: string
  title?: string
  job_number?: string
  revision_no?: number | null
  status?: string | null
  customer?: { id?: string; name?: string | null } | null
  due_date?: string | null
  description?: string | null
}

export default function JobQuotationCreatePage() {
  const params = useParams()
  const router = useRouter()
  const jobId = useMemo(() => {
    const raw = params?.id
    if (Array.isArray(raw)) {
      return raw[0] ?? ''
    }
    return (raw as string) || ''
  }, [params])

  const [job, setJob] = useState<JobPayload | null>(null)
  const [jobQuotations, setJobQuotations] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', status: DEFAULT_STATUS, description: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const jobStatus = job?.status ?? 'unknown'
  const jobStatusLabel = job?.status ? getStatusLabel(job.status) : 'Durum bilgisi mevcut değil'

  useEffect(() => {
    if (!jobId) {
      setLoading(false)
      return
    }

    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const [jobResponse, quotationsResponse] = await Promise.all([
          jobsAPI.getById(jobId),
          quotationsAPI.getAll({ job_id: jobId }),
        ])
        if (!isMounted) return

        const jobPayload: JobPayload | null = (jobResponse?.data ?? jobResponse ?? null) as JobPayload | null
        const quotationsPayload = quotationsResponse?.data ?? quotationsResponse ?? []

        if (jobPayload?.id) {
          setJob(jobPayload)
          setJobQuotations(Array.isArray(quotationsPayload) ? quotationsPayload : [])
          const generatedName = generateQuotationName(
            jobPayload,
            Array.isArray(quotationsPayload) ? quotationsPayload : [],
          )
          setForm((prev) => ({ ...prev, name: generatedName || prev.name, status: prev.status || DEFAULT_STATUS }))
        } else {
          setJob(null)
        }
      } catch (error) {
        handleApiError(error, 'Load job for quotation create')
        toast.error('İş bilgisi yüklenemedi')
        if (isMounted) {
          setJob(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      isMounted = false
    }
  }, [jobId])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!jobId) {
      toast.error('İş bilgisi bulunamadı')
      return
    }

    const trimmedName = form.name.trim()
    if (!trimmedName) {
      toast.error('Teklif adı giriniz')
      return
    }

    const payload: CreateQuotationPayload = {
      name: trimmedName,
      job_id: jobId,
      status: form.status || DEFAULT_STATUS,
    }

    const description = form.description.trim()
    if (description) {
      payload.description = description
    }
    const customerId = job?.customer?.id
    if (customerId) {
      payload.customer_id = customerId
    }

    try {
      setSubmitting(true)
      await quotationsAPI.create(payload)
      toast.success('Teklif oluşturuldu')
      router.push(`/jobs/${jobId}`)
    } catch (error: any) {
      handleApiError(error, 'Create quotation from job page')
      toast.error(error?.response?.data?.error || 'Teklif oluşturulamadı')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {jobId && (
              <Link href={`/jobs/${jobId}`}>
                <Button variant="outline">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  İşe Geri Dön
                </Button>
              </Link>
            )}
            <h1 className="text-2xl font-bold text-gray-900">Yeni Teklif Oluştur</h1>
          </div>
          {job && (
            <p className="text-sm text-gray-600">
              {job.job_number && <span className="font-medium">{job.job_number}</span>}
              {job.job_number && job.title ? ' • ' : null}
              {job.title}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      ) : !job ? (
        <Card>
          <CardHeader>
            <CardTitle>İş Bulunamadı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-600">
            <p>Talep edilen iş bilgisine ulaşılamadı. Lütfen geri dönüp tekrar deneyin.</p>
            {jobId && (
              <Link href={`/jobs/${jobId}`}>
                <Button variant="outline">İş Sayfasına Dön</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Teklif Bilgileri</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quotation_name">Teklif Adı</Label>
                    <Input
                      id="quotation_name"
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Teklif adını girin"
                    />
                    <p className="text-xs text-gray-500">
                      Teklif adı iş numarası ve revizyon bilgisine göre otomatik önerildi.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quotation_status">Durum</Label>
                    <select
                      id="quotation_status"
                      value={form.status}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, status: event.target.value as typeof DEFAULT_STATUS }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      {QUOTATION_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {getQuotationStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quotation_description">Açıklama</Label>
                    <Textarea
                      id="quotation_description"
                      value={form.description}
                      onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                      rows={4}
                      placeholder="İsteğe bağlı olarak teklif açıklaması ekleyin"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Oluşturuluyor...' : 'Teklif Oluştur'}
                  </Button>
                  {jobId && (
                    <Link href={`/jobs/${jobId}`}>
                      <Button type="button" variant="outline">
                        Vazgeç
                      </Button>
                    </Link>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>İş Özeti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-gray-600">
              <div>
                <p className="font-medium text-gray-500">Durum</p>
                <Badge className={cn('mt-1', getStatusColor(jobStatus))}>{jobStatusLabel}</Badge>
              </div>
              {job.customer?.name && (
                <div>
                  <p className="font-medium text-gray-500">Müşteri</p>
                  <p className="text-gray-700">{job.customer.name}</p>
                </div>
              )}
              {job.due_date && (
                <div>
                  <p className="font-medium text-gray-500">Termin Tarihi</p>
                  <p className="text-gray-700">{formatDate(job.due_date)}</p>
                </div>
              )}
              <div>
                <p className="font-medium text-gray-500">Mevcut Teklif Sayısı</p>
                <p className="text-gray-700">{jobQuotations.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
