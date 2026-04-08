import { WarpTheme } from './general'
import { WarpI18nText, WarpText } from './i18n'
import { WarpMeta } from './warp'

export type WarpBrandSiteRoute = {
  path: string
  warp: string
  label: WarpI18nText
  nav?: boolean
}

export type WarpBrandSiteConfig = {
  enabled: boolean
  auth?: boolean
  indexPath: string
  routes: WarpBrandSiteRoute[]
}

export type WarpBrand = {
  protocol: string
  name: WarpText
  description: WarpText
  logo: WarpBrandLogo
  urls?: WarpBrandUrls
  colors?: WarpBrandColors
  cta?: WarpBrandCta
  meta?: WarpMeta
}

export type WarpBrandLogoThemed = Record<WarpTheme, string>
export type WarpBrandLogo = string | WarpBrandLogoThemed

export type WarpBrandUrls = {
  web?: string
}

export type WarpBrandColors = {
  primary?: string
  secondary?: string
}

export type WarpBrandCta = {
  title: WarpText
  description: WarpText
  label: WarpText
  url: string
}
