import { Redis } from '@upstash/redis'
import type { WarpCacheAdapter } from '@joai/warps'

const BIGINT_PREFIX = '$bigint:'
const DEFAULT_SCAN_COUNT = 500
const DELETE_BATCH_SIZE = 100

const valueReplacer = (_key: string, value: unknown): unknown => {
  if (typeof value === 'bigint') return `${BIGINT_PREFIX}${value.toString()}`
  return value
}

const valueReviver = (_key: string, value: unknown): unknown => {
  if (typeof value === 'string' && value.startsWith(BIGINT_PREFIX)) {
    return BigInt(value.slice(BIGINT_PREFIX.length))
  }
  return value
}

type CacheEntry<T> = {
  value: T
  expiresAt: number | null
}

type UpstashLikeRedis = Pick<Redis, 'get' | 'set'> & {
  del: (...keys: string[]) => Promise<unknown>
  keys?: (pattern: string) => Promise<string[]>
  scan?: (cursor: number | string, options?: { match?: string; count?: number }) => Promise<[string, string[]] | { cursor: string; keys: string[] }>
}

export type UpstashCacheAdapterOptions = {
  url?: string
  token?: string
  keyPrefix: string
  redis?: UpstashLikeRedis
  scanCount?: number
}

class UpstashCacheAdapter implements WarpCacheAdapter {
  private readonly redis: UpstashLikeRedis
  private readonly keyPrefix: string
  private readonly scanCount: number

  constructor(options: UpstashCacheAdapterOptions) {
    this.keyPrefix = normalizeKeyPrefix(options.keyPrefix)
    this.scanCount = Math.max(1, options.scanCount ?? DEFAULT_SCAN_COUNT)

    if (options.redis) {
      this.redis = options.redis
      return
    }

    if (!options.url || !options.token) {
      throw new Error('Upstash cache requires both url and token when no redis client is provided')
    }

    this.redis = new Redis({ url: options.url, token: options.token })
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get<string>(this.getRemoteKey(assertCacheKey(key)))
    if (raw == null) return null
    try {
      return JSON.parse(raw, valueReviver) as T
    } catch (error) {
      throw new Error(`Failed to deserialize cache entry for key "${key}"`)
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const normalizedKey = this.getRemoteKey(assertCacheKey(key))
    const serialized = JSON.stringify(value, valueReplacer)
    if (ttlSeconds && ttlSeconds > 0) {
      await this.redis.set(normalizedKey, serialized, { ex: ttlSeconds } as never)
      return
    }
    await this.redis.set(normalizedKey, serialized)
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(this.getRemoteKey(assertCacheKey(key)))
  }

  async keys(pattern = '*'): Promise<string[]> {
    const remoteKeys = await this.listRemoteKeys(pattern)
    return Array.from(new Set(remoteKeys.map((key) => this.toLocalKey(key)))).sort()
  }

  async clear(): Promise<void> {
    const keys = await this.listRemoteKeys('*')
    for (let index = 0; index < keys.length; index += DELETE_BATCH_SIZE) {
      const batch = keys.slice(index, index + DELETE_BATCH_SIZE)
      if (batch.length > 0) {
        await this.redis.del(...batch)
      }
    }
  }

  private getRemoteKey(key: string): string {
    return `${this.keyPrefix}${key}`
  }

  private toLocalKey(key: string): string {
    return key.startsWith(this.keyPrefix) ? key.slice(this.keyPrefix.length) : key
  }

  private async listRemoteKeys(pattern: string): Promise<string[]> {
    const match = this.getRemoteKey(assertCachePattern(pattern))
    if (typeof this.redis.scan === 'function') {
      const keys: string[] = []
      let cursor = '0'
      do {
        const result = await this.redis.scan(cursor, { match, count: this.scanCount })
        if (Array.isArray(result)) {
          cursor = String(result[0])
          keys.push(...result[1])
        } else {
          cursor = result.cursor
          keys.push(...result.keys)
        }
      } while (cursor !== '0')
      return keys
    }
    if (typeof this.redis.keys === 'function') {
      return await this.redis.keys(match)
    }
    throw new Error('Upstash cache adapter requires redis.keys() or redis.scan() support')
  }
}

const escapeRegExp = (value: string): string => value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
const normalizeKeyPrefix = (value: string): string => {
  const normalized = value.trim().replace(/^:+|:+$/g, '')
  if (!normalized) throw new Error('Upstash cache keyPrefix is required')
  return `${normalized}:`
}

const assertCacheKey = (value: string): string => {
  if (!value || value.trim().length === 0) {
    throw new Error('Cache key must be a non-empty string')
  }
  if (value.includes('*')) {
    throw new Error('Cache key must not contain wildcard characters')
  }
  return value
}

const assertCachePattern = (value: string): string => {
  if (!value || value.trim().length === 0) return '*'
  return value
}

export const createUpstashCacheAdapter = (options: UpstashCacheAdapterOptions): WarpCacheAdapter => {
  return new UpstashCacheAdapter(options)
}
