declare module '@solana/kit' {
  export function createKeyPairSignerFromBytes(bytes: Uint8Array): Promise<{
    signMessage: (message: Uint8Array) => Promise<Uint8Array>
    signTransaction: (transaction: unknown) => Promise<unknown>
  }>
  
  export function isDurableNonceTransaction(transaction: any): boolean
}
