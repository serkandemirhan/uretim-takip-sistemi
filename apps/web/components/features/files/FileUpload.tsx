 'use client'

import { useState, useRef } from 'react'
import { filesAPI } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, File, X, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface FileUploadProps {
  refType: 'job' | 'job_step'
  refId: string
  onUploadComplete?: () => void
  maxFiles?: number
}

export function FileUpload({ refType, refId, onUploadComplete, maxFiles = 10 }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    
    if (files.length === 0) return
    
    if (files.length > maxFiles) {
      toast.error(`Maksimum ${maxFiles} dosya yükleyebilirsiniz`)
      return
    }

    uploadFiles(files)
  }

  async function uploadFiles(files: File[]) {
    setUploading(true)

    const queue = files.map(file => ({
      file,
      status: 'pending',
      progress: 0,
      error: null
    }))

    setUploadQueue(queue)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      try {
        // Update status
        setUploadQueue(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'uploading', progress: 10 } : item
        ))

        // 1. Get upload URL
        const uploadUrlResponse = await filesAPI.getUploadUrl({
          filename: file.name,
          content_type: file.type,
          ref_type: refType,
          ref_id: refId,
        })

        const { upload_url, object_key, folder_path } = uploadUrlResponse.data

        // Update progress
        setUploadQueue(prev => prev.map((item, idx) => 
          idx === i ? { ...item, progress: 30 } : item
        ))

        // 2. Upload to MinIO
        const uploadResponse = await fetch(upload_url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        })

        if (!uploadResponse.ok) {
          throw new Error('Dosya yükleme başarısız')
        }

        // Update progress
        setUploadQueue(prev => prev.map((item, idx) => 
          idx === i ? { ...item, progress: 70 } : item
        ))

        // 3. Link file to database
        await filesAPI.linkFile({
          object_key,
          filename: file.name,
          file_size: file.size,
          content_type: file.type,
          ref_type: refType,
          ref_id: refId,
          folder_path,
        })

        // Update status - success
        setUploadQueue(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'success', progress: 100 } : item
        ))

      } catch (error: any) {
        console.error('Upload error:', error)
        setUploadQueue(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'error', error: error.message } : item
        ))
      }
    }

    setUploading(false)
    
    // Tüm dosyalar başarılı mı?
    const allSuccess = queue.every(item => item.status === 'success' || uploadQueue.find(q => q.file === item.file)?.status === 'success')
    
    if (allSuccess) {
      toast.success('Tüm dosyalar başarıyla yüklendi!')
      if (onUploadComplete) {
        onUploadComplete()
      }
      // Queue'yu temizle
      setTimeout(() => setUploadQueue([]), 2000)
    } else {
      toast.error('Bazı dosyalar yüklenemedi')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removeFromQueue(index: number) {
    setUploadQueue(prev => prev.filter((_, i) => i !== index))
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full border-dashed"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Yükleniyor...' : 'Dosya Seç'}
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          Maksimum {maxFiles} dosya yükleyebilirsiniz
        </p>
      </div>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2">
          {uploadQueue.map((item, index) => (
            <Card key={index}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {item.status === 'pending' && <File className="w-5 h-5 text-gray-400" />}
                    {item.status === 'uploading' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
                    {item.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {item.status === 'error' && <X className="w-5 h-5 text-red-600" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(item.file.size)}
                    </p>

                    {/* Progress Bar */}
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

                    {/* Error Message */}
                    {item.status === 'error' && item.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {item.error}
                      </p>
                    )}
                  </div>

                  {/* Remove Button */}
                  {(item.status === 'pending' || item.status === 'error') && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromQueue(index)}
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