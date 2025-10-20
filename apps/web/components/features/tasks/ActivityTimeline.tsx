'use client'

import { useEffect, useState } from 'react'
import { jobsAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  Play,
  Pause,
  MessageSquare,
  FileText,
  AlertCircle,
  Clock,
  User,
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
}

export function ActivityTimeline({ jobId }: ActivityTimelineProps) {
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
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  function getEventTitle(event: TimelineEvent) {
    switch (event.event_type) {
      case 'step_started':
        return `${event.process_name || 'Süreç'} başladı`
      case 'step_completed':
        return `${event.process_name || 'Süreç'} tamamlandı`
      case 'step_blocked':
        return `${event.process_name || 'Süreç'} duraklatıldı`
      case 'note_added':
        return `${event.process_name || 'Süreç'} için not eklendi`
      case 'job_created':
        return 'İş oluşturuldu'
      case 'job_activated':
        return 'İş aktif edildi'
      case 'job_held':
        return 'İş donduruldu'
      case 'job_resumed':
        return 'İş devam ettirildi'
      case 'job_canceled':
        return 'İş iptal edildi'
      case 'revision_created':
        return 'Revizyon oluşturuldu'
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

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </CardContent>
      </Card>
    )
  }

  if (timeline.length === 0) {
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
            {timeline.map((event, index) => (
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

                  {event.actor_name && (
                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                      <User className="w-3 h-3" />
                      <span>{event.actor_name}</span>
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
