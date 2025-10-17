'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { NotificationsDropdown } from '@/components/layouts/NotificationsDropdown'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Settings,
  LogOut,
  CheckSquare,
  Cpu,
  Building2,
  Workflow,
  FileText,
  Shield,
  Package,
  ChevronLeft,
  ChevronRight,
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
  const [collapsed, setCollapsed] = useState(false)

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

  const primaryNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['yonetici', 'musteri_temsilcisi', 'operator'] },
    { name: 'İşler', href: '/jobs', icon: Briefcase, roles: ['yonetici', 'musteri_temsilcisi'] },
    { name: 'Müşteriler', href: '/customers', icon: Building2, roles: ['yonetici', 'musteri_temsilcisi'] },
    { name: 'Stoklar', href: '/stocks/inventory', icon: Package, roles: ['yonetici', 'depocu', 'satinalma'] },
    { name: 'Görevlerim', href: '/tasks', icon: CheckSquare, roles: ['operator'] },
    { name: 'Görevler', href: '/tasks/all', icon: CheckSquare, roles: ['yonetici'] },
    { name: 'Dosya Yönetimi', href: '/files/explorer', icon: FileText, roles: ['yonetici'] },
    { name: 'Makineler', href: '/machines/status', icon: Cpu, roles: ['yonetici', 'operator'] },
  ]

  const secondaryNavigation = [
    { name: 'Süreçler', href: '/processes', icon: Workflow, roles: ['yonetici'] },
    { name: 'Kullanıcılar', href: '/users', icon: Users, roles: ['yonetici'] },
    { name: 'Roller', href: '/roles', icon: Shield, roles: ['yonetici'] },
    { name: 'Ayarlar', href: '/settings', icon: Settings, roles: ['yonetici'] },
  ]

  const filteredPrimary = primaryNavigation.filter((item) =>
    item.roles.includes(user?.role || ''),
  )
  const filteredSecondary = secondaryNavigation.filter((item) =>
    item.roles.includes(user?.role || ''),
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-30 border-r border-gray-200 bg-white transition-all duration-200',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        <div className="flex flex-col h-full">
          <div className={cn('flex items-center h-16 border-b border-gray-200', collapsed ? 'px-3' : 'px-4')}>
            <div className="flex flex-1 items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              {!collapsed && <span className="font-semibold text-gray-900">Reklam Pro</span>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed((prev) => !prev)}
              className="ml-auto flex h-8 w-8 items-center justify-center text-gray-500 hover:text-gray-900"
              aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav
            className={cn(
              'flex-1 overflow-y-auto py-4 space-y-1',
              collapsed ? 'px-2' : 'px-4',
            )}
          >
            {filteredPrimary.map((item) => {
              const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-lg text-sm font-medium transition-colors',
                    collapsed ? 'justify-center gap-0 px-2 py-2.5' : 'gap-3 px-3 py-2',
                    active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          {filteredSecondary.length > 0 && (
            <div
              className={cn(
                'border-t border-gray-200',
                collapsed ? 'px-2 py-4 space-y-1' : 'px-4 py-4 space-y-1',
              )}
            >
              {filteredSecondary.map((item) => {
                const active = pathname === item.href || pathname?.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center rounded-lg text-sm font-medium transition-colors',
                      collapsed ? 'justify-center gap-0 px-2 py-2.5' : 'gap-3 px-3 py-2',
                      active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                )
              })}
            </div>
          )}

          <div className={cn('border-t border-gray-200', collapsed ? 'px-2 py-4' : 'px-4 py-4')}>
            <div
              className={cn(
                'flex items-center justify-between',
                collapsed ? 'flex-col gap-2' : '',
              )}
            >
              <div className={cn('flex items-center', collapsed ? 'justify-center' : 'gap-3')}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-sm font-medium text-blue-700">
                    {user?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.role === 'yonetici'
                        ? 'Yönetici'
                        : user?.role === 'operator'
                          ? 'Operatör'
                          : 'Kullanıcı'}
                    </p>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size={collapsed ? 'icon' : 'sm'}
                onClick={logout}
                aria-label="Çıkış yap"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div className={cn('min-h-screen flex flex-col transition-all duration-200', collapsed ? 'ml-16' : 'ml-64')}>
        <header className="sticky top-0 z-20 bg-white border-b">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              Hoş geldiniz,
              <span className="font-medium text-gray-900">{user?.full_name}</span>
            </div>
            <NotificationsDropdown />
          </div>
        </header>

        <main className="flex-1 px-8 py-8">{children}</main>
      </div>
    </div>
  )
}
