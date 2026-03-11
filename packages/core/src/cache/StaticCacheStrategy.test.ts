import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { StaticCacheStrategy } from './StaticCacheStrategy'

describe('StaticCacheStrategy', () => {
  let manifestPath: string
  let strategy: StaticCacheStrategy

  beforeEach(async () => {
    const testCacheRoot = resolve(process.cwd(), '.test-cache')
    if (!existsSync(testCacheRoot)) {
      mkdirSync(testCacheRoot, { recursive: true })
    }
    manifestPath = join(testCacheRoot, 'test-manifest-' + Date.now() + '.json')
    strategy = new StaticCacheStrategy('devnet', { path: manifestPath })
    await strategy.clear()
  })

  afterEach(() => {
    try {
      if (existsSync(manifestPath)) {
        unlinkSync(manifestPath)
      }
    } catch {
      // Ignore cleanup errors
    }
  })

  it('should set and get a value in memory', async () => {
    await strategy.set('foo', 'bar', 10)
    await expect(strategy.get('foo')).resolves.toBe('bar')
  })

  it('should load values from existing manifest file', async () => {
    const testData = { foo: { value: 'bar', expiresAt: Date.now() + 10000 } }
    writeFileSync(manifestPath, JSON.stringify(testData), 'utf-8')
    const newStrategy = new StaticCacheStrategy('devnet', { path: manifestPath })
    await expect(newStrategy.get('foo')).resolves.toBe('bar')
  })

  it('should return null for non-existent keys', async () => {
    await expect(strategy.get('nonexistent')).resolves.toBeNull()
  })

  it('should delete a value', async () => {
    await strategy.set('foo', 'bar', 10)
    await strategy.delete('foo')
    await expect(strategy.get('foo')).resolves.toBeNull()
  })

  it('should not affect other keys when deleting', async () => {
    await strategy.set('foo', 'bar', 10)
    await strategy.set('baz', 'qux', 10)
    await strategy.delete('foo')
    await expect(strategy.get('foo')).resolves.toBeNull()
    await expect(strategy.get('baz')).resolves.toBe('qux')
  })

  it('should clear all values', async () => {
    await strategy.set('foo', 'bar', 10)
    await strategy.set('baz', 'qux', 10)
    await strategy.clear()
    await expect(strategy.get('foo')).resolves.toBeNull()
    await expect(strategy.get('baz')).resolves.toBeNull()
  })

  it('should expire values after TTL', async () => {
    await strategy.set('foo', 'bar', 1)
    await expect(strategy.get('foo')).resolves.toBe('bar')
    await new Promise((resolve) => setTimeout(resolve, 1100))
    await expect(strategy.get('foo')).resolves.toBeNull()
  })

  it('should handle BigInt values', async () => {
    const bigValue = BigInt('12345678901234567890')
    await strategy.set('bigint', bigValue, 10)
    const retrieved = await strategy.get<bigint>('bigint')
    expect(retrieved).toBe(bigValue)
  })

  it('should handle complex objects', async () => {
    const obj = {
      string: 'test',
      number: 42,
      bool: true,
      nested: { value: 'nested' },
      array: [1, 2, 3],
    }
    await strategy.set('complex', obj, 10)
    const retrieved = await strategy.get<typeof obj>('complex')
    expect(retrieved).toEqual(obj)
  })

  it('should use default manifest path when not provided', async () => {
    const defaultStrategy = new StaticCacheStrategy('devnet')
    expect(defaultStrategy).toBeDefined()
    await defaultStrategy.clear()
  })

  it('should handle missing manifest file gracefully', async () => {
    const testCacheRoot = resolve(process.cwd(), '.test-cache')
    const nonExistentBasePath = join(testCacheRoot, 'non-existent-manifest.json')
    const newStrategy = new StaticCacheStrategy('devnet', { path: nonExistentBasePath })
    await expect(newStrategy.get('foo')).resolves.toBeNull()
  })
})
