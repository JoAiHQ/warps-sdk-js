import { WarpActionInput, WarpChainName } from '@joai/warps'

export type OpenApiConvertOptions = {
  sourceUrl?: string
  endpoints?: string[]
  chain?: WarpChainName
}

export type OpenApiMethod = 'get' | 'post' | 'put' | 'delete'

export type OpenApiParameterLocation = 'path' | 'query'

export type OpenApiParameter = {
  name: string
  in: OpenApiParameterLocation
  required: boolean
  type: string
  description?: string
  defaultValue?: string | number | boolean
}

export type OpenApiOperation = {
  identifier: string
  title: string
  description: string
  method: OpenApiMethod
  url: string
  parameters: OpenApiParameter[]
  payloadInputs: WarpActionInput[]
}

export type JsonLikeObject = Record<string, unknown>
