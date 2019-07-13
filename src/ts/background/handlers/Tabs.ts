import {
  MessageTypes,
  MessageAuthorize,
  MessageExtrinsicSign,
  MessageExtrinsicSign$Response
} from '../types'

import { assert } from '@polkadot/util'
import State from './State'
import { createSubscription, unsubscribe } from './subscriptions'
import keyringVault from '../services/keyring-vault'
import { Runtime } from 'webextension-polyfill-ts'

type Accounts = Array<{ address: string, name?: string }>

export default class Tabs {
  state: State

  constructor (state: State) {
    this.state = state
  }

  private authorize (url: string, request: MessageAuthorize) {
    console.log(url, request)
    return this.state.authorizeUrl(url, request)
  }

  private accountsList (url: string): Accounts {
    console.log(url)
    return keyringVault.getAccounts().map(
      keyringPairJson => ({ address: keyringPairJson.address, name: keyringPairJson.meta.name }))
  }

  private accountsSubscribe (url: string, id: string, port: Runtime.Port): boolean {
    console.log(url)
    const cb = createSubscription(id, port)
    cb(keyringVault.getAccounts().map(
      keyringPairJson => ({ address: keyringPairJson.address, name: keyringPairJson.meta.name })))
    port.onDisconnect.addListener(() => {
      unsubscribe(id)
    })
    return true
  }

  private extrinsicSign (url: string, request: MessageExtrinsicSign):
    Promise<MessageExtrinsicSign$Response> {
    const { address } = request
    const accountExists = keyringVault.accountExists(address)

    assert(accountExists, 'Unable to find keypair')

    return this.state.signQueue(url, request)
  }

  async handle (id: string, type: MessageTypes,
                request: any, url: string, port: Runtime.Port): Promise<any> {
    switch (type) {
      case 'authorize.tab':
        return this.authorize(url, request)

      case 'accounts.list':
        return this.accountsList(url)

      case 'accounts.subscribe':
        return this.accountsSubscribe(url, id, port)

      case 'extrinsic.sign':
        return this.extrinsicSign(url, request)

      default:
        throw new Error(`Unable to handle message of type ${type}`)
    }
  }
}
