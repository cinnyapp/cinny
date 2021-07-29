export const iteratorSymbol =
  (typeof Symbol === "function" && Symbol.iterator) || "@@iterator";

export function singleValueIterator(getValue: (self: any) => any) {
  return function (this: any) {
    let done = false;
    const value = getValue(this);

    return {
      next() {
        if (done) return { done: true };

        done = true;
        return { value, done: false };
      },
    };
  };
}
