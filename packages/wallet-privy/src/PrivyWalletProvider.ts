import { WalletProvider, WarpWalletDetails, WarpWalletProvider } from '@joai/warps'

export interface PrivyClient {
  getAddress(): Promise<string | null>
  signTransaction(tx: any): Promise<string>
  signMessage(message: string): Promise<string>
}

export interface PrivyWalletProviderConfig {
  privyClient: PrivyClient
  address?: string
}

export class PrivyWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'privy'
  constructor(private config: PrivyWalletProviderConfig) {}

  async getAddress(): Promise<string | null> {
    try {
      const address = await this.config.privyClient.getAddress()
      return address || this.config.address || null
    } catch {
      return this.config.address || null
    }
  }

  async getPublicKey(): Promise<string | null> {
    // Privy doesn't expose public key directly
    return null
  }

  async signTransaction(tx: any): Promise<any> {
    try {
      const signature = await this.config.privyClient.signTransaction(tx)
      return { ...tx, signature }
    } catch (error) {
      throw new Error(`Failed to sign transaction: ${error}`)
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      return await this.config.privyClient.signMessage(message)
    } catch (error) {
      throw new Error(`Failed to sign message: ${error}`)
    }
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    throw new Error('PrivyWalletProvider: importFromMnemonic not supported - Privy manages wallets externally')
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    throw new Error('PrivyWalletProvider: importFromPrivateKey not supported - Privy manages wallets externally')
  }

  async export(): Promise<WarpWalletDetails> {
    throw new Error('PrivyWalletProvider: export not supported - Privy manages wallets externally')
  }

  async generate(): Promise<WarpWalletDetails> {
    throw new Error('PrivyWalletProvider: generate not supported - Privy manages wallets externally')
  }

  async delete(externalId: string): Promise<void> {
    throw new Error('PrivyWalletProvider: delete not supported - Privy manages wallets externally')
  }
}
