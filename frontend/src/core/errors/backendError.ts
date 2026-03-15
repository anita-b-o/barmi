import type { ApiError } from '../api'

export type BackendErrorContract = {
  error: ApiError
}

export function extractBackendErrorMessage(error: unknown, fallback = 'Error inesperado') {
  if (error && typeof error === 'object' && 'message' in error && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message
  }
  return fallback
}
