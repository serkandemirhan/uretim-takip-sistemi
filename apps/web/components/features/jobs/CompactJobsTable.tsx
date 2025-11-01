'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Edit } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatters'

const STORAGE_KEY_WIDTHS = 'compactJobsTable_columnWidths'

interface Job {
  id: string
  job_number: string
  title: string
  customer_name: string
  dealer_name?: string
  status: string
  due_date: string
  progress: number
  assigned_users?: Array<{ full_name: string; avatar?: string }>
}

interface CompactJobsTableProps {
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

function isOverdue(dueDate: string) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

export function CompactJobsTable({ jobs }: CompactJobsTableProps) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    no: 100,
    title: 250,
    customer: 200,
    dealer: 150,
    status: 150,
    deadline: 150,
    progress: 150,
    actions: 120,
  })
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)

  // Load saved column widths from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidths = localStorage.getItem(STORAGE_KEY_WIDTHS)
      if (savedWidths) {
        try {
          const parsedWidths = JSON.parse(savedWidths)
          setColumnWidths(prev => ({ ...prev, ...parsedWidths }))
        } catch (e) {
          console.error('Failed to parse saved column widths:', e)
        }
      }
    }
  }, [])

  // Save column widths to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_WIDTHS, JSON.stringify(columnWidths))
    }
  }, [columnWidths])

  const handleMouseDown = (e: React.MouseEvent, column: string) => {
    e.preventDefault()
    setResizingColumn(column)

    const startX = e.clientX
    const startWidth = columnWidths[column]

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startX
      const newWidth = Math.max(80, startWidth + diff)
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

  return (
    <div className="w-full bg-white rounded-lg border overflow-hidden overflow-x-visible">
      <div className="w-full overflow-x-visible">
        <table className="w-full min-w-max text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700 relative" style={{ width: columnWidths.no }}>
                No
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                  onMouseDown={(e) => handleMouseDown(e, 'no')}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 relative" style={{ width: columnWidths.title }}>
                İş Adı
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                  onMouseDown={(e) => handleMouseDown(e, 'title')}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 relative" style={{ width: columnWidths.customer }}>
                Müşteri
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                  onMouseDown={(e) => handleMouseDown(e, 'customer')}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 relative" style={{ width: columnWidths.dealer }}>
                Bayi
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                  onMouseDown={(e) => handleMouseDown(e, 'dealer')}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 relative" style={{ width: columnWidths.status }}>
                Durum
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                  onMouseDown={(e) => handleMouseDown(e, 'status')}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 relative" style={{ width: columnWidths.deadline }}>
                Termin Tarihi
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                  onMouseDown={(e) => handleMouseDown(e, 'deadline')}
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 relative" style={{ width: columnWidths.progress }}>
                İlerleme
                <div
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 transition-colors"
                  onMouseDown={(e) => handleMouseDown(e, 'progress')}
                />
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-700" style={{ width: columnWidths.actions }}>
                İşlemler
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {jobs.map((job) => {
              const overdue = isOverdue(job.due_date)

              return (
                <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    #{job.job_number}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/jobs/${job.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                      {job.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {job.customer_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {job.dealer_name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(job.status)}
                  </td>
                  <td className="px-4 py-3">
                    {job.due_date ? (
                      <span className={overdue ? 'text-red-600 font-semibold' : 'text-gray-700'}>
                        {formatDate(job.due_date)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 font-medium w-10 text-right">
                        {job.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Link href={`/jobs/${job.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Link href={`/jobs/${job.id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
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
