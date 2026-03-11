import { WarpChainEnv } from '../types'
import { ClientCacheConfig } from '../types/cache'
import { CacheStrategy } from './CacheStrategy'

type CacheEntry<T> = {
  value: T
  expiresAt: number | null
}

export class MemoryCacheStrategy implements CacheStrategy {
  private static cache: Map<string, CacheEntry<any>> = new Map()

  constructor(env: WarpChainEnv, config?: ClientCacheConfig) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = MemoryCacheStrategy.cache.get(key)
    if (!entry) return null

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      MemoryCacheStrategy.cache.delete(key)
      return null
    }

    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null
    MemoryCacheStrategy.cache.set(key, { value, expiresAt })
  }

  async delete(key: string): Promise<void> {
    MemoryCacheStrategy.cache.delete(key)
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(MemoryCacheStrategy.cache.keys())
    if (!pattern) return allKeys

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return allKeys.filter((key) => regex.test(key))
  }

  async clear(): Promise<void> {
    MemoryCacheStrategy.cache.clear()
  }
}
