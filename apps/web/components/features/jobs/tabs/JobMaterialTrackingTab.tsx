'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Loader2,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils/cn'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface MaterialTracking {
  stock_id: string
  product_code: string
  product_name: string
  unit: string
  planned_quantity: number
  used_quantity: number
  remaining_quantity: number
  reserved_quantity: number
  reserved_used_quantity: number
  unused_reservation: number
  stock_current_quantity: number
  usage_percentage: number
  status: 'not_started' | 'in_progress' | 'completed' | 'exceeded' | 'unplanned'
}

interface JobMaterialTrackingTabProps {
  jobId: string
}

export function JobMaterialTrackingTab({ jobId }: JobMaterialTrackingTabProps) {
  const [job, setJob] = useState<any>(null)
  const [materials, setMaterials] = useState<MaterialTracking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!jobId) return
    void loadData()
  }, [jobId])

  const loadData = async () => {
    if (!jobId) return
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const [jobRes, materialsRes] = await Promise.all([
        fetch(`${API_URL}/api/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/jobs/${jobId}/material-tracking`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (jobRes.ok) {
        const jobData = await jobRes.json()
        setJob(jobData.data)
      }

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json()
        setMaterials(materialsData.data || [])
      } else {
        toast.error('Malzeme takibi yüklenemedi')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: {
        icon: CheckCircle,
        text: 'Tamamlandı',
        color: 'bg-green-50 text-green-700 border-green-200',
      },
      in_progress: {
        icon: Clock,
        text: 'Devam Ediyor',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
      },
      exceeded: {
        icon: AlertTriangle,
        text: 'Fazla',
        color: 'bg-red-50 text-red-700 border-red-200',
      },
      unplanned: {
        icon: HelpCircle,
        text: 'Plansız',
        color: 'bg-orange-50 text-orange-700 border-orange-200',
      },
      not_started: {
        icon: Package,
        text: 'Bekliyor',
        color: 'bg-gray-50 text-gray-600 border-gray-200',
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig]
    if (!config) return null

    const Icon = config.icon

    return (
      <Badge className={cn('text-xs px-2 py-1 border', config.color)}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    )
  }

  const getProgressBarColor = (percentage: number, isExceeded: boolean = false) => {
    if (isExceeded) return 'bg-red-500'
    if (percentage === 0) return 'bg-gray-300'
    if (percentage < 50) return 'bg-yellow-500'
    if (percentage < 100) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      const matchesSearch =
        material.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.product_code.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesSearch
    })
  }, [materials, searchTerm])



  return (
    <div className="space-y-6">




      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Malzeme Kullanım Durumu</CardTitle>
            <p className="text-sm text-gray-500">
              Planlanan ve kullanılan malzemelerin durumlarını karşılaştırın.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Malzeme ara..."
                className="pl-10"
              />
            </div>

          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <TrendingUp className="h-8 w-8 text-gray-400" />
              <p>Filtrelerle eşleşen kayıt bulunamadı.</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Malzeme</TableHead>
                    <TableHead>Ürün Kodu</TableHead>
                    <TableHead className="text-center">Planlanan</TableHead>
                    <TableHead className="text-center">Kullanılan</TableHead>
                    <TableHead className="text-center">Fark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMaterials.map((material, index) => {
                    const usagePercentage = Math.min(material.usage_percentage ?? 0, 100)
                    const progressBarColor = getProgressBarColor(
                      material.usage_percentage ?? 0,
                      material.status === 'exceeded',
                    )

                    return (
                      <TableRow key={`${material.stock_id}-${index}`}>
                        <TableCell className="text-sm font-medium text-gray-900">
                          {material.product_name}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {material.product_code}
                        </TableCell>
                        <TableCell className="text-center text-sm text-gray-700">
                          {material.planned_quantity} {material.unit}
                        </TableCell>
                        <TableCell className="text-center text-sm text-gray-700">
                          {material.used_quantity} {material.unit}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-center text-sm font-medium',
                            material.planned_quantity - material.used_quantity < 0
                              ? 'text-red-600'
                              : 'text-green-600',
                          )}
                        >
                          {material.planned_quantity - material.used_quantity} {material.unit}
                        </TableCell>

                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
