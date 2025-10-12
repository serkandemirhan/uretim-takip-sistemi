'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Edit, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatters'

interface Job {
  id: string
  job_number: string
  title: string
  customer_name: string
  status: string
  due_date: string
  progress: number
  assigned_users?: Array<{ full_name: string; avatar?: string }>
}

interface CompactJobsTableProps {
  jobs: Job[]
}

function getStatusBadge(status: string) {
  const config: Record<string, { label: string; color: string; icon: string }> = {
    active: { label: 'Aktif', color: 'bg-green-100 text-green-800 border-green-300', icon: '🟢' },
    in_progress: { label: 'Devam Ediyor', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: '🔵' },
    at_risk: { label: 'Riskli', color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: '🟡' },
    delayed: { label: 'Gecikti', color: 'bg-red-100 text-red-800 border-red-300', icon: '🔴' },
    on_hold: { label: 'Beklemede', color: 'bg-gray-100 text-gray-800 border-gray-300', icon: '⏸️' },
    completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-800 border-green-300', icon: '✅' },
    canceled: { label: 'İptal', color: 'bg-gray-100 text-gray-500 border-gray-300', icon: '❌' },
  }

  const item = config[status] || config.active

  return (
    <Badge className={`${item.color} border`}>
      <span className="mr-1">{item.icon}</span>
      {item.label}
    </Badge>
  )
}

function isOverdue(dueDate: string) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

export function CompactJobsTable({ jobs }: CompactJobsTableProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">No</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">İş Adı</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Müşteri</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Durum</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Deadline</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">İlerleme</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Sorumlu</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Aksiyonlar</th>
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
                  <td className="px-4 py-3">
                    {getStatusBadge(job.status)}
                  </td>
                  <td className="px-4 py-3">
                    {job.due_date ? (
                      <span className={overdue ? 'text-red-600 font-semibold flex items-center gap-1' : 'text-gray-700'}>
                        {formatDate(job.due_date)}
                        {overdue && <AlertTriangle className="w-3 h-3" />}
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
                    <div className="flex -space-x-2">
                      {job.assigned_users?.slice(0, 3).map((user, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium border-2 border-white"
                          title={user.full_name}
                        >
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {(job.assigned_users?.length || 0) > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-medium border-2 border-white">
                          +{(job.assigned_users?.length || 0) - 3}
                        </div>
                      )}
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
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700">
                        <AlertTriangle className="w-4 h-4" />
                      </Button>
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
