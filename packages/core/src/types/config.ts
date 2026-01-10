import { WarpChainName } from '../constants'
import { WarpAbiContents } from './abi'
import { WarpBrand } from './brand'
import { ClientCacheConfig } from './cache'
import { WarpChainAccount, WarpChainAction, WarpChainAsset } from './chain'
import { WarpChainEnv, WarpTheme } from './general'
import { WarpLocale } from './i18n'
import { WarpActionExecutionResult } from './output'
import { WarpRegistryConfigInfo, WarpRegistryInfo } from './registry'
import { ClientIndexConfig } from './search'
import { ClientTransformConfig } from './transform'
import { WalletProviderFactory } from './wallet-provider'
import {
  BaseWarpActionInputType,
  Warp,
  WarpAction,
  WarpActionIndex,
  WarpActionInputType,
  WarpChainInfo,
  WarpExecutable,
  WarpExplorerName,
  WarpNativeValue,
} from './warp'

export type WarpWalletProvider = 'mnemonic' | 'privateKey' | 'coinbase' | 'privy' | 'gaupa'

export type WarpWalletDetails = {
  provider: WarpWalletProvider
  address: string
  mnemonic?: string | null
  privateKey?: string | null
  externalId?: string | null
}

export type WarpUser = {
  id?: string | null
  name?: string | null
  email?: string | null
  wallets?: WarpUserWallets
}

export type WarpUserWallets = Partial<Record<WarpChainName, WarpWalletDetails | string | null>>

export type WarpProviderPreferences = Partial<Record<WarpChainEnv, string | WarpProviderConfig>>

export type WarpProviderConfig = {
  url: string
  headers?: Record<string, string>
}

export type WarpClientConfig = {
  env: WarpChainEnv
  clientUrl?: string
  currentUrl?: string
  vars?: Record<string, string | number>
  user?: WarpUser
  preferences?: {
    locale?: WarpLocale
    theme?: WarpTheme
    explorers?: Partial<Record<WarpChainName, WarpExplorerName>>
    providers?: Partial<Record<WarpChainName, WarpProviderPreferences>>
  }
  walletProviders?: Partial<Record<WarpChainName, Partial<Record<WarpWalletProvider, WalletProviderFactory>>>>
  fallback?: WarpChainName
  schema?: {
    warp?: string
    brand?: string
  }
  cache?: ClientCacheConfig
  transform?: ClientTransformConfig
  index?: ClientIndexConfig
  interceptors?: {
    openLink?: (url: string) => Promise<void>
  }
}

export type WarpCacheConfig = {
  ttl?: number
}

export type ChainAdapterFactory = (config: WarpClientConfig, fallback?: ChainAdapter | undefined) => ChainAdapter

export type ChainAdapter = {
  chainInfo: WarpChainInfo
  builder: () => CombinedWarpBuilder
  executor: AdapterWarpExecutor
  output: AdapterWarpOutput
  serializer: AdapterWarpSerializer
  registry: AdapterWarpRegistry
  explorer: AdapterWarpExplorer
  abiBuilder: () => AdapterWarpAbiBuilder
  brandBuilder: () => AdapterWarpBrandBuilder
  dataLoader: AdapterWarpDataLoader
  wallet: AdapterWarpWallet
}

export type WarpAdapterGenericTransaction = any
export type WarpAdapterGenericRemoteTransaction = any
export type WarpAdapterGenericValue = any
export type WarpAdapterGenericType = any

// Type handler for adapter-specific types
export interface WarpTypeHandler {
  // Convert string value to native value (e.g., "TOKEN-123456" -> "TOKEN-123456")
  stringToNative(value: string): any
  // Convert native value to string (e.g., "TOKEN-123456" -> "token:TOKEN-123456")
  nativeToString(value: any): string
}

// Registry for adapter-specific types
export interface AdapterTypeRegistry {
  // Register a custom type handler for a specific type
  registerType(typeName: string, handler: WarpTypeHandler): void
  // Register an alias for a type
  registerTypeAlias(typeName: string, alias: string): void
  // Check if a type is registered
  hasType(typeName: string): boolean
  // Get handler for a type
  getHandler(typeName: string): WarpTypeHandler | undefined
  // Get alias for a type (if it exists)
  getAlias(typeName: string): string | undefined
  // Resolve the final type name (handles aliases recursively)
  resolveType(typeName: string): string
  // Get all registered type names
  getRegisteredTypes(): string[]
}

export interface BaseWarpBuilder {
  createFromRaw(encoded: string, validate?: boolean): Promise<Warp>
  createFromUrl(url: string): Promise<Warp>
  setName(name: string): BaseWarpBuilder
  setTitle(title: string): BaseWarpBuilder
  setDescription(description: string | null): BaseWarpBuilder
  setPreview(preview: string): BaseWarpBuilder
  setActions(actions: WarpAction[]): BaseWarpBuilder
  addAction(action: WarpAction): BaseWarpBuilder
  setOutput(output: Record<string, string> | null): BaseWarpBuilder
  build(validate?: boolean): Promise<Warp>
}

export interface AdapterWarpBuilder {
  createInscriptionTransaction(warp: Warp): Promise<WarpAdapterGenericTransaction>
  createFromTransaction(tx: WarpAdapterGenericTransaction, validate?: boolean): Promise<Warp>
  createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<Warp | null>
}

export type CombinedWarpBuilder = AdapterWarpBuilder & BaseWarpBuilder

export interface AdapterWarpAbiBuilder {
  createInscriptionTransaction(abi: WarpAbiContents): Promise<WarpAdapterGenericTransaction>
  createFromRaw(encoded: string): Promise<any>
  createFromTransaction(tx: WarpAdapterGenericTransaction): Promise<any>
  createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<any | null>
}

export interface AdapterWarpBrandBuilder {
  createInscriptionTransaction(brand: WarpBrand): WarpAdapterGenericTransaction
  createFromTransaction(tx: WarpAdapterGenericTransaction, validate?: boolean): Promise<WarpBrand>
  createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<WarpBrand | null>
}

export interface AdapterWarpExecutor {
  createTransaction(executable: WarpExecutable): Promise<WarpAdapterGenericTransaction>
  executeQuery(executable: WarpExecutable): Promise<WarpActionExecutionResult>
}

export interface AdapterWarpOutput {
  getActionExecution(warp: Warp, actionIndex: WarpActionIndex, tx: WarpAdapterGenericRemoteTransaction): Promise<WarpActionExecutionResult>
}

export interface AdapterWarpSerializer {
  typedToString(value: WarpAdapterGenericValue): string
  typedToNative(value: WarpAdapterGenericValue): [WarpActionInputType, WarpNativeValue]
  nativeToTyped(type: WarpActionInputType, value: WarpNativeValue): WarpAdapterGenericValue
  nativeToType(type: BaseWarpActionInputType): WarpAdapterGenericType
  stringToTyped(value: string): WarpAdapterGenericValue
}

export interface AdapterWarpRegistry {
  init(): Promise<void>
  getRegistryConfig(): WarpRegistryConfigInfo
  createWarpRegisterTransaction(txHash: string, alias?: string | null, brand?: string | null): Promise<WarpAdapterGenericTransaction>
  createWarpUnregisterTransaction(txHash: string): Promise<WarpAdapterGenericTransaction>
  createWarpUpgradeTransaction(alias: string, txHash: string, brand?: string | null): Promise<WarpAdapterGenericTransaction>
  createWarpAliasSetTransaction(txHash: string, alias: string): Promise<WarpAdapterGenericTransaction>
  createWarpVerifyTransaction(txHash: string): Promise<WarpAdapterGenericTransaction>
  createWarpTransferOwnershipTransaction(txHash: string, newOwner: string): Promise<WarpAdapterGenericTransaction>
  createBrandRegisterTransaction(txHash: string): Promise<WarpAdapterGenericTransaction>
  createWarpBrandingTransaction(warpHash: string, brandHash: string): Promise<WarpAdapterGenericTransaction>
  getInfoByAlias(alias: string, cache?: WarpCacheConfig): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }>
  getInfoByHash(hash: string, cache?: WarpCacheConfig): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }>
  getUserWarpRegistryInfos(user?: string): Promise<WarpRegistryInfo[]>
  getUserBrands(user?: string): Promise<WarpBrand[]>
  fetchBrand(hash: string, cache?: WarpCacheConfig): Promise<WarpBrand | null>
}

export interface AdapterWarpExplorer {
  getAccountUrl(address: string): string
  getTransactionUrl(hash: string): string
  getAssetUrl(identifier: string): string
  getContractUrl(address: string): string
}

export interface WarpDataLoaderOptions {
  page?: number
  size?: number
}

export interface AdapterWarpDataLoader {
  getAccount(address: string): Promise<WarpChainAccount>
  getAccountAssets(address: string): Promise<WarpChainAsset[]>
  getAsset(identifier: string): Promise<WarpChainAsset | null>
  getAction(identifier: string, awaitCompleted?: boolean): Promise<WarpChainAction | null>
  getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]>
}

export interface AdapterWarpWallet {
  signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction>
  signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]>
  signMessage(message: string): Promise<string>
  sendTransactions(txs: WarpAdapterGenericTransaction[]): Promise<string[]>
  sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string>
  importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails>
  importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails>
  export(provider: WarpWalletProvider): Promise<WarpWalletDetails>
  generate(provider: WarpWalletProvider): Promise<WarpWalletDetails>
  getAddress(): string | null
  getPublicKey(): string | null
  registerX402Handlers?(client: unknown): Promise<Record<string, () => void>>
}
