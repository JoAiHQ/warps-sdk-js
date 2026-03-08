import { ChainAdapter, WarpCacheConfig } from './types'
import { WarpResolverResult, WarpResolver } from './types/resolver'

export class WarpChainResolver implements WarpResolver {
  constructor(private adapter: ChainAdapter) {}

  async getByAlias(alias: string, cache?: WarpCacheConfig): Promise<WarpResolverResult | null> {
    try {
      const { registryInfo, brand } = await this.adapter.registry.getInfoByAlias(alias, cache)
      if (!registryInfo) return null
      const warp = await this.adapter.builder().createFromTransactionHash(registryInfo.hash, cache)
      if (!warp) return null
      return { warp, brand, registryInfo }
    } catch {
      return null
    }
  }

  async getByHash(hash: string, cache?: WarpCacheConfig): Promise<WarpResolverResult | null> {
    try {
      const warp = await this.adapter.builder().createFromTransactionHash(hash, cache)
      if (!warp) return null
      const { registryInfo, brand } = await this.adapter.registry.getInfoByHash(hash, cache)
      return { warp, brand, registryInfo }
    } catch {
      return null
    }
  }
}
