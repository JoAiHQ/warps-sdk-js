/** @jest-environment jsdom */

import { createCacheStrategy } from './createCacheStrategy'

describe('browser cache strategy', () => {
  it('uses memory when requested', async () => {
    const cache = createCacheStrategy('devnet', { type: 'memory' })
    await cache.set('key', 'value')
    await expect(cache.get('key')).resolves.toBe('value')
    await expect(cache.keys()).resolves.toEqual(['key'])
    await cache.delete('key')
    await expect(cache.get('key')).resolves.toBeNull()
    await cache.set('key', 'value')
    await cache.clear()
    await expect(cache.get('key')).resolves.toBeNull()
  })

  it('uses local storage by default and when explicitly requested', async () => {
    const defaultCache = createCacheStrategy('devnet')
    const localStorageCache = createCacheStrategy('devnet', { type: 'localStorage' })
    await defaultCache.set('default', 'value')
    await localStorageCache.set('explicit', 'value')
    await expect(defaultCache.get('default')).resolves.toBe('value')
    await expect(localStorageCache.get('explicit')).resolves.toBe('value')
  })

  it('falls back to memory when local storage is unavailable', async () => {
    const localStorage = window.localStorage
    Object.defineProperty(window, 'localStorage', { configurable: true, value: undefined })
    try {
      const cache = createCacheStrategy('devnet')
      await cache.set('key', 'value')
      await expect(cache.get('key')).resolves.toBe('value')
    } finally {
      Object.defineProperty(window, 'localStorage', { configurable: true, value: localStorage })
    }
  })

  it('uses a supplied adapter', async () => {
    const adapter = {
      set: jest.fn(),
      get: jest.fn().mockResolvedValue('value'),
      delete: jest.fn(),
      keys: jest.fn().mockResolvedValue(['key']),
      clear: jest.fn(),
    }
    const cache = createCacheStrategy('devnet', { adapter })
    await cache.set('key', 'value')
    await expect(cache.get('key')).resolves.toBe('value')
    await expect(cache.keys()).resolves.toEqual(['key'])
    await cache.delete('key')
    await cache.clear()
    expect(adapter.set).toHaveBeenCalledWith('key', 'value')
    expect(adapter.delete).toHaveBeenCalledWith('key')
    expect(adapter.clear).toHaveBeenCalledTimes(1)
  })

  it.each(['static', 'filesystem'] as const)(
    'rejects the Node-only %s strategy',
    (type) => {
      expect(() => createCacheStrategy('devnet', { type })).toThrow(
        `"${type}" cache is only available in Node.js`,
      )
    },
  )
})
