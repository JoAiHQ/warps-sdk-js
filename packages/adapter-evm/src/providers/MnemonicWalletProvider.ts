import { WalletProvider, WarpWalletDetails, WarpWalletProvider } from '@joai/warps'
import { ethers, HDNodeWallet } from 'ethers'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
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

export class MnemonicWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'mnemonic'
  private wallet: ethers.Wallet | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {}

  async getAddress(): Promise<string | null> {
    try {
      const wallet = this.getWallet()
      return wallet.address
    } catch {
      return null
    }
  }

  async getPublicKey(): Promise<string | null> {
    try {
      const wallet = this.getWallet()
      const publicKey = wallet.signingKey.publicKey
      return publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey
    } catch {
      return null
    }
  }

  async signTransaction(tx: any): Promise<any> {
    const wallet = this.getWallet()

    const txRequest = {
      to: tx.to,
      data: tx.data,
      value: tx.value || 0,
      gasLimit: tx.gasLimit,
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      nonce: tx.nonce,
      chainId: tx.chainId,
    }

    const signedTx = await wallet.signTransaction(txRequest)
    return { ...tx, signature: signedTx }
  }

  async signMessage(message: string): Promise<string> {
    const wallet = this.getWallet()
    return await wallet.signMessage(message)
  }

  getWalletInstance(): ethers.Wallet {
    return this.getWallet()
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    const trimmedMnemonic = normalizeAndValidateMnemonic(mnemonic)
    const wallet = HDNodeWallet.fromPhrase(trimmedMnemonic) as unknown as ethers.Wallet
    const walletDetails: WarpWalletDetails = {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: trimmedMnemonic,
    }
    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    const wallet = new ethers.Wallet(privateKey)
    const walletDetails: WarpWalletDetails = {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: null,
    }
    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  async export(): Promise<WarpWalletDetails> {
    const wallet = this.getWallet()
    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address: wallet.address,
      privateKey: privateKey || null,
      mnemonic: mnemonic || null,
    }
  }

  async generate(): Promise<WarpWalletDetails> {
    const mnemonicRaw = bip39.generateMnemonic(wordlist, 256)
    const mnemonic = normalizeMnemonic(mnemonicRaw)
    validateMnemonicLength(mnemonic)
    const wallet = HDNodeWallet.fromPhrase(mnemonic) as unknown as ethers.Wallet
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address: wallet.address,
      privateKey: null,
      mnemonic,
    }
  }

  async delete(externalId: string): Promise<void> {
    removeWarpWalletFromConfig(this.config, this.chain.name)
  }

  private getWallet(): ethers.Wallet {
    if (this.wallet) return this.wallet
    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (!mnemonic) throw new Error('No mnemonic provided')
    this.wallet = HDNodeWallet.fromPhrase(mnemonic.trim()) as unknown as ethers.Wallet
    return this.wallet
  }
}
