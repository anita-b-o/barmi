import { useState } from 'react'
import Button from '@/components/primitives/Button'
import Card from '@/components/primitives/Card'
import { appConfig } from '@/app/config/env'
import { theme } from '@/app/theme'
import { releaseMetadata } from './release'
import { reportRuntimeError, updateLastBackendRequestId } from './client'

type BackendSmokeState = {
  status: number
  headerRequestId: string
  bodyRequestId: string
  code: string
  message: string
}

function createFrontendError(requestId?: string) {
  const error = new Error('observability_smoke_frontend_crash')
  return Object.assign(error, requestId ? { requestId } : {})
}

export default function ObservabilitySmokeScreen() {
  const [backendState, setBackendState] = useState<BackendSmokeState | null>(null)
  const [crashNow, setCrashNow] = useState(false)
  const [loading, setLoading] = useState(false)

  if (crashNow) {
    throw createFrontendError(backendState?.bodyRequestId ?? backendState?.headerRequestId)
  }

  const triggerBackendError = async () => {
    setLoading(true)
    try {
      const requestId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `obs-${Date.now().toString(36)}`

      const response = await fetch('/api/admin/dev/observability/error?status=503', {
        headers: {
          'X-Request-Id': requestId
        }
      })
      const responseRequestId = response.headers.get('X-Request-Id') ?? requestId
      const body = await response.json() as { error?: { code?: string; message?: string; requestId?: string; status?: number } }
      const bodyRequestId = body.error?.requestId ?? responseRequestId

      updateLastBackendRequestId(bodyRequestId)
      setBackendState({
        status: body.error?.status ?? response.status,
        headerRequestId: responseRequestId,
        bodyRequestId,
        code: body.error?.code ?? 'unknown_error',
        message: body.error?.message ?? 'Unknown error'
      })
    } catch (error) {
      reportRuntimeError(error, {
        source: 'observability_smoke_backend_trigger'
      })
      throw error
    } finally {
      setLoading(false)
    }
  }

  const triggerFrontendCrash = () => {
    setCrashNow(true)
  }

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: theme.colors.bgPage }}>
      <div style={{ maxWidth: 920, margin: '0 auto', display: 'grid', gap: 20 }}>
        <Card>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ fontSize: theme.typography.display.size, fontWeight: 700 }}>Observability Smoke</div>
            <div style={{ color: theme.colors.textSecondary, lineHeight: 1.6 }}>
              Pantalla oculta para staging/dev. Permite validar release metadata, error frontend controlado y correlacion FE↔BE.
            </div>
          </div>
        </Card>

        <Card variant="soft">
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Release Metadata</div>
            <div data-testid="observability-release-id">releaseId: {releaseMetadata.releaseId}</div>
            <div data-testid="observability-version">version: {releaseMetadata.version}</div>
            <div data-testid="observability-commit">commitSha: {releaseMetadata.commitSha}</div>
            <div data-testid="observability-build-timestamp">buildTimestamp: {releaseMetadata.buildTimestamp}</div>
            <div data-testid="observability-environment">environment: {releaseMetadata.env}</div>
            <div data-testid="observability-sentry-smoke">sentrySmoke: {appConfig.sentrySmokeEnabled ? 'enabled' : 'disabled'}</div>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ fontWeight: 700 }}>Smoke Actions</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Button onClick={() => void triggerBackendError()} disabled={loading} aria-busy={loading}>
                Trigger Backend 503
              </Button>
              <Button variant="primary" onClick={triggerFrontendCrash}>
                Trigger Frontend Crash
              </Button>
            </div>
          </div>
        </Card>

        <Card variant="inverse">
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Correlation Evidence</div>
            <div data-testid="observability-http-status">status: {backendState?.status ?? 'not_run'}</div>
            <div data-testid="observability-header-request-id">headerRequestId: {backendState?.headerRequestId ?? 'n/a'}</div>
            <div data-testid="observability-body-request-id">bodyRequestId: {backendState?.bodyRequestId ?? 'n/a'}</div>
            <div data-testid="observability-error-code">errorCode: {backendState?.code ?? 'n/a'}</div>
            <div data-testid="observability-error-message">errorMessage: {backendState?.message ?? 'n/a'}</div>
          </div>
        </Card>
      </div>
    </div>
  )
}
