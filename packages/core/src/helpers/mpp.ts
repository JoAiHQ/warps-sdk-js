import { Mppx, tempo } from 'mppx/client'
import type { ChainAdapter } from '../types'
import { WarpLogger } from '../WarpLogger'

/**
 * Returns an mppx-powered fetch if any adapter supports MPP payments,
 * otherwise returns standard fetch. The returned fetch auto-handles
 * HTTP 402 Payment Required responses (challenge → pay → retry).
 *
 * MPP only supports EVM wallets on the Tempo chain.
 */
export async function getMppFetch(adapters: ChainAdapter[]): Promise<(url: string, init: RequestInit) => Promise<Response>> {
  for (const adapter of adapters) {
    if (!adapter.wallet.getMppAccount) continue

    const account = await adapter.wallet.getMppAccount().catch(() => null)
    if (!account) continue

    WarpLogger.debug('WarpExecutor: Using mppx fetch for MPP auto-payment')
    const client = Mppx.create({ methods: [tempo({ account: account as any })], polyfill: false })
    return client.fetch as (url: string, init: RequestInit) => Promise<Response>
  }

  return fetch
}
