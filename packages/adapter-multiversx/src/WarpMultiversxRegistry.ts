import {
  AbiRegistry,
  Address,
  AddressValue,
  BytesValue,
  SmartContractController,
  SmartContractTransactionsFactory,
  Transaction,
  TransactionsFactoryConfig,
} from '@multiversx/sdk-core'
import {
  AdapterWarpRegistry,
  createWarpIdentifier,
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
import RegistryAbi from './abis/registry.abi.json'
import { getMultiversxRegistryAddress } from './config'
import { getMultiversxEntrypoint } from './helpers/general'
import { toTypedConfigInfo, toTypedRegistryInfo } from './helpers/registry'

export class WarpMultiversxRegistry implements AdapterWarpRegistry {
  private cache: WarpCache
  private userWallet: string | null
  public registryConfig: WarpRegistryConfigInfo

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    this.cache = new WarpCache(config.env, config.cache)
    this.registryConfig = {
      unitPrice: BigInt(0),
      admins: [],
    }
    this.userWallet = getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  async init(): Promise<void> {
    await this.loadRegistryConfigs()
  }

  getRegistryConfig(): WarpRegistryConfigInfo {
    return this.registryConfig
  }

  async createWarpRegisterTransaction(txHash: string, alias?: string | null, brand?: string | null): Promise<Transaction> {
    if (this.registryConfig.unitPrice === BigInt(0)) throw new Error('WarpRegistry: config not loaded. forgot to call init()?')
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    const calculateCostAmount = (): bigint => {
      if (this.isCurrentUserAdmin()) return BigInt(0)
      if (alias && brand) return this.registryConfig.unitPrice * BigInt(3)
      if (alias) return this.registryConfig.unitPrice * BigInt(2)
      return this.registryConfig.unitPrice
    }

    const buildArgs = (): BytesValue[] => {
      if (alias && brand) return [BytesValue.fromHex(txHash), BytesValue.fromUTF8(alias), BytesValue.fromHex(brand)]
      if (alias) return [BytesValue.fromHex(txHash), BytesValue.fromUTF8(alias)]
      return [BytesValue.fromHex(txHash)]
    }

    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'registerWarp',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: calculateCostAmount(),
      arguments: buildArgs(),
    })
  }

  async createWarpUnregisterTransaction(txHash: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)
    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'unregisterWarp',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromHex(txHash)],
    })
  }

  async createWarpUpgradeTransaction(alias: string, txHash: string, brand?: string | null): Promise<Transaction> {
    if (this.registryConfig.unitPrice === BigInt(0)) throw new Error('WarpRegistry: config not loaded. forgot to call init()?')
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'upgradeWarp',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.isCurrentUserAdmin() ? undefined : this.registryConfig.unitPrice,
      arguments: brand
        ? [BytesValue.fromUTF8(alias), BytesValue.fromHex(txHash), BytesValue.fromHex(brand)]
        : [BytesValue.fromUTF8(alias), BytesValue.fromHex(txHash)],
    })
  }

  async createWarpAliasSetTransaction(txHash: string, alias: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'setWarpAlias',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.isCurrentUserAdmin() ? undefined : this.registryConfig.unitPrice,
      arguments: [BytesValue.fromHex(txHash), BytesValue.fromUTF8(alias)],
    })
  }

  async createWarpVerifyTransaction(txHash: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'verifyWarp',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromHex(txHash)],
    })
  }

  async createWarpTransferOwnershipTransaction(txHash: string, newOwner: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'transferOwnership',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromHex(txHash), new AddressValue(new Address(newOwner))],
    })
  }

  async createBrandRegisterTransaction(txHash: string): Promise<Transaction> {
    if (this.registryConfig.unitPrice === BigInt(0)) throw new Error('WarpRegistry: config not loaded. forgot to call init()?')
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'registerBrand',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.isCurrentUserAdmin() ? undefined : this.registryConfig.unitPrice,
      arguments: [BytesValue.fromHex(txHash)],
    })
  }

  async createWarpBrandingTransaction(warpHash: string, brandHash: string): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpRegistry: user address not set')
    const sender = Address.newFromBech32(this.userWallet)

    return await this.getFactory().createTransactionForExecute(sender, {
      contract: Address.newFromBech32(getMultiversxRegistryAddress(this.config.env)),
      function: 'brandWarp',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.isCurrentUserAdmin() ? undefined : this.registryConfig.unitPrice,
      arguments: [BytesValue.fromHex(warpHash), BytesValue.fromHex(brandHash)],
    })
  }

  async getInfoByAlias(
    alias: string,
    cache?: WarpCacheConfig
  ): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }> {
    try {
      const cacheKey = WarpCacheKey.RegistryInfo(this.config.env, alias)
      const cached = cache ? await this.cache.get<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }>(cacheKey) : null
      if (cached) {
        WarpLogger.info(`WarpRegistry (getInfoByAlias): RegistryInfo found in cache: ${alias}`)
        return cached
      }

      const contract = Address.newFromBech32(getMultiversxRegistryAddress(this.config.env))
      const controller = this.getController()
      const query = controller.createQuery({ contract, function: 'getInfoByAlias', arguments: [BytesValue.fromUTF8(alias)] })
      const res = await controller.runQuery(query)
      const [registryInfoRaw] = controller.parseQueryResponse(res)
      const registryInfo = registryInfoRaw ? toTypedRegistryInfo(registryInfoRaw) : null
      const brand = registryInfo?.brand ? await this.fetchBrand(registryInfo.brand) : null

      if (cache && cache.ttl) {
        await this.cache.set(cacheKey, { registryInfo, brand }, cache.ttl)
      }

      return { registryInfo, brand }
    } catch (error) {
      return { registryInfo: null, brand: null }
    }
  }

  async getInfoByHash(hash: string, cache?: WarpCacheConfig): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }> {
    try {
      const cacheKey = WarpCacheKey.RegistryInfo(this.config.env, hash)

      if (cache) {
        const cached = await this.cache.get<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }>(cacheKey)
        if (cached) {
          WarpLogger.info(`WarpRegistry (getInfoByHash): RegistryInfo found in cache: ${hash}`)
          return cached
        }
      }

      const contract = Address.newFromBech32(getMultiversxRegistryAddress(this.config.env))
      const controller = this.getController()
      const query = controller.createQuery({ contract, function: 'getInfoByHash', arguments: [BytesValue.fromHex(hash)] })
      const res = await controller.runQuery(query)
      const [registryInfoRaw] = controller.parseQueryResponse(res)
      const registryInfo = registryInfoRaw ? toTypedRegistryInfo(registryInfoRaw) : null
      const brand = registryInfo?.brand ? await this.fetchBrand(registryInfo.brand) : null

      if (cache && cache.ttl) {
        await this.cache.set(cacheKey, { registryInfo, brand }, cache.ttl)
      }

      return { registryInfo, brand }
    } catch (error) {
      return { registryInfo: null, brand: null }
    }
  }

  async getUserWarpRegistryInfos(user?: string): Promise<WarpRegistryInfo[]> {
    try {
      const userWallet = user || this.userWallet
      if (!userWallet) throw new Error('WarpRegistry: user address not set')
      const contract = Address.newFromBech32(getMultiversxRegistryAddress(this.config.env))
      const controller = this.getController()
      const query = controller.createQuery({ contract, function: 'getUserWarps', arguments: [new AddressValue(new Address(userWallet))] })
      const res = await controller.runQuery(query)
      const [registryInfosRaw] = controller.parseQueryResponse(res)
      return registryInfosRaw.map(toTypedRegistryInfo)
    } catch (error) {
      return []
    }
  }

  async getUserBrands(user?: string): Promise<WarpBrand[]> {
    try {
      const userWallet = user || this.userWallet
      if (!userWallet) throw new Error('WarpRegistry: user address not set')
      const contract = Address.newFromBech32(getMultiversxRegistryAddress(this.config.env))
      const controller = this.getController()
      const query = controller.createQuery({ contract, function: 'getUserBrands', arguments: [new AddressValue(new Address(userWallet))] })
      const res = await controller.runQuery(query)
      const [brandsRaw] = controller.parseQueryResponse(res)
      const brandHashes: string[] = brandsRaw.map((b: any) => b.toString('hex'))
      const brandCacheConfig: WarpCacheConfig = { ttl: 365 * 24 * 60 * 60 } // 1 year
      const brands = await Promise.all(brandHashes.map((hash) => this.fetchBrand(hash, brandCacheConfig)))
      return brands.filter((b) => b !== null) as WarpBrand[]
    } catch (error) {
      return []
    }
  }

  async fetchBrand(hash: string, cache?: WarpCacheConfig): Promise<WarpBrand | null> {
    const cacheKey = WarpCacheKey.Brand(this.config.env, hash)
    const cached = cache ? await this.cache.get<WarpBrand>(cacheKey) : null
    if (cached) {
      WarpLogger.info(`WarpRegistry (fetchBrand): Brand found in cache: ${hash}`)
      return cached
    }

    const chainEntry = getMultiversxEntrypoint(this.chain, this.config.env, this.config)
    const chainProvider = chainEntry.createNetworkProvider()

    try {
      const tx = await chainProvider.getTransaction(hash)
      const brand = JSON.parse(tx.data.toString()) as WarpBrand

      brand.meta = {
        query: null,
        chain: this.chain.name,
        identifier: createWarpIdentifier(this.chain.name, 'hash', hash),
        hash: tx.hash,
        creator: tx.sender.toBech32(),
        createdAt: new Date(tx.timestamp * 1000).toISOString(),
      }

      if (cache && cache.ttl) {
        await this.cache.set(cacheKey, brand, cache.ttl)
      }

      return brand
    } catch (error) {
      return null
    }
  }

  private async loadRegistryConfigs(): Promise<void> {
    const contract = Address.newFromBech32(getMultiversxRegistryAddress(this.config.env))
    const controller = this.getController()
    const [configInfoRaw] = await controller.query({ contract, function: 'getConfig', arguments: [] })
    const configInfo = configInfoRaw ? toTypedConfigInfo(configInfoRaw) : null

    this.registryConfig = configInfo || { unitPrice: BigInt(0), admins: [] }
  }

  private getFactory(): SmartContractTransactionsFactory {
    const config = new TransactionsFactoryConfig({ chainID: this.chain.chainId })
    const abi = AbiRegistry.create(RegistryAbi)
    return new SmartContractTransactionsFactory({ config, abi })
  }

  private getController(): SmartContractController {
    const entrypoint = getMultiversxEntrypoint(this.chain, this.config.env, this.config)
    const abi = AbiRegistry.create(RegistryAbi)
    return entrypoint.createSmartContractController(abi)
  }

  private isCurrentUserAdmin(): boolean {
    return !!this.userWallet && this.registryConfig.admins.includes(this.userWallet)
  }
}
