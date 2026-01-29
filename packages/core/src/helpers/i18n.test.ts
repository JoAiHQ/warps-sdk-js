import { WarpClientConfig } from '../types/config'
import { WarpI18nText, WarpText } from '../types/i18n'
import { createWarpI18nText, isWarpI18nText, resolveWarpText } from './i18n'

describe('i18n helpers', () => {
  describe('resolveWarpText', () => {
    it('should return string text as-is', () => {
      const text: WarpText = 'Simple text'
      expect(resolveWarpText(text)).toBe('Simple text')
      expect(resolveWarpText(text)).toBe('Simple text')
    })

    it('should resolve i18n text with requested language', () => {
      const text: WarpI18nText = {
        en: 'Hello',
        es: 'Hola',
        fr: 'Bonjour',
      }
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'es' } })).toBe('Hola')
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'fr' } })).toBe('Bonjour')
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'en' } })).toBe('Hello')
    })

    it('should fallback to English when requested language is not available', () => {
      const text: WarpI18nText = {
        en: 'Hello',
        es: 'Hola',
      }
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'fr' } })).toBe('Hello')
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'de' } })).toBe('Hello')
    })

    it('should fallback to any available language when English is not available', () => {
      const text: WarpI18nText = {
        es: 'Hola',
        fr: 'Bonjour',
      }
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'en' } })).toBe('Hola')
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'de' } })).toBe('Hola')
    })

    it('should handle German-only Warp', () => {
      const text: WarpI18nText = {
        de: 'Hallo Welt',
      }
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'de' } })).toBe('Hallo Welt')
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'en' } })).toBe('Hallo Welt') // Falls back to available language
    })

    it('should handle Spanish-only Warp', () => {
      const text: WarpI18nText = {
        es: 'Hola Mundo',
      }
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'es' } })).toBe('Hola Mundo')
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'en' } })).toBe('Hola Mundo') // Falls back to available language
    })

    it('should return empty string for invalid text', () => {
      expect(resolveWarpText(null as any)).toBe('')
      expect(resolveWarpText(undefined as any)).toBe('')
      expect(resolveWarpText({} as any)).toBe('')
    })

    it('should default to English when no language is specified', () => {
      const text: WarpI18nText = {
        en: 'Hello',
        es: 'Hola',
      }
      expect(resolveWarpText(text)).toBe('Hello')
    })

    it('should handle empty i18n objects', () => {
      const text: WarpI18nText = {} as any
      expect(resolveWarpText(text)).toBe('')
    })

    it('should handle i18n objects with only non-English languages', () => {
      const text: WarpI18nText = {
        es: 'Hola',
        fr: 'Bonjour',
      } as any
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'en' } })).toBe('Hola')
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'de' } })).toBe('Hola')
    })
  })

  describe('isWarpI18nText', () => {
    it('should identify i18n text objects', () => {
      const i18nText: WarpI18nText = { en: 'Hello', es: 'Hola' }
      const stringText: WarpText = 'Hello'

      expect(isWarpI18nText(i18nText)).toBe(true)
      expect(isWarpI18nText(stringText)).toBe(false)
    })

    it('should return false for invalid objects', () => {
      expect(isWarpI18nText(null as any)).toBe(false)
      expect(isWarpI18nText(undefined as any)).toBe(false)
      expect(isWarpI18nText({} as any)).toBe(false)
    })

    it('should return true for any i18n object with translations', () => {
      expect(isWarpI18nText({ es: 'Hola' })).toBe(true) // Spanish only
      expect(isWarpI18nText({ de: 'Hallo' })).toBe(true) // German only
      expect(isWarpI18nText({ en: 'Hello', es: 'Hola' })).toBe(true) // Multiple languages
    })

    it('should return false for non-object types', () => {
      expect(isWarpI18nText('string' as any)).toBe(false)
      expect(isWarpI18nText(123 as any)).toBe(false)
      expect(isWarpI18nText(true as any)).toBe(false)
      expect(isWarpI18nText([] as any)).toBe(false)
    })
  })

  describe('createWarpI18nText', () => {
    it('should create i18n text from translations object', () => {
      const result = createWarpI18nText({ es: 'Hola', fr: 'Bonjour' })

      expect(result).toEqual({
        es: 'Hola',
        fr: 'Bonjour',
      })
    })

    it('should create German-only i18n text', () => {
      const result = createWarpI18nText({ de: 'Hallo Welt' })

      expect(result).toEqual({
        de: 'Hallo Welt',
      })
    })

    it('should handle empty translations', () => {
      const result = createWarpI18nText({})

      expect(result).toEqual({})
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in translations', () => {
      const text: WarpI18nText = {
        en: 'Hello',
        es: '¡Hola!',
        fr: 'Bonjour!',
        de: 'Hallo!',
      }
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'es' } })).toBe('¡Hola!')
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'fr' } })).toBe('Bonjour!')
    })

    it('should handle empty strings in translations', () => {
      const text: WarpI18nText = {
        en: 'Hello',
        es: '',
        fr: 'Bonjour',
      }
      // Empty string is a valid translation, so it should be returned
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'es' } })).toBe('')
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'fr' } })).toBe('Bonjour')
    })

    it('should handle very long translations', () => {
      const longText = 'A'.repeat(1000)
      const text: WarpI18nText = {
        en: 'Hello',
        es: longText,
      }
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'es' } })).toBe(longText)
    })

    it('should handle unicode characters', () => {
      const text: WarpI18nText = {
        en: 'Hello',
        zh: '你好',
        ja: 'こんにちは',
        ru: 'Привет',
      }
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'zh' } })).toBe('你好')
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'ja' } })).toBe('こんにちは')
      expect(resolveWarpText(text, { env: 'mainnet', preferences: { locale: 'ru' } })).toBe('Привет')
    })
  })

  describe('config-based language resolution', () => {
    it('should use language from config when no language is provided', () => {
      const text: WarpI18nText = {
        en: 'Hello',
        es: 'Hola',
        fr: 'Bonjour',
      }
      const config: WarpClientConfig = {
        env: 'mainnet',
        preferences: {
          locale: 'es',
        },
      }
      expect(resolveWarpText(text, config)).toBe('Hola')
    })

    it('should prioritize provided language over config language', () => {
      const text: WarpI18nText = {
        en: 'Hello',
        es: 'Hola',
        fr: 'Bonjour',
      }
      const config: WarpClientConfig = {
        env: 'mainnet',
        preferences: {
          locale: 'es',
        },
      }
      expect(resolveWarpText(text, { ...config, preferences: { locale: 'fr' } })).toBe('Bonjour')
    })

    it('should fallback to English when config language is not available', () => {
      const text: WarpI18nText = {
        en: 'Hello',
        es: 'Hola',
      }
      const config: WarpClientConfig = {
        env: 'mainnet',
        preferences: {
          locale: 'fr',
        },
      }
      expect(resolveWarpText(text, config)).toBe('Hello')
    })

    it('should default to English when no config or language is provided', () => {
      const text: WarpI18nText = {
        en: 'Hello',
        es: 'Hola',
      }
      expect(resolveWarpText(text)).toBe('Hello')
    })

    it('should work with config without preferences', () => {
      const text: WarpI18nText = {
        en: 'Hello',
        es: 'Hola',
      }
      const config: WarpClientConfig = {
        env: 'mainnet',
      }
      expect(resolveWarpText(text, config)).toBe('Hello')
    })
  })
})
