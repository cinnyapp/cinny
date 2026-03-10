export type WithRequiredProp<Type extends object, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property];
};

// Represents a subset of T containing only the keys whose values extend V
export type FilterByValues<T extends object, V> = {
  [Property in keyof T as T[Property] extends V ? Property : never]: T[Property];
};
