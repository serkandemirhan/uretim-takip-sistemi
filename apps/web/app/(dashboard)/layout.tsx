'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  CheckSquare,
  Cpu,
  Building2 ,
  Workflow

} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, logout, isAuthenticated } = useAuth()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!loading && !checked) {
      setChecked(true)
      if (!isAuthenticated) {
        router.replace('/login')
      }
    }
  }, [loading, isAuthenticated, checked, router])

  if (loading || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // ... geri kalan kod aynı kalacak
const navigation = [
 { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['yonetici', 'musteri_temsilcisi', 'operator'] },
  { name: 'İşler', href: '/jobs', icon: Briefcase, roles: ['yonetici', 'musteri_temsilcisi'] },
  { name: 'Müşteriler', href: '/customers', icon: Building2, roles: ['yonetici', 'musteri_temsilcisi'] },
  { name: 'Süreçler', href: '/processes', icon: Workflow, roles: ['yonetici'] },  // YENİ
  { name: 'Görevlerim', href: '/tasks', icon: CheckSquare, roles: ['operator'] },
  { name: 'Makineler', href: '/machines', icon: Cpu, roles: ['yonetici', 'operator'] },
  { name: 'Kullanıcılar', href: '/users', icon: Users, roles: ['yonetici'] },
  { name: 'Ayarlar', href: '/settings', icon: Settings, roles: ['yonetici'] },
]

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || '')
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 h-16 px-6 border-b border-gray-200">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <span className="font-semibold text-gray-900">Reklam Pro</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User Info */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-medium text-sm">
                    {user?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.role === 'yonetici' ? 'Yönetici' : 
                     user?.role === 'operator' ? 'Operatör' : 'Kullanıcı'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="ml-2"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64">
        <div className="py-8 px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
