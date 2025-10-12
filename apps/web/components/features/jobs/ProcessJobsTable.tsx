'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MoreVertical } from 'lucide-react'

interface Job {
  id: string
  job_number: string
  title: string
  customer_name: string
  progress: number
  process_stages?: {
    quote: string
    design: string
    production: string
    assembly: string
    delivery: string
    invoice: string
    payment: string
  }
}

interface ProcessJobsTableProps {
  jobs: Job[]
}

const PROCESS_STAGES = [
  { id: 'quote', name: 'Teklif', shortName: 'Teklif' },
  { id: 'design', name: 'Tasarım', shortName: 'Tasarım' },
  { id: 'production', name: 'Üretim', shortName: 'Üretim' },
  { id: 'assembly', name: 'Montaj', shortName: 'Montaj' },
  { id: 'delivery', name: 'Teslim', shortName: 'Teslim' },
  { id: 'invoice', name: 'Fatura', shortName: 'Fatura' },
  { id: 'payment', name: 'Tahsilat', shortName: 'Tahsilat' },
]

function getStageStatus(status: string) {
  const config: Record<string, { icon: string; color: string; label: string }> = {
    completed: { icon: '✅', color: 'text-green-600', label: 'Tamamlandı' },
    in_progress: { icon: '🔵', color: 'text-blue-600', label: 'Devam Ediyor' },
    waiting: { icon: '⏳', color: 'text-yellow-600', label: 'Bekliyor' },
    blocked: { icon: '❌', color: 'text-red-600', label: 'Sorunlu' },
    on_hold: { icon: '⏸️', color: 'text-gray-600', label: 'Askıda' },
    not_started: { icon: '⬜', color: 'text-gray-300', label: 'Başlamadı' },
  }

  return config[status] || config.not_started
}

export function ProcessJobsTable({ jobs }: ProcessJobsTableProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Legend */}
      <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-4 text-xs text-gray-600">
        <span className="font-semibold">Durum:</span>
        <span>✅ Tamam</span>
        <span>🔵 Devam</span>
        <span>⏳ Hazır</span>
        <span>❌ Sorun</span>
        <span>⏸️ Askı</span>
        <span>⬜ Başlamadı</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-3 text-left font-medium text-gray-700 w-20">No</th>
              <th className="px-3 py-3 text-left font-medium text-gray-700 min-w-[200px]">
                İş Adı & Müşteri
              </th>
              {PROCESS_STAGES.map((stage) => (
                <th key={stage.id} className="px-3 py-3 text-center font-medium text-gray-700 w-28">
                  {stage.shortName}
                </th>
              ))}
              <th className="px-3 py-3 text-center font-medium text-gray-700 w-32">İlerleme</th>
              <th className="px-3 py-3 text-center font-medium text-gray-700 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {jobs.map((job) => {
              // Mock process stages - in production, this would come from the API
              const stages = job.process_stages || {
                quote: job.progress >= 10 ? 'completed' : 'in_progress',
                design: job.progress >= 30 ? 'completed' : job.progress >= 10 ? 'in_progress' : 'waiting',
                production: job.progress >= 50 ? 'completed' : job.progress >= 30 ? 'in_progress' : 'not_started',
                assembly: job.progress >= 70 ? 'completed' : job.progress >= 50 ? 'in_progress' : 'not_started',
                delivery: job.progress >= 85 ? 'completed' : job.progress >= 70 ? 'waiting' : 'not_started',
                invoice: job.progress >= 95 ? 'completed' : job.progress >= 85 ? 'in_progress' : 'not_started',
                payment: job.progress === 100 ? 'completed' : job.progress >= 95 ? 'waiting' : 'not_started',
              }

              return (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  {/* Job Number */}
                  <td className="px-3 py-3">
                    <div className="font-mono text-xs text-gray-600">
                      #{job.job_number}
                    </div>
                  </td>

                  {/* Job Name & Customer */}
                  <td className="px-3 py-3">
                    <Link href={`/jobs/${job.id}`} className="block">
                      <div className="font-medium text-gray-900 hover:text-blue-600 mb-0.5">
                        {job.title}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <span>🏢</span>
                        {job.customer_name || 'Müşteri Yok'}
                      </div>
                    </Link>
                  </td>

                  {/* Process Stages */}
                  {PROCESS_STAGES.map((stage) => {
                    const stageKey = stage.id as keyof typeof stages
                    const stageStatus = stages[stageKey] || 'not_started'
                    const statusConfig = getStageStatus(stageStatus)

                    return (
                      <td key={stage.id} className="px-3 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`text-2xl ${statusConfig.color}`} title={statusConfig.label}>
                            {statusConfig.icon}
                          </div>
                          <div className="text-[10px] text-gray-500 leading-tight text-center">
                            {statusConfig.label}
                          </div>
                        </div>
                      </td>
                    )
                  })}

                  {/* Progress */}
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-center gap-1">
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
                      <span className="text-xs font-medium text-gray-700">{job.progress}%</span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3">
                    <Link href={`/jobs/${job.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
