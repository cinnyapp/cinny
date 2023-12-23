export type WithRequiredProp<Type extends object, Key extends keyof Type> = Type & {
  [Property in Key]-?: Type[Property];
};
