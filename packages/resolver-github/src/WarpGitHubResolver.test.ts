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
  beforeEach(async () => {
    // Static MemoryCacheStrategy persists across tests — bust it via the
    // resolver's public invalidate() API so each test starts clean.
    for (const env of ['mainnet', 'devnet', 'testnet'] as const) {
      await new WarpGitHubResolver({ env, cache: { type: 'memory' } }).invalidate()
    }
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

  it('does not reset lastFetchedAt when hydrating from a pre-existing cache entry', async () => {
    // Regression: a second resolver reading an almost-expired cache entry
    // used to reset its own TTL window to "now", serving that stale manifest
    // for another full refreshInterval. Now we use the entry's original
    // fetchedAt, so the refresh window stays anchored to the real fetch.
    const nowSpy = jest.spyOn(Date, 'now')

    nowSpy.mockReturnValue(1_000_000)
    const resolver1 = new WarpGitHubResolver({
      env: 'testnet',
      cache: { type: 'memory' },
      refreshInterval: 60_000,
    })
    await resolver1.getByAlias('test-warp')
    expect(fetch).toHaveBeenCalledTimes(1)

    // 59 seconds later, a fresh resolver instance comes up and reads the
    // cache. The cache entry is 59s old — still within the 60s TTL.
    nowSpy.mockReturnValue(1_059_000)
    const resolver2 = new WarpGitHubResolver({
      env: 'testnet',
      cache: { type: 'memory' },
      refreshInterval: 60_000,
    })
    await resolver2.getByAlias('test-warp')
    expect(fetch).toHaveBeenCalledTimes(1)

    // 2 seconds later the cache entry is 61s old — past the refreshInterval.
    // resolver2 must re-fetch, not serve stale.
    nowSpy.mockReturnValue(1_061_000)
    await resolver2.getByAlias('test-warp')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('ignores cache entries older than refreshInterval', async () => {
    // A second resolver with a shorter refreshInterval must treat the
    // existing cache entry as stale even when the underlying WarpCache TTL
    // (set by the first resolver) has not yet expired.
    const nowSpy = jest.spyOn(Date, 'now')

    nowSpy.mockReturnValue(1_000_000)
    // First resolver writes cache with a long TTL (10 min).
    const warmer = new WarpGitHubResolver({
      env: 'mainnet',
      cache: { type: 'memory' },
      refreshInterval: 10 * 60 * 1000,
    })
    await warmer.getByAlias('test-warp')
    expect(fetch).toHaveBeenCalledTimes(1)

    nowSpy.mockReturnValue(1_000_000 + 120_000) // 2 minutes later
    // Second resolver with 60s interval — cache entry is 120s old → stale.
    const resolver = new WarpGitHubResolver({
      env: 'mainnet',
      cache: { type: 'memory' },
      refreshInterval: 60_000,
    })
    await resolver.getByAlias('test-warp')

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('invalidate() clears in-memory state and forces a network re-fetch', async () => {
    const resolver = new WarpGitHubResolver({
      env: 'mainnet',
      cache: { type: 'memory' },
      refreshInterval: 60_000,
    })

    await resolver.getByAlias('test-warp')
    expect(fetch).toHaveBeenCalledTimes(1)

    // Within refreshInterval — would normally hit the in-memory manifest.
    await resolver.invalidate()
    await resolver.getByAlias('test-warp')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('invalidate() busts the shared WarpCache entry', async () => {
    const resolver1 = new WarpGitHubResolver({
      env: 'mainnet',
      cache: { type: 'memory' },
      refreshInterval: 60_000,
    })
    await resolver1.getByAlias('test-warp')
    expect(fetch).toHaveBeenCalledTimes(1)

    await resolver1.invalidate()

    // A brand-new resolver would normally hydrate from the shared cache —
    // after invalidate() the cache is empty, so it must hit the network.
    const resolver2 = new WarpGitHubResolver({
      env: 'mainnet',
      cache: { type: 'memory' },
      refreshInterval: 60_000,
    })
    await resolver2.getByAlias('test-warp')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('deduplicates concurrent ensureLoaded calls', async () => {
    // Slow fetch so both getByAlias calls observe pendingFetch.
    let resolveFetch: (value: unknown) => void = () => {}
    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = () =>
            resolve({ ok: true, json: () => Promise.resolve(mockManifest) })
        })
    )

    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const p1 = resolver.getByAlias('test-warp')
    const p2 = resolver.getByAlias('test-warp')

    resolveFetch(null)
    await Promise.all([p1, p2])

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('clears pendingFetch even if the fetch throws', async () => {
    // First call throws — pendingFetch must be cleared so the next call can retry.
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(mockManifest) })

    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const first = await resolver.getByAlias('test-warp')
    expect(first).toBeNull()

    const second = await resolver.getByAlias('test-warp')
    expect(second).not.toBeNull()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
