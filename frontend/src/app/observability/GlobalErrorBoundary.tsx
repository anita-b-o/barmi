import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from '@/components/feedback'
import { releaseMetadata } from './release'
import { reportRouteRenderError } from './client'

type GlobalErrorBoundaryProps = {
  children: ReactNode
}

type GlobalErrorBoundaryState = {
  hasError: boolean
}

export class GlobalErrorBoundary extends Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
  state: GlobalErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    reportRouteRenderError(error, {
      componentStack: errorInfo.componentStack,
      browser: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
      releaseId: releaseMetadata.releaseId,
      version: releaseMetadata.version,
      commitSha: releaseMetadata.commitSha,
      buildTimestamp: releaseMetadata.buildTimestamp
    })
  }

  private retry = () => {
    this.setState({ hasError: false })
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
          <div style={{ width: 'min(100%, 440px)' }}>
            <ErrorState
              message={`No pudimos cargar esta pantalla. Release ${releaseMetadata.releaseId}.`}
              actionLabel="Reintentar"
              onAction={this.retry}
            />
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
