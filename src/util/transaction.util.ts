import {FeeMarketEIP1559Transaction, Transaction, TxData} from "@ethereumjs/tx";
import { Chain, Hardfork } from '@ethereumjs/common'
import Common from "@ethereumjs/common"
import {FeeMarketEIP1559TxData} from "@ethereumjs/tx";

export function buildTransaction(rawTx: Buffer | FeeMarketEIP1559TxData, networkId: number) {
  if (rawTx instanceof Buffer) {
    rawTx = FeeMarketEIP1559Transaction.fromSerializedTx(rawTx)
  }
  const common = new Common({ chain: networkId as Chain })
  return FeeMarketEIP1559Transaction.fromTxData(rawTx, { common })
}
