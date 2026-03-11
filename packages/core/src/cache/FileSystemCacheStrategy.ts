import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { WarpChainEnv } from '../types'
import { ClientCacheConfig } from '../types/cache'
import { CacheStrategy } from './CacheStrategy'
import { valueReviver, valueReplacer } from './helpers'

type CacheEntry<T> = {
  value: T
  expiresAt: number | null
}

export class FileSystemCacheStrategy implements CacheStrategy {
  private cacheDir: string

  constructor(env: WarpChainEnv, config?: ClientCacheConfig) {
    const cacheDir = config?.path
    this.cacheDir = cacheDir ? resolve(cacheDir) : resolve(process.cwd(), '.warp-cache')
    this.ensureCacheDir()
  }

  private ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true })
    }
  }

  private getFilePath(key: string): string {
    // Sanitize key to be filesystem-safe
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_')
    return join(this.cacheDir, `${safeKey}.json`)
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const filePath = this.getFilePath(key)
      if (!existsSync(filePath)) return null

      const data = readFileSync(filePath, 'utf-8')
      const entry: CacheEntry<T> = JSON.parse(data, valueReviver)

      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        unlinkSync(filePath)
        return null
      }

      return entry.value
    } catch {
      return null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    }
    const filePath = this.getFilePath(key)
    writeFileSync(filePath, JSON.stringify(entry, valueReplacer), 'utf-8')
  }

  async delete(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key)
      if (existsSync(filePath)) {
        unlinkSync(filePath)
      }
    } catch {
      // Ignore errors when deleting
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      const files = readdirSync(this.cacheDir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.slice(0, -5))
      if (!pattern) return files

      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      return files.filter((file) => regex.test(file))
    } catch {
      return []
    }
  }

  async clear(): Promise<void> {
    try {
      const files = readdirSync(this.cacheDir)
      files.forEach((file: string) => {
        if (file.endsWith('.json')) {
          unlinkSync(join(this.cacheDir, file))
        }
      })
    } catch {
      // Ignore errors when clearing
    }
  }
}
