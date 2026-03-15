export function formatMoneyFromCents(priceCents: number, currency = 'ARS') {
  const amount = priceCents / 100
  return formatMoney(amount, currency)
}

export function formatMoney(amount: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}
