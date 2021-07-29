import { Option, Some, None } from "./option";

export interface ResultOps<E, A> {
  /**
   * Returns whether this is an instance of Ok
   */
  isOk(): this is Ok<E, A>;

  /**
   * Returns whether this is an instance of Ok
   */
  isErr(): this is Err<E, A>;
  /**
   * Maps the value contained in this Result if it's an Ok, else propagates the Error.
   */
  map<B>(fn: (a: A) => B): Result<E, B>;

  /**
   * Maps the Error contained in this Result if it's an Err, else propagates the Ok.
   */
  mapError<E2>(fn: (error: E) => E2): Result<E2, A>;

  /**
   * Maps the value contained in this Result with another Result if it's an Ok, else propagates the Error.
   * Note: It is allowed to return a Result with a different Error type.
   */
  flatMap<E2, B>(fn: (a: A) => Result<E2, B>): Result<E | E2, B>;

  /**
   * Applies the first function if this is an Err, else applies the second function.
   * Note: Don't use in tight loops; use isOk() instead.
   */
  fold<B, C>(ifErr: (err: E) => B, ifOk: (value: A) => C): B | C;

  /**
   * Transforms this Result into an Option.
   */
  toOption(): Option<A>;
}

export interface ResultObject {
  /**
   * Returns whether the passed value is a Result (either an Ok or an Err).
   */
  isResult(value: any): value is Result<{}, {}>;

  /**
   * Creates a new Ok Result holding the tuple of all the values contained in the passed array
   * if they were all Ok,
   * else returns the first encountered Err.
   */
  all<
    A,
    B,
    C,
    D,
    E,
    F,
    G,
    H,
    I,
    J,
    K,
    E1,
    E2,
    E3,
    E4,
    E5,
    E6,
    E7,
    E8,
    E9,
    E10,
    E11
  >(
    xs: [
      Result<E1, A>,
      Result<E2, B>,
      Result<E3, C>,
      Result<E4, D>,
      Result<E5, E>,
      Result<E6, F>,
      Result<E7, G>,
      Result<E8, H>,
      Result<E9, I>,
      Result<E10, J>,
      Result<E11, K>
    ]
  ): Result<
    E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 | E9 | E10 | E11,
    [A, B, C, D, E, F, G, H, I, J, K]
  >;

  /**
   * Creates a new Ok Result holding the tuple of all the values contained in the passed array
   * if they were all Ok,
   * else returns the first encountered Err.
   */
  all<A, B, C, D, E, F, G, H, I, J, E1, E2, E3, E4, E5, E6, E7, E8, E9, E10>(
    xs: [
      Result<E1, A>,
      Result<E2, B>,
      Result<E3, C>,
      Result<E4, D>,
      Result<E5, E>,
      Result<E6, F>,
      Result<E7, G>,
      Result<E8, H>,
      Result<E9, I>,
      Result<E10, J>
    ]
  ): Result<
    E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 | E9 | E10,
    [A, B, C, D, E, F, G, H, I, J]
  >;

  /**
   * Creates a new Ok Result holding the tuple of all the values contained in the passed array
   * if they were all Ok,
   * else returns the first encountered Err.
   */
  all<A, B, C, D, E, F, G, H, I, E1, E2, E3, E4, E5, E6, E7, E8, E9>(
    xs: [
      Result<E1, A>,
      Result<E2, B>,
      Result<E3, C>,
      Result<E4, D>,
      Result<E5, E>,
      Result<E6, F>,
      Result<E7, G>,
      Result<E8, H>,
      Result<E9, I>
    ]
  ): Result<
    E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8 | E9,
    [A, B, C, D, E, F, G, H, I]
  >;

  /**
   * Creates a new Ok Result holding the tuple of all the values contained in the passed array
   * if they were all Ok,
   * else returns the first encountered Err.
   */
  all<A, B, C, D, E, F, G, H, E1, E2, E3, E4, E5, E6, E7, E8>(
    xs: [
      Result<E1, A>,
      Result<E2, B>,
      Result<E3, C>,
      Result<E4, D>,
      Result<E5, E>,
      Result<E6, F>,
      Result<E7, G>,
      Result<E8, H>
    ]
  ): Result<E1 | E2 | E3 | E4 | E5 | E6 | E7 | E8, [A, B, C, D, E, F, G, H]>;

  /**
   * Creates a new Ok Result holding the tuple of all the values contained in the passed array
   * if they were all Ok,
   * else returns the first encountered Err.
   */
  all<A, B, C, D, E, F, G, E1, E2, E3, E4, E5, E6, E7>(
    xs: [
      Result<E1, A>,
      Result<E2, B>,
      Result<E3, C>,
      Result<E4, D>,
      Result<E5, E>,
      Result<E6, F>,
      Result<E7, G>
    ]
  ): Result<E1 | E2 | E3 | E4 | E5 | E6 | E7, [A, B, C, D, E, F, G]>;

  /**
   * Creates a new Ok Result holding the tuple of all the values contained in the passed array
   * if they were all Ok,
   * else returns the first encountered Err.
   */
  all<A, B, C, D, E, F, E1, E2, E3, E4, E5, E6>(
    xs: [
      Result<E1, A>,
      Result<E2, B>,
      Result<E3, C>,
      Result<E4, D>,
      Result<E5, E>,
      Result<E6, F>
    ]
  ): Result<E1 | E2 | E3 | E4 | E5 | E6, [A, B, C, D, E, F]>;

  /**
   * Creates a new Ok Result holding the tuple of all the values contained in the passed array
   * if they were all Ok,
   * else returns the first encountered Err.
   */
  all<A, B, C, D, E, E1, E2, E3, E4, E5>(
    xs: [
      Result<E1, A>,
      Result<E2, B>,
      Result<E3, C>,
      Result<E4, D>,
      Result<E5, E>
    ]
  ): Result<E1 | E2 | E3 | E4 | E5, [A, B, C, D, E]>;

  /**
   * Creates a new Ok Result holding the tuple of all the values contained in the passed array
   * if they were all Ok,
   * else returns the first encountered Err.
   */
  all<A, B, C, D, E1, E2, E3, E4>(
    xs: [Result<E1, A>, Result<E2, B>, Result<E3, C>, Result<E4, D>]
  ): Result<E1 | E2 | E3 | E4, [A, B, C, D]>;

  /**
   * Creates a new Ok Result holding the tuple of all the values contained in the passed array
   * if they were all Ok,
   * else returns the first encountered Err.
   */
  all<A, B, C, E1, E2, E3>(
    xs: [Result<E1, A>, Result<E2, B>, Result<E3, C>]
  ): Result<E1 | E2 | E3, [A, B, C]>;

  /**
   * Creates a new Ok Result holding the tuple of all the values contained in the passed array
   * if they were all Ok,
   * else returns the first encountered Err.
   */
  all<A, B, E1, E2>(
    xs: [Result<E1, A>, Result<E2, B>]
  ): Result<E1 | E2, [A, B]>;

  /**
   * Creates a new Ok Result holding the tuple of all the values contained in the passed array
   * if they were all Ok,
   * else returns the first encountered Err.
   */
  all<A, E>(results: Result<E, A>[]): Result<E, A[]>;
}

export interface Ok<E, T> extends ResultOps<E, T> {
  type: "ok";
  get: () => T;
}

export interface Err<E, T> extends ResultOps<E, T> {
  type: "err";
  get: () => E;
}

export type Result<E, T> = Ok<E, T> | Err<E, T>;

const ResultObject = {} as ResultObject;

ResultObject.all = (arr: any[]): any => {
  const okValues: any[] = [];
  let currentResult;

  for (let i = 0; i < arr.length; i++) {
    let currentResult = arr[i];
    if (!currentResult.isOk()) return currentResult;
    okValues.push(currentResult.get());
  }

  return Ok(okValues);
};

ResultObject.isResult = function (value: any): value is Result<{}, {}> {
  return !!value && (value.type === "ok" || value.type === "err");
};

function _Ok<T>(this: Ok<{}, T> & { _value: T }, value: T) {
  this._value = value;
}

_Ok.prototype = {
  type: "ok",

  isOk() {
    return true;
  },

  isErr() {
    return false;
  },

  map(fn: any) {
    return Ok(fn(this._value));
  },

  mapError(fn: any) {
    return this;
  },

  flatMap(fn: any) {
    return fn(this._value);
  },

  fold(ifErr: any, ifOk: any) {
    return ifOk(this._value);
  },

  toOption() {
    return Some(this._value);
  },

  toString() {
    return `Ok(${this._value})`;
  },

  get() {
    return this._value;
  },
};

function _Err<E>(this: Ok<E, {}> & { _error: E }, error: E) {
  this._error = error;
}

_Err.prototype = {
  type: "err",

  isOk() {
    return false;
  },

  isErr() {
    return true;
  },

  map(fn: any): any {
    return this;
  },

  mapError(fn: any) {
    return Err(fn(this._error));
  },

  flatMap(fn: any) {
    return this;
  },

  fold(ifErr: any, ifOk: any) {
    return ifErr(this._error);
  },

  toOption() {
    return None;
  },

  toString() {
    return `Err(${this._error})`;
  },

  get() {
    return this._error;
  },
};

export const Result = ResultObject;

export function Ok<T>(value: T): Result<never, T> {
  return new (_Ok as any)(value);
}

export function Err<E>(error: E): Result<E, never> {
  return new (_Err as any)(error);
}
