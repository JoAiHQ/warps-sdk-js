import { WalletProvider, WarpWalletDetails } from '@joai/warps'
import { getWarpWalletAddressFromConfig, removeWarpWalletFromConfig, WarpChainInfo, WarpClientConfig } from '@joai/warps'

export class ReadOnlyWalletProvider implements WalletProvider {
  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {}

  async getAddress(): Promise<string | null> {
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  async getPublicKey(): Promise<string | null> {
    return null
  }

  async signTransaction(tx: any): Promise<any> {
    const address = await this.getAddress()
    throw new Error(`Wallet can not be used for signing: ${address}`)
  }

  async signMessage(message: string): Promise<string> {
    const address = await this.getAddress()
    throw new Error(`Wallet can not be used for signing: ${address}`)
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    throw new Error(`Wallet can not be used for signing: ${address}`)
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    throw new Error(`Wallet can not be used for signing: ${address}`)
  }

  async export(): Promise<WarpWalletDetails> {
    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    throw new Error(`Wallet can not be used for signing: ${address}`)
  }

  async generate(): Promise<WarpWalletDetails> {
    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    throw new Error(`Wallet can not be used for signing: ${address}`)
  }

  async delete(externalId: string): Promise<void> {
    removeWarpWalletFromConfig(this.config, this.chain.name)
  }
}
