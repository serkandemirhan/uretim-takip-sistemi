'use client'

import { useMemo, useState } from 'react'
import {
  FileText,
  Download,
  Trash2,
  FileIcon,
  Image,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface JobFile {
  id: string
  file_name?: string
  filename?: string
  file_path: string
  file_type?: string
  file_size?: number
  uploaded_at?: string
  uploaded_by?: string
}

interface JobFilesRowProps {
  files: JobFile[]
  onDelete?: (fileId: string) => void
  onDownload?: (file: JobFile) => void
  maxVisible?: number
  showActions?: boolean
}

function getFileIcon(fileName?: string, fileType?: string) {
  if (!fileName) {
    return <FileIcon className="h-5 w-5" />
  }

  const ext = fileName.split('.').pop()?.toLowerCase()
  const type = fileType?.toLowerCase()

  if (type?.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return <Image className="h-5 w-5" />
  }
  if (type?.includes('spreadsheet') || ['xlsx', 'xls', 'csv'].includes(ext || '')) {
    return <FileSpreadsheet className="h-5 w-5" />
  }
  if (['zip', 'rar', '7z'].includes(ext || '')) {
    return <FileArchive className="h-5 w-5" />
  }
  if (['js', 'ts', 'json', 'html', 'css'].includes(ext || '')) {
    return <FileCode className="h-5 w-5" />
  }
  if (type?.includes('pdf') || ext === 'pdf') {
    return <FileText className="h-5 w-5" />
  }
  return <FileIcon className="h-5 w-5" />
}

function getFileTypeLabel(fileName?: string, fileType?: string) {
  const ext = fileName?.split('.').pop()?.toUpperCase()
  if (!ext || ext === fileName?.toUpperCase()) {
    if (fileType?.includes('image')) return 'GÖRSEL'
    if (fileType?.includes('pdf')) return 'PDF'
    if (fileType?.includes('spreadsheet')) return 'EXCEL'
    if (fileType?.includes('presentation')) return 'SUNUM'
    if (fileType?.includes('word')) return 'WORD'
    if (fileType?.includes('/')) {
      return fileType.split('/').pop()?.toUpperCase() || 'DOSYA'
    }
    return 'DOSYA'
  }

  const map: Record<string, string> = {
    PDF: 'PDF',
    JPG: 'GÖRSEL',
    JPEG: 'GÖRSEL',
    PNG: 'GÖRSEL',
    GIF: 'GÖRSEL',
    WEBP: 'GÖRSEL',
    SVG: 'GÖRSEL',
    XLS: 'EXCEL',
    XLSX: 'EXCEL',
    CSV: 'CSV',
    PPT: 'SUNUM',
    PPTX: 'SUNUM',
    DOC: 'WORD',
    DOCX: 'WORD',
    ZIP: 'ARŞİV',
    RAR: 'ARŞİV',
    '7Z': 'ARŞİV',
    JS: 'KOD',
    TS: 'KOD',
    JSON: 'JSON',
    HTML: 'HTML',
    CSS: 'CSS',
  }

  return map[ext] || ext
}

export function JobFilesRow({
  files,
  onDelete,
  onDownload,
  maxVisible = 6,
  showActions = true,
}: JobFilesRowProps) {
  const [hoveredFile, setHoveredFile] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const hasMoreThanLimit = files.length > maxVisible
  const visibleFiles = expanded ? files : files.slice(0, maxVisible)
  const remainingCount = Math.max(0, files.length - maxVisible)

  const gridColumns = useMemo(() => {
    const base =
      'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
    if (expanded) {
      return `${base} 2xl:grid-cols-6`
    }
    return base
  }, [expanded])

  const handleDownload = (e: React.MouseEvent, file: JobFile) => {
    e.stopPropagation()
    if (onDownload) {
      onDownload(file)
    } else {
      const downloadName =
        file.file_name ||
        file.filename ||
        file.file_path.split('/').pop() ||
        'download'
      const link = document.createElement('a')
      link.href = file.file_path
      link.download = downloadName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Dosya indiriliyor')
    }
  }

  const handleDelete = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation()
    onDelete?.(fileId)
  }

  if (files.length === 0) {
    return <div className="py-1 text-sm text-gray-500">Henüz dosya eklenmemiş</div>
  }

  return (
    <div className="space-y-2">
      {hasMoreThanLimit && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-gray-600 hover:text-gray-900"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" />
                Daralt
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" />
                Tümünü Gör ({remainingCount} daha)
              </>
            )}
          </Button>
        </div>
      )}

      <TooltipProvider>
        <div className={`grid gap-3 ${gridColumns}`}>
          {visibleFiles.map((file) => {
            const rawName = file.file_name || file.filename || file.file_path?.split('/').pop() || 'Dosya'
            const fileName = rawName
            return (
              <div
                key={file.id}
                className="relative group"
                onMouseEnter={() => setHoveredFile(file.id)}
                onMouseLeave={() => setHoveredFile(null)}
                title={fileName}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        {getFileIcon(file.file_name || file.filename || rawName, file.file_type)}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="line-clamp-2 text-sm font-medium text-gray-900 leading-tight">
                          {fileName}
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium break-words">{fileName}</p>
                      {file.uploaded_at && (
                        <p className="text-xs text-gray-400">
                          Yükleme: {new Date(file.uploaded_at).toLocaleString('tr-TR')}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>

                {showActions && hoveredFile === file.id && (
                  <div className="absolute inset-0 flex items-center justify-end rounded-lg bg-black/10 pr-2">
                    <div className="flex gap-1 rounded-full bg-white px-2 py-1 shadow">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600"
                        onClick={(e) => handleDownload(e, file)}
                        title="İndir"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                          onClick={(e) => handleDelete(e, file.id)}
                          title="Sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </TooltipProvider>
    </div>
  )
}
