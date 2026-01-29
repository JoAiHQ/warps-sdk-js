import { Warp, WarpClientConfig } from '../types'
import { replacePlaceholders } from './general'
import { resolveWarpText } from './i18n'

export const applyOutputToMessages = (warp: Warp, output: Record<string, any>, config?: WarpClientConfig): Record<string, string> => {
  const parts = Object.entries(warp.messages || {}).map(([key, value]) => {
    const resolvedText = resolveWarpText(value, config)
    return [key, replacePlaceholders(resolvedText, output)]
  })

  return Object.fromEntries(parts)
}
