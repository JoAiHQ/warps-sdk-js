import { WarpCacheConfig } from './types'
import { WarpResolverResult, WarpResolver } from './types/resolver'

export class WarpCompositeResolver implements WarpResolver {
  constructor(private resolvers: WarpResolver[]) {}

  async getByAlias(alias: string, cache?: WarpCacheConfig): Promise<WarpResolverResult | null> {
    for (const resolver of this.resolvers) {
      const result = await resolver.getByAlias(alias, cache)
      if (result) return result
    }
    return null
  }

  async getByHash(hash: string, cache?: WarpCacheConfig): Promise<WarpResolverResult | null> {
    for (const resolver of this.resolvers) {
      const result = await resolver.getByHash(hash, cache)
      if (result) return result
    }
    return null
  }
}
