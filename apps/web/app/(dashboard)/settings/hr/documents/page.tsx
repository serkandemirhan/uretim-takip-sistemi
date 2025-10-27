'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  hrDocumentsAPI,
  rolesAPI,
} from '@/lib/api/client'
import { handleError } from '@/lib/utils/error-handler'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Plus,
  RefreshCcw,
  Trash2,
  Sparkles,
  ShieldCheck,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const CATEGORY_OPTIONS = [
  { value: 'ONBOARDING', label: 'Onboarding', prefix: 'ON' },
  { value: 'OPERATIONS', label: 'Operasyon & Uyum', prefix: 'OP' },
  { value: 'HR_LIFECYCLE', label: 'HR Süreçleri', prefix: 'HR' },
  { value: 'OFFBOARDING', label: 'Offboarding', prefix: 'OF' },
]

const CATEGORY_LABELS = CATEGORY_OPTIONS.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.label
  return acc
}, {})

type DocumentType = {
  id: string
  code: string
  name: string
  description?: string | null
  requires_approval: boolean
  default_validity_days?: number | null
  default_share_expiry_hours?: number | null
  metadata_schema?: Record<string, unknown> | null
  category: string
  sequence_no?: number | null
  folder_code?: string | null
  is_active: boolean
  updated_at?: string | null
}

type DocumentRequirement = {
  id: string
  document_type_id: string
  document_type_name?: string
  document_type_code?: string
  document_folder_code?: string | null
  role_id?: string | null
  role_code?: string | null
  role_name?: string | null
  department_code?: string | null
  employment_type?: string | null
  is_mandatory: boolean
  validity_days_override?: number | null
  renew_before_days_override?: number | null
  created_at?: string | null
}

type RoleOption = {
  id: string
  name: string
  code: string
}

const DEFAULT_METADATA = '{\n  "fields": []\n}'

export default function HrDocumentSettingsPage() {
  const [docTypes, setDocTypes] = useState<DocumentType[]>([])
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])

  const [loadingTypes, setLoadingTypes] = useState(false)
  const [loadingRequirements, setLoadingRequirements] = useState(false)
  const [loadingRoles, setLoadingRoles] = useState(false)

  const [typeDialogOpen, setTypeDialogOpen] = useState(false)
  const [requirementDialogOpen, setRequirementDialogOpen] = useState(false)

  const [typeForm, setTypeForm] = useState({
    code: '',
    name: '',
    description: '',
    requiresApproval: true,
    defaultValidityDays: '',
    defaultShareExpiryHours: '72',
    category: CATEGORY_OPTIONS[0].value,
    sequenceNo: '',
    metadataSchema: DEFAULT_METADATA,
  })

  const [requirementForm, setRequirementForm] = useState({
    documentTypeId: '',
    roleId: '',
    departmentCode: '',
    employmentType: '',
    isMandatory: true,
    validityOverride: '',
    renewBeforeOverride: '',
    syncAfterCreate: true,
  })

  useEffect(() => {
    void loadAll()
  }, [])

  async function loadAll() {
    await Promise.all([loadDocumentTypes(), loadRequirements(), loadRoles()])
  }

  async function loadDocumentTypes() {
    try {
      setLoadingTypes(true)
      const response = await hrDocumentsAPI.getDocumentTypes({ include_inactive: true })
      const array = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
      const mapped: DocumentType[] = array.map((item: any) => ({
        id: String(item.id),
        code: item.code,
        name: item.name,
        description: item.description,
        requires_approval: !!item.requires_approval,
        default_validity_days: item.default_validity_days,
        default_share_expiry_hours: item.default_share_expiry_hours,
        metadata_schema: item.metadata_schema,
        category: item.category,
        sequence_no: item.sequence_no,
        folder_code: item.folder_code,
        is_active: item.is_active !== false,
        updated_at: item.updated_at,
      }))
      setDocTypes(mapped)
    } catch (error) {
      handleError(error, { title: 'Doküman tipleri yüklenemedi' })
    } finally {
      setLoadingTypes(false)
    }
  }

  async function loadRequirements() {
    try {
      setLoadingRequirements(true)
      const response = await hrDocumentsAPI.listDocumentRequirements()
      const array = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
      const mapped: DocumentRequirement[] = array.map((item: any) => ({
        id: String(item.id),
        document_type_id: String(item.document_type_id),
        document_type_name: item.document_type_name,
        document_type_code: item.document_type_code,
        role_id: item.role_id ? String(item.role_id) : null,
        role_code: item.role_code,
        role_name: item.role_name,
        department_code: item.department_code,
        employment_type: item.employment_type,
        is_mandatory: item.is_mandatory !== false,
        validity_days_override: item.validity_days_override,
        renew_before_days_override: item.renew_before_days_override,
        created_at: item.created_at,
      }))
      setRequirements(mapped)
    } catch (error) {
      handleError(error, { title: 'Zorunluluk kuralları yüklenemedi' })
    } finally {
      setLoadingRequirements(false)
    }
  }

  async function loadRoles() {
    try {
      setLoadingRoles(true)
      const response = await rolesAPI.getAll()
      const data = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
      const mapped: RoleOption[] = data.map((role: any) => ({
        id: String(role.id),
        name: role.name,
        code: role.code,
      }))
      setRoles(mapped)
    } catch (error) {
      handleError(error, { title: 'Roller alınamadı' })
    } finally {
      setLoadingRoles(false)
    }
  }

  const docTypeMap = useMemo(() => {
    const map = new Map<string, DocumentType>()
    docTypes.forEach((type) => map.set(type.id, type))
    return map
  }, [docTypes])

  function resetTypeForm() {
    setTypeForm({
      code: '',
      name: '',
      description: '',
      requiresApproval: true,
      defaultValidityDays: '',
      defaultShareExpiryHours: '72',
      category: CATEGORY_OPTIONS[0].value,
      sequenceNo: '',
      metadataSchema: DEFAULT_METADATA,
    })
  }

  function resetRequirementForm() {
    setRequirementForm({
      documentTypeId: '',
      roleId: '',
      departmentCode: '',
      employmentType: '',
      isMandatory: true,
      validityOverride: '',
      renewBeforeOverride: '',
      syncAfterCreate: true,
    })
  }

  async function handleCreateType(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!typeForm.code.trim() || !typeForm.name.trim()) {
      toast.error('Kod ve ad zorunludur')
      return
    }

    let metadata: Record<string, unknown> | undefined
    try {
      metadata = typeForm.metadataSchema.trim()
        ? JSON.parse(typeForm.metadataSchema)
        : {}
    } catch (error) {
      toast.error('Metadata JSON formatında olmalıdır')
      return
    }

    const sequenceNumber = Number(typeForm.sequenceNo)
    if (Number.isNaN(sequenceNumber) || sequenceNumber <= 0) {
      toast.error('Sıra numarası pozitif bir sayı olmalıdır')
      return
    }

    const categoryOption = CATEGORY_OPTIONS.find((option) => option.value === typeForm.category)
    if (!categoryOption) {
      toast.error('Geçersiz kategori seçimi')
      return
    }

    const folderCode = `${categoryOption.prefix}_${sequenceNumber.toString().padStart(2, '0')}`

    const payload: any = {
      code: typeForm.code.trim().toUpperCase(),
      name: typeForm.name.trim(),
      description: typeForm.description.trim() || undefined,
      requires_approval: typeForm.requiresApproval,
      default_validity_days: typeForm.defaultValidityDays ? Number(typeForm.defaultValidityDays) : undefined,
      default_share_expiry_hours: typeForm.defaultShareExpiryHours ? Number(typeForm.defaultShareExpiryHours) : undefined,
      metadata_schema: metadata || {},
      category: typeForm.category,
      sequence_no: sequenceNumber,
      folder_code: folderCode,
    }

    try {
      await hrDocumentsAPI.createDocumentType(payload)
      toast.success('Doküman tipi eklendi')
      setTypeDialogOpen(false)
      resetTypeForm()
      await loadDocumentTypes()
    } catch (error) {
      handleError(error, { title: 'Doküman tipi oluşturulamadı' })
    }
  }

  async function handleCreateRequirement(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!requirementForm.documentTypeId) {
      toast.error('Doküman tipi seçmelisiniz')
      return
    }

    const payload: any = {
      document_type_id: requirementForm.documentTypeId,
      is_mandatory: requirementForm.isMandatory,
    }

    if (requirementForm.roleId) payload.role_id = requirementForm.roleId
    if (requirementForm.departmentCode.trim()) payload.department_code = requirementForm.departmentCode.trim()
    if (requirementForm.employmentType.trim()) payload.employment_type = requirementForm.employmentType.trim()
    if (requirementForm.validityOverride.trim()) {
      payload.validity_days_override = Number(requirementForm.validityOverride)
    }
    if (requirementForm.renewBeforeOverride.trim()) {
      payload.renew_before_days_override = Number(requirementForm.renewBeforeOverride)
    }

    try {
      const res = await hrDocumentsAPI.createDocumentRequirement(payload)
      const requirementId = res?.data?.id || res?.id
      toast.success('Zorunluluk kuralı eklendi')
      setRequirementDialogOpen(false)
      resetRequirementForm()
      await loadRequirements()
      if (requirementForm.syncAfterCreate && requirementId) {
        await handleSyncRequirement(String(requirementId))
      }
    } catch (error) {
      handleError(error, { title: 'Zorunluluk kuralı oluşturulamadı' })
    }
  }

  async function handleDeleteRequirement(id: string) {
    if (!confirm('Bu zorunluluk kuralını silmek istediğinizden emin misiniz?')) return
    try {
      await hrDocumentsAPI.deleteDocumentRequirement(id)
      toast.success('Kural silindi')
      await loadRequirements()
    } catch (error) {
      handleError(error, { title: 'Kural silinemedi' })
    }
  }

  async function handleSyncRequirement(id: string) {
    try {
      const res = await hrDocumentsAPI.syncDocumentRequirement(id)
      const summary = res?.data || res
      toast.success('Senkronizasyon tamamlandı', {
        description: `İşlenen çalışan: ${summary?.processed_users ?? 0}, yeni kayıt: ${summary?.created_documents ?? 0}`,
      })
    } catch (error) {
      handleError(error, { title: 'Senkronizasyon gerçekleştirilemedi' })
    }
  }

  const requirementRows = useMemo(() => {
    return requirements.map((req) => {
      const doc = docTypeMap.get(req.document_type_id)
      return {
        ...req,
        document_type_name: doc?.name || req.document_type_name || '—',
        document_type_code: doc?.code || req.document_type_code,
        document_folder_code: doc?.folder_code,
      }
    })
  }, [requirements, docTypeMap])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Özlük Doküman Ayarları</h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Doküman tiplerini yönetin, zorunluluk kurallarını yapılandırın ve çalışanlar için otomatik eksik kayıtların oluşmasını sağlayın.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadAll()} className="gap-2" disabled={loadingTypes || loadingRequirements}>
            {loadingTypes || loadingRequirements ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Yenile
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Doküman Tipleri</CardTitle>
              <p className="text-sm text-gray-600">
                Özlük dosyalarında takip edilecek belge tiplerini tanımlayın.
              </p>
            </div>
          </div>
          <Dialog open={typeDialogOpen} onOpenChange={(open) => { setTypeDialogOpen(open); if (!open) resetTypeForm() }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Yeni Tip
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Yeni Doküman Tipi</DialogTitle>
                <DialogDescription>Zorunlu alanları doldurarak yeni bir belge tipi ekleyin.</DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleCreateType}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="doc-code">Kod</Label>
                    <Input
                      id="doc-code"
                      value={typeForm.code}
                      onChange={(e) => setTypeForm((prev) => ({ ...prev, code: e.target.value }))}
                      placeholder="Örn. HEALTH_REPORT"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="doc-name">Ad</Label>
                    <Input
                      id="doc-name"
                      value={typeForm.name}
                      onChange={(e) => setTypeForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Doküman adı"
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="doc-desc">Açıklama</Label>
                  <Textarea
                    id="doc-desc"
                    value={typeForm.description}
                    onChange={(e) => setTypeForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    placeholder="Bu belgenin ne amaçla kullanılacağını açıklayın (opsiyonel)"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="doc-category">Kategori</Label>
                    <select
                      id="doc-category"
                      className="rounded-md border border-gray-200 px-3 py-2 text-sm"
                      value={typeForm.category}
                      onChange={(event) => setTypeForm((prev) => ({ ...prev, category: event.target.value }))}
                      required
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Onay Gerektirir</p>
                      <p className="text-xs text-gray-500">Belge yüklendiğinde İK onayı bekler</p>
                    </div>
                    <Switch
                      checked={typeForm.requiresApproval}
                      onCheckedChange={(checked) => setTypeForm((prev) => ({ ...prev, requiresApproval: checked }))}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label>Geçerlilik (gün)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={typeForm.defaultValidityDays}
                        onChange={(e) => setTypeForm((prev) => ({ ...prev, defaultValidityDays: e.target.value }))}
                        placeholder="opsiyonel"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Paylaşım süresi (saat)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={typeForm.defaultShareExpiryHours}
                        onChange={(e) => setTypeForm((prev) => ({ ...prev, defaultShareExpiryHours: e.target.value }))}
                        placeholder="72"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Sıra No</Label>
                      <Input
                        type="number"
                        min={1}
                        value={typeForm.sequenceNo}
                        onChange={(event) => setTypeForm((prev) => ({ ...prev, sequenceNo: event.target.value }))}
                        placeholder="01"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  <span className="font-medium">Klasör Kodu:</span>{' '}
                  {(() => {
                    const option = CATEGORY_OPTIONS.find((opt) => opt.value === typeForm.category)
                    const seqPreview = typeForm.sequenceNo ? typeForm.sequenceNo.toString().padStart(2, '0') : '--'
                    return option ? `${option.prefix}_${seqPreview}` : '—'
                  })()}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="doc-meta">Metadata (JSON)</Label>
                  <Textarea
                    id="doc-meta"
                    rows={6}
                    value={typeForm.metadataSchema}
                    onChange={(e) => setTypeForm((prev) => ({ ...prev, metadataSchema: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500">
                    Örn. {{ '"fields"' : '["issue_date","archive_no"]' }}. Bu alanlar yükleme formunda gösterilir.
                  </p>
                </div>
                <DialogFooter>
                  <Button type="submit" className="gap-2">
                    <Plus className="h-4 w-4" /> Kaydet
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Klasör</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Ad</TableHead>
                  <TableHead>Onay</TableHead>
                  <TableHead>Geçerlilik</TableHead>
                  <TableHead>Paylaşım</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTypes && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center text-gray-500">
                      <RefreshCcw className="h-4 w-4 animate-spin inline-block mr-2" />
                      Doküman tipleri yükleniyor...
                    </TableCell>
                  </TableRow>
                )}
                {!loadingTypes && docTypes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center text-gray-500">
                      Henüz doküman tipi eklenmemiş.
                    </TableCell>
                  </TableRow>
                )}
                {docTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-mono text-sm text-gray-700">{type.folder_code || '—'}</TableCell>
                    <TableCell>{CATEGORY_LABELS[type.category] || type.category}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-900">{type.name}</span>
                        {type.description && (
                          <span className="text-xs text-gray-500">{type.description}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">{type.code}</span>
                        <span className={cn(
                          'w-fit rounded-full px-2 py-1 text-xs font-medium',
                          type.requires_approval ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        )}>
                          {type.requires_approval ? 'Onaylı' : 'Otomatik'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {type.default_validity_days ? `${type.default_validity_days} gün` : '—'}
                    </TableCell>
                    <TableCell>
                      {type.default_share_expiry_hours ? `${type.default_share_expiry_hours} saat` : '—'}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'rounded-full px-2 py-1 text-xs font-medium',
                        type.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-200 text-gray-600'
                      )}>
                        {type.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Zorunluluk Kuralları</CardTitle>
              <p className="text-sm text-gray-600">
                Belirli roller, departmanlar veya istihdam tipleri için hangi belgelerin zorunlu olduğunu tanımlayın.
              </p>
            </div>
          </div>
          <Dialog open={requirementDialogOpen} onOpenChange={(open) => { setRequirementDialogOpen(open); if (!open) resetRequirementForm() }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Yeni Kural
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Yeni Zorunluluk Kuralı</DialogTitle>
                <DialogDescription>Belge tipini ve kapsamı seçerek hangi çalışanlar için zorunlu olduğunu belirleyin.</DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleCreateRequirement}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="req-doc">Doküman Tipi</Label>
                    <select
                      id="req-doc"
                      value={requirementForm.documentTypeId}
                      onChange={(event) => setRequirementForm((prev) => ({ ...prev, documentTypeId: event.target.value }))}
                      className="rounded-md border border-gray-200 px-3 py-2 text-sm"
                      required
                    >
                      <option value="" disabled>Seçiniz</option>
                      {docTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name} ({type.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="req-role">Rol (opsiyonel)</Label>
                    <select
                      id="req-role"
                      value={requirementForm.roleId}
                      onChange={(event) => setRequirementForm((prev) => ({ ...prev, roleId: event.target.value }))}
                      className="rounded-md border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="">Tümü</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name} ({role.code})
                        </option>
                      ))}
                    </select>
                    {loadingRoles && (
                      <span className="text-xs text-gray-500">Roller yükleniyor...</span>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="req-dept">Departman Kodu</Label>
                    <Input
                      id="req-dept"
                      value={requirementForm.departmentCode}
                      onChange={(event) => setRequirementForm((prev) => ({ ...prev, departmentCode: event.target.value }))}
                      placeholder="Örn. PRODUCTION"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="req-emp-type">İstihdam Tipi</Label>
                    <Input
                      id="req-emp-type"
                      value={requirementForm.employmentType}
                      onChange={(event) => setRequirementForm((prev) => ({ ...prev, employmentType: event.target.value }))}
                      placeholder="Örn. driver, foreign, terminated"
                    />
                    <p className="text-xs text-gray-500">Özel durumlar için anahtar kelime kullanın (minör, foreign, disabled, driver vb.).</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="req-validity">Geçerlilik (override)</Label>
                    <Input
                      id="req-validity"
                      type="number"
                      min={0}
                      value={requirementForm.validityOverride}
                      onChange={(event) => setRequirementForm((prev) => ({ ...prev, validityOverride: event.target.value }))}
                      placeholder="opsiyonel"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="req-renew">Yenileme hatırlatma (gün)</Label>
                    <Input
                      id="req-renew"
                      type="number"
                      min={0}
                      value={requirementForm.renewBeforeOverride}
                      onChange={(event) => setRequirementForm((prev) => ({ ...prev, renewBeforeOverride: event.target.value }))}
                      placeholder="opsiyonel"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                  <Checkbox
                    id="req-mandatory"
                    checked={requirementForm.isMandatory}
                    onCheckedChange={(checked) => setRequirementForm((prev) => ({ ...prev, isMandatory: !!checked }))}
                  />
                  <label htmlFor="req-mandatory" className="text-sm text-gray-800">
                    Bu belge zorunlu
                  </label>
                </div>

                <div className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2">
                  <Checkbox
                    id="req-sync"
                    checked={requirementForm.syncAfterCreate}
                    onCheckedChange={(checked) => setRequirementForm((prev) => ({ ...prev, syncAfterCreate: !!checked }))}
                  />
                  <label htmlFor="req-sync" className="text-sm text-gray-700">
                    Oluşturduktan sonra hemen eksik kayıtları senkronize et
                  </label>
                </div>

                <DialogFooter>
                  <Button type="submit" className="gap-2">
                    <Plus className="h-4 w-4" /> Kaydet
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doküman</TableHead>
                  <TableHead>Kapsam</TableHead>
                  <TableHead>Zorunlu</TableHead>
                  <TableHead>Geçerlilik</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRequirements && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-gray-500">
                      <RefreshCcw className="h-4 w-4 animate-spin inline-block mr-2" />
                      Kurallar yükleniyor...
                    </TableCell>
                  </TableRow>
                )}
                {!loadingRequirements && requirementRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-gray-500">
                      Henüz tanımlanmış bir kural bulunmuyor.
                    </TableCell>
                  </TableRow>
                )}
                {requirementRows.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        {req.document_folder_code && (
                          <span className="text-xs font-mono text-gray-500">{req.document_folder_code}</span>
                        )}
                        <span className="text-sm font-semibold text-gray-900">{req.document_type_name}</span>
                        <span className="text-xs uppercase text-gray-500">{req.document_type_code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-gray-700 space-y-1">
                        {req.role_name && (
                          <div>
                            <span className="font-medium">Rol:</span> {req.role_name} ({req.role_code})
                          </div>
                        )}
                        {req.department_code && (
                          <div>
                            <span className="font-medium">Departman:</span> {req.department_code}
                          </div>
                        )}
                        {req.employment_type && (
                          <div>
                            <span className="font-medium">İstihdam:</span> {req.employment_type}
                          </div>
                        )}
                        {!req.role_name && !req.department_code && !req.employment_type && (
                          <div className="text-gray-500">Tüm çalışanlar için</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'rounded-full px-2 py-1 text-xs font-medium',
                        req.is_mandatory ? 'bg-rose-100 text-rose-700' : 'bg-gray-200 text-gray-600'
                      )}>
                        {req.is_mandatory ? 'Zorunlu' : 'Opsiyonel'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-gray-600">
                        {req.validity_days_override ? `${req.validity_days_override} gün` : '—'}
                        {req.renew_before_days_override ? (
                          <div>Yeniden hatırlatma: {req.renew_before_days_override} gün</div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => void handleSyncRequirement(req.id)}
                        >
                          <Sparkles className="h-4 w-4" /> Senkronize
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-rose-200 text-rose-600 hover:bg-rose-50"
                          onClick={() => void handleDeleteRequirement(req.id)}
                        >
                          <Trash2 className="h-4 w-4" /> Sil
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
