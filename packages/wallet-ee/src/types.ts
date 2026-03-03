import { WarpWalletProvider } from '@joai/warps'

export type CustomCloudWalletProviderEndpoints = {
  generate: string
  import: string
  export: string
  signTransaction: string
  signMessage: string
}

export type CustomCloudWalletProviderConfig = {
  baseUrl: string
  providerName?: WarpWalletProvider
  endpoints?: Partial<CustomCloudWalletProviderEndpoints>
  timeoutMs?: number
  serviceToken?: string
  getServiceToken?: () => Promise<string> | string
  accessToken?: string
  getAccessToken?: (params: { walletId: string; chain: string; nonce: string }) => Promise<string> | string
  jwtSecret?: string
  jwtIssuer?: string
  jwtAudience?: string
  jwtSubject?: string
}

export type EeWalletProviderConfig = {
  baseUrl: string
  endpoints?: Partial<CustomCloudWalletProviderEndpoints>
  timeoutMs?: number
  serviceToken?: string
  getServiceToken?: () => Promise<string> | string
  accessToken?: string
  getAccessToken?: (params: { walletId: string; chain: string; nonce: string }) => Promise<string> | string
  jwtSecret?: string
  jwtIssuer?: string
  jwtAudience?: string
  jwtSubject?: string
}
