type ChangeType = 'Grow' | 'Shrink';

type ChangeDirection = 'f' | 'b';

export class BatchChange {
  public readonly type?: ChangeType;

  public readonly dir?: ChangeDirection;

  constructor(type?: ChangeType, dir?: ChangeDirection) {
    this.type = type;
    this.dir = dir;
  }
}
