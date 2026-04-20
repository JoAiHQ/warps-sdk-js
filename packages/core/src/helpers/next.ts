import { WarpChainName, WarpConstants } from '../constants'
import { ChainAdapter, WarpClientConfig, WarpIdentifierInfo } from '../types'
import { WarpExecutionNextInfo, WarpExecutionOutput } from '../types/output'
import { Warp, WarpNextConfig } from '../types/warp'
import { WarpLinkBuilder } from '../WarpLinkBuilder'
import { findWarpAdapterForChain, getWarpActionByIndex, replacePlaceholders } from './general'
import { getWarpInfoFromIdentifier } from './identifier'

const URL_PREFIX = 'https://'

/** Resolve a next config into an array of strings for the given path. */
export const resolveNextStrings = (raw: WarpNextConfig | null | undefined, path: 'success' | 'error'): string[] | null => {
  if (!raw) return null
  if (typeof raw === 'string') return path === 'success' ? [raw] : null
  if (Array.isArray(raw)) return path === 'success' ? raw : null
  const val = raw[path]
  if (!val) return null
  return Array.isArray(val) ? val : [val]
}

export const resolveNextString = (raw: WarpNextConfig | null | undefined, path: 'success' | 'error'): string | null => {
  return resolveNextStrings(raw, path)?.[0] ?? null
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
  const nexts = resolveNextStrings(rawNext, 'success')
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
  const nexts = resolveNextStrings(rawNext, path)
  if (!nexts) return null
  const result = nexts.flatMap((next) => resolveNextSingle(config, adapters, warp, next, output))
  return result.length > 0 ? result : null
}

const buildNextUrl = (adapters: ChainAdapter[], identifier: string, config: WarpClientConfig): string => {
  const [rawId, queryString] = identifier.split('?')
  const info: WarpIdentifierInfo = getWarpInfoFromIdentifier(rawId) ?? {
    chain: null,
    type: 'alias',
    identifier: rawId,
    identifierBase: rawId,
  }
  const adapter = info.chain ? findWarpAdapterForChain(info.chain, adapters) : null
  if (!adapter) throw new Error(`Adapter not found for chain ${info.chain ?? 'unknown'}`)
  const baseUrl = new WarpLinkBuilder(config, adapters).build(adapter.chainInfo.name, info.type, info.identifierBase)
  if (!queryString) return baseUrl

  const url = new URL(baseUrl)
  new URLSearchParams(queryString).forEach((value, key) => url.searchParams.set(key, value))
  return url.toString().replace(/\/\?/, '?')
}

const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}
