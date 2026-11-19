/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

export type ReplaceCallback<R> = (
  match: RegExpExecArray | RegExpMatchArray,
  pushIndex: number
) => R;
export type ConvertPartCallback<R> = (text: string, pushIndex: number) => R;

export const findAndReplace = <ReplaceReturnType, ConvertReturnType>(
  text: string,
  regex: RegExp,
  replace: ReplaceCallback<ReplaceReturnType>,
  convertPart: ConvertPartCallback<ConvertReturnType>
): Array<ReplaceReturnType | ConvertReturnType> => {
  const result: Array<ReplaceReturnType | ConvertReturnType> = [];
  let lastEnd = 0;

  let match: RegExpExecArray | RegExpMatchArray | null = regex.exec(text);
  while (match !== null && typeof match.index === 'number') {
    result.push(convertPart(text.slice(lastEnd, match.index), result.length));
    result.push(replace(match, result.length));

    lastEnd = match.index + match[0].length;
    if (regex.global) match = regex.exec(text);
  }

  result.push(convertPart(text.slice(lastEnd), result.length));

  return result;
};
