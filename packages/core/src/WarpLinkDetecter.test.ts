import { WarpChainName } from './constants'
import { createMockAdapter, createMockConfig, createMockWarp } from './test-utils/sharedMocks'
import { Warp, WarpBrand, WarpClientConfig, WarpRegistryInfo } from './types'
import { WarpLinkDetecter } from './WarpLinkDetecter'

jest.mock('./WarpBuilder')
jest.mock('@joai/warps-adapter-multiversx')

const minimalWarp = {
  protocol: 'warp',
  name: 'mock',
  title: 'mock',
  description: '',
  actions: [],
}

const mockWarp: Warp = createMockWarp()

const createMockBuilder = () => ({
  createInscriptionTransaction: jest.fn(),
  createFromTransaction: jest.fn().mockResolvedValue(mockWarp),
  createFromTransactionHash: jest.fn().mockResolvedValue(mockWarp),
})

const mockBuilder = createMockBuilder()

const mockAdapter = {
  ...createMockAdapter(),
  chain: 'devnet',
  builder: () => mockBuilder,
  registry: {
    createWarpRegisterTransaction: jest.fn(),
    createWarpUnregisterTransaction: jest.fn(),
    createWarpUpgradeTransaction: jest.fn(),
    createWarpAliasSetTransaction: jest.fn(),
    createWarpVerifyTransaction: jest.fn(),
    createWarpTransferOwnershipTransaction: jest.fn(),
    createBrandRegisterTransaction: jest.fn(),
    createWarpBrandingTransaction: jest.fn(),
    getInfoByAlias: jest.fn().mockResolvedValue({ registryInfo: null, brand: null }),
    getInfoByHash: jest.fn().mockResolvedValue({ registryInfo: null, brand: null }),
    getUserWarpRegistryInfos: jest.fn().mockResolvedValue([]),
    getUserBrands: jest.fn().mockResolvedValue([]),
    getChainInfos: jest.fn().mockResolvedValue([]),
    getChainInfo: jest.fn().mockResolvedValue({
      name: 'multiversx',
      displayName: 'MultiversX',
      chainId: 'D',
      blockTime: 6000,
      addressHrp: 'erd',
      defaultApiUrl: 'https://devnet-api.multiversx.com',
      explorerUrl: 'https://devnet-explorer.multiversx.com',
      nativeToken: 'EGLD',
    }),
    setChain: jest.fn().mockResolvedValue({}),
    removeChain: jest.fn().mockResolvedValue({}),
    fetchBrand: jest.fn().mockResolvedValue(null),
  },
  executor: {
    createTransaction: jest.fn(),
    preprocessInput: jest.fn(),
  },
  output: {
    getTransactionExecutionResults: jest.fn(),
  },
  serializer: {
    typedToString: jest.fn(),
    typedToNative: jest.fn(),
    nativeToTyped: jest.fn(),
    nativeToType: jest.fn(),
    stringToTyped: jest.fn(),
  },
}

const Config: WarpClientConfig = createMockConfig({
  env: 'devnet',
  clientUrl: 'https://anyclient.com',
  currentUrl: 'https://anyclient.com',
  vars: {},
  user: { wallets: { multiversx: 'erd1abc' } },
  schema: {
    warp: 'https://schema.warp.to/warp.json',
    brand: 'https://schema.warp.to/brand.json',
  },
})

describe('WarpLinkDetecter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset all mocks to default behavior
    Object.assign(mockBuilder, createMockBuilder())
    mockAdapter.registry.getInfoByHash = jest.fn().mockResolvedValue({ registryInfo: null, brand: null })
    mockAdapter.registry.getInfoByAlias = jest.fn().mockResolvedValue({ registryInfo: null, brand: null })
  })

  it('detects warp links with hash', async () => {
    // Ensure builder returns mockWarp for hash detection
    mockBuilder.createFromTransactionHash = jest.fn().mockResolvedValue(mockWarp)
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?warp=hash:123')
    expect(result.match).toBe(true)
    expect(result.url).toBe('https://anyclient.com?warp=hash:123')
    expect(result.warp).toBeDefined()
    expect(result.chain).toBe('multiversx')
  })

  it('detects warp links with alias', async () => {
    // For alias detection, we need registry info with hash, then builder creates warp from hash
    const mockRegistryInfo = {
      hash: 'test-hash',
      alias: 'mywarp',
      trust: 'unverified' as const,
      owner: 'erd1...',
      createdAt: 123456789,
      upgradedAt: 123456789,
      brand: null,
      upgrade: null,
    }
    mockAdapter.registry.getInfoByAlias = jest.fn().mockResolvedValue({
      registryInfo: mockRegistryInfo,
      brand: null,
    })
    mockBuilder.createFromTransactionHash = jest.fn().mockResolvedValue(mockWarp)

    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?warp=mywarp')
    expect(result.match).toBe(true)
    expect(result.url).toBe('https://anyclient.com?warp=mywarp')
    expect(result.warp).toBeDefined()
    expect(result.chain).toBe('multiversx')
    expect(result.registryInfo).toEqual(mockRegistryInfo)
  })

  it('handles null registry info for hash', async () => {
    mockAdapter.registry.getInfoByHash = jest.fn().mockResolvedValue({ registryInfo: null, brand: null })
    mockBuilder.createFromTransactionHash = jest.fn().mockResolvedValue(mockWarp)
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?warp=hash:123')
    expect(result.match).toBe(true)
    expect(result.url).toBe('https://anyclient.com?warp=hash:123')
    expect(result.warp).toBeDefined()
    expect(result.chain).toBe('multiversx')
    expect(result.registryInfo).toBeNull()
    expect(result.brand).toBeNull()
  })

  it('handles null registry info for alias', async () => {
    mockAdapter.registry.getInfoByAlias = jest.fn().mockResolvedValue({ registryInfo: null, brand: null })
    // For null registry info, no warp should be created
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?warp=mywarp')
    expect(result).toEqual({
      match: false,
      url: 'https://anyclient.com?warp=mywarp',
      warp: null,
      chain: null,
      registryInfo: null,
      brand: null,
    })
  })

  it('handles null warp creation', async () => {
    const builder = mockAdapter.builder()
    builder.createFromTransactionHash = jest.fn().mockResolvedValue(null)
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?warp=hash:123')
    expect(result).toEqual({
      match: false,
      url: 'https://anyclient.com?warp=hash:123',
      warp: null,
      chain: null,
      registryInfo: null,
      brand: null,
    })
  })

  it('returns no match for non-warp links', async () => {
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?other=value')
    expect(result).toEqual({
      match: false,
      url: 'https://anyclient.com?other=value',
      warp: null,
      chain: null,
      registryInfo: null,
      brand: null,
    })
  })

  it('handles registry info with brand', async () => {
    const mockRegistryInfo: WarpRegistryInfo = {
      hash: 'test-hash',
      alias: 'test-alias',
      trust: 'unverified',
      owner: 'erd1...',
      createdAt: 123456789,
      upgradedAt: 123456789,
      brand: null,
      upgrade: null,
    }
    const mockBrand: WarpBrand = {
      protocol: 'warp',
      name: 'test-brand',
      description: 'Test Brand Description',
      logo: 'test-logo.png',
      urls: {
        web: 'https://test-brand.com',
      },
      meta: {
        chain: WarpChainName.Multiversx,
        identifier: 'test-brand',
        query: null,
        hash: 'test-brand-hash',
        creator: 'erd1...',
        createdAt: '2024-01-01',
      },
    }
    mockAdapter.registry.getInfoByHash = jest.fn().mockResolvedValue({
      registryInfo: mockRegistryInfo,
      brand: mockBrand,
    })
    mockBuilder.createFromTransactionHash = jest.fn().mockResolvedValue(mockWarp)
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?warp=hash:123')
    expect(result.match).toBe(true)
    expect(result.url).toBe('https://anyclient.com?warp=hash:123')
    expect(result.warp).toBeDefined()
    expect(result.chain).toBe('multiversx')
    expect(result.registryInfo).toEqual(mockRegistryInfo)
    expect(result.brand).toEqual(mockBrand)
  })

  it('extracts query string from identifier with query params', async () => {
    const hash64 = 'a'.repeat(64)
    const warpWithMeta = {
      ...mockWarp,
      meta: { chain: 'multiversx', identifier: hash64, query: null, hash: hash64, creator: 'erd1...', createdAt: '2024-01-01' },
    }
    mockBuilder.createFromTransactionHash = jest.fn().mockResolvedValue(warpWithMeta)
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect(`${hash64}?queryA=valueA&queryB=valueB`)

    expect(mockBuilder.createFromTransactionHash).toHaveBeenCalledWith(hash64, undefined)
    expect(result.warp?.meta?.query).toEqual({ queryA: 'valueA', queryB: 'valueB' })
  })

  it('extracts query string from hash identifier format with query params', async () => {
    const warpWithMeta = {
      ...mockWarp,
      meta: { chain: 'multiversx', identifier: 'hash:abc123', query: null, hash: 'abc123', creator: 'erd1...', createdAt: '2024-01-01' },
    }
    mockBuilder.createFromTransactionHash = jest.fn().mockResolvedValue(warpWithMeta)
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('hash:abc123?queryA=valueA&queryB=valueB')

    expect(mockBuilder.createFromTransactionHash).toHaveBeenCalledWith('abc123', undefined)
    expect(result.warp?.meta?.query).toEqual({ queryA: 'valueA', queryB: 'valueB' })
  })

  it('extracts query string from URL with additional query params', async () => {
    const warpWithMeta = {
      ...mockWarp,
      meta: { chain: 'multiversx', identifier: 'hash:123', query: null, hash: '123', creator: 'erd1...', createdAt: '2024-01-01' },
    }
    mockBuilder.createFromTransactionHash = jest.fn().mockResolvedValue(warpWithMeta)
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?warp=hash:123&param1=value1&param2=value2')

    expect(mockBuilder.createFromTransactionHash).toHaveBeenCalledWith('123', undefined)
    expect(result.warp?.meta?.query).toEqual({ param1: 'value1', param2: 'value2' })
  })

  it('sets query to null when no query string exists', async () => {
    const hash64 = 'a'.repeat(64)
    const warpWithMeta = {
      ...mockWarp,
      meta: { chain: 'multiversx', identifier: hash64, query: null, hash: hash64, creator: 'erd1...', createdAt: '2024-01-01' },
    }
    mockBuilder.createFromTransactionHash = jest.fn().mockResolvedValue(warpWithMeta)
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect(hash64)

    expect(mockBuilder.createFromTransactionHash).toHaveBeenCalledWith(hash64, undefined)
    expect(result.warp?.meta?.query).toBeNull()
  })

  it('returns warp chain when warp has different chain than storage chain', async () => {
    const ethereumAdapter = {
      ...createMockAdapter(),
      chainInfo: {
        name: 'ethereum',
        displayName: 'Ethereum',
        chainId: '1',
        blockTime: 12000,
        addressHrp: '0x',
        defaultApiUrl: 'https://eth-mainnet.g.alchemy.com/v2',
        explorerUrl: 'https://etherscan.io',
        nativeToken: {
          chain: 'ethereum',
          identifier: 'ETH',
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
          logoUrl: 'https://example.com/eth-logo.png',
        },
      },
    }

    const warpWithEthereumChain = {
      ...mockWarp,
      chain: 'ethereum',
    }

    mockBuilder.createFromTransactionHash = jest.fn().mockResolvedValue(warpWithEthereumChain)
    const link = new WarpLinkDetecter(Config, [mockAdapter, ethereumAdapter] as any)
    const result = await link.detect('https://anyclient.com?warp=multiversx:hash:123')

    expect(result.match).toBe(true)
    expect(result.chain).toBe('ethereum')
    expect(result.warp).toBeDefined()
  })
})
