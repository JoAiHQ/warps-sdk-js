import {
  getWarpWalletAddressFromConfig,
  getWarpWalletExternalIdFromConfig,
  setWarpWalletInConfig,
  WalletProvider,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
  WarpWalletProvider,
} from '@joai/warps'
import { SignJWT } from 'jose'
import { CustomCloudWalletProviderConfig, CustomCloudWalletProviderEndpoints, EeWalletProviderConfig } from './types'

const DEFAULT_ENDPOINTS: CustomCloudWalletProviderEndpoints = {
  generate: '/v1/wallets/generate',
  import: '/v1/wallets/import',
  export: '/v1/wallets/export',
  signTransaction: '/v1/sign/transaction',
  signMessage: '/v1/sign/message',
}

type ResolvedCustomCloudWalletProviderConfig = CustomCloudWalletProviderConfig & {
  providerName: WarpWalletProvider
  endpoints: CustomCloudWalletProviderEndpoints
}

const withDefaults = (
  cloudConfig: CustomCloudWalletProviderConfig,
  fallbackProviderName: WarpWalletProvider
): ResolvedCustomCloudWalletProviderConfig => ({
  ...cloudConfig,
  providerName: cloudConfig.providerName ?? fallbackProviderName,
  endpoints: {
    ...DEFAULT_ENDPOINTS,
    ...(cloudConfig.endpoints || {}),
  },
})

export class CustomCloudWalletProvider implements WalletProvider {
  static readonly DEFAULT_PROVIDER_NAME: WarpWalletProvider = 'ee'
  protected readonly cloudConfig: ResolvedCustomCloudWalletProviderConfig

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo,
    cloudConfig: CustomCloudWalletProviderConfig
  ) {
    this.cloudConfig = withDefaults(cloudConfig, CustomCloudWalletProvider.DEFAULT_PROVIDER_NAME)
  }

  async getAddress(): Promise<string | null> {
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  async getPublicKey(): Promise<string | null> {
    return null
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    const walletId = this.getWalletIdOrThrow()
    const nonce = crypto.randomUUID()
    const token = await this.resolveAccessToken(walletId, nonce)

    const transaction = this.toSerializableTransaction(tx)
    const response = await this.request<{ signedTransaction?: string; signature?: string; transactionHash?: string }>(
      this.cloudConfig.endpoints.signTransaction,
      {
        walletId,
        chain: this.chain.name,
        nonce,
        transaction,
      },
      token
    )

    if (response.transactionHash) {
      return { ...(tx as Record<string, unknown>), transactionHash: response.transactionHash }
    }

    if (response.signedTransaction) {
      return { ...(tx as Record<string, unknown>), signature: response.signedTransaction }
    }

    if (response.signature) {
      const maybeTx = tx as Record<string, unknown>
      const isMultiversxSignature = this.chain.name === 'multiversx' || this.chain.name === 'claws'
      maybeTx.signature = isMultiversxSignature ? Buffer.from(response.signature, 'hex') : response.signature
      return maybeTx
    }

    throw new Error('EeWalletProvider: Invalid signTransaction response from EE service')
  }

  async signMessage(message: string): Promise<string> {
    const walletId = this.getWalletIdOrThrow()
    const nonce = crypto.randomUUID()
    const token = await this.resolveAccessToken(walletId, nonce)

    const response = await this.request<{ signature: string }>(
      this.cloudConfig.endpoints.signMessage,
      {
        walletId,
        chain: this.chain.name,
        nonce,
        message,
      },
      token
    )

    if (!response.signature) throw new Error('EeWalletProvider: Missing signature in signMessage response')
    return response.signature
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    throw new Error('EeWalletProvider: importFromMnemonic() is not supported. Use importFromPrivateKey or generate().')
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    const agentId = this.config.user?.id
    if (!agentId) throw new Error('EeWalletProvider: user.id is required for key import')
    const serviceToken = await this.resolveServiceToken()

    const response = await this.request<{ provider?: WarpWalletProvider; walletId: string; externalId?: string; address: string }>(
      this.cloudConfig.endpoints.import,
      {
        agentId,
        chain: this.chain.name,
        privateKey,
      },
      serviceToken
    )

    const walletDetails: WarpWalletDetails = {
      provider: this.cloudConfig.providerName,
      address: response.address,
      externalId: response.externalId ?? response.walletId,
    }

    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  async export(): Promise<WarpWalletDetails> {
    const walletId = this.getWalletIdOrThrow()
    const serviceToken = await this.resolveServiceToken()
    const response = await this.request<{ provider?: WarpWalletProvider; address: string; privateKey?: string; externalId?: string }>(
      this.cloudConfig.endpoints.export,
      { walletId },
      serviceToken
    )

    return {
      provider: this.cloudConfig.providerName,
      address: response.address,
      privateKey: response.privateKey ?? null,
      externalId: response.externalId ?? walletId,
    }
  }

  async generate(): Promise<WarpWalletDetails> {
    const agentId = this.config.user?.id
    if (!agentId) throw new Error('EeWalletProvider: user.id is required for wallet generation')
    const serviceToken = await this.resolveServiceToken()

    const response = await this.request<{ provider?: WarpWalletProvider; walletId: string; externalId?: string; address: string }>(
      this.cloudConfig.endpoints.generate,
      {
        agentId,
        chain: this.chain.name,
      },
      serviceToken
    )

    const walletDetails: WarpWalletDetails = {
      provider: this.cloudConfig.providerName,
      address: response.address,
      externalId: response.externalId ?? response.walletId,
    }

    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  private getWalletIdOrThrow(): string {
    const walletId = getWarpWalletExternalIdFromConfig(this.config, this.chain.name)
    if (!walletId) throw new Error(`EeWalletProvider: externalId(walletId) is required for chain ${this.chain.name}`)
    return walletId
  }

  private async resolveAccessToken(walletId: string, nonce: string): Promise<string> {
    if (this.cloudConfig.getAccessToken) {
      return await this.cloudConfig.getAccessToken({ walletId, chain: this.chain.name, nonce })
    }
    if (this.cloudConfig.accessToken) return this.cloudConfig.accessToken
    if (this.cloudConfig.jwtSecret && this.cloudConfig.jwtIssuer && this.cloudConfig.jwtAudience) {
      const encoded = new TextEncoder().encode(this.cloudConfig.jwtSecret)
      const jwt = await new SignJWT({
        walletId,
        chain: this.chain.name,
        nonce,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(this.cloudConfig.jwtIssuer)
        .setAudience(this.cloudConfig.jwtAudience)
        .setSubject(this.cloudConfig.jwtSubject ?? this.config.user?.id ?? 'warps-ee-provider')
        .setIssuedAt()
        .setExpirationTime('60s')
        .sign(encoded)

      return jwt
    }
    throw new Error('EeWalletProvider: No access token provider configured')
  }

  private async resolveServiceToken(): Promise<string> {
    if (this.cloudConfig.getServiceToken) {
      return await this.cloudConfig.getServiceToken()
    }
    if (this.cloudConfig.serviceToken) return this.cloudConfig.serviceToken
    if (this.cloudConfig.accessToken) return this.cloudConfig.accessToken
    throw new Error('EeWalletProvider: No service token configured for wallet lifecycle endpoints')
  }

  private toSerializableTransaction(tx: WarpAdapterGenericTransaction): unknown {
    if (tx && typeof tx === 'object' && 'toPlainObject' in tx && typeof (tx as any).toPlainObject === 'function') {
      return (tx as any).toPlainObject()
    }
    return tx
  }

  private async request<T>(path: string, payload: unknown, bearer?: string): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.cloudConfig.timeoutMs ?? 15_000)

    try {
      const response = await fetch(`${this.cloudConfig.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`EeWalletProvider request failed (${response.status}): ${text}`)
      }

      return (await response.json()) as T
    } finally {
      clearTimeout(timeout)
    }
  }
}

export class EeWalletProvider extends CustomCloudWalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'ee'

  constructor(config: WarpClientConfig, chain: WarpChainInfo, eeConfig: EeWalletProviderConfig) {
    super(config, chain, { ...eeConfig, providerName: EeWalletProvider.PROVIDER_NAME })
  }
}
