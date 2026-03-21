/// <reference path="./types.d.ts" />
import {
  AdapterWarpWallet,
  getProviderConfig,
  initializeWalletCache,
  WalletProvider,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
  WarpWalletProvider,
} from '@joai/warps'
import { Commitment, Connection, Transaction, VersionedTransaction } from '@solana/web3.js'
import { MnemonicWalletProvider } from './providers/MnemonicWalletProvider'
import { PrivateKeyWalletProvider } from './providers/PrivateKeyWalletProvider'
import { ReadOnlyWalletProvider } from './providers/ReadOnlyWalletProvider'

export class WarpSolanaWallet implements AdapterWarpWallet {
  private connection: Connection
  private walletProvider: WalletProvider | null
  private cachedAddress: string | null = null
  private cachedPublicKey: string | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    const providerConfig = getProviderConfig(config, chain.name, config.env, chain.defaultApiUrl)
    this.connection = new Connection(providerConfig.url, 'confirmed')
    this.walletProvider = this.createProvider()
    this.initializeCache()
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!this.walletProvider) throw new Error('No wallet provider available')
    if (this.walletProvider instanceof ReadOnlyWalletProvider) throw new Error(`Wallet (${this.chain.name}) is read-only`)
    return this.walletProvider.signTransaction(tx)
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    return Promise.all(txs.map((tx) => this.signTransaction(tx)))
  }

  async signMessage(message: string): Promise<string> {
    if (!this.walletProvider) throw new Error('No wallet provider available')
    if (this.walletProvider instanceof ReadOnlyWalletProvider) throw new Error(`Wallet (${this.chain.name}) is read-only`)
    return this.walletProvider.signMessage(message)
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')

    const transaction = this.resolveTransaction(tx)

    if (!transaction.signatures || transaction.signatures.length === 0 || !transaction.signatures.some((sig) => sig.some((b) => b !== 0))) {
      throw new Error('Transaction must be signed before sending')
    }

    try {
      const shouldSkipPreflight = await this.shouldSkipPreflight(transaction)
      return await this.sendWithRetry(transaction, shouldSkipPreflight)
    } catch (simError: any) {
      if (simError.message?.includes('MissingRequiredSignature')) {
        return await this.sendRawTransaction(transaction, { skipPreflight: true })
      }
      throw new Error(`Transaction send failed: ${simError?.message || String(simError)}`)
    }
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

  async delete(provider: WarpWalletProvider, externalId: string): Promise<void> {
    const walletProvider = this.createProviderForOperation(provider)
    await walletProvider.delete(externalId)
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

  private initializeCache() {
    initializeWalletCache(this.walletProvider).then((cache: { address: string | null; publicKey: string | null }) => {
      this.cachedAddress = cache.address
      this.cachedPublicKey = cache.publicKey
    })
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

  private resolveTransaction(tx: WarpAdapterGenericTransaction): VersionedTransaction {
    const directVersionedTransaction = this.asVersionedTransaction(tx)
    if (directVersionedTransaction) return directVersionedTransaction

    if (tx instanceof Transaction) {
      throw new Error('Legacy Transaction format is not supported. All transactions must use VersionedTransaction (v0).')
    }

    const nestedTransaction = tx.transaction
    const nestedVersionedTransaction = this.asVersionedTransaction(nestedTransaction)
    if (nestedVersionedTransaction) return nestedVersionedTransaction

    if (nestedTransaction instanceof Transaction) {
      throw new Error('Legacy Transaction format is not supported. All transactions must use VersionedTransaction (v0).')
    }

    const serializedTransaction = this.toSerializedTransactionBytes(nestedTransaction)
    if (serializedTransaction) {
      try {
        return this.asVersionedTransactionOrThrow(VersionedTransaction.deserialize(serializedTransaction))
      } catch {
        throw new Error('Invalid serialized transaction format. Expected a VersionedTransaction payload.')
      }
    }

    if (!nestedTransaction) {
      throw new Error('Transaction must be signed before sending')
    }

    throw new Error('Invalid transaction format - only VersionedTransaction is supported')
  }

  private asVersionedTransaction(tx: unknown): VersionedTransaction | null {
    if (!(tx instanceof VersionedTransaction)) return null
    return this.asVersionedTransactionOrThrow(tx)
  }

  private asVersionedTransactionOrThrow(tx: VersionedTransaction): VersionedTransaction {
    if (tx.version === undefined || tx.version === 'legacy') {
      throw new Error('Transaction must be a VersionedTransaction (v0), not legacy')
    }
    return tx
  }

  private toSerializedTransactionBytes(value: unknown): Uint8Array | null {
    if (value instanceof Uint8Array) return value
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) return new Uint8Array(value)
    if (Array.isArray(value) && value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
      return Uint8Array.from(value)
    }
    if (typeof value === 'string' && value.trim() !== '') {
      return Uint8Array.from(Buffer.from(value.trim(), 'base64'))
    }
    return null
  }

  private async shouldSkipPreflight(transaction: VersionedTransaction): Promise<boolean> {
    if (!transaction.signatures || transaction.signatures.length === 0 || !transaction.signatures.some((sig) => sig.some((b) => b !== 0))) {
      return false
    }

    try {
      const simulation = await this.connection.simulateTransaction(transaction, {
        replaceRecentBlockhash: true,
        sigVerify: false,
      })
      if (simulation.value.err) {
        const errMsg = JSON.stringify(simulation.value.err)
        if (errMsg.includes('"Custom": 17') || errMsg.includes('"Custom":17') || errMsg.includes('0x11')) {
          return true
        }
        throw new Error(`Transaction simulation failed: ${errMsg}`)
      }
    } catch (error: any) {
      if (error.message?.includes('Transaction simulation failed')) throw error
    }
    return false
  }

  private async sendWithRetry(transaction: VersionedTransaction, skipPreflight: boolean): Promise<string> {
    if (skipPreflight) {
      return this.sendRawTransaction(transaction, { skipPreflight: true })
    }

    try {
      return await this.sendRawTransaction(transaction, { skipPreflight: false, preflightCommitment: 'confirmed' })
    } catch (error: any) {
      if (this.isSimulationError(error)) {
        return this.sendRawTransaction(transaction, { skipPreflight: true })
      }
      throw error
    }
  }

  private async sendRawTransaction(
    transaction: VersionedTransaction,
    options: { skipPreflight: boolean; preflightCommitment?: Commitment; maxRetries?: number }
  ): Promise<string> {
    const signature = await this.connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: options.skipPreflight,
      maxRetries: options.maxRetries || 3,
      preflightCommitment: options.preflightCommitment,
    })
    if (!signature || typeof signature !== 'string' || signature.length < 32) {
      throw new Error('Invalid transaction signature received')
    }
    return signature
  }

  private isSimulationError(error: any): boolean {
    const msg = error?.message?.toLowerCase() || ''
    return msg.includes('simulation') || msg.includes('preflight') || msg.includes('0x1') || msg.includes('custom program error')
  }
}
