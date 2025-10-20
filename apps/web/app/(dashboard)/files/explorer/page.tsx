'use client'

import { useEffect, useMemo, useState } from 'react'
import { filesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { Download, FileIcon, Loader2, Trash2, Grid3x3, List, FileText, FileImage, FileSpreadsheet, FileVideo, FileArchive, File } from 'lucide-react'
import { handleApiError } from '@/lib/utils/error-handler'
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select'

type ExplorerFile = {
  id: string
  filename: string
  object_key: string
  folder_path: string | null
  file_size: number | null
  content_type: string | null
  created_at: string | null
  ref_type: string | null
  ref_id: string | null
  uploaded_by?: {
    id: string | null
    name: string | null
  } | null
  customer?: {
    id: string | null
    name: string | null
  } | null
  job?: {
    id: string | null
    job_number: string | null
    title: string | null
  } | null
  process?: {
    id: string | null
    code: string | null
    name: string | null
  } | null
}

type StepNode = {
  id: string
  name: string
  code: string | null
  files: ExplorerFile[]
}

type JobNode = {
  id: string
  jobNumber: string | null
  title: string | null
  files: ExplorerFile[]
  steps: Map<string, StepNode>
}

type CustomerNode = {
  id: string
  name: string
  files: ExplorerFile[]
  jobs: Map<string, JobNode>
}

const UNCATEGORIZED_CUSTOMER = 'uncategorized'

function formatBytes(bytes?: number | null) {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function getFileIcon(filename: string, contentType?: string | null) {
  const ext = filename.split('.').pop()?.toLowerCase()
  const type = contentType?.toLowerCase() || ''

  // Images
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext || '')) {
    return FileImage
  }

  // PDFs
  if (type === 'application/pdf' || ext === 'pdf') {
    return FileText
  }

  // Word documents
  if (type.includes('word') || ['doc', 'docx'].includes(ext || '')) {
    return FileText
  }

  // Excel spreadsheets
  if (type.includes('spreadsheet') || type.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext || '')) {
    return FileSpreadsheet
  }

  // Videos
  if (type.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(ext || '')) {
    return FileVideo
  }

  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
    return FileArchive
  }

  // Text files
  if (type.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts'].includes(ext || '')) {
    return FileText
  }

  // Default
  return File
}

function getFileIconColor(filename: string, contentType?: string | null) {
  const ext = filename.split('.').pop()?.toLowerCase()
  const type = contentType?.toLowerCase() || ''

  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext || '')) {
    return 'text-purple-500'
  }
  if (type === 'application/pdf' || ext === 'pdf') {
    return 'text-red-500'
  }
  if (type.includes('word') || ['doc', 'docx'].includes(ext || '')) {
    return 'text-blue-500'
  }
  if (type.includes('spreadsheet') || type.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext || '')) {
    return 'text-green-500'
  }
  if (type.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'].includes(ext || '')) {
    return 'text-pink-500'
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
    return 'text-yellow-600'
  }
  if (type.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts'].includes(ext || '')) {
    return 'text-gray-500'
  }
  return 'text-gray-400'
}

export default function FilesExplorerPage() {
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState<ExplorerFile[]>([])
  const [filter, setFilter] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all')
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selectedProcesses, setSelectedProcesses] = useState<string[]>([])

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    try {
      setLoading(true)
      const response = await filesAPI.getExplorer()
      const data = response?.data ?? response ?? []
      setEntries(Array.isArray(data) ? data : [])
    } catch (error) {
      handleApiError(error, 'Explorer load')
      toast.error('Dosyalar yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const explorerTree = useMemo(() => {
    const customers = new Map<string, CustomerNode>()

    const getCustomer = (id: string | null, name: string | null) => {
      const key = id || UNCATEGORIZED_CUSTOMER
      if (!customers.has(key)) {
        customers.set(key, {
          id: key,
          name: name || 'Diğer',
          files: [],
          jobs: new Map(),
        })
      }
      const cust = customers.get(key)!
      if (!name && cust.name === 'Diğer' && customers.has(key) && name) {
        cust.name = name
      }
      return cust
    }

    const getJob = (customer: CustomerNode, jobId: string | null, jobNumber: string | null, title: string | null) => {
      const key = jobId || `jobless-${customer.id}`
      if (!customer.jobs.has(key)) {
        customer.jobs.set(key, {
          id: key,
          jobNumber,
          title,
          files: [],
          steps: new Map(),
        })
      }
      const job = customer.jobs.get(key)!
      if (!jobId && title && !job.title) {
        job.title = title
      }
      return job
    }

    entries.forEach((file) => {
      const customer = getCustomer(file.customer?.id || null, file.customer?.name || null)

      if (file.job?.id) {
        const job = getJob(customer, file.job.id, file.job.job_number || null, file.job.title || null)
        if (file.process?.id) {
          const stepId = file.process.id
          if (!job.steps.has(stepId)) {
            job.steps.set(stepId, {
              id: stepId,
              name: file.process?.name || 'Süreç',
              code: file.process?.code,
              files: [],
            })
          }
          job.steps.get(stepId)!.files.push(file)
        } else {
          job.files.push(file)
        }
      } else {
        customer.files.push(file)
      }
    })

    return customers
  }, [entries])

  const customersList = useMemo(() => {
    const arr = Array.from(explorerTree.values())
    arr.sort((a, b) => a.name.localeCompare(b.name))
    return arr
  }, [explorerTree])

  const selectedCustomerNode = useMemo(() => {
    if (selectedCustomer === 'all') return null
    return explorerTree.get(selectedCustomer) ?? null
  }, [selectedCustomer, explorerTree])

  const jobList = useMemo(() => {
    if (!selectedCustomerNode) return []
    const arr = Array.from(selectedCustomerNode.jobs.values())
    arr.sort((a, b) => (a.jobNumber || '').localeCompare(b.jobNumber || ''))
    return arr
  }, [selectedCustomerNode])

  const processOptions = useMemo(() => {
    const processMap = new Map<string, MultiSelectOption>()
    entries.forEach((file) => {
      if (file.process?.id && file.process?.name) {
        processMap.set(file.process.id, {
          value: file.process.id,
          label: file.process.code ? `${file.process.code} • ${file.process.name}` : file.process.name,
        })
      }
    })
    return Array.from(processMap.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [entries])

  const fileList = useMemo(() => {
    const text = filter.trim().toLowerCase()

    const filterFiles = (files: ExplorerFile[]) => {
      let filtered = files

      // Text filter
      if (text) {
        filtered = filtered.filter((file) =>
          file.filename.toLowerCase().includes(text) ||
          (file.folder_path || '').toLowerCase().includes(text),
        )
      }

      // Process filter
      if (selectedProcesses.length > 0) {
        filtered = filtered.filter((file) =>
          file.process?.id && selectedProcesses.includes(file.process.id)
        )
      }

      return filtered
    }

    if (selectedCustomer === 'all') {
      return filterFiles(entries)
    }

    const customer = explorerTree.get(selectedCustomer)
    if (!customer) return []

    if (!selectedJob) {
      const allFiles: ExplorerFile[] = []
      allFiles.push(...customer.files)
      customer.jobs.forEach((job) => {
        allFiles.push(...job.files)
        job.steps.forEach((step) => allFiles.push(...step.files))
      })
      return filterFiles(allFiles)
    }

    const job = customer.jobs.get(selectedJob)
    if (!job) return []

    if (!selectedStep) {
      const allFiles = [...job.files]
      job.steps.forEach((step) => allFiles.push(...step.files))
      return filterFiles(allFiles)
    }

    const step = job.steps.get(selectedStep)
    return step ? filterFiles(step.files) : []
  }, [entries, explorerTree, filter, selectedCustomer, selectedJob, selectedStep, selectedProcesses])

  async function handleDownload(fileId: string) {
    try {
      setDownloadingId(fileId)
      const response = await filesAPI.getDownloadUrl(fileId)
      const url = response?.data?.download_url
      const fileName = response?.data?.filename
      if (url) {
        const link = document.createElement('a')
        link.href = url
        link.download = fileName || 'file'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      toast.error('Dosya indirilemedi')
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleDelete(fileId: string) {
    if (!confirm('Dosyayı silmek istediğinizden emin misiniz?')) return
    try {
      setDeletingId(fileId)
      await filesAPI.delete(fileId)
      toast.success('Dosya silindi')
      await load()
    } catch (error) {
      toast.error('Dosya silinemedi')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dosya Yönetimi</h1>
        <p className="text-sm text-gray-500">Tüm müşteri ve iş dosyalarını buradan görüntüleyin.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_260px_1fr]">
        <Card className="h-full">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">Müşteriler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCustomer('all')
                setSelectedJob(null)
                setSelectedStep(null)
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                selectedCustomer === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100',
              )}
            >
              <span>Tüm Dosyalar</span>
              <span className="text-xs text-gray-500">{entries.length}</span>
            </button>

            {customersList.map((customer) => {
              const total = customer.files.length + Array.from(customer.jobs.values()).reduce((acc, job) => {
                let count = job.files.length
                job.steps.forEach((step) => (count += step.files.length))
                return acc + count
              }, 0)
              return (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(customer.id)
                    setSelectedJob(null)
                    setSelectedStep(null)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                    selectedCustomer === customer.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  <span className="truncate" title={customer.name}>
                    {customer.name}
                  </span>
                  <span className="text-xs text-gray-500">{total}</span>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader className="py-4">
            <CardTitle className="text-sm">İşler / Süreçler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedCustomer === 'all' ? (
              <p className="text-xs text-gray-500">Gösterilecek müşteri seçin.</p>
            ) : !selectedCustomerNode ? (
              <p className="text-xs text-gray-500">Dosya bulunamadı.</p>
            ) : (
              <div className="space-y-1">
                {selectedCustomerNode.files.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJob(null)
                      setSelectedStep(null)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                      !selectedJob ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    <span>Müşteri klasörü</span>
                    <span className="text-xs text-gray-500">{selectedCustomerNode.files.length}</span>
                  </button>
                )}
                {jobList.map((job) => {
                  const jobCount = job.files.length + Array.from(job.steps.values()).reduce((acc, step) => acc + step.files.length, 0)
                  const active = selectedJob === job.id && !selectedStep
                  return (
                    <div key={job.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedJob(job.id)
                          setSelectedStep(null)
                        }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors',
                          active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100',
                        )}
                      >
                        <span className="truncate" title={job.title || job.jobNumber || 'İş'}>
                          {job.jobNumber ? `${job.jobNumber} • ${job.title ?? ''}` : job.title || 'İş'}
                        </span>
                        <span className="text-xs text-gray-500">{jobCount}</span>
                      </button>
                      {Array.from(job.steps.values()).map((step) => {
                        const stepActive = selectedStep === step.id
                        return (
                          <button
                            key={step.id}
                            type="button"
                            onClick={() => {
                              setSelectedJob(job.id)
                              setSelectedStep(step.id)
                            }}
                            className={cn(
                              'ml-4 flex w-[calc(100%-1rem)] items-center justify-between rounded-md px-3 py-2 text-xs transition-colors',
                              stepActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100',
                            )}
                          >
                            <span className="truncate" title={step.name}>
                              {step.code ? `${step.code} • ${step.name}` : step.name}
                            </span>
                            <span className="text-[11px] text-gray-500">{step.files.length}</span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-[540px]">
          <CardHeader className="flex flex-col gap-3 py-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm">Dosyalar</CardTitle>
              <div className="flex items-center gap-3">
                <MultiSelect
                  options={processOptions}
                  selected={selectedProcesses}
                  onChange={setSelectedProcesses}
                  placeholder="Süreç filtrele..."
                  className="w-64"
                />
                <div className="flex items-center gap-1 rounded-md border border-gray-200 p-1">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-7 px-2"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-7 px-2"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                  <Loader2 className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                  Yenile
                </Button>
              </div>
            </div>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Dosya veya klasör ara"
              className="h-8"
            />
          </CardHeader>
          {viewMode === 'list' ? (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-96">Ad</TableHead>
                  <TableHead className="w-48">Müşteri</TableHead>
                  <TableHead className="w-48">İş</TableHead>
                  <TableHead className="w-40">Süreç</TableHead>
                  <TableHead className="w-32 text-right">Aksiyonlar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-gray-500">
                      Dosyalar yükleniyor...
                    </TableCell>
                  </TableRow>
                ) : fileList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-gray-500">
                      Dosya bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  fileList.map((file) => (
                    <TableRow
                      key={file.id}
                      className="align-middle cursor-pointer hover:bg-gray-50 group relative"
                      onClick={() => handleDownload(file.id)}
                      title="İndirmek için tıklayın"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const IconComponent = getFileIcon(file.filename, file.content_type)
                            const iconColor = getFileIconColor(file.filename, file.content_type)
                            return <IconComponent className={cn('h-4 w-4', iconColor)} />
                          })()}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900" title={file.filename}>
                              {file.filename}
                            </p>
                            <p className="text-xs text-gray-500" title={file.folder_path || undefined}>
                              {file.folder_path || '-'}
                            </p>
                          </div>
                        </div>
                        {/* Hover tooltip */}
                        <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-gray-900 text-white text-xs rounded-md shadow-lg p-3 min-w-[280px]">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Boyut:</span>
                              <span>{formatBytes(file.file_size || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Tarih:</span>
                              <span>{file.created_at ? new Date(file.created_at).toLocaleString('tr-TR') : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Yükleyen:</span>
                              <span>{file.uploaded_by?.name || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{file.customer?.name || '-'}</TableCell>
                      <TableCell>
                        {file.job?.job_number ? (
                          <span>{file.job.job_number}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {file.process?.name ? (
                          <span>{file.process.code ? `${file.process.code} • ${file.process.name}` : file.process.name}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownload(file.id)}
                            disabled={downloadingId === file.id}
                            className="h-8 w-8"
                          >
                            {downloadingId === file.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(file.id)}
                            disabled={deletingId === file.id}
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                          >
                            {deletingId === file.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          ) : (
            <CardContent>
              {loading ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  Dosyalar yükleniyor...
                </div>
              ) : fileList.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  Dosya bulunamadı.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {fileList.map((file) => {
                    const IconComponent = getFileIcon(file.filename, file.content_type)
                    const iconColor = getFileIconColor(file.filename, file.content_type)
                    return (
                      <div
                        key={file.id}
                        className="group relative flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all"
                        onClick={() => handleDownload(file.id)}
                        title={file.filename}
                      >
                        <IconComponent className={cn('h-12 w-12 transition-transform group-hover:scale-110', iconColor)} />
                        <p className="mt-2 text-center text-xs font-medium text-gray-900 line-clamp-2 w-full break-words">
                          {file.filename}
                        </p>
                        <p className="mt-1 text-[10px] text-gray-500">
                          {formatBytes(file.file_size || 0)}
                        </p>

                      {/* Hover tooltip */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:block z-50 bg-gray-900 text-white text-xs rounded-md shadow-lg p-3 min-w-[240px]">
                        <div className="space-y-1">
                          <div className="font-medium text-white mb-2 break-words">{file.filename}</div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Boyut:</span>
                            <span>{formatBytes(file.file_size || 0)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Tarih:</span>
                            <span>{file.created_at ? new Date(file.created_at).toLocaleDateString('tr-TR') : '-'}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-gray-400">Yükleyen:</span>
                            <span>{file.uploaded_by?.name || '-'}</span>
                          </div>
                          {file.customer?.name && (
                            <div className="flex justify-between gap-4">
                              <span className="text-gray-400">Müşteri:</span>
                              <span className="truncate">{file.customer.name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                        {/* Delete button - top right */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(file.id)
                          }}
                          disabled={deletingId === file.id}
                          className="absolute -top-2 -right-2 bg-white rounded-full p-1.5 shadow-md border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                        >
                          {deletingId === file.id ? (
                            <Loader2 className="h-3 w-3 text-red-600 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 text-red-600" />
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
