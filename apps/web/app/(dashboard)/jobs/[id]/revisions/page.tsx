'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { jobsAPI } from '@/lib/api/client'
import { getStatusColor, getStatusLabel } from '@/lib/utils/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, RefreshCcw } from 'lucide-react'
import { toast } from 'sonner'

type RevisionChange = {
  old?: string | null
  new?: string | null
}

type Revision = {
  id: string
  revision_no?: number
  revision_reason?: string | null
  changes?: Record<string, RevisionChange>
  created_at: string
  created_by_name?: string | null
}

type JobSummary = {
  id: string
  job_number: string
  title: string
  status: string
  revision_no?: number
}

export default function JobRevisionsPage() {
  const params = useParams()
  const jobId = params?.id as string | undefined

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [job, setJob] = useState<JobSummary | null>(null)
  const [revisions, setRevisions] = useState<Revision[]>([])

  const loadPage = useCallback(async () => {
    if (!jobId) return
    const toggleLoading = loading && !refreshing
    try {
      if (toggleLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      const [jobRes, revisionsRes] = await Promise.all([
        jobsAPI.getById(jobId),
        jobsAPI.getRevisions(jobId),
      ])

      const jobData = jobRes?.data ?? jobRes
      if (jobData) {
        setJob({
          id: jobData.id,
          job_number: jobData.job_number,
          title: jobData.title,
          status: jobData.status,
          revision_no: jobData.revision_no,
        })
      }

      const revisionData = revisionsRes?.data ?? revisionsRes ?? []
      setRevisions(Array.isArray(revisionData) ? revisionData : [])
    } catch (error) {
      toast.error('Revizyon geçmişi yüklenemedi')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [jobId, loading, refreshing])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  const orderedRevisions = useMemo(() => {
    return [...revisions].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateB - dateA
    })
  }, [revisions])

  if (!jobId) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        Geçersiz iş kimliği
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-gray-600">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        <p>Revizyon geçmişi yükleniyor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/jobs/${jobId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              İşe Dön
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <span>Revizyon Geçmişi</span>
            {job?.revision_no != null && (
              <Badge variant="outline" className="text-sm">
                Rev.{job.revision_no}
              </Badge>
            )}
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadPage()}
          disabled={refreshing}
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          {refreshing ? 'Yükleniyor...' : 'Yenile'}
        </Button>
      </div>

      {job && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg text-gray-900">{job.title}</CardTitle>
              <p className="text-sm text-gray-500">
                {job.job_number}
              </p>
            </div>
            <Badge className={getStatusColor(job.status)}>
              {getStatusLabel(job.status)}
            </Badge>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-purple-600" />
            <CardTitle>Revizyon Kayıtları</CardTitle>
          </div>
          <span className="text-xs text-gray-500">
            Taslak olmayan işlerde yapılan değişiklikler otomatik olarak revizyon oluşturur.
          </span>
        </CardHeader>
        <CardContent>
          {orderedRevisions.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">
              Henüz revizyon oluşturulmamış.
            </p>
          ) : (
            <div className="space-y-4">
              {orderedRevisions.map((revision, index) => {
                const reason =
                  revision.revision_reason ||
                  revision.changes?.description?.new ||
                  'Açıklama yok'
                const changeEntries = Object.entries(revision.changes ?? {})

                return (
                  <div
                    key={revision.id}
                    className="flex gap-4 rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 font-semibold text-purple-700">
                      {orderedRevisions.length - index}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-medium text-gray-900">
                          Rev.{revision.revision_no ?? 'N/A'}
                        </h2>
                        <span className="text-xs text-gray-500">
                          {new Date(revision.created_at).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-gray-600">
                        {reason}
                      </p>
                      {revision.created_by_name && (
                        <p className="text-xs text-gray-500">
                          Düzenleyen: {revision.created_by_name}
                        </p>
                      )}
                      {changeEntries.length > 0 && (
                        <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-600">
                          <span className="font-semibold text-gray-700">
                            Değişen Alanlar:
                          </span>
                          <ul className="mt-2 space-y-1">
                            {changeEntries.map(([key, value]) => {
                              if (!value || typeof value !== 'object') return null
                              return (
                                <li key={key}>
                                  <span className="font-medium text-gray-700">{key}</span>:{' '}
                                  <span className="line-through text-gray-400">
                                    {value.old ?? '-'}
                                  </span>{' '}
                                  <span className="text-gray-800">→ {value.new ?? '-'}</span>
                                </li>
                              )
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
