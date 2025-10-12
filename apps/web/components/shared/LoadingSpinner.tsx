/**
 * Shared LoadingSpinner Component
 * Consistent loading state across the application
 */

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  className?: string
  fullScreen?: boolean
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
}

/**
 * LoadingSpinner component for consistent loading states
 *
 * @example
 * <LoadingSpinner />
 * <LoadingSpinner size="lg" text="Yükleniyor..." />
 * <LoadingSpinner fullScreen />
 */
export function LoadingSpinner({
  size = 'md',
  text,
  className,
  fullScreen = false
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn(
      'flex flex-col items-center justify-center gap-2',
      fullScreen && 'min-h-[400px]',
      className
    )}>
      <Loader2 className={cn(
        'animate-spin text-primary',
        sizeClasses[size]
      )} />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        {spinner}
      </div>
    )
  }

  return spinner
}

/**
 * Inline loading spinner for buttons
 */
export function ButtonSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />
}
