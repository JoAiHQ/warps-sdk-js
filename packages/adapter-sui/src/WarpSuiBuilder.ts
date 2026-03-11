import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import {
  AdapterWarpBuilder,
  getProviderConfig,
  getWarpWalletAddressFromConfig,
  Warp,
  WarpAdapterGenericTransaction,
  WarpBuilder,
  WarpCache,
  WarpCacheConfig,
  WarpChainInfo,
  WarpClientConfig,
} from '@joai/warps'
import { toRegistryMoveTarget } from './helpers/registry'

export class WarpSuiBuilder extends WarpBuilder implements AdapterWarpBuilder {
  private cache: WarpCache
  private client: SuiClient
  private userWallet: string | null

  constructor(
    protected readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    super(config)
    this.cache = new WarpCache(config.env, config.cache)
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    this.client = new SuiClient({ url: providerConfig.url })
    this.userWallet = getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  async createInscriptionTransaction(warp: Warp, registryObjectId?: string): Promise<WarpAdapterGenericTransaction> {
    if (!registryObjectId) throw new Error('WarpSuiBuilder: registryObjectId is required')
    if (!this.userWallet) throw new Error('WarpSuiBuilder: user address not set')
    if (!warp.meta || !warp.meta.hash) throw new Error('WarpSuiBuilder: warp.meta.hash is required')
    const hashBytes = Array.from(Buffer.from(warp.meta.hash, 'hex'))
    const alias = (warp as any).meta?.alias ?? undefined
    const brandBytes = (warp as any).meta?.brand ? Array.from(Buffer.from((warp as any).meta.brand, 'hex')) : undefined
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'register_warp'),
      arguments: [
        tx.object(registryObjectId),
        tx.pure.vector('u8', hashBytes),
        alias ? tx.pure.option('string', alias) : tx.pure.option('string', undefined),
        brandBytes ? tx.pure.option('vector<u8>', brandBytes) : tx.pure.option('vector<u8>', undefined),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  async createFromNetwork(id: string, cache?: WarpCacheConfig): Promise<Warp | null> {
    const cacheKey = `sui:warp:${id}`
    if (cache) {
      const cached = await this.cache.get<Warp>(cacheKey)
      if (cached) return cached
    }
    try {
      const info: any = await this.client.call(`${toRegistryMoveTarget(this.config.env, 'get_info_by_hash')}`, [
        id,
        Array.from(Buffer.from(id, 'hex')),
      ])
      if (!info || !Object.prototype.hasOwnProperty.call(info, 'hash') || !info.hash) return null
      const warp = this.createFromRaw(info)
      if (cache && cache.ttl && warp) {
        await this.cache.set(cacheKey, warp, cache.ttl)
      }
      return warp
    } catch {
      return null
    }
  }

  async createFromTransaction(info: any): Promise<Warp> {
    return this.createFromRaw(info)
  }

  async createFromTransactionHash(id: string, cache?: WarpCacheConfig): Promise<Warp | null> {
    return this.createFromNetwork(id, cache)
  }
}
