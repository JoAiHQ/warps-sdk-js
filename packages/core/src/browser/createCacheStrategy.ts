import { LocalStorageCacheStrategy } from '../cache/LocalStorageCacheStrategy'
import { MemoryCacheStrategy } from '../cache/MemoryCacheStrategy'
import type { CacheStrategy } from '../cache/CacheStrategy'
import type { WarpChainEnv } from '../types'
import type { ClientCacheConfig } from '../types/cache'

export function createCacheStrategy(env: WarpChainEnv, config?: ClientCacheConfig): CacheStrategy {
  if (config?.adapter) return config.adapter
  if (config?.type === 'localStorage') return new LocalStorageCacheStrategy(env, config)
  if (config?.type === 'memory') return new MemoryCacheStrategy(env, config)
  if (config?.type === 'static' || config?.type === 'filesystem') {
    throw new Error(`WarpCache: "${config.type}" cache is only available in Node.js`)
  }
  if (typeof window !== 'undefined' && window.localStorage) return new LocalStorageCacheStrategy(env, config)
  return new MemoryCacheStrategy(env, config)
}
