import { Account, JsonRpcProvider, KeyPairSigner } from 'near-api-js'

type NearConfig = {
  nodeUrl: string
}

export const createNearProvider = (config: NearConfig) => new JsonRpcProvider({ url: config.nodeUrl })

export const createNearAccount = (config: NearConfig, accountId: string) => new Account(accountId, config.nodeUrl)

export const createNearSigningAccount = (config: NearConfig, accountId: string, keyPair: any) =>
  new Account(accountId, config.nodeUrl, new KeyPairSigner(keyPair))
