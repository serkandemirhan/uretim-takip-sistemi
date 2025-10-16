'use client'

import { useEffect, useState } from 'react'
import { machinesAPI } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Cpu, CheckCircle, AlertCircle, Wrench, Clock, User, Briefcase } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/utils/error-handler'

export default function MachineStatusPage() {
  const [machines, setMachines] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    // Auto refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    try {
      const [machinesRes, statsRes] = await Promise.all([
        machinesAPI.getStatus(),
        machinesAPI.getStats(),
      ])
      setMachines(machinesRes.data || [])
      setStats(statsRes.data || {})
    } catch (error) {
      handleApiError(error, 'Load')
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'maintenance':
        return <Wrench className="w-5 h-5 text-orange-600" />
      case 'inactive':
        return <AlertCircle className="w-5 h-5 text-gray-400" />
      default:
        return <Cpu className="w-5 h-5 text-gray-400" />
    }
  }

  function getStatusBadge(status: string, isBusy: boolean) {
    if (isBusy) {
      return <Badge className="bg-yellow-100 text-yellow-700">🔴 Çalışıyor</Badge>
    }
    
    const badges = {
      active: { label: 'Uygun', class: 'bg-green-100 text-green-700' },
      maintenance: { label: 'Bakımda', class: 'bg-orange-100 text-orange-700' },
      inactive: { label: 'Pasif', class: 'bg-gray-100 text-gray-700' },
    }
    const badge = badges[status as keyof typeof badges] || badges.active
    return <Badge className={badge.class}>{badge.label}</Badge>
  }

  function formatDuration(startedAt: string) {
    const start = new Date(startedAt)
    const now = new Date()
    const diffMs = now.getTime() - start.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffHours > 0) {
      return `${diffHours} saat ${diffMins % 60} dk`
    }
    return `${diffMins} dk`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Makine Durumu</h1>
        <p className="text-gray-600 mt-1">
          Makinelerin anlık durumu ve kullanım bilgileri
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Toplam
              </CardTitle>
              <Cpu className="w-4 h-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Çalışıyor
              </CardTitle>
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.busy}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Uygun
              </CardTitle>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Bakımda
              </CardTitle>
              <Wrench className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.maintenance}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Kullanım Oranı
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.busy / stats.total) * 100) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Machines Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {machines.map((machine) => (
          <Card key={machine.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(machine.status)}
                  <div>
                    <CardTitle className="text-lg">{machine.name}</CardTitle>
                    <code className="text-xs text-gray-500">{machine.code}</code>
                  </div>
                </div>
                {getStatusBadge(machine.status, machine.is_busy)}
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Location */}
              {machine.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  📍 {machine.location}
                </div>
              )}

              {/* Capacity */}
              {machine.capacity_per_hour && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  ⚡ {machine.capacity_per_hour} birim/saat
                </div>
              )}

              {/* Completed Tasks */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                ✅ {machine.completed_tasks_count} görev tamamlandı
              </div>

              {/* Current Task */}
              {machine.current_task && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs font-semibold text-yellow-800">
                      ŞU AN ÇALIŞIYOR
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Link 
                      href={`/jobs/${machine.current_task.job_id}`}
                      className="block hover:underline"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4 text-gray-600" />
                        <span className="font-medium text-gray-900">
                          {machine.current_task.job_title}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 ml-6">
                        {machine.current_task.job_number}
                      </div>
                    </Link>

                    {machine.current_task.process_name && (
                      <div className="text-xs text-gray-700 ml-6">
                        🔧 {machine.current_task.process_name}
                      </div>
                    )}

                    {machine.current_task.operator_name && (
                      <div className="flex items-center gap-2 text-xs text-gray-700 ml-6">
                        <User className="w-3 h-3" />
                        {machine.current_task.operator_name}
                      </div>
                    )}

                    {machine.current_task.started_at && (
                      <div className="flex items-center gap-2 text-xs text-gray-700 ml-6">
                        <Clock className="w-3 h-3" />
                        {formatDuration(machine.current_task.started_at)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {machine.notes && !machine.is_busy && (
                <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                  💬 {machine.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {machines.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Cpu className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Henüz makine bulunmuyor</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
