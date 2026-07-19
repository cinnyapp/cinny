import { AccountDataEvent } from 'neurone/lib/api/types';
import { putAccountData } from 'neurone/lib/api/matrix/client/v3/user';
import { IEmoji, emojis } from './emoji';
import { ClientContext } from '../../client/context';
import { AccountDataType } from '../../types/matrix/accountData';

type EmojiUnicode = string;
type EmojiUsageCount = number;

export type IRecentEmojiContent = {
  recent_emoji?: Array<[EmojiUnicode, EmojiUsageCount]>;
};

const parseRecentEmojis = (content: object): Array<[EmojiUnicode, EmojiUsageCount]> => {
  if (!('recent_emoji' in content)) return [];
  const { recent_emoji: recentEmoji } = content;
  if (!Array.isArray(recentEmoji)) return [];

  return recentEmoji.filter(
    (i) =>
      Array.isArray(i) && i.length === 2 && typeof i[0] === 'string' && typeof i[1] === 'number'
  );
};

export const getRecentEmojis = (event: AccountDataEvent, limit?: number): IEmoji[] => {
  const recentEmoji = parseRecentEmojis(event.content);

  return recentEmoji
    .sort((i1, i2) => i2[1] - i1[1])
    .slice(0, limit)
    .reduce<IEmoji[]>((list, [unicode]) => {
      const emoji = emojis.find((e) => e.unicode === unicode);
      if (emoji) list.push(emoji);
      return list;
    }, []);
};

export async function addRecentEmoji(ct: ClientContext, unicode: string) {
  const recentEmojiObj = await ct.storage.accountData.read.get(AccountDataType.ElementRecentEmoji);
  const recentEmoji = parseRecentEmojis(recentEmojiObj?.event.content ?? {});

  const emojiIndex = recentEmoji.findIndex(([u]) => u === unicode);
  let entry: [EmojiUnicode, EmojiUsageCount];
  if (emojiIndex < 0) {
    entry = [unicode, 1];
  } else {
    [entry] = recentEmoji.splice(emojiIndex, 1);
    entry[1] += 1;
  }
  recentEmoji.unshift(entry);

  const newContent: IRecentEmojiContent = {
    recent_emoji: recentEmoji.slice(0, 100),
  };

  await ct.requestAuthJSON(
    putAccountData({
      pathParams: {
        userId: ct.session.userId,
        type: AccountDataType.ElementRecentEmoji,
      },
      body: newContent,
    })
  );
}
