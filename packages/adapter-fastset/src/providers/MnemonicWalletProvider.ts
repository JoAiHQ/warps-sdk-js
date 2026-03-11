import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { WalletProvider, WarpWalletDetails, WarpWalletProvider } from '@joai/warps'
import {
  getWarpWalletMnemonicFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  normalizeAndValidateMnemonic,
  normalizeMnemonic,
  removeWarpWalletFromConfig,
  setWarpWalletInConfig,
  validateMnemonicLength,
  WarpChainInfo,
  WarpClientConfig,
} from '@joai/warps'
import { uint8ArrayToHex } from '../helpers'
import { FastsetClient } from '../sdk'
import { ed } from '../sdk/ed25519-setup'
import { Transaction } from '../sdk/types'

export class MnemonicWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'mnemonic'
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
    const trimmedMnemonic = normalizeAndValidateMnemonic(mnemonic)
    const seed = bip39.mnemonicToSeedSync(trimmedMnemonic)
    const privateKey = seed.slice(0, 32)
    const publicKey = ed.getPublicKey(privateKey)
    const address = FastsetClient.encodeBech32Address(publicKey)
    const walletDetails: WarpWalletDetails = {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address,
      privateKey: uint8ArrayToHex(privateKey),
      mnemonic: trimmedMnemonic,
    }
    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    const privateKeyBytes = Buffer.from(privateKey, 'hex')
    const publicKey = ed.getPublicKey(new Uint8Array(privateKeyBytes))
    const address = FastsetClient.encodeBech32Address(publicKey)
    const walletDetails: WarpWalletDetails = {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address,
      privateKey,
      mnemonic: null,
    }
    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  async export(): Promise<WarpWalletDetails> {
    const privateKey = this.getPrivateKey()
    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    const privateKeyHex = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    const publicKey = ed.getPublicKey(privateKey)
    const address = FastsetClient.encodeBech32Address(publicKey)
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address,
      privateKey: privateKeyHex || null,
      mnemonic: mnemonic || null,
    }
  }

  async generate(): Promise<WarpWalletDetails> {
    const mnemonicRaw = bip39.generateMnemonic(wordlist, 256)
    const mnemonic = normalizeMnemonic(mnemonicRaw)
    validateMnemonicLength(mnemonic)
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const privateKey = seed.slice(0, 32)
    const publicKey = ed.getPublicKey(privateKey)
    const address = FastsetClient.encodeBech32Address(publicKey)
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address,
      privateKey: null,
      mnemonic,
    }
  }

  async delete(externalId: string): Promise<void> {
    removeWarpWalletFromConfig(this.config, this.chain.name)
  }

  private getPrivateKey(): Uint8Array {
    if (this.privateKey) return this.privateKey

    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (!mnemonic) throw new Error('No mnemonic provided')

    const seed = bip39.mnemonicToSeedSync(mnemonic)
    this.privateKey = seed.slice(0, 32)
    return this.privateKey
  }
}
