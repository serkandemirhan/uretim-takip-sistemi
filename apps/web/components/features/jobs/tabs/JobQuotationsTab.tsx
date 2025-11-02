'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Loader2, Plus, Save, X, Trash2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { getStatusColor, getStatusLabel, formatDate } from '@/lib/utils/formatters'
import {
  QUOTATION_STATUS_OPTIONS,
  getQuotationStatusColor,
  getQuotationStatusLabel,
} from '@/lib/utils/quotations'
import { handleApiError } from '@/lib/utils/error-handler'

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
  const [deletingQuotationId, setDeletingQuotationId] = useState<string | null>(null)
  const [editingQuotationId, setEditingQuotationId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')

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

  const handleCreateNewQuotation = async () => {
    if (!jobId || isCreating) return // to prevent re-entrancy

    setIsCreating(true)
    try {
      const nowLabel = new Date().toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
      const newName = `Yeni Malzeme Listesi - ${nowLabel}`

      const payload: Parameters<(typeof quotationsAPI)['create']>[0] = {
        job_id: jobId,
        name: newName,
        description: '',
        status: 'draft',
      }

      const customerId = job?.customer && typeof job.customer === 'object' ? job.customer.id : null
      if (customerId) {
        payload.customer_id = customerId
      }
      const dealerId = job?.dealer && typeof job.dealer === 'object' ? job.dealer.id : null
      if (dealerId) {
        payload.dealer_id = dealerId
      }


      const response = await quotationsAPI.create(payload)

      const newQuotation = response.data
      setJobQuotations((prev) => [newQuotation, ...prev])
      setEditingQuotationId(newQuotation.id)
      setEditingName(newQuotation.name)
      setEditingDescription(newQuotation.description || '')
      toast.success('Yeni malzeme listesi taslağı oluşturuldu. Şimdi düzenleyebilirsiniz.')
    } catch (error) {
      handleApiError(error, 'Create new quotation inline')
      toast.error('Yeni malzeme listesi oluşturulamadı.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleSaveEditing = async () => {
    if (!editingQuotationId) return

    try {
      await quotationsAPI.update(editingQuotationId, {
        name: editingName,
        description: editingDescription,
      })
      await loadJobQuotations(jobId) // Listeyi yenile
      setEditingQuotationId(null)
      toast.success('Malzeme listesi güncellendi.')
    } catch (error) {
      handleApiError(error, 'Save inline quotation edit')
      toast.error('Güncelleme sırasında bir hata oluştu.')
    }
  }

  const handleDeleteQuotation = async (quotationId: string, quotationStatus: string) => {
    if (!jobId || deletingQuotationId) return

    // Onaylanmış listelerin silinmesini engelle
    if (quotationStatus === 'approved') {
      toast.error('Onaylanmış malzeme listeleri silinemez.', {
        description: 'Bu listeyi silebilmek için önce durumunu "Taslak" olarak değiştirmeniz gerekir.',
      })
      return
    }

    const isConfirmed = window.confirm(
      'Bu malzeme listesini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
    )
    if (!isConfirmed) {
      return
    }

    setDeletingQuotationId(quotationId)
    try {
      await quotationsAPI.delete(quotationId)
      toast.success('Malzeme listesi başarıyla silindi.')
      await loadJobQuotations(jobId) // Listeyi tazeleyerek silineni kaldır
    } catch (error) {
      handleApiError(error, 'Delete quotation')
      toast.error('Malzeme listesi silinirken bir hata oluştu.')
    } finally {
      setDeletingQuotationId(null)
    }
  }

  const cancelEditing = () => setEditingQuotationId(null)

  const jobStatusLabel = job?.status ? getStatusLabel(job.status) : 'Durum bilgisi mevcut değil'
  const jobStatusColor = job?.status ? getStatusColor(job.status) : 'bg-gray-100 text-gray-700'
  const jobTitle = job?.job_number || job?.title || 'İş'
  const revisionLabel =
    typeof job?.revision_no === 'number' ? `Rev ${job.revision_no.toString().padStart(2, '0')}` : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900"> Tüm Malzeme Listeleri</h1>
        <Button onClick={handleCreateNewQuotation} disabled={isCreating || !!editingQuotationId}>
          {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          {isCreating ? 'Oluşturuluyor...' : 'Yeni Malzeme Listesi'}
        </Button>
      </div>

      

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-gray-500">Bu iş talebi için oluşturulan tüm malzeme listelerini yönetin.</p>
        </CardHeader>
        <CardContent>
          {quotationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : jobQuotations.length === 0 ? (
            <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
              <p>Bu iş talebi için henüz malzeme listesi oluşturulmamış.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateNewQuotation}
                disabled={isCreating || !!editingQuotationId}
              >
                <Plus className="mr-2 h-4 w-4" />
                İlk Malzeme Listesini Oluştur
              </Button>
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
                  {jobQuotations.map((quotation) => {
                    const status = typeof quotation?.status === 'string' && quotation.status
                      ? quotation.status
                      : 'draft'
                    const items = Array.isArray(quotation?.items) ? quotation.items : []
                    const rawItemCount =
                      quotation?.item_count ??
                      quotation?.items_count ??
                      quotation?.itemsCount ??
                      items.length
                    const parsedItemCount = (() => {
                      if (typeof rawItemCount === 'number') return rawItemCount
                      if (typeof rawItemCount === 'string' && rawItemCount.trim()) {
                        const numeric = Number.parseInt(rawItemCount, 10)
                        if (Number.isFinite(numeric)) return numeric
                      }
                      return items.length
                    })()
                    const itemCount = Number.isFinite(parsedItemCount) ? parsedItemCount : items.length

                    const totalCost = (() => {
                      const apiTotal =
                        typeof quotation?.total_cost_try === 'number'
                          ? quotation.total_cost_try
                          : typeof quotation?.total_cost === 'number'
                            ? quotation.total_cost
                            : typeof quotation?.total_cost === 'string'
                              ? Number.parseFloat(quotation.total_cost)
                              : null
                      if (typeof apiTotal === 'number' && Number.isFinite(apiTotal)) {
                        return apiTotal
                      }
                      return items.reduce((acc: number, item: any) => {
                        const quantity = Number(item?.quantity ?? 0)
                        const unitPrice = Number(item?.unit_price ?? 0)
                        if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return acc
                        return acc + quantity * unitPrice
                      }, 0)
                    })()
                    const updatedAt = quotation.updated_at || quotation.created_at || null
                    const updatedBy =
                      quotation.updated_by?.full_name ||
                      quotation.updated_by_name ||
                      quotation.created_by?.full_name ||
                      quotation.created_by_name ||
                      null

                    const isEditing = editingQuotationId === quotation.id

                    const quotationsHomePath = `/jobs/${jobId}?tab=quotations`
                    const quotationDetailUrl = `/jobs/${jobId}/quotations/${quotation.id}?backTo=${encodeURIComponent(
                      quotationsHomePath
                    )}`

                    return (
                      <TableRow key={quotation.id}>
                        <TableCell className="space-y-1 align-top">
                          {isEditing ? (
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="text-sm"
                              placeholder="Malzeme Listesi Adı"
                            />
                          ) : (
                            <>
                              <Link
                                href={quotationDetailUrl}
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
                            </>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {isEditing ? (
                            <Textarea
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              className="text-sm min-h-[60px]"
                              placeholder="Açıklama ekleyin..."
                            />
                          ) : (
                            <p className="text-sm text-gray-700">
                              {quotation?.description ? (
                                <span className="line-clamp-3">{quotation.description}</span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Button size="icon" onClick={handleSaveEditing}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="outline" onClick={cancelEditing}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
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
                          )}
                        </TableCell>
                        <TableCell className="text-center align-top text-sm text-gray-700">
                          {itemCount}
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
                          <div className="flex items-center justify-end gap-2">
                            <Link href={quotationDetailUrl}>
                              <Button variant="outline" size="sm" className="h-8">
                                Görüntüle
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleDeleteQuotation(quotation.id, status)}
                              disabled={deletingQuotationId === quotation.id}
                              aria-label="Sil"
                            >
                              {deletingQuotationId === quotation.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
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
