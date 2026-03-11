import { Keypair, Transaction, VersionedTransaction } from '@solana/web3.js'
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
import bs58 from 'bs58'

export class PrivateKeyWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'privateKey'
  private keypair: Keypair | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {}

  async getAddress(): Promise<string | null> {
    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    if (address) return address

    try {
      const keypair = this.getKeypair()
      return keypair.publicKey.toBase58()
    } catch {
      return null
    }
  }

  async getPublicKey(): Promise<string | null> {
    try {
      const keypair = this.getKeypair()
      return keypair.publicKey.toBase58()
    } catch {
      return null
    }
  }

  async signTransaction(tx: any): Promise<any> {
    const keypair = this.getKeypair()

    if (tx instanceof VersionedTransaction) {
      tx.sign([keypair])
      return tx
    }

    if (tx instanceof Transaction) {
      tx.sign(keypair)
      return tx
    }

    if (tx.transaction) {
      if (tx.transaction instanceof Transaction) {
        tx.transaction.sign(keypair)
        return { ...tx, transaction: tx.transaction.serialize() }
      }
      if (typeof tx.transaction === 'object') {
        try {
          const transaction = Transaction.from(tx.transaction)
          transaction.sign(keypair)
          return { ...tx, transaction: transaction.serialize(), signature: transaction.signature }
        } catch {
          throw new Error('Invalid transaction format')
        }
      }
    }

    throw new Error('Invalid transaction format')
  }

  async signMessage(message: string): Promise<string> {
    const keypair = this.getKeypair()
    const messageBytes = new TextEncoder().encode(message)
    const nacl = await import('tweetnacl')
    const secretKey = keypair.secretKey
    if (secretKey.length !== 64) {
      throw new Error(`Invalid secret key length: expected 64, got ${secretKey.length}`)
    }
    const privateKeySlice = secretKey.slice(0, 32)
    const privateKeyBytes = new Uint8Array(privateKeySlice)
    if (privateKeyBytes.length !== 32) {
      throw new Error(`Invalid private key length: expected 32, got ${privateKeyBytes.length}`)
    }
    const signature = nacl.sign.detached(messageBytes, privateKeyBytes)
    return bs58.encode(signature)
  }

  getKeypairInstance(): Keypair {
    return this.getKeypair()
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    throw new Error('PrivateKeyWalletProvider does not support importing from mnemonics. Use MnemonicWalletProvider instead.')
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    const keypair = Keypair.fromSecretKey(bs58.decode(privateKey))
    const walletDetails: WarpWalletDetails = {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address: keypair.publicKey.toBase58(),
      privateKey: bs58.encode(keypair.secretKey),
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
      address: keypair.publicKey.toBase58(),
      privateKey: privateKey || null,
      mnemonic: mnemonic || null,
    }
  }

  async generate(): Promise<WarpWalletDetails> {
    const keypair = Keypair.generate()
    return {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address: keypair.publicKey.toBase58(),
      privateKey: bs58.encode(keypair.secretKey),
      mnemonic: null,
    }
  }

  async delete(externalId: string): Promise<void> {
    removeWarpWalletFromConfig(this.config, this.chain.name)
  }

  private getKeypair(): Keypair {
    if (this.keypair) return this.keypair

    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKey) throw new Error('No private key provided')

    try {
      const secretKey = bs58.decode(privateKey)
      if (secretKey.length === 64) {
        this.keypair = Keypair.fromSecretKey(secretKey)
        return this.keypair
      } else if (secretKey.length === 32) {
        this.keypair = Keypair.fromSeed(secretKey)
        return this.keypair
      } else {
        throw new Error(`Invalid private key length: expected 32 or 64 bytes, got ${secretKey.length}`)
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Invalid private key format: ${error.message}`)
      }
      throw new Error('Invalid private key format')
    }
  }
}
