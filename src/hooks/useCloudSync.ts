import { useEffect, useState } from 'react'
import {
  getCloudSyncStatus,
  subscribeCloudSync,
  type CloudSyncStatus,
} from '@/lib/syncStatus'

export function useCloudSync() {
  const [status, setStatus] = useState<CloudSyncStatus>(getCloudSyncStatus)

  useEffect(() => subscribeCloudSync(setStatus), [])

  const label =
    status === 'pending'
      ? 'Lagrer…'
      : status === 'ok'
        ? 'Lagret hos dere begge'
        : 'Kun på denne telefonen — eksporter under Innstillinger'

  return { status, label }
}
