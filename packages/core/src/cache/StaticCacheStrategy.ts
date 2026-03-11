import { readFileSync } from 'fs'
import { resolve } from 'path'
import { WarpChainEnv } from '../types'
import { ClientCacheConfig } from '../types/cache'
import { WarpLogger } from '../WarpLogger'
import { CacheStrategy } from './CacheStrategy'
import { valueReviver } from './helpers'

type CacheEntry<T> = {
  value: T
  expiresAt: number | null
}

export class StaticCacheStrategy implements CacheStrategy {
  private cache: Map<string, CacheEntry<any>>

  constructor(env: WarpChainEnv, config?: ClientCacheConfig) {
    const manifestPath = config?.path ? resolve(config.path) : resolve(process.cwd(), `warps-manifest-${env}.json`)
    this.cache = this.loadManifest(manifestPath)
  }

  private loadManifest(manifestPath: string): Map<string, CacheEntry<any>> {
    try {
      const data = readFileSync(manifestPath, 'utf-8')
      const cache = new Map(Object.entries(JSON.parse(data, valueReviver))) as Map<string, CacheEntry<any>>
      return cache
    } catch (error) {
      WarpLogger.warn(`StaticCacheStrategy (loadManifest): Failed to load manifest from ${manifestPath}:`, error)
      return new Map()
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    if (!entry || (entry.expiresAt !== null && Date.now() > entry.expiresAt)) {
      if (entry) {
        this.cache.delete(key)
      }
      return null
    }
    return entry.value
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
    const entry: CacheEntry<T> = { value, expiresAt }
    this.cache.set(key, entry)
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key)
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.cache.keys())
    if (!pattern) return allKeys

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return allKeys.filter((key) => regex.test(key))
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }
}
