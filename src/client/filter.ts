import { Filter, RoomEventFilter } from 'neurone/lib/api/types';
import { MessageEvent } from '../types/matrix/room';

export const getInitialSyncFilter = (): Filter => {
  const filter: Filter = {
    room: {
      state: {
        lazy_load_members: true,
      },
      timeline: {
        unread_thread_notifications: true,
      },
    },
  };

  return filter;
};

export const getSyncFilter = (): Filter => {
  const filter: Filter = {
    room: {
      timeline: {
        unread_thread_notifications: true,
      },
    },
  };

  return filter;
};

export const getLatestEventSyncFilter = (): Filter => {
  const filter: Filter = {
    account_data: {
      not_types: ['*'],
    },
    presence: {
      not_types: ['*'],
    },
    room: {
      account_data: {
        not_types: ['*'],
      },
      ephemeral: {
        not_types: ['*'],
      },
      state: {
        not_types: ['*'],
      },
      timeline: {
        types: [MessageEvent.RoomMessage, MessageEvent.RoomMessageEncrypted, MessageEvent.Sticker],
        limit: 1,
      },
    },
  };

  return filter;
};

export const getMessagesFilter = (): RoomEventFilter => {
  const filter: RoomEventFilter = {
    types: [
      MessageEvent.RoomMessage,
      MessageEvent.RoomMessageEncrypted,
      MessageEvent.Sticker,
      MessageEvent.Reaction,
    ],
  };

  return filter;
};
