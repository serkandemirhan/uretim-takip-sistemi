'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Clock, AlertCircle, Pause, XCircle } from 'lucide-react'

interface JobsStatsCardsProps {
  stats: {
    active: number
    at_risk: number
    delayed: number
    on_hold: number
    completed: number
  }
}

export function JobsStatsCards({ stats }: JobsStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Active Jobs */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-green-900">
            Aktif
          </CardTitle>
          <CheckCircle className="w-5 h-5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-900">{stats.active}</div>
          <p className="text-xs text-green-700 mt-1">Zamanında ilerliyor</p>
        </CardContent>
      </Card>

      {/* At Risk */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-yellow-900">
            Riskli
          </CardTitle>
          <Clock className="w-5 h-5 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-900">{stats.at_risk}</div>
          <p className="text-xs text-yellow-700 mt-1">Dikkat gerekiyor</p>
        </CardContent>
      </Card>

      {/* Delayed */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-red-900">
            Geciken
          </CardTitle>
          <AlertCircle className="w-5 h-5 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-900">{stats.delayed}</div>
          <p className="text-xs text-red-700 mt-1">Acil müdahale</p>
        </CardContent>
      </Card>

      {/* On Hold */}
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-900">
            Beklemede
          </CardTitle>
          <Pause className="w-5 h-5 text-gray-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-gray-900">{stats.on_hold}</div>
          <p className="text-xs text-gray-700 mt-1">Askıya alınmış</p>
        </CardContent>
      </Card>

      {/* Completed */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-blue-900">
            Tamamlanan
          </CardTitle>
          <XCircle className="w-5 h-5 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-900">{stats.completed}</div>
          <p className="text-xs text-blue-700 mt-1">Bu ay</p>
        </CardContent>
      </Card>
    </div>
  )
}
