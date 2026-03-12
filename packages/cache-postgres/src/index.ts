import { Pool, type QueryResultRow } from 'pg'
import type { WarpCacheAdapter } from '@joai/warps'

const BIGINT_PREFIX = '$bigint:'
const DEFAULT_TABLE_NAME = 'warp_cache'

type CacheRow = QueryResultRow & {
  cache_key?: string
  cache_value?: string
}

type QueryResult = {
  rows: CacheRow[]
}

type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<QueryResult>
}

export type PostgresCacheAdapterOptions = {
  url?: string
  client?: Queryable
  keyPrefix: string
  tableName?: string
}

const valueReplacer = (_key: string, value: unknown): unknown => {
  if (typeof value === 'bigint') return BIGINT_PREFIX + value.toString()
  return value
}

const valueReviver = (_key: string, value: unknown): unknown => {
  if (typeof value === 'string' && value.startsWith(BIGINT_PREFIX)) {
    return BigInt(value.slice(BIGINT_PREFIX.length))
  }
  return value
}

class PostgresCacheAdapter implements WarpCacheAdapter {
  private readonly client: Queryable
  private readonly keyPrefix: string
  private readonly tableName: string
  private initPromise: Promise<void> | null = null

  constructor(options: PostgresCacheAdapterOptions) {
    this.keyPrefix = normalizeKeyPrefix(options.keyPrefix)
    this.tableName = validateSqlIdentifier(options.tableName || DEFAULT_TABLE_NAME, 'Postgres cache tableName')

    if (options.client) {
      this.client = options.client
      return
    }

    if (!options.url) {
      throw new Error('Postgres cache requires either client or url')
    }

    this.client = new Pool({
      connectionString: options.url,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    })
  }

  async get<T>(key: string): Promise<T | null> {
    await this.init()

    const cacheKey = this.getRemoteKey(assertCacheKey(key))
    const result = await this.client.query(
      `
        SELECT cache_value
        FROM "${this.tableName}"
        WHERE cache_key = $1
          AND (expires_at IS NULL OR expires_at > NOW())
      `,
      [cacheKey],
    )

    if (result.rows.length === 0) {
      await this.deleteExpiredKey(cacheKey)
      return null
    }

    try {
      return JSON.parse(String(result.rows[0]?.cache_value), valueReviver) as T
    } catch {
      throw new Error(`Failed to deserialize cache entry for key "${key}"`)
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.init()

    const cacheKey = this.getRemoteKey(assertCacheKey(key))
    const serialized = JSON.stringify(value, valueReplacer)

    await this.client.query(
      `
        INSERT INTO "${this.tableName}" (cache_key, cache_value, expires_at, updated_at)
        VALUES ($1, $2, CASE WHEN $3::INTEGER IS NULL OR $3::INTEGER <= 0 THEN NULL ELSE NOW() + ($3::INTEGER * INTERVAL '1 second') END, NOW())
        ON CONFLICT (cache_key)
        DO UPDATE SET
          cache_value = EXCLUDED.cache_value,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `,
      [cacheKey, serialized, ttlSeconds ?? null],
    )
  }

  async delete(key: string): Promise<void> {
    await this.init()
    await this.client.query(`DELETE FROM "${this.tableName}" WHERE cache_key = $1`, [this.getRemoteKey(assertCacheKey(key))])
  }

  async keys(pattern = '*'): Promise<string[]> {
    await this.init()

    const result = await this.client.query(
      `
        SELECT cache_key
        FROM "${this.tableName}"
        WHERE cache_key LIKE $1 ESCAPE '\\'
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY cache_key ASC
      `,
      [toLikePattern(this.getRemoteKey(assertCachePattern(pattern)))],
    )

    return Array.from(new Set(result.rows.map((row) => this.toLocalKey(String(row.cache_key))))).sort()
  }

  async clear(): Promise<void> {
    await this.init()
    await this.client.query(`DELETE FROM "${this.tableName}" WHERE cache_key LIKE $1 ESCAPE '\\'`, [toLikePattern(`${this.keyPrefix}*`)])
  }

  private async init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.client
        .query(
          `
            CREATE TABLE IF NOT EXISTS "${this.tableName}" (
              cache_key TEXT PRIMARY KEY,
              cache_value TEXT NOT NULL,
              expires_at TIMESTAMPTZ NULL,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
          `,
        )
        .then(async () => {
          await this.client.query(`CREATE INDEX IF NOT EXISTS "${this.tableName}_expires_at_idx" ON "${this.tableName}" (expires_at)`)
        })
        .then(() => undefined)
        .catch((error: unknown) => {
          this.initPromise = null
          throw error
        })
    }

    await this.initPromise
  }

  private async deleteExpiredKey(cacheKey: string): Promise<void> {
    await this.client.query(`DELETE FROM "${this.tableName}" WHERE cache_key = $1 AND expires_at IS NOT NULL AND expires_at <= NOW()`, [cacheKey])
  }

  private getRemoteKey(key: string): string {
    return `${this.keyPrefix}${key}`
  }

  private toLocalKey(key: string): string {
    return key.startsWith(this.keyPrefix) ? key.slice(this.keyPrefix.length) : key
  }
}

const normalizeKeyPrefix = (value: string): string => {
  const normalized = value.trim().replace(/^:+|:+$/g, '')
  if (!normalized) throw new Error('Postgres cache keyPrefix is required')
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

const toLikePattern = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/\*/g, '%')

const validateSqlIdentifier = (value: string, label: string): string => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`${label} must be a valid SQL identifier`)
  }
  return value
}

export const createPostgresCacheAdapter = (options: PostgresCacheAdapterOptions): WarpCacheAdapter => {
  return new PostgresCacheAdapter(options)
}
