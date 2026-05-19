import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { theme } from '@/app/theme'
import { getLastBackendRequestId } from '@/app/observability/client'
import { releaseMetadata } from '@/app/observability/release'
import { appConfig } from '@/app/config/env'
import { betaAdapter } from '@/api/adapters/betaAdapter'
import Button from '@/components/primitives/Button'
import Modal from '@/components/primitives/Modal'

type BetaFeedbackWidgetProps = {
  ecosystemSlug?: string
  storeId?: string
  storeSlug?: string
}

const SESSION_STORAGE_KEY = 'barmi.beta.session_id'

function getSessionId() {
  if (typeof window === 'undefined') return 'server'
  const existing = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing
  const next = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `feedback-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, next)
  return next
}

export function BetaFeedbackWidget({ ecosystemSlug, storeId, storeSlug }: BetaFeedbackWidgetProps) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<'bug' | 'confusing' | 'missing' | 'love_it'>('confusing')
  const [score, setScore] = useState('3')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const route = useMemo(
    () => `${location.pathname}${location.search}${location.hash}`,
    [location.hash, location.pathname, location.search]
  )
  const floatingBottom = route.includes('checkout') && typeof window !== 'undefined' && window.innerWidth < 768
    ? 92
    : theme.spacing.lg

  const reset = () => {
    setCategory('confusing')
    setScore('3')
    setMessage('')
    setStatus('idle')
    setError(null)
  }

  const close = () => {
    setOpen(false)
    reset()
  }

  const submit = async () => {
    const trimmed = message.trim()
    if (trimmed.length < 4) {
      setError('Contanos brevemente qué pasó o qué te faltó.')
      return
    }

    setStatus('submitting')
    setError(null)
    try {
      await betaAdapter.submitFeedback({
        category,
        score: Number(score),
        message: trimmed,
        route,
        ecosystemSlug,
        storeId,
        storeSlug,
        requestId: getLastBackendRequestId() ?? undefined,
        sessionId: getSessionId(),
        releaseId: releaseMetadata.releaseId,
        environment: appConfig.appEnv
      })
      setStatus('sent')
    } catch (submissionError) {
      setStatus('error')
      setError(submissionError instanceof Error ? submissionError.message : 'No pudimos enviar el feedback.')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          right: theme.spacing.lg,
          bottom: floatingBottom,
          zIndex: 40,
          border: `1px solid ${theme.colors.borderStrong}`,
          background: theme.colors.secondary,
          color: '#ffffff',
          borderRadius: theme.radius.pill,
          padding: `${theme.spacing.sm}px ${theme.spacing.lg}px`,
          fontWeight: 700,
          boxShadow: 'none'
        }}
      >
        Feedback beta
      </button>

      <Modal open={open} onClose={close} title="Feedback rápido">
        {status === 'sent' ? (
          <div style={{ display: 'grid', gap: theme.spacing.md }}>
            <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
              Gracias. Este feedback queda asociado a la pantalla actual para revisar fricción real de la beta.
            </div>
            <Button onClick={close}>Cerrar</Button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: theme.spacing.md }}>
            <div style={{ color: theme.colors.textMuted, lineHeight: 1.6 }}>
              Qué te trabó o qué te faltó en esta pantalla. No incluyas datos personales, tarjetas ni tokens.
            </div>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Tipo</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>
                <option value="confusing">Confuso</option>
                <option value="bug">Bug</option>
                <option value="missing">Falta algo</option>
                <option value="love_it">Funcionó bien</option>
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Severidad percibida</span>
              <select value={score} onChange={(event) => setScore(event.target.value)}>
                <option value="1">1 · menor</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5 · bloquea</option>
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Mensaje</span>
              <textarea
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value)
                  setError(null)
                }}
                rows={5}
                placeholder="Ej: no entendí cuándo queda creada la orden o el error no me dijo qué corregir."
                style={{
                  width: '100%',
                  resize: 'vertical',
                  borderRadius: theme.radius.md,
                  border: `1px solid ${theme.colors.borderDefault}`,
                  padding: theme.spacing.md,
                  font: 'inherit'
                }}
              />
            </label>

            {error ? <div style={{ color: theme.colors.error }}>{error}</div> : null}

            <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <Button variant="secondary" onClick={close}>Cancelar</Button>
              <Button onClick={() => void submit()} disabled={status === 'submitting'}>
                {status === 'submitting' ? 'Enviando...' : 'Enviar feedback'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
