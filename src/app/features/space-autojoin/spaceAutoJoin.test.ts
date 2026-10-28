import { describe, expect, it } from 'vitest';
import { HierarchyRoom, roomsToAutoJoin } from './spaceAutoJoin';

const child = (roomId: string, via = ['example.org']) => ({
  state_key: roomId,
  content: { via },
});

const rooms: HierarchyRoom[] = [
  {
    room_id: '!space',
    join_rule: 'invite',
    children_state: [child('!general'), child('!voice'), child('!sub'), child('!secret')],
  },
  { room_id: '!general', join_rule: 'restricted', children_state: [] },
  { room_id: '!voice', join_rule: 'public', children_state: [] },
  { room_id: '!sub', join_rule: 'restricted', children_state: [child('!inner', ['other.org'])] },
  { room_id: '!secret', join_rule: 'invite', children_state: [] },
  { room_id: '!inner', join_rule: 'knock_restricted', children_state: [] },
];

describe('roomsToAutoJoin', () => {
  it('joins the rooms and sub-spaces anyone in the space may join, parents first', () => {
    expect(roomsToAutoJoin(rooms, '!space', () => false)).toEqual([
      { roomId: '!general', via: ['example.org'] },
      { roomId: '!voice', via: ['example.org'] },
      { roomId: '!sub', via: ['example.org'] },
      { roomId: '!inner', via: ['other.org'] },
    ]);
  });

  it('skips rooms the caller says to skip', () => {
    const joined = new Set(['!general', '!sub']);
    expect(roomsToAutoJoin(rooms, '!space', (id) => joined.has(id)).map((r) => r.roomId)).toEqual([
      '!voice',
      '!inner',
    ]);
  });

  it('ignores rooms that no space in the list points to', () => {
    const stray = [...rooms, { room_id: '!stray', join_rule: 'public', children_state: [] }];
    expect(roomsToAutoJoin(stray, '!space', () => false).map((r) => r.roomId)).not.toContain(
      '!stray'
    );
  });
});
