'use client'

import { useState, useRef } from 'react'
import axios from 'axios'
import { filesAPI } from '@/lib/api/client'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, File as FileIcon, X, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'


type QueueItem = {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error: string | null
}

interface FileUploadProps {
  refType: 'job' | 'job_step' | 'stock_movement' | 'user' | 'hr_employee_document'
  refId: string
  onUploadComplete?: () => void
  maxFiles?: number
  disabled?: boolean
  className?: string
}

export function FileUpload({
  refType,
  refId,
  onUploadComplete,
  maxFiles = 10,
  disabled = false,
  className,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const pickFiles = () => {
    if (disabled || uploading) return
    inputRef.current?.click()
  }

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || uploading) return
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (files.length > maxFiles) {
      toast.error(`Maksimum ${maxFiles} dosya yükleyebilirsiniz`)
      return
    }
    void uploadFiles(files)
  }

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    if (disabled || uploading) return
    const files = Array.from(e.dataTransfer.files || [])
    if (!files.length) return
    if (files.length > maxFiles) {
      toast.error(`Maksimum ${maxFiles} dosya yükleyebilirsiniz`)
      return
    }
    void uploadFiles(files)
  }

  const uploadFiles = async (files: File[]) => {
    setUploading(true)

    // Kuyruğu başlat
    const startQueue: QueueItem[] = files.map((f) => ({
      file: f,
      status: 'pending',
      progress: 0,
      error: null,
    }))
    setQueue(startQueue)

    // Sıralı yükleyelim (hata izolasyonu daha net)
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      const update = (patch: Partial<QueueItem>) =>
        setQueue((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, ...patch } : item)),
        )

      try {
        update({ status: 'uploading', progress: 5, error: null })

        // 1) Presigned upload URL al
        const urlRes = await filesAPI.getUploadUrl({
          filename: file.name,
          content_type: file.type || 'application/octet-stream',
          ref_type: refType,
          ref_id: refId,
        })
        const { upload_url, object_key, folder_path } = urlRes?.data || {}

        if (!upload_url || !object_key) {
          throw new Error('Upload URL üretilemedi')
        }
        update({ progress: 15 })

        // 2) MinIO'ya PUT (gerçek ilerleme yüzdesi)
        await axios.put(upload_url, file, {
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          onUploadProgress: (ev) => {
            if (!ev.total) return
            const pct = Math.min(95, Math.max(20, Math.round((ev.loaded / ev.total) * 100)))
            update({ progress: pct })
          },
        })

        // 3) DB'ye link (bucket FE’den beklenmiyor; BE ENV’den dolduruyor)
        await filesAPI.linkFile({
          object_key,
          filename: file.name,
          file_size: file.size,
          content_type: file.type || 'application/octet-stream',
          ref_type: refType,
          ref_id: refId,
          folder_path,
        })

        update({ status: 'success', progress: 100 })
      } catch (err: any) {
        console.error('Upload error:', err)
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          'Dosya yükleme başarısız'
        update({ status: 'error', error: msg, progress: 0 })
      }
    }

    setUploading(false)

    const allOk = (q = queue) =>
      q.every((it, idx) => (startQueue[idx]?.file ? it.status === 'success' : true)) ||
      // state batching ihtimaline karşı mevcut state’i kontrol:
      queue.every((it) => it.status === 'success')

    if (allOk()) {
      toast.success('Tüm dosyalar başarıyla yüklendi!')
      onUploadComplete?.()
      // gürültü olmaması için kısa süre sonra temizle
      setTimeout(() => setQueue([]), 1200)
    } else {
      toast.error('Bazı dosyalar yüklenemedi')
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  const removeFromQueue = (idx: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== idx))
  }

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        className={`w-full rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
          disabled || uploading
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
            : 'cursor-pointer hover:bg-gray-50'
        }`}
        onDragOver={(e) => {
          if (disabled || uploading) return
          e.preventDefault()
        }}
        onDrop={onDrop}
        onClick={pickFiles}
        onKeyDown={(event) => {
          if (disabled || uploading) return
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            pickFiles()
          }
        }}
        role="button"
        tabIndex={disabled || uploading ? -1 : 0}
        aria-disabled={disabled || uploading}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onSelect}
          disabled={uploading || disabled}
        />
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-start sm:text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500 sm:mr-3">
            <Upload className="h-4 w-4" />
          </span>
          <div className="space-y-1 text-xs text-gray-500 sm:flex-1 sm:space-y-0">
            <p className="font-medium text-gray-700">
              {disabled
                ? 'Dosya yükleme izniniz yok'
                : 'Dosyaları buraya sürükleyin veya simgeye tıklayın'}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400">
              {uploading ? (
                <span className="text-blue-600">Yükleme devam ediyor…</span>
              ) : (
                !disabled && <span>Maksimum {maxFiles} dosya</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kuyruk */}
      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item, idx) => (
            <Card key={`${item.file.name}-${idx}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {item.status === 'pending' && <FileIcon className="w-5 h-5 text-gray-400" />}
                    {item.status === 'uploading' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                    {item.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {item.status === 'error' && <X className="w-5 h-5 text-red-600" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                    <p className="text-xs text-gray-500">{formatSize(item.file.size)}</p>

                    {/* Progress */}
                    {item.status === 'uploading' && (
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {item.status === 'error' && item.error && (
                      <p className="text-xs text-red-600 mt-1">{item.error}</p>
                    )}
                  </div>

                  {/* Remove */}
                  {(item.status === 'pending' || item.status === 'error') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromQueue(idx)}
                      disabled={uploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
