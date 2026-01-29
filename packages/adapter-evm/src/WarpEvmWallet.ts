import {
  AdapterWarpWallet,
  getProviderConfig,
  WalletProvider,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
  WarpWalletProvider,
} from '@joai/warps'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import { ethers } from 'ethers'
import { privateKeyToAccount } from 'viem/accounts'
import { SupportedEvmChainIds } from './constants'
import { MnemonicWalletProvider } from './providers/MnemonicWalletProvider'
import { PrivateKeyWalletProvider } from './providers/PrivateKeyWalletProvider'
import { ReadOnlyWalletProvider } from './providers/ReadOnlyWalletProvider'

export class WarpEvmWallet implements AdapterWarpWallet {
  private provider: ethers.JsonRpcProvider
  private walletProvider: WalletProvider | null
  private cachedAddress: string | null = null
  private cachedPublicKey: string | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    const providerConfig = getProviderConfig(config, chain.name, config.env, chain.defaultApiUrl)
    this.provider = new ethers.JsonRpcProvider(providerConfig.url)
    this.walletProvider = this.createProvider()

    const wallet = config.user?.wallets?.[chain.name]
    if (typeof wallet === 'string') {
      this.cachedAddress = wallet
    } else if (this.walletProvider instanceof PrivateKeyWalletProvider || this.walletProvider instanceof MnemonicWalletProvider) {
      try {
        const w = this.walletProvider.getWalletInstance()
        this.cachedAddress = w.address
        const pk = w.signingKey.publicKey
        this.cachedPublicKey = pk.startsWith('0x') ? pk.slice(2) : pk
      } catch {}
    }
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!this.walletProvider) throw new Error('No wallet provider available')
    if (this.walletProvider instanceof ReadOnlyWalletProvider) throw new Error(`Wallet (${this.chain.name}) is read-only`)

    if (tx.nonce === undefined) {
      const address = await this.getAddressAsync()
      if (address) {
        tx.nonce = await this.provider.getTransactionCount(address, 'pending')
      }
    }

    this.normalizeFees(tx)
    return await this.walletProvider.signTransaction(tx)
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    if (txs.length === 0) return []
    if (!this.walletProvider) throw new Error('No wallet provider available')

    const address = await this.getAddressAsync()
    if (!address) throw new Error('No wallet address available')

    const currentNonce = await this.provider.getTransactionCount(address, 'pending')
    const signedTxs = []

    for (let i = 0; i < txs.length; i++) {
      const tx = { ...txs[i] }
      if (tx.nonce === undefined) {
        tx.nonce = currentNonce + i
      }

      if (i > 0 && (this.walletProvider instanceof PrivateKeyWalletProvider || this.walletProvider instanceof MnemonicWalletProvider)) {
        this.adjustFeesForMultipleTransactions(tx, i)
      }

      this.normalizeFees(tx)
      signedTxs.push(await this.walletProvider.signTransaction(tx))
    }

    return signedTxs
  }

  async signMessage(message: string): Promise<string> {
    if (!this.walletProvider) throw new Error('No wallet provider available')
    if (this.walletProvider instanceof ReadOnlyWalletProvider) throw new Error(`Wallet (${this.chain.name}) is read-only`)
    return await this.walletProvider.signMessage(message)
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!tx.signature) throw new Error('Transaction must be signed before sending')
    if (!this.walletProvider) throw new Error('No wallet provider available')

    if (typeof tx.signature === 'string' && tx.signature.startsWith('0x')) {
      const txResponse = await this.provider.broadcastTransaction(tx.signature)
      return txResponse.hash
    }

    if (this.walletProvider instanceof PrivateKeyWalletProvider || this.walletProvider instanceof MnemonicWalletProvider) {
      const wallet = this.walletProvider.getWalletInstance()
      const connectedWallet = wallet.connect(this.provider)
      const txResponse = await connectedWallet.sendTransaction(tx as any)
      return txResponse.hash
    }

    throw new Error('Wallet provider does not support sending transactions')
  }

  async sendTransactions(txs: WarpAdapterGenericTransaction[]): Promise<string[]> {
    return Promise.all(txs.map(async (tx) => this.sendTransaction(tx)))
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    const walletProvider = this.createProviderForOperation('mnemonic')
    return await walletProvider.importFromMnemonic(mnemonic)
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    const walletProvider = this.createProviderForOperation('privateKey')
    return await walletProvider.importFromPrivateKey(privateKey)
  }

  async export(provider: WarpWalletProvider): Promise<WarpWalletDetails> {
    const walletProvider = this.createProviderForOperation(provider)
    return await walletProvider.export()
  }

  async generate(provider: WarpWalletProvider): Promise<WarpWalletDetails> {
    const walletProvider = this.createProviderForOperation(provider)
    return await walletProvider.generate()
  }

  getAddress(): string | null {
    return this.cachedAddress
  }

  getPublicKey(): string | null {
    return this.cachedPublicKey
  }

  async registerX402Handlers(client: unknown): Promise<Record<string, () => void>> {
    if (!this.walletProvider) throw new Error('No wallet provider available')

    const provider = this.walletProvider as unknown as Record<string, unknown>
    const getInstance = provider.getWalletInstance as (() => ethers.Wallet) | undefined

    if (typeof getInstance !== 'function') throw new Error('Wallet provider does not have getWalletInstance method')

    const wallet = getInstance()
    if (!wallet || !wallet.privateKey) throw new Error('Wallet instance does not have private key')

    const signer = privateKeyToAccount(wallet.privateKey as `0x${string}`)
    const handlers: Record<string, () => void> = {}

    for (const chainId of SupportedEvmChainIds) {
      handlers[`eip155:${chainId}`] = () => {
        registerExactEvmScheme(client as Parameters<typeof registerExactEvmScheme>[0], { signer })
      }
    }

    return handlers
  }

  private createProvider(): WalletProvider | null {
    const wallet = this.config.user?.wallets?.[this.chain.name]
    if (!wallet) return null
    if (typeof wallet === 'string') return new ReadOnlyWalletProvider(this.config, this.chain)
    if (!wallet.provider) return new ReadOnlyWalletProvider(this.config, this.chain)
    return this.createProviderForOperation(wallet.provider)
  }

  private async getAddressAsync(): Promise<string | null> {
    if (this.cachedAddress !== null) return this.cachedAddress
    if (!this.walletProvider) return null
    this.cachedAddress = await this.walletProvider.getAddress()
    if (!this.cachedPublicKey) this.cachedPublicKey = await this.walletProvider.getPublicKey()
    return this.cachedAddress
  }

  private createProviderForOperation(provider: WarpWalletProvider): WalletProvider {
    const customWalletProviders = this.config.walletProviders?.[this.chain.name]
    const providerFactory = customWalletProviders?.[provider]
    if (providerFactory) {
      const walletProvider = providerFactory(this.config, this.chain)
      if (!walletProvider) throw new Error(`Custom wallet provider factory returned null for ${provider}`)
      return walletProvider
    }

    if (provider === 'privateKey') return new PrivateKeyWalletProvider(this.config, this.chain)
    if (provider === 'mnemonic') return new MnemonicWalletProvider(this.config, this.chain)
    throw new Error(`Unsupported wallet provider for ${this.chain.name}: ${provider}`)
  }

  private normalizeFees(tx: WarpAdapterGenericTransaction): void {
    const hasEip1559Fields = tx.maxFeePerGas !== undefined && tx.maxPriorityFeePerGas !== undefined
    const hasLegacyFields = tx.gasPrice !== undefined && !hasEip1559Fields

    if (hasEip1559Fields) {
      const maxFee = this.parseBigInt(tx.maxFeePerGas)!
      const maxPriorityFee = this.parseBigInt(tx.maxPriorityFeePerGas)!
      tx.maxFeePerGas = maxFee
      tx.maxPriorityFeePerGas = this.normalizePriorityFee(maxFee, maxPriorityFee)
    } else if (hasLegacyFields) {
      const gasPrice = this.parseBigInt(tx.gasPrice)!
      tx.maxFeePerGas = gasPrice
      tx.maxPriorityFeePerGas = this.normalizePriorityFee(gasPrice, (gasPrice * 9n) / 10n)
      delete tx.gasPrice
    } else {
      const defaultMaxFee = 1000000000n
      tx.maxFeePerGas = defaultMaxFee
      tx.maxPriorityFeePerGas = defaultMaxFee / 10n
    }
  }

  private parseBigInt(value: bigint | string | number | undefined): bigint | undefined {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'bigint') return value
    return BigInt(value)
  }

  private adjustFeesForMultipleTransactions(tx: WarpAdapterGenericTransaction, index: number): void {
    const priorityReduction = BigInt(index * 1000000000)
    const minGasPrice = BigInt(1000000000)

    if (tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
      const maxFee = this.parseBigInt(tx.maxFeePerGas)!
      const maxPriorityFee = this.parseBigInt(tx.maxPriorityFeePerGas)!
      const reducedMaxFee = maxFee > priorityReduction ? maxFee - priorityReduction : minGasPrice
      const reducedMaxPriorityFee = maxPriorityFee > priorityReduction ? maxPriorityFee - priorityReduction : minGasPrice
      tx.maxFeePerGas = reducedMaxFee
      tx.maxPriorityFeePerGas = this.normalizePriorityFee(reducedMaxFee, reducedMaxPriorityFee)
      delete tx.gasPrice
    } else if (tx.gasPrice) {
      tx.gasPrice = tx.gasPrice > priorityReduction ? tx.gasPrice - priorityReduction : minGasPrice
      delete tx.maxFeePerGas
      delete tx.maxPriorityFeePerGas
    }
  }

  private normalizePriorityFee(maxFee: bigint, maxPriorityFee: bigint): bigint {
    if (maxFee <= 0n) return 1n
    if (maxPriorityFee <= maxFee) return maxPriorityFee
    const safeFee = maxFee / 10n
    return safeFee < 1n ? 1n : safeFee
  }
}
