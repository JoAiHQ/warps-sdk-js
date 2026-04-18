import { WarpConstants, WarpInputTypes } from './constants'
import {
  AdapterTypeRegistry,
  BaseWarpActionInputType,
  WarpActionInputType,
  WarpChainAssetValue,
  WarpNativeValue,
  WarpStructValue,
} from './types'

/** Maps common alternative type names to their canonical WarpInputTypes equivalents. */
const TypeAliases: Record<string, string> = {
  boolean: WarpInputTypes.Bool,
  integer: WarpInputTypes.Uint32,
  int: WarpInputTypes.Uint32,
  number: WarpInputTypes.Uint64,
}

export class WarpSerializer {
  private readonly typeRegistry?: AdapterTypeRegistry

  constructor(options?: { typeRegistry?: AdapterTypeRegistry }) {
    this.typeRegistry = options?.typeRegistry
  }

  nativeToString(type: WarpActionInputType, value: WarpNativeValue): string {
    type = (TypeAliases[type] ?? type) as WarpActionInputType
    if (type === WarpInputTypes.Tuple && Array.isArray(value)) {
      if (value.length === 0) return type + WarpConstants.ArgParamsSeparator
      if (value.every((v) => typeof v === 'string' && v.includes(WarpConstants.ArgParamsSeparator))) {
        const typeValuePairs = value.map((v) => this.getTypeAndValue(v))
        const types = typeValuePairs.map(([type]) => type)
        const vals = typeValuePairs.map(([, val]) => val)
        return `${type}(${types.join(WarpConstants.ArgCompositeSeparator)})${WarpConstants.ArgParamsSeparator}${vals.join(WarpConstants.ArgListSeparator)}`
      }
      return type + WarpConstants.ArgParamsSeparator + value.join(WarpConstants.ArgListSeparator)
    }
    if (type === WarpInputTypes.Struct && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const obj = value as WarpStructValue
      if (!obj._name) throw new Error('Struct objects must have a _name property to specify the struct name')
      const structName = obj._name
      const keys = Object.keys(obj).filter((key) => key !== '_name')
      if (keys.length === 0) return `${type}(${structName})${WarpConstants.ArgParamsSeparator}`
      const fields = keys.map((key) => {
        const [typeStr, valueStr] = this.getTypeAndValue(obj[key])
        return `(${key}${WarpConstants.ArgParamsSeparator}${typeStr})${valueStr}`
      })
      return `${type}(${structName})${WarpConstants.ArgParamsSeparator}${fields.join(WarpConstants.ArgListSeparator)}`
    }
    if (type === WarpInputTypes.Vector && Array.isArray(value)) {
      if (value.length === 0) return `${type}${WarpConstants.ArgParamsSeparator}`
      if (value.every((v) => typeof v === 'string' && v.includes(WarpConstants.ArgParamsSeparator))) {
        const firstValue = value[0] as string
        const colonIndex = firstValue.indexOf(WarpConstants.ArgParamsSeparator)
        const baseType = firstValue.substring(0, colonIndex)
        const values = value.map((v) => {
          const colonIndex = (v as string).indexOf(WarpConstants.ArgParamsSeparator)
          const val = (v as string).substring(colonIndex + 1)
          return baseType.startsWith(WarpInputTypes.Tuple)
            ? val.replace(WarpConstants.ArgListSeparator, WarpConstants.ArgCompositeSeparator)
            : val
        })
        // Use struct separator for structs, comma for other types
        const separator = baseType.startsWith(WarpInputTypes.Struct) ? WarpConstants.ArgStructSeparator : WarpConstants.ArgListSeparator
        return type + WarpConstants.ArgParamsSeparator + baseType + WarpConstants.ArgParamsSeparator + values.join(separator)
      }
      return type + WarpConstants.ArgParamsSeparator + value.join(WarpConstants.ArgListSeparator)
    }
    if (type === WarpInputTypes.Asset && typeof value === 'object' && value && 'identifier' in value && 'amount' in value) {
      return 'decimals' in value
        ? WarpInputTypes.Asset +
            WarpConstants.ArgParamsSeparator +
            value.identifier +
            WarpConstants.ArgCompositeSeparator +
            String(value.amount) +
            WarpConstants.ArgCompositeSeparator +
            String(value.decimals)
        : WarpInputTypes.Asset +
            WarpConstants.ArgParamsSeparator +
            value.identifier +
            WarpConstants.ArgCompositeSeparator +
            String(value.amount)
    }

    // Check adapter-registered types and aliases
    if (this.typeRegistry) {
      const handler = this.typeRegistry.getHandler(type)
      if (handler) {
        return handler.nativeToString(value)
      }

      // Check if this is an alias that points to a core type
      const resolvedType = this.typeRegistry.resolveType(type)
      if (resolvedType !== type) {
        // Use the resolved type for serialization
        return this.nativeToString(resolvedType, value)
      }
    }

    // Default behavior for standard types
    return type + WarpConstants.ArgParamsSeparator + (value?.toString() ?? '')
  }

  stringToNative(value: string): [WarpActionInputType, WarpNativeValue] {
    const parts = value.split(WarpConstants.ArgParamsSeparator)
    const baseType = TypeAliases[parts[0]] ?? parts[0]
    const val = parts.slice(1).join(WarpConstants.ArgParamsSeparator)

    if (baseType === 'null') {
      return [baseType, null]
    }
    if (baseType === WarpInputTypes.Option) {
      const [baseType, baseValue] = val.split(WarpConstants.ArgParamsSeparator) as [WarpActionInputType, WarpNativeValue]
      return [WarpInputTypes.Option + WarpConstants.ArgParamsSeparator + baseType, baseValue || null]
    }
    if (baseType === WarpInputTypes.Vector) {
      const colonIndex = (val as string).indexOf(WarpConstants.ArgParamsSeparator)
      const elementType = (val as string).substring(0, colonIndex)
      const valuesRaw = (val as string).substring(colonIndex + 1)
      // Use struct separator for structs, comma for other types
      const separator = elementType.startsWith(WarpInputTypes.Struct) ? WarpConstants.ArgStructSeparator : WarpConstants.ArgListSeparator
      const valuesStrings = valuesRaw ? (valuesRaw as string).split(separator) : []
      const values = valuesStrings.map((v) => this.stringToNative(elementType + WarpConstants.ArgParamsSeparator + v)[1])
      return [WarpInputTypes.Vector + WarpConstants.ArgParamsSeparator + elementType, values]
    } else if (baseType.startsWith(WarpInputTypes.Tuple)) {
      const rawTypes = baseType.match(/\(([^)]+)\)/)?.[1]?.split(WarpConstants.ArgCompositeSeparator) as BaseWarpActionInputType[]
      const valuesStrings = val.split(WarpConstants.ArgCompositeSeparator)
      const values = valuesStrings.map(
        (val, index) => this.stringToNative(`${rawTypes[index]}${WarpConstants.IdentifierParamSeparator}${val}`)[1]
      )
      return [baseType, values]
    } else if (baseType.startsWith(WarpInputTypes.Struct)) {
      const structNameMatch = baseType.match(/\(([^)]+)\)/)
      if (!structNameMatch) throw new Error('Struct type must include a name in the format struct(Name)')
      const structName = structNameMatch[1]
      const obj: WarpStructValue = { _name: structName }
      if (val) {
        val.split(WarpConstants.ArgListSeparator).forEach((field) => {
          const match = field.match(
            new RegExp(`^\\(([^${WarpConstants.ArgParamsSeparator}]+)${WarpConstants.ArgParamsSeparator}([^)]+)\\)(.+)$`)
          )
          if (match) {
            const [, fieldName, fieldType, fieldValue] = match
            obj[fieldName] = this.stringToNative(`${fieldType}${WarpConstants.IdentifierParamSeparator}${fieldValue}`)[1]
          }
        })
      }
      return [baseType, obj]
    } else if (baseType === WarpInputTypes.String) return [baseType, val]
    else if (baseType === WarpInputTypes.Uint8 || baseType === WarpInputTypes.Uint16 || baseType === WarpInputTypes.Uint32)
      return [baseType, Number(val)]
    else if (
      baseType === WarpInputTypes.Uint64 ||
      baseType === WarpInputTypes.Uint128 ||
      baseType === WarpInputTypes.Uint256 ||
      baseType === WarpInputTypes.Biguint
    )
      return [baseType, BigInt((val as string) || 0)]
    else if (baseType === WarpInputTypes.Bool) return [baseType, val === 'true']
    else if (baseType === WarpInputTypes.Address) return [baseType, val]
    else if (baseType === WarpInputTypes.Hex) return [baseType, val]
    else if (baseType === WarpInputTypes.Datetime) return [baseType, val]
    else if (baseType === WarpInputTypes.Asset) {
      const [identifier, amount] = (val as string).split(WarpConstants.ArgCompositeSeparator)
      const value: WarpChainAssetValue = { identifier, amount: BigInt(amount) }
      return [baseType, value]
    }

    // Check adapter-registered types and aliases before throwing error
    if (this.typeRegistry) {
      const handler = this.typeRegistry.getHandler(baseType)
      if (handler) {
        const nativeValue = handler.stringToNative(val)
        return [baseType as WarpActionInputType, nativeValue]
      }

      // Check if this is an alias that points to a core type
      const resolvedType = this.typeRegistry.resolveType(baseType)
      if (resolvedType !== baseType) {
        // Recursively call stringToNative with the resolved type, but preserve original type name
        const [_, nativeValue] = this.stringToNative(`${resolvedType}:${val}`)
        return [baseType as WarpActionInputType, nativeValue]
      }
    }

    // UI-only input types that serialize as plain strings
    if (baseType === 'chain' || baseType === 'nft') return [baseType, val]

    throw new Error(`WarpArgSerializer (stringToNative): Unsupported input type: ${baseType}`)
  }

  private getTypeAndValue(val: WarpNativeValue): [string, WarpNativeValue] {
    if (typeof val === 'string' && val.includes(WarpConstants.ArgParamsSeparator)) {
      const [type, value] = val.split(WarpConstants.ArgParamsSeparator)
      return [type, value]
    }
    if (typeof val === 'number') return [WarpInputTypes.Uint32, val]
    if (typeof val === 'bigint') return [WarpInputTypes.Uint64, val]
    if (typeof val === 'boolean') return [WarpInputTypes.Bool, val]
    return [typeof val, val]
  }
}
