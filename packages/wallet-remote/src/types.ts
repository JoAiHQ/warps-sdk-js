import { WarpWalletProvider } from '@joai/warps'

export const DEFAULT_REMOTE_WALLET_PROVIDER_NAME: WarpWalletProvider = 'remote'

export type RemoteWalletProviderEndpoints = {
  generate: string
  import: string
  export: string
  delete: string
  signTransaction: string
  signMessage: string
}

export type RemoteWalletOperation = 'generate' | 'import' | 'export' | 'delete' | 'signTransaction' | 'signMessage'

export type RemoteWalletAccessTokenParams = {
  walletId: string
  chain: string
  nonce: string
}

export type RemoteWalletRequestContext = {
  operation: RemoteWalletOperation
  chain: string
  walletId?: string
  nonce?: string
}

export type RemoteWalletProviderConfig = {
  baseUrl: string
  allowInsecureHttp?: boolean
  providerName?: WarpWalletProvider
  endpoints?: Partial<RemoteWalletProviderEndpoints>
  timeoutMs?: number
  headers?: Record<string, string>
  getHeaders?: (context: RemoteWalletRequestContext) => Promise<Record<string, string> | undefined> | Record<string, string> | undefined
  transformPayload?: (
    context: RemoteWalletRequestContext,
    payload: Record<string, unknown>
  ) => Promise<Record<string, unknown>> | Record<string, unknown>
  serviceToken?: string
  getServiceToken?: () => Promise<string> | string
  accessToken?: string
  getAccessToken?: (params: RemoteWalletAccessTokenParams) => Promise<string> | string
}

export type RemoteWalletLifecycleResponse = {
  provider?: WarpWalletProvider
  walletId: string
  externalId?: string
  address: string
}
