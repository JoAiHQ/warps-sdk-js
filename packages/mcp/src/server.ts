import { Warp } from '@joai/warps'
import { fromJsonSchema, McpServer, StandardSchemaWithJSON } from '@modelcontextprotocol/server'
import { z } from 'zod'
import { convertMcpArgsToWarpInputs } from './helpers/execution'
import { interpolatePromptWithArgs } from './helpers/prompts'
import {
  JsonSchema,
  ToolInputSchema,
  WarpMcpCapabilities,
  WarpMcpExecutor,
  WarpMcpPrompt,
  WarpMcpServerConfig,
  WarpMcpToolArgs,
  WarpMcpToolResult,
} from './types'

const APP_RESOURCE_MIME_TYPE = 'text/html;profile=mcp-app'
const RESOURCE_URI_META_KEY = 'ui/resourceUri'

const isZodShape = (value: unknown): value is Record<string, z.ZodTypeAny> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return Object.values(value).some((v) => v instanceof z.ZodType)
}

const processInputSchema = (inputSchema: ToolInputSchema): StandardSchemaWithJSON | undefined => {
  if (!inputSchema) return undefined
  if ('_zod' in inputSchema) return (inputSchema as { _zod: z.ZodTypeAny })._zod as StandardSchemaWithJSON
  if (isZodShape(inputSchema)) return z.object(inputSchema)
  return fromJsonSchema(inputSchema as JsonSchema)
}

const buildPromptArgsSchema = (prompt: WarpMcpPrompt): StandardSchemaWithJSON | undefined => {
  if (!prompt.arguments || prompt.arguments.length === 0) return undefined

  const shape: Record<string, z.ZodTypeAny> = {}
  for (const arg of prompt.arguments) {
    let argSchema: z.ZodTypeAny = z.string()
    if (arg.description) argSchema = argSchema.describe(arg.description)
    if (!arg.required) argSchema = argSchema.optional()
    shape[arg.name] = argSchema
  }
  return z.object(shape)
}

const isMcpAppResource = (uri: string, mimeType?: string): boolean => {
  if (uri.startsWith('ui://')) return true
  return mimeType?.includes('profile=mcp-app') ?? false
}

const withAppResourceUri = <T extends { _meta?: Record<string, unknown> }>(definition: T, resourceUri: string): T => ({
  ...definition,
  _meta: { ...definition._meta, [RESOURCE_URI_META_KEY]: resourceUri },
})

/**
 * Tool annotations derived from warp action types (required for marketplace approval).
 * readOnlyHint = true when the warp only collects/queries data; destructiveHint = true
 * when it submits an irreversible contract transaction; openWorldHint = true because all
 * warp tools interact with external networks. Defaults assumed if unset are readOnly=false,
 * openWorld=true, destructive=true — so explicit values are required for approval.
 */
const buildToolAnnotations = (warp: Warp) => {
  const actionTypes: string[] = warp.actions?.map((a) => a.type).filter(Boolean) ?? []
  const hasContractAction = actionTypes.some((t) => t === 'contract' || t === 'transfer' || t === 'esdt')
  const isReadOnly = !hasContractAction
  return {
    readOnlyHint: isReadOnly,
    destructiveHint: hasContractAction,
    openWorldHint: true,
    idempotentHint: isReadOnly,
  }
}

export const createMcpServerFromWarps = (
  config: WarpMcpServerConfig,
  warps: Warp[],
  capabilities: WarpMcpCapabilities[],
  executor: WarpMcpExecutor
): McpServer => {
  const server = new McpServer({ name: config.name, version: config.version || '1.0.0' })

  for (let i = 0; i < capabilities.length; i++) {
    const { tool, resource, prompt } = capabilities[i]
    const warp = warps[i]

    if (tool) {
      const inputSchema = processInputSchema(tool.inputSchema) ?? z.object({})
      const toolDefinition = {
        description: tool.description || '',
        inputSchema,
        annotations: buildToolAnnotations(warp),
        ...(tool.meta && { _meta: tool.meta }),
      }

      const toolHandler = async (args: unknown): Promise<WarpMcpToolResult> => {
        const inputs = convertMcpArgsToWarpInputs(warp, (args ?? {}) as WarpMcpToolArgs)
        const result = await executor(warp, inputs)
        return result
      }

      if (tool.meta?.ui?.resourceUri) {
        server.registerTool(tool.name, withAppResourceUri(toolDefinition, tool.meta.ui.resourceUri), toolHandler)
      } else {
        server.registerTool(tool.name, toolDefinition, toolHandler)
      }
    }

    if (resource) {
      const isAppResource = isMcpAppResource(resource.uri, resource.mimeType)
      const mimeType = isAppResource ? resource.mimeType || APP_RESOURCE_MIME_TYPE : resource.mimeType
      const meta = resource.meta as Record<string, unknown> | undefined

      server.registerResource(
        resource.name || resource.uri,
        resource.uri,
        { description: resource.description, mimeType, ...(meta && { _meta: meta }) },
        async () => {
          const content: { uri: string; text: string; mimeType?: string; _meta?: Record<string, unknown> } = {
            uri: resource.uri,
            text: resource.content || '',
            mimeType,
          }
          if (meta) content._meta = meta
          return { contents: [content] }
        }
      )
    }

    if (prompt) {
      server.registerPrompt(
        prompt.name,
        {
          description: prompt.description || '',
          argsSchema: buildPromptArgsSchema(prompt) ?? z.object({}),
        },
        (args: unknown) => {
          const interpolatedPrompt = interpolatePromptWithArgs(prompt.prompt, (args ?? {}) as Record<string, string>)
          return {
            messages: [{ role: 'user' as const, content: { type: 'text' as const, text: interpolatedPrompt } }],
          }
        }
      )
    }
  }

  return server
}
