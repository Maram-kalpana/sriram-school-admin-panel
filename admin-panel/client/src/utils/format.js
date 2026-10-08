const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

const NUMBER = new Intl.NumberFormat('en-IN')

const DATE = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const DATETIME = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatINR(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '₹0'
  return INR.format(n)
}

export function formatNumber(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '0'
  return NUMBER.format(n)
}

export function formatDate(value) {
  if (!value) return '—'
  return DATE.format(new Date(value))
}

export function formatDateTime(value) {
  if (!value) return '—'
  return DATETIME.format(new Date(value))
}
