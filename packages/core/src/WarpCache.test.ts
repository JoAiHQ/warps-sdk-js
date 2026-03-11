import { existsSync, mkdirSync, readdirSync, rmdirSync, unlinkSync } from 'fs'
import { join, resolve } from 'path'
import { WarpCacheType } from './types/cache'
import { WarpCache } from './WarpCache'

describe('WarpCache', () => {
  let cacheTypes: string[] = ['memory']
  if (typeof window !== 'undefined' && window.localStorage) {
    cacheTypes.push('localStorage')
  }
  // File system strategies only work in Node.js
  if (typeof require !== 'undefined') {
    cacheTypes.push('static', 'filesystem')
  }

  cacheTypes.forEach((type) => {
    describe(`${type} cache`, () => {
      let cache: any
      let testDir: string | undefined

      beforeEach(async () => {
        if (type === 'filesystem') {
          const testCacheRoot = resolve(process.cwd(), '.test-cache')
          if (!existsSync(testCacheRoot)) {
            mkdirSync(testCacheRoot, { recursive: true })
          }
          testDir = join(testCacheRoot, 'warp-cache-' + Date.now())
          cache = new WarpCache('devnet', { type: type as WarpCacheType, path: testDir })
        } else if (type === 'static') {
          const testCacheRoot = resolve(process.cwd(), '.test-cache')
          if (!existsSync(testCacheRoot)) {
            mkdirSync(testCacheRoot, { recursive: true })
          }
          testDir = join(testCacheRoot, 'warp-manifest-' + Date.now() + '.json')
          cache = new WarpCache('devnet', { type: type as WarpCacheType, path: testDir })
        } else {
          cache = new WarpCache('devnet', { type: type as WarpCacheType })
        }
        await cache.clear()
      })

      afterEach(() => {
        if (testDir) {
          try {
            if (type === 'filesystem' && existsSync(testDir)) {
              const files = readdirSync(testDir)
              files.forEach((file) => unlinkSync(join(testDir!, file)))
              rmdirSync(testDir)
            } else if (type === 'static' && existsSync(testDir)) {
              unlinkSync(testDir)
            }
          } catch {
            // Ignore cleanup errors
          }
        }
      })

      it('should set and get a value', async () => {
        await cache.set('foo', 'bar', 10)
        await expect(cache.get('foo')).resolves.toBe('bar')
      })

      it('should delete a value', async () => {
        await cache.set('foo', 'bar', 10)
        await cache.delete('foo')
        await expect(cache.get('foo')).resolves.toBeNull()
      })

      it('should not affect other keys when deleting', async () => {
        await cache.set('foo', 'bar', 10)
        await cache.set('baz', 'qux', 10)
        await cache.delete('foo')
        await expect(cache.get('foo')).resolves.toBeNull()
        await expect(cache.get('baz')).resolves.toBe('qux')
      })

      it('should handle BigInt values', async () => {
        const bigValue = BigInt('12345678901234567890')
        await cache.set('bigint', bigValue, 10)
        const retrieved = await cache.get('bigint')
        expect(retrieved).toBe(bigValue)
      })
    })
  })
})
