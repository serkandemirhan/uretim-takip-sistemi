/**
 * Centralized error handling utility
 * Replaces console.log/error with proper error handling
 */

import { toast } from 'sonner'
import axios from 'axios'

interface ErrorOptions {
  title?: string
  description?: string
  showToast?: boolean
  logToService?: boolean
}

/**
 * Handle errors consistently across the application
 */
export function handleError(
  error: unknown,
  options: ErrorOptions = {}
): void {
  const {
    title = 'Bir hata oluştu',
    description,
    showToast = true,
    logToService = process.env.NODE_ENV === 'production',
  } = options

  // Extract error message
  const errorMessage = getErrorMessage(error)

  // Show toast notification to user
  if (showToast) {
    toast.error(title, {
      description: description || errorMessage,
    })
  }

  // Log to error tracking service in production (e.g., Sentry)
  if (logToService) {
    logErrorToService(error, { title, description })
  }

  // Log to console in development only
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      title,
      description,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    })
  }
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data?.error) {
    return error.response.data.error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }

  return 'Bilinmeyen bir hata oluştu'
}

/**
 * Log error to external service (placeholder for Sentry, LogRocket, etc.)
 */
function logErrorToService(
  error: unknown,
  context?: Record<string, unknown>
): void {
  // TODO: Integrate with error tracking service
  // Example: Sentry.captureException(error, { extra: context })

  // For now, just ensure it's available in production logs
  if (process.env.NODE_ENV === 'production') {
    // This will be captured by server logs
    console.error('[ERROR_SERVICE]', {
      error: error instanceof Error ? error.message : String(error),
      context,
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * Handle API errors specifically
 */
export function handleApiError(error: unknown, endpoint?: string): void {
  handleError(error, {
    title: 'API Hatası',
    description: `${endpoint ? `${endpoint} - ` : ''}${getErrorMessage(error)}`,
    showToast: true,
    logToService: true,
  })
}

/**
 * Handle form submission errors
 */
export function handleFormError(error: unknown, formName?: string): void {
  handleError(error, {
    title: 'Form Gönderme Hatası',
    description: `${formName ? `${formName} - ` : ''}${getErrorMessage(error)}`,
    showToast: true,
  })
}

/**
 * Debug helper (only logs in development)
 */
export function debugLog(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] ${message}`, data)
  }
}
