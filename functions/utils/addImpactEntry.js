const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const { IMPACT_RULES } = require("./constants/impactRules");
const { checkForNewBadge } = require("./checkForNewBadge");

exports.addImpactEntry = async function (userId, type, summary) {
  try {
    const points = IMPACT_RULES[type] || 0;

    if (!points) {
      console.log(`⚠️ No rule found for type: ${type}`);
      return;
    }

    // 1 Add entry
    await db.collection("impactEntries").add({
      userId,
      type,
      summary,
      points,
      createdAt: admin.firestore.Timestamp.now(),
      source: "auto",
    });

    // 2️ Update total points
    const userRef = db.collection("users").doc(userId);
    await userRef.update({
      totalPoints: admin.firestore.FieldValue.increment(points),
    });

    // 3️ Check for badges
    const userSnap = await userRef.get();
    const total = userSnap.data().totalPoints;
    await checkForNewBadge(userId, total);

    console.log(`✅ ${userId} gained ${points} pts for ${type}`);
  } catch (err) {
    console.error("❌ Error adding impact entry:", err);
  }
};
