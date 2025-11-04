'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { Activity ,Shield,Bell,TrendingUp,FileText,Package,ShoppingCart} from 'lucide-react'
import { NotificationsDropdown } from '@/components/layouts/NotificationsDropdown'
import {
  LayoutDashboard,
  Briefcase,
  CheckSquare,
  Users,
  Cpu,
  Building2,
  Workflow,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardLayoutProps {
  children: React.ReactNode
  userRole?: string
}

export function DashboardLayout({ children, userRole }: DashboardLayoutProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isOperator = userRole === 'operator'

  const navigation = isOperator
    ? [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Görevlerim', href: '/tasks', icon: CheckSquare },
        { name: 'Üretim Geçmişi', href: '/tasks/history', icon: TrendingUp }, // ← YENİ
        { name: 'Makine Durumu', href: '/machines/status', icon: Cpu }, // ← YENİ
        { name: 'Bildirimler', href: '/notifications', icon: Bell }, // ← YENİ
      ]
    : [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'İşler', href: '/jobs', icon: Briefcase },
        { name: 'Müşteriler', href: '/customers', icon: Building2 },
        { name: 'Operasyonlar', href: '/processes', icon: Workflow },
        { name: 'Makineler', href: '/machines', icon: Cpu },
        { name: 'Makine Durumu', href: '/machines/status', icon: Cpu },
        { name: 'Satın Alma', href: '/procurement/requests', icon: ShoppingCart },
        { name: 'Stok Yönetimi', href: '/stocks/inventory', icon: Package },
        { name: 'İnsan Kaynakları', href: '/hr/documents', icon: FileText },
        { name: 'Kullanıcılar', href: '/users', icon: Users },
        { name: 'Roller', href: '/roles', icon: Shield },
        { name: 'Ayarlar', href: '/settings', icon: Settings },
        { name: 'Bildirimler', href: '/notifications', icon: Bell },
      ]

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">RP</span>
              </div>
              <span className="font-bold text-gray-900 hidden sm:inline">
                ReklamPRO
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <NotificationsDropdown />

            {/* User Menu */}
            <div className="flex items-center gap-3 border-l pl-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.full_name}
                </p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-20 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out mt-16 lg:mt-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
