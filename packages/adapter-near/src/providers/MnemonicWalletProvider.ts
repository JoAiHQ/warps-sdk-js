import {
  getWarpWalletAddressFromConfig,
  getWarpWalletMnemonicFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  normalizeAndValidateMnemonic,
  normalizeMnemonic,
  setWarpWalletInConfig,
  validateMnemonicLength,
  WalletProvider,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
  WarpWalletProvider,
} from '@joai/warps'
import { keyToImplicitAddress, type KeyPairString } from '@near-js/crypto'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import bs58 from 'bs58'
import { KeyPair } from 'near-api-js'

export class MnemonicWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'mnemonic'
  private keypair: KeyPair | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {}

  async getAddress(): Promise<string | null> {
    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    if (address) return address

    try {
      const keypair = this.getKeyPair()
      const publicKey = keypair.getPublicKey()
      return keyToImplicitAddress(publicKey.toString())
    } catch {
      return null
    }
  }

  async getPublicKey(): Promise<string | null> {
    try {
      const keypair = this.getKeyPair()
      const publicKey = keypair.getPublicKey()
      return publicKey.toString()
    } catch {
      return null
    }
  }

  async signTransaction(tx: any): Promise<any> {
    const keypair = this.getKeyPair()
    // Near transactions are signed via the account, not the keypair directly
    return tx
  }

  async signMessage(message: string): Promise<string> {
    const keypair = this.getKeyPair()
    const messageBytes = new TextEncoder().encode(message)
    const signature = keypair.sign(messageBytes)
    return bs58.encode(signature.signature)
  }

  getKeyPairInstance(): KeyPair {
    return this.getKeyPair()
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    const trimmedMnemonic = normalizeAndValidateMnemonic(mnemonic)
    const seed = bip39.mnemonicToSeedSync(trimmedMnemonic)
    const secretKey = seed.slice(0, 32)
    const keyPair = KeyPair.fromString(`ed25519:${bs58.encode(secretKey)}` as KeyPairString)
    const publicKey = keyPair.getPublicKey()
    const accountId = keyToImplicitAddress(publicKey.toString())
    const walletDetails: WarpWalletDetails = {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address: accountId,
      privateKey: keyPair.toString(),
      mnemonic: trimmedMnemonic,
    }
    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    const keyPair = KeyPair.fromString((privateKey.startsWith('ed25519:') ? privateKey : `ed25519:${privateKey}`) as KeyPairString)
    const publicKey = keyPair.getPublicKey()
    const accountId = keyToImplicitAddress(publicKey.toString())
    const walletDetails: WarpWalletDetails = {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address: accountId,
      privateKey: keyPair.toString(),
      mnemonic: null,
    }
    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  async export(): Promise<WarpWalletDetails> {
    const keypair = this.getKeyPair()
    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    const publicKey = keypair.getPublicKey()
    const accountId = keyToImplicitAddress(publicKey.toString())
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address: accountId,
      privateKey: privateKey || null,
      mnemonic: mnemonic || null,
    }
  }

  async generate(): Promise<WarpWalletDetails> {
    const mnemonicRaw = bip39.generateMnemonic(wordlist, 256)
    const mnemonic = normalizeMnemonic(mnemonicRaw)
    validateMnemonicLength(mnemonic)
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const secretKey = seed.slice(0, 32)
    const keyPair = KeyPair.fromString(`ed25519:${bs58.encode(secretKey)}` as KeyPairString)
    const publicKey = keyPair.getPublicKey()
    const accountId = keyToImplicitAddress(publicKey.toString())
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address: accountId,
      privateKey: null,
      mnemonic,
    }
  }

  private getKeyPair(): KeyPair {
    if (this.keypair) return this.keypair

    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (!mnemonic) throw new Error('No mnemonic provided')

    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const secretKey = seed.slice(0, 32)
    this.keypair = KeyPair.fromString(`ed25519:${bs58.encode(secretKey)}` as KeyPairString)
    return this.keypair
  }
}
