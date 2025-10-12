'use client'

import { Button } from '@/components/ui/button'
import { List, Workflow, LayoutList } from 'lucide-react'

export type ViewMode = 'compact' | 'process' | 'detailed'

interface ViewModeToggleProps {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewModeToggle({ mode, onChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
      <Button
        variant={mode === 'compact' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('compact')}
        className={mode === 'compact' ? '' : 'hover:bg-gray-200'}
      >
        <List className="w-4 h-4 mr-2" />
        Kompakt
      </Button>
      <Button
        variant={mode === 'process' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('process')}
        className={mode === 'process' ? '' : 'hover:bg-gray-200'}
      >
        <Workflow className="w-4 h-4 mr-2" />
        Süreç
      </Button>
      <Button
        variant={mode === 'detailed' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onChange('detailed')}
        className={mode === 'detailed' ? '' : 'hover:bg-gray-200'}
      >
        <LayoutList className="w-4 h-4 mr-2" />
        Detaylı
      </Button>
    </div>
  )
}
