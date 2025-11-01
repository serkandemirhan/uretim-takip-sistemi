'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'

import { JobMaterialTrackingTab } from '@/components/features/jobs/tabs/JobMaterialTrackingTab'

export default function JobMaterialTrackingPage() {
  const params = useParams()
  const jobId = useMemo(() => {
    const raw = params?.id
    if (Array.isArray(raw)) {
      return raw[0] ?? ''
    }
    return (raw as string) || ''
  }, [params])

  return <JobMaterialTrackingTab jobId={jobId} />
}
