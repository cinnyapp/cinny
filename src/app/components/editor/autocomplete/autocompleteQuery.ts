import { BaseRange, Editor } from 'slate';

export enum AutocompletePrefix {
  RoomMention = '#',
  UserMention = '@',
  Emoticon = ':',
}
export const AUTOCOMPLETE_PREFIXES: readonly AutocompletePrefix[] = [
  AutocompletePrefix.RoomMention,
  AutocompletePrefix.UserMention,
  AutocompletePrefix.Emoticon,
];

export type AutocompleteQuery<TPrefix extends string> = {
  range: BaseRange;
  prefix: TPrefix;
  text: string;
};

export const getAutocompletePrefix = <TPrefix extends string>(
  editor: Editor,
  queryRange: BaseRange,
  validPrefixes: readonly TPrefix[]
): TPrefix | undefined => {
  const world = Editor.string(editor, queryRange);
  const prefix = world[0] as TPrefix | undefined;
  if (!prefix) return undefined;
  return validPrefixes.includes(prefix) ? prefix : undefined;
};

export const getAutocompleteQueryText = (editor: Editor, queryRange: BaseRange): string =>
  Editor.string(editor, queryRange).slice(1);

export const getAutocompleteQuery = <TPrefix extends string>(
  editor: Editor,
  queryRange: BaseRange,
  validPrefixes: readonly TPrefix[]
): AutocompleteQuery<TPrefix> | undefined => {
  const prefix = getAutocompletePrefix(editor, queryRange, validPrefixes);
  if (!prefix) return undefined;
  return {
    range: queryRange,
    prefix,
    text: getAutocompleteQueryText(editor, queryRange),
  };
};
