import {
  buildGeneratedSourceWarpIdentifier,
  buildGeneratedFallbackWarpIdentifier,
  stampGeneratedWarpMeta,
  isGeneratedSourcePrivateIdentifier,
  getGeneratedSourceWarpName,
  GeneratedSourceInfo,
} from './source-identifier'
import { WarpChainName } from '../constants'
import { Warp } from '../types'

describe('buildGeneratedSourceWarpIdentifier', () => {
  it('produces deterministic output for the same inputs', () => {
    const source: GeneratedSourceInfo = { type: 'openapi', url: 'https://api.example.com/openapi.json', contract: null }
    const a = buildGeneratedSourceWarpIdentifier(source, 'getUser', 'Get User')
    const b = buildGeneratedSourceWarpIdentifier(source, 'getUser', 'Get User')
    expect(a).toBe(b)
  })

  it('avoids collisions across different URL paths', () => {
    const v1 = buildGeneratedSourceWarpIdentifier(
      { type: 'openapi', url: 'https://api.example.com/v1/openapi.json', contract: null },
      'createMessage',
      'API: Create Message'
    )
    const v2 = buildGeneratedSourceWarpIdentifier(
      { type: 'openapi', url: 'https://api.example.com/v2/openapi.json', contract: null },
      'createMessage',
      'API: Create Message'
    )
    expect(v1).not.toBe(v2)
  })

  it('avoids collisions across different source types', () => {
    const openapi = buildGeneratedSourceWarpIdentifier(
      { type: 'openapi', url: 'https://api.example.com/schema.json', contract: null },
      'deposit',
      'Deposit'
    )
    const abi = buildGeneratedSourceWarpIdentifier(
      { type: 'abi', url: 'https://api.example.com/schema.json', contract: null },
      'deposit',
      'Deposit'
    )
    expect(openapi).not.toBe(abi)
  })

  it('normalizes special characters in slug', () => {
    const id = buildGeneratedSourceWarpIdentifier(
      { type: 'openapi', url: 'https://api.example.com/spec.json', contract: null },
      'getUser',
      'Héllo Wörld! @#$'
    )
    expect(id).toMatch(/^private_src_[a-z0-9-]+_[a-f0-9]{12}$/)
  })

  it('truncates slug to max length', () => {
    const id = buildGeneratedSourceWarpIdentifier(
      { type: 'openapi', url: 'https://api.example.com/spec.json', contract: null },
      'getUser',
      'A Very Long Display Name That Should Be Truncated To Max Length'
    )
    const slug = id.replace('private_src_', '').replace(/_[a-f0-9]{12}$/, '')
    expect(slug.length).toBeLessThanOrEqual(24)
  })

  it('uses "action" slug when display name and operation key are empty', () => {
    const id = buildGeneratedSourceWarpIdentifier(
      { type: 'openapi', url: 'https://api.example.com/spec.json', contract: null },
      '',
      ''
    )
    expect(id).toMatch(/^private_src_action_/)
  })

  it('includes contract in scope for ABI sources', () => {
    const withContract = buildGeneratedSourceWarpIdentifier(
      { type: 'abi', url: 'https://api.example.com/abi.json', contract: 'erd1abc' },
      'deposit',
      'Deposit'
    )
    const withoutContract = buildGeneratedSourceWarpIdentifier(
      { type: 'abi', url: 'https://api.example.com/abi.json', contract: null },
      'deposit',
      'Deposit'
    )
    expect(withContract).not.toBe(withoutContract)
  })

  it('returns correct format: private_src_{slug}_{12-char-hex}', () => {
    const id = buildGeneratedSourceWarpIdentifier(
      { type: 'openapi', url: 'https://api.example.com/spec.json', contract: null },
      'getSession',
      'Get Session'
    )
    expect(id).toMatch(/^private_src_[a-z0-9-]+_[a-f0-9]{12}$/)
  })
})

describe('buildGeneratedFallbackWarpIdentifier', () => {
  it('generates fallback identifier from warp name', () => {
    const id = buildGeneratedFallbackWarpIdentifier({ name: 'My Warp' })
    expect(id).toMatch(/^private_gen_my-warp_[a-f0-9]{12}$/)
  })

  it('falls back to title when name is missing', () => {
    const id = buildGeneratedFallbackWarpIdentifier({ title: 'My Title' })
    expect(id).toMatch(/^private_gen_my-title_[a-f0-9]{12}$/)
  })

  it('uses "generated-warp" when both name and title are missing', () => {
    const id = buildGeneratedFallbackWarpIdentifier({})
    expect(id).toMatch(/^private_gen_generated-warp_[a-f0-9]{12}$/)
  })

  it('is deterministic', () => {
    const a = buildGeneratedFallbackWarpIdentifier({ name: 'Test' })
    const b = buildGeneratedFallbackWarpIdentifier({ name: 'Test' })
    expect(a).toBe(b)
  })
})

describe('isGeneratedSourcePrivateIdentifier', () => {
  it('detects private_src_ prefix', () => {
    expect(isGeneratedSourcePrivateIdentifier('private_src_my-warp_abc123def456')).toBe(true)
  })

  it('detects private_gen_ prefix', () => {
    expect(isGeneratedSourcePrivateIdentifier('private_gen_my-warp_abc123def456')).toBe(true)
  })

  it('returns false for regular identifiers', () => {
    expect(isGeneratedSourcePrivateIdentifier('my-warp')).toBe(false)
    expect(isGeneratedSourcePrivateIdentifier('hash:abc123')).toBe(false)
  })

  it('returns false for null/undefined/empty', () => {
    expect(isGeneratedSourcePrivateIdentifier(null)).toBe(false)
    expect(isGeneratedSourcePrivateIdentifier(undefined)).toBe(false)
    expect(isGeneratedSourcePrivateIdentifier('')).toBe(false)
  })
})

describe('getGeneratedSourceWarpName', () => {
  it('returns name when present', () => {
    expect(getGeneratedSourceWarpName({ name: 'My Warp', title: 'Title' })).toBe('My Warp')
  })

  it('falls back to title', () => {
    expect(getGeneratedSourceWarpName({ title: 'My Title' })).toBe('My Title')
  })

  it('returns default when both missing', () => {
    expect(getGeneratedSourceWarpName({})).toBe('generated-warp')
  })

  it('trims whitespace', () => {
    expect(getGeneratedSourceWarpName({ name: '  Spaced  ' })).toBe('Spaced')
  })
})

describe('stampGeneratedWarpMeta', () => {
  const makeWarp = (overrides?: Partial<Warp>): Warp => ({
    protocol: 'warp:3.0.0',
    name: 'Test Warp',
    title: 'Test',
    description: null,
    actions: [],
    ...overrides,
  })

  it('stamps meta with provided identifier', () => {
    const warp = makeWarp()
    stampGeneratedWarpMeta(warp, WarpChainName.Multiversx, 'private_src_test_abc123def456')
    expect(warp.meta?.identifier).toBe('private_src_test_abc123def456')
    expect(warp.meta?.chain).toBe(WarpChainName.Multiversx)
  })

  it('generates fallback identifier when none provided', () => {
    const warp = makeWarp()
    stampGeneratedWarpMeta(warp, WarpChainName.Multiversx)
    expect(warp.meta?.identifier).toMatch(/^private_gen_/)
  })

  it('sets fallback name when warp name is empty', () => {
    const warp = makeWarp({ name: '' })
    stampGeneratedWarpMeta(warp, WarpChainName.Multiversx, 'id', 'Fallback Name')
    expect(warp.name).toBe('Fallback Name')
  })

  it('preserves existing name when non-empty', () => {
    const warp = makeWarp({ name: 'Existing' })
    stampGeneratedWarpMeta(warp, WarpChainName.Multiversx, 'id', 'Fallback Name')
    expect(warp.name).toBe('Existing')
  })

  it('uses warp chain when available', () => {
    const warp = makeWarp({ chain: WarpChainName.Ethereum })
    stampGeneratedWarpMeta(warp, WarpChainName.Multiversx, 'id')
    expect(warp.meta?.chain).toBe(WarpChainName.Ethereum)
  })
})
