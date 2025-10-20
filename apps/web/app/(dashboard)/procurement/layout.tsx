import { ShoppingCart, Package, FileText } from 'lucide-react'
import Link from 'next/link'

export default function ProcurementLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const navItems = [
    {
      name: 'Satın Alma Talepleri',
      href: '/procurement/requests',
      icon: FileText,
      description: 'Purchase Requests'
    },
    {
      name: 'Mal Kabul',
      href: '/procurement/receipts',
      icon: Package,
      description: 'Goods Receipts'
    },
    {
      name: 'Stok Yönetimi',
      href: '/stocks',
      icon: ShoppingCart,
      description: 'Stock Management'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Procurement">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className="group inline-flex items-center border-b-2 border-transparent px-1 py-4 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
              >
                <Icon className="mr-2 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Page Content */}
      <div>{children}</div>
    </div>
  )
}
