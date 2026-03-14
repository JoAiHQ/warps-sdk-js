import {
  Warp,
  WarpActionInput,
  WarpActionInputType,
  WarpBuilder,
  WarpClientConfig,
  WarpMcpAction,
  WarpPromptAction,
  WarpText,
  getWarpPrimaryAction,
  resolveWarpText,
} from '@joai/warps'
import type { WarpMcpCapabilities, WarpMcpPrompt, WarpMcpResource, WarpMcpTool } from '../types'
import { convertPromptActionToPrompt } from './prompts'
import { convertActionToTool, convertMcpActionToTool } from './tools'
import { createAppResource } from './ui'

export const convertWarpToMcpCapabilities = async (warp: Warp, config: WarpClientConfig): Promise<WarpMcpCapabilities> => {
  let tool: WarpMcpTool | null = null
  let resource: WarpMcpResource | null = null
  let prompt: WarpMcpPrompt | null = null

  if (warp.ui && warp.ui !== 'table') {
    resource = await createAppResource(warp, warp.ui, config)
  }

  if (warp.actions.length === 0) {
    return { tool: null, resource, prompt: null }
  }

  try {
    const { action: primaryAction } = getWarpPrimaryAction(warp)
    const description = extractTextOrUndefined(warp.description, config) || extractTextOrUndefined(primaryAction.description, config)

    if (primaryAction.type === 'prompt') {
      const promptAction = primaryAction as WarpPromptAction
      prompt = convertPromptActionToPrompt(warp, promptAction, description, config)
    } else if (primaryAction.type === 'mcp') {
      const mcpAction = primaryAction as WarpMcpAction
      if (mcpAction.destination) {
        tool = convertMcpActionToTool(warp, mcpAction, description, primaryAction.inputs, resource, config)
      }
    } else {
      tool = convertActionToTool(warp, primaryAction, description, primaryAction.inputs, resource, config)
    }
  } catch (error) {
    // If getWarpPrimaryAction fails or conversion fails, return null capabilities
    return { tool: null, resource, prompt: null }
  }

  return { tool, resource, prompt }
}

export const convertWarpsToMcpCapabilities = async (warps: Warp[], config: WarpClientConfig): Promise<WarpMcpCapabilities[]> => {
  return Promise.all(warps.map((warp) => convertWarpToMcpCapabilities(warp, config)))
}

const convertJsonSchemaTypeToWarpType = (type: string, format?: string): WarpActionInputType => {
  if (format === 'date-time' || format === 'date') return 'string'
  if (type === 'string') return 'string'
  if (type === 'number') return 'uint256'
  if (type === 'integer') return 'uint256'
  if (type === 'boolean') return 'bool'
  if (type === 'array') return 'string'
  if (type === 'object') return 'string'
  return 'string'
}

type JsonSchemaProperty = {
  type?: string
  format?: string
  title?: string
  description?: string
  default?: unknown
}

type JsonSchema = {
  properties?: Record<string, JsonSchemaProperty>
  required?: string[]
}

export const convertMcpToolToWarp = async (
  config: WarpClientConfig,
  tool: { name: string; description?: string; inputSchema?: JsonSchema; outputSchema?: JsonSchema },
  url: string,
  headers?: Record<string, string>
): Promise<Warp> => {
  const inputs: WarpActionInput[] = []

  if (tool.inputSchema?.properties) {
    const properties = tool.inputSchema.properties
    const required = tool.inputSchema.required || []

    Object.entries(properties).forEach(([key, value]: [string, JsonSchemaProperty]) => {
      const isRequired = required.includes(key)
      const inputType = convertJsonSchemaTypeToWarpType(value.type || 'string', value.format)

      const inputDef: WarpActionInput = {
        name: key,
        label: typeof value.title === 'string' ? { en: value.title } : value.title || { en: key },
        description: value.description ? { en: value.description.trim() } : null,
        type: inputType,
        position: `payload:${key}` as WarpActionInput['position'],
        source: 'field',
        required: isRequired,
        ...((value.default !== undefined && typeof value.default === 'string') ||
        typeof value.default === 'number' ||
        typeof value.default === 'boolean'
          ? { default: value.default as string | number | boolean }
          : {}),
      }

      inputs.push(inputDef)
    })
  }

  const output: Record<string, string> = {}
  if (tool.outputSchema?.properties) {
    Object.keys(tool.outputSchema.properties).forEach((key) => {
      output[key] = `out.${key}`
    })
  }

  const mcpAction: WarpMcpAction = {
    type: 'mcp',
    label: { en: tool.name },
    description: tool.description ? { en: tool.description.trim() } : null,
    destination: { url, tool: tool.name, headers },
    inputs,
  }

  return await new WarpBuilder(config)
    .setName(tool.name || 'unnamed_tool')
    .setTitle({ en: tool.name || 'Unnamed Tool' })
    .setDescription(tool.description ? { en: tool.description.trim() } : null)
    .addAction(mcpAction)
    .setOutput(Object.keys(output).length > 0 ? output : null)
    .build(false)
}

export const extractTextOrUndefined = (text: WarpText | null | undefined, config: WarpClientConfig): string | undefined => {
  if (!text) return undefined
  const resolved = resolveWarpText(text, config)
  return resolved || undefined
}
