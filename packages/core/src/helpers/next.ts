import { WarpChainName, WarpConstants } from '../constants'
import { ChainAdapter, WarpClientConfig } from '../types'
import { WarpExecutionNextInfo, WarpExecutionOutput } from '../types/output'
import { Warp, WarpNextConfig, WarpNextEntry } from '../types/warp'
import { WarpLinkBuilder } from '../WarpLinkBuilder'
import { evaluateWhenCondition, getWarpActionByIndex, replacePlaceholders, replacePlaceholdersInWhenExpression } from './general'
import type { WarpRelatedEntry } from '../types'
import { getWarpInfoFromIdentifier } from './identifier'

const URL_PREFIX = 'https://'

/**
 * Normalize a WarpNextEntry to a string identifier.
 * Returns null if the entry has a `when` condition that evaluates to false.
 */
const entryToIdentifier = (entry: WarpNextEntry, output?: WarpExecutionOutput): string | null => {
  if (typeof entry === 'string') return entry
  if (entry.when && output) {
    const interpolatedWhen = replacePlaceholdersInWhenExpression(entry.when, output)
    if (!evaluateWhenCondition(interpolatedWhen)) return null
  }
  return entry.identifier
}

const isNextConfigObject = (raw: WarpNextConfig): raw is { success?: WarpNextEntry | WarpNextEntry[]; error?: WarpNextEntry | WarpNextEntry[] } =>
  typeof raw === 'object' && !Array.isArray(raw) && !('identifier' in raw)

/** Resolve a next config into an array of strings for the given path, optionally filtering by when conditions. */
export const resolveNextStrings = (raw: WarpNextConfig | null | undefined, path: 'success' | 'error', output?: WarpExecutionOutput): string[] | null => {
  if (!raw) return null

  let entries: WarpNextEntry[]
  if (typeof raw === 'string') {
    entries = path === 'success' ? [raw] : []
  } else if (Array.isArray(raw)) {
    entries = path === 'success' ? raw : []
  } else if (isNextConfigObject(raw)) {
    const val = raw[path]
    entries = val ? (Array.isArray(val) ? val : [val]) : []
  } else {
    entries = path === 'success' ? [raw] : []
  }

  if (entries.length === 0) return null

  const result: string[] = []
  for (const entry of entries) {
    const identifier = entryToIdentifier(entry, output)
    if (identifier !== null) result.push(identifier)
  }
  return result.length > 0 ? result : null
}

export const resolveNextString = (raw: WarpNextConfig | null | undefined, path: 'success' | 'error', output?: WarpExecutionOutput): string | null => {
  return resolveNextStrings(raw, path, output)?.[0] ?? null
}

const resolveNextSingle = (
  config: WarpClientConfig,
  adapters: ChainAdapter[],
  warp: Warp,
  next: string,
  output: WarpExecutionOutput
): WarpExecutionNextInfo => {
  if (next.startsWith(URL_PREFIX)) return [{ identifier: null, url: next }]

  const [baseIdentifier, queryWithPlaceholders] = next.split('?')
  if (!queryWithPlaceholders) {
    const interpolatedIdentifier = replacePlaceholders(baseIdentifier, { ...warp.vars, ...output })
    return [{ identifier: interpolatedIdentifier, url: buildNextUrl(adapters, interpolatedIdentifier, config) }]
  }

  // Find all array placeholders like {{DELEGATIONS[].contract}}
  const arrayPlaceholders = queryWithPlaceholders.match(/{{([^}]+)\[\](\.[^}]+)?}}/g) || []
  if (arrayPlaceholders.length === 0) {
    const query = replacePlaceholders(queryWithPlaceholders, { ...warp.vars, ...output })
    const identifier = query ? `${baseIdentifier}?${query}` : baseIdentifier
    return [{ identifier, url: buildNextUrl(adapters, identifier, config) }]
  }

  // Support multiple array placeholders that reference the same array
  const placeholder = arrayPlaceholders[0]
  if (!placeholder) return []
  const outputNameMatch = placeholder.match(/{{([^[]+)\[\]/)
  const outputName = outputNameMatch ? outputNameMatch[1] : null
  if (!outputName || output[outputName] === undefined) return []

  const outputArray = Array.isArray(output[outputName]) ? output[outputName] : [output[outputName]]
  if (outputArray.length === 0) return []

  const arrayRegexes = arrayPlaceholders
    .filter((p) => p.includes(`{{${outputName}[]`))
    .map((p) => {
      const fieldMatch = p.match(/\[\](\.[^}]+)?}}/)
      const field = fieldMatch ? fieldMatch[1] || '' : ''
      return {
        placeholder: p,
        field: field ? field.slice(1) : '',
        regex: new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      }
    })

  return outputArray
    .map((item) => {
      let replacedQuery = queryWithPlaceholders
      for (const { regex, field } of arrayRegexes) {
        const value = field ? getNestedValue(item, field) : item
        if (value === undefined || value === null) return null
        replacedQuery = replacedQuery.replace(regex, value)
      }
      if (replacedQuery.includes('{{') || replacedQuery.includes('}}')) return null
      const identifier = replacedQuery ? `${baseIdentifier}?${replacedQuery}` : baseIdentifier
      return { identifier, url: buildNextUrl(adapters, identifier, config) }
    })
    .filter((link): link is NonNullable<typeof link> => link !== null)
}

export const getNextInfo = (
  config: WarpClientConfig,
  adapters: ChainAdapter[],
  warp: Warp,
  actionIndex: number,
  output: WarpExecutionOutput
): WarpExecutionNextInfo | null => {
  const rawNext = (getWarpActionByIndex(warp, actionIndex) as { next?: WarpNextConfig })?.next || warp.next || null
  const nexts = resolveNextStrings(rawNext, 'success', output)
  if (!nexts) return null
  const result = nexts.flatMap((next) => resolveNextSingle(config, adapters, warp, next, output))
  return result.length > 0 ? result : null
}

/** Resolve the next chain for a given execution status. For string next, only resolves on success. For object next, resolves the matching path. */
export const getNextInfoForStatus = (
  config: WarpClientConfig,
  adapters: ChainAdapter[],
  warp: Warp,
  actionIndex: number,
  output: WarpExecutionOutput,
  status: 'success' | 'error' | 'unhandled'
): WarpExecutionNextInfo | null => {
  const path = status === 'error' ? 'error' : 'success'
  const rawNext = (getWarpActionByIndex(warp, actionIndex) as { next?: WarpNextConfig })?.next || warp.next || null
  const nexts = resolveNextStrings(rawNext, path, output)
  if (!nexts) return null
  const result = nexts.flatMap((next) => resolveNextSingle(config, adapters, warp, next, output))
  return result.length > 0 ? result : null
}

const buildNextUrl = (adapters: ChainAdapter[], identifier: string, config: WarpClientConfig): string => {
  const [rawId, queryString] = identifier.split('?')
  const baseUrl = new WarpLinkBuilder(config, adapters).buildFromPrefixedIdentifier(rawId)
  if (!baseUrl) throw new Error(`Cannot build URL for identifier: ${rawId}`)
  if (!queryString) return baseUrl
  const url = new URL(baseUrl)
  new URLSearchParams(queryString).forEach((value, key) => url.searchParams.set(key, value))
  return url.toString().replace(/\/\?/, '?')
}

export const resolveRelatedEntries = (related: WarpRelatedEntry[], envs: Record<string, any>): string[] => {
  const result: string[] = []
  for (const entry of related) {
    const id = typeof entry === 'string' ? entry : entry.identifier
    const resolved = replacePlaceholders(id, envs)
    if (resolved) result.push(resolved)
  }
  return result
}

const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}
