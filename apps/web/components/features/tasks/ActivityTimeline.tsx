'use client'

import { useEffect, useState } from 'react'
import { jobsAPI, filesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  Play,
  Pause,
  MessageSquare,
  FileText,
  AlertCircle,
  Clock,
  File,
  Download,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils/formatters'
import { toast } from 'sonner'

interface TimelineEvent {
  source: string
  timestamp: string
  event_type: string
  actor_name: string
  actor_username: string
  details: any
  step_id?: string
  process_name?: string
}

interface ActivityTimelineProps {
  jobId: string
  compact?: boolean
  limit?: number
  stepId?: string
  reverse?: boolean
}

export function ActivityTimeline({ jobId, compact = false, limit, stepId, reverse = false }: ActivityTimelineProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTimeline()
  }, [jobId])

  async function loadTimeline() {
    try {
      setLoading(true)
      const response = await jobsAPI.getTimeline(jobId)
      setTimeline(response.data || [])
    } catch (error) {
      console.error('Timeline load error:', error)
      toast.error('Hikaye yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function handleFileDownload(fileId: string, filename: string) {
    try {
      const response = await filesAPI.getDownloadUrl(fileId)
      const downloadUrl = response.data.download_url

      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('İndirme başladı')
    } catch (error) {
      toast.error('Dosya indirilemedi')
    }
  }

  function getEventIcon(eventType: string) {
    switch (eventType) {
      case 'step_started':
        return <Play className="w-4 h-4 text-blue-600" />
      case 'step_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'step_blocked':
        return <Pause className="w-4 h-4 text-red-600" />
      case 'note_added':
        return <MessageSquare className="w-4 h-4 text-purple-600" />
      case 'job_created':
        return <FileText className="w-4 h-4 text-gray-600" />
      case 'job_activated':
        return <Play className="w-4 h-4 text-green-600" />
      case 'revision_created':
        return <FileText className="w-4 h-4 text-orange-600" />
      case 'file_uploaded':
        return <File className="w-4 h-4 text-indigo-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  function getActorName(event: TimelineEvent) {
    return event.actor_name || event.actor_username || 'Sistem'
  }

  function getEventTitle(event: TimelineEvent) {
    const actor = getActorName(event)

    switch (event.event_type) {
      case 'step_started':
        return `${actor} süreci başlattı`
      case 'step_completed':
        return `${actor} süreci tamamladı`
      case 'step_blocked':
        return `${actor} süreci duraklattı`
      case 'note_added':
        return `${actor} not ekledi`
      case 'file_uploaded':
        return `${actor} yeni doküman ekledi`
      case 'job_created':
        return `${actor} işi oluşturdu`
      case 'job_activated':
        return `${actor} işi aktif etti`
      case 'job_held':
        return `${actor} işi dondurdu`
      case 'job_resumed':
        return `${actor} işi devam ettirdi`
      case 'job_canceled':
        return `${actor} işi iptal etti`
      case 'revision_created':
        return `${actor} revizyon oluşturdu`
      default:
        return event.event_type
    }
  }

  function getEventDetails(event: TimelineEvent) {
    const details = event.details || {}

    switch (event.event_type) {
      case 'step_completed':
        return (
          <div className="text-sm text-gray-700 space-y-1">
            {details.production_quantity && (
              <p>
                Üretim: <strong>{details.production_quantity} {details.production_unit}</strong>
              </p>
            )}
            {details.production_notes && (
              <p className="text-xs italic text-gray-600">"{details.production_notes}"</p>
            )}
            {details.machine && (
              <p className="text-xs text-gray-500">Makine: {details.machine}</p>
            )}
          </div>
        )

      case 'step_blocked':
        return details.block_reason ? (
          <p className="text-sm text-red-700">Sebep: {details.block_reason}</p>
        ) : null

      case 'note_added':
        return details.note ? (
          <p className="text-sm text-gray-700 italic">"{details.note}"</p>
        ) : null

      case 'file_uploaded':
        return details.filename ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <span className="truncate" title={details.filename}>
              {details.filename}
            </span>
            {details.file_id && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-indigo-600 hover:bg-indigo-50"
                onClick={() => handleFileDownload(details.file_id as string, details.filename as string)}
              >
                <Download className="mr-1 h-3.5 w-3.5" />
                İndir
              </Button>
            )}
          </div>
        ) : null

      case 'step_started':
        return details.machine ? (
          <p className="text-xs text-gray-500">Makine: {details.machine}</p>
        ) : null

      case 'revision_created':
        return (
          <div className="text-sm text-gray-700">
            {details.revision_no && <p>Revizyon #{details.revision_no}</p>}
            {details.revision_reason && <p className="text-xs italic">{details.revision_reason}</p>}
          </div>
        )

      default:
        return null
    }
  }

  // Filter by stepId if provided, then reverse if needed, then limit
  let displayTimeline = timeline

  // Filter by step
  if (stepId) {
    displayTimeline = displayTimeline.filter(event => event.step_id === stepId)
  }

  // Reverse order (newest first)
  if (reverse) {
    displayTimeline = [...displayTimeline].reverse()
  }

  // Apply limit
  if (limit) {
    displayTimeline = displayTimeline.slice(0, limit)
  }

  if (loading) {
    if (compact) {
      return <div className="text-[10px] text-gray-400">Yükleniyor...</div>
    }
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </CardContent>
      </Card>
    )
  }

  if (timeline.length === 0) {
    if (compact) {
      return <div className="text-[10px] text-gray-400">Henüz aktivite yok</div>
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            İş Hikayesi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">Henüz aktivite yok</p>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200"></div>

        {/* Timeline Items */}
        <div className="space-y-3">
          {displayTimeline.map((event, index) => (
            <div key={index} className="relative flex gap-3">
              {/* Icon */}
              <div className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
                {getEventIcon(event.event_type)}
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                {event.process_name && (
                  <div className="text-[10px] uppercase tracking-wide text-gray-400">
                    {event.process_name}
                  </div>
                )}
                <div className="text-xs font-medium text-gray-900">
                  {getEventTitle(event)}
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">
                  {formatDateTime(event.timestamp)}
                </div>
                {getEventDetails(event) && (
                  <div className="mt-1 text-[11px]">
                    {getEventDetails(event)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          İş Hikayesi ({timeline.length} aktivite)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          {/* Timeline Items */}
          <div className="space-y-6">
            {displayTimeline.map((event, index) => (
              <div key={index} className="relative flex gap-4">
                {/* Icon */}
                <div className="relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                  {getEventIcon(event.event_type)}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <h4 className="font-medium text-gray-900">
                      {getEventTitle(event)}
                    </h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDateTime(event.timestamp)}
                    </span>
                  </div>

                  {event.process_name && (
                    <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">
                      {event.process_name}
                    </div>
                  )}

                  {getEventDetails(event)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
