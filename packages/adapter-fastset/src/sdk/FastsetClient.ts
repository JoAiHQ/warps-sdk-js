import * as bech32 from 'bech32'
import { FastsetJsonRpcResponse, TokenInfoResponse, TransactionCertificate } from './types'
;(BigInt.prototype as any).toJSON = function () {
  return Number(this)
}

interface TransactionData {
  sender: number[] | Uint8Array
  recipient: any
  nonce: number
  timestamp_nanos: bigint
  claim: any
  signature?: string
}

interface AccountInfoResponse {
  sender: number[]
  balance: string
  next_nonce: number
  pending_confirmation?: any
  requested_certificate?: any
  requested_validated_transaction?: any
  requested_received_transfers: any[]
  token_balance: Array<[number[], string]>
  requested_claim_by_id?: any
  requested_claims: any[]
}

let id = 0

export class FastsetClient {
  private proxyUrl: string

  constructor(proxyUrl: string) {
    this.proxyUrl = proxyUrl
  }

  async request(url: string, method: string, params: any): Promise<any> {
    const requestId = id++
    const request = this.buildJsonRpcRequest(requestId, method, params)
    const headers = { 'Content-Type': 'application/json' }
    const body = this.jsonSerialize(request)

    try {
      const response = await fetch(url, { method: 'POST', headers, body })

      if (!response.ok) {
        return { jsonrpc: '2.0', id: requestId, error: { code: response.status, message: response.statusText } }
      }

      try {
        return await response.json()
      } catch {
        return { jsonrpc: '2.0', id: requestId, error: { code: -32700, message: 'Parse error' } }
      }
    } catch {
      return { jsonrpc: '2.0', id: requestId, error: { code: -32603, message: 'Internal error' } }
    }
  }

  private buildJsonRpcRequest(id: number, method: string, params: any) {
    return { jsonrpc: '2.0', id, method, params }
  }

  private jsonSerialize(data: any) {
    return JSON.stringify(data, (k, v) => {
      if (v instanceof Uint8Array) {
        return Array.from(v)
      }
      return v
    })
  }

  async getAccountInfo(address: Uint8Array): Promise<FastsetJsonRpcResponse<AccountInfoResponse>> {
    return this.request(this.proxyUrl, 'set_proxy_getAccountInfo', { address, token_balances_filter: [] })
  }

  async getTokenInfo(tokenIds: Uint8Array): Promise<FastsetJsonRpcResponse<TokenInfoResponse>> {
    return this.request(this.proxyUrl, 'set_proxy_getTokenInfo', { tokenIds: [Array.from(tokenIds)] })
  }

  async getNextNonce(address: string | Uint8Array): Promise<number> {
    const addressBytes = typeof address === 'string' ? this.addressToBytes(address) : address
    const accountInfoRes = await this.getAccountInfo(addressBytes)
    return accountInfoRes.result?.next_nonce ?? 0
  }

  async submitTransaction(tx: any, signature: Uint8Array): Promise<any> {
    const submitTxReq = { transaction: tx, signature }
    const response = await this.request(this.proxyUrl, 'set_proxy_submitTransaction', submitTxReq)
    const proxyCert = this.parse_TransactionCertificate(response.result)

    console.log('FastSet Transaction Certificate:', proxyCert)

    return proxyCert
  }

  private parse_TransactionCertificate(res: Record<string, unknown>) {
    let bcs_bytes = TransactionCertificate.serialize(res as any).toBytes()
    let bcs_value = TransactionCertificate.parse(bcs_bytes)
    return bcs_value
  }

  private addressToBytes(address: string): Uint8Array {
    try {
      const decoded = bech32.bech32m.decode(address)
      return new Uint8Array(bech32.bech32m.fromWords(decoded.words))
    } catch {
      const decoded = bech32.bech32.decode(address)
      return new Uint8Array(bech32.bech32.fromWords(decoded.words))
    }
  }

  static decodeBech32Address(address: string): Uint8Array {
    try {
      const decoded = bech32.bech32m.decode(address)
      return new Uint8Array(bech32.bech32m.fromWords(decoded.words))
    } catch {
      const decoded = bech32.bech32.decode(address)
      return new Uint8Array(bech32.bech32.fromWords(decoded.words))
    }
  }

  static encodeBech32Address(publicKey: Uint8Array): string {
    const words = bech32.bech32m.toWords(publicKey)
    return bech32.bech32m.encode('set', words)
  }
}
