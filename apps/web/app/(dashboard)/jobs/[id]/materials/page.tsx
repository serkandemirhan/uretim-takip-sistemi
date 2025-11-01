'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'

import { JobMaterialsTab } from '@/components/features/jobs/tabs/JobMaterialsTab'

export default function JobMaterialsPage() {
  const params = useParams()
  const jobId = useMemo(() => {
    const raw = params?.id
    if (Array.isArray(raw)) {
      return raw[0] ?? ''
    }
    return (raw as string) || ''
  }, [params])

  return <JobMaterialsTab jobId={jobId} />
}
