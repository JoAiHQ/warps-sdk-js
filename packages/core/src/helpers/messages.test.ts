import { WarpChainName } from '../constants'
import { Warp, WarpClientConfig } from '../types'
import { applyOutputToMessages } from './messages'

describe('applyOutputToMessages', () => {
  const createMockWarp = (messages?: Record<string, any>): Warp => ({
    protocol: 'warp:1.0.0',
    chain: WarpChainName.Ethereum,
    name: 'test-warp',
    title: 'Test Warp',
    description: 'Test description',
    actions: [],
    messages,
  })

  it('should return empty object when messages are undefined', () => {
    const warp = createMockWarp()
    const output = { amount: '100' }
    const result = applyOutputToMessages(warp, output)
    expect(result).toEqual({})
  })

  it('should return empty object when messages are empty', () => {
    const warp = createMockWarp({})
    const output = { amount: '100' }
    const result = applyOutputToMessages(warp, output)
    expect(result).toEqual({})
  })

  it('should apply placeholders to string messages', () => {
    const warp = createMockWarp({
      success: 'Transaction completed with amount {{amount}}',
      error: 'Error: {{error}}',
    })
    const output = { amount: '100', error: 'Network error' }
    const result = applyOutputToMessages(warp, output)
    expect(result).toEqual({
      success: 'Transaction completed with amount 100',
      error: 'Error: Network error',
    })
  })

  it('should resolve localized messages with default locale (en)', () => {
    const warp = createMockWarp({
      success: {
        en: 'Transaction completed with {{amount}}',
        es: 'Transacción completada con {{amount}}',
        fr: 'Transaction terminée avec {{amount}}',
      },
    })
    const output = { amount: '100' }
    const config: WarpClientConfig = { env: 'mainnet' }
    const result = applyOutputToMessages(warp, output, config)
    expect(result).toEqual({
      success: 'Transaction completed with 100',
    })
  })

  it('should resolve localized messages with Spanish locale', () => {
    const warp = createMockWarp({
      success: {
        en: 'Transaction completed with {{amount}}',
        es: 'Transacción completada con {{amount}}',
        fr: 'Transaction terminée avec {{amount}}',
      },
    })
    const output = { amount: '100' }
    const config: WarpClientConfig = { env: 'mainnet', preferences: { locale: 'es' } }
    const result = applyOutputToMessages(warp, output, config)
    expect(result).toEqual({
      success: 'Transacción completada con 100',
    })
  })

  it('should resolve localized messages with French locale', () => {
    const warp = createMockWarp({
      success: {
        en: 'Transaction completed with {{amount}}',
        es: 'Transacción completada con {{amount}}',
        fr: 'Transaction terminée avec {{amount}}',
      },
    })
    const output = { amount: '100' }
    const config: WarpClientConfig = { env: 'mainnet', preferences: { locale: 'fr' } }
    const result = applyOutputToMessages(warp, output, config)
    expect(result).toEqual({
      success: 'Transaction terminée avec 100',
    })
  })

  it('should fallback to English when requested locale is not available', () => {
    const warp = createMockWarp({
      success: {
        en: 'Transaction completed with {{amount}}',
        es: 'Transacción completada con {{amount}}',
      },
    })
    const output = { amount: '100' }
    const config: WarpClientConfig = { env: 'mainnet', preferences: { locale: 'fr' } }
    const result = applyOutputToMessages(warp, output, config)
    expect(result).toEqual({
      success: 'Transaction completed with 100',
    })
  })

  it('should handle mixed string and localized messages', () => {
    const warp = createMockWarp({
      success: 'Simple message with {{amount}}',
      error: {
        en: 'Error: {{error}}',
        es: 'Error: {{error}}',
      },
    })
    const output = { amount: '100', error: 'Network error' }
    const config: WarpClientConfig = { env: 'mainnet', preferences: { locale: 'es' } }
    const result = applyOutputToMessages(warp, output, config)
    expect(result).toEqual({
      success: 'Simple message with 100',
      error: 'Error: Network error',
    })
  })

  it('should handle missing placeholder values', () => {
    const warp = createMockWarp({
      message: 'Hello {{name}}, you have {{count}} items',
    })
    const output = { name: 'John' }
    const result = applyOutputToMessages(warp, output)
    expect(result).toEqual({
      message: 'Hello John, you have  items',
    })
  })

  it('should work without config parameter', () => {
    const warp = createMockWarp({
      success: 'Transaction completed with {{amount}}',
    })
    const output = { amount: '100' }
    const result = applyOutputToMessages(warp, output)
    expect(result).toEqual({
      success: 'Transaction completed with 100',
    })
  })
})
