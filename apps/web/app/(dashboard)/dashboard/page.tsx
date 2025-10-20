'use client'

import { useEffect, useState } from 'react'
import { dashboardAPI, tasksAPI } from '@/lib/api/client'
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
  Activity,
  Target,
  Zap,
  Award
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
  const [performance, setPerformance] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<number>(30) // 7, 30, 90

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadPerformance()
  }, [period])

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

  async function loadPerformance() {
    if (user?.role !== 'operator') return

    try {
      const response = await tasksAPI.getPerformance(period)
      setPerformance(response.data)
    } catch (error) {
      console.error('Performance load error:', error)
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
        <>
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

          {/* Performans Kartları */}
          {performance && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Performansım</h2>
                <div className="flex gap-2">
                  {[7, 30, 90].map((days) => (
                    <button
                      key={days}
                      onClick={() => setPeriod(days)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        period === days
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {days === 7 ? '7 Gün' : days === 30 ? '30 Gün' : '90 Gün'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Tamamlanan Görev
                    </CardTitle>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performance.total_completed}</div>
                    <p className="text-xs text-gray-500 mt-1">Son {period} gün</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Toplam Süre
                    </CardTitle>
                    <Clock className="w-4 h-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performance.total_hours}sa</div>
                    <p className="text-xs text-gray-500 mt-1">Çalışma saati</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Ortalama Süre
                    </CardTitle>
                    <Target className="w-4 h-4 text-purple-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{performance.avg_duration_minutes}dk</div>
                    <p className="text-xs text-gray-500 mt-1">Görev başına</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      Başarı Oranı
                    </CardTitle>
                    <Award className="w-4 h-4 text-orange-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {performance.success_rate !== null ? `${performance.success_rate}%` : 'N/A'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Hedefte tamamlanan</p>
                  </CardContent>
                </Card>
              </div>

              {/* Detaylı Performans Bilgileri */}
              <div className="grid gap-6 md:grid-cols-3 mt-6">
                {performance.fastest_task && (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        En Hızlı Görev
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium text-green-900">
                        {performance.fastest_task.process_name}
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        {performance.fastest_task.job_number}
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        <strong>{performance.fastest_task.duration_hours}sa</strong> sürede tamamlandı
                      </p>
                    </CardContent>
                  </Card>
                )}

                {performance.slowest_task && (
                  <Card className="bg-orange-50 border-orange-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-orange-900 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        En Uzun Görev
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm font-medium text-orange-900">
                        {performance.slowest_task.process_name}
                      </p>
                      <p className="text-xs text-orange-700 mt-1">
                        {performance.slowest_task.job_number}
                      </p>
                      <p className="text-xs text-orange-600 mt-2">
                        <strong>{performance.slowest_task.duration_hours}sa</strong> sürdü
                      </p>
                    </CardContent>
                  </Card>
                )}

                {performance.speed_trend_percentage !== null && (
                  <Card className={performance.speed_trend_percentage > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}>
                    <CardHeader className="pb-3">
                      <CardTitle className={`text-sm font-medium flex items-center gap-2 ${
                        performance.speed_trend_percentage > 0 ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        <TrendingUp className="w-4 h-4" />
                        Hız Trendi
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className={`text-2xl font-bold ${
                        performance.speed_trend_percentage > 0 ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {performance.speed_trend_percentage > 0 ? '+' : ''}
                        {performance.speed_trend_percentage}%
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {performance.speed_trend_percentage > 0
                          ? 'Önceki döneme göre daha hızlı'
                          : 'Önceki döneme göre daha yavaş'}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </>
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
