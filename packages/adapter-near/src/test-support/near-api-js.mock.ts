const createKeyPair = (value = 'ed25519:test-private-key') => ({
  getPublicKey: () => ({
    toString: () => 'ed25519:test-public-key',
  }),
  sign: () => ({
    signature: new Uint8Array([1, 2, 3]),
  }),
  toString: () => value,
})

export class Account {
  constructor(
    public readonly accountId: string,
    public readonly provider: unknown,
    public readonly signer?: unknown
  ) {}

  async getState() {
    if (this.accountId === 'invalid-address') {
      throw new Error('Invalid account')
    }
    return {
      balance: { total: 0n, usedOnStorage: 0n, locked: 0n, available: 0n },
    }
  }

  async callFunction() {
    return null
  }

  async signAndSendTransaction() {
    return { transaction: { hash: 'test-hash' } }
  }
}

export class JsonRpcProvider {
  constructor(public readonly connection: unknown) {}

  async viewTransactionStatus({ txHash }: { txHash: string }) {
    if (txHash === 'invalid-signature') {
      throw new Error('Transaction not found')
    }
    return {
      status: { SuccessValue: '' },
      transaction: { signer_id: 'test.near', receiver_id: 'receiver.near', actions: [] },
    }
  }
}

export class KeyPairSigner {
  constructor(public readonly keyPair: unknown) {}
}

export const KeyPair = {
  fromString: (value?: string) => createKeyPair(value),
  fromRandom: () => createKeyPair(),
}

export const utils = {
  format: {
    parseNearAmount: (amount: string) => amount,
    formatNearAmount: (amount: string) => amount,
  },
}
