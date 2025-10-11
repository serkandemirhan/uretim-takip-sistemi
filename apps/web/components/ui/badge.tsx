import * as React from "react"
import { cn } from "@/lib/utils/cn"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        {
          'bg-blue-100 text-blue-800': variant === 'default',
          'border border-gray-300 text-gray-700': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
