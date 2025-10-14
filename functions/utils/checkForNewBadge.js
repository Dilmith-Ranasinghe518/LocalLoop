const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const BADGES = [
  { name: "Newbie", threshold: 0 },
  { name: "Contributor", threshold: 50 },
  { name: "Top Seller", threshold: 200 },
  { name: "Eco Warrior", threshold: 500 },
  { name: "Legend", threshold: 1000 },
];

exports.checkForNewBadge = async function (userId, newTotalPoints) {
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return;

  const userData = userSnap.data();
  const earned = userData.badgesEarned || [];

  const newlyUnlocked = BADGES.filter(
    (b) => newTotalPoints >= b.threshold && !earned.includes(b.name)
  );

  if (newlyUnlocked.length > 0) {
    const latest = newlyUnlocked[newlyUnlocked.length - 1];

    const { FieldValue, Timestamp } = admin.firestore;

    await userRef.update({
      currentBadge: latest.name,
      badgesEarned: FieldValue.arrayUnion(latest.name),
      lastBadgeUnlockedAt: Timestamp.now(),
      achievements: FieldValue.arrayUnion({
        name: latest.name,
        unlockedAt: Timestamp.now(),
        pointsAtUnlock: newTotalPoints,
      }),
    });

    console.log(`🎖 ${userId} unlocked new badge: ${latest.name}`);
  }
};
