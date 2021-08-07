interface ResultOperations<T, E> {
  /**
   * Returns true if this is an instance of Ok.
   */
  // Ok extends ResultOperations
  // eslint-disable-next-line no-use-before-define
  isOk(): this is Ok<T, E>;

  /**
   * Returns true if this is an instance of Err.
   */
  // Err extends ResultOperations
  // eslint-disable-next-line no-use-before-define
  isErr(): this is Err<T, E>;
}

export interface Ok<T, E> extends ResultOperations<T, E> {
  type: 'ok';
  get: () => T;
}
export interface Err<T, E> extends ResultOperations<T, E> {
  type: 'err';
  get: () => E;
}

function _Ok<T>(this: Ok<T, unknown> & { _value: T }, value: T) {
  this._value = value;
}

_Ok.prototype = {
  type: 'ok',
  isOk: () => true,
  isErr: () => false,
  get() {
    return this._value;
  },
};

function _Err<E>(this: Ok<unknown, E> & { _error: E }, error: E) {
  this._error = error;
}

_Err.prototype = {
  type: 'err',
  isOk: () => false,
  isErr: () => true,
  get() {
    return this._error;
  },
};

export type Result<T, E> = Ok<T, E> | Err<T, E>

// utility functions to build Ok and Err instances
export const ok = <T>(value: T): Result<T, never> => new (_Ok as any)(value);
export const err = <E>(error: E): Result<never, E> => new (_Err as any)(error);
