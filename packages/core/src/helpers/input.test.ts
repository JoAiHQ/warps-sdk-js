import { hasInputPrefix, splitInput } from './input'

describe('splitInput', () => {
  it('should split simple type:value pairs', () => {
    expect(splitInput('biguint:123')).toEqual(['biguint', '123'])
    expect(splitInput('address:erd1abc')).toEqual(['address', 'erd1abc'])
    expect(splitInput('string:hello world')).toEqual(['string', 'hello world'])
  })

  it('should handle asset inputs with amounts and pipes', () => {
    expect(splitInput('asset:TOKEN-123|100')).toEqual(['asset', 'TOKEN-123|100'])
    expect(splitInput('asset:package::module::type|50.5')).toEqual(['asset', 'package::module::type|50.5'])
  })

  it('should handle edge cases', () => {
    expect(splitInput('type:')).toEqual(['type', ''])
    expect(splitInput('typeonly')).toEqual(['typeonly', ''])
    expect(splitInput(':valueonly')).toEqual(['', 'valueonly'])
  })

  it('should handle multiple colons in value', () => {
    expect(splitInput('type:value:with:colons:here')).toEqual(['type', 'value:with:colons:here'])
    expect(splitInput('asset:package::module::type::nested')).toEqual(['asset', 'package::module::type::nested'])
  })
})

describe('hasInputPrefix', () => {
  it('should return true for valid basic types', () => {
    expect(hasInputPrefix('string:hello')).toBe(true)
    expect(hasInputPrefix('uint64:123')).toBe(true)
    expect(hasInputPrefix('address:erd1abc')).toBe(true)
    expect(hasInputPrefix('bool:true')).toBe(true)
    expect(hasInputPrefix('biguint:123456')).toBe(true)
  })

  it('should return true for complex input types', () => {
    expect(hasInputPrefix('option:string:optional')).toBe(true)
    expect(hasInputPrefix('vector:string:args')).toBe(true)
    expect(hasInputPrefix('tuple:types:here')).toBe(true)
  })

  it('should return false for invalid types', () => {
    expect(hasInputPrefix('invalid:value')).toBe(false)
    expect(hasInputPrefix('randomtype:123')).toBe(false)
    expect(hasInputPrefix('notatype:hello')).toBe(false)
  })

  it('should return false for inputs without colon', () => {
    expect(hasInputPrefix('stringvalue')).toBe(false)
    expect(hasInputPrefix('u64value')).toBe(false)
    expect(hasInputPrefix('')).toBe(false)
  })

  it('should return false for empty or whitespace inputs', () => {
    expect(hasInputPrefix('')).toBe(false)
    expect(hasInputPrefix(':')).toBe(false)
    expect(hasInputPrefix(' :value')).toBe(false)
  })

  it('should handle edge cases with multiple colons', () => {
    expect(hasInputPrefix('string:value:with:colons')).toBe(true)
    expect(hasInputPrefix('invalid:value:with:colons')).toBe(false)
  })

  it('should return true for array type prefixes', () => {
    expect(hasInputPrefix('string[]:["a","b"]')).toBe(true)
    expect(hasInputPrefix('uint64[]:[1,2]')).toBe(true)
    expect(hasInputPrefix('bool[]:[true,false]')).toBe(true)
    expect(hasInputPrefix('address[]:["erd1"]')).toBe(true)
  })

  it('should return false for non-string inputs', () => {
    expect(hasInputPrefix(null as unknown as string)).toBe(false)
    expect(hasInputPrefix(undefined as unknown as string)).toBe(false)
    expect(hasInputPrefix(123 as unknown as string)).toBe(false)
    expect(hasInputPrefix(true as unknown as string)).toBe(false)
    expect(hasInputPrefix({} as unknown as string)).toBe(false)
    expect(hasInputPrefix([] as unknown as string)).toBe(false)
  })
})
