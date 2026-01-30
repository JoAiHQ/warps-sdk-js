import { WarpChainName } from '../constants'
import {
  cleanWarpIdentifier,
  createWarpIdentifier,
  extractIdentifierInfoFromUrl,
  extractQueryStringFromIdentifier,
  extractQueryStringFromUrl,
  getWarpInfoFromIdentifier,
  isEqualWarpIdentifier,
  parseWarpQueryStringToObject,
  removeWarpChainPrefix,
} from './identifier'

describe('cleanWarpIdentifier', () => {
  it('removes @ prefix from identifier', () => {
    expect(cleanWarpIdentifier('@mywarp')).toBe('mywarp')
  })

  it('returns identifier unchanged if no @ prefix', () => {
    expect(cleanWarpIdentifier('mywarp')).toBe('mywarp')
  })

  it('removes only the first @ prefix', () => {
    expect(cleanWarpIdentifier('@my@warp')).toBe('my@warp')
  })

  it('handles empty string', () => {
    expect(cleanWarpIdentifier('')).toBe('')
  })

  it('handles identifier with only @', () => {
    expect(cleanWarpIdentifier('@')).toBe('')
  })

  it('handles complex identifier with @ prefix', () => {
    expect(cleanWarpIdentifier('@sui:alias:mywarp')).toBe('sui:alias:mywarp')
  })
})

describe('isEqualWarpIdentifier', () => {
  it('returns true for identical identifiers without @', () => {
    expect(isEqualWarpIdentifier('mywarp', 'mywarp')).toBe(true)
  })

  it('returns true for identical identifiers with @ prefix', () => {
    expect(isEqualWarpIdentifier('@mywarp', '@mywarp')).toBe(true)
  })

  it('returns true when one has @ prefix and other does not', () => {
    expect(isEqualWarpIdentifier('@mywarp', 'mywarp')).toBe(true)
    expect(isEqualWarpIdentifier('mywarp', '@mywarp')).toBe(true)
  })

  it('returns false for different identifiers', () => {
    expect(isEqualWarpIdentifier('mywarp', 'otherwarp')).toBe(false)
  })

  it('returns false when one has @ prefix and identifiers differ', () => {
    expect(isEqualWarpIdentifier('@mywarp', 'otherwarp')).toBe(false)
    expect(isEqualWarpIdentifier('mywarp', '@otherwarp')).toBe(false)
  })

  it('handles complex identifiers with separators', () => {
    expect(isEqualWarpIdentifier('@sui:alias:mywarp', 'sui:alias:mywarp')).toBe(true)
    expect(isEqualWarpIdentifier('sui:alias:mywarp', '@sui:alias:mywarp')).toBe(true)
    expect(isEqualWarpIdentifier('@sui:alias:mywarp', '@sui:alias:mywarp')).toBe(true)
  })

  it('handles identifiers with query parameters', () => {
    expect(isEqualWarpIdentifier('@mywarp?param=1', 'mywarp?param=1')).toBe(true)
    expect(isEqualWarpIdentifier('mywarp?param=1', '@mywarp?param=1')).toBe(true)
  })
})

describe('createWarpIdentifier', () => {
  it('creates alias identifier with @ prefix and no alias type', () => {
    const result = createWarpIdentifier(WarpChainName.Sui, 'alias', 'mywarp')
    expect(result).toBe('@sui:mywarp')
  })

  it('creates identifier with hash type', () => {
    const result = createWarpIdentifier(WarpChainName.Multiversx, 'hash', 'abc123def456')
    expect(result).toBe('multiversx:hash:abc123def456')
  })

  it('creates alias identifier with different chain', () => {
    const result = createWarpIdentifier(WarpChainName.Ethereum, 'alias', 'mywarp')
    expect(result).toBe('@ethereum:mywarp')
  })

  it('creates alias identifier with empty identifier', () => {
    const result = createWarpIdentifier(WarpChainName.Sui, 'alias', '')
    expect(result).toBe('@sui:')
  })

  it('removes @ prefix from identifier if present', () => {
    const result = createWarpIdentifier(WarpChainName.Sui, 'alias', '@mywarp')
    expect(result).toBe('@sui:mywarp')
  })
})

describe('getWarpInfoFromIdentifier', () => {
  it('returns info for an unprefixed alias (defaults to alias type, chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('mywarp')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('returns info for a prefixed alias (defaults to chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('alias:mywarp')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('removes @ prefix from alias identifier', () => {
    const result = getWarpInfoFromIdentifier('@mywarp')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('removes @ prefix from chain.type.identifier format', () => {
    const result = getWarpInfoFromIdentifier('@sui:alias:mywarp')
    expect(result).toEqual({
      chain: 'sui',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('returns info for a hash identifier (defaults to chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('hash:abc123def456')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'hash',
      identifier: 'abc123def456',
      identifierBase: 'abc123def456',
    })
  })

  it('returns info for an alias with query parameters (defaults to chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('alias:mywarp?param1=value1&param2=value2')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'alias',
      identifier: 'mywarp?param1=value1&param2=value2',
      identifierBase: 'mywarp',
    })
  })

  it('returns info for a hash with query parameters (defaults to chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('hash:abc123?param1=value1')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'hash',
      identifier: 'abc123?param1=value1',
      identifierBase: 'abc123',
    })
  })

  it('returns info for an unprefixed alias with query parameters (defaults to chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('mywarp?param1=value1&param2=value2')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'alias',
      identifier: 'mywarp?param1=value1&param2=value2',
      identifierBase: 'mywarp',
    })
  })

  it('handles URL encoded identifier with query parameters (defaults to chain mvx)', () => {
    const encoded = encodeURIComponent('alias:mywarp?param1=value with spaces&param2=value2')
    const result = getWarpInfoFromIdentifier(encoded)
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'alias',
      identifier: 'mywarp?param1=value with spaces&param2=value2',
      identifierBase: 'mywarp',
    })
  })

  it('handles empty identifier after prefix (defaults to chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('alias:')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'alias',
      identifier: '',
      identifierBase: '',
    })
  })

  it('handles empty hash identifier (defaults to chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('hash:')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'hash',
      identifier: '',
      identifierBase: '',
    })
  })

  it('treats 64-character strings as hashes (defaults to chain mvx)', () => {
    const hashString = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const result = getWarpInfoFromIdentifier(hashString)
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'hash',
      identifier: hashString,
      identifierBase: hashString,
    })
  })

  it('treats 64-character strings with query params as hashes (defaults to chain mvx)', () => {
    const hashString = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef?param=value'
    const result = getWarpInfoFromIdentifier(hashString)
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'hash',
      identifier: hashString,
      identifierBase: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    })
  })

  it('does not treat short strings as hashes (defaults to chain mvx)', () => {
    const shortString = '123456789'
    const result = getWarpInfoFromIdentifier(shortString)
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'alias',
      identifier: shortString,
      identifierBase: shortString,
    })
  })

  it('does not treat long strings (>64 chars) as hashes (defaults to chain mvx)', () => {
    const longString = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345'
    const result = getWarpInfoFromIdentifier(longString)
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'alias',
      identifier: longString,
      identifierBase: longString,
    })
  })

  it('returns null for 64-character strings with separators (invalid edge case)', () => {
    const stringWithSeparator = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd:ef'
    const result = getWarpInfoFromIdentifier(stringWithSeparator)
    expect(result).toBeNull()
  })

  it('parses chain prefix sui:hash:abc123', () => {
    const result = getWarpInfoFromIdentifier('sui:hash:abc123')
    expect(result).toEqual({
      chain: 'sui',
      type: 'hash',
      identifier: 'abc123',
      identifierBase: 'abc123',
    })
  })

  it('parses chain prefix sui:alias:mywarp', () => {
    const result = getWarpInfoFromIdentifier('sui:alias:mywarp')
    expect(result).toEqual({
      chain: 'sui',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('parses chain prefix sui:alias:mywarp?param=1', () => {
    const result = getWarpInfoFromIdentifier('sui:alias:mywarp?param=1')
    expect(result).toEqual({
      chain: 'sui',
      type: 'alias',
      identifier: 'mywarp?param=1',
      identifierBase: 'mywarp',
    })
  })

  it('parses chain prefix sui:mywarp', () => {
    const result = getWarpInfoFromIdentifier('sui:mywarp')
    expect(result).toEqual({
      chain: 'sui',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('parses chain prefix sui:hash:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', () => {
    const hash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const result = getWarpInfoFromIdentifier(`sui:hash:${hash}`)
    expect(result).toEqual({
      chain: 'sui',
      type: 'hash',
      identifier: hash,
      identifierBase: hash,
    })
  })

  it('parses chain prefix with colon separator sui:hash:abc123', () => {
    const result = getWarpInfoFromIdentifier('sui:hash:abc123')
    expect(result).toEqual({
      chain: 'sui',
      type: 'hash',
      identifier: 'abc123',
      identifierBase: 'abc123',
    })
  })

  it('parses chain prefix with colon separator sui:alias:mywarp', () => {
    const result = getWarpInfoFromIdentifier('sui:alias:mywarp')
    expect(result).toEqual({
      chain: 'sui',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('parses chain prefix with colon separator sui:alias:mywarp?param=1', () => {
    const result = getWarpInfoFromIdentifier('sui:alias:mywarp?param=1')
    expect(result).toEqual({
      chain: 'sui',
      type: 'alias',
      identifier: 'mywarp?param=1',
      identifierBase: 'mywarp',
    })
  })

  it('parses chain prefix with colon separator sui:mywarp', () => {
    const result = getWarpInfoFromIdentifier('sui:mywarp')
    expect(result).toEqual({
      chain: 'sui',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('parses chain prefix with colon separator sui:hash:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', () => {
    const hash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const result = getWarpInfoFromIdentifier(`sui:hash:${hash}`)
    expect(result).toEqual({
      chain: 'sui',
      type: 'hash',
      identifier: hash,
      identifierBase: hash,
    })
  })

  it('parses unprefixed alias with colon separator alias:mywarp', () => {
    const result = getWarpInfoFromIdentifier('alias:mywarp')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('parses unprefixed hash with colon separator hash:abc123def456', () => {
    const result = getWarpInfoFromIdentifier('hash:abc123def456')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'hash',
      identifier: 'abc123def456',
      identifierBase: 'abc123def456',
    })
  })

  it('parses alias with colon separator and query parameters alias:mywarp?param1=value1&param2=value2', () => {
    const result = getWarpInfoFromIdentifier('alias:mywarp?param1=value1&param2=value2')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'alias',
      identifier: 'mywarp?param1=value1&param2=value2',
      identifierBase: 'mywarp',
    })
  })

  it('parses hash with colon separator and query parameters hash:abc123?param1=value1', () => {
    const result = getWarpInfoFromIdentifier('hash:abc123?param1=value1')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'hash',
      identifier: 'abc123?param1=value1',
      identifierBase: 'abc123',
    })
  })

  it('handles empty identifier after colon prefix alias:', () => {
    const result = getWarpInfoFromIdentifier('alias:')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'alias',
      identifier: '',
      identifierBase: '',
    })
  })

  it('handles empty hash identifier after colon prefix hash:', () => {
    const result = getWarpInfoFromIdentifier('hash:')
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'hash',
      identifier: '',
      identifierBase: '',
    })
  })

  it('correctly identifies hash in chain.identifier format with colon separator (64 chars > 32)', () => {
    const hash = 'f200f3c68fe7cc471c25eda05409664d5e55ecf795cd02a000bbe7fae9ac3e92'
    const result = getWarpInfoFromIdentifier(`multiversx:${hash}`)
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'hash',
      identifier: hash,
      identifierBase: hash,
    })
  })

  it('correctly identifies 32-char hex string as alias (aliases cannot exceed 32 chars)', () => {
    const identifier = '1234567890abcdef1234567890abcdef'
    const result = getWarpInfoFromIdentifier(`sui:${identifier}`)
    expect(result).toEqual({
      chain: 'sui',
      type: 'alias',
      identifier: identifier,
      identifierBase: identifier,
    })
  })

  it('correctly identifies 33-char hex string as hash (exceeds 32 char alias limit)', () => {
    const hash = '1234567890abcdef1234567890abcdef1' // 33 characters
    const result = getWarpInfoFromIdentifier(`sui:${hash}`)
    expect(result).toEqual({
      chain: 'sui',
      type: 'hash',
      identifier: hash,
      identifierBase: hash,
    })
  })

  it('correctly identifies 40-char hex string as hash (exceeds 32 char alias limit)', () => {
    const hash = '1234567890abcdef1234567890abcdef12345678' // 40 characters
    const result = getWarpInfoFromIdentifier(`eth:${hash}`)
    expect(result).toEqual({
      chain: 'eth',
      type: 'hash',
      identifier: hash,
      identifierBase: hash,
    })
  })

  it('correctly identifies the user-provided hash example (64 chars > 32)', () => {
    const hash = 'f200f3c68fe7cc471c25eda05409664d5e55ecf795cd02a000bbe7fae9ac3e92'
    const result = getWarpInfoFromIdentifier(`multiversx:${hash}`)
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'hash',
      identifier: hash,
      identifierBase: hash,
    })
  })

  it('still treats non-hex identifiers as aliases in chain.identifier format', () => {
    const alias = 'my-awesome-warp'
    const result = getWarpInfoFromIdentifier(`multiversx:${alias}`)
    expect(result).toEqual({
      chain: 'multiversx',
      type: 'alias',
      identifier: alias,
      identifierBase: alias,
    })
  })

  it('uses defaultChain from options if provided for unprefixed alias', () => {
    const result = getWarpInfoFromIdentifier('mywarp', WarpChainName.Sui)
    expect(result).toEqual({
      chain: 'sui',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('uses defaultChain from options if provided for type:identifier format', () => {
    const result = getWarpInfoFromIdentifier('alias:mywarp', WarpChainName.Ethereum)
    expect(result).toEqual({
      chain: 'ethereum',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('uses defaultChain from options if provided for 64-char hash', () => {
    const hash = 'a'.repeat(64)
    const result = getWarpInfoFromIdentifier(hash, WarpChainName.Base)
    expect(result).toEqual({
      chain: 'base',
      type: 'hash',
      identifier: hash,
      identifierBase: hash,
    })
  })

  it('ignores defaultChain if chain is explicitly provided in identifier', () => {
    const result = getWarpInfoFromIdentifier('sui:mywarp', WarpChainName.Multiversx)
    expect(result).toEqual({
      chain: 'sui',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })
})

describe('extractIdentifierInfoFromUrl', () => {
  it('returns null if no identifier', () => {
    const url = 'https://example.com/'
    expect(extractIdentifierInfoFromUrl(url)).toBeNull()
  })

  it('parses chain prefix', () => {
    const url = 'https://example.com/?warp=sui:hash:abc123'
    expect(extractIdentifierInfoFromUrl(url)).toEqual({
      chain: 'sui',
      type: 'hash',
      identifier: 'abc123',
      identifierBase: 'abc123',
    })
  })

  it('defaults to mvx', () => {
    const url = 'https://example.com/?warp=alias:mywarp'
    expect(extractIdentifierInfoFromUrl(url)).toEqual({
      chain: 'multiversx',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('parses encoded chain prefix', () => {
    const url = 'https://example.com/?warp=' + encodeURIComponent('sui:alias:mywarp')
    expect(extractIdentifierInfoFromUrl(url)).toEqual({
      chain: 'sui',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('parses chain prefix with colon separator', () => {
    const url = 'https://example.com/?warp=sui:hash:abc123'
    expect(extractIdentifierInfoFromUrl(url)).toEqual({
      chain: 'sui',
      type: 'hash',
      identifier: 'abc123',
      identifierBase: 'abc123',
    })
  })

  it('parses encoded chain prefix with colon separator', () => {
    const url = 'https://example.com/?warp=' + encodeURIComponent('sui:alias:mywarp')
    expect(extractIdentifierInfoFromUrl(url)).toEqual({
      chain: 'sui',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('uses defaultChain from options if provided', () => {
    const url = 'https://example.com/?warp=mywarp'
    expect(extractIdentifierInfoFromUrl(url, WarpChainName.Sui)).toEqual({
      chain: 'sui',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })
})

describe('extractQueryStringFromUrl', () => {
  it('extracts query string from URL excluding warp parameter', () => {
    const url = 'https://example.com/?warp=hash:123&param1=value1&param2=value2'
    expect(extractQueryStringFromUrl(url)).toBe('param1=value1&param2=value2')
  })

  it('returns null when only warp parameter exists', () => {
    const url = 'https://example.com/?warp=hash:123'
    expect(extractQueryStringFromUrl(url)).toBeNull()
  })

  it('returns null when no query parameters exist', () => {
    const url = 'https://example.com/'
    expect(extractQueryStringFromUrl(url)).toBeNull()
  })

  it('handles multiple query parameters', () => {
    const url = 'https://example.com/?warp=hash:123&foo=bar&baz=qux&test=123'
    expect(extractQueryStringFromUrl(url)).toBe('foo=bar&baz=qux&test=123')
  })

  it('handles URL encoded query parameters', () => {
    const url = 'https://example.com/?warp=hash:123&param=value%20with%20spaces'
    expect(extractQueryStringFromUrl(url)).toBe('param=value+with+spaces')
  })

  it('handles empty query parameter values', () => {
    const url = 'https://example.com/?warp=hash:123&empty=&filled=value'
    expect(extractQueryStringFromUrl(url)).toBe('empty=&filled=value')
  })

  it('returns null for invalid URL', () => {
    const url = 'not-a-valid-url'
    expect(extractQueryStringFromUrl(url)).toBeNull()
  })

  it('handles warp parameter in different positions', () => {
    const url = 'https://example.com/?param1=value1&warp=hash:123&param2=value2'
    expect(extractQueryStringFromUrl(url)).toBe('param1=value1&param2=value2')
  })
})

describe('extractQueryStringFromIdentifier', () => {
  it('extracts query string from identifier', () => {
    const identifier = 'hash:abc123?param1=value1&param2=value2'
    expect(extractQueryStringFromIdentifier(identifier)).toBe('param1=value1&param2=value2')
  })

  it('returns null when no query string exists', () => {
    const identifier = 'hash:abc123'
    expect(extractQueryStringFromIdentifier(identifier)).toBeNull()
  })

  it('returns null when query marker is at the end', () => {
    const identifier = 'hash:abc123?'
    expect(extractQueryStringFromIdentifier(identifier)).toBeNull()
  })

  it('handles single query parameter', () => {
    const identifier = 'alias:mywarp?param=value'
    expect(extractQueryStringFromIdentifier(identifier)).toBe('param=value')
  })

  it('handles multiple query parameters', () => {
    const identifier = 'hash:abc123?foo=bar&baz=qux&test=123'
    expect(extractQueryStringFromIdentifier(identifier)).toBe('foo=bar&baz=qux&test=123')
  })

  it('handles query string with special characters', () => {
    const identifier = 'hash:abc123?param=value%20with%20spaces&other=test'
    expect(extractQueryStringFromIdentifier(identifier)).toBe('param=value%20with%20spaces&other=test')
  })

  it('handles empty query parameter values', () => {
    const identifier = 'hash:abc123?empty=&filled=value'
    expect(extractQueryStringFromIdentifier(identifier)).toBe('empty=&filled=value')
  })

  it('handles 64-character hash with query string', () => {
    const hash = 'a'.repeat(64)
    const identifier = `${hash}?param=value`
    expect(extractQueryStringFromIdentifier(identifier)).toBe('param=value')
  })

  it('returns null for empty string after query marker', () => {
    const identifier = 'hash:abc123?'
    expect(extractQueryStringFromIdentifier(identifier)).toBeNull()
  })

  it('handles query string at the start of identifier', () => {
    const identifier = '?param=value'
    expect(extractQueryStringFromIdentifier(identifier)).toBe('param=value')
  })
})

describe('parseWarpQueryStringToObject', () => {
  it('parses query string to object', () => {
    const queryString = 'provider=erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllllscktaww'
    expect(parseWarpQueryStringToObject(queryString)).toEqual({
      provider: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllllscktaww',
    })
  })

  it('handles query string with multiple parameters', () => {
    const queryString = 'param1=value1&param2=value2'
    expect(parseWarpQueryStringToObject(queryString)).toEqual({
      param1: 'value1',
      param2: 'value2',
    })
  })

  it('handles query string starting with ?', () => {
    const queryString = '?provider=test'
    expect(parseWarpQueryStringToObject(queryString)).toEqual({
      provider: 'test',
    })
  })

  it('handles URL encoded values', () => {
    const queryString = 'param=value%20with%20spaces'
    expect(parseWarpQueryStringToObject(queryString)).toEqual({
      param: 'value with spaces',
    })
  })

  it('handles empty query string', () => {
    expect(parseWarpQueryStringToObject('')).toEqual({})
  })

  it('handles null query string', () => {
    expect(parseWarpQueryStringToObject(null)).toEqual({})
  })

  it('handles empty parameter values', () => {
    const queryString = 'empty=&filled=value'
    expect(parseWarpQueryStringToObject(queryString)).toEqual({
      empty: '',
      filled: 'value',
    })
  })
})

describe('removeWarpChainPrefix', () => {
  it('removes chain prefix if matches', () => {
    expect(removeWarpChainPrefix('multiversx:mywarp', WarpChainName.Multiversx)).toBe('mywarp')
  })

  it('removes chain prefix even if it does not match (returns parsed identifier base)', () => {
    expect(removeWarpChainPrefix('sui:mywarp', WarpChainName.Multiversx)).toBe('mywarp')
  })

  it('handles simple alias', () => {
    expect(removeWarpChainPrefix('mywarp')).toBe('mywarp')
  })

  it('handles chain.type.identifier format by returning identifier base', () => {
    expect(removeWarpChainPrefix('sui:alias:mywarp')).toBe('mywarp')
  })

  it('removes @ prefix', () => {
    expect(removeWarpChainPrefix('@mywarp')).toBe('mywarp')
  })
})

