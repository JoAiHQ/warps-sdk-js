import { Warp, WarpActionInput, WarpClientConfig, WarpPromptAction, resolvePlatformValue } from '@joai/warps'
import { WarpMcpPrompt, WarpMcpPromptArgument } from '../types'
import { extractTextOrUndefined } from './warps'

export const interpolatePromptWithArgs = (promptTemplate: string, args: Record<string, string>): string => {
  let result = promptTemplate
  for (const [key, value] of Object.entries(args)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
    result = result.replace(pattern, value ?? '')
  }
  return result
}

const sanitizeMcpName = (name: string): string => {
  return (name.includes(':') ? name.split(':').slice(1).join(':') : name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/:/g, '_')
    .replace(/[^a-z0-9_.-]/g, '_')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .replace(/[_-]+/g, (match) => (match.includes('_') ? '_' : match))
    .replace(/_+/g, '_')
}

const buildPromptArguments = (inputs: WarpActionInput[], config: WarpClientConfig): WarpMcpPromptArgument[] => {
  const args: WarpMcpPromptArgument[] = []

  for (const input of inputs) {
    if (input.source === 'hidden') continue
    if (input.source !== 'field') continue

    const name = input.as || input.name
    const description = extractTextOrUndefined(input.description, config)

    args.push({
      name,
      description,
      required: input.required === true,
    })
  }

  return args
}

export const convertPromptActionToPrompt = (
  warp: Warp,
  action: WarpPromptAction,
  description: string | undefined,
  config: WarpClientConfig
): WarpMcpPrompt => {
  const name = sanitizeMcpName(warp.name)
  const inputs = action.inputs || []
  const args = buildPromptArguments(inputs, config)

  return {
    name,
    description,
    arguments: args.length > 0 ? args : undefined,
    prompt: resolvePlatformValue(action.prompt, config.platform),
  }
}
