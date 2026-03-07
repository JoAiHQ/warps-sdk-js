import { WarpPlatformName, WarpPlatforms } from '../constants'
import { WarpPlatformValue } from '../types/warp'

export const isPlatformValue = <T>(value: WarpPlatformValue<T>): value is Partial<Record<WarpPlatformName, T>> => {
  if (value === null || value === undefined) return false
  if (typeof value !== 'object' || Array.isArray(value)) return false
  return WarpPlatforms.some((p) => p in (value as Record<string, unknown>))
}

export const resolvePlatformValue = <T>(value: WarpPlatformValue<T>, platform?: WarpPlatformName): T => {
  if (!isPlatformValue(value)) return value as T
  if (!platform) throw new Error('Platform-specific value requires platform in client config')
  const resolved = (value as Record<string, T>)[platform]
  if (resolved === undefined) throw new Error(`Warp does not support platform: ${platform}`)
  return resolved
}
