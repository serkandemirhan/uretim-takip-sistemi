'use client'

import { useState } from 'react'
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
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'

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
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  showToggle?: boolean
  deletingId?: string | null
}

const FILE_STYLE_PRESETS = [
  {
    match: (ext: string, type: string) =>
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) ||
      type.startsWith('image/'),
    chipBg: 'bg-purple-50/80',
    chipBorder: 'border-purple-100',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
  },
  {
    match: (ext: string, type: string) =>
      ext === 'pdf' || type.includes('pdf'),
    chipBg: 'bg-rose-50/80',
    chipBorder: 'border-rose-100',
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
  },
  {
    match: (ext: string, type: string) =>
      ['doc', 'docx'].includes(ext) || type.includes('word'),
    chipBg: 'bg-blue-50/80',
    chipBorder: 'border-blue-100',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
  },
  {
    match: (ext: string, type: string) =>
      ['xls', 'xlsx', 'csv'].includes(ext) ||
      type.includes('spreadsheet') ||
      type.includes('excel'),
    chipBg: 'bg-emerald-50/80',
    chipBorder: 'border-emerald-100',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
  },
  {
    match: (ext: string, type: string) =>
      ['zip', 'rar', '7z'].includes(ext) || type.includes('archive'),
    chipBg: 'bg-amber-50/80',
    chipBorder: 'border-amber-100',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
  },
]

function getFileAccentClasses(fileName?: string, fileType?: string) {
  const ext = fileName?.split('.').pop()?.toLowerCase() || ''
  const type = fileType?.toLowerCase() || ''
  const preset = FILE_STYLE_PRESETS.find((item) => item.match(ext, type))
  if (preset) return preset
  return {
    chipBg: 'bg-gray-50/80',
    chipBorder: 'border-gray-200',
    iconBg: 'bg-gray-100',
    iconText: 'text-gray-600',
  }
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

function isImageFile(fileName?: string, fileType?: string) {
  const type = fileType?.toLowerCase() || ''
  if (type.includes('image')) return true
  const ext = fileName?.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'].includes(ext || '')
}

export function JobFilesRow({
  files,
  onDelete,
  onDownload,
  maxVisible = 6,
  showActions = true,
  expanded,
  onExpandedChange,
  showToggle = true,
  deletingId,
}: JobFilesRowProps) {
  const [hoveredFile, setHoveredFile] = useState<string | null>(null)
  const [internalExpanded, setInternalExpanded] = useState(false)

  const isControlled = typeof expanded === 'boolean'
  const isExpanded = isControlled ? expanded : internalExpanded
  const setExpandedState = (value: boolean) => {
    if (!isControlled) {
      setInternalExpanded(value)
    }
    onExpandedChange?.(value)
  }

  const hasMoreThanLimit = files.length > maxVisible
  const visibleFiles = isExpanded ? files : files.slice(0, maxVisible)
  const remainingCount = Math.max(0, files.length - maxVisible)

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
      {showToggle && hasMoreThanLimit && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-gray-600 hover:text-gray-900"
            onClick={() => setExpandedState(!isExpanded)}
          >
            {isExpanded ? (
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
        <div className="flex flex-wrap items-center gap-2">
          {visibleFiles.map((file) => {
            const rawName = file.file_name || file.filename || file.file_path?.split('/').pop() || 'Dosya'
            const fileName = rawName
            const isImage = isImageFile(file.file_name || file.filename || rawName, file.file_type)
            const uploadedLabel = file.uploaded_at
              ? new Date(file.uploaded_at).toLocaleString('tr-TR')
              : null
            const extensionLabel = getFileTypeLabel(file.file_name || file.filename || rawName, file.file_type)
            const accent = getFileAccentClasses(file.file_name || file.filename || rawName, file.file_type)

            return (
              <div
                key={file.id}
                className="relative group w-full max-w-[200px] sm:w-[200px]"
                onMouseEnter={() => setHoveredFile(file.id)}
                onMouseLeave={() => setHoveredFile(null)}
                onFocus={() => setHoveredFile(file.id)}
                onBlur={() => setHoveredFile((prev) => (prev === file.id ? null : prev))}
                title={fileName}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs shadow-sm outline-none transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                        accent.chipBg,
                        accent.chipBorder,
                        'border',
                      )}
                      tabIndex={0}
                    >
                      <div
                        className={cn(
                          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors',
                          accent.iconBg,
                          accent.iconText,
                          isImage && 'ring-1 ring-purple-200',
                        )}
                      >
                        {getFileIcon(file.file_name || file.filename || rawName, file.file_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-gray-900 leading-tight">
                          {fileName}
                        </p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium break-words">{fileName}</p>
                      <p className="text-xs text-gray-400">{extensionLabel}</p>
                      {uploadedLabel && (
                        <p className="text-xs text-gray-400">Yükleme: {uploadedLabel}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>

                {showActions && hoveredFile === file.id && (
                  <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-2">
                    <div className="pointer-events-auto flex gap-1 rounded-full bg-white/95 px-2 py-1 shadow">
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
                          disabled={deletingId === file.id}
                        >
                          {deletingId === file.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
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
