import { ReactNode } from 'react'

/**
 * Column definition for DataTable
 */
export interface ColumnDef<T = any> {
  /** Unique column identifier */
  id: string

  /** Column header text */
  header: string

  /** Data accessor - can be a key or function */
  accessor: keyof T | ((row: T) => any)

  /** Custom render function for cell content */
  render?: (value: any, row: T) => ReactNode

  /** Column visibility */
  visible?: boolean

  /** Column width */
  width?: string | number

  /** Custom className for cells */
  className?: string

  /** Custom className for header */
  headerClassName?: string
}

/**
 * Action button configuration
 */
export interface Action<T = any> {
  /** Action label */
  label: string

  /** Action icon (optional) */
  icon?: ReactNode

  /** Click handler */
  onClick: (row: T) => void

  /** Button variant */
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'

  /** Conditional visibility - return false to hide */
  condition?: (row: T) => boolean

  /** Size */
  size?: 'sm' | 'default' | 'lg'
}

/**
 * Main DataTable props
 */
export interface DataTableProps<T = any> {
  /** Table data */
  data: T[]

  /** Column definitions */
  columns: ColumnDef<T>[]

  /** Loading state */
  loading?: boolean

  /** Empty state custom component */
  emptyState?: ReactNode

  /** Row actions */
  actions?: Action<T>[]

  /** Enable search functionality */
  searchable?: boolean

  /** Search placeholder text */
  searchPlaceholder?: string

  /** Search fields to include */
  searchFields?: (keyof T)[]

  /** Custom row key accessor */
  getRowKey?: (row: T, index: number) => string

  /** Row click handler */
  onRowClick?: (row: T) => void

  /** Custom className for table container */
  className?: string

  /** Show row numbers */
  showRowNumbers?: boolean
}
