export function normalizeSuggest(value: string) {
  return value.trim().toLocaleLowerCase('nb-NO')
}

/** Prefix on the whole string or any word — "g" → gips, gipsplater; "gipsp" → gipsplater. */
export function matchesSuggest(query: string, candidate: string) {
  const q = normalizeSuggest(query)
  if (!q) return false
  const c = normalizeSuggest(candidate)
  if (c.startsWith(q)) return true
  return c.split(/[\s/\-]+/).some((word) => word.startsWith(q))
}

export function uniqueSuggestions(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    const value = raw?.trim()
    if (!value) continue
    const key = normalizeSuggest(value)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out.sort((a, b) => a.localeCompare(b, 'nb'))
}

export function filterSuggestions(query: string, suggestions: string[], limit = 8) {
  const q = normalizeSuggest(query)
  if (!q) return []
  return suggestions.filter((item) => matchesSuggest(q, item)).slice(0, limit)
}
