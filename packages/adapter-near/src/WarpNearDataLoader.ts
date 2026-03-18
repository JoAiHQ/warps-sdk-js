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
import { WarpNearConstants } from './constants'
import { createNearAccount, createNearProvider } from './near'
import { findKnownTokenById, getKnownTokensForChain } from './tokens'

type NearFtMetadata = {
  name?: string
  symbol?: string
  decimals?: number
  icon?: string
}

export class WarpNearDataLoader implements AdapterWarpDataLoader {
  private cache: WarpCache
  private nearConfig: any

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.cache = new WarpCache(config.env, config.cache)
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)

    this.nearConfig = {
      networkId: this.config.env === 'mainnet' ? 'mainnet' : this.config.env === 'testnet' ? 'testnet' : 'testnet',
      nodeUrl: providerConfig.url,
    }
  }

  async getAccount(address: string): Promise<WarpChainAccount> {
    try {
      const account = createNearAccount(this.nearConfig, address)
      const balanceBigInt = (await account.getState()).balance.total

      return {
        chain: this.chain.name,
        address,
        balance: balanceBigInt,
      }
    } catch (error) {
      throw new Error(`Failed to get account: ${error}`)
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    try {
      const account = await this.getAccount(address)
      const assets: WarpChainAsset[] = account.balance > 0n ? [{ ...this.chain.nativeToken, amount: account.balance }] : []

      const env = this.config.env === 'mainnet' ? 'mainnet' : this.config.env === 'devnet' ? 'devnet' : 'testnet'
      const knownTokens = getKnownTokensForChain(this.chain.name, env)

      for (const token of knownTokens) {
        try {
          const accountObj = createNearAccount(this.nearConfig, address)
          const balance = await accountObj.callFunction<string>({
            contractId: token.identifier,
            methodName: 'ft_balance_of',
            args: { account_id: address },
          })
          if (balance && BigInt(balance) > 0n) {
            assets.push({
              ...token,
              amount: BigInt(balance),
            })
          }
        } catch {
          // Token contract might not exist or method might not be available
        }
      }

      return assets
    } catch (error) {
      return []
    }
  }

  async getAsset(identifier: string): Promise<WarpChainAsset | null> {
    try {
      if (identifier === this.chain.nativeToken.identifier || identifier === WarpNearConstants.NativeToken.Identifier) {
        return this.chain.nativeToken
      }

      const cacheKey = WarpCacheKey.Asset(this.config.env, this.chain.name, identifier)
      const cachedAsset = await this.cache.get<WarpChainAsset>(cacheKey)
      if (cachedAsset) {
        return cachedAsset
      }

      const env = this.config.env === 'mainnet' ? 'mainnet' : this.config.env === 'devnet' ? 'devnet' : 'testnet'
      const knownToken = findKnownTokenById(this.chain.name, env, identifier)

      if (knownToken) {
        return {
          chain: this.chain.name,
          identifier,
          name: knownToken.name,
          symbol: knownToken.symbol,
          amount: 0n,
          decimals: knownToken.decimals,
          logoUrl: knownToken.logoUrl,
        }
      }

      try {
        const account = createNearAccount(this.nearConfig, identifier)
        const metadata = await account.callFunction<NearFtMetadata>({
          contractId: identifier,
          methodName: 'ft_metadata',
          args: {},
        })

        const asset: WarpChainAsset = {
          chain: this.chain.name,
          identifier,
          name: metadata.name || 'Unknown Token',
          symbol: metadata.symbol || 'UNKNOWN',
          amount: 0n,
          decimals: metadata.decimals || WarpNearConstants.NativeToken.Decimals,
          logoUrl: metadata.icon || '',
        }

        await this.cache.set(cacheKey, asset, CacheTtl.OneHour)

        return asset
      } catch {
        const asset: WarpChainAsset = {
          chain: this.chain.name,
          identifier,
          name: 'Unknown Token',
          symbol: 'UNKNOWN',
          amount: 0n,
          decimals: WarpNearConstants.NativeToken.Decimals,
          logoUrl: '',
        }

        return asset
      }
    } catch (error) {
      return null
    }
  }

  async getAction(identifier: string, awaitCompleted = false): Promise<WarpChainAction | null> {
    try {
      const provider = createNearProvider(this.nearConfig)
      const txStatus = await provider.viewTransactionStatus({
        txHash: identifier,
        accountId: this.nearConfig.networkId,
      })

      if (!txStatus) return null

      const statusObj = txStatus.status as any
      const isSuccess = statusObj && ('SuccessValue' in statusObj || 'SuccessReceiptId' in statusObj)
      const status = isSuccess ? 'success' : 'failed'
      const transaction = txStatus.transaction as any

      const sender = transaction.signer_id
      const receiver = transaction.receiver_id
      const value = transaction.actions?.[0]?.Transfer?.deposit ? BigInt(transaction.actions[0].Transfer.deposit) : 0n

      return {
        chain: this.chain.name,
        id: identifier,
        receiver,
        sender,
        value,
        function: transaction.actions?.[0]?.FunctionCall?.method_name || 'transfer',
        status,
        createdAt: new Date().toISOString(),
        error: status === 'failed' ? JSON.stringify(txStatus.status) : null,
        tx: txStatus as any,
      }
    } catch (error) {
      return null
    }
  }

  async getAccountNfts(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAsset[]> {
    return []
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    return []
  }
}
