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
import { Download, FileIcon, Loader2, Trash2 } from 'lucide-react'

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

export default function FilesExplorerPage() {
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState<ExplorerFile[]>([])
  const [filter, setFilter] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all')
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [selectedStep, setSelectedStep] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  const fileList = useMemo(() => {
    const text = filter.trim().toLowerCase()

    const filterFiles = (files: ExplorerFile[]) => {
      if (!text) return files
      return files.filter((file) =>
        file.filename.toLowerCase().includes(text) ||
        (file.folder_path || '').toLowerCase().includes(text),
      )
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
  }, [entries, explorerTree, filter, selectedCustomer, selectedJob, selectedStep])

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
              <Button variant="outline" size="sm" onClick={load} disabled={loading}>
                <Loader2 className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                Yenile
              </Button>
            </div>
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Dosya veya klasör ara"
              className="h-8"
            />
          </CardHeader>
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-96">Ad</TableHead>
                <TableHead className="w-48">Müşteri</TableHead>
                <TableHead className="w-48">İş</TableHead>
                <TableHead className="w-40">Süreç</TableHead>
                <TableHead className="w-32">Boyut</TableHead>
                <TableHead className="w-32">İçerik</TableHead>
                <TableHead className="w-40">Yükleyen</TableHead>
                <TableHead className="w-48">Tarih</TableHead>
                <TableHead className="w-32 text-right">Aksiyonlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-sm text-gray-500">
                    Dosyalar yükleniyor...
                  </TableCell>
                </TableRow>
              ) : fileList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-sm text-gray-500">
                    Dosya bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                fileList.map((file) => (
                  <TableRow key={file.id} className="align-middle">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 text-gray-400" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900" title={file.filename}>
                            {file.filename}
                          </p>
                          <p className="text-xs text-gray-500" title={file.folder_path || undefined}>
                            {file.folder_path || '-'}
                          </p>
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
                    <TableCell>{formatBytes(file.file_size || 0)}</TableCell>
                    <TableCell>{file.content_type || '-'}</TableCell>
                    <TableCell>{file.uploaded_by?.name || '-'}</TableCell>
                    <TableCell>
                      {file.created_at ? new Date(file.created_at).toLocaleString('tr-TR') : '-'}
                    </TableCell>
                    <TableCell className="text-right">
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
        </Card>
      </div>
    </div>
  )
}
