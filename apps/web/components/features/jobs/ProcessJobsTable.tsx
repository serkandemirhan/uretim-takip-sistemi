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
    assigned_to?: {
      id: string | null
      name: string
    } | null
    machine?: {
      id: string | null
      name: string
    } | null
    production_notes?: string | null
    started_at?: string | null
    production_quantity?: number | null
    production_unit?: string | null
    block_reason?: string | null
    blocked_at?: string | null
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

const STORAGE_KEY_WIDTHS = 'processJobsTable_columnWidths'
const STORAGE_KEY_ORDER = 'processJobsTable_columnOrder'

export function ProcessJobsTable({ jobs }: ProcessJobsTableProps) {
  const [processGroups, setProcessGroups] = useState<ProcessGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    no: 80,
    title: 180,
    customer: 150,
    delivery: 120,
    progress: 120,
  })
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  useEffect(() => {
    loadProcessGroups()
  }, [])

  // Load saved settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidths = localStorage.getItem(STORAGE_KEY_WIDTHS)
      if (savedWidths) {
        try {
          setColumnWidths(prev => ({ ...prev, ...JSON.parse(savedWidths) }))
        } catch (e) {
          console.error('Failed to parse saved column widths:', e)
        }
      }
    }
  }, [])

  // Save column widths when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(columnWidths).length > 5) {
      localStorage.setItem(STORAGE_KEY_WIDTHS, JSON.stringify(columnWidths))
    }
  }, [columnWidths])

  // Save column order when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && columnOrder.length > 0) {
      localStorage.setItem(STORAGE_KEY_ORDER, JSON.stringify(columnOrder))
    }
  }, [columnOrder])

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
      })).sort((a: ProcessGroup, b: ProcessGroup) => a.name.localeCompare(b.name))

      setProcessGroups(groups)

      // Initialize widths for process group columns
      const processWidths: Record<string, number> = {}
      groups.forEach(g => {
        processWidths[g.id] = 120
      })
      setColumnWidths(prev => ({ ...prev, ...processWidths }))

      // Initialize column order - check localStorage first
      const defaultOrder = ['no', 'title', 'customer', 'delivery', ...groups.map(g => g.id), 'progress']

      if (typeof window !== 'undefined') {
        const savedOrder = localStorage.getItem(STORAGE_KEY_ORDER)
        if (savedOrder) {
          try {
            const parsedOrder = JSON.parse(savedOrder)
            // Validate saved order includes all current columns
            const allColumns = new Set(defaultOrder)
            const validOrder = parsedOrder.filter((col: string) => allColumns.has(col))

            // Add any missing columns to the end
            defaultOrder.forEach(col => {
              if (!validOrder.includes(col)) {
                validOrder.push(col)
              }
            })

            setColumnOrder(validOrder)
          } catch (e) {
            console.error('Failed to parse saved column order:', e)
            setColumnOrder(defaultOrder)
          }
        } else {
          setColumnOrder(defaultOrder)
        }
      } else {
        setColumnOrder(defaultOrder)
      }
    } catch (error) {
      console.error('Failed to load process groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingColumn(column)

    const startX = e.clientX
    const startWidth = columnWidths[column]

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX
      const newWidth = Math.max(60, startWidth + diff)
      setColumnWidths(prev => ({ ...prev, [column]: newWidth }))
    }

    const handleMouseUp = () => {
      setResizingColumn(null)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleDragStart = (e: React.DragEvent, column: string) => {
    setDraggingColumn(column)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault()
    if (draggingColumn && draggingColumn !== column) {
      setDragOverColumn(column)
    }
  }

  const handleDrop = (e: React.DragEvent, targetColumn: string) => {
    e.preventDefault()
    if (draggingColumn && draggingColumn !== targetColumn) {
      const newOrder = [...columnOrder]
      const dragIndex = newOrder.indexOf(draggingColumn)
      const dropIndex = newOrder.indexOf(targetColumn)

      newOrder.splice(dragIndex, 1)
      newOrder.splice(dropIndex, 0, draggingColumn)

      setColumnOrder(newOrder)
    }
    setDraggingColumn(null)
    setDragOverColumn(null)
  }

  const handleDragEnd = () => {
    setDraggingColumn(null)
    setDragOverColumn(null)
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
    <div className="w-full bg-white rounded-lg border overflow-hidden">
      {/* Legend */}
      <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-4 text-xs text-gray-600 flex-wrap">
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

      <div className="overflow-x-auto w-full">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columnOrder.map((colId) => {
                // Fixed columns
                if (colId === 'no') {
                  return (
                    <th
                      key="no"
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'no')}
                      onDragOver={(e) => handleDragOver(e, 'no')}
                      onDrop={(e) => handleDrop(e, 'no')}
                      onDragEnd={handleDragEnd}
                      className={`px-3 py-3 text-left font-medium text-gray-700 relative cursor-move select-none ${
                        draggingColumn === 'no' ? 'opacity-50' : ''
                      } ${dragOverColumn === 'no' ? 'bg-blue-100' : ''}`}
                      style={{ width: columnWidths.no }}
                    >
                      No
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'no')}
                      />
                    </th>
                  )
                }
                if (colId === 'title') {
                  return (
                    <th
                      key="title"
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'title')}
                      onDragOver={(e) => handleDragOver(e, 'title')}
                      onDrop={(e) => handleDrop(e, 'title')}
                      onDragEnd={handleDragEnd}
                      className={`px-3 py-3 text-left font-medium text-gray-700 relative cursor-move select-none ${
                        draggingColumn === 'title' ? 'opacity-50' : ''
                      } ${dragOverColumn === 'title' ? 'bg-blue-100' : ''}`}
                      style={{ width: columnWidths.title }}
                    >
                      İş Adı
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'title')}
                      />
                    </th>
                  )
                }
                if (colId === 'customer') {
                  return (
                    <th
                      key="customer"
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'customer')}
                      onDragOver={(e) => handleDragOver(e, 'customer')}
                      onDrop={(e) => handleDrop(e, 'customer')}
                      onDragEnd={handleDragEnd}
                      className={`px-3 py-3 text-left font-medium text-gray-700 relative cursor-move select-none ${
                        draggingColumn === 'customer' ? 'opacity-50' : ''
                      } ${dragOverColumn === 'customer' ? 'bg-blue-100' : ''}`}
                      style={{ width: columnWidths.customer }}
                    >
                      Müşteri
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'customer')}
                      />
                    </th>
                  )
                }
                if (colId === 'delivery') {
                  return (
                    <th
                      key="delivery"
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'delivery')}
                      onDragOver={(e) => handleDragOver(e, 'delivery')}
                      onDrop={(e) => handleDrop(e, 'delivery')}
                      onDragEnd={handleDragEnd}
                      className={`px-3 py-3 text-left font-medium text-gray-700 relative cursor-move select-none ${
                        draggingColumn === 'delivery' ? 'opacity-50' : ''
                      } ${dragOverColumn === 'delivery' ? 'bg-blue-100' : ''}`}
                      style={{ width: columnWidths.delivery }}
                    >
                      Teslim Tarihi
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'delivery')}
                      />
                    </th>
                  )
                }
                if (colId === 'progress') {
                  return (
                    <th
                      key="progress"
                      draggable
                      onDragStart={(e) => handleDragStart(e, 'progress')}
                      onDragOver={(e) => handleDragOver(e, 'progress')}
                      onDrop={(e) => handleDrop(e, 'progress')}
                      onDragEnd={handleDragEnd}
                      className={`px-3 py-3 text-center font-medium text-gray-700 relative cursor-move select-none ${
                        draggingColumn === 'progress' ? 'opacity-50' : ''
                      } ${dragOverColumn === 'progress' ? 'bg-blue-100' : ''}`}
                      style={{ width: columnWidths.progress }}
                    >
                      İlerleme
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, 'progress')}
                      />
                    </th>
                  )
                }

                // Process group columns
                const group = processGroups.find(g => g.id === colId)
                if (group) {
                  return (
                    <th
                      key={group.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, group.id)}
                      onDragOver={(e) => handleDragOver(e, group.id)}
                      onDrop={(e) => handleDrop(e, group.id)}
                      onDragEnd={handleDragEnd}
                      className={`px-3 py-3 text-center font-medium text-gray-700 relative cursor-move select-none ${
                        draggingColumn === group.id ? 'opacity-50' : ''
                      } ${dragOverColumn === group.id ? 'bg-blue-100' : ''}`}
                      style={{ width: columnWidths[group.id] }}
                    >
                      <div>{group.name}</div>
                      <div className="text-[10px] font-normal text-gray-500 mt-0.5">
                        {group.processes.length} süreç
                      </div>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                        onMouseDown={(e) => handleMouseDown(e, group.id)}
                      />
                    </th>
                  )
                }

                return null
              })}
              <th className="px-3 py-3 text-center font-medium text-gray-700 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {jobs.map((job) => {
              const jobSteps = job.steps || []

              const renderCell = (colId: string) => {
                if (colId === 'no') {
                  return (
                    <td key="no" className="px-3 py-3">
                      <div className="font-mono text-xs text-gray-600">
                        #{job.job_number}
                      </div>
                    </td>
                  )
                }
                if (colId === 'title') {
                  return (
                    <td key="title" className="px-3 py-3">
                      <Link href={`/jobs/${job.id}`} className="block">
                        <div className="font-medium text-gray-900 hover:text-blue-600">
                          {job.title}
                        </div>
                      </Link>
                    </td>
                  )
                }
                if (colId === 'customer') {
                  return (
                    <td key="customer" className="px-3 py-3">
                      <div className="text-sm text-gray-700">
                        {job.customer_name || '—'}
                      </div>
                    </td>
                  )
                }
                if (colId === 'delivery') {
                  return (
                    <td key="delivery" className="px-3 py-3">
                      <div className="text-sm text-gray-700">
                        {job.delivery_date
                          ? new Date(job.delivery_date).toLocaleDateString('tr-TR')
                          : '—'}
                      </div>
                    </td>
                  )
                }
                if (colId === 'progress') {
                  return (
                    <td key="progress" className="px-3 py-3">
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
                  )
                }

                // Process group column
                const group = processGroups.find(g => g.id === colId)
                if (group) {
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

                            const statusLabels: Record<string, string> = {
                              completed: 'Tamamlandı',
                              in_progress: 'Devam Ediyor',
                              waiting: 'Bekliyor',
                              blocked: 'Sorunlu',
                              on_hold: 'Askıda',
                              not_started: 'Başlamadı'
                            }
                            const statusLabel = statusLabels[status] || status

                            // Debug log
                            console.log('Step data:', {
                              process: process?.name,
                              assigned_to: step.assigned_to,
                              production_notes: step.production_notes,
                              notes: step.notes
                            })

                            return (
                              <div
                                key={step.id}
                                className={`relative w-4 h-4 rounded-full ${colorClass} transition-all hover:scale-125 cursor-pointer group`}
                              >
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-80 max-w-sm">
                                  <div className="bg-gray-900 text-white text-xs rounded-lg shadow-lg p-3 space-y-2">
                                    <div>
                                      <div className="font-semibold text-sm">
                                        {process?.code || process?.name || 'Süreç'}
                                      </div>
                                      <div className="text-gray-300 text-[11px]">
                                        {process?.name}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 pb-2 border-b border-gray-700">
                                      <div className={`w-2 h-2 rounded-full ${colorClass}`}></div>
                                      <span className="font-medium">{statusLabel}</span>
                                    </div>

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

                                    {step.assigned_to?.name && (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-gray-300">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                          </svg>
                                          <span>Sorumlu:</span>
                                        </div>
                                        <div className="text-[11px] text-gray-400 pl-4">
                                          {step.assigned_to.name}
                                        </div>
                                      </div>
                                    )}

                                    {step.production_notes && (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-gray-300">
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                          </svg>
                                          <span>Üretim Açıklamaları:</span>
                                        </div>
                                        <div className="text-[11px] text-gray-400 pl-4 max-h-20 overflow-y-auto whitespace-pre-wrap">
                                          {step.production_notes}
                                        </div>
                                      </div>
                                    )}

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
                }

                return null
              }

              return (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  {columnOrder.map((colId) => renderCell(colId))}
                  {/* Actions - always last */}
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
