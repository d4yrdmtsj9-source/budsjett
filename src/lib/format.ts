const nokFormatter = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const nokFormatterPrecise = new Intl.NumberFormat('nb-NO', {
  style: 'currency',
  currency: 'NOK',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatNOK(amount: number, precise = false): string {
  return precise ? nokFormatterPrecise.format(amount) : nokFormatter.format(amount)
}

/** Grouped digits for input, e.g. 8400 → "8 400" */
export function formatGroupedNOK(amount: number): string {
  if (!amount) return ''
  const hasDecimals = Math.abs(amount % 1) > 0.0001
  return new Intl.NumberFormat('nb-NO', {
    maximumFractionDigits: hasDecimals ? 2 : 0,
    minimumFractionDigits: 0,
  }).format(amount)
}

export function parseNOKInput(raw: string): number {
  const normalized = raw.replace(/\s/g, '').replace(',', '.')
  const n = parseFloat(normalized)
  return Number.isFinite(n) ? n : 0
}

export function formatPercent(value: number): string {
  return `${Math.round(value)} %`
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  const dayOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  const parsed = dayOnly
    ? new Date(Number(dayOnly[1]), Number(dayOnly[2]) - 1, Number(dayOnly[3]))
    : new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatRelativeDate(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Nå'
  if (diffMins < 60) return `${diffMins} min siden`
  if (diffHours < 24) return `${diffHours} t siden`
  if (diffDays < 7) return `${diffDays} d siden`
  return formatDate(date)
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}
