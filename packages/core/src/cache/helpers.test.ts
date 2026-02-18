import { valueReplacer, valueReviver } from './helpers'

describe('cache helpers', () => {
  describe('valueReplacer', () => {
    it('should serialize BigInt values', () => {
      const obj = { value: BigInt('12345678901234567890') }
      const result = JSON.stringify(obj, valueReplacer)
      const parsed = JSON.parse(result)
      expect(parsed.value).toBe('$bigint:12345678901234567890')
    })

    it('should leave non-BigInt values unchanged', () => {
      const obj = { string: 'test', number: 42, bool: true, null: null }
      const result = JSON.stringify(obj, valueReplacer)
      const parsed = JSON.parse(result)
      expect(parsed.string).toBe('test')
      expect(parsed.number).toBe(42)
      expect(parsed.bool).toBe(true)
      expect(parsed.null).toBeNull()
    })

    it('should handle nested objects with BigInt', () => {
      const obj = {
        nested: {
          bigint: BigInt('999999999999999999'),
          regular: 'value',
        },
      }
      const result = JSON.stringify(obj, valueReplacer)
      const parsed = JSON.parse(result)
      expect(parsed.nested.bigint).toBe('$bigint:999999999999999999')
      expect(parsed.nested.regular).toBe('value')
    })

    it('should handle arrays with BigInt', () => {
      const obj = { items: [BigInt('1'), BigInt('2'), BigInt('3')] }
      const result = JSON.stringify(obj, valueReplacer)
      const parsed = JSON.parse(result)
      expect(parsed.items).toEqual(['$bigint:1', '$bigint:2', '$bigint:3'])
    })
  })

  describe('valueReviver', () => {
    it('should deserialize bigint marker strings to BigInt', () => {
      const json = '{"value":"$bigint:12345678901234567890"}'
      const parsed = JSON.parse(json, valueReviver)
      expect(parsed.value).toBe(BigInt('12345678901234567890'))
    })

    it('should leave non-marker strings unchanged', () => {
      const json = '{"value":"string:test","number":42}'
      const parsed = JSON.parse(json, valueReviver)
      expect(parsed.value).toBe('string:test')
      expect(parsed.number).toBe(42)
    })

    it('should not convert typed biguint strings', () => {
      const json = '{"value":"biguint:99900000000000000"}'
      const parsed = JSON.parse(json, valueReviver)
      expect(parsed.value).toBe('biguint:99900000000000000')
    })

    it('should not convert other typed input strings', () => {
      const json = '{"a":"address:erd1abc","b":"uint64:1000","c":"string:hello"}'
      const parsed = JSON.parse(json, valueReviver)
      expect(parsed.a).toBe('address:erd1abc')
      expect(parsed.b).toBe('uint64:1000')
      expect(parsed.c).toBe('string:hello')
    })

    it('should handle nested objects with bigint marker', () => {
      const json = '{"nested":{"bigint":"$bigint:999999999999999999","regular":"value"}}'
      const parsed = JSON.parse(json, valueReviver)
      expect(parsed.nested.bigint).toBe(BigInt('999999999999999999'))
      expect(parsed.nested.regular).toBe('value')
    })

    it('should handle arrays with bigint marker strings', () => {
      const json = '{"items":["$bigint:1","$bigint:2","$bigint:3"]}'
      const parsed = JSON.parse(json, valueReviver)
      expect(parsed.items).toEqual([BigInt('1'), BigInt('2'), BigInt('3')])
    })
  })

  describe('round-trip serialization', () => {
    it('should preserve BigInt values through serialize/deserialize', () => {
      const original = {
        bigint: BigInt('12345678901234567890'),
        string: 'test',
        number: 42,
      }
      const serialized = JSON.stringify(original, valueReplacer)
      const deserialized = JSON.parse(serialized, valueReviver)
      expect(deserialized.bigint).toBe(original.bigint)
      expect(deserialized.string).toBe(original.string)
      expect(deserialized.number).toBe(original.number)
    })

    it('should handle complex nested structures', () => {
      const original = {
        level1: {
          level2: {
            bigint: BigInt('98765432109876543210'),
            items: [BigInt('1'), BigInt('2')],
          },
          regular: 'value',
        },
      }
      const serialized = JSON.stringify(original, valueReplacer)
      const deserialized = JSON.parse(serialized, valueReviver)
      expect(deserialized.level1.level2.bigint).toBe(original.level1.level2.bigint)
      expect(deserialized.level1.level2.items).toEqual(original.level1.level2.items)
      expect(deserialized.level1.regular).toBe(original.level1.regular)
    })

    it('should handle BigInt zero', () => {
      const original = { value: BigInt('0') }
      const serialized = JSON.stringify(original, valueReplacer)
      const deserialized = JSON.parse(serialized, valueReviver)
      expect(deserialized.value).toBe(BigInt('0'))
    })

    it('should preserve typed biguint strings through round-trip', () => {
      const original = {
        resolvedInput: { value: 'biguint:99900000000000000' },
        nativeBigint: BigInt('99900000000000000'),
      }
      const serialized = JSON.stringify(original, valueReplacer)
      const deserialized = JSON.parse(serialized, valueReviver)
      expect(deserialized.resolvedInput.value).toBe('biguint:99900000000000000')
      expect(typeof deserialized.resolvedInput.value).toBe('string')
      expect(deserialized.nativeBigint).toBe(BigInt('99900000000000000'))
    })

    it('should keep cached ResolvedInput values callable with .split()', () => {
      const cachedInputs = [
        { name: 'amount', type: 'biguint', value: 'biguint:99900000000000000' },
        { name: 'token', type: 'string', value: 'string:WEGLD-bd4d79' },
      ]
      const serialized = JSON.stringify(cachedInputs, valueReplacer)
      const deserialized = JSON.parse(serialized, valueReviver)
      // The original bug: reviver converted "biguint:X" to BigInt, then .split() crashed
      expect(typeof deserialized[0].value).toBe('string')
      expect(deserialized[0].value.split(':')).toEqual(['biguint', '99900000000000000'])
      expect(typeof deserialized[1].value).toBe('string')
      expect(deserialized[1].value.split(':')).toEqual(['string', 'WEGLD-bd4d79'])
    })
  })
})
