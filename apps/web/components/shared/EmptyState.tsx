/**
 * Shared EmptyState Component
 * Displays when lists or data views are empty
 */

import { Button } from '@/components/ui/button'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon | string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

/**
 * EmptyState component for consistent empty state displays
 *
 * @example
 * <EmptyState
 *   icon={FileX}
 *   title="Henüz müşteri yok"
 *   description="Yeni müşteri ekleyerek başlayın"
 *   actionLabel="Müşteri Ekle"
 *   onAction={() => router.push('/customers/new')}
 * />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className || ''}`}>
      {Icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          {typeof Icon === 'string' ? (
            <span className="text-4xl">{Icon}</span>
          ) : (
            <Icon className="h-8 w-8 text-gray-400" />
          )}
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-gray-500 max-w-md mb-6">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
