import {
  Address,
  AddressType,
  AddressValue,
  BigUIntType,
  BigUIntValue,
  BooleanType,
  BooleanValue,
  BytesType,
  BytesValue,
  CodeMetadata,
  CodeMetadataType,
  CodeMetadataValue,
  CompositeType,
  CompositeValue,
  EnumType,
  EnumValue,
  EnumVariantDefinition,
  Field,
  FieldDefinition,
  List,
  ListType,
  NothingValue,
  OptionalType,
  OptionalValue,
  OptionType,
  OptionValue,
  StringType,
  StringValue,
  Struct,
  StructType,
  Token,
  TokenComputer,
  TokenIdentifierType,
  TokenIdentifierValue,
  Type,
  TypedValue,
  U16Type,
  U16Value,
  U32Type,
  U32Value,
  U64Type,
  U64Value,
  U8Type,
  U8Value,
  VariadicType,
  VariadicValue,
} from '@multiversx/sdk-core'
import {
  AdapterWarpSerializer,
  BaseWarpActionInputType,
  WarpActionInputType,
  WarpAdapterGenericType,
  WarpNativeValue,
  WarpSerializer,
} from '@joai/warps'
import { AdapterTypeRegistry } from '@joai/warps/src/types'
import { WarpConstants, WarpInputTypes } from '../../core/src/constants'
import { WarpMultiversxInputTypes } from './constants'
import { getNormalizedTokenIdentifier, isNativeToken } from './helpers/general'

const SplitParamsRegex = new RegExp(`${WarpConstants.ArgParamsSeparator}(.*)`)

export class WarpMultiversxSerializer implements AdapterWarpSerializer {
  public readonly coreSerializer: WarpSerializer

  constructor(options?: { typeRegistry?: AdapterTypeRegistry }) {
    this.coreSerializer = new WarpSerializer(options)
  }

  typedToString(value: TypedValue): string {
    const type = value.getType()
    if (type.hasExactClass(OptionType.ClassName) || value.hasClassOrSuperclass(OptionValue.ClassName)) {
      if (!(value as OptionValue).isSet()) return WarpInputTypes.Option + WarpConstants.ArgParamsSeparator + 'null'
      const result = this.typedToString((value as OptionValue).getTypedValue())
      return WarpInputTypes.Option + WarpConstants.ArgParamsSeparator + result
    }
    if (type.hasExactClass(VariadicType.ClassName) || value.hasClassOrSuperclass(VariadicValue.ClassName)) {
      const items = (value as VariadicValue).getItems()
      if (items.length === 0) {
        const baseType = this.typeToString(type.getFirstTypeParameter())
        return WarpInputTypes.Vector + WarpConstants.ArgParamsSeparator + baseType + WarpConstants.ArgParamsSeparator
      }

      const itemStrings = items.map((item) => this.typedToString(item))

      // Check if all items are tuples
      if (itemStrings.every((str) => str.startsWith(WarpInputTypes.Tuple))) {
        return WarpInputTypes.Vector + WarpConstants.ArgParamsSeparator + itemStrings.join(',')
      }

      // For non-tuple items, use the original logic
      const firstItemString = itemStrings[0]
      const colonIndex = firstItemString.indexOf(WarpConstants.ArgParamsSeparator)
      const baseType = firstItemString.substring(0, colonIndex)
      const values = itemStrings.map((str) => {
        const colonIndex = str.indexOf(WarpConstants.ArgParamsSeparator)
        return str.substring(colonIndex + 1)
      })
      // Use struct separator for structs, comma for other types
      const separator = baseType.startsWith(WarpInputTypes.Struct) ? WarpConstants.ArgStructSeparator : WarpConstants.ArgListSeparator
      return WarpInputTypes.Vector + WarpConstants.ArgParamsSeparator + baseType + WarpConstants.ArgParamsSeparator + values.join(separator)
    }
    if (type.hasExactClass(OptionalType.ClassName) || value.hasClassOrSuperclass(OptionalValue.ClassName)) {
      if (!(value as OptionalValue).isSet()) return WarpMultiversxInputTypes.Optional + WarpConstants.ArgParamsSeparator + 'null'
      const result = this.typedToString((value as OptionalValue).getTypedValue())
      return WarpMultiversxInputTypes.Optional + WarpConstants.ArgParamsSeparator + result
    }
    if (type.hasExactClass(ListType.ClassName) || value.hasClassOrSuperclass(List.ClassName)) {
      const items = (value as List).getItems()
      const itemStrings = items.map((item) => this.typedToString(item))

      // Check if all items are tuples
      if (itemStrings.every((str) => str.startsWith(WarpInputTypes.Tuple))) {
        return WarpMultiversxInputTypes.List + WarpConstants.ArgParamsSeparator + itemStrings.join(',')
      }

      // For non-tuple items, use the original logic
      const types = itemStrings.map((str) => str.split(WarpConstants.ArgParamsSeparator)[0]) as BaseWarpActionInputType[]
      const baseType = types[0] as BaseWarpActionInputType
      const values = itemStrings.map((str) => str.split(WarpConstants.ArgParamsSeparator)[1]) as WarpNativeValue[]
      return (
        WarpMultiversxInputTypes.List +
        WarpConstants.ArgParamsSeparator +
        baseType +
        WarpConstants.ArgParamsSeparator +
        values.join(WarpConstants.ArgListSeparator)
      )
    }
    if (type.hasExactClass(CompositeType.ClassName) || value.hasClassOrSuperclass(CompositeValue.ClassName)) {
      const items = (value as CompositeValue).getItems()
      const typeValuePairs = items.map((item) => {
        const itemString = this.typedToString(item)
        const colonIndex = itemString.indexOf(WarpConstants.ArgParamsSeparator)
        const itemType = itemString.substring(0, colonIndex)
        const itemValue = itemString.substring(colonIndex + 1)
        return `${itemType},${itemValue}`
      })
      return `${WarpInputTypes.Tuple}(${typeValuePairs.join(',')})`
    }
    if (
      type.hasExactClass(BigUIntType.ClassName) ||
      value.hasClassOrSuperclass(BigUIntValue.ClassName) ||
      type.getName() === 'BigUint' /* ABI handling */
    )
      return WarpInputTypes.Biguint + WarpConstants.ArgParamsSeparator + BigInt((value as BigUIntValue).valueOf().toFixed())
    if (type.hasExactClass(U8Type.ClassName) || value.hasClassOrSuperclass(U8Value.ClassName))
      return WarpInputTypes.Uint8 + WarpConstants.ArgParamsSeparator + (value as U8Value).valueOf().toNumber()
    if (type.hasExactClass(U16Type.ClassName) || value.hasClassOrSuperclass(U16Value.ClassName))
      return WarpInputTypes.Uint16 + WarpConstants.ArgParamsSeparator + (value as U16Value).valueOf().toNumber()
    if (type.hasExactClass(U32Type.ClassName) || value.hasClassOrSuperclass(U32Value.ClassName))
      return WarpInputTypes.Uint32 + WarpConstants.ArgParamsSeparator + (value as U32Value).valueOf().toNumber()
    if (type.hasExactClass(U64Type.ClassName) || value.hasClassOrSuperclass(U64Value.ClassName))
      return WarpInputTypes.Uint64 + WarpConstants.ArgParamsSeparator + BigInt((value as U64Value).valueOf().toFixed())
    if (type.hasExactClass(StringType.ClassName) || value.hasClassOrSuperclass(StringValue.ClassName))
      return WarpInputTypes.String + WarpConstants.ArgParamsSeparator + (value as StringValue).valueOf()
    if (type.hasExactClass(BooleanType.ClassName) || value.hasClassOrSuperclass(BooleanValue.ClassName))
      return WarpInputTypes.Bool + WarpConstants.ArgParamsSeparator + (value as BooleanValue).valueOf()
    if (type.hasExactClass(AddressType.ClassName) || value.hasClassOrSuperclass(AddressValue.ClassName))
      return WarpInputTypes.Address + WarpConstants.ArgParamsSeparator + (value as AddressValue).valueOf().toBech32()
    if (type.hasExactClass(BytesType.ClassName) || value.hasClassOrSuperclass(BytesValue.ClassName))
      return WarpInputTypes.Hex + WarpConstants.ArgParamsSeparator + (value as BytesValue).valueOf().toString('hex')
    if (type.getName() === 'EsdtTokenPayment') {
      const identifier = (value as Struct).getFieldValue('token_identifier').valueOf()
      const nonce = (value as Struct).getFieldValue('token_nonce').valueOf()
      const amount = (value as Struct).getFieldValue('amount').valueOf()
      const tokenComputer = new TokenComputer()
      const tokenIdentifier = tokenComputer.computeExtendedIdentifier(new Token({ identifier, nonce: BigInt(nonce) }))
      return WarpInputTypes.Asset + WarpConstants.ArgParamsSeparator + tokenIdentifier + WarpConstants.ArgCompositeSeparator + amount
    }
    if (type.hasExactClass(StructType.ClassName) || value.hasClassOrSuperclass(Struct.ClassName)) {
      const struct = value as Struct
      const structType = struct.getType() as StructType
      const structName = structType.getName()
      const fields = struct.getFields()
      if (fields.length === 0) return `${WarpInputTypes.Struct}(${structName})${WarpConstants.ArgParamsSeparator}`
      const fieldStrings = fields.map((field) => {
        const fieldType = field.value.getType()
        const fieldValueStr = this.typedToString(field.value)
        const parts = fieldValueStr.split(WarpConstants.ArgParamsSeparator)
        const valuePart = parts.length > 2 ? parts.slice(2).join(WarpConstants.ArgParamsSeparator) : parts[1] || ''
        return `(${field.name}${WarpConstants.ArgParamsSeparator}${this.typeToString(fieldType)})${valuePart}`
      })
      return `${WarpInputTypes.Struct}(${structName})${WarpConstants.ArgParamsSeparator}${fieldStrings.join(WarpConstants.ArgListSeparator)}`
    }
    if (type.hasExactClass(EnumType.ClassName) || value.hasClassOrSuperclass(EnumValue.ClassName)) {
      const enumValue = value as EnumValue
      const enumType = enumValue.getType() as EnumType
      return `enum(${enumType.getName()})${WarpConstants.ArgParamsSeparator}${enumValue.discriminant}`
    }
    if (type.hasExactClass(TokenIdentifierType.ClassName) || value.hasClassOrSuperclass(TokenIdentifierValue.ClassName))
      return WarpMultiversxInputTypes.Token + WarpConstants.ArgParamsSeparator + (value as TokenIdentifierValue).valueOf()
    if (type.hasExactClass(CodeMetadataType.ClassName) || value.hasClassOrSuperclass(CodeMetadataValue.ClassName))
      return WarpMultiversxInputTypes.CodeMeta + WarpConstants.ArgParamsSeparator + (value as CodeMetadataValue).valueOf().toString()

    throw new Error(`WarpArgSerializer (typedToString): Unsupported input type: ${value.getClassName()}`)
  }

  typedToNative(value: TypedValue): [WarpActionInputType, WarpNativeValue] {
    const stringValue = this.typedToString(value)
    return this.coreSerializer.stringToNative(stringValue)
  }

  nativeToTyped(type: WarpActionInputType, value: WarpNativeValue): TypedValue {
    // For tuples, the type now contains the values, so we can parse it directly
    if (type.startsWith(WarpInputTypes.Tuple)) {
      return this.stringToTyped(type + ':')
    }
    const stringValue = this.coreSerializer.nativeToString(type, value)
    return this.stringToTyped(stringValue)
  }

  nativeToType(type: BaseWarpActionInputType): WarpAdapterGenericType {
    if (type.startsWith(WarpInputTypes.Tuple)) {
      const content = type.match(/\(([^)]+)\)/)?.[1]
      if (!content) {
        throw new Error(`Invalid tuple type format: ${type}`)
      }
      // Extract only the type names (every other element starting from 0)
      const typeValuePairs = content.split(',')
      const typeNames = []
      for (let i = 0; i < typeValuePairs.length; i += 2) {
        typeNames.push(typeValuePairs[i])
      }
      return new CompositeType(...typeNames.map((t) => this.nativeToType(t as BaseWarpActionInputType)))
    }
    if (type.startsWith(WarpInputTypes.Struct)) {
      const structNameMatch = type.match(/\(([^)]+)\)/)
      if (!structNameMatch) throw new Error('Struct type must include a name in the format struct(Name)')
      const structName = structNameMatch[1]
      return new StructType(structName, [])
    }
    if (type === WarpInputTypes.String) return new StringType()
    if (type === WarpInputTypes.Uint8) return new U8Type()
    if (type === WarpInputTypes.Uint16) return new U16Type()
    if (type === WarpInputTypes.Uint32) return new U32Type()
    if (type === WarpInputTypes.Uint64) return new U64Type()
    if (type === WarpInputTypes.Biguint) return new BigUIntType()
    if (type === WarpInputTypes.Bool) return new BooleanType()
    if (type === WarpInputTypes.Address) return new AddressType()
    if (type === WarpInputTypes.Hex) return new BytesType()
    if (type === WarpInputTypes.Asset)
      return new StructType('EsdtTokenPayment', [
        new FieldDefinition('token_identifier', '', new TokenIdentifierType()),
        new FieldDefinition('token_nonce', '', new U64Type()),
        new FieldDefinition('amount', '', new BigUIntType()),
      ])

    if (type.startsWith('enum')) {
      const enumNameMatch = type.match(/\(([^)]+)\)/)
      if (!enumNameMatch) throw new Error('Enum type must include a name in the format enum(Name)')
      return new EnumType(enumNameMatch[1], [])
    }
    if (type === WarpMultiversxInputTypes.Token) return new TokenIdentifierType()
    if (type === WarpMultiversxInputTypes.CodeMeta) return new CodeMetadataType()

    throw new Error(`WarpArgSerializer (nativeToType): Unsupported input type: ${type}`)
  }

  stringToTyped(value: string): TypedValue {
    const [type, val] = value.split(/:(.*)/, 2) as [WarpActionInputType, string]

    if (type === WarpInputTypes.Option) {
      const baseValue = this.stringToTyped(val)
      return baseValue instanceof NothingValue ? OptionValue.newMissingTyped(baseValue.getType()) : OptionValue.newProvided(baseValue)
    }
    if (type === WarpInputTypes.Vector) {
      const colonIndex = val.indexOf(WarpConstants.ArgParamsSeparator)
      const baseType = val.substring(0, colonIndex)
      const listValues = val.substring(colonIndex + 1)

      // Handle tuples specially - they don't need the baseType prefix
      if (baseType.startsWith(WarpInputTypes.Tuple)) {
        const values = listValues.split(',')
        const typedValues = values.map((v) => this.stringToTyped(v))
        return new VariadicValue(new VariadicType(this.nativeToType(baseType)), typedValues)
      }

      // Handle lists of tuples - the entire listValues is the tuple strings
      if (listValues.includes('tuple(')) {
        // Split by comma, but be careful not to split within tuple parentheses
        const values = this.splitTupleStrings(listValues)
        const typedValues = values.map((v) => this.stringToTyped(v))
        // Extract just the tuple type from the first tuple string
        const firstTuple = values[0]
        const tupleTypeMatch = firstTuple.match(/^(tuple\([^)]+\))/)
        const tupleType = tupleTypeMatch ? tupleTypeMatch[1] : 'tuple'
        return new VariadicValue(new VariadicType(this.nativeToType(tupleType)), typedValues)
      }

      // Use struct separator for structs, comma for other types
      const separator = baseType.startsWith(WarpInputTypes.Struct) ? WarpConstants.ArgStructSeparator : WarpConstants.ArgListSeparator
      const values = listValues.split(separator)
      const typedValues = values.map((v) => this.stringToTyped(`${baseType}:${v}`))
      return new VariadicValue(new VariadicType(this.nativeToType(baseType)), typedValues)
    }
    if (type.startsWith(WarpInputTypes.Tuple)) {
      // Extract the content inside the parentheses
      const content = type.match(/\(([^)]+)\)/)?.[1]
      if (!content) {
        throw new Error(`Invalid tuple format: ${type}`)
      }
      const typeValuePairs = content.split(',')
      const values = []
      for (let i = 0; i < typeValuePairs.length; i += 2) {
        const itemType = typeValuePairs[i]
        const itemValue = typeValuePairs[i + 1]
        values.push(this.stringToTyped(`${itemType}:${itemValue}`))
      }
      const types = values.map((v) => v.getType())
      return new CompositeValue(new CompositeType(...types), values)
    }
    if (type.startsWith(WarpInputTypes.Struct)) {
      const structNameMatch = type.match(/\(([^)]+)\)/)
      const structName = structNameMatch ? structNameMatch[1] : 'CustomStruct'
      if (!val) return new Struct(new StructType(structName, []), [])
      const fields = val.split(WarpConstants.ArgListSeparator)
      const fieldDefinitions: FieldDefinition[] = []
      const fieldValues: Field[] = []
      fields.forEach((field) => {
        const match = field.match(
          new RegExp(`^\\(([^${WarpConstants.ArgParamsSeparator}]+)${WarpConstants.ArgParamsSeparator}([^)]+)\\)(.+)$`)
        )
        if (match) {
          const [, fieldName, fieldType, fieldValue] = match
          const typedValue = this.stringToTyped(`${fieldType}${WarpConstants.ArgParamsSeparator}${fieldValue}`)
          fieldDefinitions.push(new FieldDefinition(fieldName, '', typedValue.getType()))
          fieldValues.push(new Field(typedValue, fieldName))
        }
      })
      return new Struct(new StructType(structName, fieldDefinitions), fieldValues)
    }
    if (type === WarpInputTypes.String) return val ? StringValue.fromUTF8(val as string) : new NothingValue()
    if (type === WarpInputTypes.Uint8) return val ? new U8Value(Number(val)) : new NothingValue()
    if (type === WarpInputTypes.Uint16) return val ? new U16Value(Number(val)) : new NothingValue()
    if (type === WarpInputTypes.Uint32) return val ? new U32Value(Number(val)) : new NothingValue()
    if (type === WarpInputTypes.Uint64) return val ? new U64Value(BigInt(val as string)) : new NothingValue()
    if (type === WarpInputTypes.Biguint) return val ? new BigUIntValue(BigInt(val as string)) : new NothingValue()
    if (type === WarpInputTypes.Bool) return val ? new BooleanValue(typeof val === 'boolean' ? val : val === 'true') : new NothingValue()
    if (type === WarpInputTypes.Address) return val ? new AddressValue(Address.newFromBech32(val as string)) : new NothingValue()
    if (type === WarpInputTypes.Hex) return val ? BytesValue.fromHex(val as string) : new NothingValue()
    if (type === WarpInputTypes.Asset) {
      const [identifier, amount] = val.split(WarpConstants.ArgCompositeSeparator)
      const tokenComputer = new TokenComputer()
      const tokenIdentifier = isNativeToken(identifier)
        ? getNormalizedTokenIdentifier(identifier)
        : tokenComputer.extractIdentifierFromExtendedIdentifier(identifier)
      const nonce = isNativeToken(identifier) ? 0n : tokenComputer.extractNonceFromExtendedIdentifier(identifier)
      return new Struct(this.nativeToType('asset') as StructType, [
        new Field(new TokenIdentifierValue(tokenIdentifier), 'token_identifier'),
        new Field(new U64Value(BigInt(nonce)), 'token_nonce'),
        new Field(new BigUIntValue(BigInt(amount)), 'amount'),
      ])
    }
    if (type === WarpMultiversxInputTypes.Null) {
      return new NothingValue()
    }
    if (type === WarpMultiversxInputTypes.Optional) {
      const baseValue = this.stringToTyped(val)
      return baseValue instanceof NothingValue ? OptionalValue.newMissing() : new OptionalValue(baseValue.getType(), baseValue)
    }
    if (type === WarpMultiversxInputTypes.List) {
      const [baseType, listValues] = val.split(SplitParamsRegex, 2) as [BaseWarpActionInputType, string]
      const values = listValues.split(WarpConstants.ArgListSeparator)
      const typedValues = values.map((v) => this.stringToTyped(baseType + WarpConstants.ArgParamsSeparator + v))
      return new List(this.nativeToType(baseType), typedValues)
    }
    if (type === WarpMultiversxInputTypes.Token) return val ? new TokenIdentifierValue(val as string) : new NothingValue()
    if (type === WarpMultiversxInputTypes.CodeMeta)
      return new CodeMetadataValue(CodeMetadata.newFromBytes(Uint8Array.from(Buffer.from(val as string, 'hex'))))
    if (type.startsWith('enum')) {
      const enumNameMatch = type.match(/\(([^)]+)\)/)
      const enumName = enumNameMatch ? enumNameMatch[1] : 'CustomEnum'
      const discriminant = Number(val)
      if (isNaN(discriminant)) throw new Error(`WarpArgSerializer (stringToTyped): Invalid enum discriminant: ${val}`)
      const variant = new EnumVariantDefinition(val, discriminant, [])
      const enumType = new EnumType(enumName, [variant])
      return new EnumValue(enumType, variant, [])
    }

    throw new Error(`WarpArgSerializer (stringToTyped): Unsupported input type: ${type}`)
  }

  private splitTupleStrings(str: string): string[] {
    const result = []
    let current = ''
    let parenCount = 0

    for (let i = 0; i < str.length; i++) {
      const char = str[i]
      if (char === '(') {
        parenCount++
      } else if (char === ')') {
        parenCount--
      } else if (char === ',' && parenCount === 0) {
        result.push(current.trim())
        current = ''
        continue
      }
      current += char
    }

    if (current.trim()) {
      result.push(current.trim())
    }

    return result
  }

  typeToString(type: Type): WarpActionInputType {
    if (type.hasExactClass(OptionType.ClassName))
      return WarpInputTypes.Option + WarpConstants.ArgParamsSeparator + this.typeToString(type.getFirstTypeParameter())
    if (type.hasExactClass(VariadicType.ClassName))
      return WarpInputTypes.Vector + WarpConstants.ArgParamsSeparator + this.typeToString(type.getFirstTypeParameter())
    if (type.hasExactClass(StringType.ClassName)) return WarpInputTypes.String
    if (type.hasExactClass(U8Type.ClassName)) return WarpInputTypes.Uint8
    if (type.hasExactClass(U16Type.ClassName)) return WarpInputTypes.Uint16
    if (type.hasExactClass(U32Type.ClassName)) return WarpInputTypes.Uint32
    if (type.hasExactClass(U64Type.ClassName)) return WarpInputTypes.Uint64
    if (type.hasExactClass(BigUIntType.ClassName)) return WarpInputTypes.Biguint
    if (type.hasExactClass(BooleanType.ClassName)) return WarpInputTypes.Bool
    if (type.hasExactClass(AddressType.ClassName)) return WarpInputTypes.Address
    if (type.hasExactClass(BytesType.ClassName)) return WarpInputTypes.Hex
    if (type.hasExactClass(TokenIdentifierType.ClassName)) return WarpMultiversxInputTypes.Token
    if (type.hasExactClass(OptionalType.ClassName))
      return WarpMultiversxInputTypes.Optional + WarpConstants.ArgParamsSeparator + this.typeToString(type.getFirstTypeParameter())
    if (type.hasExactClass(ListType.ClassName))
      return WarpMultiversxInputTypes.List + WarpConstants.ArgParamsSeparator + this.typeToString(type.getFirstTypeParameter())
    if (type.hasExactClass(CodeMetadataType.ClassName)) return WarpMultiversxInputTypes.CodeMeta
    if (type.hasExactClass(StructType.ClassName) && type.getClassName() === 'EsdtTokenPayment') return WarpInputTypes.Asset
    if (type.hasExactClass(StructType.ClassName)) return `${WarpInputTypes.Struct}(${type.getName()})`
    if (type.hasExactClass(EnumType.ClassName)) return `enum(${type.getName()})`

    throw new Error(`WarpArgSerializer (typeToString): Unsupported input type: ${type.getClassName()}`)
  }
}
