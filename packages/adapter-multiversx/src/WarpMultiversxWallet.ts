import {
  AdapterWarpWallet,
  CacheTtl,
  initializeWalletCache,
  WalletProvider,
  WarpAdapterGenericTransaction,
  WarpCache,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
  WarpWalletProvider,
} from '@joai/warps'
import { Address, NetworkEntrypoint, Transaction } from '@multiversx/sdk-core'
import { getMultiversxEntrypoint } from './helpers/general'
import { MnemonicWalletProvider } from './providers/MnemonicWalletProvider'
import { PrivateKeyWalletProvider } from './providers/PrivateKeyWalletProvider'
import { ReadOnlyWalletProvider } from './providers/ReadOnlyWalletProvider'

export class WarpMultiversxWallet implements AdapterWarpWallet {
  private static signingQueues = new Map<string, Promise<any>>()

  private entry: NetworkEntrypoint
  private cache: WarpCache
  private walletProvider: WalletProvider | null
  private cachedAddress: string | null = null
  private cachedPublicKey: string | null = null
  private readonly walletAddress: string | null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    this.entry = getMultiversxEntrypoint(chain, config.env, config)
    this.cache = new WarpCache(config.env, config.cache)
    this.walletProvider = this.createProvider()
    this.walletAddress = this.resolveAddressFromConfig()
    this.initializeCache()
  }

  signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    const key = this.walletAddress
    if (!key) return this.signTransactionInner(tx)
    const queue = WarpMultiversxWallet.signingQueues.get(key) ?? Promise.resolve()
    const next = queue.catch(() => {}).then(() => this.signTransactionInner(tx))
    WarpMultiversxWallet.signingQueues.set(key, next)
    // Clean up the map entry once the queue drains (avoid memory leak)
    next.then(
      () => { if (WarpMultiversxWallet.signingQueues.get(key) === next) WarpMultiversxWallet.signingQueues.delete(key) },
      () => { if (WarpMultiversxWallet.signingQueues.get(key) === next) WarpMultiversxWallet.signingQueues.delete(key) },
    )
    return next
  }

  private async signTransactionInner(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    const castedTx = tx as Transaction
    if (!castedTx || typeof castedTx !== 'object') throw new Error('Invalid transaction object')
    if (!this.walletProvider) throw new Error('No wallet provider available')
    if (this.walletProvider instanceof ReadOnlyWalletProvider) throw new Error(`Wallet (${this.chain.name}) is read-only`)

    if (this.walletProvider instanceof PrivateKeyWalletProvider || this.walletProvider instanceof MnemonicWalletProvider) {
      const account = this.walletProvider.getAccountInstance()
      if (castedTx.nonce === 0n) {
        const nonceOnNetwork = await this.entry.recallAccountNonce(account.address)
        const nonceInCache = this.cache.get<number>(`nonce:${account.address.toBech32()}`) || 0
        const highestNonce = BigInt(Math.max(nonceInCache, Number(nonceOnNetwork)))
        castedTx.nonce = highestNonce
      }
    } else if (castedTx.nonce === 0n && this.cachedAddress) {
      const address = Address.newFromBech32(this.cachedAddress)
      const nonceOnNetwork = await this.entry.recallAccountNonce(address)
      const nonceInCache = this.cache.get<number>(`nonce:${this.cachedAddress}`) || 0
      const highestNonce = BigInt(Math.max(nonceInCache, Number(nonceOnNetwork)))
      castedTx.nonce = highestNonce
    }

    const signedTx = await this.walletProvider.signTransaction(castedTx)

    if (this.walletProvider instanceof PrivateKeyWalletProvider || this.walletProvider instanceof MnemonicWalletProvider) {
      const account = this.walletProvider.getAccountInstance()
      const newNonce = Number(account.nonce) + 1
      this.cache.set(`nonce:${account.address.toBech32()}`, newNonce, CacheTtl.OneMinute)
    } else if (this.cachedAddress) {
      const currentNonce = castedTx.nonce ? Number(castedTx.nonce) : 0
      this.cache.set(`nonce:${this.cachedAddress}`, currentNonce + 1, CacheTtl.OneMinute)
    }

    return signedTx
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    const signedTxs = []
    for (const tx of txs) {
      signedTxs.push(await this.signTransaction(tx))
    }
    return signedTxs
  }

  async signMessage(message: string): Promise<string> {
    if (!this.walletProvider) throw new Error('No wallet provider available')
    if (this.walletProvider instanceof ReadOnlyWalletProvider) throw new Error(`Wallet (${this.chain.name}) is read-only`)
    return await this.walletProvider.signMessage(message)
  }

  async sendTransactions(txs: WarpAdapterGenericTransaction[]): Promise<string[]> {
    return Promise.all(txs.map(async (tx) => this.sendTransaction(tx)))
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    const castedTx = tx as Transaction
    if (!castedTx || typeof castedTx !== 'object') throw new Error('Invalid transaction object')
    if (!castedTx.signature || castedTx.signature.length === 0) throw new Error('Transaction must be signed before sending')
    return await this.entry.sendTransaction(castedTx)
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

  private resolveAddressFromConfig(): string | null {
    const wallet = this.config.user?.wallets?.[this.chain.name]
    if (!wallet) return null
    if (typeof wallet === 'string') return wallet
    return wallet.address || null
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
}
