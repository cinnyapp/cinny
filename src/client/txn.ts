export type GetTxnId = () => string;

export const getTxnIdFunc = (): GetTxnId => {
  let txnCount = 0;

  const getTxnId: GetTxnId = () => {
    const id = `m${new Date().getTime()}.${(txnCount += 1)}`;
    return id;
  };

  return getTxnId;
};
