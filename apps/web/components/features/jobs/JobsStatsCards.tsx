'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, AlertCircle, Pause, CheckCircle2 } from 'lucide-react'

interface JobsStatsCardsProps {
  stats: {
    active: number
    at_risk: number
    delayed: number
    on_hold: number
    completed: number
  }
  onFilterChange?: (status: string) => void
}

export function JobsStatsCards({ stats, onFilterChange }: JobsStatsCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full">
      {/* Active Jobs */}
      <Card
        className="border-blue-200 bg-blue-50 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onFilterChange?.('active')}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-blue-900">
            Aktif
          </CardTitle>
          <CheckCircle className="w-5 h-5 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-900">{stats.active}</div>
          <p className="text-xs text-blue-700 mt-1">Devam eden işler</p>
        </CardContent>
      </Card>

      {/* Delayed */}
      <Card
        className="border-red-200 bg-red-50 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onFilterChange?.('delayed')}
      >
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
      <Card
        className="border-gray-200 bg-gray-50 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onFilterChange?.('on_hold')}
      >
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
      <Card
        className="border-green-200 bg-green-50 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onFilterChange?.('completed')}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-green-900">
            Tamamlanan
          </CardTitle>
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-900">{stats.completed}</div>
          <p className="text-xs text-green-700 mt-1">Bu ay</p>
        </CardContent>
      </Card>
    </div>
  )
}
