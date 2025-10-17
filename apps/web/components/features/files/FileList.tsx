'use client'

import { useState } from 'react'
import { filesAPI } from '@/lib/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  File,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
} from 'lucide-react'
import { toast } from 'sonner'
import type { LucideIcon } from 'lucide-react'

interface FileListProps {
  files: any[]
  onDelete?: () => void
  showFolder?: boolean
  allowDelete?: boolean
  variant?: 'list' | 'grid'
  itemWidth?: number
}

export function FileList({
  files,
  onDelete,
  showFolder: _showFolder = true,
  allowDelete = true,
  variant = 'list',
  itemWidth = 112,
}: FileListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDownload(fileId: string, filename: string) {
    try {
      const response = await filesAPI.getDownloadUrl(fileId)
      const downloadUrl = response.data.download_url

      // Trigger download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success('İndirme başladı')
    } catch (error) {
      toast.error('Dosya indirilemedi')
    }
  }

  async function handleDelete(fileId: string, filename: string) {
    if (!confirm(`"${filename}" dosyasını silmek istediğinizden emin misiniz?`)) {
      return
    }

    try {
      setDeletingId(fileId)
      await filesAPI.delete(fileId)
      toast.success('Dosya silindi')
      if (onDelete) {
        onDelete()
      }
    } catch (error) {
      toast.error('Dosya silinemedi')
    } finally {
      setDeletingId(null)
    }
  }

  function formatFileSize(bytes?: number | null) {
    if (!bytes) return '—'
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const extensionPresets: Array<{
    match: (ext: string, type: string) => boolean
    icon: LucideIcon
    iconClass: string
    bgClass: string
  }> = [
    {
      match: (ext, type) => ['pdf'].includes(ext) || type.includes('pdf'),
      icon: FileText,
      iconClass: 'text-red-600',
      bgClass: 'bg-red-50',
    },
    {
      match: (ext, type) =>
        ['doc', 'docx', 'rtf', 'odt'].includes(ext) ||
        type.includes('word'),
      icon: FileText,
      iconClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
    },
    {
      match: (ext, type) =>
        ['xls', 'xlsx', 'csv', 'ods'].includes(ext) ||
        type.includes('excel') ||
        type.includes('spreadsheet'),
      icon: FileSpreadsheet,
      iconClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
    },
    {
      match: (ext, type) =>
        ['ppt', 'pptx', 'key'].includes(ext) || type.includes('powerpoint'),
      icon: FileText,
      iconClass: 'text-orange-600',
      bgClass: 'bg-orange-50',
    },
    {
      match: (ext, type) =>
        ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) ||
        type.includes('zip') ||
        type.includes('archive'),
      icon: FileArchive,
      iconClass: 'text-amber-600',
      bgClass: 'bg-amber-50',
    },
    {
      match: (ext, type) =>
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) ||
        type.startsWith('image/'),
      icon: FileImage,
      iconClass: 'text-purple-600',
      bgClass: 'bg-purple-50',
    },
    {
      match: (ext, type) =>
        ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) ||
        type.startsWith('video/'),
      icon: FileVideo,
      iconClass: 'text-indigo-600',
      bgClass: 'bg-indigo-50',
    },
    {
      match: (ext, type) =>
        ['mp3', 'wav', 'aac', 'flac'].includes(ext) || type.startsWith('audio/'),
      icon: FileAudio,
      iconClass: 'text-pink-600',
      bgClass: 'bg-pink-50',
    },
    {
      match: (ext, type) =>
        ['json', 'js', 'ts', 'tsx', 'jsx', 'html', 'css', 'xml'].includes(ext) ||
        type.includes('json') ||
        type.startsWith('text/'),
      icon: FileCode,
      iconClass: 'text-slate-600',
      bgClass: 'bg-slate-100',
    },
  ]

  const resolveFileVisuals = (
    filename: string,
    contentType: string,
  ): { Icon: LucideIcon; iconClass: string; bgClass: string; extension: string } => {
    const extension = (filename?.split('.')?.pop() || '').toLowerCase()
    const preset =
      extensionPresets.find((item) => item.match(extension, contentType || '')) ||
      null

    if (preset) {
      return { Icon: preset.icon, iconClass: preset.iconClass, bgClass: preset.bgClass, extension }
    }

    return {
      Icon: File,
      iconClass: 'text-gray-500',
      bgClass: 'bg-gray-100',
      extension,
    }
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <File className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>Henüz dosya yüklenmemiş</p>
      </div>
    )
  }

  if (variant === 'grid') {
    return (
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${itemWidth}px, 1fr))` }}
      >
        {files.map((file) => {
          const { Icon, iconClass, bgClass, extension } = resolveFileVisuals(
            file.filename,
            file.content_type || '',
          )

          return (
            <div
              key={file.id}
              className="group relative flex h-32 flex-col overflow-hidden rounded-md border border-gray-200 bg-white p-2 text-xs shadow-sm transition hover:shadow-md"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-md ${bgClass}`}
              >
                <Icon className={`h-4 w-4 ${iconClass}`} aria-hidden="true" />
              </div>
              <p className="mt-2 h-10 overflow-hidden text-ellipsis text-[11px] font-medium text-gray-700">
                {file.filename}
              </p>
              <div className="mt-auto flex items-center justify-between text-[10px] uppercase text-gray-400">
                <span>{extension || 'Dosya'}</span>
                <span>{formatFileSize(file.file_size)}</span>
              </div>
              <div className="absolute right-1 top-1 flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-600 hover:bg-gray-100"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleDownload(file.id, file.filename)
                  }}
                  aria-label="Dosyayı indir"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {allowDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleDelete(file.id, file.filename)
                    }}
                    disabled={deletingId === file.id}
                    aria-label="Dosyayı sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {files.map((file) => {
        const { Icon, iconClass, bgClass, extension } = resolveFileVisuals(
          file.filename,
          file.content_type || '',
        )
        return (
          <Card
            key={file.id}
            className="overflow-hidden border border-gray-200/70 shadow-sm transition hover:shadow-md focus-within:shadow-md"
          >
            <CardContent className="p-2.5">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md ${bgClass}`}>
                  <Icon className={`h-4 w-4 ${iconClass}`} aria-hidden="true" />
                </div>

                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <p className="truncate text-sm font-medium text-gray-900" title={file.filename}>
                    {file.filename}
                  </p>
                  {extension && (
                    <span className="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-600">
                      {extension}
                    </span>
                  )}
                </div>

                <div className="flex flex-shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(file.id, file.filename)}
                    className="h-8 w-8"
                    aria-label="Dosyayı indir"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {allowDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(file.id, file.filename)}
                      disabled={deletingId === file.id}
                      className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                      aria-label="Dosyayı sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
