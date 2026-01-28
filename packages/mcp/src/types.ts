import { Warp } from '@joai/warps'
import { z } from 'zod'

export type WarpMcpServerConfig = {
  name: string
  version?: string
}

export type JsonSchema = Record<string, unknown>
export type ToolInputSchema = Record<string, z.ZodTypeAny> | JsonSchema | undefined
export type ToolOutputSchema = JsonSchema | undefined

export type WarpAppUiMeta = {
  resourceUri?: string
  visibility?: string[]
}

export type WarpAppResourceUiMeta = {
  csp?: {
    resourceDomains?: string[]
    connectDomains?: string[]
    frameDomains?: string[]
    baseUriDomains?: string[]
  }
  permissions?: ('camera' | 'microphone' | 'geolocation' | 'clipboard')[]
  domain?: string
  prefersBorder?: boolean
}

export type ToolMeta = {
  ui?: WarpAppUiMeta
  [key: string]: string | number | boolean | null | WarpAppUiMeta | undefined
}

export type ResourceMeta = {
  ui?: WarpAppResourceUiMeta
  [key: string]: unknown
}

export type WarpMcpTool = {
  name: string
  description?: string
  inputSchema?: ToolInputSchema
  outputSchema?: ToolOutputSchema
  meta?: ToolMeta
}

export type WarpMcpResource = {
  name?: string
  uri: string
  description?: string
  mimeType?: string
  content?: string
  meta?: ResourceMeta
}

export type WarpMcpPromptArgument = {
  name: string
  description?: string
  required?: boolean
}

export type WarpMcpPrompt = {
  name: string
  description?: string
  arguments?: WarpMcpPromptArgument[]
  prompt: string
}

export type WarpMcpCapabilities = {
  tool?: WarpMcpTool | null
  resource?: WarpMcpResource | null
  prompt?: WarpMcpPrompt | null
}

export type WarpMcpToolArgs = Record<string, unknown>
export type WarpMcpToolResult = {
  structuredContent?: any
  content: Array<{ type: 'text'; text: string }>
  _meta?: ToolMeta
}

export type WarpMcpExecutor = (warp: Warp, inputs: string[]) => Promise<WarpMcpToolResult>
