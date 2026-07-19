export class LocalMessage<TContent extends object = object> {
  constructor(
    public readonly roomId: string,
    public readonly type: string,
    public readonly content: TContent
  ) {}

  clone(): LocalMessage {
    return new LocalMessage(this.roomId, this.type, this.content);
  }
}

export class LocalEvent {
  public readonly original: LocalMessage;

  public readonly wire: LocalMessage;

  public readonly txnId: string;

  public readonly ts: number;

  constructor(original: LocalMessage, wire: LocalMessage, txnId: string, ts: number) {
    this.original = original;
    this.wire = wire;
    this.txnId = txnId;

    this.ts = ts;
  }
}
