import FetchSubprovider from "web3-provider-engine/subproviders/fetch";

const EXTRA_DIGITS = 3;

export function randomId() {
  // 13 time digits
  const datePart = new Date().getTime() * Math.pow(10, EXTRA_DIGITS);
  // 3 random digits
  const extraPart = Math.floor(Math.random() * Math.pow(10, EXTRA_DIGITS));
  // 16 digits
  return datePart + extraPart;
}

export function createPayload(data: any) {
  const empty = {
    id: randomId(),
    jsonrpc: "2.0",
    params: []
  };
  return Object.assign(empty, data);
}

export function baseProvider(rpcUrl: string) {
  const protocol = rpcUrl.split(":")[0].toLowerCase();
  switch (protocol) {
    case "http":
      return new FetchSubprovider({ rpcUrl });
    case "https":
      return new FetchSubprovider({ rpcUrl });
    case "ws":
      throw new Error(`ProviderEngine - unrecognized protocol in "${rpcUrl}"`);
    case "wss":
      throw new Error(`ProviderEngine - unrecognized protocol in "${rpcUrl}"`);
    default:
      throw new Error(`ProviderEngine - unrecognized protocol in "${rpcUrl}"`);
  }
}

export function blockTagForPayload(payload: any) {
  const index = blockTagParamIndex(payload);

  // Block tag param not passed.
  if (!index || index >= payload.params.length) {
    return null;
  }

  return payload.params[index];
}

export function blockTagParamIndex(payload: any): number | undefined {
  switch (payload.method) {
    // blockTag is third param
    case "eth_getStorageAt":
      return 2;
    // blockTag is second param
    case "eth_getBalance":
    case "eth_getCode":
    case "eth_getTransactionCount":
    case "eth_call":
    case "eth_estimateGas":
      return 1;
    // blockTag is first param
    case "eth_getBlockByNumber":
      return 0;
    // there is no blockTag
    default:
      return undefined;
  }
}
