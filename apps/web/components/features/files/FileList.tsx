'use client'

import { useState } from 'react'
import { filesAPI } from '@/lib/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { File, Download, Trash2, Folder } from 'lucide-react'
import { toast } from 'sonner'

interface FileListProps {
  files: any[]
  onDelete?: () => void
  showFolder?: boolean
}

export function FileList({ files, onDelete, showFolder = true }: FileListProps) {
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

  function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  function getFileIcon(contentType: string) {
    if (contentType.startsWith('image/')) return '🖼️'
    if (contentType.startsWith('video/')) return '🎬'
    if (contentType.includes('pdf')) return '📄'
    if (contentType.includes('word')) return '📝'
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return '📊'
    if (contentType.includes('zip') || contentType.includes('rar')) return '📦'
    return '📎'
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <File className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>Henüz dosya yüklenmemiş</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <Card key={file.id}>
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl flex-shrink-0">
                {getFileIcon(file.content_type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.filename}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <span>{formatFileSize(file.file_size)}</span>
                  {file.uploaded_by_name && (
                    <>
                      <span>•</span>
                      <span>{file.uploaded_by_name}</span>
                    </>
                  )}
                  {file.created_at && (
                    <>
                      <span>•</span>
                      <span>
                        {new Date(file.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </>
                  )}
                </div>
                {showFolder && file.folder_path && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Folder className="w-3 h-3" />
                    <span className="truncate">{file.folder_path}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(file.id, file.filename)}
                  className="h-8"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(file.id, file.filename)}
                  disabled={deletingId === file.id}
                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}