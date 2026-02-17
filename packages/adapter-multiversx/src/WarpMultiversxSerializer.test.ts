import {
  Address,
  AddressType,
  AddressValue,
  BigUIntValue,
  BooleanType,
  BooleanValue,
  BytesValue,
  CodeMetadata,
  CodeMetadataValue,
  CompositeType,
  CompositeValue,
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
  TokenIdentifierValue,
  TokenTransfer,
  U16Value,
  U32Type,
  U32Value,
  U64Type,
  U64Value,
  U8Value,
  EnumType,
  EnumValue,
  EnumVariantDefinition,
  VariadicType,
  VariadicValue,
} from '@multiversx/sdk-core/out'
import { WarpConstants } from '../../core/src/constants'
import { WarpMultiversxSerializer } from './WarpMultiversxSerializer'
import { asset_value } from './utils.codec-value'

describe('WarpMultiversxSerializer', () => {
  let serializer: WarpMultiversxSerializer

  beforeEach(() => {
    serializer = new WarpMultiversxSerializer()
  })

  describe('typedToString', () => {
    it('converts OptionValue', () => {
      const result = serializer.typedToString(new OptionValue(new StringType(), StringValue.fromUTF8('abc')))
      expect(result).toBe('option:string:abc')
    })

    it('converts OptionalValue', () => {
      const result = serializer.typedToString(new OptionalValue(new StringType(), StringValue.fromUTF8('abc')))
      expect(result).toBe('optional:string:abc')
    })

    it('converts ListValue', () => {
      const result = serializer.typedToString(new List(new StringType(), [StringValue.fromUTF8('abc'), StringValue.fromUTF8('def')]))
      expect(result).toBe('list:string:abc,def')
    })

    it('converts VariadicValue', () => {
      const result = serializer.typedToString(
        new VariadicValue(new VariadicType(new StringType()), [StringValue.fromUTF8('abc'), StringValue.fromUTF8('def')])
      )
      expect(result).toBe('vector:string:abc,def')
    })

    it('converts empty VariadicValue', () => {
      const result = serializer.typedToString(new VariadicValue(new VariadicType(new StringType()), []))
      expect(result).toBe('vector:string:')
    })

    it('converts empty VariadicValue with different types', () => {
      const stringResult = serializer.typedToString(new VariadicValue(new VariadicType(new StringType()), []))
      expect(stringResult).toBe('vector:string:')

      const uint64Result = serializer.typedToString(new VariadicValue(new VariadicType(new U64Type()), []))
      expect(uint64Result).toBe('vector:uint64:')

      const boolResult = serializer.typedToString(new VariadicValue(new VariadicType(new BooleanType()), []))
      expect(boolResult).toBe('vector:bool:')
    })

    it('converts empty VariadicValue of complex structs', () => {
      // Create a complex struct type
      const structType = new StructType('ComplexStruct', [
        new FieldDefinition('name', '', new StringType()),
        new FieldDefinition('age', '', new U64Type()),
        new FieldDefinition('active', '', new BooleanType()),
      ])

      const result = serializer.typedToString(new VariadicValue(new VariadicType(structType), []))
      expect(result).toBe('vector:struct(ComplexStruct):')
    })

    it('converts CompositeValue', () => {
      const result = serializer.typedToString(
        new CompositeValue(new CompositeType(new StringType(), new U64Type()), [
          StringValue.fromUTF8('abc'),
          new U64Value('12345678901234567890'),
        ])
      )
      expect(result).toBe('tuple(string,abc,uint64,12345678901234567890)')
    })

    it('converts BigUIntValue to biguint', () => {
      const result = serializer.typedToString(new BigUIntValue(BigInt('123456789012345678901234567890')))
      expect(result).toBe('biguint:123456789012345678901234567890')
    })

    it('converts U8Value to uint8', () => {
      const result = serializer.typedToString(new U8Value(255))
      expect(result).toBe('uint8:255')
    })

    it('converts U16Value to uint16', () => {
      const result = serializer.typedToString(new U16Value(65535))
      expect(result).toBe('uint16:65535')
    })

    it('converts U32Value to uint32', () => {
      const result = serializer.typedToString(new U32Value(4294967295))
      expect(result).toBe('uint32:4294967295')
    })

    it('converts U64Value to uint64', () => {
      const result = serializer.typedToString(new U64Value(BigInt('18446744073709551615')))
      expect(result).toBe('uint64:18446744073709551615')
    })

    it('converts StringValue to string', () => {
      const result = serializer.typedToString(StringValue.fromUTF8('hello'))
      expect(result).toBe('string:hello')
    })

    it('converts BooleanValue to bool', () => {
      const result = serializer.typedToString(new BooleanValue(true))
      expect(result).toBe('bool:true')
    })

    it('converts AddressValue to address', () => {
      const address = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l'
      const result = serializer.typedToString(new AddressValue(Address.newFromBech32(address)))
      expect(result).toBe('address:erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l')
    })

    it('converts TokenIdentifierValue to token', () => {
      const result = serializer.typedToString(new TokenIdentifierValue('1234'))
      expect(result).toBe('token:1234')
    })

    it('converts BytesValue to hex', () => {
      const result = serializer.typedToString(BytesValue.fromHex('1234'))
      expect(result).toBe('hex:1234')
    })

    it('converts CodeMetadataValue to codemeta', () => {
      const result = serializer.typedToString(new CodeMetadataValue(new CodeMetadata(true, false, true, true)))
      expect(result).toBe('codemeta:0106')
    })

    it('converts EsdtTokenPayment Struct to asset', () => {
      const token = new Token({ identifier: 'AAA-123456', nonce: BigInt(5) })
      const transfer = new TokenTransfer({ token, amount: BigInt(100) })
      const result = serializer.typedToString(asset_value(transfer))
      expect(result).toBe('asset:AAA-123456-05|100')
    })

    it('converts a tuple value', () => {
      const result = serializer.typedToString(
        new CompositeValue(new CompositeType(new StringType(), new U64Type()), [StringValue.fromUTF8('abc'), new U64Value(123)])
      )
      expect(result).toBe('tuple(string,abc,uint64,123)')
    })

    it('converts nested List of CompositeValue', () => {
      const result = serializer.typedToString(
        new List(new ListType(new CompositeType(new StringType(), new U64Type())), [
          new CompositeValue(new CompositeType(new StringType(), new U64Type()), [StringValue.fromUTF8('abc'), new U64Value(123)]),
          new CompositeValue(new CompositeType(new StringType(), new U64Type()), [StringValue.fromUTF8('def'), new U64Value(456)]),
          new CompositeValue(new CompositeType(new StringType(), new U64Type()), [StringValue.fromUTF8('ghi'), new U64Value(789)]),
        ])
      )
      expect(result).toBe('list:tuple(string,abc,uint64,123),tuple(string,def,uint64,456),tuple(string,ghi,uint64,789)')
    })

    it('converts nested VariadicValue of CompositeValue', () => {
      const result = serializer.typedToString(
        new VariadicValue(new VariadicType(new CompositeType(new StringType(), new U64Type())), [
          new CompositeValue(new CompositeType(new StringType(), new U64Type()), [StringValue.fromUTF8('abc'), new U64Value(123)]),
          new CompositeValue(new CompositeType(new StringType(), new U64Type()), [StringValue.fromUTF8('def'), new U64Value(456)]),
          new CompositeValue(new CompositeType(new StringType(), new U64Type()), [StringValue.fromUTF8('ghi'), new U64Value(789)]),
        ])
      )
      expect(result).toBe('vector:tuple(string,abc,uint64,123),tuple(string,def,uint64,456),tuple(string,ghi,uint64,789)')
    })

    it('converts Struct to struct string', () => {
      const struct = new Struct(
        new StructType('User', [
          new FieldDefinition('name', '', new StringType()),
          new FieldDefinition('age', '', new U32Type()),
          new FieldDefinition('contracts', '', new ListType(new AddressType())),
        ]),
        [
          new Field(StringValue.fromUTF8('Alice'), 'name'),
          new Field(new U32Value(25), 'age'),
          new Field(
            new List(new ListType(new AddressType()), [
              new AddressValue(Address.newFromBech32('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')),
              new AddressValue(Address.newFromBech32('erd1gqdq5q5g99xjhqfz7as9gzkswv5c28cu90smx9qprs98ps84gn6s5asty7')),
            ]),
            'contracts'
          ),
        ]
      )
      const result = serializer.typedToString(struct)
      expect(result).toBe(
        'struct(User):(name:string)Alice,(age:uint32)25,(contracts:list:address)erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8,erd1gqdq5q5g99xjhqfz7as9gzkswv5c28cu90smx9qprs98ps84gn6s5asty7'
      )
    })

    it('converts simple Struct to struct string', () => {
      const struct = new Struct(
        new StructType('SimpleUser', [new FieldDefinition('name', '', new StringType()), new FieldDefinition('age', '', new U32Type())]),
        [new Field(StringValue.fromUTF8('Alice'), 'name'), new Field(new U32Value(25), 'age')]
      )
      const result = serializer.typedToString(struct)
      expect(result).toBe('struct(SimpleUser):(name:string)Alice,(age:uint32)25')
    })

    it('converts empty Struct to struct string', () => {
      const struct = new Struct(new StructType('Empty', []), [])
      const result = serializer.typedToString(struct)
      expect(result).toBe('struct(Empty):')
    })

    it('converts VariadicValue of Structs to vector of structs string', () => {
      const structType = new StructType('User', [
        new FieldDefinition('name', '', new StringType()),
        new FieldDefinition('age', '', new U32Type()),
      ])
      const structs = [
        new Struct(structType, [new Field(StringValue.fromUTF8('Alice'), 'name'), new Field(new U32Value(25), 'age')]),
        new Struct(structType, [new Field(StringValue.fromUTF8('Bob'), 'name'), new Field(new U32Value(30), 'age')]),
        new Struct(structType, [new Field(StringValue.fromUTF8('Charlie'), 'name'), new Field(new U32Value(35), 'age')]),
      ]
      const result = serializer.typedToString(new VariadicValue(new VariadicType(structType), structs))
      expect(result).toBe(
        `vector:struct(User):(name:string)Alice,(age:uint32)25${WarpConstants.ArgStructSeparator}(name:string)Bob,(age:uint32)30${WarpConstants.ArgStructSeparator}(name:string)Charlie,(age:uint32)35`
      )
    })
  })

  describe('nativeToTyped', () => {
    it('converts option to OptionValue', () => {
      const result = serializer.nativeToTyped('option:string', 'hello')
      expect(result).toBeInstanceOf(OptionValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('converts option to OptionValue with missing value', () => {
      const result = serializer.nativeToTyped('option:string', null)
      expect(result).toBeInstanceOf(OptionValue)
      expect(result.valueOf()).toBe(null)
    })

    it('converts optional to OptionalValue', () => {
      const result = serializer.nativeToTyped('optional:string', 'hello')
      expect(result).toBeInstanceOf(OptionalValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('converts optional to OptionalValue with missing value', () => {
      const result = serializer.nativeToTyped('optional:string', null)
      expect(result).toBeInstanceOf(OptionalValue)
      expect(result.valueOf()).toBe(null)
    })

    it('converts list to ListValue', () => {
      const result = serializer.nativeToTyped('list:string', 'hello,world')
      const actual = result as List
      expect(actual).toBeInstanceOf(List)
      expect(actual.getItems()[0]).toBeInstanceOf(StringValue)
      expect(actual.getItems()[0].valueOf()).toBe('hello')
      expect(actual.getItems()[1]).toBeInstanceOf(StringValue)
      expect(actual.getItems()[1].valueOf()).toBe('world')
    })

    it('converts vector to VariadicValue', () => {
      const result = serializer.nativeToTyped('vector:string', 'hello,world')
      const actual = result as VariadicValue
      expect(actual).toBeInstanceOf(VariadicValue)
      expect(actual.getItems()[0]).toBeInstanceOf(StringValue)
      expect(actual.getItems()[0].valueOf()).toBe('hello')
      expect(actual.getItems()[1]).toBeInstanceOf(StringValue)
      expect(actual.getItems()[1].valueOf()).toBe('world')
    })

    it('converts tuple to CompositeValue', () => {
      const result = serializer.nativeToTyped('tuple(string,hello,uint64,12345678901234567890,uint8,255)', '')
      const actual = result as CompositeValue
      expect(actual).toBeInstanceOf(CompositeValue)
      expect(actual.getItems()[0]).toBeInstanceOf(StringValue)
      expect(actual.getItems()[0].valueOf()).toBe('hello')
      expect(actual.getItems()[1]).toBeInstanceOf(U64Value)
      expect(actual.getItems()[1].valueOf().toString()).toBe('12345678901234567890')
      expect(actual.getItems()[2]).toBeInstanceOf(U8Value)
      expect(actual.getItems()[2].valueOf().toFixed()).toBe('255')
    })

    it('converts string to StringValue', () => {
      const result = serializer.nativeToTyped('string', 'hello')
      expect(result).toBeInstanceOf(StringValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('converts uint8 to U8Value', () => {
      const result = serializer.nativeToTyped('uint8', 255)
      expect(result).toBeInstanceOf(U8Value)
      expect(result.toString()).toBe('255')
    })

    it('converts uint16 to U16Value', () => {
      const result = serializer.nativeToTyped('uint16', 65535)
      expect(result).toBeInstanceOf(U16Value)
      expect(result.toString()).toBe('65535')
    })

    it('converts uint32 to U32Value', () => {
      const result = serializer.nativeToTyped('uint32', 4294967295)
      expect(result).toBeInstanceOf(U32Value)
      expect(result.toString()).toBe('4294967295')
    })

    it('converts uint64 to U64Value', () => {
      const result = serializer.nativeToTyped('uint64', '18446744073709551615')
      expect(result).toBeInstanceOf(U64Value)
      expect(result.valueOf().toString()).toBe('18446744073709551615')
    })

    it('converts biguint to BigUIntValue', () => {
      const result = serializer.nativeToTyped('biguint', '123456789012345678901234567890')
      expect(result).toBeInstanceOf(BigUIntValue)
      expect(result.valueOf().toFixed()).toBe('123456789012345678901234567890')
    })

    it('converts bool to BooleanValue', () => {
      const result = serializer.nativeToTyped('bool', true)
      expect(result).toBeInstanceOf(BooleanValue)
      expect(result.valueOf()).toBe(true)
    })

    it('converts address to AddressValue', () => {
      const address = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l'
      const result = serializer.nativeToTyped('address', address)
      expect(result).toBeInstanceOf(AddressValue)
      expect(result.valueOf()).toBeInstanceOf(Address)
      expect(result.valueOf().toBech32()).toBe(address)
    })

    it('converts token to TokenIdentifierValue', () => {
      const result = serializer.nativeToTyped('token', '1234')
      expect(result).toBeInstanceOf(TokenIdentifierValue)
      expect(result.valueOf()).toBe('1234')
    })

    it('converts hex to BytesValue', () => {
      const result = serializer.nativeToTyped('hex', '1234')
      expect(result).toBeInstanceOf(BytesValue)
      const hexValue = Buffer.from(result.valueOf()).toString('hex')
      expect(hexValue).toBe('1234')
    })

    it('converts codemeta to CodeMetadataValue', () => {
      const result = serializer.nativeToTyped('codemeta', '0106')
      expect(result).toBeInstanceOf(CodeMetadataValue)
      expect(result.valueOf()).toBeInstanceOf(CodeMetadata)
      expect(result.valueOf().toString()).toBe('0106')
    })

    it('converts asset to EsdtTokenPayment Struct', () => {
      const result = serializer.nativeToTyped('asset', 'AAA-123456-05|100') as Struct
      expect(result).toBeInstanceOf(Struct)
      expect(result.getFieldValue('token_identifier').valueOf()).toBe('AAA-123456')
      expect(result.getFieldValue('token_nonce').toString()).toBe('5')
      expect(result.getFieldValue('amount').toString()).toBe('100')
    })

    it('converts EGLD asset to EsdtTokenPayment Struct', () => {
      const result = serializer.nativeToTyped('asset', 'EGLD|10') as Struct
      expect(result).toBeInstanceOf(Struct)
      expect(result.getFieldValue('token_identifier').valueOf()).toBe('EGLD-000000')
      expect(result.getFieldValue('token_nonce').toString()).toBe('0')
      expect(result.getFieldValue('amount').toString()).toBe('10')
    })

    it('converts struct native value to Struct', () => {
      const structValue = { _name: 'User', name: 'Bob', age: 30 }
      const result = serializer.nativeToTyped('struct', structValue) as Struct
      expect(result).toBeInstanceOf(Struct)
      expect(result.getType().getName()).toBe('User')
      expect(result.getFieldValue('name').valueOf()).toBe('Bob')
      expect((result.getFieldValue('age') as U32Value).toString()).toBe('30')
    })

    it('throws error for unsupported type', () => {
      expect(() => serializer.nativeToTyped('unsupported' as any, 'value')).toThrow('Unsupported input type')
    })
  })

  describe('stringToTyped', () => {
    it('converts null to NothingValue', () => {
      const result = serializer.stringToTyped('null')
      expect(result).toBeInstanceOf(NothingValue)
    })

    it('converts option encoded value to OptionValue', () => {
      const result = serializer.stringToTyped('option:string:hello')
      expect(result).toBeInstanceOf(OptionValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('converts option encoded value to OptionValue with missing value', () => {
      const result = serializer.stringToTyped('option:string')
      expect(result).toBeInstanceOf(OptionValue)
      expect(result.valueOf()).toBe(null)
    })

    it('converts optional encoded value to OptionalValue', () => {
      const result = serializer.stringToTyped('optional:string:hello')
      expect(result).toBeInstanceOf(OptionalValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('converts optional encoded value to OptionalValue with missing value', () => {
      const result = serializer.stringToTyped('optional:string')
      expect(result).toBeInstanceOf(OptionalValue)
      expect(result.valueOf()).toBe(null)
    })

    it('converts string encoded value to StringValue', () => {
      const result = serializer.stringToTyped('string:hello')
      expect(result).toBeInstanceOf(StringValue)
      expect(result.valueOf()).toBe('hello')
    })

    it('converts uint encoded values to respective UValue types', () => {
      const uint8Result = serializer.stringToTyped('uint8:255')
      expect(uint8Result).toBeInstanceOf(U8Value)
      expect(uint8Result.toString()).toBe('255')

      const uint16Result = serializer.stringToTyped('uint16:65535')
      expect(uint16Result).toBeInstanceOf(U16Value)
      expect(uint16Result.toString()).toBe('65535')

      const uint32Result = serializer.stringToTyped('uint32:4294967295')
      expect(uint32Result).toBeInstanceOf(U32Value)
      expect(uint32Result.toString()).toBe('4294967295')

      const uint64Result = serializer.stringToTyped('uint64:18446744073709551615')
      expect(uint64Result).toBeInstanceOf(U64Value)
      expect(uint64Result.toString()).toBe('18446744073709551615')
    })

    it('converts biguint encoded value to BigUIntValue', () => {
      const result = serializer.stringToTyped('biguint:123456789012345678901234567890')
      expect(result).toBeInstanceOf(BigUIntValue)
      expect(result.valueOf().toFixed()).toBe('123456789012345678901234567890')
    })

    it('converts bool encoded value to BooleanValue', () => {
      const trueResult = serializer.stringToTyped('bool:true')
      expect(trueResult).toBeInstanceOf(BooleanValue)
      expect(trueResult.valueOf()).toBe(true)

      const falseResult = serializer.stringToTyped('bool:false')
      expect(falseResult).toBeInstanceOf(BooleanValue)
      expect(falseResult.valueOf()).toBe(false)
    })

    it('converts address encoded value to AddressValue', () => {
      const address = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l'
      const result = serializer.stringToTyped(`address:${address}`)
      expect(result).toBeInstanceOf(AddressValue)
      expect(result.valueOf()).toBeInstanceOf(Address)
      expect(result.valueOf().toBech32()).toBe(address)
    })

    it('converts hex encoded value to BytesValue', () => {
      const result = serializer.stringToTyped('hex:1234')
      expect(result).toBeInstanceOf(BytesValue)
      const hexValue = Buffer.from(result.valueOf()).toString('hex')
      expect(hexValue).toBe('1234')
    })

    it('converts nested vector of tuple', () => {
      const result = serializer.stringToTyped(
        'vector:tuple(string,abc,uint64,123),tuple(string,def,uint64,456),tuple(string,ghi,uint64,789)'
      ) as VariadicValue
      expect(result).toBeInstanceOf(VariadicValue)
      const values = result.getItems()

      const actualFirst = (values[0] as CompositeValue).getItems()
      expect(actualFirst[0].valueOf().toString()).toBe('abc')
      expect(actualFirst[1].toString()).toBe('123')

      const actualSecond = (values[1] as CompositeValue).getItems()
      expect(actualSecond[0].valueOf().toString()).toBe('def')
      expect(actualSecond[1].toString()).toBe('456')

      const actualThird = (values[2] as CompositeValue).getItems()
      expect(actualThird[0].valueOf().toString()).toBe('ghi')
      expect(actualThird[1].toString()).toBe('789')
    })

    it('converts struct string to Struct', () => {
      const result = serializer.stringToTyped('struct(User):(name:string)Alice,(age:uint32)25') as Struct
      expect(result).toBeInstanceOf(Struct)
      expect(result.getFieldValue('name').valueOf()).toBe('Alice')
      expect((result.getFieldValue('age') as U32Value).toString()).toBe('25')
    })

    it('converts empty struct string to Struct', () => {
      const result = serializer.stringToTyped('struct(Empty):') as Struct
      expect(result).toBeInstanceOf(Struct)
      expect(result.getFields()).toHaveLength(0)
    })

    it('converts vector of structs string to VariadicValue of Structs', () => {
      const result = serializer.stringToTyped(
        `vector:struct(User):(name:string)Alice,(age:uint32)25${WarpConstants.ArgStructSeparator}(name:string)Bob,(age:uint32)30${WarpConstants.ArgStructSeparator}(name:string)Charlie,(age:uint32)35`
      ) as VariadicValue
      expect(result).toBeInstanceOf(VariadicValue)
      const structs = result.getItems()
      expect(structs).toHaveLength(3)

      const firstStruct = structs[0] as Struct
      expect(firstStruct).toBeInstanceOf(Struct)
      expect(firstStruct.getFieldValue('name').valueOf()).toBe('Alice')
      expect((firstStruct.getFieldValue('age') as U32Value).toString()).toBe('25')

      const secondStruct = structs[1] as Struct
      expect(secondStruct).toBeInstanceOf(Struct)
      expect(secondStruct.getFieldValue('name').valueOf()).toBe('Bob')
      expect((secondStruct.getFieldValue('age') as U32Value).toString()).toBe('30')

      const thirdStruct = structs[2] as Struct
      expect(thirdStruct).toBeInstanceOf(Struct)
      expect(thirdStruct.getFieldValue('name').valueOf()).toBe('Charlie')
      expect((thirdStruct.getFieldValue('age') as U32Value).toString()).toBe('35')
    })

    it('throws error for unsupported type', () => {
      expect(() => serializer.stringToTyped('unsupported:value')).toThrow('Unsupported input type')
    })
  })

  describe('typeToString', () => {
    it('converts OptionType to option', () => {
      const result = serializer.typeToString(new OptionType(new StringType()))
      expect(result).toBe('option:string')
    })

    it('converts OptionalType to optional', () => {
      const result = serializer.typeToString(new OptionalType(new StringType()))
      expect(result).toBe('optional:string')
    })

    it('converts EnumType to enum(Name)', () => {
      const enumType = new EnumType('Status', [
        new EnumVariantDefinition('Active', 0, []),
        new EnumVariantDefinition('Paused', 1, []),
        new EnumVariantDefinition('Stopped', 2, []),
      ])
      const result = serializer.typeToString(enumType)
      expect(result).toBe('enum(Status)')
    })
  })

  describe('enum handling', () => {
    it('converts enum discriminant string to EnumValue', () => {
      const result = serializer.stringToTyped('enum(Status):1')
      expect(result).toBeInstanceOf(EnumValue)
      expect((result as EnumValue).discriminant).toBe(1)
    })

    it('converts enum discriminant 0 correctly', () => {
      const result = serializer.stringToTyped('enum(Status):0')
      expect(result).toBeInstanceOf(EnumValue)
      expect((result as EnumValue).discriminant).toBe(0)
    })

    it('creates EnumType from nativeToType', () => {
      const result = (serializer as any).nativeToType('enum(Status)')
      expect(result).toBeInstanceOf(EnumType)
      expect(result.getName()).toBe('Status')
    })

    it('converts EnumValue to string via typedToString', () => {
      const enumType = new EnumType('Status', [
        new EnumVariantDefinition('Active', 0, []),
        new EnumVariantDefinition('Paused', 1, []),
      ])
      const value = EnumValue.fromDiscriminant(enumType, 1)
      const result = serializer.typedToString(value)
      expect(result).toBe('enum(Status):1')
    })

    it('round-trips enum through typedToString and stringToTyped', () => {
      const enumType = new EnumType('Status', [
        new EnumVariantDefinition('Active', 0, []),
        new EnumVariantDefinition('Paused', 1, []),
        new EnumVariantDefinition('Stopped', 2, []),
      ])
      const original = EnumValue.fromDiscriminant(enumType, 2)
      const asString = serializer.typedToString(original)
      expect(asString).toBe('enum(Status):2')
      const restored = serializer.stringToTyped(asString)
      expect(restored).toBeInstanceOf(EnumValue)
      expect((restored as EnumValue).discriminant).toBe(2)
    })

    it('throws on invalid enum discriminant', () => {
      expect(() => serializer.stringToTyped('enum(Status):notanumber')).toThrow('Invalid enum discriminant')
    })
  })

  describe('codemeta handling', () => {
    it('converts CodeMetadataValue to codemeta string', () => {
      const codeMetadata = new CodeMetadataValue(new CodeMetadata(true, false, true, false))
      const result = serializer.typedToString(codeMetadata)
      expect(result).toBe('codemeta:0102')
    })

    it('converts codemeta string to CodeMetadataValue and asserts values', () => {
      const result = serializer.stringToTyped('codemeta:0102')
      expect(result).toBeInstanceOf(CodeMetadataValue)

      const metadata = result.valueOf() as CodeMetadata
      expect(metadata).toBeInstanceOf(CodeMetadata)
      expect(metadata.toString()).toBe('0102')

      // Test that the metadata can be recreated with the same values
      const recreated = new CodeMetadataValue(new CodeMetadata(true, false, true, false))
      expect(recreated.valueOf().toString()).toBe('0102')
    })

    it('converts specific CodeMetadata values correctly', () => {
      // Test with all flags set to true
      const allTrue = new CodeMetadataValue(new CodeMetadata(true, true, true, true))
      const allTrueResult = serializer.typedToString(allTrue)
      expect(allTrueResult).toBe('codemeta:0506')

      // Test with all flags set to false
      const allFalse = new CodeMetadataValue(new CodeMetadata(false, false, false, false))
      const allFalseResult = serializer.typedToString(allFalse)
      expect(allFalseResult).toBe('codemeta:0000')

      // Test with specific pattern: upgradeable=true, readable=false, payable=true, payableBySc=false
      const specific = new CodeMetadataValue(new CodeMetadata(true, false, true, false))
      const specificResult = serializer.typedToString(specific)
      expect(specificResult).toBe('codemeta:0102')
    })

    it('throws error for invalid codemeta format', () => {
      expect(() => serializer.stringToTyped('codemeta:invalid')).toThrow()
    })
  })
})
