'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MoreVertical } from 'lucide-react'
import { processesAPI } from '@/lib/api/client'

interface Job {
  id: string
  job_number: string
  title: string
  customer_name: string
  progress: number
  delivery_date?: string | null
  steps?: Array<{
    id: string
    process_id: string
    status: string
    order_index: number
    process_name?: string
    process_code?: string
    notes?: string | null
    completed_at?: string | null
    completed_by?: string | null
    completed_by_name?: string | null
    file_count?: number
  }>
}

interface ProcessJobsTableProps {
  jobs: Job[]
}

type ProcessGroup = {
  id: string
  name: string
  description?: string | null
  processes: Process[]
}

type Process = {
  id: string
  name: string
  code: string
  order_index: number
}

function getStepStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    completed: 'bg-green-500',
    in_progress: 'bg-blue-500',
    waiting: 'bg-yellow-500',
    blocked: 'bg-red-500',
    on_hold: 'bg-gray-400',
    not_started: 'bg-gray-200',
  }
  return colorMap[status] || colorMap.not_started
}

export function ProcessJobsTable({ jobs }: ProcessJobsTableProps) {
  const [processGroups, setProcessGroups] = useState<ProcessGroup[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProcessGroups()
  }, [])

  async function loadProcessGroups() {
    try {
      setLoading(true)
      const res = await processesAPI.getAll()
      const data = res?.data ?? res ?? {}
      const groups: ProcessGroup[] = (data.groups ?? []).map((g: any) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        processes: (g.processes ?? [])
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            code: p.code,
            order_index: p.order_index ?? 0,
          })),
      })).sort((a, b) => a.name.localeCompare(b.name))

      setProcessGroups(groups)
    } catch (error) {
      console.error('Failed to load process groups:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Legend */}
      <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-4 text-xs text-gray-600">
        <span className="font-semibold">Durum:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Tamamlandı</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Devam Ediyor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>Bekliyor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-200"></div>
          <span>Başlamadı</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-3 text-left font-medium text-gray-700 w-20">No</th>
              <th className="px-3 py-3 text-left font-medium text-gray-700 min-w-[180px]">
                İş Adı
              </th>
              <th className="px-3 py-3 text-left font-medium text-gray-700 min-w-[150px]">
                Müşteri
              </th>
              <th className="px-3 py-3 text-left font-medium text-gray-700 w-28">
                Teslim Tarihi
              </th>
              {processGroups.map((group) => (
                <th key={group.id} className="px-3 py-3 text-center font-medium text-gray-700 min-w-[120px]">
                  <div>{group.name}</div>
                  <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                    {group.processes.length} süreç
                  </div>
                </th>
              ))}
              <th className="px-3 py-3 text-center font-medium text-gray-700 w-32">İlerleme</th>
              <th className="px-3 py-3 text-center font-medium text-gray-700 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {jobs.map((job) => {
              const jobSteps = job.steps || []

              return (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  {/* Job Number */}
                  <td className="px-3 py-3">
                    <div className="font-mono text-xs text-gray-600">
                      #{job.job_number}
                    </div>
                  </td>

                  {/* Job Name */}
                  <td className="px-3 py-3">
                    <Link href={`/jobs/${job.id}`} className="block">
                      <div className="font-medium text-gray-900 hover:text-blue-600">
                        {job.title}
                      </div>
                    </Link>
                  </td>

                  {/* Customer */}
                  <td className="px-3 py-3">
                    <div className="text-sm text-gray-700">
                      {job.customer_name || '—'}
                    </div>
                  </td>

                  {/* Delivery Date */}
                  <td className="px-3 py-3">
                    <div className="text-sm text-gray-700">
                      {job.delivery_date
                        ? new Date(job.delivery_date).toLocaleDateString('tr-TR')
                        : '—'}
                    </div>
                  </td>

                  {/* Process Groups */}
                  {processGroups.map((group) => {
                    // Find all steps in this job that belong to processes in this group
                    const groupSteps = jobSteps.filter(step =>
                      group.processes.some(p => p.id === step.process_id)
                    )

                    return (
                      <td key={group.id} className="px-3 py-3">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {groupSteps.length > 0 ? (
                            groupSteps.map(step => {
                              const process = group.processes.find(p => p.id === step.process_id)
                              const status = step.status || 'not_started'
                              const colorClass = getStepStatusColor(status)

                              // Status labels in Turkish
                              const statusLabels: Record<string, string> = {
                                completed: 'Tamamlandı',
                                in_progress: 'Devam Ediyor',
                                waiting: 'Bekliyor',
                                blocked: 'Sorunlu',
                                on_hold: 'Askıda',
                                not_started: 'Başlamadı'
                              }
                              const statusLabel = statusLabels[status] || status

                              return (
                                <div
                                  key={step.id}
                                  className={`relative w-4 h-4 rounded-full ${colorClass} transition-all hover:scale-125 cursor-pointer group`}
                                >
                                  {/* Tooltip */}
                                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-64">
                                    <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 space-y-2">
                                      {/* Process Name */}
                                      <div>
                                        <div className="font-semibold text-sm">
                                          {process?.code || process?.name || 'Süreç'}
                                        </div>
                                        <div className="text-gray-300 text-[11px]">
                                          {process?.name}
                                        </div>
                                      </div>

                                      {/* Status */}
                                      <div className="flex items-center gap-1.5 pb-2 border-b border-gray-700">
                                        <div className={`w-2 h-2 rounded-full ${colorClass}`}></div>
                                        <span className="font-medium">{statusLabel}</span>
                                      </div>

                                      {/* Completed Info */}
                                      {step.completed_at && (
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-1 text-gray-300">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>Tamamlanma:</span>
                                          </div>
                                          <div className="text-[11px] text-gray-400 pl-4">
                                            {new Date(step.completed_at).toLocaleString('tr-TR')}
                                          </div>
                                        </div>
                                      )}

                                      {/* Completed By */}
                                      {step.completed_by_name && (
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-1 text-gray-300">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            <span>Tamamlayan:</span>
                                          </div>
                                          <div className="text-[11px] text-gray-400 pl-4">
                                            {step.completed_by_name}
                                          </div>
                                        </div>
                                      )}

                                      {/* Notes */}
                                      {step.notes && (
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-1 text-gray-300">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span>Notlar:</span>
                                          </div>
                                          <div className="text-[11px] text-gray-400 pl-4 max-h-20 overflow-y-auto">
                                            {step.notes}
                                          </div>
                                        </div>
                                      )}

                                      {/* Files */}
                                      {step.file_count !== undefined && step.file_count > 0 && (
                                        <div className="flex items-center gap-1 text-blue-400 pt-2 border-t border-gray-700">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                          </svg>
                                          <span className="font-medium">{step.file_count} Belge</span>
                                        </div>
                                      )}

                                      {/* Arrow */}
                                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
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
