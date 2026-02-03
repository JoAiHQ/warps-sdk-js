import {
  EvmWalletChainNames,
  getWarpWalletAddressFromConfig,
  setWarpWalletInConfig,
  WalletProvider,
  WarpChainInfo,
  WarpChainName,
  WarpClientConfig,
  WarpWalletDetails,
  WarpWalletProvider,
} from '@joai/warps'
import { Address, Transaction } from '@multiversx/sdk-core'
import { getGaupaApiUrl } from './config'
import { GaupaApiClient, WalletResponse } from './GaupaApiClient'
import { ProviderConfig } from './types'

export class GaupaWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'gaupa'
  private readonly client: GaupaApiClient
  private cachedAddress: string | null = null

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo,
    private readonly gaupaConfig: ProviderConfig
  ) {
    this.client = new GaupaApiClient(gaupaConfig.publicKey, gaupaConfig.apiKey, getGaupaApiUrl(config.env))
  }

  async getAddress(): Promise<string | null> {
    if (this.cachedAddress) return this.cachedAddress
    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    if (!address) return null
    this.cachedAddress = address
    return address
  }

  async getPublicKey(): Promise<string | null> {
    const address = await this.getAddress()
    if (!address) return null
    const pubKey = Address.newFromBech32(address).getPublicKey().toString('hex')
    return pubKey
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    const walletAddress = await this.getAddress()
    if (!walletAddress) throw new Error('GaupaWalletProvider: Wallet address not found')

    tx.sender = Address.newFromBech32(walletAddress)
    const result = await this.client.signTransaction(this.formatTransactionForApi(tx))
    if (!result.data?.transaction?.signature) throw new Error('Gaupa API did not return a valid transaction signature')

    tx.signature = new Uint8Array(Buffer.from(result.data.transaction.signature, 'hex'))

    return tx
  }

  async signMessage(message: string): Promise<string> {
    const walletAddress = await this.getAddress()
    if (!walletAddress) throw new Error('GaupaWalletProvider: Wallet address not found')

    const result = await this.client.signMessage({ message, walletAddress })
    if (!result.signature) throw new Error('Gaupa API did not return signature')

    return result.signature
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    throw new Error('GaupaWalletProvider: importFromMnemonic() is not supported. Use generate() to create a new wallet via Gaupa API.')
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    throw new Error('GaupaWalletProvider: importFromPrivateKey() is not supported. Use generate() to create a new wallet via Gaupa API.')
  }

  async export(): Promise<WarpWalletDetails> {
    throw new Error('GaupaWalletProvider: export() is not supported. Private keys are managed by Gaupa and cannot be exported.')
  }

  async generate(): Promise<WarpWalletDetails> {
    if (!this.config.user?.email) throw new Error('GaupaWalletProvider: Email is required to generate a wallet')
    try {
      const remoteWallet = await this.client.createAgenticWallet({
        email: this.config.user.email,
        name: this.config.user?.name || undefined,
      })

      if (!remoteWallet.success) throw new Error('Gaupa API did not return a valid wallet')
      const address = this.getWalletForChainOrFail(remoteWallet.wallet)
      if (!address) throw new Error('Gaupa API did not return a valid wallet')

      const walletDetails: WarpWalletDetails = {
        provider: GaupaWalletProvider.PROVIDER_NAME,
        address,
        externalId: remoteWallet.userId,
      }

      setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
      this.cachedAddress = walletDetails.address

      return walletDetails
    } catch (error) {
      throw new Error(`GaupaWalletProvider: Failed to generate wallet: ${error}`)
    }
  }

  private getWalletForChainOrFail(wallet: WalletResponse): string {
    if (
      (this.chain.name === WarpChainName.Multiversx || this.chain.name === WarpChainName.Claws) &&
      wallet.address_multiversx
    ) {
      return wallet.address_multiversx
    }
    if (EvmWalletChainNames.includes(this.chain.name) && wallet.address_evm) return wallet.address_evm
    throw new Error(`GaupaWalletProvider: Unsupported chain: ${this.chain.name}`)
  }

  private formatTransactionForApi(tx: Transaction) {
    const walletAddress = tx.sender.toBech32()
    return {
      walletAddress,
      send: false,
      relay: false,
      transaction: {
        sender: walletAddress,
        receiver: tx.receiver.toBech32(),
        value: tx.value.toString(),
        gasLimit: Number(tx.gasLimit),
        gasPrice: Number(tx.gasPrice),
        ...(tx.nonce !== undefined && { nonce: Number(tx.nonce) }),
        ...(tx.data?.length && { data: Buffer.from(tx.data).toString('base64') }),
      },
    }
  }
}
