import {
  AdapterWarpDataLoader,
  CacheTtl,
  getProviderConfig,
  getWarpChainAssetLogoUrl,
  WarpCache,
  WarpCacheKey,
  WarpChainAccount,
  WarpChainAction,
  WarpChainAsset,
  WarpChainInfo,
  WarpChainName,
  WarpClientConfig,
  WarpDataLoaderOptions,
} from '@joai/warps'
import { ethers } from 'ethers'
import { UniswapService } from './providers'
import { findKnownTokenById, getKnownTokensForChain } from './tokens'

interface TokenBalance {
  tokenAddress: string
  balance: bigint
  name: string
  symbol: string
  decimals: number
  logoUrl: string
}

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
]

export class WarpEvmDataLoader implements AdapterWarpDataLoader {
  private provider: ethers.JsonRpcProvider
  private cache: WarpCache
  private uniswapService: UniswapService

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    const network = new ethers.Network(this.chain.name, parseInt(this.chain.chainId))
    this.provider = new ethers.JsonRpcProvider(providerConfig.url, network)
    this.cache = new WarpCache(config.env, config.cache)
    this.uniswapService = new UniswapService(this.cache, parseInt(this.chain.chainId))
  }

  private getRequiredConfirmations(): number {
    if (this.config.env === 'mainnet') {
      return 12
    }
    return 1
  }

  private static readonly ChainsWithoutNativeBalance: WarpChainName[] = [WarpChainName.Tempo]

  private hasNativeBalance(): boolean {
    return !WarpEvmDataLoader.ChainsWithoutNativeBalance.includes(this.chain.name)
  }

  async getAccount(address: string): Promise<WarpChainAccount> {
    const balance = this.hasNativeBalance() ? await this.provider.getBalance(address) : 0n

    return {
      chain: this.chain.name,
      address,
      balance,
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    const account = await this.getAccount(address)
    const tokenBalances = await this.getERC20TokenBalances(address)

    let assets: WarpChainAsset[] = this.hasNativeBalance() && account.balance > 0 ? [{ ...this.chain.nativeToken, amount: account.balance }] : []

    for (const tokenBalance of tokenBalances) {
      if (tokenBalance.balance > 0n) {
        assets.push({
          chain: this.chain.name,
          identifier: tokenBalance.tokenAddress,
          name: tokenBalance.name,
          symbol: tokenBalance.symbol,
          amount: tokenBalance.balance,
          decimals: tokenBalance.decimals,
          logoUrl: tokenBalance.logoUrl || '',
        })
      }
    }

    return assets
  }

  async getAsset(identifier: string): Promise<WarpChainAsset | null> {
    try {
      console.log('WarpEvmDataLoader.getAsset', identifier)
      if (identifier === this.chain.nativeToken.identifier) {
        return this.chain.nativeToken
      }

      const cacheKey = WarpCacheKey.Asset(this.config.env, this.chain.name, identifier)
      const cachedAsset = await this.cache.get<WarpChainAsset>(cacheKey)
      if (cachedAsset) {
        return cachedAsset
      }

      console.log('WarpEvmDataLoader.getAsset: findKnownTokenById', this.chain.name, this.config.env, identifier)
      const knownToken = findKnownTokenById(this.chain.name, this.config.env, identifier)

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

      const metadata = await this.getTokenMetadata(identifier)

      const asset: WarpChainAsset = {
        chain: this.chain.name,
        identifier,
        name: metadata.name,
        symbol: metadata.symbol,
        amount: 0n,
        decimals: metadata.decimals,
        logoUrl: metadata.logoUrl,
      }

      await this.cache.set(cacheKey, asset, CacheTtl.OneHour)

      return asset
    } catch (error) {
      return null
    }
  }

  async getAction(identifier: string, awaitCompleted = false): Promise<WarpChainAction | null> {
    try {
      const tx = await this.provider.getTransaction(identifier)
      if (!tx) return null

      let receipt = await this.provider.getTransactionReceipt(identifier)

      if (awaitCompleted) {
        if (!receipt) {
          receipt = await tx.wait()
        } else {
          const confirmations = this.getRequiredConfirmations()
          const currentBlock = await this.provider.getBlockNumber()
          const receiptBlock = receipt.blockNumber
          const confirmationsCount = currentBlock - receiptBlock

          if (confirmationsCount < confirmations) {
            await tx.wait(confirmations)
            receipt = await this.provider.getTransactionReceipt(identifier)
          }
        }
      }

      const block = await this.provider.getBlock(receipt?.blockNumber || tx.blockNumber || 'latest')

      const status = receipt
        ? receipt.status === 1
          ? 'success'
          : receipt.status === 0
            ? 'failed'
            : 'pending'
        : 'pending'

      const error = receipt?.status === 0 ? 'Transaction failed' : null

      return {
        chain: this.chain.name,
        id: tx.hash || identifier,
        receiver: tx.to || '',
        sender: tx.from,
        value: tx.value,
        function: tx.data && tx.data !== '0x' ? 'contract_call' : '',
        status,
        createdAt: block?.timestamp ? new Date(Number(block.timestamp) * 1000).toISOString() : new Date().toISOString(),
        error,
        tx: {
          hash: tx.hash || '',
          from: tx.from,
          to: tx.to || '',
          value: tx.value.toString(),
          data: tx.data || '0x',
          gasLimit: tx.gasLimit?.toString() || '0',
          gasPrice: tx.gasPrice?.toString() || '0',
          blockNumber: tx.blockNumber || 0,
          blockHash: tx.blockHash || '',
          transactionIndex: tx.index || 0,
          status: receipt?.status,
        } as any,
      }
    } catch (error) {
      return null
    }
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    return []
  }

  private async getERC20TokenBalances(address: string): Promise<TokenBalance[]> {
    const env = this.config.env === 'mainnet' ? 'mainnet' : 'testnet'
    const tokens = getKnownTokensForChain(this.chain.name, env)
    const balanceReqs = tokens.map((token) => this.getTokenBalance(address, token.identifier).catch(() => 0n))
    const balances = await Promise.all(balanceReqs)

    return balances
      .map((balance, index) => ({ balance, token: tokens[index] }))
      .filter(({ balance }) => balance > 0n)
      .map(({ balance, token }) => ({
        tokenAddress: token.identifier,
        balance,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals || 18,
        logoUrl: getWarpChainAssetLogoUrl(token, this.config) || '',
      }))
  }

  private async getTokenBalance(address: string, tokenAddress: string): Promise<bigint> {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
    const balance = await contract.balanceOf(address)
    return balance
  }

  private async getTokenMetadata(tokenAddress: string): Promise<{ name: string; symbol: string; decimals: number; logoUrl: string }> {
    // First try to get metadata from Uniswap token list
    const uniswapMetadata = await this.uniswapService.getTokenMetadata(tokenAddress)
    if (uniswapMetadata) {
      return uniswapMetadata
    }

    // Fallback to contract data
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
    const [name, symbol, decimals] = await Promise.all([
      contract.name().catch(() => 'Unknown Token'),
      contract.symbol().catch(() => 'UNKNOWN'),
      contract.decimals().catch(() => 18),
    ])

    return {
      name: name || 'Unknown Token',
      symbol: symbol || 'UNKNOWN',
      decimals: decimals || 18,
      logoUrl: '',
    }
  }
}
