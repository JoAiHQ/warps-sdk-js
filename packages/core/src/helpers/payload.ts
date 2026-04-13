import { WarpConstants } from '../constants'
import { ResolvedInput, WarpChainAssetValue } from '../types'
import { WarpSerializer } from '../WarpSerializer'

/**
 * Builds a nested payload object from a position string and field value.
 * Position strings should be in format: "payload:path.to.nested.location"
 *
 * @param position - The position string defining where to place the value
 * @param fieldName - The field name to use for the value
 * @param value - The value to place at the position
 * @returns A nested object structure or flat object if position doesn't start with 'payload:'
 */
export function buildNestedPayload(position: string, fieldName: string, value: any): any {
  if (!position.startsWith(WarpConstants.Position.Payload)) return { [fieldName]: value }
  return position
    .slice(WarpConstants.Position.Payload.length)
    .split('.')
    .reduceRight((acc, key, i, arr) => ({ [key]: i === arr.length - 1 ? { [fieldName]: value } : acc }), {})
}

/**
 * Recursively merges a source object into a target object and returns the merged result.
 * Existing nested objects are merged recursively, primitive values are overwritten.
 * Does not mutate the original target or source objects.
 *
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns A new object with the merged result
 */
export function mergeNestedPayload(target: any, source: any): any {
  if (!target) return { ...source }
  if (!source) return { ...target }

  const result = { ...target }

  Object.keys(source).forEach((key) => {
    if (result[key] && typeof result[key] === 'object' && typeof source[key] === 'object') {
      result[key] = mergeNestedPayload(result[key], source[key])
    } else {
      result[key] = source[key]
    }
  })

  return result
}

/**
 * Converts a resolved input to a payload value, handling special types like biguint and asset.
 *
 * @param resolvedInput - The resolved input to convert
 * @param serializer - The serializer to use for conversion
 * @returns The converted value, or null if the input has no value
 */
export function toInputPayloadValue(resolvedInput: ResolvedInput, serializer: WarpSerializer): any {
  if (!resolvedInput.value) return null
  const value = serializer.stringToNative(resolvedInput.value)[1]
  if (resolvedInput.input.type === 'biguint') {
    return (value as bigint).toString()
  } else if (resolvedInput.input.type === 'asset') {
    const { identifier, amount } = value as WarpChainAssetValue
    return { identifier, amount: amount.toString() }
  } else {
    return value
  }
}

/**
 * Extracts non-empty string values from resolved inputs.
 *
 * @param inputs - The resolved inputs to extract values from
 * @returns An array of non-empty string values
 */
export function extractResolvedInputValues(inputs: ResolvedInput[]): string[] {
  return inputs.map((ri) => ri.value).filter((v): v is string => v != null && v !== '')
}

/**
 * Builds a mapped output object from resolved inputs, using input name or "as" property as key.
 * This is the same structure as the payload, but used for output mapping.
 *
 * @param inputs - The resolved inputs to build the mapped output from
 * @param serializer - The serializer to use for value conversion
 * @returns A mapped object with input names/aliases as keys and converted values
 */
export function buildMappedOutput(inputs: ResolvedInput[], serializer: WarpSerializer): Record<string, any> {
  let mapped: Record<string, any> = {}
  inputs.forEach((resolvedInput) => {
    if (resolvedInput.input.position === 'local') return
    const fieldName = resolvedInput.input.as || resolvedInput.input.name
    const value = toInputPayloadValue(resolvedInput, serializer)
    if (
      resolvedInput.input.position &&
      typeof resolvedInput.input.position === 'string' &&
      resolvedInput.input.position.startsWith(WarpConstants.Position.Payload)
    ) {
      const nestedPayload = buildNestedPayload(resolvedInput.input.position, fieldName, value)
      mapped = mergeNestedPayload(mapped, nestedPayload)
    } else {
      mapped[fieldName] = value
    }
  })
  return mapped
}

export function buildInputsContext(
  inputs: ResolvedInput[],
  serializer: WarpSerializer,
  currentIndex?: number,
  currentInput?: ResolvedInput
): Record<string, any> {
  const context: Record<string, any> = {}
  const maxIndex = currentIndex !== undefined ? currentIndex : inputs.length

  const addInput = (resolvedInput?: ResolvedInput) => {
    if (!resolvedInput?.value) return
    const key = resolvedInput.input.as || resolvedInput.input.name
    const [, nativeValue] = serializer.stringToNative(resolvedInput.value)
    context[key] = nativeValue
    if (resolvedInput.input.type !== 'asset' || typeof nativeValue !== 'object' || nativeValue === null) return
    const asset = nativeValue as { identifier?: string; amount?: bigint }
    if ('identifier' in asset && 'amount' in asset) {
      const identifier = String(asset.identifier)
      context[`${key}.token`] = identifier
      context[`${key}.identifier`] = identifier
      context[`${key}.amount`] = String(asset.amount)
    }
  }

  for (let i = 0; i < maxIndex; i++) {
    addInput(inputs[i])
  }

  addInput(currentInput)

  return context
}
