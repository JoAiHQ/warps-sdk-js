import { Address, Token, TokenComputer, TransactionOnNetwork } from '@multiversx/sdk-core'
import {
  AdapterWarpDataLoader,
  CacheTtl,
  WarpCache,
  WarpCacheKey,
  WarpChainAccount,
  WarpChainAction,
  WarpChainActionStatus,
  WarpChainAsset,
  WarpChainInfo,
  WarpClientConfig,
  WarpDataLoaderOptions,
} from '@joai/warps'
import { getMultiversxEntrypoint, getNormalizedTokenIdentifier, isNativeToken, toChainAddress } from './helpers/general'
import { findKnownTokenById } from './tokens'

export class WarpMultiversxDataLoader implements AdapterWarpDataLoader {
  private cache: WarpCache

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.cache = new WarpCache(config.env, config.cache)
  }

  async getAccount(address: string): Promise<WarpChainAccount> {
    const provider = getMultiversxEntrypoint(this.chain, this.config.env, this.config).createNetworkProvider()
    const chainAddress = toChainAddress(address, this.chain)
    const accountReq = await provider.getAccount(chainAddress)

    return {
      chain: this.chain.name,
      address: chainAddress.toBech32(),
      balance: accountReq.balance,
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    const provider = getMultiversxEntrypoint(this.chain, this.config.env, this.config).createNetworkProvider()
    const chainAddress = toChainAddress(address, this.chain)
    const accountReq = provider.getAccount(chainAddress)
    const tokensReq = provider.getFungibleTokensOfAccount(chainAddress)
    const [account, tokens] = await Promise.all([accountReq, tokensReq])

    let assets: WarpChainAsset[] = account.balance > 0 ? [{ ...this.chain.nativeToken, amount: account.balance }] : []

    assets.push(
      ...tokens.map(
        (token): WarpChainAsset => ({
          chain: this.chain.name,
          identifier: token.token.identifier,
          name: token.raw.name,
          symbol: token.raw.ticker,
          amount: token.amount,
          decimals: token.raw.decimals,
          logoUrl: token.raw.assets?.pngUrl || '',
          price: token.raw.price ? Number(token.raw.price) : undefined,
          supply: token.raw.supply ? BigInt(token.raw.supply) : undefined,
        })
      )
    )

    return assets
  }

  async getAsset(identifier: string): Promise<WarpChainAsset | null> {
    const cacheKey = WarpCacheKey.Asset(this.config.env, this.chain.name, identifier)
    const cachedAsset = this.cache.get<WarpChainAsset>(cacheKey)
    if (cachedAsset) return cachedAsset

    const local = findKnownTokenById(this.chain.name, this.config.env, identifier)
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

    const tokenComputer = new TokenComputer()
    const nonce = isNativeToken(identifier) ? 0n : tokenComputer.extractNonceFromExtendedIdentifier(identifier)
    const token = new Token({ identifier, nonce: BigInt(nonce || 0) })
    const _isFungible = tokenComputer.isFungible(token)

    const provider = getMultiversxEntrypoint(this.chain, this.config.env, this.config).createNetworkProvider()
    const normalizedIdentifier = getNormalizedTokenIdentifier(identifier)

    // TODO: add handling for non-fungible tokens like meta-esdts
    const tokenData = await provider.doGetGeneric(`tokens/${normalizedIdentifier}`)

    const asset: WarpChainAsset = {
      chain: this.chain.name,
      identifier: token.identifier,
      name: tokenData.name,
      symbol: tokenData.ticker,
      amount: 0n,
      decimals: tokenData.decimals,
      logoUrl: tokenData.assets?.pngUrl || null,
      price: tokenData.price ? Number(tokenData.price) : undefined,
      supply: tokenData.supply ? BigInt(tokenData.supply) : undefined,
    }

    this.cache.set(cacheKey, asset, CacheTtl.OneHour)

    return asset
  }

  async getAction(identifier: string, awaitCompleted = false): Promise<WarpChainAction | null> {
    const entrypoint = getMultiversxEntrypoint(this.chain, this.config.env, this.config)
    const tx = awaitCompleted ? await entrypoint.awaitCompletedTransaction(identifier) : await entrypoint.getTransaction(identifier)

    return {
      chain: this.chain.name,
      id: tx.hash,
      receiver: tx.receiver.toBech32(),
      sender: tx.sender.toBech32(),
      value: tx.value,
      function: tx.function,
      status: this.toActionStatus(tx),
      createdAt: this.toActionCreatedAt(tx),
      error: tx?.smartContractResults.map((r) => r.raw.returnMessage)[0] || null,
      tx,
    }
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    const provider = getMultiversxEntrypoint(this.chain, this.config.env, this.config).createNetworkProvider()

    let url = `accounts/${toChainAddress(address, this.chain).toBech32()}/transactions`
    const params = new URLSearchParams()

    const size = options?.size || 25
    const page = options?.page || 0

    if (page > 0) {
      const from = page * size
      params.append('from', from.toString())
    }

    if (size !== 25) {
      params.append('size', size.toString())
    }

    if (params.toString()) {
      url += `?${params.toString()}`
    }

    const transactions = await provider.doGetGeneric(url)

    return transactions.map((tx: any) => ({
      chain: this.chain.name,
      id: tx.txHash,
      receiver: tx.receiver,
      sender: tx.sender,
      value: tx.value,
      function: tx.function,
      status: this.toActionStatus(tx),
      createdAt: this.toActionCreatedAt(tx),
    }))
  }

  private toActionStatus(tx: TransactionOnNetwork): WarpChainActionStatus {
    if (tx.status?.isSuccessful?.()) return 'success'
    if (tx.status?.isFailed?.()) return 'failed'
    return 'pending'
  }

  private toActionCreatedAt(tx: TransactionOnNetwork): string {
    return new Date(tx.timestamp || tx.timestamp * 1000).toISOString()
  }
}
