import { ReactNode } from 'react'
import { FileText } from 'lucide-react'

interface EmptyStateProps {
  icon?: ReactNode
  title?: string
  description?: string
  action?: ReactNode
}

export function EmptyState({
  icon = <FileText className="h-12 w-12" />,
  title = 'Veri bulunamadı',
  description = 'Henüz kayıt eklenmemiş',
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-gray-400">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mb-4 text-sm text-gray-500">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
