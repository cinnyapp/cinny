// Each call to the gate starts a new request and returns a check that is true
// only while no later request has started. Used so a slow earlier refresh can't
// overwrite the result of a newer one.
export const createLatestGate = (): (() => () => boolean) => {
  let seq = 0;
  return () => {
    seq += 1;
    const mine = seq;
    return () => mine === seq;
  };
};
