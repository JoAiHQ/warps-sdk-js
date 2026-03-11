import { SuiClient } from '@mysten/sui/client'
import {
  AdapterWarpBuilder,
  getProviderConfig,
  Warp,
  WarpAdapterGenericTransaction,
  WarpBuilder,
  WarpCache,
  WarpCacheConfig,
  WarpChainInfo,
  WarpClientConfig,
} from '@joai/warps'

export class WarpSuiBuilder extends WarpBuilder implements AdapterWarpBuilder {
  private cache: WarpCache
  private client: SuiClient

  constructor(
    protected readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    super(config)
    this.cache = new WarpCache(config.env, config.cache)
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    this.client = new SuiClient({ url: providerConfig.url })
  }

  async createInscriptionTransaction(_warp: Warp): Promise<WarpAdapterGenericTransaction> {
    throw new Error('WarpSuiBuilder: on-chain inscription is not supported for Sui')
  }

  async createFromTransaction(info: any): Promise<Warp> {
    return this.createFromRaw(info)
  }

  async createFromTransactionHash(_id: string, _cache?: WarpCacheConfig): Promise<Warp | null> {
    return null
  }
}
