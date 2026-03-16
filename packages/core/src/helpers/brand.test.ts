import { getWarpBrandLogoUrl, getWarpChainAssetLogoUrl, getWarpChainInfoLogoUrl } from './brand'
import { WarpBrand } from '../types/brand'
import { WarpChainAsset } from '../types/chain'
import { WarpChainInfo } from '../types/warp'
import { WarpClientConfig } from '../types/config'

const darkConfig: WarpClientConfig = { preferences: { theme: 'dark' } } as WarpClientConfig
const lightConfig: WarpClientConfig = { preferences: { theme: 'light' } } as WarpClientConfig

describe('getWarpBrandLogoUrl', () => {
  it('returns string logo as-is', () => {
    const brand = { logo: 'https://example.com/logo.png' } as WarpBrand
    expect(getWarpBrandLogoUrl(brand)).toBe('https://example.com/logo.png')
    expect(getWarpBrandLogoUrl(brand, darkConfig)).toBe('https://example.com/logo.png')
  })

  it('returns themed logo for matching theme', () => {
    const brand = { logo: { light: 'https://example.com/light.png', dark: 'https://example.com/dark.png' } } as WarpBrand
    expect(getWarpBrandLogoUrl(brand, darkConfig)).toBe('https://example.com/dark.png')
    expect(getWarpBrandLogoUrl(brand, lightConfig)).toBe('https://example.com/light.png')
  })

  it('defaults to light theme when no config', () => {
    const brand = { logo: { light: 'https://example.com/light.png', dark: 'https://example.com/dark.png' } } as WarpBrand
    expect(getWarpBrandLogoUrl(brand)).toBe('https://example.com/light.png')
  })

  it('falls back to first available URL when theme key is missing', () => {
    const brand = { logo: { light: 'https://example.com/light.png' } } as unknown as WarpBrand
    expect(getWarpBrandLogoUrl(brand, darkConfig)).toBe('https://example.com/light.png')
  })

  it('falls back to default key before arbitrary values', () => {
    const brand = { logo: { default: 'https://example.com/default.png', other: 'https://example.com/other.png' } } as unknown as WarpBrand
    expect(getWarpBrandLogoUrl(brand, darkConfig)).toBe('https://example.com/default.png')
    expect(getWarpBrandLogoUrl(brand, lightConfig)).toBe('https://example.com/default.png')
  })

  it('prefers theme match over default', () => {
    const brand = { logo: { default: 'https://example.com/default.png', dark: 'https://example.com/dark.png' } } as unknown as WarpBrand
    expect(getWarpBrandLogoUrl(brand, darkConfig)).toBe('https://example.com/dark.png')
    expect(getWarpBrandLogoUrl(brand, lightConfig)).toBe('https://example.com/default.png')
  })
})

describe('getWarpChainAssetLogoUrl', () => {
  it('returns null when no logoUrl', () => {
    expect(getWarpChainAssetLogoUrl({} as WarpChainAsset)).toBeNull()
  })

  it('returns string logoUrl as-is', () => {
    const asset = { logoUrl: 'https://example.com/asset.png' } as WarpChainAsset
    expect(getWarpChainAssetLogoUrl(asset)).toBe('https://example.com/asset.png')
  })

  it('returns themed logoUrl for matching theme', () => {
    const asset = { logoUrl: { light: 'L', dark: 'D' } } as WarpChainAsset
    expect(getWarpChainAssetLogoUrl(asset, darkConfig)).toBe('D')
    expect(getWarpChainAssetLogoUrl(asset, lightConfig)).toBe('L')
  })

  it('falls back when theme key is missing', () => {
    const asset = { logoUrl: { light: 'L' } } as unknown as WarpChainAsset
    expect(getWarpChainAssetLogoUrl(asset, darkConfig)).toBe('L')
  })
})

describe('getWarpChainInfoLogoUrl', () => {
  it('returns string logoUrl as-is', () => {
    const info = { logoUrl: 'https://example.com/chain.png' } as WarpChainInfo
    expect(getWarpChainInfoLogoUrl(info)).toBe('https://example.com/chain.png')
  })

  it('returns themed logoUrl for matching theme', () => {
    const info = { logoUrl: { light: 'L', dark: 'D' } } as WarpChainInfo
    expect(getWarpChainInfoLogoUrl(info, darkConfig)).toBe('D')
    expect(getWarpChainInfoLogoUrl(info, lightConfig)).toBe('L')
  })

  it('falls back when theme key is missing', () => {
    const info = { logoUrl: { dark: 'D' } } as unknown as WarpChainInfo
    expect(getWarpChainInfoLogoUrl(info, lightConfig)).toBe('D')
  })
})
