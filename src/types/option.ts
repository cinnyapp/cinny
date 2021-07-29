import { Err, Ok, Result } from "./result";
import { iteratorSymbol, singleValueIterator } from "./iterator";

export interface Option<A> extends Iterable<A> {
  /**
   * Returns the value contained in this Option.
   * This will always return undefined if this Option instance is None.
   * This method never throws.
   */
  get(): A | undefined;

  /**
   * Returns whether this Option has a defined value (i.e, it's a Some(value))
   */
  isDefined(): this is Some<A>;

  /**
   * Applies the given procedure to the option's value, if it is non empty.
   */
  forEach(fn: (a: A) => void): void;

  /**
   * Maps the value contained in this Some, else returns None.
   * Depending on the map function return value, a Some could be tranformed into a None.
   */
  map<B>(fn: (a: A) => null | undefined): Option<B>;

  /**
   * Maps the value contained in this Some, else returns None.
   * Depending on the map function return value, a Some could be tranformed into a None.
   */
  map<B>(fn: (a: A) => B | null | undefined): Option<B>;

  /**
   * Maps the value contained in this Some, else returns None.
   * Depending on the map function return value, a Some could be tranformed into a None.
   */
  map<B>(fn: (a: A) => B | null | undefined): Option<B>;

  /**
   * Maps the value contained in this Some to a new Option, else returns None.
   */
  flatMap<B>(fn: (a: A) => Option<B>): Option<B>;

  /**
   * If this Option is a Some and the predicate returns true, keep that Some.
   * In all other cases, return None.
   */
  filter<B extends A>(fn: (a: A) => a is B): Option<B>;
  /**
   * If this Option is a Some and the predicate returns true, keep that Some.
   * In all other cases, return None.
   */
  filter(fn: (a: A) => boolean): Option<A>;

  /**
   * Applies the first function if this is a None, else applies the second function.
   * Note: Since this method creates 2 functions everytime it runs, don't use in tight loops; use isDefined() instead.
   */
  fold<B, C>(ifEmpty: () => B, ifDefined: (a: A) => C): B | C;

  /**
   * Returns this Option unless it's a None, in which case the provided alternative is returned
   */
  orElse(alternative: () => Option<A>): Option<A>;

  /**
   * Returns this Option's value if it's a Some, else return the provided alternative
   */
  getOrElse(alternative: A): A;

  /**
   * Returns whether this option is a Some with a value satisfying the predicate.
   */
  exists<B extends A>(predicate: (a: A) => a is B): this is Option<B>;
  /**
   * Returns whether this option is a Some with a value satisfying the predicate.
   */
  exists(predicate: (a: A) => boolean): boolean;

  /**
   * Returns whether this option is a Some that contain a specific value, using ===
   */
  contains(a: A): boolean;

  /**
   * Converts this Option to an Array.
   */
  toArray(): Array<A>;

  /**
   * Converts this Option to a Result.
   */
  toResult<ERR>(ifNone: () => ERR): Result<ERR, A>;

  toString(): string;
}

export interface Some<T> extends Option<T> {
  type: "some";
  get(): T;
}

export interface None extends Option<never> {
  type: "none";
  get(): never;
}

export type NullableValue<T> = T | Option<T> | null | undefined;

export interface OptionObject {
  /**
   * Creates an Option from a value.
   * If the value is null or undefined, it will create a None, else a Some.
   */
  <T>(value: T | null | undefined): Option<T>;

  /**
   * Returns whether the passed value is an Option (either a Some or a None).
   */
  isOption(value: any): value is Option<{}>;

  /**
   * Creates a new Option holding the tuple of all the values contained in the passed array
   * if they were all Some or non null/undefined values,
   * else returns None
   */
  all<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(
    xs: [
      NullableValue<T1>,
      NullableValue<T2>,
      NullableValue<T3>,
      NullableValue<T4>,
      NullableValue<T5>,
      NullableValue<T6>,
      NullableValue<T7>,
      NullableValue<T8>,
      NullableValue<T9>,
      NullableValue<T10>
    ]
  ): Option<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]>;

  /**
   * Creates a new Option holding the tuple of all the values contained in the passed array
   * if they were all Some or non null/undefined values,
   * else returns None
   */
  all<T1, T2, T3, T4, T5, T6, T7, T8, T9>(
    xs: [
      NullableValue<T1>,
      NullableValue<T2>,
      NullableValue<T3>,
      NullableValue<T4>,
      NullableValue<T5>,
      NullableValue<T6>,
      NullableValue<T7>,
      NullableValue<T8>,
      NullableValue<T9>
    ]
  ): Option<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>;

  /**
   * Creates a new Option holding the tuple of all the values contained in the passed array
   * if they were all Some or non null/undefined values,
   * else returns None
   */
  all<T1, T2, T3, T4, T5, T6, T7, T8>(
    xs: [
      NullableValue<T1>,
      NullableValue<T2>,
      NullableValue<T3>,
      NullableValue<T4>,
      NullableValue<T5>,
      NullableValue<T6>,
      NullableValue<T7>,
      NullableValue<T8>
    ]
  ): Option<[T1, T2, T3, T4, T5, T6, T7, T8]>;

  /**
   * Creates a new Option holding the tuple of all the values contained in the passed array
   * if they were all Some or non null/undefined values,
   * else returns None
   */
  all<T1, T2, T3, T4, T5, T6, T7>(
    xs: [
      NullableValue<T1>,
      NullableValue<T2>,
      NullableValue<T3>,
      NullableValue<T4>,
      NullableValue<T5>,
      NullableValue<T6>,
      NullableValue<T7>
    ]
  ): Option<[T1, T2, T3, T4, T5, T6, T7]>;

  /**
   * Creates a new Option holding the tuple of all the values contained in the passed array
   * if they were all Some or non null/undefined values,
   * else returns None
   */
  all<T1, T2, T3, T4, T5, T6>(
    xs: [
      NullableValue<T1>,
      NullableValue<T2>,
      NullableValue<T3>,
      NullableValue<T4>,
      NullableValue<T5>,
      NullableValue<T6>
    ]
  ): Option<[T1, T2, T3, T4, T5, T6]>;

  /**
   * Creates a new Option holding the tuple of all the values contained in the passed array
   * if they were all Some or non null/undefined values,
   * else returns None
   */
  all<T1, T2, T3, T4, T5>(
    xs: [
      NullableValue<T1>,
      NullableValue<T2>,
      NullableValue<T3>,
      NullableValue<T4>,
      NullableValue<T5>
    ]
  ): Option<[T1, T2, T3, T4, T5]>;

  /**
   * Creates a new Option holding the tuple of all the values contained in the passed array
   * if they were all Some or non null/undefined values,
   * else returns None
   */
  all<T1, T2, T3, T4>(
    xs: [
      NullableValue<T1>,
      NullableValue<T2>,
      NullableValue<T3>,
      NullableValue<T4>
    ]
  ): Option<[T1, T2, T3, T4]>;

  /**
   * Creates a new Option holding the tuple of all the values contained in the passed array
   * if they were all Some or non null/undefined values,
   * else returns None
   */
  all<T1, T2, T3>(
    xs: [NullableValue<T1>, NullableValue<T2>, NullableValue<T3>]
  ): Option<[T1, T2, T3]>;

  /**
   * Creates a new Option holding the tuple of all the values contained in the passed array
   * if they were all Some or non null/undefined values,
   * else returns None
   */
  all<T1, T2>(xs: [NullableValue<T1>, NullableValue<T2>]): Option<[T1, T2]>;

  /**
   * Creates a new Option holding the tuple of all the values contained in the passed array
   * if they were all Some or non null/undefined values,
   * else returns None
   */
  all<T>(ts: Array<NullableValue<T>>): Option<T[]>;
}

// The Option factory / static object
const OptionObject = function <T>(value: T): Option<T> {
  return isDef(value) ? Some(value) : None;
} as OptionObject;

OptionObject.all = (arr: any[]): any => {
  const values: any[] = [];

  for (let i = 0; i < arr.length; i++) {
    let value = arr[i];
    if (Option.isOption(value)) value = value.get();
    if (!isDef(value)) return None;
    values.push(value);
  }

  return Some(values);
};

OptionObject.isOption = function (value: any): value is Option<{}> {
  return !!value && (value.type === "some" || value.type === "none");
};

function makeNone() {
  const self: any = {};

  function returnNone() {
    return None;
  }
  function returnFalse() {
    return false;
  }

  self.type = "none";
  self.Option = OptionObject;
  self.get = (): undefined => undefined;
  self.isDefined = returnFalse;
  self.forEach = () => {};
  self.map = returnNone;
  self.flatMap = returnNone;
  self.filter = returnNone;
  self.fold = (ifEmpty: Function) => ifEmpty();
  self.orElse = (alt: Function) => alt();
  self.getOrElse = (alt: any) => alt;
  self.contains = returnFalse;
  self.exists = returnFalse;
  self.toArray = (): Array<undefined> => [];
  self.toResult = (ifNone: Function) => Err(ifNone());
  self.toString = () => "None";
  self.toJSON = (): null => null;

  self[iteratorSymbol] = function () {
    return {
      next() {
        return { done: true };
      },
    };
  };

  return self as None;
}

function _Some<T>(this: Some<T> & { value: T }, value: T) {
  this.value = value;
}

_Some.prototype = {
  type: "some",

  Option: OptionObject,

  get() {
    return this.value;
  },

  isDefined() {
    return true;
  },

  forEach(fn: any) {
    fn(this.value);
  },

  map(fn: any): any {
    return Option(fn(this.value));
  },

  flatMap(fn: any) {
    return fn(this.value);
  },

  filter(fn: any) {
    return fn(this.value) ? this : None;
  },

  fold(ifEmpty: any, ifDefined: any) {
    return ifDefined(this.value);
  },

  orElse() {
    return this;
  },

  getOrElse() {
    return this.value;
  },

  contains(value: any) {
    return this.value === value;
  },

  exists(predicate: any) {
    return predicate(this.value);
  },

  toArray() {
    return [this.value];
  },

  toResult() {
    return Ok(this.value);
  },

  toString() {
    return `Some(${this.value})`;
  },

  toJSON() {
    return this.value.toJSON ? this.value.toJSON() : this.value;
  },

  // @ts-ignore We don't know the type of 'self'
  [iteratorSymbol]: singleValueIterator((self) => self.value),
};

function isDef<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export const Option = OptionObject;

/** Creates a new Some instance using a non nullable value */
// extends {} to prevent null and undefined being passed
export function Some<T extends {}>(value: T): Some<T> {
  return new (_Some as any)(value);
}

export const None = makeNone();
