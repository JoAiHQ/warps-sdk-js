import { Warp } from '@joai/warps'
import { z } from 'zod'

export type WarpMcpServerConfig = {
  name: string
  version?: string
}

export type JsonSchema = Record<string, unknown>
export type ToolInputSchema = Record<string, z.ZodTypeAny> | JsonSchema | undefined
export type ToolOutputSchema = JsonSchema | undefined

export type WarpAppToolVisibility = 'model' | 'app'

export type WarpAppUiMeta = {
  resourceUri?: string
  visibility?: WarpAppToolVisibility[]
}

export type WarpAppResourceUiMeta = {
  csp?: {
    resourceDomains?: string[]
    connectDomains?: string[]
    frameDomains?: string[]
    baseUriDomains?: string[]
  }
  permissions?: {
    camera?: Record<string, never>
    microphone?: Record<string, never>
    geolocation?: Record<string, never>
    clipboardWrite?: Record<string, never>
  }
  domain?: string
  prefersBorder?: boolean
}

export type ToolMeta = {
  ui?: WarpAppUiMeta
  [key: string]: unknown
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
  structuredContent?: Record<string, unknown>
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
  _meta?: ToolMeta
}

export type WarpMcpExecutor = (warp: Warp, inputs: string[]) => Promise<WarpMcpToolResult>

/** App-level MCP config authored per app in joai--warps/mcp.ts */
export type AppMcpConfig = WarpAppResourceUiMeta
