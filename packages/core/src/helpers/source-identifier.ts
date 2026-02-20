// Deterministic identifiers for warps generated from external sources (ABI, OpenAPI).
// These warps are never registered on-chain — they exist only locally in the app that
// defined the source. The identifier encodes a human-readable slug (max 24 chars) and
// a 12-char hex scope hash so the same input always produces the same id.
//
// Two prefixes:
// - `private_src_{slug}_{hash}` — from a known source operation.
//    Hash scope: source type + URL + contract address + operation key.
// - `private_gen_{slug}_{hash}` — fallback when only the warp name is available.
//    Hash scope: warp name.

import { WarpChainName } from '../constants'
import { Warp } from '../types'

export type GeneratedSourceType = 'abi' | 'openapi'

export type GeneratedSourceInfo = {
  type: GeneratedSourceType
  url?: string | null
  contract?: string | null
}

type GeneratedWarpNameLike = {
  name?: unknown
  title?: unknown
}

export const getGeneratedSourceWarpName = (warp: GeneratedWarpNameLike): string => {
  if (typeof warp.name === 'string' && warp.name.trim()) return warp.name.trim()
  if (typeof warp.title === 'string' && warp.title.trim()) return warp.title.trim()
  return 'generated-warp'
}

const normalizeIdentifierValue = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

const toIdentifierSlug = (value: string, maxLength = 24): string => {
  const normalized = normalizeIdentifierValue(value)
  if (!normalized) return 'action'
  return normalized.slice(0, maxLength)
}

const hashIdentifierScope = (value: string): string => {
  let h1 = 0xdeadbeef ^ value.length
  let h2 = 0x41c6ce57 ^ value.length

  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  const partA = (h2 >>> 0).toString(16).padStart(8, '0')
  const partB = (h1 >>> 0).toString(16).padStart(8, '0')
  return `${partA}${partB}`.slice(0, 12)
}

const toSourceLocationScope = (url?: string | null): string => {
  const value = (url || '').trim()
  if (!value) return ''
  try {
    const parsed = new URL(value)
    const pathname = parsed.pathname.replace(/\/+$/, '').toLowerCase() || '/'
    return `${parsed.origin.toLowerCase()}${pathname}`
  } catch {
    return value.toLowerCase()
  }
}

export const buildGeneratedSourceWarpIdentifier = (
  source: GeneratedSourceInfo,
  operationKey: string,
  displayName?: string
): string => {
  const label = toIdentifierSlug((displayName || operationKey || '').trim() || 'action')
  const scope = `${source.type}|${toSourceLocationScope(source.url)}|${(source.contract || '').trim().toLowerCase()}|${operationKey.trim().toLowerCase()}`
  const hash = hashIdentifierScope(scope)
  return `private_src_${label}_${hash}`
}

export const buildGeneratedFallbackWarpIdentifier = (warp: GeneratedWarpNameLike): string => {
  const name = getGeneratedSourceWarpName(warp)
  const label = toIdentifierSlug(name)
  const hash = hashIdentifierScope(name.trim().toLowerCase())
  return `private_gen_${label}_${hash}`
}

export const stampGeneratedWarpMeta = (warp: Warp, defaultChain: WarpChainName, identifier?: string, fallbackName?: string): void => {
  if ((!warp.name || !warp.name.trim()) && fallbackName) {
    warp.name = fallbackName
  }

  const chain = (warp.chain as WarpChainName) || defaultChain
  warp.meta = {
    chain,
    identifier: identifier || buildGeneratedFallbackWarpIdentifier(warp),
    hash: warp.meta?.hash || '',
    creator: warp.meta?.creator || '',
    createdAt: warp.meta?.createdAt || '',
    query: warp.meta?.query || null,
  }
}

export const isGeneratedSourcePrivateIdentifier = (identifier?: string | null): boolean =>
  !!identifier && (identifier.startsWith('private_src_') || identifier.startsWith('private_gen_'))
