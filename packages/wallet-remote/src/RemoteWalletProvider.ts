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
import {
  RemoteWalletOperation,
  RemoteWalletRequestContext,
  RemoteWalletLifecycleResponse,
  RemoteWalletProviderEndpoints,
  RemoteWalletProviderConfig,
  DEFAULT_REMOTE_WALLET_PROVIDER_NAME,
} from './types'

const defaultEndpoints: RemoteWalletProviderEndpoints = {
  generate: '/v1/wallets/generate',
  import: '/v1/wallets/import',
  export: '/v1/wallets/export',
  delete: '/v1/wallets/delete',
  signTransaction: '/v1/sign/transaction',
  signMessage: '/v1/sign/message',
}

type ResolvedRemoteWalletProviderConfig = RemoteWalletProviderConfig & {
  providerName: WarpWalletProvider
  endpoints: RemoteWalletProviderEndpoints
}

type SignTransactionResponse = {
  signedTransaction?: unknown
  signature?: unknown
  transactionHash?: unknown
}

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '')
const isStrictHex = (value: string): boolean => /^[0-9a-f]+$/i.test(value) && value.length % 2 === 0
const isLoopbackHost = (host: string): boolean => ['localhost', '127.0.0.1', '::1'].includes(host.toLowerCase())
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizeAndValidateBaseUrl = (baseUrl: string, allowInsecureHttp?: boolean): string => {
  const normalized = trimTrailingSlash(baseUrl.trim())
  let parsedUrl: URL

  try {
    parsedUrl = new URL(normalized)
  } catch {
    throw new Error('RemoteWalletProvider: baseUrl must be an absolute URL')
  }

  const isHttps = parsedUrl.protocol.toLowerCase() === 'https:'
  if (!isHttps && !allowInsecureHttp && !isLoopbackHost(parsedUrl.hostname)) {
    throw new Error('RemoteWalletProvider: baseUrl must use HTTPS unless allowInsecureHttp is explicitly enabled')
  }

  return normalized
}

const normalizeEndpointPath = (path: string): string => {
  const normalized = path.trim()
  if (!normalized) {
    throw new Error('RemoteWalletProvider: endpoint path must be a non-empty string')
  }

  try {
    new URL(normalized)
    throw new Error('RemoteWalletProvider: endpoint path must be relative')
  } catch (error) {
    if (error instanceof Error && error.message.includes('must be relative')) {
      throw error
    }
  }

  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

const normalizeEndpoints = (endpoints: RemoteWalletProviderEndpoints): RemoteWalletProviderEndpoints => ({
  generate: normalizeEndpointPath(endpoints.generate),
  import: normalizeEndpointPath(endpoints.import),
  export: normalizeEndpointPath(endpoints.export),
  delete: normalizeEndpointPath(endpoints.delete),
  signTransaction: normalizeEndpointPath(endpoints.signTransaction),
  signMessage: normalizeEndpointPath(endpoints.signMessage),
})

const withDefaults = (
  remoteConfig: RemoteWalletProviderConfig,
  fallbackProviderName: WarpWalletProvider
): ResolvedRemoteWalletProviderConfig => {
  const baseUrl = normalizeAndValidateBaseUrl(remoteConfig.baseUrl, remoteConfig.allowInsecureHttp)
  const endpoints = normalizeEndpoints({
    ...defaultEndpoints,
    ...(remoteConfig.endpoints || {}),
  })

  return {
    ...remoteConfig,
    baseUrl,
    providerName: remoteConfig.providerName ?? fallbackProviderName,
    endpoints,
  }
}

export class RemoteWalletProvider implements WalletProvider {
  protected readonly remoteConfig: ResolvedRemoteWalletProviderConfig

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo,
    remoteConfig: RemoteWalletProviderConfig,
    fallbackProviderName: WarpWalletProvider = DEFAULT_REMOTE_WALLET_PROVIDER_NAME
  ) {
    this.remoteConfig = withDefaults(remoteConfig, fallbackProviderName)
  }

  async getAddress(): Promise<string | null> {
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  async getPublicKey(): Promise<string | null> {
    return null
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    const signAuth = await this.getSignAuth()
    const transaction = this.toSerializableTransaction(tx)

    const response = await this.request<SignTransactionResponse>(
      this.remoteConfig.endpoints.signTransaction,
      { walletId: signAuth.walletId, chain: this.chain.name, nonce: signAuth.nonce, transaction },
      {
        bearer: signAuth.token,
        context: this.createContext('signTransaction', { walletId: signAuth.walletId, nonce: signAuth.nonce }),
      }
    )
    const txRecord = isRecord(tx) ? tx : {}

    if (typeof response.transactionHash === 'string' && response.transactionHash.trim() !== '') {
      return { ...txRecord, transactionHash: response.transactionHash }
    }

    if (response.signedTransaction !== undefined && response.signedTransaction !== null) {
      if (typeof response.signedTransaction === 'string') {
        return { ...txRecord, signature: response.signedTransaction }
      }

      if (isRecord(response.signedTransaction)) {
        return { ...txRecord, ...response.signedTransaction }
      }

      throw new Error('RemoteWalletProvider: Invalid signedTransaction format from signer service')
    }

    if (response.signature !== undefined && response.signature !== null) {
      const isMultiversxSignature = this.chain.name === 'multiversx' || this.chain.name === 'claws'

      if (isMultiversxSignature) {
        if (typeof response.signature !== 'string' || !isStrictHex(response.signature)) {
          throw new Error('RemoteWalletProvider: Invalid hex signature for multiversx transaction')
        }
        return { ...txRecord, signature: Buffer.from(response.signature, 'hex') }
      }

      if (typeof response.signature !== 'string' && !Array.isArray(response.signature)) {
        throw new Error('RemoteWalletProvider: Invalid signature format from signer service')
      }

      return { ...txRecord, signature: response.signature }
    }

    throw new Error('RemoteWalletProvider: Invalid signTransaction response from signer service')
  }

  async signMessage(message: string): Promise<string> {
    const signAuth = await this.getSignAuth()

    const response = await this.request<{ signature: string }>(
      this.remoteConfig.endpoints.signMessage,
      { walletId: signAuth.walletId, chain: this.chain.name, nonce: signAuth.nonce, message },
      {
        bearer: signAuth.token,
        context: this.createContext('signMessage', { walletId: signAuth.walletId, nonce: signAuth.nonce }),
      }
    )

    if (!response.signature) throw new Error('RemoteWalletProvider: Missing signature in signMessage response')
    return response.signature
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    void mnemonic
    throw new Error('RemoteWalletProvider: importFromMnemonic() is not supported. Use importFromPrivateKey or generate().')
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    const agentId = this.config.user?.id
    if (!agentId) throw new Error('RemoteWalletProvider: user.id is required for key import')
    const serviceToken = await this.resolveServiceToken()

    return await this.requestLifecycleWallet(this.remoteConfig.endpoints.import, { agentId, chain: this.chain.name, privateKey }, serviceToken, 'import')
  }

  async export(): Promise<WarpWalletDetails> {
    const walletId = this.getWalletIdOrThrow()
    const serviceToken = await this.resolveServiceToken()

    const response = await this.request<{ provider?: WarpWalletProvider; address: string; privateKey?: string; externalId?: string }>(
      this.remoteConfig.endpoints.export,
      { walletId },
      {
        bearer: serviceToken,
        context: this.createContext('export', { walletId }),
      }
    )

    return {
      provider: response.provider ?? this.remoteConfig.providerName,
      address: response.address,
      privateKey: response.privateKey ?? null,
      externalId: response.externalId ?? walletId,
    }
  }

  async generate(): Promise<WarpWalletDetails> {
    const agentId = this.config.user?.id
    if (!agentId) throw new Error('RemoteWalletProvider: user.id is required for wallet generation')
    const serviceToken = await this.resolveServiceToken()

    return await this.requestLifecycleWallet(this.remoteConfig.endpoints.generate, { agentId, chain: this.chain.name }, serviceToken, 'generate')
  }

  async delete(externalId: string): Promise<void> {
    const serviceToken = await this.resolveServiceToken()

    await this.request(
      this.remoteConfig.endpoints.delete,
      { walletId: externalId },
      {
        bearer: serviceToken,
        context: this.createContext('delete', { walletId: externalId }),
      }
    )
  }

  private async requestLifecycleWallet(
    path: string,
    payload: Record<string, unknown>,
    token: string,
    operation: RemoteWalletOperation
  ): Promise<WarpWalletDetails> {
    const response = await this.request<RemoteWalletLifecycleResponse>(path, payload, {
      bearer: token,
      context: this.createContext(operation),
    })
    const walletDetails = this.toWalletDetails(response)
    setWarpWalletInConfig(this.config, this.chain.name, walletDetails)
    return walletDetails
  }

  private toWalletDetails(response: RemoteWalletLifecycleResponse): WarpWalletDetails {
    return {
      provider: response.provider ?? this.remoteConfig.providerName,
      address: response.address,
      externalId: response.externalId ?? response.walletId,
    }
  }

  private getWalletIdOrThrow(): string {
    const walletId = getWarpWalletExternalIdFromConfig(this.config, this.chain.name)
    if (!walletId) {
      throw new Error(`RemoteWalletProvider: externalId(walletId) is required for chain ${this.chain.name}`)
    }
    return walletId
  }

  private async resolveAccessToken(walletId: string, nonce: string): Promise<string> {
    if (this.remoteConfig.getAccessToken) {
      const token = await this.remoteConfig.getAccessToken({ walletId, chain: this.chain.name, nonce })
      return this.requireToken(token, 'access token callback')
    }
    if (this.remoteConfig.accessToken) return this.requireToken(this.remoteConfig.accessToken, 'access token')
    throw new Error('RemoteWalletProvider: No access token provider configured')
  }

  private async getSignAuth(): Promise<{ walletId: string; nonce: string; token: string }> {
    const walletId = this.getWalletIdOrThrow()
    const nonce = crypto.randomUUID()
    const token = await this.resolveAccessToken(walletId, nonce)
    return { walletId, nonce, token }
  }

  private async resolveServiceToken(): Promise<string> {
    if (this.remoteConfig.getServiceToken) {
      const token = await this.remoteConfig.getServiceToken()
      return this.requireToken(token, 'service token callback')
    }
    if (this.remoteConfig.serviceToken) return this.requireToken(this.remoteConfig.serviceToken, 'service token')
    throw new Error('RemoteWalletProvider: No service token configured for wallet lifecycle endpoints')
  }

  private toSerializableTransaction(tx: WarpAdapterGenericTransaction): unknown {
    if (tx && typeof tx === 'object') {
      if ('toPlainObject' in tx && typeof (tx as { toPlainObject?: () => unknown }).toPlainObject === 'function') {
        return (tx as { toPlainObject: () => unknown }).toPlainObject()
      }
      if ('toJSON' in tx && typeof (tx as { toJSON?: () => unknown }).toJSON === 'function') {
        return (tx as { toJSON: () => unknown }).toJSON()
      }
    }
    return tx
  }

  private async request<T>(
    path: string,
    payload: Record<string, unknown>,
    options: { bearer?: string; context: RemoteWalletRequestContext }
  ): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.remoteConfig.timeoutMs ?? 15_000)
    const context = options.context

    try {
      const resolvedPayload = await this.resolvePayload(context, payload)
      const resolvedHeaders = await this.resolveHeaders(context, options.bearer)

      const response = await fetch(`${this.remoteConfig.baseUrl}${path}`, {
        method: 'POST',
        headers: resolvedHeaders,
        body: JSON.stringify(resolvedPayload, (_, value: unknown) => (typeof value === 'bigint' ? value.toString() : value)),
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`RemoteWalletProvider request failed (${response.status}): ${text}`)
      }

      if (response.status === 204) return undefined as T
      return (await response.json()) as T
    } finally {
      clearTimeout(timeout)
    }
  }

  private requireToken(token: unknown, source: string): string {
    if (typeof token !== 'string' || token.trim() === '') {
      throw new Error(`RemoteWalletProvider: ${source} returned an empty token`)
    }
    return token.trim()
  }

  private createContext(operation: RemoteWalletOperation, extra?: Partial<RemoteWalletRequestContext>): RemoteWalletRequestContext {
    return {
      operation,
      chain: this.chain.name,
      ...extra,
    }
  }

  private async resolveHeaders(context: RemoteWalletRequestContext, bearer?: string): Promise<Record<string, string>> {
    const headersFromConfig = this.remoteConfig.headers ?? {}
    const dynamicHeaders = this.remoteConfig.getHeaders ? await this.remoteConfig.getHeaders(context) : {}

    return {
      'Content-Type': 'application/json',
      ...headersFromConfig,
      ...(dynamicHeaders ?? {}),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    }
  }

  private async resolvePayload(context: RemoteWalletRequestContext, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.remoteConfig.transformPayload) return payload
    return await this.remoteConfig.transformPayload(context, payload)
  }
}
