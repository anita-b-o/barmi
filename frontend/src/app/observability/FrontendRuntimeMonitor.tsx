import { useEffect } from 'react'
import { reportConnectivityChange, reportRuntimeError, reportUnhandledRejection } from './client'
import { releaseMetadata } from './release'

export default function FrontendRuntimeMonitor() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportRuntimeError(event.error ?? event.message, {
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        releaseId: releaseMetadata.releaseId
      })
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportUnhandledRejection({
        reason: event.reason,
        releaseId: releaseMetadata.releaseId
      })
    }

    const onOnline = () => {
      reportConnectivityChange(true)
    }

    const onOffline = () => {
      reportConnectivityChange(false)
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandledRejection)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  return null
}
