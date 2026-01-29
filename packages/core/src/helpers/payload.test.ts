import type { ResolvedInput } from '../types'
import { WarpSerializer } from '../WarpSerializer'
import { buildMappedOutput, buildNestedPayload, mergeNestedPayload, toInputPayloadValue } from './payload'

describe('buildNestedPayload', () => {
  it('should handle flat payload structure (no position prefix)', () => {
    const result = buildNestedPayload('positionvalue', 'email', 'test@example.com')
    expect(result).toEqual({ email: 'test@example.com' })
  })

  it('should build nested payload structure with one level', () => {
    const result = buildNestedPayload('payload:data.customer', 'email', 'test@example.com')
    expect(result).toEqual({
      data: {
        customer: {
          email: 'test@example.com',
        },
      },
    })
  })

  it('should build deeply nested payload structure', () => {
    const result = buildNestedPayload('payload:request.data.attributes.customer', 'email', 'test@example.com')
    expect(result).toEqual({
      request: {
        data: {
          attributes: {
            customer: {
              email: 'test@example.com',
            },
          },
        },
      },
    })
  })

  it('should handle multiple levels correctly', () => {
    const result = buildNestedPayload('payload:a.b.c.d.e', 'value', 'test')
    expect(result).toEqual({
      a: {
        b: {
          c: {
            d: {
              e: {
                value: 'test',
              },
            },
          },
        },
      },
    })
  })
})

describe('mergeNestedPayload', () => {
  it('should merge basic flat objects', () => {
    const target = { a: 1 }
    const source = { b: 2 }
    const originalTarget = { ...target }

    const result = mergeNestedPayload(target, source)

    expect(result).toEqual({ a: 1, b: 2 })
    expect(target).toEqual(originalTarget) // Original should not be mutated
    expect(result).not.toBe(target) // Should return new object
  })

  it('should merge nested objects recursively and return result', () => {
    const target = { data: { customer: { name: 'John' } } }
    const source = { data: { customer: { email: 'john@example.com' } } }
    const originalTarget = JSON.parse(JSON.stringify(target))

    const result = mergeNestedPayload(target, source)

    expect(result).toEqual({
      data: {
        customer: {
          name: 'John',
          email: 'john@example.com',
        },
      },
    })
    expect(target).toEqual(originalTarget) // Original should not be mutated
  })

  it('should handle conflicting keys (source should override)', () => {
    const target = { data: { customer: { name: 'John' } } }
    const source = { data: { customer: { name: 'Jane' } } }

    const result = mergeNestedPayload(target, source)

    expect(result.data.customer.name).toBe('Jane')
  })

  it('should handle multiple nested merges', () => {
    let target: any = {}
    const source1 = { data: { customer: { name: 'John' } } }
    const source2 = { data: { customer: { email: 'john@example.com' } } }
    const source3 = { data: { transaction: { amount: '100.00' } } }

    target = mergeNestedPayload(target, source1)
    target = mergeNestedPayload(target, source2)
    target = mergeNestedPayload(target, source3)

    expect(target).toEqual({
      data: {
        customer: {
          name: 'John',
          email: 'john@example.com',
        },
        transaction: {
          amount: '100.00',
        },
      },
    })
  })

  it('should handle null/undefined inputs', () => {
    expect(mergeNestedPayload(null, { a: 1 })).toEqual({ a: 1 })
    expect(mergeNestedPayload({ a: 1 }, null)).toEqual({ a: 1 })
    expect(mergeNestedPayload(undefined, { a: 1 })).toEqual({ a: 1 })
    expect(mergeNestedPayload({ a: 1 }, undefined)).toEqual({ a: 1 })
  })
})

describe('payload integration tests', () => {
  it('should work together to build complex nested structures', () => {
    // Simulate building a payload from multiple inputs like in WarpExecutor
    let payload: any = {}

    // First input: customer info
    const customerPayload = buildNestedPayload('payload:data.customer', 'name', 'John Doe')
    payload = mergeNestedPayload(payload, customerPayload)

    // Second input: customer email
    const emailPayload = buildNestedPayload('payload:data.customer', 'email', 'john@example.com')
    payload = mergeNestedPayload(payload, emailPayload)

    // Third input: transaction amount
    const transactionPayload = buildNestedPayload('payload:data.transaction', 'amount', '100.00')
    payload = mergeNestedPayload(payload, transactionPayload)

    expect(payload).toEqual({
      data: {
        customer: {
          name: 'John Doe',
          email: 'john@example.com',
        },
        transaction: {
          amount: '100.00',
        },
      },
    })
  })

  it('should handle mixed flat and nested structures', () => {
    let payload: any = { reference: 'REF123' }

    // Nested structures
    const nested1 = buildNestedPayload('payload:data.customer', 'email', 'test@example.com')
    const nested2 = buildNestedPayload('payload:data.metadata', 'version', '1.0')

    payload = mergeNestedPayload(payload, nested1)
    payload = mergeNestedPayload(payload, nested2)

    expect(payload).toEqual({
      reference: 'REF123',
      data: {
        customer: {
          email: 'test@example.com',
        },
        metadata: {
          version: '1.0',
        },
      },
    })
  })
})

describe('toInputPayloadValue', () => {
  const serializer = new WarpSerializer()

  it('should convert string input', () => {
    const input: ResolvedInput = { input: { name: 'test', type: 'string', source: 'field' }, value: 'string:hello' }
    expect(toInputPayloadValue(input, serializer)).toBe('hello')
  })

  it('should convert biguint to string', () => {
    const input: ResolvedInput = { input: { name: 'amount', type: 'biguint', source: 'field' }, value: 'biguint:1000000000000000000' }
    expect(toInputPayloadValue(input, serializer)).toBe('1000000000000000000')
  })

  it('should convert asset to object with identifier and amount', () => {
    const input: ResolvedInput = { input: { name: 'token', type: 'asset', source: 'field' }, value: 'asset:EGLD|1000000000000000000' }
    expect(toInputPayloadValue(input, serializer)).toEqual({
      identifier: 'EGLD',
      amount: '1000000000000000000',
    })
  })

  it('should return null for null value', () => {
    const input: ResolvedInput = { input: { name: 'test', type: 'string', source: 'field' }, value: null }
    expect(toInputPayloadValue(input, serializer)).toBeNull()
  })
})

describe('buildMappedOutput', () => {
  const serializer = new WarpSerializer()

  it('should return empty object for empty inputs', () => {
    expect(buildMappedOutput([], serializer)).toEqual({})
  })

  it('should map inputs by name', () => {
    const inputs: ResolvedInput[] = [
      { input: { name: 'amount', type: 'string', source: 'field' }, value: 'string:100' },
      { input: { name: 'recipient', type: 'address', source: 'field' }, value: 'address:0x123' },
    ]
    expect(buildMappedOutput(inputs, serializer)).toEqual({
      amount: '100',
      recipient: '0x123',
    })
  })

  it('should use "as" alias when provided', () => {
    const inputs: ResolvedInput[] = [{ input: { name: 'amount', as: 'AMOUNT', type: 'string', source: 'field' }, value: 'string:500' }]
    expect(buildMappedOutput(inputs, serializer)).toEqual({
      AMOUNT: '500',
    })
  })

  it('should handle nested payload structures', () => {
    const inputs: ResolvedInput[] = [
      {
        input: { name: 'email', type: 'string', source: 'field', position: 'payload:data.customer' },
        value: 'string:test@example.com',
      },
      {
        input: { name: 'name', type: 'string', source: 'field', position: 'payload:data.customer' },
        value: 'string:John',
      },
    ]
    expect(buildMappedOutput(inputs, serializer)).toEqual({
      data: {
        customer: {
          email: 'test@example.com',
          name: 'John',
        },
      },
    })
  })

  it('should handle mixed flat and nested structures', () => {
    const inputs: ResolvedInput[] = [
      { input: { name: 'reference', type: 'string', source: 'field' }, value: 'string:REF123' },
      {
        input: { name: 'email', type: 'string', source: 'field', position: 'payload:data.customer' },
        value: 'string:test@example.com',
      },
    ]
    expect(buildMappedOutput(inputs, serializer)).toEqual({
      reference: 'REF123',
      data: {
        customer: {
          email: 'test@example.com',
        },
      },
    })
  })
})
