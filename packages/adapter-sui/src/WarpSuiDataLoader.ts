// @ts-ignore - Sui SDK has ESM compatibility issues but this is production code
import { SuiClient } from '@mysten/sui/client'
import {
  AdapterWarpDataLoader,
  CacheTtl,
  getProviderConfig,
  WarpCache,
  WarpCacheKey,
  WarpChainAccount,
  WarpChainAction,
  WarpChainAsset,
  WarpChainInfo,
  WarpClientConfig,
  WarpDataLoaderOptions,
} from '@joai/warps'
import { findKnownTokenById } from './tokens'

export class WarpSuiDataLoader implements AdapterWarpDataLoader {
  public client: SuiClient
  private cache: WarpCache

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    this.client = new SuiClient({ url: providerConfig.url })
    this.cache = new WarpCache(config.env, config.cache)
  }

  async getAccount(address: string): Promise<WarpChainAccount> {
    const balance = await this.client.getBalance({
      owner: address,
      coinType: '0x2::sui::SUI',
    })

    return { chain: this.chain.name, address, balance: BigInt(balance.totalBalance) }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    const allBalances = await this.client.getAllBalances({ owner: address })
    console.log('WarpSuiDataLoader.getAccountAssets', allBalances)

    const suiBalance = allBalances.find((balance: any) => balance.coinType === '0x2::sui::SUI')
    const tokenBalances = allBalances.filter((balance: any) => balance.coinType !== '0x2::sui::SUI' && BigInt(balance.totalBalance) > 0n)

    const assets: WarpChainAsset[] = []
    if (suiBalance && BigInt(suiBalance.totalBalance) > 0n) {
      assets.push({ ...this.chain.nativeToken, amount: BigInt(suiBalance.totalBalance) })
    }

    if (tokenBalances.length > 0) {
      const tokenAssets = await Promise.all(tokenBalances.map((balance: any) => this.getAsset(balance.coinType)))
      assets.push(
        ...tokenAssets
          .filter((asset: any) => asset !== null)
          .map((asset: any) => ({
            ...asset,
            amount: BigInt(tokenBalances.find((b: any) => b.coinType === asset.identifier)?.totalBalance || 0),
          }))
      )
    }

    return assets
  }

  async getAsset(identifier: string): Promise<WarpChainAsset | null> {
    const cacheKey = WarpCacheKey.Asset(this.config.env, this.chain.name, identifier)
    const cachedAsset = await this.cache.get<WarpChainAsset>(cacheKey)
    if (cachedAsset) return cachedAsset

    const local = findKnownTokenById(identifier)
    if (local)
      return {
        chain: this.chain.name,
        identifier,
        name: local.name,
        symbol: local.symbol,
        amount: 0n,
        decimals: local.decimals,
        logoUrl: local.logoUrl,
      }

    try {
      const metadata = await this.client.getCoinMetadata({ coinType: identifier })
      const asset: WarpChainAsset = {
        chain: this.chain.name,
        identifier,
        name: metadata?.name || identifier.split('::').pop() || identifier,
        symbol: metadata?.symbol || identifier.split('::').pop() || identifier,
        amount: 0n,
        decimals: metadata?.decimals || 9,
        logoUrl: metadata?.iconUrl || '',
      }
      await this.cache.set(cacheKey, asset, CacheTtl.OneHour)
      return asset
    } catch (error) {
      // If token metadata is not found, return null
      return null
    }
  }

  async getAccountNfts(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAsset[]> {
    try {
      const size = options?.size || 25
      const page = options?.page || 0

      let cursor: string | null | undefined = undefined
      for (let i = 0; i < page; i++) {
        const result = await this.client.getOwnedObjects({
          owner: address,
          options: { showContent: false, showDisplay: false },
          limit: size,
          cursor,
        })
        cursor = result.nextCursor
        if (!result.hasNextPage) return []
      }

      const result = await this.client.getOwnedObjects({
        owner: address,
        options: { showContent: true, showDisplay: true },
        limit: size,
        cursor,
      })

      const nfts: WarpChainAsset[] = []
      for (const obj of result.data) {
        const content = (obj.data as any)?.content
        const display = (obj.data as any)?.display?.data
        const objectType: string = content?.type || ''

        if (objectType.startsWith('0x2::coin::Coin')) continue

        const objectId = obj.data?.objectId || ''
        const name = display?.name || objectType.split('::').pop() || objectId.slice(0, 8)
        const collection = objectType.includes('::') ? objectType.split('::').slice(0, 2).join('::') : undefined
        const imageUrl = display?.image_url

        nfts.push({
          chain: this.chain.name,
          identifier: objectId,
          name,
          symbol: '',
          amount: 1n,
          decimals: 0,
          type: 'nft',
          nft: {
            collection,
            mediaUrl: imageUrl,
            thumbnailUrl: imageUrl,
          },
        })
      }

      return nfts
    } catch {
      return []
    }
  }

  async getAction(identifier: string, awaitCompleted = false): Promise<WarpChainAction | null> {
    return null
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    return []
  }
}
