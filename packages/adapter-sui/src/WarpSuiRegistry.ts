import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import {
  AdapterWarpRegistry,
  getProviderConfig,
  getWarpWalletAddressFromConfig,
  WarpBrand,
  WarpCache,
  WarpCacheConfig,
  WarpCacheKey,
  WarpChainInfo,
  WarpClientConfig,
  WarpLogger,
  WarpRegistryConfigInfo,
  WarpRegistryInfo,
} from '@joai/warps'
import { getSuiRegistryPackageId } from './config'
import { toRegistryMoveTarget, toTypedRegistryInfo } from './helpers/registry'

export class WarpSuiRegistry implements AdapterWarpRegistry {
  private client: SuiClient
  private cache: WarpCache
  private userWallet: string | null
  public registryConfig: WarpRegistryConfigInfo = {
    unitPrice: BigInt(0),
    admins: [],
  }

  constructor(
    private config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    this.client = new SuiClient({ url: providerConfig.url })
    this.cache = new WarpCache(config.env, config.cache)
    this.userWallet = getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  async init(): Promise<void> {
    await this.loadRegistryConfigs()
  }

  getRegistryConfig(): WarpRegistryConfigInfo {
    return this.registryConfig
  }

  private async loadRegistryConfigs(): Promise<void> {
    try {
      const moveTarget = `${getSuiRegistryPackageId(this.config.env)}::registry::get_config`
      console.log('-- Loading registry configs', moveTarget)
      const tx = new Transaction()
      tx.moveCall({
        target: moveTarget,
        arguments: [],
      })
      const result = await this.client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
      })
      console.log('-- Registry configs loaded', result)
      const returnValue = result.results?.[0]?.returnValues?.[0]
      const config = returnValue && Array.isArray(returnValue) && returnValue[0] ? JSON.parse(String.fromCharCode(...returnValue[0])) : {}
      this.registryConfig = {
        unitPrice: config.unit_price !== undefined ? BigInt(config.unit_price) : BigInt(0),
        admins: Array.isArray(config.admins) ? config.admins : [],
      }
    } catch (error) {
      WarpLogger.error('WarpSuiRegistry: Failed to load registry config', error)
      this.registryConfig = { unitPrice: BigInt(0), admins: [] }
    }
  }

  async createWarpRegisterTransaction(txHash: string, alias?: string | null, brand?: string | null): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'register_warp'),
      arguments: [
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        alias ? tx.pure.option('string', alias) : tx.pure.option('string', undefined),
        brand ? tx.pure.option('vector<u8>', Array.from(Buffer.from(brand, 'hex'))) : tx.pure.option('vector<u8>', undefined),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  async createWarpUnregisterTransaction(txHash: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'unregister_warp'),
      arguments: [tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))), tx.gas, tx.pure.address(this.userWallet)],
    })
    return tx
  }

  async createWarpUpgradeTransaction(alias: string, txHash: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'upgrade_warp'),
      arguments: [
        tx.pure.string(alias),
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  async createWarpAliasSetTransaction(txHash: string, alias: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'set_warp_alias'),
      arguments: [
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        tx.pure.string(alias),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  async createWarpVerifyTransaction(txHash: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'verify_warp'),
      arguments: [tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))), tx.gas, tx.pure.address(this.userWallet)],
    })
    return tx
  }

  async createWarpTransferOwnershipTransaction(txHash: string, newOwner: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'transfer_ownership'),
      arguments: [
        tx.pure.vector('u8', Array.from(Buffer.from(txHash, 'hex'))),
        tx.pure.address(newOwner),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  async createBrandRegisterTransaction(brand: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'register_brand'),
      arguments: [tx.pure.vector('u8', Array.from(Buffer.from(brand, 'hex'))), tx.gas, tx.pure.address(this.userWallet)],
    })
    return tx
  }

  async createWarpBrandingTransaction(warpHash: string, brandHash: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const tx = new Transaction()
    tx.moveCall({
      target: toRegistryMoveTarget(this.config.env, 'brand_warp'),
      arguments: [
        tx.pure.vector('u8', Array.from(Buffer.from(warpHash, 'hex'))),
        tx.pure.vector('u8', Array.from(Buffer.from(brandHash, 'hex'))),
        tx.gas,
        tx.pure.address(this.userWallet),
      ],
    })
    return tx
  }

  async getInfoByAlias(
    alias: string,
    cacheConfig?: WarpCacheConfig
  ): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }> {
    const cacheKey = WarpCacheKey.RegistryInfo(this.config.env, alias)
    const cached = cacheConfig ? await this.cache.get<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }>(cacheKey) : null
    if (cached) {
      WarpLogger.info(`WarpSuiRegistry (getInfoByAlias): RegistryInfo found in cache: ${alias}`)
      return cached
    }
    try {
      const res = await this.client.call(toRegistryMoveTarget(this.config.env, 'get_info_by_alias'), [alias])
      const infoView = res ? res : null
      const registryInfo = infoView ? toTypedRegistryInfo(infoView) : null
      const brand = registryInfo?.brand ? await this.fetchBrand(registryInfo.brand, cacheConfig) : null
      if (cacheConfig && cacheConfig.ttl) await this.cache.set(cacheKey, { registryInfo, brand }, cacheConfig.ttl)
      return { registryInfo, brand }
    } catch (error) {
      WarpLogger.error('WarpSuiRegistry (getInfoByAlias):', error)
      return { registryInfo: null, brand: null }
    }
  }

  async getInfoByHash(hash: string, cache?: WarpCacheConfig): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }> {
    const cacheKey = WarpCacheKey.RegistryInfo(this.config.env, hash)
    const cached = cache ? await this.cache.get<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }>(cacheKey) : null
    if (cached) {
      WarpLogger.info(`WarpSuiRegistry (getInfoByHash): RegistryInfo found in cache: ${hash}`)
      return cached
    }
    try {
      const res = await this.client.call(toRegistryMoveTarget(this.config.env, 'get_info_by_hash'), [Array.from(Buffer.from(hash, 'hex'))])
      const infoView = res ? res : null
      const registryInfo = infoView ? toTypedRegistryInfo(infoView) : null
      const brand = registryInfo?.brand ? await this.fetchBrand(registryInfo.brand, cache) : null
      if (cache && cache.ttl) await this.cache.set(cacheKey, { registryInfo, brand }, cache.ttl)
      return { registryInfo, brand }
    } catch (error) {
      WarpLogger.error('WarpSuiRegistry (getInfoByHash):', error)
      return { registryInfo: null, brand: null }
    }
  }

  async getUserWarpRegistryInfos(user?: string): Promise<WarpRegistryInfo[]> {
    const cacheKey = `sui:registry:user:${user || this.userWallet}`
    const cached = await this.cache.get<WarpRegistryInfo[]>(cacheKey)
    if (cached) {
      WarpLogger.info(`WarpSuiRegistry (getUserWarpRegistryInfos): RegistryInfos found in cache for user: ${user || this.userWallet}`)
      return cached
    }
    try {
      const userAddress = user || this.userWallet
      if (!userAddress) throw new Error('WarpRegistry: user address not set')
      const res = await this.client.call(toRegistryMoveTarget(this.config.env, 'get_user_warps'), [userAddress])
      const registryInfos = Array.isArray(res) ? res.map(toTypedRegistryInfo) : []
      if (user) await this.cache.set(cacheKey, registryInfos, 300)
      return registryInfos
    } catch (error) {
      WarpLogger.error('WarpSuiRegistry (getUserWarpRegistryInfos):', error)
      return []
    }
  }

  async getUserBrands(user?: string): Promise<WarpBrand[]> {
    const cacheKey = `sui:registry:user:brands:${user || this.userWallet}`
    const cached = await this.cache.get<WarpBrand[]>(cacheKey)
    if (cached) {
      WarpLogger.info(`WarpSuiRegistry (getUserBrands): Brands found in cache for user: ${user || this.userWallet}`)
      return cached
    }
    try {
      const userAddress = user || this.userWallet
      if (!userAddress) throw new Error('WarpRegistry: user address not set')
      const res = await this.client.call(toRegistryMoveTarget(this.config.env, 'get_user_brands'), [userAddress])
      if (!Array.isArray(res)) return []
      const brands = await Promise.all(res.map((hash: string) => this.fetchBrand(hash)))
      const filteredBrands = brands.filter((b) => b !== null) as WarpBrand[]
      if (user) await this.cache.set(cacheKey, filteredBrands, 300)
      return filteredBrands
    } catch (error) {
      WarpLogger.error('WarpSuiRegistry (getUserBrands):', error)
      return []
    }
  }

  async fetchBrand(hash: string, cacheConfig?: WarpCacheConfig): Promise<WarpBrand | null> {
    const cacheKey = WarpCacheKey.Brand(this.config.env, hash)
    const cached = cacheConfig ? await this.cache.get<WarpBrand>(cacheKey) : null
    if (cached) {
      WarpLogger.info(`WarpSuiRegistry (fetchBrand): Brand found in cache: ${hash}`)
      return cached
    }
    try {
      const tx = await this.client.getTransactionBlock({ digest: hash })
      if (!tx || !tx.effects) return null
      let brandData: any = null
      if (tx.events && Array.isArray(tx.events)) {
        for (const event of tx.events) {
          if (event.type && typeof event.type === 'string' && event.type.includes('BrandRegistered')) {
            try {
              brandData = event.parsedJson
              break
            } catch {}
          }
        }
      }
      if (!brandData && tx.objectChanges && Array.isArray(tx.objectChanges)) {
        for (const obj of tx.objectChanges) {
          if (obj.type === 'created' && obj.objectType && obj.objectType.includes('Brand')) {
            try {
              break
            } catch {}
          }
        }
      }
      if (!brandData) return null
      brandData.meta = {
        hash,
        creator: tx.transaction && tx.transaction.data && tx.transaction.data.sender ? tx.transaction.data.sender : undefined,
        createdAt: tx.timestampMs ? new Date(Number(tx.timestampMs)).toISOString() : undefined,
      }
      if (cacheConfig && cacheConfig.ttl) await this.cache.set(cacheKey, brandData, cacheConfig.ttl)
      return brandData as WarpBrand
    } catch (error) {
      WarpLogger.error('WarpSuiRegistry (fetchBrand):', error)
      return null
    }
  }
}
