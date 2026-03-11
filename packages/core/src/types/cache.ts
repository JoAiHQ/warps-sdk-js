export interface WarpCacheAdapter {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
  delete(key: string): Promise<void>
  keys(pattern?: string): Promise<string[]>
  clear(): Promise<void>
}

export type ClientCacheConfig = {
  ttl?: number
  type?: WarpCacheType
  path?: string
  adapter?: WarpCacheAdapter
}

export type WarpCacheType = 'memory' | 'localStorage' | 'static' | 'filesystem'
