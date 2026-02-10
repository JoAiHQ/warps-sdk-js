import { Account, Message, Mnemonic, Transaction, UserSecretKey } from '@multiversx/sdk-core'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
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

export class MnemonicWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'mnemonic'
  private account: Account | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {}

  async getAddress(): Promise<string | null> {
    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    if (address) return address

    try {
      const account = this.getAccount()
      return account.address.toBech32()
    } catch {
      return null
    }
  }

  async getPublicKey(): Promise<string | null> {
    try {
      const account = this.getAccount()
      const pubKey = account.publicKey
      return pubKey.hex()
    } catch {
      return null
    }
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    const account = this.getAccount()
    const signature = await account.signTransaction(tx)
    tx.signature = signature
    return tx
  }

  async signMessage(message: string): Promise<string> {
    const account = this.getAccount()
    const messageData = new TextEncoder().encode(message)
    const signature = await account.signMessage(new Message({ data: messageData }))
    return Buffer.from(signature).toString('hex')
  }

  getAccountInstance(): Account {
    return this.getAccount()
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    const trimmedMnemonic = normalizeAndValidateMnemonic(mnemonic)
    const mnemonicObj = Mnemonic.fromString(trimmedMnemonic)
    const privateKey = mnemonicObj.deriveKey(0)
    const privateKeyHex = privateKey.hex()
    const pubKey = privateKey.generatePublicKey()
    const address = pubKey.toAddress(this.chain.addressHrp).toBech32()
    const walletDetails: WarpWalletDetails = {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address,
      privateKey: privateKeyHex,
      mnemonic: trimmedMnemonic,
    }
    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    const secretKey = UserSecretKey.fromString(privateKey)
    const privateKeyHex = secretKey.hex()
    const pubKey = secretKey.generatePublicKey()
    const address = pubKey.toAddress(this.chain.addressHrp).toBech32()
    const walletDetails: WarpWalletDetails = {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address,
      privateKey: privateKeyHex,
      mnemonic: null,
    }
    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  async export(): Promise<WarpWalletDetails> {
    const account = this.getAccount()
    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address: account.address.toBech32(),
      privateKey: privateKey || null,
      mnemonic: mnemonic || null,
    }
  }

  async generate(): Promise<WarpWalletDetails> {
    const mnemonicRaw = bip39.generateMnemonic(wordlist, 256)
    const mnemonicWords = normalizeMnemonic(mnemonicRaw)
    validateMnemonicLength(mnemonicWords)
    const mnemonic = Mnemonic.fromString(mnemonicWords)
    const privateKey = mnemonic.deriveKey(0)
    const pubKey = privateKey.generatePublicKey()
    const address = pubKey.toAddress(this.chain.addressHrp).toBech32()
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address,
      privateKey: null,
      mnemonic: mnemonicWords,
    }
  }

  private getAccount(): Account {
    if (this.account) return this.account

    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (!mnemonic) throw new Error('No mnemonic provided')

    const mnemonicObj = Mnemonic.fromString(mnemonic)
    const secretKey = mnemonicObj.deriveKey(0)
    this.account = new Account(secretKey, this.chain.addressHrp)
    return this.account
  }
}
