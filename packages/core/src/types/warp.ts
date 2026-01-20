import { WarpChainName } from '../constants'
import { WarpAlerts } from './alerts'
import { WarpChainAsset, WarpChainAssetValue } from './chain'
import { ChainAdapter } from './config'
import { WarpTheme } from './general'
import { WarpText } from './i18n'

export type WarpExplorerName = string

export type WarpChainInfoLogoThemed = Record<WarpTheme, string>
export type WarpChainInfoLogo = string | WarpChainInfoLogoThemed

export type WarpChainInfo = {
  name: WarpChainName
  displayName: string
  chainId: string
  blockTime: number
  addressHrp: string
  defaultApiUrl: string
  logoUrl: WarpChainInfoLogo
  nativeToken: WarpChainAsset
}

export type WarpIdentifierType = 'hash' | 'alias'

export type WarpVarPlaceholder = string

export type WarpOutputName = string

export type WarpResulutionPath = string

export type WarpMessageName = string

export type Warp = {
  protocol: string
  chain?: WarpChainName
  name: string
  title: WarpText
  description: WarpText | null
  bot?: string
  preview?: string
  vars?: Record<WarpVarPlaceholder, string>
  actions: WarpAction[]
  next?: string
  output?: Record<WarpOutputName, WarpResulutionPath>
  messages?: Record<WarpMessageName, WarpText>
  ui?: string
  alerts?: WarpAlerts
  related?: string[]
  meta?: WarpMeta
}

export type WarpMeta = {
  chain: WarpChainName
  identifier: string
  query: Record<string, string> | null
  hash: string
  creator: string
  createdAt: string
}

export type WarpAction = WarpTransferAction | WarpContractAction | WarpQueryAction | WarpCollectAction | WarpLinkAction | WarpMcpAction | WarpPromptAction

export type WarpActionIndex = number

export type WarpActionType = 'transfer' | 'contract' | 'query' | 'collect' | 'link' | 'mcp' | 'prompt'

export type WarpTransferAction = {
  type: WarpActionType
  label: WarpText
  description?: WarpText | null
  address?: string
  data?: string
  value?: string
  transfers?: string[]
  inputs?: WarpActionInput[]
  primary?: boolean
  auto?: boolean
  next?: string
  when?: string
}

export type WarpContractAction = {
  type: WarpActionType
  label: WarpText
  description?: WarpText | null
  address?: string
  func?: string | null
  args?: string[]
  value?: string
  gasLimit: number
  transfers?: string[]
  abi?: string
  inputs?: WarpActionInput[]
  primary?: boolean
  auto?: boolean
  next?: string
  when?: string
}

export type WarpQueryAction = {
  type: WarpActionType
  label: WarpText
  description?: WarpText | null
  address?: string
  func?: string
  args?: string[]
  abi?: string
  inputs?: WarpActionInput[]
  primary?: boolean
  auto?: boolean
  next?: string
  when?: string
}

export type WarpCollectAction = {
  type: WarpActionType
  label: WarpText
  description?: WarpText | null
  destination?: WarpCollectDestination
  inputs?: WarpActionInput[]
  primary?: boolean
  auto?: boolean
  next?: string
  when?: string
}

export type WarpCollectDestination = WarpCollectDestinationHttp | string

export type WarpCollectDestinationHttp = {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
}

export type WarpLinkAction = {
  type: WarpActionType
  label: WarpText
  description?: WarpText | null
  url: string
  inputs?: WarpActionInput[]
  primary?: boolean
  auto?: boolean
  when?: string
}

export type WarpMcpAction = {
  type: WarpActionType
  label: WarpText
  description?: WarpText | null
  destination?: WarpMcpDestination
  inputs?: WarpActionInput[]
  primary?: boolean
  auto?: boolean
  next?: string
  when?: string
}

export type WarpMcpDestination = {
  url: string
  tool: string
  headers?: Record<string, string>
}

export type WarpPromptAction = {
  type: WarpActionType
  label: WarpText
  description?: WarpText | null
  prompt: string
  inputs?: WarpActionInput[]
  primary?: boolean
  auto?: boolean
  next?: string
  when?: string
}

export type WarpActionInputSource = 'field' | 'query' | 'user:wallet' | 'hidden'

export type BaseWarpActionInputType =
  | 'string'
  | 'uint8'
  | 'uint16'
  | 'uint32'
  | 'uint64'
  | 'uint128'
  | 'uint256'
  | 'biguint'
  | 'bool'
  | 'address'
  | 'hex'
  | string

export type WarpActionInputType = string

export interface WarpStructValue {
  [key: string]: WarpNativeValue
}

export type WarpNativeValue = string | number | bigint | boolean | WarpChainAssetValue | null | WarpNativeValue[] | WarpStructValue

export type WarpActionInputPosition =
  | 'receiver'
  | 'value'
  | 'transfer'
  | `arg:${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`
  | 'data'
  | 'chain'
  | `payload:${string}`
  | 'destination'
  | WarpActionInputPositionAssetObject

export type WarpActionInputPositionAssetObject = {
  token: `arg:${string}`
  amount: `arg:${string}`
}

export type WarpActionInputModifier = 'scale' | 'transform'

export type WarpActionInput = {
  name: string
  as?: string
  label?: WarpText
  description?: WarpText | null
  bot?: string
  type: WarpActionInputType
  position?: WarpActionInputPosition
  source: WarpActionInputSource
  required?: boolean
  min?: number | WarpVarPlaceholder
  max?: number | WarpVarPlaceholder
  pattern?: string
  patternDescription?: WarpText
  options?: string[] | { [key: string]: WarpText }
  modifier?: string
  default?: string | number | boolean
}

export type ResolvedInput = {
  input: WarpActionInput
  value: string | null
}

export type WarpContract = {
  address: string
  owner: string
  verified: boolean
}

export type WarpContractVerification = {
  codeHash: string
  abi: object
}

export type WarpExecutable = {
  adapter: ChainAdapter
  chain: WarpChainInfo
  warp: Warp
  action: number
  destination: string | null
  args: string[]
  value: bigint
  transfers: WarpChainAssetValue[]
  data: string | null
  resolvedInputs: ResolvedInput[]
}
