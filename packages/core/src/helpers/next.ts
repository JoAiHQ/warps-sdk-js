import { WarpChainName, WarpConstants } from '../constants'
import { ChainAdapter, WarpClientConfig } from '../types'
import { WarpExecutionNextInfo, WarpExecutionOutput } from '../types/output'
import { Warp } from '../types/warp'
import { WarpLinkBuilder } from '../WarpLinkBuilder'
import { findWarpAdapterForChain, replacePlaceholders } from './general'
import { getWarpInfoFromIdentifier } from './identifier'

const URL_PREFIX = 'https://'

export const getNextInfo = (
  config: WarpClientConfig,
  adapters: ChainAdapter[],
  warp: Warp,
  actionIndex: number,
  output: WarpExecutionOutput
): WarpExecutionNextInfo | null => {
  const next = (warp.actions?.[actionIndex - 1] as { next?: string })?.next || warp.next || null
  if (!next) return null
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

  // Create regex patterns for all array placeholders with the same output name
  const arrayRegexes = arrayPlaceholders
    .filter((p) => p.includes(`{{${outputName}[]`))
    .map((p) => {
      const fieldMatch = p.match(/\[\](\.[^}]+)?}}/)
      const field = fieldMatch ? fieldMatch[1] || '' : ''
      return {
        placeholder: p,
        field: field ? field.slice(1) : '', // Remove leading dot if present
        regex: new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      }
    })

  const nextLinks = outputArray
    .map((item) => {
      let replacedQuery = queryWithPlaceholders

      // Replace all array placeholders for this item
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

  return nextLinks
}

const buildNextUrl = (adapters: ChainAdapter[], identifier: string, config: WarpClientConfig): string => {
  const [rawId, queryString] = identifier.split('?')
  const info = getWarpInfoFromIdentifier(rawId, config.defaultChain) || {
    chain: WarpConstants.IdentifierChainDefault,
    type: 'alias',
    identifier: rawId,
    identifierBase: rawId,
  }
  const adapter = findWarpAdapterForChain(info.chain, adapters)
  if (!adapter) throw new Error(`Adapter not found for chain ${info.chain}`)
  const baseUrl = new WarpLinkBuilder(config, adapters).build(adapter.chainInfo.name, info.type, info.identifierBase)
  if (!queryString) return baseUrl

  const url = new URL(baseUrl)
  new URLSearchParams(queryString).forEach((value, key) => url.searchParams.set(key, value))
  return url.toString().replace(/\/\?/, '?')
}

const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}
