import { WalletProvider, WarpWalletDetails, WarpWalletProvider } from '@joai/warps'
import { ethers } from 'ethers'
import {
  getWarpWalletMnemonicFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  removeWarpWalletFromConfig,
  setWarpWalletInConfig,
  WarpChainInfo,
  WarpClientConfig,
} from '@joai/warps'

export class PrivateKeyWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'privateKey'
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
    const wallet = ethers.Wallet.fromPhrase(mnemonic)
    const walletDetails: WarpWalletDetails = {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic,
    }
    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    const wallet = new ethers.Wallet(privateKey)
    const walletDetails: WarpWalletDetails = {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
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
    return {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: mnemonic || null,
    }
  }

  async generate(): Promise<WarpWalletDetails> {
    const wallet = ethers.Wallet.createRandom()
    return {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: null,
    }
  }

  async delete(externalId: string): Promise<void> {
    removeWarpWalletFromConfig(this.config, this.chain.name)
  }

  private getWallet(): ethers.Wallet {
    if (this.wallet) return this.wallet

    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKey) throw new Error('No private key provided')

    this.wallet = new ethers.Wallet(privateKey)
    return this.wallet
  }
}
