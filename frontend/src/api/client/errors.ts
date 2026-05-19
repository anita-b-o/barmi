export type ApiError = {
  code: string
  message: string
  status: number
  requestId?: string
  cause?: string
}

export function isApiError(value: unknown): value is ApiError {
  if (!value || typeof value !== 'object') return false
  const v = value as { code?: unknown; message?: unknown; status?: unknown }
  return typeof v.code === 'string' && typeof v.message === 'string' && typeof v.status === 'number'
}
