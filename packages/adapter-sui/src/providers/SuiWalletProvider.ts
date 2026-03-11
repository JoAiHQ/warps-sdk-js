import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import {
  getWarpWalletAddressFromConfig,
  getWarpWalletMnemonicFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  removeWarpWalletFromConfig,
  setWarpWalletInConfig,
  WalletProvider,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
  WarpWalletProvider,
} from '@joai/warps'

export class PrivateKeyWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'privateKey'
  private keypair: Ed25519Keypair | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {}

  async getAddress(): Promise<string | null> {
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  async getPublicKey(): Promise<string | null> {
    try {
      const keypair = this.getKeypair()
      const publicKey = keypair.getPublicKey()
      return Buffer.from(publicKey.toRawBytes()).toString('hex')
    } catch {
      return null
    }
  }

  async signTransaction(tx: any): Promise<any> {
    if (tx && typeof tx === 'object' && 'sign' in tx && typeof tx.sign === 'function') {
      return tx
    }
    const keypair = this.getKeypair()
    const txBytes = new TextEncoder().encode(JSON.stringify(tx))
    const signature = await keypair.signPersonalMessage(txBytes)
    return { ...tx, signature: signature.signature }
  }

  async signMessage(message: string): Promise<string> {
    const keypair = this.getKeypair()
    const messageBytes = new TextEncoder().encode(message)
    const signature = await keypair.signPersonalMessage(messageBytes)
    return signature.signature
  }

  getKeypairInstance(): Ed25519Keypair {
    return this.getKeypair()
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic.trim())
    const address = keypair.getPublicKey().toSuiAddress()
    const privateKey = Buffer.from(keypair.getSecretKey()).toString('hex')
    const walletDetails: WarpWalletDetails = {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address,
      privateKey,
      mnemonic,
    }
    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    const privateKeyBytes = Buffer.from(privateKey, 'hex')
    let secretKey: Uint8Array
    if (privateKeyBytes.length === 70) {
      secretKey = new Uint8Array(privateKeyBytes.subarray(1, 33))
    } else if (privateKeyBytes.length === 32) {
      secretKey = new Uint8Array(privateKeyBytes)
    } else {
      throw new Error(`Unsupported private key length: ${privateKeyBytes.length} bytes`)
    }
    const keypair = Ed25519Keypair.fromSecretKey(secretKey)
    const address = keypair.getPublicKey().toSuiAddress()
    const walletDetails: WarpWalletDetails = {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address,
      privateKey,
      mnemonic: null,
    }
    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  async export(): Promise<WarpWalletDetails> {
    const keypair = this.getKeypair()
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    return {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address: keypair.getPublicKey().toSuiAddress(),
      privateKey: privateKey || null,
      mnemonic: mnemonic || null,
    }
  }

  async generate(): Promise<WarpWalletDetails> {
    const keypair = Ed25519Keypair.generate()
    const address = keypair.getPublicKey().toSuiAddress()
    const privateKey = Buffer.from(keypair.getSecretKey()).toString('hex')
    return {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address,
      privateKey,
      mnemonic: null,
    }
  }

  async delete(externalId: string): Promise<void> {
    removeWarpWalletFromConfig(this.config, this.chain.name)
  }

  private getKeypair(): Ed25519Keypair {
    if (this.keypair) return this.keypair

    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKey) throw new Error('Wallet not initialized - no private key provided')

    try {
      const privateKeyBytes = Buffer.from(privateKey, 'hex')

      if (privateKeyBytes.length === 70) {
        const secretKey32 = new Uint8Array(privateKeyBytes.subarray(1, 33))
        this.keypair = Ed25519Keypair.fromSecretKey(secretKey32)
        return this.keypair
      } else if (privateKeyBytes.length === 32) {
        this.keypair = Ed25519Keypair.fromSecretKey(new Uint8Array(privateKeyBytes))
        return this.keypair
      } else {
        throw new Error(`Unsupported private key length: ${privateKeyBytes.length} bytes`)
      }
    } catch (error) {
      throw error
    }
  }
}
