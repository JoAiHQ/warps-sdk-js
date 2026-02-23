import { WarpProtocolVersions } from '../config'
import { WarpChainName } from '../constants'
import { ChainAdapter, ProtocolName, Warp, WarpAction, WarpActionType } from '../types'

export const findWarpAdapterForChain = (chain: WarpChainName, adapters: ChainAdapter[]): ChainAdapter => {
  const adapter = adapters.find((a) => a.chainInfo.name.toLowerCase() === chain.toLowerCase())
  if (!adapter) throw new Error(`Adapter not found for chain: ${chain}`)
  return adapter
}

export const getLatestProtocolIdentifier = (name: ProtocolName): string => {
  if (name === 'warp') return `warp:${WarpProtocolVersions.Warp}`
  if (name === 'brand') return `brand:${WarpProtocolVersions.Brand}`
  if (name === 'abi') return `abi:${WarpProtocolVersions.Abi}`
  throw new Error(`getLatestProtocolIdentifier: Invalid protocol name: ${name}`)
}

export const getWarpActionByIndex = (warp: Warp, index: number) => warp?.actions[index - 1]

export const getWarpPrimaryAction = (warp: Warp): { action: WarpAction; index: number } => {
  if (warp.actions.length === 0) throw new Error(`Warp has no primary action: ${warp.meta?.identifier}`)

  const actionWithPrimary = warp.actions.find((action) => action.primary === true)
  if (actionWithPrimary) return { action: actionWithPrimary, index: warp.actions.indexOf(actionWithPrimary) }

  const detectableTypes: WarpActionType[] = ['transfer', 'contract', 'query', 'collect', 'mcp']
  const firstDetectableAction = warp.actions.find((action) => detectableTypes.includes(action.type))
  if (firstDetectableAction) {
    return { action: firstDetectableAction, index: warp.actions.indexOf(firstDetectableAction) }
  }

  const firstAction = warp.actions[0]
  return { action: firstAction, index: 0 }
}

export const isWarpActionAutoExecute = (action: WarpAction, warp: Warp) => {
  if (action.auto === false) return false
  if (action.type === 'link') {
    if (action.auto === true) return true
    const { action: primaryAction } = getWarpPrimaryAction(warp)
    return action === primaryAction
  }
  return true
}

export const shiftBigintBy = (value: bigint | string | number, decimals: number): bigint => {
  const valueStr = value.toString()
  const [integerPart, fractionalPart = ''] = valueStr.split('.')
  const shiftPlaces = Math.abs(decimals)

  if (decimals > 0) {
    return BigInt(integerPart + fractionalPart.padEnd(shiftPlaces, '0'))
  } else if (decimals < 0) {
    const combined = integerPart + fractionalPart
    if (shiftPlaces >= combined.length) {
      return 0n
    }
    const newIntegerPart = combined.slice(0, -shiftPlaces) || '0'
    return BigInt(newIntegerPart)
  } else {
    return valueStr.includes('.') ? BigInt(valueStr.split('.')[0]) : BigInt(valueStr)
  }
}

export const toPreviewText = (text: string, maxChars = 100) => {
  if (!text) return ''
  let sanitized = text
    .replace(/<\/?(h[1-6])[^>]*>/gi, ' - ') // replace heading tags with space and colon
    .replace(/<\/?(p|div|ul|ol|li|br|hr)[^>]*>/gi, ' ') // replace other block-level HTML tags with spaces
    .replace(/<[^>]+>/g, '') // remove all other HTML tags
    .replace(/\s+/g, ' ') // collapse multiple spaces into a single space
    .trim()

  sanitized = sanitized.startsWith('- ') ? sanitized.slice(2) : sanitized
  sanitized = sanitized.length > maxChars ? sanitized.substring(0, sanitized.lastIndexOf(' ', maxChars)) + '...' : sanitized

  return sanitized
}

export const replacePlaceholders = (message: string, bag: Record<string, any>) =>
  message.replace(/\{\{([^}]+)\}\}/g, (match, p1) => {
    const value = bag[p1]
    if (value === undefined || value === null) return ''
    return String(value)
  })

export const replacePlaceholdersInWhenExpression = (expression: string, bag: Record<string, any>): string => {
  return expression.replace(/\{\{([^}]+)\}\}/g, (match, p1) => {
    const value = bag[p1]
    if (value === undefined || value === null) return ''
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "\\'")}'`
    }
    return String(value)
  })
}

export const evaluateWhenCondition = (expression: string): boolean => {
  if (!expression || typeof expression !== 'string') return true

  try {
    const result = new Function(`return ${expression}`)()
    return Boolean(result)
  } catch (error) {
    throw new Error(`Failed to evaluate 'when' condition: ${expression}. Error: ${error}`)
  }
}
