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
  return validPrefixes.find((p) => world.startsWith(p));
};

export const getAutocompleteQueryText = (
  editor: Editor,
  queryRange: BaseRange,
  prefix: string
): string => Editor.string(editor, queryRange).slice(prefix.length);

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
    text: getAutocompleteQueryText(editor, queryRange, prefix),
  };
};
