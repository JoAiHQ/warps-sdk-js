import { FileSystemCacheStrategy } from './FileSystemCacheStrategy'
import { LocalStorageCacheStrategy } from './LocalStorageCacheStrategy'
import { MemoryCacheStrategy } from './MemoryCacheStrategy'
import { StaticCacheStrategy } from './StaticCacheStrategy'
import type { CacheStrategy } from './CacheStrategy'
import type { WarpChainEnv } from '../types'
import type { ClientCacheConfig } from '../types/cache'

export function createCacheStrategy(env: WarpChainEnv, config?: ClientCacheConfig): CacheStrategy {
  if (config?.adapter) return config.adapter
  if (config?.type === 'localStorage') return new LocalStorageCacheStrategy(env, config)
  if (config?.type === 'memory') return new MemoryCacheStrategy(env, config)
  if (config?.type === 'static') return new StaticCacheStrategy(env, config)
  if (config?.type === 'filesystem') return new FileSystemCacheStrategy(env, config)
  if (typeof window !== 'undefined' && window.localStorage) return new LocalStorageCacheStrategy(env, config)
  return new MemoryCacheStrategy(env, config)
}
