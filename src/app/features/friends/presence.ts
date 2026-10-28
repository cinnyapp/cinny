export const isOnline = (presence?: string): boolean =>
  presence === 'online' || presence === 'unavailable';

export const sortFriends = <T extends { userId: string }>(
  friends: T[],
  presenceOf: (userId: string) => string | undefined,
  nameOf: (userId: string) => string
): T[] =>
  [...friends].sort((a, b) => {
    const onlineDiff =
      Number(isOnline(presenceOf(b.userId))) - Number(isOnline(presenceOf(a.userId)));
    if (onlineDiff !== 0) return onlineDiff;
    return nameOf(a.userId).localeCompare(nameOf(b.userId), undefined, { sensitivity: 'base' });
  });
