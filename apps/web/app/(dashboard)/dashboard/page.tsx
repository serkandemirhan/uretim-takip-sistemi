'use client'

import { useEffect, useState } from 'react'
import { dashboardAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Briefcase, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp,
  Users,
  Cpu,
  Activity
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/useAuth'
import { getStatusLabel, getStatusColor, formatDate } from '@/lib/utils/formatters'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [statsRes, jobsRes, activityRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getRecentJobs(5),
        dashboardAPI.getActivity(8),
      ])

      setStats(statsRes.data)
      setRecentJobs(jobsRes.data || [])
      setActivity(activityRes.data || [])
    } catch (error) {
      console.error('Dashboard load error:', error)
      toast.error('Dashboard yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const isOperator = user?.role === 'operator'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Hoş geldin, {user?.full_name}!</p>
      </div>

      {/* Stats Cards - Operatör */}
      {isOperator && stats?.my_tasks && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Bekleyen Görevler
              </CardTitle>
              <AlertCircle className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.my_tasks.ready}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Devam Eden
              </CardTitle>
              <Clock className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.my_tasks.in_progress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Tamamlanan
              </CardTitle>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.my_tasks.completed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Toplam Görev
              </CardTitle>
              <Briefcase className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.my_tasks.total}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Cards - Yönetici */}
      {!isOperator && stats?.jobs && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Aktif İşler
                </CardTitle>
                <Briefcase className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.jobs.active}</div>
                <p className="text-xs text-gray-500 mt-1">
                  +{stats.jobs.in_progress} devam ediyor
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Tamamlanan
                </CardTitle>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.jobs.completed}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Toplam {stats.jobs.total} iş
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Geciken
                </CardTitle>
                <AlertCircle className="w-4 h-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.jobs.overdue}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Teslim tarihi geçmiş
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Taslak
                </CardTitle>
                <Clock className="w-4 h-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.jobs.draft}</div>
                <p className="text-xs text-gray-500 mt-1">
                  Aktif edilmeyi bekliyor
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Makineler
                </CardTitle>
                <Cpu className="w-4 h-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.machines?.total || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.machines?.busy || 0} çalışıyor
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Kullanıcılar
                </CardTitle>
                <Users className="w-4 h-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.users?.total || 0}</div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.users?.operators || 0} operatör
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Performans
                </CardTitle>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.jobs.total > 0 
                    ? Math.round((stats.jobs.completed / stats.jobs.total) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Tamamlanma oranı
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Recent Jobs & Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Jobs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Son İşler</CardTitle>
              <Link 
                href={isOperator ? '/tasks' : '/jobs'}
                className="text-sm text-blue-600 hover:underline"
              >
                Tümünü Gör →
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz iş bulunmuyor</p>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`}>
                    <div className="p-3 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">
                            {job.title}
                          </h4>
                          <p className="text-xs text-gray-500 font-mono">
                            {job.job_number}
                          </p>
                        </div>
                        <Badge className={getStatusColor(job.status)}>
                          {getStatusLabel(job.status)}
                        </Badge>
                      </div>
                      
                      {job.customer_name && (
                        <p className="text-xs text-gray-600 mb-2">
                          🏢 {job.customer_name}
                        </p>
                      )}
                      
                      {job.total_steps > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>İlerleme</span>
                            <span>{job.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Son Aktiviteler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Henüz aktivite yok</p>
            ) : (
              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-gray-700">
                        <span className="font-medium">{item.user_name || 'Sistem'}</span>
                        {' '}
                        {item.action === 'revision_created' && 'revizyon oluşturdu'}
                        {item.action === 'job_created' && 'iş oluşturdu'}
                        {item.action === 'job_activated' && 'işi aktif etti'}
                        {item.action === 'step_completed' && 'süreci tamamladı'}
                        {item.job_number && ` - ${item.job_number}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(item.created_at).toLocaleString('tr-TR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}