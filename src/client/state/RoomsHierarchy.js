import { RoomHierarchy } from 'matrix-js-sdk/lib/room-hierarchy';

class RoomsHierarchy {
  constructor(matrixClient, limit = 20, maxDepth = 1, suggestedOnly = false) {
    this.matrixClient = matrixClient;
    this._maxDepth = maxDepth;
    this._suggestedOnly = suggestedOnly;
    this._limit = limit;

    this.roomIdToHierarchy = new Map();
  }

  getHierarchy(roomId) {
    return this.roomIdToHierarchy.get(roomId);
  }

  removeHierarchy(roomId) {
    return this.roomIdToHierarchy.delete(roomId);
  }

  canLoadMore(roomId) {
    const roomHierarchy = this.getHierarchy(roomId);
    if (!roomHierarchy) return true;
    return roomHierarchy.canLoadMore;
  }

  async load(roomId, limit = this._limit) {
    let roomHierarchy = this.getHierarchy(roomId);

    if (!roomHierarchy) {
      const room = this.matrixClient.getRoom(roomId);
      if (!room) return null;
      roomHierarchy = new RoomHierarchy(room, limit, this._maxDepth, this._suggestedOnly);
      this.roomIdToHierarchy.set(roomId, roomHierarchy);
    }

    try {
      await roomHierarchy.load(limit);
      return roomHierarchy.rooms;
    } catch {
      return roomHierarchy.rooms;
    }
  }
}

export default RoomsHierarchy;
