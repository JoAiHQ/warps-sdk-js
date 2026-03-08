import { WarpChainResolver } from './WarpChainResolver'
import { createMockAdapter, createMockWarp } from './test-utils/sharedMocks'
import { ChainAdapter, Warp, WarpRegistryInfo } from './types'

const mockWarp = createMockWarp() as Warp

const mockRegistryInfo: WarpRegistryInfo = {
  hash: 'test-hash-123',
  alias: 'test-alias',
  trust: 'unverified',
  owner: 'erd1...',
  createdAt: 123456789,
  upgradedAt: 123456789,
  brand: null,
  upgrade: null,
}

describe('WarpChainResolver', () => {
  let adapter: ReturnType<typeof createMockAdapter>
  let resolver: WarpChainResolver

  beforeEach(() => {
    adapter = createMockAdapter()
    adapter.registry.getInfoByAlias = jest.fn().mockResolvedValue({ registryInfo: mockRegistryInfo, brand: null })
    adapter.registry.getInfoByHash = jest.fn().mockResolvedValue({ registryInfo: mockRegistryInfo, brand: null })
    adapter.builder = () => ({
      ...createMockAdapter().builder(),
      createFromTransactionHash: jest.fn().mockResolvedValue(mockWarp),
    })
    resolver = new WarpChainResolver(adapter as unknown as ChainAdapter)
  })

  it('resolves by alias using registry then builder', async () => {
    const result = await resolver.getByAlias('test-alias')

    expect(result).not.toBeNull()
    expect(result!.warp).toBe(mockWarp)
    expect(result!.registryInfo).toBe(mockRegistryInfo)
    expect(adapter.registry.getInfoByAlias).toHaveBeenCalledWith('test-alias', undefined)
  })

  it('returns null when registry has no info for alias', async () => {
    adapter.registry.getInfoByAlias = jest.fn().mockResolvedValue({ registryInfo: null, brand: null })

    const result = await resolver.getByAlias('unknown')

    expect(result).toBeNull()
  })

  it('returns null when builder returns null for alias', async () => {
    adapter.builder = () => ({
      ...createMockAdapter().builder(),
      createFromTransactionHash: jest.fn().mockResolvedValue(null),
    })
    resolver = new WarpChainResolver(adapter as unknown as ChainAdapter)

    const result = await resolver.getByAlias('test-alias')

    expect(result).toBeNull()
  })

  it('resolves by hash using builder then registry', async () => {
    const result = await resolver.getByHash('test-hash-123')

    expect(result).not.toBeNull()
    expect(result!.warp).toBe(mockWarp)
    expect(result!.registryInfo).toBe(mockRegistryInfo)
  })

  it('returns null when builder returns null for hash', async () => {
    adapter.builder = () => ({
      ...createMockAdapter().builder(),
      createFromTransactionHash: jest.fn().mockResolvedValue(null),
    })
    resolver = new WarpChainResolver(adapter as unknown as ChainAdapter)

    const result = await resolver.getByHash('unknown-hash')

    expect(result).toBeNull()
  })

  it('returns null on error', async () => {
    adapter.registry.getInfoByAlias = jest.fn().mockRejectedValue(new Error('network error'))

    const result = await resolver.getByAlias('test-alias')

    expect(result).toBeNull()
  })
})
