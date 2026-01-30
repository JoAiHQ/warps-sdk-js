import { Warp } from '@joai/warps'
import { convertMcpArgsToWarpInputs } from './execution'

describe('convertMcpArgsToWarpInputs', () => {
  const createMockWarp = (inputs: any[]): Warp => ({
    protocol: 'warp:3.0.0',
    name: 'test-warp',
    title: { en: 'Test Warp' },
    description: null,
    actions: [
      {
        type: 'contract',
        label: { en: 'Test Action' },
        inputs,
        primary: true,
        gasLimit: 100000,
      },
    ],
  })

  it('returns empty array when action has no inputs', () => {
    const warp = createMockWarp([])
    const args = {}

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toEqual([])
  })

  it('converts string input from args', () => {
    const warp = createMockWarp([
      {
        name: 'name',
        type: 'string',
        position: 'payload:name',
        source: 'field',
      },
    ])
    const args = { name: 'test-value' }

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('test-value')
  })

  it('converts number input from args', () => {
    const warp = createMockWarp([
      {
        name: 'amount',
        type: 'uint256',
        position: 'payload:amount',
        source: 'field',
      },
    ])
    const args = { amount: 100 }

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('100')
  })

  it('converts boolean input from args', () => {
    const warp = createMockWarp([
      {
        name: 'active',
        type: 'bool',
        position: 'payload:active',
        source: 'field',
      },
    ])
    const args = { active: true }

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('true')
  })

  it('uses default value when arg is missing', () => {
    const warp = createMockWarp([
      {
        name: 'name',
        type: 'string',
        position: 'payload:name',
        source: 'field',
        default: 'default-name',
      },
    ])
    const args = {}

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('default-name')
  })

  it('uses default value for number type', () => {
    const warp = createMockWarp([
      {
        name: 'count',
        type: 'uint256',
        position: 'payload:count',
        source: 'field',
        default: 42,
      },
    ])
    const args = {}

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('42')
  })

  it('uses default value for boolean type', () => {
    const warp = createMockWarp([
      {
        name: 'enabled',
        type: 'bool',
        position: 'payload:enabled',
        source: 'field',
        default: true,
      },
    ])
    const args = {}

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('true')
  })

  it('defaults bool to false when value is null and no default', () => {
    const warp = createMockWarp([
      {
        name: 'flag',
        type: 'bool',
        position: 'payload:flag',
        source: 'field',
      },
    ])
    const args = { flag: null }

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('false')
  })

  it('uses null when value is null for non-bool types', () => {
    const warp = createMockWarp([
      {
        name: 'value',
        type: 'string',
        position: 'payload:value',
        source: 'field',
      },
    ])
    const args = { value: null }

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('')
  })

  it('uses input.as as key when provided', () => {
    const warp = createMockWarp([
      {
        name: 'inputName',
        as: 'aliasName',
        type: 'string',
        position: 'payload:inputName',
        source: 'field',
      },
    ])
    const args = { aliasName: 'test-value' }

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('test-value')
  })

  it('falls back to input.name when as is not provided', () => {
    const warp = createMockWarp([
      {
        name: 'inputName',
        type: 'string',
        position: 'payload:inputName',
        source: 'field',
      },
    ])
    const args = { inputName: 'test-value' }

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('test-value')
  })

  it('handles multiple inputs with mixed types', () => {
    const warp = createMockWarp([
      {
        name: 'name',
        type: 'string',
        position: 'payload:name',
        source: 'field',
      },
      {
        name: 'amount',
        type: 'uint256',
        position: 'payload:amount',
        source: 'field',
      },
      {
        name: 'active',
        type: 'bool',
        position: 'payload:active',
        source: 'field',
      },
    ])
    const args = {
      name: 'test',
      amount: 100,
      active: true,
    }

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(3)
    expect(result[0]).toBe('test')
    expect(result[1]).toBe('100')
    expect(result[2]).toBe('true')
  })

  it('handles inputs with some args provided and some using defaults', () => {
    const warp = createMockWarp([
      {
        name: 'name',
        type: 'string',
        position: 'payload:name',
        source: 'field',
        default: 'default-name',
      },
      {
        name: 'count',
        type: 'uint256',
        position: 'payload:count',
        source: 'field',
      },
    ])
    const args = { count: 50 }

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(2)
    expect(result[0]).toBe('default-name')
    expect(result[1]).toBe('50')
  })

  it('handles address type', () => {
    const warp = createMockWarp([
      {
        name: 'address',
        type: 'address',
        position: 'payload:address',
        source: 'field',
      },
    ])
    const args = { address: '0x1234567890123456789012345678901234567890' }

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('0x1234567890123456789012345678901234567890')
  })

  it('handles hex type', () => {
    const warp = createMockWarp([
      {
        name: 'data',
        type: 'hex',
        position: 'payload:data',
        source: 'field',
      },
    ])
    const args = { data: '0xabcdef' }

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('0xabcdef')
  })

  it('handles biguint type', () => {
    const warp = createMockWarp([
      {
        name: 'bigValue',
        type: 'biguint',
        position: 'payload:bigValue',
        source: 'field',
      },
    ])
    const args = { bigValue: '1000000000000000000' }

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('1000000000000000000')
  })

  it('handles undefined args gracefully', () => {
    const warp = createMockWarp([
      {
        name: 'value',
        type: 'string',
        position: 'payload:value',
        source: 'field',
        default: 'default',
      },
    ])
    const args = { value: undefined }

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('default')
  })

  it('handles empty args object', () => {
    const warp = createMockWarp([
      {
        name: 'value',
        type: 'string',
        position: 'payload:value',
        source: 'field',
        default: 'default-value',
      },
    ])
    const args = {}

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('default-value')
  })

  it('uses default when null is provided and default exists', () => {
    const warp = createMockWarp([
      {
        name: 'flag',
        type: 'bool',
        position: 'payload:flag',
        source: 'field',
        default: true,
      },
    ])
    const args = { flag: null }

    const result = convertMcpArgsToWarpInputs(warp, args)

    expect(result).toHaveLength(1)
    expect(result[0]).toBe('true')
  })
})
