import { createPostgresCacheAdapter } from './index'

class FakePgClient {
  readonly store = new Map<string, { value: string; expiresAt: number | null }>()
  tableCreated = false
  indexCreated = false

  async query(text: string, values: unknown[] = []): Promise<{ rows: Array<Record<string, unknown>> }> {
    if (text.includes('CREATE TABLE IF NOT EXISTS')) {
      this.tableCreated = true
      return { rows: [] }
    }

    if (text.includes('CREATE INDEX IF NOT EXISTS')) {
      this.indexCreated = true
      return { rows: [] }
    }

    if (text.includes('INSERT INTO')) {
      const [key, value, ttlSeconds] = values as [string, string, number | null]
      this.store.set(key, {
        value,
        expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
      })
      return { rows: [] }
    }

    if (text.includes('SELECT cache_value')) {
      const [key] = values as [string]
      const entry = this.store.get(key)
      if (!entry) return { rows: [] }
      if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
        this.store.delete(key)
        return { rows: [] }
      }
      return { rows: [{ cache_value: entry.value }] }
    }

    if (text.includes('SELECT cache_key')) {
      const [pattern] = values as [string]
      const regex = new RegExp(`^${patternToRegExp(pattern)}$`)
      const rows = Array.from(this.store.entries())
        .filter(([, entry]) => entry.expiresAt === null || entry.expiresAt > Date.now())
        .map(([cache_key]) => ({ cache_key }))
        .filter((row) => regex.test(String(row.cache_key)))
      return { rows }
    }

    if (text.includes('DELETE FROM') && text.includes('cache_key LIKE')) {
      const [pattern] = values as [string]
      const regex = new RegExp(`^${patternToRegExp(pattern)}$`)
      for (const key of this.store.keys()) {
        if (regex.test(key)) {
          this.store.delete(key)
        }
      }
      return { rows: [] }
    }

    if (text.includes('DELETE FROM') && text.includes('expires_at IS NOT NULL')) {
      const [key] = values as [string]
      const entry = this.store.get(key)
      if (entry && entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
        this.store.delete(key)
      }
      return { rows: [] }
    }

    if (text.includes('DELETE FROM')) {
      const [key] = values as [string]
      this.store.delete(key)
      return { rows: [] }
    }

    throw new Error(`Unexpected query: ${text}`)
  }
}

const patternToRegExp = (pattern: string): string => {
  let output = ''
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i]
    const next = pattern[i + 1]
    if (char === '\\' && next) {
      output += escapeRegExp(next)
      i++
      continue
    }
    if (char === '%') {
      output += '.*'
      continue
    }
    if (char === '_') {
      output += '.'
      continue
    }
    output += escapeRegExp(char)
  }
  return output
}

const escapeRegExp = (value: string): string => value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')

describe('@joai/warps-cache-postgres', () => {
  let client: FakePgClient

  beforeEach(() => {
    client = new FakePgClient()
  })

  it('stores and retrieves values through the Postgres adapter', async () => {
    const cache = createPostgresCacheAdapter({ keyPrefix: 'warps:test', client: client as never })

    await cache.set('foo', { value: 'bar' }, 60)

    await expect(cache.get<{ value: string }>('foo')).resolves.toEqual({ value: 'bar' })
    expect(client.tableCreated).toBe(true)
    expect(client.indexCreated).toBe(true)
  })

  it('round-trips bigint values', async () => {
    const cache = createPostgresCacheAdapter({ keyPrefix: 'warps:test', client: client as never })

    await cache.set('bigint', { amount: 12345678901234567890n }, 60)

    await expect(cache.get<{ amount: bigint }>('bigint')).resolves.toEqual({ amount: 12345678901234567890n })
  })

  it('deletes values', async () => {
    const cache = createPostgresCacheAdapter({ keyPrefix: 'warps:test', client: client as never })

    await cache.set('foo', 'bar', 60)
    await cache.delete('foo')

    await expect(cache.get('foo')).resolves.toBeNull()
  })

  it('lists and clears prefixed keys only', async () => {
    const cache = createPostgresCacheAdapter({ keyPrefix: 'warps:test', client: client as never })
    const other = createPostgresCacheAdapter({ keyPrefix: 'warps:other', client: client as never })

    await cache.set('alpha', 'a', 60)
    await cache.set('beta', 'b', 60)
    await other.set('gamma', 'c', 60)

    await expect(cache.keys('*')).resolves.toEqual(['alpha', 'beta'])

    await cache.clear()

    await expect(cache.keys('*')).resolves.toEqual([])
    await expect(other.get('gamma')).resolves.toBe('c')
  })

  it('normalizes prefixes and rejects invalid config', async () => {
    const cache = createPostgresCacheAdapter({ keyPrefix: '  warps:test  ', client: client as never })
    await cache.set('foo', 'bar', 60)
    await expect(cache.keys('*')).resolves.toEqual(['foo'])
    expect(() => createPostgresCacheAdapter({ keyPrefix: '   ', client: client as never })).toThrow('keyPrefix')
    expect(() => createPostgresCacheAdapter({ keyPrefix: 'warps:test', tableName: 'bad-table', client: client as never })).toThrow('tableName')
  })

  it('rejects wildcard cache keys for direct reads and writes', async () => {
    const cache = createPostgresCacheAdapter({ keyPrefix: 'warps:test', client: client as never })
    await expect(cache.set('bad*key', 'x', 60)).rejects.toThrow('wildcard')
    await expect(cache.get('bad*key')).rejects.toThrow('wildcard')
  })

  it('requires either a postgres client or url', () => {
    expect(() => createPostgresCacheAdapter({ keyPrefix: 'warps:test' })).toThrow('client or url')
  })
})
