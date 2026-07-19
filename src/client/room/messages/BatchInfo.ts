export class BatchInfo {
  public readonly token?: string;

  public readonly end?: boolean;

  constructor(token?: string, end?: boolean) {
    this.token = token;
    this.end = end;
  }
}
