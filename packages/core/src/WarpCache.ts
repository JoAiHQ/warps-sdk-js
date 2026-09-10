import type { CacheStrategy } from './cache/CacheStrategy'
import { createCacheStrategy } from './cache/createCacheStrategy'
import { WarpChainEnv } from './types'
import { ClientCacheConfig } from './types/cache'

export const CacheTtl = {
  OneMinute: 60,
  OneHour: 60 * 60,
  OneDay: 60 * 60 * 24,
  OneWeek: 60 * 60 * 24 * 7,
  OneMonth: 60 * 60 * 24 * 30,
  OneYear: 60 * 60 * 24 * 365,
}

export const WarpCacheKey = {
  Warp: (env: WarpChainEnv, id: string) => `warp:${env}:${id}`,
  WarpAbi: (env: WarpChainEnv, id: string) => `warp-abi:${env}:${id}`,
  WarpExecutable: (env: WarpChainEnv, id: string, action: number) => `warp-exec:${env}:${id}:${action}`,
  RegistryInfo: (env: WarpChainEnv, id: string) => `registry-info:${env}:${id}`,
  Brand: (env: WarpChainEnv, hash: string) => `brand:${env}:${hash}`,
  Asset: (env: WarpChainEnv, chain: string, identifier: string) => `asset:${env}:${chain}:${identifier}`,
  AccountNfts: (env: WarpChainEnv, chain: string, address: string, page: number, size: number) => `account-nfts:${env}:${chain}:${address}:${page}:${size}`,
}

export class WarpCache {
  private strategy: CacheStrategy

  constructor(env: WarpChainEnv, config?: ClientCacheConfig) {
    this.strategy = createCacheStrategy(env, config)
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.strategy.set(key, value, ttlSeconds)
  }

  async get<T>(key: string): Promise<T | null> {
    return await this.strategy.get(key)
  }

  async delete(key: string): Promise<void> {
    await this.strategy.delete(key)
  }

  async keys(pattern?: string): Promise<string[]> {
    return await this.strategy.keys(pattern)
  }

  async clear(): Promise<void> {
    await this.strategy.clear()
  }
}
