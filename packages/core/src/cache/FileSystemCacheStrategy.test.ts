import { existsSync, mkdirSync, readdirSync, rmdirSync, unlinkSync } from 'fs'
import { join, resolve } from 'path'
import { FileSystemCacheStrategy } from './FileSystemCacheStrategy'

describe('FileSystemCacheStrategy', () => {
  let cacheDir: string
  let strategy: FileSystemCacheStrategy

  beforeEach(() => {
    const testCacheRoot = resolve(process.cwd(), '.test-cache')
    if (!existsSync(testCacheRoot)) {
      mkdirSync(testCacheRoot, { recursive: true })
    }
    cacheDir = join(testCacheRoot, 'filesystem-cache-' + Date.now())
    strategy = new FileSystemCacheStrategy('devnet', { path: cacheDir })
  })

  afterEach(() => {
    try {
      if (existsSync(cacheDir)) {
        const files = readdirSync(cacheDir)
        files.forEach((file) => unlinkSync(join(cacheDir, file)))
        rmdirSync(cacheDir)
      }
    } catch {
      // Ignore cleanup errors
    }
  })

  it('should create cache directory if it does not exist', () => {
    expect(existsSync(cacheDir)).toBe(true)
  })

  it('should set and get a value', async () => {
    await strategy.set('foo', 'bar', 10)
    await expect(strategy.get('foo')).resolves.toBe('bar')
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

  it('should sanitize keys to be filesystem-safe', async () => {
    await strategy.set('key/with/slashes', 'value1', 10)
    await strategy.set('key:with:colons', 'value2', 10)
    await strategy.set('key with spaces', 'value3', 10)
    await expect(strategy.get('key/with/slashes')).resolves.toBe('value1')
    await expect(strategy.get('key:with:colons')).resolves.toBe('value2')
    await expect(strategy.get('key with spaces')).resolves.toBe('value3')
  })

  it('should use default cache directory when not provided', async () => {
    const defaultStrategy = new FileSystemCacheStrategy('devnet')
    expect(defaultStrategy).toBeDefined()
    await defaultStrategy.clear()
  })

  it('should handle errors gracefully when reading invalid files', async () => {
    // Create an invalid JSON file
    const invalidPath = join(cacheDir, 'invalid.json')
    require('fs').writeFileSync(invalidPath, 'invalid json')
    // Should not throw, just return null
    await expect(strategy.get('invalid')).resolves.toBeNull()
  })
})
