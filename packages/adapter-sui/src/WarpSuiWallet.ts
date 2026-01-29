import { SuiClient } from '@mysten/sui/client'

import {
  AdapterWarpWallet,
  initializeWalletCache,
  WalletProvider,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
  WarpWalletProvider,
} from '@joai/warps'
import { getConfiguredSuiClient } from './helpers'
import { MnemonicWalletProvider } from './providers/MnemonicWalletProvider'
import { ReadOnlyWalletProvider } from './providers/ReadOnlyWalletProvider'
import { PrivateKeyWalletProvider } from './providers/SuiWalletProvider'

export class WarpSuiWallet implements AdapterWarpWallet {
  private client: SuiClient
  private walletProvider: WalletProvider | null
  private cachedAddress: string | null = null
  private cachedPublicKey: string | null = null
  private isInitializedPromise: Promise<void>
  private isInitializedResolve!: () => void

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    this.client = getConfiguredSuiClient(config, chain)
    this.walletProvider = this.createProvider()
    this.isInitializedPromise = new Promise((resolve) => {
      this.isInitializedResolve = resolve
    })
    this.initializeCache()
  }

  public async waitUntilInitialized(): Promise<void> {
    await this.isInitializedPromise
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    await this.waitUntilInitialized() // Ensure cache is initialized
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!this.walletProvider) throw new Error('No wallet provider available')
    if (this.walletProvider instanceof ReadOnlyWalletProvider) throw new Error(`Wallet (${this.chain.name}) is read-only`)

    // If it's a Transaction object with a sign method, return it as-is
    // It will be signed and executed together in sendTransaction
    if (tx && typeof tx === 'object' && 'sign' in tx && typeof tx.sign === 'function') {
      return tx
    }

    return await this.walletProvider.signTransaction(tx)
  }

  async signMessage(message: string): Promise<string> {
    await this.waitUntilInitialized() // Ensure cache is initialized
    if (!this.walletProvider) throw new Error('No wallet provider available')
    if (this.walletProvider instanceof ReadOnlyWalletProvider) throw new Error(`Wallet (${this.chain.name}) is read-only`)
    return await this.walletProvider.signMessage(message)
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    await this.waitUntilInitialized() // Ensure cache is initialized
    return txs
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    await this.waitUntilInitialized() // Ensure cache is initialized
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')

    if (this.walletProvider instanceof PrivateKeyWalletProvider || this.walletProvider instanceof MnemonicWalletProvider) {
      const keypair = (this.walletProvider as any).getKeypairInstance()

      // If transaction has a sign method, use signAndExecuteTransaction (preferred method)
      if (tx && typeof tx === 'object' && 'sign' in tx && typeof tx.sign === 'function') {
        const result = await this.client.signAndExecuteTransaction({
          transaction: tx,
          signer: keypair,
          options: { showEffects: true, showEvents: true },
        })
        return result.digest
      }

      // If transaction has bytes and signature, it's already signed - execute it
      if (tx && typeof tx === 'object' && 'bytes' in tx && 'signature' in tx) {
        try {
          const result = await this.client.executeTransactionBlock({
            transactionBlock: tx.bytes,
            signature: Array.isArray(tx.signature) ? tx.signature : [tx.signature],
            options: { showEffects: true, showEvents: true },
          })
          return result.digest
        } catch (error: any) {
          throw error
        }
      }

      throw new Error(
        `Transaction must be a Transaction object or have bytes and signature. Got: ${typeof tx}, has sign: ${tx && typeof tx === 'object' && 'sign' in tx}, has bytes: ${tx && typeof tx === 'object' && 'bytes' in tx}, has signature: ${tx && typeof tx === 'object' && 'signature' in tx}`
      )
    }

    throw new Error('Wallet provider does not support sending transactions')
  }

  async sendTransactions(txs: WarpAdapterGenericTransaction[]): Promise<string[]> {
    await this.waitUntilInitialized() // Ensure cache is initialized
    return Promise.all(txs.map(async (tx) => this.sendTransaction(tx)))
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    await this.waitUntilInitialized() // Ensure cache is initialized
    const walletProvider = this.createProviderForOperation('mnemonic')
    return await walletProvider.importFromMnemonic(mnemonic)
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    await this.waitUntilInitialized() // Ensure cache is initialized
    const walletProvider = this.createProviderForOperation('privateKey')
    return await walletProvider.importFromPrivateKey(privateKey)
  }

  async export(provider: WarpWalletProvider): Promise<WarpWalletDetails> {
    await this.waitUntilInitialized() // Ensure cache is initialized
    const walletProvider = this.createProviderForOperation(provider)
    return await walletProvider.export()
  }

  async generate(provider: WarpWalletProvider): Promise<WarpWalletDetails> {
    await this.waitUntilInitialized() // Ensure cache is initialized
    const walletProvider = this.createProviderForOperation(provider)
    return await walletProvider.generate()
  }

  getAddress(): string | null {
    return this.cachedAddress
  }

  getPublicKey(): string | null {
    return this.cachedPublicKey
  }

  private createProvider(): WalletProvider | null {
    const wallet = this.config.user?.wallets?.[this.chain.name]
    if (!wallet) return null
    if (typeof wallet === 'string') return new ReadOnlyWalletProvider(this.config, this.chain)
    if (!wallet.provider) return new ReadOnlyWalletProvider(this.config, this.chain)
    return this.createProviderForOperation(wallet.provider)
  }

  private async initializeCache() {
    // Made async
    const cache = await initializeWalletCache(this.walletProvider) // Await the promise
    this.cachedAddress = cache.address
    this.cachedPublicKey = cache.publicKey
    this.isInitializedResolve() // Resolve the promise once initialized
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
}
