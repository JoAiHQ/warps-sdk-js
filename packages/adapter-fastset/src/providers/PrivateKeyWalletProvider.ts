import { WalletProvider, WarpWalletDetails, WarpWalletProvider } from '@joai/warps'
import {
  getWarpWalletMnemonicFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  removeWarpWalletFromConfig,
  setWarpWalletInConfig,
  WarpChainInfo,
  WarpClientConfig,
} from '@joai/warps'
import * as bip39 from '@scure/bip39'
import { hexToUint8Array, uint8ArrayToHex } from '../helpers'
import { FastsetClient } from '../sdk'
import { ed } from '../sdk/ed25519-setup'
import { Transaction } from '../sdk/types'

export class PrivateKeyWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'privateKey'
  private privateKey: Uint8Array | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {}

  async getAddress(): Promise<string | null> {
    try {
      const privateKey = this.getPrivateKey()
      const publicKey = ed.getPublicKey(privateKey)
      return FastsetClient.encodeBech32Address(publicKey)
    } catch {
      return null
    }
  }

  async getPublicKey(): Promise<string | null> {
    try {
      const privateKey = this.getPrivateKey()
      const publicKey = ed.getPublicKey(privateKey)
      return uint8ArrayToHex(publicKey)
    } catch {
      return null
    }
  }

  async signTransaction(tx: any): Promise<any> {
    const privateKey = this.getPrivateKey()
    const msg = Transaction.serialize(tx)
    const msgBytes = msg.toBytes()
    const prefix = new TextEncoder().encode('Transaction::')
    const dataToSign = new Uint8Array(prefix.length + msgBytes.length)
    dataToSign.set(prefix, 0)
    dataToSign.set(msgBytes, prefix.length)
    const signature = ed.sign(dataToSign, privateKey)
    return { ...tx, signature }
  }

  async signMessage(message: string): Promise<string> {
    const privateKey = this.getPrivateKey()
    const messageBytes = new TextEncoder().encode(message)
    const signature = ed.sign(messageBytes, privateKey)
    return uint8ArrayToHex(signature)
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const privateKey = seed.slice(0, 32)
    const publicKey = ed.getPublicKey(privateKey)
    const address = FastsetClient.encodeBech32Address(publicKey)
    const walletDetails: WarpWalletDetails = {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address,
      privateKey: uint8ArrayToHex(privateKey),
      mnemonic,
    }
    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    const privateKeyBytes = hexToUint8Array(privateKey)
    const publicKey = ed.getPublicKey(privateKeyBytes)
    const address = FastsetClient.encodeBech32Address(publicKey)
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
    const privateKey = this.getPrivateKey()
    const privateKeyHex = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    const publicKey = ed.getPublicKey(privateKey)
    const address = FastsetClient.encodeBech32Address(publicKey)
    return {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address,
      privateKey: privateKeyHex || null,
      mnemonic: mnemonic || null,
    }
  }

  async generate(): Promise<WarpWalletDetails> {
    const privateKey = ed.utils.randomSecretKey()
    const publicKey = ed.getPublicKey(privateKey)
    const address = FastsetClient.encodeBech32Address(publicKey)
    return {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address,
      privateKey: uint8ArrayToHex(privateKey),
      mnemonic: null,
    }
  }

  async delete(externalId: string): Promise<void> {
    removeWarpWalletFromConfig(this.config, this.chain.name)
  }

  private getPrivateKey(): Uint8Array {
    if (this.privateKey) return this.privateKey

    const privateKeyHex = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKeyHex) throw new Error('No private key provided')

    this.privateKey = hexToUint8Array(privateKeyHex)
    return this.privateKey
  }
}
