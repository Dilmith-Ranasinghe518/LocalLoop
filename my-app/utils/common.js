// export const getRoomId = (userId1, userId2) =>{
//     const sortedIds = [userId1, userId2].sort();
//     const roomId = sortedIds.join('-');
//     return roomId;
// }

export const getRoomId = (userId1, userId2) => {
  if (!userId1 || !userId2) {
    console.warn("⚠️ Missing userId when creating roomId:", userId1, userId2);
    return null;
  }

  const sortedIds = [userId1, userId2].sort();
  const roomId = sortedIds.join('-');
  return roomId;
};
