type RecordValue = Record<string, unknown>

export function isRecord(value: unknown): value is RecordValue {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function assertRecord(value: unknown, message: string): asserts value is RecordValue {
  if (!isRecord(value)) throw new Error(message)
}

export function assertString(value: unknown, message: string): asserts value is string {
  if (typeof value !== 'string') throw new Error(message)
}

export function assertNonEmptyString(value: unknown, message: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(message)
}

export function assertNumber(value: unknown, message: string): asserts value is number {
  if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(message)
}

export function assertBoolean(value: unknown, message: string): asserts value is boolean {
  if (typeof value !== 'boolean') throw new Error(message)
}

export function assertArray(value: unknown, message: string): asserts value is unknown[] {
  if (!Array.isArray(value)) throw new Error(message)
}

export function assertLiteral<T extends string>(value: unknown, literal: T, message: string): asserts value is T {
  if (value !== literal) throw new Error(message)
}
