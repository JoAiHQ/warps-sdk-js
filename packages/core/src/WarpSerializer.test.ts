import { WarpSerializer } from './WarpSerializer'
import { WarpConstants } from './constants'
import { WarpStructValue } from './types'

describe('WarpSerializer', () => {
  let serializer: WarpSerializer

  beforeEach(() => {
    serializer = new WarpSerializer()
  })

  describe('nativeToString', () => {
    it('serializes address values', () => {
      const result = serializer.nativeToString('address', 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l')
      expect(result).toBe('address:erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l')
    })

    it('serializes bool values', () => {
      expect(serializer.nativeToString('bool', true)).toBe('bool:true')
      expect(serializer.nativeToString('bool', false)).toBe('bool:false')
    })

    it('serializes biguint values', () => {
      const bigValue = BigInt('1234567890')
      expect(serializer.nativeToString('biguint', bigValue)).toBe('biguint:1234567890')
    })

    it('serializes uint values', () => {
      expect(serializer.nativeToString('uint64', 123)).toBe('uint64:123')
      expect(serializer.nativeToString('uint32', 456)).toBe('uint32:456')
      expect(serializer.nativeToString('uint16', 789)).toBe('uint16:789')
      expect(serializer.nativeToString('uint8', 255)).toBe('uint8:255')
    })

    it('serializes string values', () => {
      expect(serializer.nativeToString('string', 'hello')).toBe('string:hello')
    })

    it('serializes hex values', () => {
      expect(serializer.nativeToString('hex', '0x1234')).toBe('hex:0x1234')
    })

    it('serializes token values via type registry', () => {
      // Mock type registry with token handler
      const mockTypeRegistry = {
        hasType: (type: string) => type === 'token',
        getHandler: (type: string) => ({
          stringToNative: (value: string) => value,
          nativeToString: (value: any) => `token:${value}`,
        }),
        registerType: () => {},
        getRegisteredTypes: () => ['token'],
        registerTypeAlias: () => {},
        getAlias: () => undefined,
        resolveType: (type: string) => type,
      }
      const serializerWithRegistry = new WarpSerializer({ typeRegistry: mockTypeRegistry as any })
      expect(serializerWithRegistry.nativeToString('token', 'TOKEN-123456')).toBe('token:TOKEN-123456')
    })

    it('serializes list values via type registry alias', () => {
      // Mock type registry with list as alias for vector
      const mockTypeRegistry = {
        hasType: (type: string) => type === 'list' || type === 'vector',
        getHandler: (type: string) => {
          if (type === 'list') {
            // Return vector handler for list alias
            return {
              stringToNative: (value: string) => {
                // Vector handler logic
                const [baseType, listValues] = value.split(':', 2)
                const values = listValues ? listValues.split(',') : []
                return values.map((v) => `${baseType}:${v}`)
              },
              nativeToString: (value: any) => {
                // Vector handler logic
                if (!Array.isArray(value)) return 'vector:'
                if (value.length === 0) return 'vector:'
                const firstValue = value[0]
                if (typeof firstValue === 'string' && firstValue.includes(':')) {
                  const baseType = firstValue.split(':')[0]
                  const values = value.map((v) => v.split(':')[1] || '')
                  return `vector:${baseType}:${values.join(',')}`
                }
                return 'vector:'
              },
            }
          }
          return undefined
        },
        registerType: () => {},
        registerTypeAlias: () => {},
        getRegisteredTypes: () => ['list', 'vector'],
        getAlias: () => undefined,
        resolveType: (type: string) => type,
      }
      const serializerWithRegistry = new WarpSerializer({ typeRegistry: mockTypeRegistry as any })
      expect(serializerWithRegistry.nativeToString('list', ['string:hello', 'string:world'])).toBe('vector:string:hello,world')
    })

    it('serializes list values via alias to core vector type', () => {
      // Mock type registry with list as alias for core vector type
      const mockTypeRegistry = {
        hasType: (type: string) => type === 'list',
        getHandler: (type: string) => undefined, // No handler for core types
        getAlias: (type: string) => (type === 'list' ? 'vector' : undefined),
        resolveType: (type: string) => (type === 'list' ? 'vector' : type),
        registerType: () => {},
        registerTypeAlias: () => {},
        getRegisteredTypes: () => ['list'],
      }
      const serializerWithRegistry = new WarpSerializer({ typeRegistry: mockTypeRegistry as any })
      // Should use core vector serialization
      expect(serializerWithRegistry.nativeToString('list', ['hello', 'world'])).toBe('vector:hello,world')
    })

    it('serializes asset values', () => {
      const assetValue = { identifier: 'AAA-123456-05', amount: BigInt(100) }
      expect(serializer.nativeToString('asset', assetValue)).toBe('asset:AAA-123456-05|100')
    })

    it('serializes tuple values', () => {
      const tupleValue = ['hello', 123]
      expect(serializer.nativeToString('tuple', tupleValue)).toBe('tuple:hello,123')
    })

    it('serializes struct values', () => {
      const structValue = { _name: 'User', name: 'world', age: 456 }
      expect(serializer.nativeToString('struct', structValue)).toBe('struct(User):(name:string)world,(age:uint32)456')
    })

    it('serializes complex struct with address', () => {
      const structValue = {
        _name: 'Person',
        name: 'Alex',
        age: 34,
        wallet: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      }
      expect(serializer.nativeToString('struct', structValue)).toBe(
        'struct(Person):(name:string)Alex,(age:uint32)34,(wallet:string)erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8'
      )
    })

    it('throws error when struct object lacks _name property', () => {
      const structValue = { name: 'world', age: 456 }
      expect(() => serializer.nativeToString('struct', structValue)).toThrow(
        'Struct objects must have a _name property to specify the struct name'
      )
    })

    it('serializes vector of tuples', () => {
      const vectorValue = ['tuple(uint64|biguint):1,1000000', 'tuple(uint64|biguint):2,2000000', 'tuple(uint64|biguint):3,3000000']
      expect(serializer.nativeToString('vector', vectorValue)).toBe('vector:tuple(uint64|biguint):1|1000000,2|2000000,3|3000000')
    })

    it('serializes vector of structs', () => {
      const vectorValue = [
        'struct(User):(name:string)Alice,(age:uint32)25',
        'struct(User):(name:string)Bob,(age:uint32)30',
        'struct(User):(name:string)Charlie,(age:uint32)35',
      ]
      expect(serializer.nativeToString('vector', vectorValue)).toBe(
        `vector:struct(User):(name:string)Alice,(age:uint32)25${WarpConstants.ArgStructSeparator}(name:string)Bob,(age:uint32)30${WarpConstants.ArgStructSeparator}(name:string)Charlie,(age:uint32)35`
      )
    })

    it('serializes empty vector returns proper format', () => {
      const result = serializer.nativeToString('vector', [])
      expect(result).toBe('vector:')
    })
  })

  describe('stringToNative', () => {
    it('deserializes null', () => {
      const result = serializer.stringToNative('null')
      expect(result[0]).toBe('null')
      expect(result[1]).toBe(null)
    })

    it('deserializes option', () => {
      const result = serializer.stringToNative('option:string:hello')
      expect(result[0]).toBe('option:string')
      expect(result[1]).toBe('hello')
    })

    it('deserializes option with missing value', () => {
      const result = serializer.stringToNative('option:string')
      expect(result[0]).toBe('option:string')
      expect(result[1]).toBe(null)
    })
    it('deserializes vector of u64', () => {
      const result = serializer.stringToNative('vector:uint64:123,456,789')
      expect(result[0]).toBe('vector:uint64')
      const values = result[1] as BigInt[]
      expect(values[0].toString()).toBe('123')
      expect(values[1].toString()).toBe('456')
      expect(values[2].toString()).toBe('789')
    })

    it('deserializes vector of tuple', function () {
      const result = serializer.stringToNative('vector:tuple(string|uint64):abc|123,def|456,ghi|789')

      expect(result[0]).toBe('vector:tuple(string|uint64)')
      const values = result[1] as [string, BigInt][]
      expect(values[0][0].toString()).toBe('abc')
      expect(values[0][1].toString()).toBe('123')
      expect(values[1][0].toString()).toBe('def')
      expect(values[1][1].toString()).toBe('456')
      expect(values[2][0].toString()).toBe('ghi')
      expect(values[2][1].toString()).toBe('789')
    })

    it('deserializes vector of empty values', () => {
      const result = serializer.stringToNative('vector:string:')
      expect(result[0]).toBe('vector:string')
      expect(result[1]).toEqual([])
    })

    it('deserializes empty vector returns array not undefined', () => {
      const result = serializer.stringToNative('vector:string:')
      expect(result[0]).toBe('vector:string')
      expect(Array.isArray(result[1])).toBe(true)
      expect(result[1]).toEqual([])
    })

    it('deserializes vector of structs', () => {
      const result = serializer.stringToNative(
        `vector:struct(User):(name:string)Alice,(age:uint32)25${WarpConstants.ArgStructSeparator}(name:string)Bob,(age:uint32)30${WarpConstants.ArgStructSeparator}(name:string)Charlie,(age:uint32)35`
      )

      expect(result[0]).toBe('vector:struct(User)')
      const values = result[1] as WarpStructValue[]
      expect(values).toHaveLength(3)

      expect(values[0]._name).toBe('User')
      expect(values[0].name).toBe('Alice')
      expect(values[0].age).toBe(25)

      expect(values[1]._name).toBe('User')
      expect(values[1].name).toBe('Bob')
      expect(values[1].age).toBe(30)

      expect(values[2]._name).toBe('User')
      expect(values[2].name).toBe('Charlie')
      expect(values[2].age).toBe(35)
    })

    it('deserializes tuple values', () => {
      const result = serializer.stringToNative('tuple(string|uint64):hello|123')
      expect(result[0]).toBe('tuple(string|uint64)')
      const values = result[1] as [string, BigInt][]
      expect(values[0].toString()).toBe('hello')
      expect(values[1].toString()).toBe('123')
    })

    it('deserializes struct values', () => {
      const result = serializer.stringToNative('struct(User):(name:string)world,(age:uint32)456')
      expect(result[0]).toBe('struct(User)')
      const obj = result[1] as WarpStructValue
      expect(obj._name).toBe('User')
      expect(obj.name).toBe('world')
      expect(obj.age).toBe(456)
    })

    it('deserializes complex struct with address', () => {
      const serialized =
        'struct(Person):(name:string)Alex,(age:uint32)34,(wallet:string)erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8'
      const [type, deserialized] = serializer.stringToNative(serialized)
      expect(type).toBe('struct(Person)')
      expect(deserialized).toEqual({
        _name: 'Person',
        name: 'Alex',
        age: 34,
        wallet: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      })
    })

    it('throws error when deserializing struct without name', () => {
      expect(() => serializer.stringToNative('struct:(name:string)world,(age:uint32)456')).toThrow(
        'Struct type must include a name in the format struct(Name)'
      )
    })

    it('deserializes string values', () => {
      expect(serializer.stringToNative('string:hello')).toEqual(['string', 'hello'])
    })

    it('deserializes chain input type as string', () => {
      expect(serializer.stringToNative('chain:multiversx')).toEqual(['chain', 'multiversx'])
      expect(serializer.stringToNative('chain:solana')).toEqual(['chain', 'solana'])
    })

    it('deserializes nft input type as string', () => {
      expect(serializer.stringToNative('nft:NFT-abc123')).toEqual(['nft', 'NFT-abc123'])
    })

    it('deserializes token values via type registry', () => {
      // Mock type registry with token handler
      const mockTypeRegistry = {
        hasType: (type: string) => type === 'token',
        getHandler: (type: string) => ({
          stringToNative: (value: string) => value,
          nativeToString: (value: any) => `token:${value}`,
        }),
        registerType: () => {},
        getRegisteredTypes: () => ['token'],
        registerTypeAlias: () => {},
        getAlias: () => undefined,
        resolveType: (type: string) => type,
      }
      const serializerWithRegistry = new WarpSerializer({ typeRegistry: mockTypeRegistry as any })
      expect(serializerWithRegistry.stringToNative('token:TOKEN-123456')).toEqual(['token', 'TOKEN-123456'])
    })

    it('deserializes list values via type registry alias', () => {
      // Mock type registry with list as alias for vector
      const mockTypeRegistry = {
        hasType: (type: string) => type === 'list' || type === 'vector',
        getHandler: (type: string) => {
          if (type === 'list') {
            // Return vector handler for list alias
            return {
              stringToNative: (value: string) => {
                // Vector handler logic
                const [baseType, listValues] = value.split(':', 2)
                const values = listValues ? listValues.split(',') : []
                return values.map((v) => `${baseType}:${v}`)
              },
              nativeToString: (value: any) => {
                // Vector handler logic
                if (!Array.isArray(value)) return 'vector:'
                if (value.length === 0) return 'vector:'
                const firstValue = value[0]
                if (typeof firstValue === 'string' && firstValue.includes(':')) {
                  const baseType = firstValue.split(':')[0]
                  const values = value.map((v) => v.split(':')[1] || '')
                  return `vector:${baseType}:${values.join(',')}`
                }
                return 'vector:'
              },
            }
          }
          return undefined
        },
        registerType: () => {},
        registerTypeAlias: () => {},
        getRegisteredTypes: () => ['list', 'vector'],
        getAlias: () => undefined,
        resolveType: (type: string) => type,
      }
      const serializerWithRegistry = new WarpSerializer({ typeRegistry: mockTypeRegistry as any })
      expect(serializerWithRegistry.stringToNative('list:string:hello,world')).toEqual(['list', ['string:hello', 'string:world']])
    })

    it('deserializes list values via alias to core vector type', () => {
      // Mock type registry with list as alias for core vector type
      const mockTypeRegistry = {
        hasType: (type: string) => type === 'list',
        getHandler: (type: string) => undefined, // No handler for core types
        getAlias: (type: string) => (type === 'list' ? 'vector' : undefined),
        resolveType: (type: string) => (type === 'list' ? 'vector' : type),
        registerType: () => {},
        registerTypeAlias: () => {},
        getRegisteredTypes: () => ['list'],
      }
      const serializerWithRegistry = new WarpSerializer({ typeRegistry: mockTypeRegistry as any })
      // Should use core vector deserialization
      expect(serializerWithRegistry.stringToNative('list:string:hello,world')).toEqual(['list', ['hello', 'world']])
    })

    it('deserializes uint values', () => {
      expect(serializer.stringToNative('uint8:255')).toEqual(['uint8', 255])
      expect(serializer.stringToNative('uint16:789')).toEqual(['uint16', 789])
      expect(serializer.stringToNative('uint32:456')).toEqual(['uint32', 456])
    })

    it('deserializes uint64 values', () => {
      const result = serializer.stringToNative('uint64:1234567890')
      expect(result[0]).toBe('uint64')
      expect(result[1]?.toString()).toBe('1234567890')
    })

    it('deserializes biguint values', () => {
      const result = serializer.stringToNative('biguint:1234567890')
      expect(result[0]).toBe('biguint')
      expect(result[1]?.toString()).toBe('1234567890')
    })

    it('deserializes bool values', () => {
      expect(serializer.stringToNative('bool:true')).toEqual(['bool', true])
      expect(serializer.stringToNative('bool:false')).toEqual(['bool', false])
    })

    it('deserializes address values', () => {
      const address = 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l'
      const result = serializer.stringToNative(`address:${address}`)
      expect(result).toEqual(['address', address])
    })

    it('deserializes hex values', () => {
      expect(serializer.stringToNative('hex:0x1234')).toEqual(['hex', '0x1234'])
    })

    it('deserializes asset values', () => {
      const result = serializer.stringToNative('asset:AAA-123456-05|100')
      expect(result[0]).toBe('asset')
      expect(result[1]).toEqual({ identifier: 'AAA-123456-05', amount: BigInt(100) })
    })

    it('resolves type aliases in stringToNative', () => {
      expect(serializer.stringToNative('boolean:true')).toEqual(['bool', true])
      expect(serializer.stringToNative('boolean:false')).toEqual(['bool', false])
      expect(serializer.stringToNative('integer:42')).toEqual(['uint32', 42])
    })

    it('resolves type aliases in nativeToString', () => {
      expect(serializer.nativeToString('boolean' as any, true)).toBe('bool:true')
      expect(serializer.nativeToString('integer' as any, 42)).toBe('uint32:42')
    })
  })
})
