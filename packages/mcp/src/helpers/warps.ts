import {
  Warp,
  WarpActionInput,
  WarpActionInputType,
  WarpBuilder,
  WarpClientConfig,
  WarpMcpAction,
  WarpPromptAction,
  WarpText,
  getWarpInputAction,
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
    const { action: inputAction } = getWarpInputAction(warp)
    const description = extractTextOrUndefined(warp.description, config) || extractTextOrUndefined(inputAction.description, config)

    if (inputAction.type === 'prompt') {
      const promptAction = inputAction as WarpPromptAction
      prompt = convertPromptActionToPrompt(warp, promptAction, description, config)
    } else if (inputAction.type === 'mcp') {
      const mcpAction = inputAction as WarpMcpAction
      if (mcpAction.destination) {
        tool = convertMcpActionToTool(warp, mcpAction, description, inputAction.inputs, resource, config)
      }
    } else {
      tool = convertActionToTool(warp, inputAction, description, inputAction.inputs, resource, config)
    }
  } catch (error) {
    // If getWarpInputAction fails or conversion fails, return null capabilities
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

type ToolSchemaProperty = {
  type?: string
  format?: string
  title?: string
  description?: string
  default?: unknown
}

const toToolSchemaProperty = (value: unknown): ToolSchemaProperty => {
  if (typeof value !== 'object' || value === null) return {}
  return value as ToolSchemaProperty
}

type McpToolLike = {
  name: string
  description?: string
  inputSchema?: { properties?: Record<string, unknown>; required?: string[] }
  outputSchema?: Record<string, unknown>
}

const getSchemaProperties = (schema: Record<string, unknown> | undefined): Record<string, unknown> | undefined => {
  if (!schema || typeof schema.properties !== 'object' || schema.properties === null) return undefined
  return schema.properties as Record<string, unknown>
}

export const convertMcpToolToWarp = async (
  config: WarpClientConfig,
  tool: McpToolLike,
  url: string,
  headers?: Record<string, string>
): Promise<Warp> => {
  const inputs: WarpActionInput[] = []

  if (tool.inputSchema?.properties) {
    const properties = tool.inputSchema.properties
    const required = tool.inputSchema.required || []

    Object.entries(properties).forEach(([key, value]) => {
      const prop = toToolSchemaProperty(value)
      const isRequired = required.includes(key)
      const inputType = convertJsonSchemaTypeToWarpType(prop.type || 'string', prop.format)

      const inputDef: WarpActionInput = {
        name: key,
        label: typeof prop.title === 'string' ? { en: prop.title } : { en: key },
        description: prop.description ? { en: prop.description.trim() } : null,
        type: inputType,
        position: `payload:${key}` as WarpActionInput['position'],
        source: 'field',
        required: isRequired,
        ...((typeof prop.default === 'string' || typeof prop.default === 'number' || typeof prop.default === 'boolean'
          ? { default: prop.default }
          : {})),
      }

      inputs.push(inputDef)
    })
  }

  const output: Record<string, string> = {}
  const outputProperties = getSchemaProperties(tool.outputSchema)
  if (outputProperties) {
    Object.keys(outputProperties).forEach((key) => {
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
