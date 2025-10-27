'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Plus,
  Search,
  Edit,
  Eye,
  Filter,
  Mail,
  Phone,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import SupplierFormDialog from './SupplierFormDialog'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

interface Supplier {
  id: string
  name: string
  contact_person: string
  email: string
  phone: string
  address: string
  tax_number: string
  payment_terms: string
  credit_limit: number | null
  currency: string
  is_active: boolean
  created_at: string
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')

      const res = await fetch(`${API_URL}/api/procurement/suppliers`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) throw new Error('Tedarikçi listesi yüklenemedi')

      const data = await res.json()
      setSuppliers(data.data || [])
    } catch (error: any) {
      toast.error(error.message || 'Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch =
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesActive = showInactive ? true : supplier.is_active

      return matchesSearch && matchesActive
    })
  }, [suppliers, searchTerm, showInactive])

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setIsDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingSupplier(null)
    setIsDialogOpen(true)
  }

  const handleSuccess = () => {
    setIsDialogOpen(false)
    setEditingSupplier(null)
    loadSuppliers()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
          <h1 className="text-2xl font-bold text-gray-900">Tedarikçiler</h1>
          <p className="text-sm text-gray-600 mt-1">
            Tedarikçi bilgilerini yönetin
          </p>
        </div>
        <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Yeni Tedarikçi
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Toplam Tedarikçi</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Aktif</p>
                <p className="text-2xl font-bold text-green-600">
                  {suppliers.filter((s) => s.is_active).length}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pasif</p>
                <p className="text-2xl font-bold text-gray-600">
                  {suppliers.filter((s) => !s.is_active).length}
                </p>
              </div>
              <Building2 className="h-8 w-8 text-gray-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Ara</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Tedarikçi adı, yetkili veya e-posta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              variant={showInactive ? 'default' : 'outline'}
              onClick={() => setShowInactive(!showInactive)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showInactive ? 'Tümü' : 'Sadece Aktif'}
            </Button>

            <Button variant="outline" onClick={loadSuppliers}>
              <Filter className="h-4 w-4 mr-2" />
              Yenile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tedarikçi Listesi ({filteredSuppliers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tedarikçi bulunamadı</p>
              <p className="text-sm mt-2">
                Yeni bir tedarikçi eklemek için yukarıdaki "Yeni Tedarikçi" butonuna tıklayın
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm">
                    <th className="pb-3 font-medium text-gray-700">Tedarikçi Adı</th>
                    <th className="pb-3 font-medium text-gray-700">Yetkili</th>
                    <th className="pb-3 font-medium text-gray-700">İletişim</th>
                    <th className="pb-3 font-medium text-gray-700">Ödeme Koşulları</th>
                    <th className="pb-3 font-medium text-gray-700 text-right">Kredi Limiti</th>
                    <th className="pb-3 font-medium text-gray-700">Durum</th>
                    <th className="pb-3 font-medium text-gray-700">Kayıt Tarihi</th>
                    <th className="pb-3 font-medium text-gray-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{supplier.name}</div>
                            {supplier.tax_number && (
                              <div className="text-xs text-gray-500">
                                VKN: {supplier.tax_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        {supplier.contact_person && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3 w-3 text-gray-400" />
                            {supplier.contact_person}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-sm">
                        <div className="space-y-1">
                          {supplier.email && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Mail className="h-3 w-3" />
                              {supplier.email}
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="h-3 w-3" />
                              {supplier.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {supplier.payment_terms || '-'}
                      </td>
                      <td className="py-3 text-right text-sm">
                        {supplier.credit_limit ? (
                          <span className="font-medium">
                            {supplier.credit_limit.toLocaleString('tr-TR')} {supplier.currency}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3">
                        {supplier.is_active ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                            Pasif
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 text-sm text-gray-600">
                        {formatDate(supplier.created_at)}
                      </td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(supplier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Form Dialog */}
      <SupplierFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        supplier={editingSupplier}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
