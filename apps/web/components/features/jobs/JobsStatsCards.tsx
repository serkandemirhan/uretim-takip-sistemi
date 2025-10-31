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
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full">
      {/* Active Jobs */}
      <Card
        className="border-blue-200 bg-blue-50 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onFilterChange?.('active')}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
          <CardTitle className="text-xs font-medium text-blue-900">
            Aktif
          </CardTitle>
          <CheckCircle className="w-4 h-4 text-blue-600" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl font-bold text-blue-900">{stats.active}</div>
          <p className="text-[10px] text-blue-700 mt-0.5">Devam eden işler</p>
        </CardContent>
      </Card>

      {/* At Risk */}
      <Card
        className="border-red-200 bg-red-50 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onFilterChange?.('at_risk')}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
          <CardTitle className="text-xs font-medium text-red-900">
            Riskli
          </CardTitle>
          <AlertCircle className="w-4 h-4 text-red-600" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl font-bold text-red-900">{stats.at_risk}</div>
          <p className="text-[10px] text-red-700 mt-0.5">Yakın takip gereken işler</p>
        </CardContent>
      </Card>

      {/* On Hold */}
      <Card
        className="border-gray-200 bg-gray-50 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onFilterChange?.('on_hold')}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
          <CardTitle className="text-xs font-medium text-gray-900">
            Beklemede
          </CardTitle>
          <Pause className="w-4 h-4 text-gray-600" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl font-bold text-gray-900">{stats.on_hold}</div>
          <p className="text-[10px] text-gray-700 mt-0.5">Askıya alınmış</p>
        </CardContent>
      </Card>

      {/* Completed */}
      <Card
        className="border-green-200 bg-green-50 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onFilterChange?.('completed')}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3">
          <CardTitle className="text-xs font-medium text-green-900">
            Tamamlanan
          </CardTitle>
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        </CardHeader>
        <CardContent className="pb-3">
          <div className="text-2xl font-bold text-green-900">{stats.completed}</div>
          <p className="text-[10px] text-green-700 mt-0.5">Bu ay</p>
        </CardContent>
      </Card>
    </div>
  )
}
