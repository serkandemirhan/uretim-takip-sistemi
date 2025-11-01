'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'

import { JobQuotationsTab } from '@/components/features/jobs/tabs/JobQuotationsTab'

export default function JobQuotationsPage() {
  const params = useParams()
  const jobId = useMemo(() => {
    const raw = params?.id
    if (Array.isArray(raw)) {
      return raw[0] ?? ''
    }
    return (raw as string) || ''
  }, [params])

  return <JobQuotationsTab jobId={jobId} />
}
