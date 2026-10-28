// People on several devices are in the call once.
export const uniqueCallUserIds = (members: { userId?: string }[]): string[] => [
  ...new Set(members.map((m) => m.userId).filter((id): id is string => !!id)),
];
