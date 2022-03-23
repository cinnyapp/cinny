import initMatrix from '../client/initMatrix';

export function roomIdByActivity(id1, id2) {
  const room1 = initMatrix.matrixClient.getRoom(id1);
  const room2 = initMatrix.matrixClient.getRoom(id2);

  return room2.getLastActiveTimestamp() - room1.getLastActiveTimestamp();
}

export function roomIdByAtoZ(aId, bId) {
  let aName = initMatrix.matrixClient.getRoom(aId).name;
  let bName = initMatrix.matrixClient.getRoom(bId).name;

  // remove "#" from the room name
  // To ignore it in sorting
  aName = aName.replace(/#/g, '');
  bName = bName.replace(/#/g, '');

  if (aName.toLowerCase() < bName.toLowerCase()) {
    return -1;
  }
  if (aName.toLowerCase() > bName.toLowerCase()) {
    return 1;
  }
  return 0;
}

export function memberByAtoZ(m1, m2) {
  const aName = m1.name;
  const bName = m2.name;

  if (aName.toLowerCase() < bName.toLowerCase()) {
    return -1;
  }
  if (aName.toLowerCase() > bName.toLowerCase()) {
    return 1;
  }
  return 0;
}
export function memberByPowerLevel(m1, m2) {
  const pl1 = m1.powerLevel;
  const pl2 = m2.powerLevel;

  if (pl1 > pl2) return -1;
  if (pl1 < pl2) return 1;
  return 0;
}
