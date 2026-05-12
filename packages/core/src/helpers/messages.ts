import { Warp, WarpClientConfig, WarpAction } from '../types'
import { replacePlaceholders } from './general'
import { resolveWarpText } from './i18n'

export const applyOutputToMessages = (warp: Warp, output: Record<string, any>, config?: WarpClientConfig): Record<string, string> => {
  return resolveMessages(warp.messages, output, config)
}

export const resolveActionMessages = (action: WarpAction, output: Record<string, any>, config?: WarpClientConfig): Record<string, string> => {
  if (!('messages' in action) || !action.messages) return {}
  return resolveMessages(action.messages as Record<string, any>, output, config)
}

const resolveMessages = (
  messages: Record<string, any> | undefined,
  output: Record<string, any>,
  config?: WarpClientConfig
): Record<string, string> => {
  if (!messages) return {}
  const parts = Object.entries(messages).map(([key, value]) => {
    const resolvedText = resolveWarpText(value, config)
    return [key, replacePlaceholders(resolvedText, output)]
  })
  return Object.fromEntries(parts)
}
