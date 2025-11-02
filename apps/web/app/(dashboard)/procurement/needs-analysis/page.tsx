'use client'

import { useEffect, useState, useMemo, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Package,
  AlertTriangle,
  TrendingDown,
  ShoppingCart,
  Filter,
  Search,
  CheckSquare,
  FileText,
  List,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface MaterialNeed {
  stock_id: string
  product_code: string
  product_name: string
  category: string
  unit: string

  // Project data
  total_planned: number
  total_used: number
  total_reserved: number
  total_remaining_need: number
  jobs_count: number
  job_numbers: string[]

  // Stock data
  current_quantity: number
  reserved_quantity: number
  available_quantity: number
  on_order_quantity: number
  min_stock_level: number
  reorder_point: number

  // Analysis
  project_shortage: number
  below_minimum: number
  needs_reorder: boolean
  suggested_order_quantity: number
  issue_type: 'project' | 'stock_level' | 'both'
}

interface Summary {
  total_items: number
  project_shortage_items: number
  critical_stock_items: number
  total_shortage_value: number
}

export default function PurchasingNeedsAnalysisPage() {
  const [materials, setMaterials] = useState<MaterialNeed[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [filterType, setFilterType] = useState<'all' | 'project_shortage' | 'critical_stock'>('all')
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set())
  const [summary, setSummary] = useState<Summary | null>(null)

  useEffect(() => {
    loadNeeds()
  }, [filterType])

  const loadNeeds = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/procurement/needs-analysis?filter=${filterType}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Veriler yüklenemedi')

      const data = await res.json()
      setMaterials(data.data || [])
      setSummary(data.summary)
      setSelectedMaterials(new Set()) // Clear selection when filter changes
    } catch (error: any) {
      toast.error(error.message || 'Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // Filter materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((material) => {
      const matchesSearch =
        material.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.product_code.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = selectedCategory === 'all' || material.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [materials, searchTerm, selectedCategory])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(materials.map((m) => m.category).filter(Boolean))
    return Array.from(cats).sort()
  }, [materials])

  const toggleMaterialSelection = (stockId: string) => {
    const newSelection = new Set(selectedMaterials)
    if (newSelection.has(stockId)) {
      newSelection.delete(stockId)
    } else {
      newSelection.add(stockId)
    }
    setSelectedMaterials(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedMaterials.size === filteredMaterials.length) {
      setSelectedMaterials(new Set())
    } else {
      setSelectedMaterials(new Set(filteredMaterials.map((m) => m.stock_id)))
    }
  }

  const router = useRouter()

  const handleCreateRFQ = () => {
    if (selectedMaterials.size === 0) {
      toast.error('Lütfen en az bir malzeme seçin')
      return
    }

    // Navigate to RFQ creation page with selected materials
    const materialIds = Array.from(selectedMaterials).join(',')
    router.push(`/procurement/rfq/new?materials=${materialIds}`)
  }

  const getIssueTypeBadge = (issueType: string) => {
    // Neutral, icon-led badges. Only critical uses warning color.
    switch (issueType) {
      case 'both':
        return (
          <Badge variant="outline" className="text-xs text-gray-700">
            <AlertTriangle className="w-3 h-3 mr-1 text-red-600" />
            Kritik Eksik
          </Badge>
        )
      case 'project':
        return (
          <Badge variant="outline" className="text-xs text-gray-700">
            <FileText className="w-3 h-3 mr-1 text-gray-500" />
            Proje Eksik
          </Badge>
        )
      case 'stock_level':
        return (
          <Badge variant="outline" className="text-xs text-gray-700">
            <AlertTriangle className="w-3 h-3 mr-1 text-orange-600" />
            Min. Stok Altı
          </Badge>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Malzeme İhtiyaç Analizi</h1>
          <p className="text-sm text-gray-600 mt-1">
            Projelerden kaynaklı eksikler ve kritik stok seviyeleri
          </p>
        </div>
        {selectedMaterials.size > 0 && (
          <Button onClick={handleCreateRFQ} className="bg-blue-600 hover:bg-blue-700 text-white">
            <FileText className="h-4 w-4 mr-2" />
            Teklif Talebi Oluştur ({selectedMaterials.size})
          </Button>
        )}
      </div>

      {/* Stats Cards removed for focused UI */}

      {/* Filter Tabs */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtre Türü:</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setFilterType('all')}
              className={cn(
                'border-gray-300 text-gray-700',
                filterType === 'all' && 'bg-gray-100 border-gray-500 text-gray-900'
              )}
            >
              <Package className="h-4 w-4 mr-2 text-gray-500" />
              Tümü
            </Button>
            <Button
              variant="outline"
              onClick={() => setFilterType('project_shortage')}
              className={cn(
                'border-gray-300 text-gray-700',
                filterType === 'project_shortage' && 'bg-gray-100 border-gray-500 text-gray-900'
              )}
            >
              <TrendingDown className="h-4 w-4 mr-2 text-gray-500" />
              Projede Eksik Malzemeler
            </Button>
            <Button
              variant="outline"
              onClick={() => setFilterType('critical_stock')}
              className={cn(
                'border-gray-300 text-gray-700',
                filterType === 'critical_stock' && 'bg-orange-50 border-orange-500 text-orange-700'
              )}
            >
              <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
              Minimum Stok Altındakiler
            </Button>
          </div>
          <div className="flex gap-4 items-end mt-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Ara</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Malzeme adı veya kodu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="w-64">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Kategori</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
              >
                <option value="all">Tüm Kategoriler</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <Button variant="outline" onClick={loadNeeds}>
              <Filter className="h-4 w-4 mr-2" />
              Yenile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Eksik Malzemeler</CardTitle>
            {filteredMaterials.length > 0 && (
              <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                <CheckSquare className="h-4 w-4 mr-2" />
                {selectedMaterials.size === filteredMaterials.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredMaterials.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Seçilen kriterlere göre eksik malzeme bulunamadı</p>
              <p className="text-sm mt-2">Tüm malzemeler yeterli stokta!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead>
                  <tr className="border-b text-left text-sm">
                    <th className="pb-3 font-normal text-gray-700 w-12">
                      <Checkbox
                        checked={selectedMaterials.size === filteredMaterials.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="pb-3 font-normal text-gray-700">Malzeme</th>
                    <th className="pb-3 font-normal text-gray-700">Kod</th>
                    <th className="pb-3 font-normal text-gray-700">Kategori</th>
                    <th className="pb-3 font-normal text-gray-700 text-right">Mevcut Stok</th>
                    <th className="pb-3 font-normal text-gray-700 text-right">Kullanılabilir</th>
                    <th className="pb-3 font-normal text-gray-700 text-right">Proje İhtiyacı</th>
                    <th className="pb-3 font-normal text-gray-700 text-right">Proje Eksik</th>
                    <th className="pb-3 font-normal text-gray-700 text-right">Min. Stok</th>
                    <th className="pb-3 font-normal text-gray-700 text-right">Önerilen Sipariş</th>
                    <th className="pb-3 font-normal text-gray-700">Durum</th>
                    <th className="pb-3 font-normal text-gray-700">İşler</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Grouped sections: critical (both), project, stock level */}
                  {(() => {
                    const critical = filteredMaterials.filter((m) => m.issue_type === 'both')
                    const project = filteredMaterials.filter((m) => m.issue_type === 'project')
                    const stock = filteredMaterials.filter((m) => m.issue_type === 'stock_level')
                    const groups = [
                      { key: 'both', title: 'Kritik Eksikler (Proje + Stok)', items: critical },
                      { key: 'project', title: 'Proje Eksikleri', items: project },
                      { key: 'stock', title: 'Minimum Stok Altı', items: stock },
                    ].filter((g) => g.items.length > 0)
                    return groups.map((group) => (
                      <Fragment key={`group-${group.key}`}>
                        <tr className="bg-gray-50">
                          <td colSpan={12} className="px-3 py-2 text-xs font-semibold uppercase text-gray-500">
                            {group.title}
                          </td>
                        </tr>
                        {group.items.map((material) => (
                          <tr
                            key={material.stock_id}
                            className={cn(
                              'border-b hover:bg-gray-50 cursor-pointer',
                              selectedMaterials.has(material.stock_id) && 'bg-gray-100 hover:bg-gray-200'
                            )}
                            onClick={() => toggleMaterialSelection(material.stock_id)}
                          >
                            <td className="py-3" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedMaterials.has(material.stock_id)}
                                onCheckedChange={() => toggleMaterialSelection(material.stock_id)}
                              />
                            </td>
                            <td className="py-3">
                              <div className="text-gray-900">{material.product_name}</div>
                            </td>
                            <td className="py-3 text-sm text-gray-600 whitespace-nowrap">{material.product_code}</td>
                            <td className="py-3">
                              {material.category && (
                                <Badge variant="outline" className="text-xs text-gray-600">
                                  {material.category}
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 text-right whitespace-nowrap">
                              <span className="text-gray-900">{material.current_quantity.toFixed(2)}</span>{' '}
                              <span className="text-gray-400">{material.unit}</span>
                            </td>
                            <td className="py-3 text-right whitespace-nowrap">
                              <span className={cn('', material.available_quantity < 0 ? 'text-red-600' : 'text-gray-900')}>
                                {material.available_quantity.toFixed(2)}
                              </span>{' '}
                              <span className="text-gray-400">{material.unit}</span>
                            </td>
                            <td className="py-3 text-right whitespace-nowrap">
                              <span className="text-gray-900">{material.total_remaining_need.toFixed(2)}</span>{' '}
                              <span className="text-gray-400">{material.unit}</span>
                            </td>
                            <td className="py-3 text-right whitespace-nowrap">
                              {material.project_shortage > 0 ? (
                                <>
                                  <span className="text-red-600">{material.project_shortage.toFixed(2)}</span>{' '}
                                  <span className="text-gray-400">{material.unit}</span>
                                </>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 text-right whitespace-nowrap">
                              {material.min_stock_level > 0 ? (
                                <>
                                  <span className="text-gray-900">{material.min_stock_level.toFixed(2)}</span>{' '}
                                  <span className="text-gray-400">{material.unit}</span>
                                </>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 text-right whitespace-nowrap">
                              <span className="text-gray-900">{material.suggested_order_quantity.toFixed(2)}</span>{' '}
                              <span className="text-gray-400">{material.unit}</span>
                            </td>
                            <td className="py-3">{getIssueTypeBadge(material.issue_type)}</td>
                            <td className="py-3">
                              {material.jobs_count > 0 ? (
                                <Badge variant="outline" className="text-xs text-gray-700" title={material.job_numbers.join(', ')}>
                                  <List className="w-3 h-3 mr-1 text-gray-500" />
                                  {material.jobs_count} iş
                                </Badge>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Text */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Package className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-800">
              <p className="font-medium mb-2">Nasıl Kullanılır?</p>
              <ul className="space-y-1 list-disc list-inside text-gray-700">
                <li>
                  <strong>Proje Eksikleri:</strong> Aktif projelerdeki malzeme listelerinden kaynaklanan eksikler
                </li>
                <li>
                  <strong>Minimum Stok Altındakiler:</strong> Tanımlı minimum stok seviyesinin altına düşen malzemeler
                </li>
                <li>
                  <strong>Önerilen Sipariş:</strong> Proje eksikleri ve minimum stok ihtiyacının toplamı
                </li>
                <li>
                  Sipariş vermek istediğiniz malzemeleri seçin ve "Teklif Talebi Oluştur" butonuna tıklayın
                </li>
                <li>
                  Teklif talebi oluşturulduktan sonra tedarikçilere gönderip fiyat teklifleri alabilirsiniz
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
