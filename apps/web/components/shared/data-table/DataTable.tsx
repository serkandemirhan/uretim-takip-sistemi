'use client'

import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { DataTableProps } from './types'
import { EmptyState } from './EmptyState'
import { TableSkeleton } from './TableSkeleton'
import { SearchBar } from './SearchBar'

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyState,
  actions = [],
  searchable = false,
  searchPlaceholder,
  searchFields,
  getRowKey,
  onRowClick,
  className,
  showRowNumbers = false,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data

    const query = searchQuery.toLowerCase()

    return data.filter((row) => {
      // If searchFields specified, only search those fields
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((field) => {
          const value = row[field]
          return value?.toString().toLowerCase().includes(query)
        })
      }

      // Otherwise search all visible columns
      return columns.some((col) => {
        let value: any

        if (typeof col.accessor === 'function') {
          value = col.accessor(row)
        } else {
          value = row[col.accessor]
        }

        return value?.toString().toLowerCase().includes(query)
      })
    })
  }, [data, searchQuery, columns, searchFields])

  // Get visible columns
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => col.visible !== false)
  }, [columns])

  // Generate row key
  const getKey = (row: T, index: number): string => {
    if (getRowKey) return getRowKey(row, index)
    if ('id' in row) return String(row.id)
    return `row-${index}`
  }

  // Get cell value
  const getCellValue = (row: T, column: typeof visibleColumns[0]) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row)
    }
    return row[column.accessor]
  }

  // Calculate total columns (including row numbers and actions)
  const totalColumns =
    visibleColumns.length + (showRowNumbers ? 1 : 0) + (actions.length > 0 ? 1 : 0)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Bar */}
      {searchable && (
        <SearchBar
          placeholder={searchPlaceholder}
          onSearch={setSearchQuery}
        />
      )}

      {/* Loading State */}
      {loading ? (
        <TableSkeleton
          rows={5}
          columns={totalColumns}
        />
      ) : filteredData.length === 0 ? (
        /* Empty State */
        emptyState || <EmptyState />
      ) : (
        /* Data Table */
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Row Numbers Header */}
                {showRowNumbers && (
                  <TableHead className="w-12 text-center">#</TableHead>
                )}

                {/* Column Headers */}
                {visibleColumns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={column.headerClassName}
                    style={{ width: column.width }}
                  >
                    {column.header}
                  </TableHead>
                ))}

                {/* Actions Header */}
                {actions.length > 0 && (
                  <TableHead className="w-32 text-right">İşlemler</TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredData.map((row, rowIndex) => {
                // Filter visible actions for this row
                const visibleActions = actions.filter(
                  (action) => !action.condition || action.condition(row)
                )

                return (
                  <TableRow
                    key={getKey(row, rowIndex)}
                    onClick={() => onRowClick?.(row)}
                    className={onRowClick ? 'cursor-pointer' : undefined}
                  >
                    {/* Row Number */}
                    {showRowNumbers && (
                      <TableCell className="text-center text-sm text-gray-500">
                        {rowIndex + 1}
                      </TableCell>
                    )}

                    {/* Data Cells */}
                    {visibleColumns.map((column) => {
                      const value = getCellValue(row, column)
                      const rendered = column.render
                        ? column.render(value, row)
                        : value

                      return (
                        <TableCell
                          key={column.id}
                          className={column.className}
                        >
                          {rendered}
                        </TableCell>
                      )
                    })}

                    {/* Actions Cell */}
                    {actions.length > 0 && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {visibleActions.map((action, actionIndex) => (
                            <Button
                              key={actionIndex}
                              variant={action.variant || 'ghost'}
                              size={action.size || 'sm'}
                              onClick={(e) => {
                                e.stopPropagation()
                                action.onClick(row)
                              }}
                            >
                              {action.icon}
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
