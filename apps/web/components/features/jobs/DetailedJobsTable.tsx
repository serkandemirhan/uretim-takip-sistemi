'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Edit, FileText, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatters'

interface Job {
  id: string
  job_number: string
  title: string
  description?: string
  customer_name: string
  location?: string
  status: string
  due_date: string
  next_milestone?: string
  progress: number
  total_tasks?: number
  completed_tasks?: number
  risk_level?: string
  risk_note?: string
  document_count?: number
  assigned_users?: Array<{ full_name: string; avatar?: string }>
}

interface DetailedJobsTableProps {
  jobs: Job[]
}

function getStatusBadge(status: string) {
  const config: Record<string, { label: string; color: string }> = {
    draft: { label: 'Taslak', color: 'bg-gray-100 text-gray-700' },
    active: { label: 'Aktif', color: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'Devam Ediyor', color: 'bg-blue-100 text-blue-700' },
    on_hold: { label: 'Beklemede', color: 'bg-gray-100 text-gray-700' },
    completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-700' },
    canceled: { label: 'İptal', color: 'bg-red-100 text-red-700' },
  }
  const item = config[status] || config.active
  return (
    <Badge className={item.color}>
      {item.label}
    </Badge>
  )
}

function getRiskBadge(level: string) {
  const config: Record<string, { label: string; color: string }> = {
    low: { label: 'Düşük', color: 'bg-green-100 text-green-700' },
    medium: { label: 'Orta', color: 'bg-yellow-100 text-yellow-700' },
    high: { label: 'Yüksek', color: 'bg-red-100 text-red-700' },
  }
  const item = config[level] || config.low
  return (
    <Badge className={item.color}>
      {item.label}
    </Badge>
  )
}

export function DetailedJobsTable({ jobs }: DetailedJobsTableProps) {
  return (
    <div className="w-full space-y-3">
      {jobs.map((job) => (
        <div key={job.id} className="bg-white rounded-lg border hover:shadow-md transition-shadow">
          <div className="p-4">
            {/* Row 1: Main Info */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-gray-600">#{job.job_number}</span>
                  {getStatusBadge(job.status)}
                  {job.risk_level && getRiskBadge(job.risk_level)}
                </div>
                <Link href={`/jobs/${job.id}`}>
                  <h3 className="font-semibold text-lg text-gray-900 hover:text-blue-600">
                    {job.title}
                  </h3>
                </Link>
                {job.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-1">{job.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/jobs/${job.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    Detay
                  </Button>
                </Link>
                <Link href={`/jobs/${job.id}/edit`}>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-1" />
                    Düzenle
                  </Button>
                </Link>
              </div>
            </div>

            {/* Row 2: Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
              {/* Customer & Location */}
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Müşteri</div>
                <div className="font-medium text-gray-900">
                  🏢 {job.customer_name || '-'}
                </div>
                {job.location && (
                  <div className="text-xs text-gray-500 mt-0.5">📍 {job.location}</div>
                )}
              </div>

              {/* Deadline & Milestone */}
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Teslim Tarihi</div>
                <div className="font-medium text-gray-900">
                  📅 {job.due_date ? formatDate(job.due_date) : '-'}
                </div>
                {job.next_milestone && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    Sonraki: {job.next_milestone}
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Görevler</div>
                <div className="font-medium text-gray-900">
                  📋 {job.completed_tasks || 0}/{job.total_tasks || 0}
                </div>
                {job.document_count && (
                  <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {job.document_count} döküman
                  </div>
                )}
              </div>

              {/* Risk */}
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Risk Durumu</div>
                <div className="font-medium text-gray-900">
                  {job.risk_note || 'Risk yok'}
                </div>
              </div>
            </div>

            {/* Row 3: Team & Progress */}
            <div className="flex items-center justify-between pt-3 border-t">
              {/* Team */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Takım:</span>
                <div className="flex -space-x-2">
                  {job.assigned_users?.slice(0, 5).map((user, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium border-2 border-white"
                      title={user.full_name}
                    >
                      {user.full_name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {(job.assigned_users?.length || 0) > 5 && (
                    <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-medium border-2 border-white">
                      +{(job.assigned_users?.length || 0) - 5}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-3">
                <div className="w-48">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>İlerleme</span>
                    <span className="font-medium">{job.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        job.progress >= 75
                          ? 'bg-green-600'
                          : job.progress >= 50
                          ? 'bg-blue-600'
                          : job.progress >= 25
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                      }`}
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                </div>

                <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Sorun
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
