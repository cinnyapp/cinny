export type ReplaceCallback<R> = (match: RegExpExecArray, pushIndex: number) => R;
export type ConvertPartCallback<R> = (text: string, pushIndex: number) => R;

export const findAndReplace = <ReplaceReturnType, ConvertReturnType>(
  text: string,
  regex: RegExp,
  replace: ReplaceCallback<ReplaceReturnType>,
  convertPart: ConvertPartCallback<ConvertReturnType>
): Array<ReplaceReturnType | ConvertReturnType> => {
  const result: Array<ReplaceReturnType | ConvertReturnType> = [];
  let lastEnd = 0;

  let match: RegExpExecArray | null = regex.exec(text);
  while (match !== null) {
    result.push(convertPart(text.slice(lastEnd, match.index), result.length));
    result.push(replace(match, result.length));

    lastEnd = regex.lastIndex;
    match = regex.exec(text);
  }

  result.push(convertPart(text.slice(lastEnd), result.length));

  return result;
};
