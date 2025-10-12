/**
 * ReklamPRO Application Type Definitions
 * Centralized type definitions for the entire application
 */

// ============================================================================
// Common Types
// ============================================================================

export type UUID = string

export interface Timestamps {
  created_at: string
  updated_at?: string
}

export interface SoftDelete {
  deleted_at?: string | null
}

// ============================================================================
// User & Authentication
// ============================================================================

export type UserRole =
  | 'yonetici'
  | 'musteri_temsilcisi'
  | 'tasarimci'
  | 'kesifci'
  | 'operator'
  | 'depocu'
  | 'satinalma'

export interface User extends Timestamps {
  id: UUID
  username: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
}

export interface AuthUser {
  user_id: UUID
  username: string
  email: string
  role: UserRole
  full_name: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  user: AuthUser
}

// ============================================================================
// Customer
// ============================================================================

export interface Customer extends Timestamps {
  id: UUID
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  tax_number?: string
  notes?: string
}

export interface CustomerFormData {
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  country?: string
  tax_number?: string
  notes?: string
}

// ============================================================================
// Job
// ============================================================================

export type JobStatus = 'draft' | 'active' | 'in_progress' | 'completed' | 'canceled' | 'on_hold'

export type Priority = 'low' | 'normal' | 'high' | 'urgent'

export interface Job extends Timestamps {
  id: UUID
  job_number: string
  title: string
  description?: string
  customer_id: UUID
  customer?: Customer
  status: JobStatus
  priority: Priority
  due_date?: string
  created_by: UUID
  created_by_user?: User
  revision_no: number
  total_steps?: number
  completed_steps?: number
  progress?: number
}

export interface JobFormData {
  title: string
  description?: string
  customer_id: string
  priority: Priority
  due_date?: string
  steps?: JobStepFormData[]
}

export interface JobRevision extends Timestamps {
  id: UUID
  job_id: UUID
  revision_no: number
  changed_by: UUID
  changed_by_user?: User
  change_description: string
}

// ============================================================================
// Process
// ============================================================================

export interface Process extends Timestamps, SoftDelete {
  id: UUID
  name: string
  code: string
  description?: string
  is_active: boolean
  order_index: number
  color?: string
  icon?: string
}

export interface ProcessFormData {
  name: string
  code: string
  description?: string
  is_active?: boolean
  order_index?: number
  color?: string
}

// ============================================================================
// Machine
// ============================================================================

export type MachineStatus = 'active' | 'maintenance' | 'inactive'

export interface Machine extends Timestamps {
  id: UUID
  name: string
  code: string
  description?: string
  status: MachineStatus
  is_active: boolean
  location?: string
  serial_number?: string
  purchase_date?: string
  maintenance_date?: string
  processes?: Process[]
  current_task?: JobStep
}

export interface MachineFormData {
  name: string
  code: string
  description?: string
  status: MachineStatus
  location?: string
  serial_number?: string
  purchase_date?: string
  process_ids?: string[]
}

// ============================================================================
// Job Step (Task)
// ============================================================================

export type JobStepStatus = 'pending' | 'ready' | 'in_progress' | 'completed' | 'canceled' | 'blocked'

export interface JobStep extends Timestamps {
  id: UUID
  job_id: UUID
  job?: Job
  process_id: UUID
  process?: Process
  machine_id?: UUID
  machine?: Machine
  assigned_to?: UUID
  assigned_to_user?: User
  status: JobStepStatus
  order_index: number
  estimated_duration?: number
  actual_duration?: number
  started_at?: string
  completed_at?: string
  production_quantity?: number
  production_unit?: string
  notes?: string
  is_parallel?: boolean
}

export interface JobStepFormData {
  process_id: string
  machine_id?: string
  assigned_to?: string
  order_index: number
  estimated_duration?: number
  production_quantity?: number
  production_unit?: string
  notes?: string
  is_parallel?: boolean
}

// ============================================================================
// File
// ============================================================================

export type FileType = 'image' | 'document' | 'other'

export interface File extends Timestamps {
  id: UUID
  original_name: string
  stored_name: string
  file_size: number
  mime_type: string
  file_type: FileType
  ref_type: 'job' | 'process'
  ref_id: UUID
  folder_path: string
  uploaded_by: UUID
  uploaded_by_user?: User
  is_deleted: boolean
  download_url?: string
}

export interface FileUploadData {
  file: globalThis.File
  ref_type: 'job' | 'process'
  ref_id: string
  folder_path?: string
}

// ============================================================================
// Notification
// ============================================================================

export type NotificationType = 'info' | 'warning' | 'success' | 'error'

export interface Notification extends Timestamps {
  id: UUID
  user_id: UUID
  type: NotificationType
  title: string
  message: string
  ref_type?: string
  ref_id?: UUID
  is_read: boolean
  read_at?: string
}

// ============================================================================
// Role & Permission
// ============================================================================

export interface Role extends Timestamps {
  id: UUID
  name: string
  code: string
  description?: string
  is_system: boolean
}

export interface Permission {
  id: UUID
  role_id: UUID
  resource: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_delete: boolean
}

export interface ProcessPermission {
  role_id: UUID
  process_id: UUID
  can_view: boolean
}

// ============================================================================
// Dashboard Stats
// ============================================================================

export interface JobStats {
  draft: number
  active: number
  in_progress: number
  completed: number
  canceled: number
  overdue: number
  total: number
}

export interface TaskStats {
  ready: number
  in_progress: number
  completed: number
  total: number
}

export interface MachineStats {
  active: number
  maintenance: number
  inactive: number
  busy: number
  total: number
}

export interface UserStats {
  operators: number
  managers: number
  total: number
}

export interface DashboardStats {
  jobs: JobStats
  my_tasks?: TaskStats
  machines: MachineStats
  users: UserStats
}

export interface ChartDataPoint {
  status?: string
  month?: string
  count: number
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  message?: string
  status?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

// ============================================================================
// Form State Types
// ============================================================================

export interface FormErrors {
  [key: string]: string | undefined
}

export interface FormState<T> {
  data: T
  errors: FormErrors
  isSubmitting: boolean
  isDirty: boolean
}

// ============================================================================
// Filter & Search Types
// ============================================================================

export interface SearchParams {
  query?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface JobFilters extends SearchParams {
  status?: JobStatus | JobStatus[]
  priority?: Priority | Priority[]
  customer_id?: UUID
  created_by?: UUID
  date_from?: string
  date_to?: string
}

export interface TaskFilters extends SearchParams {
  status?: JobStepStatus | JobStepStatus[]
  assigned_to?: UUID
  machine_id?: UUID
  process_id?: UUID
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface SelectOption<T = string> {
  value: T
  label: string
  disabled?: boolean
}

export interface TabItem {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: number
}

export interface BreadcrumbItem {
  label: string
  href?: string
}

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null

export type Optional<T> = T | undefined

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
