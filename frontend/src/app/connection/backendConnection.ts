export type BackendConnectionState = 'idle' | 'reconnecting' | 'recovered'

export type BackendConnectionDetail = {
  state: BackendConnectionState
  path?: string
  status?: number
}

const EVENT_NAME = 'barmi:backend-connection'

let lastDetail: BackendConnectionDetail = { state: 'idle' }

export function getBackendConnectionState() {
  return lastDetail
}

export function emitBackendConnectionState(detail: BackendConnectionDetail) {
  lastDetail = detail
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<BackendConnectionDetail>(EVENT_NAME, { detail }))
}

export function subscribeBackendConnectionState(listener: (detail: BackendConnectionDetail) => void) {
  if (typeof window === 'undefined') return () => undefined

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<BackendConnectionDetail>
    listener(customEvent.detail)
  }

  window.addEventListener(EVENT_NAME, handler)
  return () => {
    window.removeEventListener(EVENT_NAME, handler)
  }
}
