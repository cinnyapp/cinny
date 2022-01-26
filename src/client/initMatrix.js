import EventEmitter from 'events';
import * as sdk from 'matrix-js-sdk';
// import { logger } from 'matrix-js-sdk/lib/logger';

import { secret } from './state/auth';
import RoomList from './state/RoomList';
import RoomsInput from './state/RoomsInput';
import Notifications from './state/Notifications';
import { initHotkeys } from './event/hotkeys';
import { initRoomListListener } from './event/roomList';

global.Olm = require('@matrix-org/olm');

// logger.disableAll();

class InitMatrix extends EventEmitter {
  async init() {
    await this.startClient();
    this.setupSync();
    this.listenEvents();
  }

  async startClient() {
    const indexedDBStore = new sdk.IndexedDBStore({
      indexedDB: global.indexedDB,
      localStorage: global.localStorage,
      dbName: 'web-sync-store',
    });
    await indexedDBStore.startup();

    this.matrixClient = sdk.createClient({
      baseUrl: secret.baseUrl,
      accessToken: secret.accessToken,
      userId: secret.userId,
      store: indexedDBStore,
      sessionStore: new sdk.WebStorageSessionStore(global.localStorage),
      cryptoStore: new sdk.IndexedDBCryptoStore(global.indexedDB, 'crypto-store'),
      deviceId: secret.deviceId,
      timelineSupport: true,
    });

    await this.matrixClient.initCrypto();

    await this.matrixClient.startClient({
      lazyLoadMembers: true,
    });
    this.matrixClient.setGlobalErrorOnUnknownDevices(false);
  }

  setupSync() {
    const sync = {
      NULL: () => {
        console.log('NULL state');
      },
      SYNCING: () => {
        console.log('SYNCING state');
      },
      PREPARED: (prevState) => {
        console.log('PREPARED state');
        console.log('previous state: ', prevState);
        // TODO: remove global.initMatrix at end
        global.initMatrix = this;
        if (prevState === null) {
          this.roomList = new RoomList(this.matrixClient);
          this.roomsInput = new RoomsInput(this.matrixClient);
          this.notifications = new Notifications(this.roomList);
          initHotkeys();
          initRoomListListener(this.roomList);
          this.emit('init_loading_finished');
        }
      },
      RECONNECTING: () => {
        console.log('RECONNECTING state');
      },
      CATCHUP: () => {
        console.log('CATCHUP state');
      },
      ERROR: () => {
        console.log('ERROR state');
      },
      STOPPED: () => {
        console.log('STOPPED state');
      },
    };
    this.matrixClient.on('sync', (state, prevState) => sync[state](prevState));
  }

  listenEvents() {
    this.matrixClient.on('Session.logged_out', () => {
      this.matrixClient.stopClient();
      this.matrixClient.clearStores();
      window.localStorage.clear();
      window.location.reload();
    });
  }
}

const initMatrix = new InitMatrix();

export default initMatrix;
