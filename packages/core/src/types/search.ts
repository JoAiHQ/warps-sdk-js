export type ClientIndexConfig = {
  url?: string
  apiKey?: string
  searchParamName?: string
}

export type WarpSearchResult = {
  hits: WarpSearchHit[]
}

export type WarpSearchHit = {
  hash: string
  alias: string
  name: string
  title: string
  description: string
  preview: string
  brandSlug: string | null
  brandName: string | null
  brandLogo: string | null
  status: string
  category: string
  featured: boolean
}
