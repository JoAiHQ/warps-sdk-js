import { Warp } from '@joai/warps'
import { z } from 'zod'

export type WarpMcpServerConfig = {
  name: string
  version?: string
}

export type JsonSchema = Record<string, unknown>
export type ToolInputSchema = Record<string, z.ZodTypeAny> | JsonSchema | undefined
export type ToolOutputSchema = JsonSchema | undefined
export type ToolMeta = Record<string, string | boolean>
export type ResourceMeta = Record<string, unknown>

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

export type McpToolArgs = Record<string, unknown>
export type McpToolResult = { content: Array<{ type: 'text'; text: string }> }
export type WarpMcpExecutor = (warp: Warp, inputs: string[]) => Promise<McpToolResult>
