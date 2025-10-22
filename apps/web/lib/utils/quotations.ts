export const QUOTATION_STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak',
  active: 'Onay Bekliyor',
  approved: 'Onaylanmış',
  rejected: 'İptal',
  archived: 'Arşivlendi',
}

export const QUOTATION_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  archived: 'bg-yellow-100 text-yellow-700',
}

export const QUOTATION_STATUS_OPTIONS = ['draft', 'active', 'approved', 'rejected', 'archived'] as const

export type QuotationStatusOption = (typeof QUOTATION_STATUS_OPTIONS)[number]

export function getQuotationStatusLabel(status?: string | null) {
  if (!status) return 'Bilinmiyor'
  return QUOTATION_STATUS_LABELS[status] || status
}

export function getQuotationStatusColor(status?: string | null) {
  if (!status) return 'bg-gray-100 text-gray-700'
  return QUOTATION_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'
}

function escapeRegExp(value: string) {
  return value.replace(/[-\\^$*+?.()|[\\]{}]/g, '\\$&')
}

export function generateQuotationName(job: any, quotations: any[]) {
  const jobLabel = job?.job_number || job?.title || 'İş'
  const revisionPart = job?.revision_no != null ? ` Rev${job.revision_no}` : ''
  const basePrefix = `${jobLabel}${revisionPart}`.trim()
  const baseName = `${basePrefix} - Teklif`
  const pattern = new RegExp(`^${escapeRegExp(baseName)}\\s*(\\d+)$`, 'i')
  let maxIndex = 0

  quotations.forEach((item) => {
    const name = typeof item?.name === 'string' ? item.name : ''
    const match = name.match(pattern)
    if (match && match[1]) {
      const parsed = Number(match[1])
      if (!Number.isNaN(parsed)) {
        maxIndex = Math.max(maxIndex, parsed)
      }
    }
  })

  const nextIndex = maxIndex + 1
  const formattedIndex = String(nextIndex).padStart(2, '0')
  return `${baseName} ${formattedIndex}`
}
