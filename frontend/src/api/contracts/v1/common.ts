export type ApiErrorDto = {
  code: string
  message: string
  status: number
}

export type ErrorEnvelope = {
  error: ApiErrorDto
}
