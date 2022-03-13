import initMatrix from '../../../client/initMatrix';

function AtoZ(aId, bId) {
  let aName = initMatrix.matrixClient.getRoom(aId).name;
  let bName = initMatrix.matrixClient.getRoom(bId).name;

  // remove "#" from the room name
  // To ignore it in sorting
  aName = aName.replaceAll('#', '');
  bName = bName.replaceAll('#', '');

  if (aName.toLowerCase() < bName.toLowerCase()) {
    return -1;
  }
  if (aName.toLowerCase() > bName.toLowerCase()) {
    return 1;
  }
  return 0;
}

const RoomToDM = (aId, bId) => {
  const { directs } = initMatrix.roomList;
  const aIsDm = directs.has(aId);
  const bIsDm = directs.has(bId);
  if (aIsDm && !bIsDm) return 1;
  if (!aIsDm && bIsDm) return -1;
  return 0;
};

export { AtoZ, RoomToDM };
