'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchBarProps {
  placeholder?: string
  onSearch: (value: string) => void
  debounce?: number
  defaultValue?: string
}

export function SearchBar({
  placeholder = 'Ara...',
  onSearch,
  debounce = 300,
  defaultValue = '',
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue)

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value)
    }, debounce)

    return () => clearTimeout(timer)
  }, [value, debounce, onSearch])

  const handleClear = useCallback(() => {
    setValue('')
  }, [])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-10 pr-10"
      />
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
