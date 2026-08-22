export type CloudSyncStatus = 'pending' | 'ok' | 'local-only'

type Listener = (status: CloudSyncStatus) => void

let status: CloudSyncStatus = 'ok'
const listeners = new Set<Listener>()

export function getCloudSyncStatus() {
  return status
}

export function setCloudSyncStatus(next: CloudSyncStatus) {
  if (status === next) return
  status = next
  listeners.forEach((fn) => fn(next))
}

export function subscribeCloudSync(fn: Listener) {
  listeners.add(fn)
  fn(status)
  return () => {
    listeners.delete(fn)
  }
}
