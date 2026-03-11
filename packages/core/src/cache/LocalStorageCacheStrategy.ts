import { WarpChainEnv } from '../types'
import { ClientCacheConfig } from '../types/cache'
import { CacheStrategy } from './CacheStrategy'
import { valueReviver, valueReplacer } from './helpers'

type CacheEntry<T> = {
  value: T
  expiresAt: number | null
}

export class LocalStorageCacheStrategy implements CacheStrategy {
  private readonly prefix: string

  constructor(env: WarpChainEnv, config?: ClientCacheConfig) {
    this.prefix = 'warp-cache'
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const entryStr = localStorage.getItem(this.getKey(key))
      if (!entryStr) return null

      const entry: CacheEntry<T> = JSON.parse(entryStr, valueReviver)
      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        localStorage.removeItem(this.getKey(key))
        return null
      }

      return entry.value
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    }
    localStorage.setItem(this.getKey(key), JSON.stringify(entry, valueReplacer))
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.getKey(key))
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith(this.prefix + ':')) continue
      allKeys.push(key.slice(this.prefix.length + 1))
    }
    if (!pattern) return allKeys

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return allKeys.filter((key) => regex.test(key))
  }

  async clear(): Promise<void> {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.prefix)) {
        localStorage.removeItem(key)
      }
    }
  }
}
