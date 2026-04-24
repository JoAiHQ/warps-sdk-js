import {
  ClientCacheConfig,
  Warp,
  WarpBrand,
  WarpCache,
  WarpCacheConfig,
  WarpChainEnv,
  WarpChainName,
  WarpLogger,
  WarpRegistryInfo,
  WarpResolver,
  WarpResolverResult,
  cleanWarpIdentifier,
} from '@joai/warps'
type ManifestEntry = {
  key: string
  identifier: string
  alias: string
  chain: string
  hash: string
  creator: string
  warp: Warp
  brand: (WarpBrand & { hash: string }) | null
}

export type WarpGitHubResolverConfig = {
  /** Override the default catalog manifest URL */
  manifestUrl?: string
  /** Environment determines which catalog to fetch (default: mainnet) */
  env?: WarpChainEnv
  /** Cache refresh interval in ms (default: 5 minutes) */
  refreshInterval?: number
  /** Cache config for persistent manifest caching (filesystem, localStorage, etc.) */
  cache?: ClientCacheConfig
}

const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000
const MANIFEST_CACHE_KEY = 'github-manifest'

const MANIFEST_BRANCH: Record<WarpChainEnv, string> = {
  devnet: 'dev',
  testnet: 'test',
  mainnet: 'main',
}

type CachedManifest = {
  manifest: { warps: ManifestEntry[] }
  fetchedAt: number
}

export class WarpGitHubResolver implements WarpResolver {
  private manifest: { warps: ManifestEntry[] } | null = null
  private byAlias: Map<string, ManifestEntry> = new Map()
  private byHash: Map<string, ManifestEntry> = new Map()
  private lastFetchedAt: number = 0
  private pendingFetch: Promise<void> | null = null
  private cache: WarpCache | null = null

  constructor(private config?: WarpGitHubResolverConfig) {
    if (config?.cache) {
      this.cache = new WarpCache(config.env ?? 'mainnet', config.cache)
    }
  }

  async getByAlias(alias: string, cache?: WarpCacheConfig): Promise<WarpResolverResult | null> {
    await this.ensureLoaded()
    const cleanAlias = cleanWarpIdentifier(alias)
    const entry = this.byAlias.get(cleanAlias)
    if (!entry) return null
    return this.toResolverResult(entry)
  }

  async getByHash(hash: string, cache?: WarpCacheConfig): Promise<WarpResolverResult | null> {
    await this.ensureLoaded()
    const entry = this.byHash.get(hash)
    if (!entry) return null
    return this.toResolverResult(entry)
  }

  /**
   * Bust the manifest cache — clears in-memory indexes and removes the
   * WarpCache entry so the next call re-fetches from GitHub. Useful when a
   * catalog update must propagate immediately (tests, deploys, manual ops).
   */
  async invalidate(): Promise<void> {
    this.manifest = null
    this.lastFetchedAt = 0
    this.byAlias.clear()
    this.byHash.clear()
    if (this.cache) {
      const env = this.config?.env ?? 'mainnet'
      await this.cache.delete(`${MANIFEST_CACHE_KEY}:${env}`)
    }
  }

  private async ensureLoaded(): Promise<void> {
    const now = Date.now()
    const interval = this.config?.refreshInterval ?? DEFAULT_REFRESH_INTERVAL
    if (this.manifest && (now - this.lastFetchedAt) < interval) return
    if (this.pendingFetch) return this.pendingFetch
    this.pendingFetch = this.fetchManifest()
    try {
      await this.pendingFetch
    } finally {
      this.pendingFetch = null
    }
  }

  /**
   * Populates `manifest` from WarpCache if still fresh, else from GitHub.
   *
   * Freshness is evaluated against the cache entry's *original* `fetchedAt`,
   * not the time we read it. Without this, a second resolver instance that
   * hydrates from an almost-expired cache entry would reset its own
   * `lastFetchedAt` to now and serve that manifest for another full
   * `refreshInterval` — up to 2× the intended staleness window.
   */
  private async fetchManifest(): Promise<void> {
    const env = this.config?.env ?? 'mainnet'
    const cacheKey = `${MANIFEST_CACHE_KEY}:${env}`
    const interval = this.config?.refreshInterval ?? DEFAULT_REFRESH_INTERVAL

    if (this.cache) {
      const cached = await this.cache.get<CachedManifest>(cacheKey)
      if (cached && Date.now() - cached.fetchedAt < interval) {
        this.manifest = cached.manifest
        this.buildIndexes()
        this.lastFetchedAt = cached.fetchedAt
        return
      }
    }

    const url = this.getManifestUrl()

    try {
      const response = await fetch(url)
      if (!response.ok) {
        WarpLogger.error(`WarpGitHubResolver: failed to fetch manifest (${response.status})`)
        return
      }
      const manifest = (await response.json()) as { warps: ManifestEntry[] }
      const fetchedAt = Date.now()
      this.manifest = manifest
      this.buildIndexes()
      this.lastFetchedAt = fetchedAt

      if (this.cache) {
        const ttl = Math.round(interval / 1000)
        await this.cache.set<CachedManifest>(cacheKey, { manifest, fetchedAt }, ttl)
      }
    } catch (error) {
      WarpLogger.error('WarpGitHubResolver: failed to fetch manifest', error)
    }
  }

  private getManifestUrl(): string {
    if (this.config?.manifestUrl) return this.config.manifestUrl
    const env = this.config?.env ?? 'mainnet'
    const branch = MANIFEST_BRANCH[env]
    return `https://raw.githubusercontent.com/JoAiHQ/warps/${branch}/catalog/${env}/manifest.json`
  }

  private buildIndexes(): void {
    this.byAlias.clear()
    this.byHash.clear()

    if (!this.manifest?.warps) return

    for (const entry of this.manifest.warps) {
      if (entry.key) this.byAlias.set(cleanWarpIdentifier(entry.key), entry)
      if (entry.alias) this.byAlias.set(cleanWarpIdentifier(entry.alias), entry)
      if (entry.hash) this.byHash.set(entry.hash, entry)
    }
  }

  private toResolverResult(entry: ManifestEntry): WarpResolverResult {
    const warp: Warp = {
      ...entry.warp,
      meta: {
        chain: entry.chain as WarpChainName,
        identifier: entry.identifier,
        query: null,
        hash: entry.hash,
        creator: entry.creator,
        createdAt: new Date().toISOString(),
      },
    }

    const brand = entry.brand ?? null

    const registryInfo: WarpRegistryInfo = {
      hash: entry.hash,
      alias: entry.alias,
      trust: 'verified',
      owner: null,
      createdAt: null,
      upgradedAt: null,
      brand: entry.brand?.hash ?? null,
      upgrade: null,
    }

    return { warp, brand, registryInfo }
  }
}
