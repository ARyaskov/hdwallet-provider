import FiltersSubprovider from "web3-provider-engine/subproviders/filters";
import HookedWalletSubprovider from "web3-provider-engine/subproviders/hooked-wallet";
import SanitizingSubprovider from "web3-provider-engine/subproviders/sanitizer";
import CacheSubprovider from "web3-provider-engine/subproviders/cache";
import SubscriptionSubprovider from "web3-provider-engine/subproviders/subscriptions";
import InflightCacheSubprovider from "web3-provider-engine/subproviders/inflight-cache";
import { baseProvider, Remote } from "./util";
import { NonceSubprovider } from "./nonce.subprovider";
import ProviderEngine from "web3-provider-engine";
import { MnemonicSubprovider } from "./mnemonic.subprovider";
import { DEFAULT_PATH } from "./path.util";
import { GetTransportFunction, LedgerSubprovider } from "./ledger.subprovider";
import FetchSubprovider = require("web3-provider-engine/subproviders/fetch");
import { PollingBlockTracker } from "./block-tracker/polling";
import { Engine } from "./engine";
import {AbstractProvider, RequestArguments} from 'web3-core'
import {JsonRpcPayload, JsonRpcResponse} from "web3-core-helpers";
import Web3ProviderEngine from "web3-provider-engine";
import * as util from "util";

export interface MnemonicOptions {
  mnemonic: string;
  rpc: string;
  path?: string;
  numberOfAccounts?: number;
}

export interface LedgerOptions {
  rpc: string;
  path?: string;
  numberOfAccounts?: number;
  accountsOffset?: number;
  askConfirm?: boolean;
}

async function ledgerProvider<A>(
  getTransport: GetTransportFunction<A>,
  options: LedgerOptions
): Promise<HDWalletProvider> {
  const remote = baseProvider(options.rpc);
  const signer = new LedgerSubprovider(getTransport, options);
  return new HDWalletProvider(signer, remote);
}

export class HDWalletProvider implements AbstractProvider {
  readonly getAddresses: () => Promise<string[]>;
  public readonly engine: ProviderEngine;

  static mnemonic(options: MnemonicOptions): HDWalletProvider {
    const path = options.path || DEFAULT_PATH;
    const remote = baseProvider(options.rpc);
    const signer = new MnemonicSubprovider(path, options.mnemonic, options.numberOfAccounts);
    return new HDWalletProvider(signer, remote);
  }

  static async ledgerHID(options: LedgerOptions) {
    require("babel-polyfill");
    const TransportHid = (await import("@ledgerhq/hw-transport-node-hid")).default;
    const getTransport = () => TransportHid.create();
    return ledgerProvider(getTransport, options);
  }

  static async ledgerBLE(options: LedgerOptions) {
    require("babel-polyfill");
    const TransportBLE = (await import("./transport-ble")).TransportBle;
    const getTransport = () => TransportBLE.create();
    return ledgerProvider(getTransport, options);
  }

  /**
   * Initialize HDWallet using some sort of provider.
   */
  constructor(signer: HookedWalletSubprovider, remote: Remote) {
    const blockTracker = new PollingBlockTracker({
      provider: this,
      pollingInterval: 4000,
      setSkipCacheFlag: true
    });
    const engine = new Engine({
      blockTracker
    });
    this.getAddresses = () => {
      return new Promise<string[]>((resolve, reject) => {
        signer.getAccounts( (error: Error|null|undefined, accounts?: string[]) => {
          error ? reject(error) : resolve(accounts!);
        });
      });
    };
    engine.addProvider(signer);
    engine.addProvider(new NonceSubprovider());
    engine.addProvider(new SanitizingSubprovider());
    engine.addProvider(new CacheSubprovider());
    if (remote instanceof FetchSubprovider) {
      engine.addProvider(new SubscriptionSubprovider());
      engine.addProvider(new FiltersSubprovider());
    }
    engine.addProvider(new InflightCacheSubprovider());
    engine.addProvider(remote);
    this.engine = engine;
    engine.start();
  }

  send(payload: JsonRpcPayload, callback: (error: Error | null, result?: JsonRpcResponse) => unknown): void {
    this.engine.sendAsync(payload as Web3ProviderEngine.JsonRPCRequest, callback as Web3ProviderEngine.Callback<Web3ProviderEngine.JsonRPCResponse>)
  }

  sendAsync(payload: JsonRpcPayload, callback?: (error: Error | null, result?: JsonRpcResponse) => Promise<unknown> | void): void {
    this.engine.sendAsync(payload as Web3ProviderEngine.JsonRPCRequest, callback as Web3ProviderEngine.Callback<Web3ProviderEngine.JsonRPCResponse>)
  }
}
