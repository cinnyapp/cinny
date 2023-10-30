export const findAndReplace = <P, Q>(
  text: string,
  regex: RegExp,
  replace: (match: RegExpExecArray, pushIndex: number) => P | P[],
  convertPart: (txt: string, pushIndex: number) => Q | Q[]
): Array<P | Q> => {
  const result: Array<P | Q> = [];
  let lastEnd = 0;

  let match: RegExpExecArray | null = regex.exec(text);
  while (match !== null) {
    const prevResult = convertPart(text.slice(lastEnd, match.index), result.length);
    if (Array.isArray(prevResult)) result.push(...prevResult);
    else result.push(prevResult);
    const replaceResult = replace(match, result.length);
    if (Array.isArray(replaceResult)) result.push(...replaceResult);
    else result.push(replaceResult);

    lastEnd = regex.lastIndex;
    match = regex.exec(text);
  }

  const remainingResult = convertPart(text.slice(lastEnd), result.length);
  if (Array.isArray(remainingResult)) result.push(...remainingResult);
  else result.push(remainingResult);

  return result;
};
