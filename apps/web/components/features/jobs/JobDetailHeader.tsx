'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, Building2, Calendar, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { formatDate, getPriorityColor, getPriorityLabel, getStatusColor, getStatusLabel } from '@/lib/utils/formatters'
import { JobFilesRow } from './JobFilesRow'
import type { JobFile } from './JobFilesRow'
import { FileUpload } from '@/components/features/files/FileUpload'

interface Job {
  id: string
  job_number: string
  title: string
  description?: string
  status: string
  priority?: string
  due_date?: string
  delivery_date?: string
  deadline?: string
  progress?: number
  customer?: {
    id: string
    name: string
  }
  customer_name?: string
  dealer?: {
    id: string
    name: string
  }
}

interface JobDetailHeaderProps {
  job: Job
  files: JobFile[]
  onDeleteFile?: (fileId: string) => void
  onDownloadFile?: (file: JobFile) => void
  onUploadComplete?: () => void
}

export function JobDetailHeader({
  job,
  files,
  onDeleteFile,
  onDownloadFile,
  onUploadComplete,
}: JobDetailHeaderProps) {
  const customerName = job.customer?.name || job.customer_name || '-'
  const dealerName = job.dealer?.name || '-'
  const dueDate = job.due_date || job.delivery_date || job.deadline

  return (
    <Card className="border-b rounded-none">
      <CardContent className="p-4 space-y-3">
        {/* Back Button & Title Row */}
        <div className="flex items-center gap-4">
          <Link href="/jobs">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Geri
            </Button>
          </Link>
          <div className="flex-1 flex items-center gap-3">
            <span className="font-mono text-sm text-gray-600">#{job.job_number}</span>
            <h1 className="text-xl font-bold text-gray-900">{job.title}</h1>
            <Badge className={getStatusColor(job.status)}>
              {getStatusLabel(job.status)}
            </Badge>
            <Badge className={getPriorityColor(job.priority || 'normal')}>
              {getPriorityLabel(job.priority || 'normal')}
            </Badge>
          </div>
        </div>

        {/* Info Grid - Compact 2 lines */}
        <div className="grid grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <div>
              <span className="text-xs text-gray-500">Müşteri</span>
              <p className="font-medium text-gray-900 truncate">{customerName}</p>
            </div>
          </div>

          {job.dealer && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <div>
                <span className="text-xs text-gray-500">Bayi</span>
                <p className="font-medium text-gray-900 truncate">{dealerName}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <span className="text-xs text-gray-500">Teslim Tarihi</span>
              <p className="font-medium text-gray-900">
                {dueDate ? formatDate(dueDate) : '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-400" />
            <div>
              <span className="text-xs text-gray-500">İlerleme</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${
                      (job.progress || 0) >= 75
                        ? 'bg-green-600'
                        : (job.progress || 0) >= 50
                        ? 'bg-blue-600'
                        : (job.progress || 0) >= 25
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                    }`}
                    style={{ width: `${job.progress || 0}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700">
                  {job.progress || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Description - Scrollable, max 3-4 lines */}
        {job.description && (
          <div className="border-t pt-3">
            <div className="text-xs font-medium text-gray-500 mb-1">Açıklama</div>
            <ScrollArea className="h-16 w-full">
              <p className="text-sm text-gray-700 pr-4 whitespace-pre-wrap">
                {job.description}
              </p>
            </ScrollArea>
          </div>
        )}

        {/* Files Row */}
        <div className="border-t pt-3">
          <div className="text-xs font-medium text-gray-500 mb-2">İş Dosyaları</div>
          <FileUpload
            refType="job"
            refId={job.id}
            onUploadComplete={onUploadComplete}
            className="space-y-3"
          >
            <JobFilesRow
              files={files}
              onDelete={onDeleteFile}
              onDownload={onDownloadFile}
              maxVisible={6}
              showActions={true}
            />
          </FileUpload>
        </div>
      </CardContent>
    </Card>
  )
}
