import { WarpPlatformName } from '../constants'
import { isPlatformValue, resolvePlatformValue } from './platform'

describe('isPlatformValue', () => {
  it('returns false for plain string', () => {
    expect(isPlatformValue('/echo hello')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isPlatformValue(null as any)).toBe(false)
  })

  it('returns false for array', () => {
    expect(isPlatformValue(['macos', 'linux'] as any)).toBe(false)
  })

  it('returns false for object without platform keys', () => {
    expect(isPlatformValue({ en: 'hello', de: 'hallo' })).toBe(false)
  })

  it('returns true for object with macos key', () => {
    expect(isPlatformValue({ macos: '/open -a "Safari"', linux: '/xdg-open safari' })).toBe(true)
  })

  it('returns true for object with single platform key', () => {
    expect(isPlatformValue({ windows: '/start notepad' })).toBe(true)
  })
})

describe('resolvePlatformValue', () => {
  it('returns plain string as-is regardless of platform', () => {
    expect(resolvePlatformValue('/echo hello', WarpPlatformName.Macos)).toBe('/echo hello')
  })

  it('returns plain string as-is without platform', () => {
    expect(resolvePlatformValue('/echo hello')).toBe('/echo hello')
  })

  it('resolves macos value', () => {
    const value = { macos: '/open -a "{{APP}}"', linux: '/xdg-open {{APP}}', windows: '/start "{{APP}}"' }
    expect(resolvePlatformValue(value, WarpPlatformName.Macos)).toBe('/open -a "{{APP}}"')
  })

  it('resolves linux value', () => {
    const value = { macos: '/open -a "{{APP}}"', linux: '/xdg-open {{APP}}', windows: '/start "{{APP}}"' }
    expect(resolvePlatformValue(value, WarpPlatformName.Linux)).toBe('/xdg-open {{APP}}')
  })

  it('resolves windows value', () => {
    const value = { macos: '/open -a "{{APP}}"', linux: '/xdg-open {{APP}}', windows: '/start "{{APP}}"' }
    expect(resolvePlatformValue(value, WarpPlatformName.Windows)).toBe('/start "{{APP}}"')
  })

  it('throws when platform-keyed value used without platform in config', () => {
    const value = { macos: '/open -a "Safari"', linux: '/xdg-open safari' }
    expect(() => resolvePlatformValue(value)).toThrow('Platform-specific value requires platform in client config')
  })

  it('throws when platform is not supported by the warp', () => {
    const value = { macos: '/open -a "Safari"' }
    expect(() => resolvePlatformValue(value, WarpPlatformName.Windows)).toThrow('Warp does not support platform: windows')
  })
})
