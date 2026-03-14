import { WarpGitHubResolver } from './WarpGitHubResolver'

const mockManifest = {
  warps: [
    {
      key: 'multiversx:test-warp',
      identifier: '@multiversx:test-warp',
      alias: 'test-warp',
      chain: 'multiversx',
      hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      creator: 'github:JoAiHQ/warps',
      brand: {
        hash: 'brand-hash-123',
        protocol: 'brand:1.0.0',
        name: 'Test Brand',
        description: { en: 'Test brand description' },
        logo: 'https://example.com/logo.png',
        colors: { primary: '#000000' },
        urls: { web: 'https://example.com' },
      },
      warp: {
        protocol: 'warp:3.0.0',
        name: 'Test Warp',
        title: { en: 'Test Warp Title' },
        description: { en: 'Test description' },
        actions: [
          {
            type: 'link',
            label: { en: 'Open' },
            url: 'https://example.com',
          },
        ],
      },
    },
    {
      key: 'arbitrum:no-brand-warp',
      identifier: '@arbitrum:no-brand-warp',
      alias: 'no-brand-warp',
      chain: 'arbitrum',
      hash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      creator: 'github:JoAiHQ/warps',
      brand: null,
      warp: {
        protocol: 'warp:3.0.0',
        name: 'No Brand Warp',
        title: { en: 'No Brand' },
        description: null,
        actions: [],
      },
    },
  ],
}

describe('WarpGitHubResolver', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('resolves a warp by alias', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const result = await resolver.getByAlias('test-warp')

    expect(result).not.toBeNull()
    expect(result!.warp.name).toBe('Test Warp')
    expect(result!.warp.meta?.chain).toBe('multiversx')
    expect(result!.warp.meta?.hash).toBe('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2')
    expect(result!.registryInfo?.alias).toBe('test-warp')
    expect(result!.registryInfo?.trust).toBe('verified')
    expect(result!.brand?.name).toBe('Test Brand')
  })

  it('resolves a warp by full key (chain:alias)', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const result = await resolver.getByAlias('multiversx:test-warp')

    expect(result).not.toBeNull()
    expect(result!.warp.name).toBe('Test Warp')
  })

  it('resolves a warp by alias with @ prefix', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const result = await resolver.getByAlias('@test-warp')

    expect(result).not.toBeNull()
    expect(result!.warp.name).toBe('Test Warp')
    expect(result!.registryInfo?.alias).toBe('test-warp')
  })

  it('resolves a warp by full key with @ prefix', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const result = await resolver.getByAlias('@multiversx:test-warp')

    expect(result).not.toBeNull()
    expect(result!.warp.name).toBe('Test Warp')
  })

  it('resolves a warp by hash', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const result = await resolver.getByHash('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2')

    expect(result).not.toBeNull()
    expect(result!.warp.name).toBe('Test Warp')
  })

  it('returns null for unknown alias', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const result = await resolver.getByAlias('nonexistent')

    expect(result).toBeNull()
  })

  it('returns null for unknown hash', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const result = await resolver.getByHash('0000000000000000000000000000000000000000000000000000000000000000')

    expect(result).toBeNull()
  })

  it('handles warps without brands', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const result = await resolver.getByAlias('no-brand-warp')

    expect(result).not.toBeNull()
    expect(result!.brand).toBeNull()
    expect(result!.registryInfo?.brand).toBeNull()
  })

  it('caches manifest and reuses it', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet', refreshInterval: 60000 })

    await resolver.getByAlias('test-warp')
    await resolver.getByAlias('test-warp')
    await resolver.getByHash('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2')

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('uses correct manifest URL for environment', async () => {
    const resolver = new WarpGitHubResolver({ env: 'devnet' })
    await resolver.getByAlias('test-warp')

    expect(fetch).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/JoAiHQ/warps/dev/catalog/devnet/manifest.json'
    )
  })

  it('uses custom manifest URL when provided', async () => {
    const resolver = new WarpGitHubResolver({ manifestUrl: 'https://custom.com/manifest.json' })
    await resolver.getByAlias('test-warp')

    expect(fetch).toHaveBeenCalledWith('https://custom.com/manifest.json')
  })

  it('handles fetch failure gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 })

    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const result = await resolver.getByAlias('test-warp')

    expect(result).toBeNull()
  })

  it('sets registryInfo fields correctly for non-blockchain warps', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const result = await resolver.getByAlias('test-warp')

    expect(result!.registryInfo!.owner).toBeNull()
    expect(result!.registryInfo!.createdAt).toBeNull()
    expect(result!.registryInfo!.upgradedAt).toBeNull()
  })

  it('uses WarpCache for persistent caching when configured', async () => {
    const resolver = new WarpGitHubResolver({
      env: 'mainnet',
      cache: { type: 'memory' },
      refreshInterval: 60000,
    })

    await resolver.getByAlias('test-warp')
    expect(fetch).toHaveBeenCalledTimes(1)

    // Second call should use in-memory cache (no additional fetch)
    await resolver.getByAlias('test-warp')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('loads manifest from WarpCache on subsequent instantiations', async () => {
    // Use a unique env to avoid cache interference from other tests
    const resolver1 = new WarpGitHubResolver({
      env: 'devnet',
      cache: { type: 'memory' },
    })
    await resolver1.getByAlias('test-warp')
    expect(fetch).toHaveBeenCalledTimes(1)

    // Second resolver with same cache config reads from shared memory cache
    const resolver2 = new WarpGitHubResolver({
      env: 'devnet',
      cache: { type: 'memory' },
    })
    await resolver2.getByAlias('test-warp')
    // Should not fetch again — served from WarpCache
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
