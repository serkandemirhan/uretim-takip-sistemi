'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useAuth } from '@/lib/hooks/useAuth'
import { hrDocumentsAPI, filesAPI } from '@/lib/api/client'
import { handleError } from '@/lib/utils/error-handler'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'
import {
  Loader2,
  RefreshCcw,
  Upload,
  CheckCircle2,
  XCircle,
  FileText,
  ShieldCheck,
  Download,
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  missing: 'Eksik',
  pending_approval: 'Onay Bekliyor',
  active: 'Geçerli',
  expired: 'Süresi Doldu',
  rejected: 'Reddedildi',
  archived: 'Arşiv',
}

const STATUS_STYLES: Record<string, string> = {
  missing: 'bg-red-100 text-red-700',
  pending_approval: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-rose-100 text-rose-700',
  rejected: 'bg-gray-200 text-gray-700',
  archived: 'bg-slate-200 text-slate-600',
}

type EmployeeDocument = {
  id: string
  user_id: string
  user_name?: string | null
  document_type_id: string
  document_type_code: string
  document_type_name: string
  document_folder_code?: string | null
  requires_approval: boolean
  status: string
  valid_from?: string | null
  valid_until?: string | null
  updated_at?: string | null
}

type DocumentVersion = {
  id: string
  version_no: number
  approval_status: string
  uploaded_at?: string | null
  uploaded_by?: string | null
  uploaded_by_name?: string | null
  approved_at?: string | null
  approved_by?: string | null
  approved_by_name?: string | null
  file_id?: string | null
  file_metadata?: Record<string, any> | null
}

type DocumentDetail = EmployeeDocument & {
  email?: string | null
  versions: DocumentVersion[]
}

const HR_MANAGERIAL_ROLES = new Set(['hr_admin', 'hr_manager', 'hr_specialist'])

const CATEGORY_OPTIONS = [
  { value: '', label: 'Tüm Kategoriler', prefix: '' },
  { value: 'ONBOARDING', label: 'Onboarding', prefix: 'ON' },
  { value: 'OPERATIONS', label: 'Operasyon & Uyum', prefix: 'OP' },
  { value: 'HR_LIFECYCLE', label: 'HR Süreçleri', prefix: 'HR' },
  { value: 'OFFBOARDING', label: 'Offboarding', prefix: 'OF' },
]

export default function HrDocumentsPage() {
  const { user } = useAuth()
  const [initialised, setInitialised] = useState(false)
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<EmployeeDocument[]>([])
  const [viewMode, setViewMode] = useState<'mine' | 'pending' | 'all'>('mine')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<DocumentDetail | null>(null)

  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [expiryRunning, setExpiryRunning] = useState(false)
  const [categorySummary, setCategorySummary] = useState<Record<string, number>>({})

  const userRole = user?.role || ''
  const isEmployee = userRole === 'hr_employee'
  const isManagerial = HR_MANAGERIAL_ROLES.has(userRole)

  useEffect(() => {
    if (user && !initialised) {
      setInitialised(true)
      setViewMode(isEmployee ? 'mine' : 'pending')
    }
  }, [user, isEmployee, initialised])

  useEffect(() => {
    if (!initialised) return
    void loadDocuments()
  }, [initialised, viewMode, statusFilter, categoryFilter])

  useEffect(() => {
    if (!initialised) return
    void loadCategorySummary()
  }, [initialised])

  const summary = useMemo(() => {
    const pending = documents.filter((doc) => doc.status === 'pending_approval').length
    const expired = documents.filter((doc) => doc.status === 'expired').length
    const active = documents.filter((doc) => doc.status === 'active').length
    return { pending, expired, active, total: documents.length }
  }, [documents])

  async function loadDocuments() {
    if (!user) return
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (viewMode === 'pending') {
        params.status = 'pending_approval'
      } else if (viewMode === 'mine' && !isEmployee) {
        params.user_id = user.id
      }
      if (statusFilter) {
        params.status = statusFilter
      }
      if (categoryFilter) {
        params.category = categoryFilter
      }
      const response = await hrDocumentsAPI.listEmployeeDocuments(params)
      const raw = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
      const mapped: EmployeeDocument[] = raw.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        user_name: item.user_name,
        document_type_id: item.document_type_id,
        document_type_code: item.document_type_code,
        document_type_name: item.document_type_name,
        document_folder_code: item.folder_code,
        requires_approval: !!item.requires_approval,
        status: item.status,
        valid_from: item.valid_from,
        valid_until: item.valid_until,
        updated_at: item.updated_at,
      }))
      setDocuments(mapped)
    } catch (error) {
      handleError(error, { title: 'Doküman listesi getirilemedi' })
    } finally {
      setLoading(false)
    }
  }

  async function openDocument(documentId: string) {
    setDetailLoading(true)
    setDetailOpen(true)
    try {
      const response = await hrDocumentsAPI.getEmployeeDocument(documentId)
      const data = (response?.data ?? response) as any
      const detail: DocumentDetail = {
        id: data.id,
        user_id: data.user_id,
        user_name: data.user_name,
        document_type_id: data.document_type_id,
        document_type_code: data.document_type_code,
        document_type_name: data.document_type_name,
        document_folder_code: data.folder_code,
        requires_approval: !!data.requires_approval,
        status: data.status,
        valid_from: data.valid_from,
        valid_until: data.valid_until,
        updated_at: data.updated_at,
        email: data.user_email,
        versions: Array.isArray(data.versions)
          ? data.versions.map((version: any) => ({
              id: version.id,
              version_no: version.version_no,
              approval_status: version.approval_status,
              uploaded_at: version.uploaded_at,
              uploaded_by: version.uploaded_by,
              uploaded_by_name: version.uploaded_by_name,
              approved_at: version.approved_at,
              approved_by: version.approved_by,
              approved_by_name: version.approved_by_name,
              file_id: version.file_id,
              file_metadata: version.file_metadata,
            }))
          : [],
      }
      setSelectedDocument(detail)
    } catch (error) {
      setDetailOpen(false)
      handleError(error, { title: 'Doküman ayrıntısı yüklenemedi' })
    } finally {
      setDetailLoading(false)
    }
  }

  const canUpload = useMemo(() => {
    if (!selectedDocument || !user) return false
    if (isEmployee) {
      return selectedDocument.user_id === user.id
    }
    return isManagerial
  }, [isEmployee, isManagerial, selectedDocument, user])

  async function refreshDetail() {
    if (!selectedDocument) return
    await openDocument(selectedDocument.id)
    await loadDocuments()
  }

  async function handleUploadVersion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedDocument) return
    if (!uploadFile) {
      toast.error('Lütfen yüklenecek dosyayı seçin')
      return
    }
    try {
      setUploading(true)
      const uploadRes = await filesAPI.getUploadUrl({
        ref_type: 'hr_employee_document',
        ref_id: selectedDocument.id,
        filename: uploadFile.name,
        content_type: uploadFile.type || 'application/octet-stream',
        size: uploadFile.size,
      })
      const uploadData = uploadRes?.data || uploadRes
      const uploadUrl = uploadData?.upload_url
      const objectKey = uploadData?.object_key
      const folderPath = uploadData?.folder_path
      if (!uploadUrl || !objectKey) {
        throw new Error('Yükleme adresi alınamadı')
      }

      await axios.put(uploadUrl, uploadFile, {
        headers: { 'Content-Type': uploadFile.type || 'application/octet-stream' },
      })

      const linkRes = await filesAPI.linkFile({
        object_key: objectKey,
        filename: uploadFile.name,
        file_size: uploadFile.size,
        content_type: uploadFile.type || 'application/octet-stream',
        ref_type: 'hr_employee_document',
        ref_id: selectedDocument.id,
        folder_path: folderPath,
      })
      const filePayload = linkRes?.data || linkRes
      const fileId = filePayload?.id
      if (!fileId) {
        throw new Error('Dosya veritabanına kaydedilemedi')
      }

      await hrDocumentsAPI.createDocumentVersion(selectedDocument.id, {
        file_id: fileId,
        valid_from: validFrom || undefined,
        valid_until: validUntil || undefined,
        metadata: {
          source: 'ui_upload',
          original_filename: uploadFile.name,
        },
      })

      toast.success('Doküman versiyonu yüklendi')
      setUploadFile(null)
      setValidFrom('')
      setValidUntil('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      await refreshDetail()
    } catch (error) {
      handleError(error, { title: 'Doküman yüklenemedi' })
    } finally {
      setUploading(false)
    }
  }

  async function handleApproveVersion(version: DocumentVersion) {
    if (!selectedDocument) return
    try {
      await hrDocumentsAPI.approveDocumentVersion(version.id, {})
      toast.success(`Versiyon ${version.version_no} onaylandı`)
      await refreshDetail()
    } catch (error) {
      handleError(error, { title: 'Versiyon onaylanamadı' })
    }
  }

  async function handleRejectVersion(version: DocumentVersion) {
    if (!selectedDocument) return
    const note = window.prompt('Red notu (opsiyonel):') || undefined
    try {
      await hrDocumentsAPI.rejectDocumentVersion(version.id, note ? { note } : {})
      toast.message(`Versiyon ${version.version_no} reddedildi`)
      await refreshDetail()
    } catch (error) {
      handleError(error, { title: 'Versiyon reddedilemedi' })
    }
  }

  async function downloadVersion(version: DocumentVersion) {
    if (!version.file_id) {
      toast.error('Dosya bilgisi bulunamadı')
      return
    }
    try {
      const res = await filesAPI.getDownloadUrl(version.file_id)
      const url = res?.data?.download_url || res?.download_url
      if (url) {
        window.open(url, '_blank')
      } else {
        throw new Error('İndirme adresi alınamadı')
      }
    } catch (error) {
      handleError(error, { title: 'Dosya indirilemedi' })
    }
  }

  async function triggerExpiryCheck() {
    try {
      setExpiryRunning(true)
      const res = await hrDocumentsAPI.runExpiryCheck()
      const payload = res?.data || res
      toast.success('Expiry kontrolü tamamlandı', {
        description: `Güncellenen doküman: ${payload?.expired_count ?? 0}, yeniden aktif edilen: ${payload?.reactivated_count ?? 0}`,
      })
      await loadDocuments()
      if (detailOpen && selectedDocument) {
        await openDocument(selectedDocument.id)
      }
    } catch (error) {
      handleError(error, { title: 'Expiry kontrolü başarısız' })
    } finally {
      setExpiryRunning(false)
    }
  }

  async function loadCategorySummary() {
    try {
      const response = await hrDocumentsAPI.getSummary()
      const data = response?.data ?? response ?? {}
      setCategorySummary(data.by_category || {})
    } catch (error) {
      handleError(error, { title: 'Kategori özeti alınamadı', showToast: false })
    }
  }

  const filteredDocuments = useMemo(() => {
    if (!statusFilter) return documents
    return documents.filter((doc) => doc.status === statusFilter)
  }, [documents, statusFilter])

  const renderStatusBadge = (status: string) => {
    const label = STATUS_LABELS[status] || status
    const style = STATUS_STYLES[status] || 'bg-gray-200 text-gray-700'
    return <Badge className={cn('capitalize', style)}>{label}</Badge>
  }

  function handleExportCsv() {
    if (!documents.length) {
      toast.info('İndirilecek kayıt bulunmuyor')
      return
    }

    const header = ['Klasör', 'Kod', 'Doküman', 'Personel', 'Statü', 'Geçerlilik Başlangıç', 'Geçerlilik Bitiş']
    const rows = documents.map((doc) => [
      doc.document_folder_code || '',
      doc.document_type_code,
      doc.document_type_name,
      doc.user_name || '',
      STATUS_LABELS[doc.status] || doc.status,
      doc.valid_from || '',
      doc.valid_until || '',
    ])

    const csvContent = [header, ...rows]
      .map((columns) => columns.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const suffix = categoryFilter || 'all'

    link.href = url
    link.setAttribute('download', `hr_documents_${suffix}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Özlük Dokümanları</h1>
          <p className="text-gray-600 text-sm">
            Çalışan dokümanlarının durumunu takip edin, yeni versiyon yükleyin ve onaylayın.
          </p>
        </div>
        <div className="flex gap-2">
          {isManagerial && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => void triggerExpiryCheck()}
              disabled={expiryRunning}
            >
              {expiryRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Expiry Kontrolü
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={handleExportCsv} disabled={documents.length === 0}>
            <FileText className="h-4 w-4" /> CSV İndir
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => void loadDocuments()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Yenile
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Toplam Doküman</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-gray-900">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Geçerli</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-emerald-700">{summary.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Onay Bekleyen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-amber-700">{summary.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Süresi Dolan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-rose-700">{summary.expired}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Doküman Listesi</CardTitle>
            <p className="text-sm text-gray-500">
              {isEmployee
                ? 'Kendinize tanımlı zorunlu dokümanların durumu'
                : 'Tüm personel dokümanlarının güncel durumu'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isEmployee && (
              <div className="flex rounded-lg border border-gray-200 p-1 text-sm text-gray-600">
                <button
                  type="button"
                  className={cn(
                    'rounded-md px-3 py-1 transition-colors',
                    viewMode === 'pending' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100',
                  )}
                  onClick={() => setViewMode('pending')}
                >
                  Onay Bekleyen
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-md px-3 py-1 transition-colors',
                    viewMode === 'all' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100',
                  )}
                  onClick={() => setViewMode('all')}
                >
                  Tümü
                </button>
                <button
                  type="button"
                  className={cn(
                    'rounded-md px-3 py-1 transition-colors',
                    viewMode === 'mine' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100',
                  )}
                  onClick={() => setViewMode('mine')}
                >
                  Benimkiler
                </button>
              </div>
            )}
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-md border border-gray-200 px-3 py-1 text-sm"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-md border border-gray-200 px-3 py-1 text-sm"
            >
              <option value="">Tüm Statüler</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doküman</TableHead>
                  {!isEmployee && <TableHead>Personel</TableHead>}
                  <TableHead>Statü</TableHead>
                  <TableHead>Geçerlilik</TableHead>
                  <TableHead className="w-32 text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && filteredDocuments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isEmployee ? 4 : 5} className="py-6 text-center text-sm text-gray-500">
                      Kayıt bulunamadı.
                    </TableCell>
                  </TableRow>
                )}
                {loading && (
                  <TableRow>
                    <TableCell colSpan={isEmployee ? 4 : 5} className="py-6 text-center text-sm text-gray-500">
                      <span className="inline-flex items-center gap-2 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
                      </span>
                    </TableCell>
                  </TableRow>
                )}
                {filteredDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        {doc.document_folder_code && (
                          <span className="text-xs font-mono text-gray-500">{doc.document_folder_code}</span>
                        )}
                        <span className="font-medium text-gray-900">{doc.document_type_name}</span>
                        <span className="text-xs text-gray-500 uppercase">{doc.document_type_code}</span>
                      </div>
                    </TableCell>
                    {!isEmployee && (
                      <TableCell>
                        <span className="text-sm text-gray-700">{doc.user_name || '-'}</span>
                      </TableCell>
                    )}
                    <TableCell>{renderStatusBadge(doc.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-700">
                        {doc.valid_from ? new Date(doc.valid_from).toLocaleDateString('tr-TR') : '-'}
                        {' '}
                        {doc.valid_until ? `→ ${new Date(doc.valid_until).toLocaleDateString('tr-TR')}` : ''}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={() => void openDocument(doc.id)}
                      >
                        <FileText className="h-4 w-4" /> Görüntüle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {!isEmployee && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kategori Bazında Doküman Sayısı</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORY_OPTIONS.filter((option) => option.value).map((option) => (
              <div key={option.value} className="rounded-lg border border-gray-200 bg-white px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-gray-500">{option.label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {categorySummary[option.value] ?? 0}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={detailOpen} onOpenChange={(open) => {
        setDetailOpen(open)
        if (!open) {
          setSelectedDocument(null)
          setUploadFile(null)
          setValidFrom('')
          setValidUntil('')
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Doküman Ayrıntısı</DialogTitle>
            <DialogDescription>
              Doküman versiyon geçmişi ve işlem seçenekleri
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !selectedDocument ? (
            <div className="flex h-40 items-center justify-center text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-gray-500">Doküman</p>
                  <p className="text-sm font-medium text-gray-900">{selectedDocument.document_type_name}</p>
                  <p className="text-xs text-gray-500 uppercase">{selectedDocument.document_type_code}</p>
                  {selectedDocument.document_folder_code && (
                    <p className="text-xs font-mono text-gray-500">{selectedDocument.document_folder_code}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Personel</p>
                  <p className="text-sm text-gray-900">{selectedDocument.user_name || '-'}</p>
                  {selectedDocument.email && (
                    <p className="text-xs text-gray-500">{selectedDocument.email}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Statü</p>
                  {renderStatusBadge(selectedDocument.status)}
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Geçerlilik</p>
                  <p className="text-sm text-gray-900">
                    {selectedDocument.valid_from ? new Date(selectedDocument.valid_from).toLocaleDateString('tr-TR') : '-'}
                    {' '}
                    {selectedDocument.valid_until ? `→ ${new Date(selectedDocument.valid_until).toLocaleDateString('tr-TR')}` : ''}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Versiyonlar</h3>
                  <Button variant="ghost" size="sm" className="gap-2" onClick={() => void refreshDetail()}>
                    <RefreshCcw className="h-4 w-4" /> Yenile
                  </Button>
                </div>
                <div className="space-y-3">
                  {selectedDocument.versions.length === 0 && (
                    <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                      Henüz yüklenmiş bir versiyon bulunmuyor.
                    </div>
                  )}
                  {selectedDocument.versions.map((version) => (
                    <div key={version.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Versiyon {version.version_no}</p>
                          <p className="text-xs text-gray-500">
                            Yükleyen: {version.uploaded_by_name || '-'} •{' '}
                            {version.uploaded_at ? new Date(version.uploaded_at).toLocaleString('tr-TR') : '—'}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={cn(
                              'capitalize',
                              version.approval_status === 'approved' && 'bg-emerald-100 text-emerald-700',
                              version.approval_status === 'pending' && 'bg-amber-100 text-amber-700',
                              version.approval_status === 'rejected' && 'bg-gray-200 text-gray-700',
                            )}
                          >
                            {version.approval_status === 'approved'
                              ? 'Onaylandı'
                              : version.approval_status === 'pending'
                                ? 'Onay Bekliyor'
                                : 'Reddedildi'}
                          </Badge>
                          {version.approval_status === 'approved' && version.approved_at && (
                            <span className="text-xs text-gray-500">
                              {version.approved_by_name || ''} • {new Date(version.approved_at).toLocaleString('tr-TR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => void downloadVersion(version)}
                        >
                          <Download className="h-4 w-4" /> İndir
                        </Button>
                        {version.approval_status === 'pending' && isManagerial && (
                          <>
                            <Button
                              size="sm"
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => void handleApproveVersion(version)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Onayla
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-rose-200 text-rose-600 hover:bg-rose-50"
                              onClick={() => void handleRejectVersion(version)}
                            >
                              <XCircle className="mr-2 h-4 w-4" /> Reddet
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {canUpload && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Upload className="h-4 w-4" /> Yeni Versiyon Yükle
                  </h3>
                  <form className="space-y-3" onSubmit={handleUploadVersion}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        setUploadFile(file ?? null)
                      }}
                      className="block w-full text-sm text-gray-700"
                      required
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs text-gray-500 uppercase">Geçerlilik Başlangıcı</label>
                        <Input
                          type="date"
                          value={validFrom}
                          onChange={(event) => setValidFrom(event.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase">Geçerlilik Bitişi</label>
                        <Input
                          type="date"
                          value={validUntil}
                          onChange={(event) => setValidUntil(event.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={uploading} className="gap-2">
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        Yükle
                      </Button>
                    </DialogFooter>
                  </form>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
