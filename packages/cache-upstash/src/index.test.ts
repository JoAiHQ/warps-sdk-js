import { createUpstashCacheAdapter } from './index'

class FakeRedis {
  private readonly store = new Map<string, { value: string; expiresAt: number | null }>()

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return null
    }
    return entry.value as T
  }

  async set(key: string, value: string, options?: { ex?: number }): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: options?.ex ? Date.now() + options.ex * 1000 : null,
    })
  }

  async del(...keys: string[]): Promise<void> {
    for (const key of keys) {
      this.store.delete(key)
    }
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(`^${pattern.split('*').map(escapeRegExp).join('.*')}$`)
    return Array.from(this.store.keys()).filter((key) => regex.test(key))
  }

}

const escapeRegExp = (value: string): string => value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')

describe('@joai/warps-cache-upstash', () => {
  let redis: FakeRedis

  beforeEach(() => {
    redis = new FakeRedis()
  })

  it('stores and retrieves values through the Upstash adapter', async () => {
    const cache = createUpstashCacheAdapter({ keyPrefix: 'warps:test', redis: redis as never })

    await cache.set('foo', { value: 'bar' }, 60)

    await expect(cache.get<{ value: string }>('foo')).resolves.toEqual({ value: 'bar' })
  })

  it('round-trips bigint values', async () => {
    const cache = createUpstashCacheAdapter({ keyPrefix: 'warps:test', redis: redis as never })

    await cache.set('bigint', { amount: 12345678901234567890n }, 60)

    await expect(cache.get<{ amount: bigint }>('bigint')).resolves.toEqual({ amount: 12345678901234567890n })
  })

  it('deletes values', async () => {
    const cache = createUpstashCacheAdapter({ keyPrefix: 'warps:test', redis: redis as never })

    await cache.set('foo', 'bar', 60)
    await cache.delete('foo')

    await expect(cache.get('foo')).resolves.toBeNull()
  })

  it('lists and clears prefixed keys only', async () => {
    const cache = createUpstashCacheAdapter({ keyPrefix: 'warps:test', redis: redis as never })
    const other = createUpstashCacheAdapter({ keyPrefix: 'warps:other', redis: redis as never })

    await cache.set('alpha', 'a', 60)
    await cache.set('beta', 'b', 60)
    await other.set('gamma', 'c', 60)

    await expect(cache.keys('*')).resolves.toEqual(['alpha', 'beta'])

    await cache.clear()

    await expect(cache.keys('*')).resolves.toEqual([])
    await expect(other.get('gamma')).resolves.toBe('c')
  })

  it('normalizes prefixes and rejects empty config', async () => {
    const cache = createUpstashCacheAdapter({ keyPrefix: '  warps:test  ', redis: redis as never })
    await cache.set('foo', 'bar', 60)
    await expect(cache.keys('*')).resolves.toEqual(['foo'])
    expect(() => createUpstashCacheAdapter({ keyPrefix: '   ', redis: redis as never })).toThrow('keyPrefix')
  })

  it('rejects wildcard cache keys for direct reads and writes', async () => {
    const cache = createUpstashCacheAdapter({ keyPrefix: 'warps:test', redis: redis as never })
    await expect(cache.set('bad*key', 'x', 60)).rejects.toThrow('wildcard')
    await expect(cache.get('bad*key')).rejects.toThrow('wildcard')
  })
})
