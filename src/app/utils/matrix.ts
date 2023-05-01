export const matchMxId = (id: string): RegExpMatchArray | null =>
  id.match(/^([@!$+#])(\S+):(\S+)$/);

export const validMxId = (id: string): boolean => !!matchMxId(id);

export const getMxIdServer = (userId: string): string | undefined => matchMxId(userId)?.[3];

export const getMxIdLocalPart = (userId: string): string | undefined => matchMxId(userId)?.[2];
