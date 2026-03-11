export interface CacheStrategy {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>
  delete(key: string): Promise<void>
  keys(pattern?: string): Promise<string[]>
  clear(): Promise<void>
}
