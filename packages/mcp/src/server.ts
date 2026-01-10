import { Warp } from '@joai/warps'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { normalizeObjectSchema } from '@modelcontextprotocol/sdk/server/zod-compat.js'
import { z } from 'zod'
import { convertMcpArgsToWarpInputs } from './helpers/execution'
import { interpolatePromptWithArgs } from './helpers/prompts'
import {
  McpToolArgs,
  McpToolResult,
  ToolInputSchema,
  WarpMcpCapabilities,
  WarpMcpExecutor,
  WarpMcpPrompt,
  WarpMcpServerConfig,
} from './types'

const processInputSchema = (inputSchema: ToolInputSchema): z.ZodTypeAny | Record<string, z.ZodTypeAny> | undefined => {
  if (!inputSchema) return undefined
  if (typeof inputSchema === 'object' && '_zod' in inputSchema) {
    return (inputSchema as { _zod: z.ZodTypeAny })._zod
  }
  if (typeof inputSchema === 'object' && !Array.isArray(inputSchema)) {
    const normalized = normalizeObjectSchema(inputSchema as Parameters<typeof normalizeObjectSchema>[0])
    return (normalized || inputSchema) as z.ZodTypeAny | Record<string, z.ZodTypeAny>
  }
  return inputSchema as z.ZodTypeAny | Record<string, z.ZodTypeAny>
}

const buildPromptArgsSchema = (prompt: WarpMcpPrompt): Record<string, z.ZodTypeAny> | undefined => {
  if (!prompt.arguments || prompt.arguments.length === 0) return undefined

  const schema: Record<string, z.ZodTypeAny> = {}
  for (const arg of prompt.arguments) {
    let argSchema: z.ZodTypeAny = z.string()
    if (arg.description) argSchema = argSchema.describe(arg.description)
    if (!arg.required) argSchema = argSchema.optional()
    schema[arg.name] = argSchema
  }
  return schema
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
      const inputSchema = processInputSchema(tool.inputSchema)
      const toolDefinition = {
        description: tool.description || '',
        inputSchema,
        ...(tool.meta && { _meta: tool.meta }),
      }
      server.registerTool(
        tool.name,
        toolDefinition as Parameters<typeof server.registerTool>[1],
        async (args: McpToolArgs): Promise<McpToolResult> => {
          const inputs = convertMcpArgsToWarpInputs(warp, args || {})
          const result = await executor(warp, inputs)
          return result
        }
      )
    }

    if (resource) {
      server.registerResource(
        resource.name || resource.uri,
        resource.uri,
        { description: resource.description, mimeType: resource.mimeType },
        async () => {
          const content: { uri: string; text: string; mimeType?: string; _meta?: Record<string, unknown> } = {
            uri: resource.uri,
            text: resource.content || '',
            mimeType: resource.mimeType,
          }
          if (resource.meta) content._meta = resource.meta as Record<string, unknown>
          return { contents: [content] }
        }
      )
    }

    if (prompt) {
      const argsSchemaRaw = buildPromptArgsSchema(prompt)
      server.registerPrompt(
        prompt.name,
        {
          description: prompt.description || '',
          argsSchema: argsSchemaRaw as Parameters<typeof server.registerPrompt>[1]['argsSchema'],
        },
        (args: Record<string, string>) => {
          const interpolatedPrompt = interpolatePromptWithArgs(prompt.prompt, args)
          return {
            messages: [{ role: 'user' as const, content: { type: 'text' as const, text: interpolatedPrompt } }],
          }
        }
      )
    }
  }

  return server
}
