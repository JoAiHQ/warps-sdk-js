import { WarpConstants, WarpInputTypes } from '../constants'
import { WarpActionInputType } from '../types'

/** Maps common alternative type names to their canonical WarpInputTypes equivalents. */
const InputTypeAliases: Record<string, string> = {
  boolean: WarpInputTypes.Bool,
  integer: WarpInputTypes.Uint32,
  int: WarpInputTypes.Uint32,
  number: WarpInputTypes.Uint64,
  float: WarpInputTypes.Decimal,
  double: WarpInputTypes.Decimal,
  text: WarpInputTypes.String,
}

/** Resolves common alternative type names (e.g. `number` → `uint64`) to their canonical WarpInputTypes. */
export const resolveInputTypeAlias = (type: string): string => InputTypeAliases[type] ?? type

/**
 * Splits an input string into type and value, using only the first colon as separator.
 * This handles cases where the value itself contains colons (like SUI token IDs).
 */
export const splitInput = (input: string): [WarpActionInputType, string] => {
  const [type, ...valueParts] = input.split(/:(.*)/, 2) as [WarpActionInputType, string]
  return [type, valueParts[0] || '']
}

export const hasInputPrefix = (input: string): boolean => {
  if (typeof input !== 'string') return false

  const inputTypes = new Set(Object.values(WarpInputTypes))

  if (!input.includes(WarpConstants.ArgParamsSeparator)) {
    return false
  }

  const type = splitInput(input)[0]
  const baseType = type.endsWith('[]') ? type.slice(0, -2) : type
  return inputTypes.has(baseType) || inputTypes.has(resolveInputTypeAlias(baseType))
}
