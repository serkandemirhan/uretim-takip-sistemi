'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { usersAPI, hrDocumentsAPI, filesAPI } from '@/lib/api/client'
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
  ArrowLeft,
  RefreshCcw,
  Loader2,
  ShieldCheck,
  FileText,
  Mail,
  Star,
} from 'lucide-react'

const STATUS_LABELS: Record<string, string> = {
  missing: 'Eksik',
  pending_approval: 'Onay bekliyor',
  active: 'Geçerli',
  expired: 'Süresi doldu',
  rejected: 'Reddedildi',
  archived: 'Arşiv',
}

const STATUS_STYLES: Record<string, string> = {
  missing: 'bg-red-100 text-red-700',
  pending_approval: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-rose-100 text-rose-700',
  rejected: 'bg-gray-200 text-gray-600',
  archived: 'bg-slate-200 text-slate-600',
}

const HR_MANAGERIAL_ROLES = new Set(['hr_admin', 'hr_manager', 'hr_specialist'])

const CATEGORY_OPTIONS = [
  { value: '', label: 'Tüm Kategoriler' },
  { value: 'ONBOARDING', label: 'Onboarding' },
  { value: 'OPERATIONS', label: 'Operasyon & Uyum' },
  { value: 'HR_LIFECYCLE', label: 'HR Süreçleri' },
  { value: 'OFFBOARDING', label: 'Offboarding' },
]

type RoleInfo = {
  role_id: string
  role_code: string
  role_name: string
  is_primary: boolean
}

type UserDetail = {
  id: string
  full_name: string
  username: string
  email: string
  role?: string | null
  roles: RoleInfo[]
  avatar_url?: string | null
  avatar_file_id?: string | null
  stats?: {
    in_progress: number
    completed: number
    ready: number
  }
}

type EmployeeDocument = {
  id: string
  document_type_id: string
  document_type_code: string
  document_type_name: string
  document_folder_code?: string | null
  status: string
  valid_from?: string | null
  valid_until?: string | null
  requires_approval: boolean
}

type DocumentFetchResponse = {
  id: string
  document_type_id: string
  document_type_code: string
  document_type_name: string
  folder_code?: string | null
  status: string
  valid_from?: string | null
  valid_until?: string | null
  requires_approval?: boolean
}

export default function UserDetailPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params?.id as string
  const { user: currentUser } = useAuth()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [documents, setDocuments] = useState<EmployeeDocument[]>([])
  const [loadingUser, setLoadingUser] = useState(true)
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'hr'>('overview')
  const [categoryFilter, setCategoryFilter] = useState('')

  useEffect(() => {
    if (userId) void loadUser()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (userId) void loadDocuments()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, categoryFilter])

  async function loadUser() {
    try {
      setLoadingUser(true)
      const response = await usersAPI.getById(userId)
      const data = response?.data ?? response
      const detail: UserDetail = {
        id: String(data?.id || data?.data?.id || userId),
        full_name: data?.full_name || data?.data?.full_name || '—',
        username: data?.username || data?.data?.username || '—',
        email: data?.email || data?.data?.email || '—',
        role: data?.role || data?.data?.role,
        roles: Array.isArray(data?.roles) ? data.roles : Array.isArray(data?.data?.roles) ? data.data.roles : [],
        avatar_url: data?.avatar_url || data?.data?.avatar_url,
        avatar_file_id: data?.avatar_file_id || data?.data?.avatar_file_id,
        stats: data?.stats || data?.data?.stats,
      }
      setUser(detail)

      const fileId = detail.avatar_file_id
      if (fileId) {
        try {
          const downloadRes = await filesAPI.getDownloadUrl(fileId)
          setAvatarUrl(downloadRes?.data?.download_url || downloadRes?.download_url || null)
        } catch (error) {
          handleError(error, { title: 'Profil görseli alınamadı', showToast: false })
        }
      } else {
        setAvatarUrl(detail.avatar_url || null)
      }
    } catch (error) {
      handleError(error, { title: 'Kullanıcı bilgisi yüklenemedi' })
    } finally {
      setLoadingUser(false)
    }
  }

  async function loadDocuments() {
    try {
      setLoadingDocs(true)
      const response = await hrDocumentsAPI.listEmployeeDocuments({ user_id: userId, category: categoryFilter || undefined })
      const raw = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
      const mapped: EmployeeDocument[] = raw.map((item: DocumentFetchResponse) => ({
        id: String(item.id),
        document_type_id: String(item.document_type_id),
        document_type_code: item.document_type_code,
        document_type_name: item.document_type_name,
        document_folder_code: (item as any).folder_code,
        status: item.status,
        valid_from: item.valid_from,
        valid_until: item.valid_until,
        requires_approval: item.requires_approval ?? false,
      }))
      setDocuments(mapped)
    } catch (error) {
      handleError(error, { title: 'Doküman listesi alınamadı' })
    } finally {
      setLoadingDocs(false)
    }
  }

  const summary = useMemo(() => {
    const total = documents.length
    const pending = documents.filter((doc) => doc.status === 'pending_approval').length
    const missing = documents.filter((doc) => doc.status === 'missing').length
    const expired = documents.filter((doc) => doc.status === 'expired').length
    const active = documents.filter((doc) => doc.status === 'active').length
    return { total, pending, missing, expired, active }
  }, [documents])

  const missingDocuments = useMemo(() => {
    return documents.filter((doc) => doc.status === 'missing' || doc.status === 'expired')
  }, [documents])

  const canManageHr = currentUser ? HR_MANAGERIAL_ROLES.has(currentUser.role) : false

  function renderStatusBadge(status: string) {
    const label = STATUS_LABELS[status] || status
    const style = STATUS_STYLES[status] || 'bg-gray-200 text-gray-700'
    return <Badge className={`capitalize ${style}`}>{label}</Badge>
  }

  const activeUserRole = useMemo(() => {
    if (!user) return undefined
    const primary = user.roles?.find((role) => role.is_primary)
    return primary?.role_name || primary?.role_code || user.role
  }, [user])

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-4 text-center py-16">
        <p className="text-lg text-gray-600">Kullanıcı bulunamadı.</p>
        <Button onClick={() => router.push('/users')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Kullanıcı listesine dön
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-gray-100 ring-2 ring-blue-100">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={user.full_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-gray-500">
                {user.full_name?.[0] || '?'}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user.full_name}</h1>
            <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-4 w-4" /> {user.email}
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" /> {activeUserRole || 'Rol atanmamış'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => void loadUser()}>
            <RefreshCcw className="h-4 w-4" /> Yenile
          </Button>
          <Link href="/users">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Listeye dön
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Genel Bilgiler</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-gray-500">Kullanıcı Adı</p>
            <code className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-700">{user.username}</code>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Roller</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {user.roles?.length ? (
                user.roles.map((role) => (
                  <Badge
                    key={role.role_id}
                    className={`gap-1 ${role.is_primary ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {role.is_primary && <Star className="h-3 w-3" />}
                    {role.role_name || role.role_code}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-gray-500">Rol atanmamış</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Devam Eden Görevler</p>
            <p className="text-sm font-medium text-gray-900">{user.stats?.in_progress ?? 0}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-gray-500">Tamamlanan Görevler</p>
            <p className="text-sm font-medium text-gray-900">{user.stats?.completed ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            type="button"
            className={`border-b-2 px-1 pb-2 text-sm font-medium ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('overview')}
          >
            Genel Bakış
          </button>
          <button
            type="button"
            className={`border-b-2 px-1 pb-2 text-sm font-medium ${activeTab === 'hr' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('hr')}
          >
            Özlük Dokümanları
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <Card>
          <CardHeader>
            <CardTitle>Notlar</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Kullanıcı kartına özel içgörüler daha sonra burada gösterilebilir.
          </CardContent>
        </Card>
      )}

      {activeTab === 'hr' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-lg">Özlük Doküman Özeti</CardTitle>
                <p className="text-sm text-gray-600">
                  Bu çalışana atanmış tüm özlük belgelerinin güncel durumunu inceleyin.
                </p>
              </div>
              <div className="flex gap-2">
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {canManageHr && (
                  <Link href="/hr/documents">
                    <Button variant="outline" className="gap-2">
                      <ShieldCheck className="h-4 w-4" /> HR modülünde aç
                    </Button>
                  </Link>
                )}
                <Button variant="outline" className="gap-2" onClick={() => void loadDocuments()} disabled={loadingDocs}>
                  {loadingDocs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                  Yenile
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryCard title="Toplam" value={summary.total} />
              <SummaryCard title="Geçerli" value={summary.active} tone="success" />
              <SummaryCard title="Onay bekleyen" value={summary.pending} tone="warning" />
              <SummaryCard title="Eksik" value={summary.missing} tone="danger" />
              <SummaryCard title="Süresi dolmuş" value={summary.expired} tone="danger" />
            </CardContent>
          </Card>

          {missingDocuments.length > 0 && (
            <Card className="border-red-200 bg-red-50/30">
              <CardHeader>
                <CardTitle className="text-base text-red-700">Dikkat Gerektiren Belgeler</CardTitle>
                <p className="text-sm text-red-600">
                  Aşağıdaki belgeler eksik veya süresi dolmuş. Çalışanla iletişime geçerek güncelleyin.
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {missingDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-md border border-red-200 bg-white px-3 py-2 text-sm">
                    <div>
                      {doc.document_folder_code && (
                        <p className="font-mono text-xs text-gray-500">{doc.document_folder_code}</p>
                      )}
                      <p className="font-medium text-gray-900">{doc.document_type_name}</p>
                      <p className="text-xs text-gray-500 uppercase">{doc.document_type_code}</p>
                    </div>
                    {renderStatusBadge(doc.status)}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tüm Dokümanlar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingDocs ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Dokümanlar yükleniyor...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Doküman</TableHead>
                        <TableHead>Statü</TableHead>
                        <TableHead>Geçerlilik</TableHead>
                        <TableHead className="w-32">Aksiyon</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-6 text-center text-gray-500">
                            Bu çalışana atanmış doküman bulunmuyor.
                          </TableCell>
                        </TableRow>
                      ) : (
                        documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            {doc.document_folder_code && (
                              <span className="text-xs font-mono text-gray-500">{doc.document_folder_code}</span>
                            )}
                            <span className="text-sm font-semibold text-gray-900">{doc.document_type_name}</span>
                            <span className="text-xs uppercase text-gray-500">{doc.document_type_code}</span>
                          </div>
                        </TableCell>
                            <TableCell>{renderStatusBadge(doc.status)}</TableCell>
                            <TableCell>
                              <div className="text-xs text-gray-600">
                                {doc.valid_from ? new Date(doc.valid_from).toLocaleDateString('tr-TR') : '—'}
                                {doc.valid_until ? ` → ${new Date(doc.valid_until).toLocaleDateString('tr-TR')}` : ''}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Link href="/hr/documents">
                                <Button size="sm" variant="outline" className="gap-2">
                                  <FileText className="h-4 w-4" /> Yönet
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ title, value, tone }: { title: string; value: number; tone?: 'success' | 'warning' | 'danger' }) {
  const palette = tone === 'success'
    ? 'bg-emerald-50 text-emerald-700'
    : tone === 'warning'
      ? 'bg-amber-50 text-amber-700'
      : tone === 'danger'
        ? 'bg-rose-50 text-rose-700'
        : 'bg-gray-50 text-gray-700'

  return (
    <div className={`rounded-lg border border-gray-200 px-4 py-3 ${palette}`}>
      <p className="text-xs uppercase tracking-wide">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
