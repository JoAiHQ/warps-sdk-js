import { WarpChainName } from '../constants'
import { WarpAdapterGenericRemoteTransaction } from './config'
import { WarpTheme } from './general'

export type WarpChainAccount = {
  chain: WarpChainName
  address: string
  balance: bigint
}

export type WarpChainAssetValue = {
  identifier: string
  amount: bigint
}

export type WarpChainAssetLogoThemed = Record<WarpTheme, string>
export type WarpChainAssetLogo = string | WarpChainAssetLogoThemed | null

export type WarpChainAssetType = 'fungible' | 'nft' | 'sft'

export type WarpChainAssetNftMetadata = {
  collection?: string
  nonce?: bigint
  mediaUrl?: string
  thumbnailUrl?: string
  attributes?: Record<string, string>
  royalties?: number
  rank?: number
  creator?: string
}

export type WarpChainAsset = {
  chain: WarpChainName
  identifier: string
  name: string
  symbol: string
  amount?: bigint
  decimals?: number
  logoUrl?: WarpChainAssetLogo
  price?: number
  supply?: bigint
  type?: WarpChainAssetType
  nft?: WarpChainAssetNftMetadata
}

export type WarpChainAction = {
  chain: WarpChainName
  id: string
  sender: string
  receiver: string
  value: bigint
  function: string
  status: WarpChainActionStatus
  createdAt: string
  error?: string | null
  tx?: WarpAdapterGenericRemoteTransaction | null
}

export type WarpChainActionStatus = 'pending' | 'success' | 'failed'
