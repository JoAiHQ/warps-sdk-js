import { WarpChainName, WarpConstants } from '../constants'
import { WarpIdentifierType } from '../types'

export const cleanWarpIdentifier = (identifier: string): string => {
  return identifier.startsWith(WarpConstants.IdentifierAliasMarker)
    ? identifier.replace(WarpConstants.IdentifierAliasMarker, '')
    : identifier
}

export const isEqualWarpIdentifier = (identifier1: string | null | undefined, identifier2: string | null | undefined): boolean => {
  if (!identifier1 || !identifier2) return false
  return cleanWarpIdentifier(identifier1) === cleanWarpIdentifier(identifier2)
}

export const createWarpIdentifier = (chain: WarpChainName, type: WarpIdentifierType, identifier: string) => {
  const cleanIdentifier = cleanWarpIdentifier(identifier)
  if (type === WarpConstants.IdentifierType.Alias) {
    return WarpConstants.IdentifierAliasMarker + chain + WarpConstants.IdentifierParamSeparator + cleanIdentifier
  }
  return chain + WarpConstants.IdentifierParamSeparator + type + WarpConstants.IdentifierParamSeparator + cleanIdentifier
}

export const getWarpInfoFromIdentifier = (
  prefixedIdentifier: string,
  defaultChain?: WarpChainName
): { chain: WarpChainName; type: WarpIdentifierType; identifier: string; identifierBase: string } | null => {
  const chainToUse = defaultChain || WarpConstants.IdentifierChainDefault
  const decoded = decodeURIComponent(prefixedIdentifier).trim()
  const identifierWithoutAliasMarker = cleanWarpIdentifier(decoded)
  const base = identifierWithoutAliasMarker.split('?')[0]
  const parts = splitBySeparators(base)

  // Handle 64-character hex hash (no separator)
  if (base.length === 64 && /^[a-fA-F0-9]+$/.test(base)) {
    return {
      chain: chainToUse,
      type: WarpConstants.IdentifierType.Hash,
      identifier: identifierWithoutAliasMarker,
      identifierBase: base,
    }
  }

  // Edge case: 62-char:xx is invalid (first part is exactly 62 chars, two parts, second part is exactly 2 alphanumeric chars)
  if (parts.length === 2 && /^[a-zA-Z0-9]{62}$/.test(parts[0]) && /^[a-zA-Z0-9]{2}$/.test(parts[1])) {
    return null
  }

  // Handle chain.type.identifier format (3 parts)
  if (parts.length === 3) {
    const [chainPrefix, type, identifier] = parts
    if (type === WarpConstants.IdentifierType.Alias || type === WarpConstants.IdentifierType.Hash) {
      const identifierWithQuery = identifierWithoutAliasMarker.includes('?')
        ? identifier + identifierWithoutAliasMarker.substring(identifierWithoutAliasMarker.indexOf('?'))
        : identifier
      return {
        chain: chainPrefix as WarpChainName,
        type: type as WarpIdentifierType,
        identifier: identifierWithQuery,
        identifierBase: identifier,
      }
    }
  }

  // Handle type.identifier format (2 parts, type is 'alias' or 'hash')
  if (parts.length === 2) {
    const [type, identifier] = parts
    if (type === WarpConstants.IdentifierType.Alias || type === WarpConstants.IdentifierType.Hash) {
      const identifierWithQuery = identifierWithoutAliasMarker.includes('?')
        ? identifier + identifierWithoutAliasMarker.substring(identifierWithoutAliasMarker.indexOf('?'))
        : identifier
      return {
        chain: chainToUse,
        type: type as WarpIdentifierType,
        identifier: identifierWithQuery,
        identifierBase: identifier,
      }
    }
  }

  // Handle chain.identifier format (2 parts, chain is not 'alias' or 'hash')
  if (parts.length === 2) {
    const [chainPrefix, identifier] = parts
    if (chainPrefix !== WarpConstants.IdentifierType.Alias && chainPrefix !== WarpConstants.IdentifierType.Hash) {
      const identifierWithQuery = identifierWithoutAliasMarker.includes('?')
        ? identifier + identifierWithoutAliasMarker.substring(identifierWithoutAliasMarker.indexOf('?'))
        : identifier

      // Determine if identifier is a hash (hex string > 32 chars)
      const identifierType = isHash(identifier, chainPrefix) ? WarpConstants.IdentifierType.Hash : WarpConstants.IdentifierType.Alias

      return {
        chain: chainPrefix as WarpChainName,
        type: identifierType,
        identifier: identifierWithQuery,
        identifierBase: identifier,
      }
    }
  }

  // Fallback: treat as alias
  return {
    chain: chainToUse,
    type: WarpConstants.IdentifierType.Alias,
    identifier: identifierWithoutAliasMarker,
    identifierBase: base,
  }
}

export const extractIdentifierInfoFromUrl = (
  url: string,
  defaultChain?: WarpChainName
): { chain: WarpChainName; type: WarpIdentifierType; identifier: string; identifierBase: string } | null => {
  const urlObj = new URL(url)
  const searchParamValue = urlObj.searchParams.get(WarpConstants.IdentifierParamName)
  let value = searchParamValue
  if (!value) {
    // fallback for superclient style URLs
    value = urlObj.pathname.split('/')[1]
  }

  if (!value) {
    return null
  }

  const decodedParam = decodeURIComponent(value)
  return getWarpInfoFromIdentifier(decodedParam, defaultChain)
}

const isHash = (identifier: string, chainPrefix?: string): boolean => {
  // If it's a hex string longer than 32 characters, it's a hash
  // (since aliases cannot exceed 32 characters)
  const hexRegex = /^[a-fA-F0-9]+$/
  const MAX_ALIAS_LENGTH = 32

  return hexRegex.test(identifier) && identifier.length > MAX_ALIAS_LENGTH
}

const findFirstSeparator = (str: string): { separator: string; index: number } | null => {
  const separator = WarpConstants.IdentifierParamSeparator
  const index = str.indexOf(separator)
  return index !== -1 ? { separator, index } : null
}

const splitBySeparators = (str: string): string[] => {
  const result = findFirstSeparator(str)
  if (!result) return [str]

  const { separator, index } = result
  const firstPart = str.substring(0, index)
  const remaining = str.substring(index + separator.length)

  // Recursively split the remaining part
  const remainingParts = splitBySeparators(remaining)
  return [firstPart, ...remainingParts]
}

export const extractQueryStringFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url)
    const searchParams = new URLSearchParams(urlObj.search)
    searchParams.delete(WarpConstants.IdentifierParamName)
    const queryString = searchParams.toString()
    return queryString || null
  } catch {
    return null
  }
}

export const extractQueryStringFromIdentifier = (identifier: string): string | null => {
  const queryIndex = identifier.indexOf('?')
  if (queryIndex === -1 || queryIndex === identifier.length - 1) return null
  const queryString = identifier.substring(queryIndex + 1)
  return queryString.length > 0 ? queryString : null
}
