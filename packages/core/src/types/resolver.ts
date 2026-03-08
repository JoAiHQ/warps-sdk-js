import { WarpBrand } from './brand'
import { WarpCacheConfig } from './config'
import { WarpRegistryInfo } from './registry'
import { Warp } from './warp'

export type WarpResolverResult = {
  warp: Warp
  brand: WarpBrand | null
  registryInfo: WarpRegistryInfo | null
}

export interface WarpResolver {
  getByAlias(alias: string, cache?: WarpCacheConfig): Promise<WarpResolverResult | null>
  getByHash(hash: string, cache?: WarpCacheConfig): Promise<WarpResolverResult | null>
}
