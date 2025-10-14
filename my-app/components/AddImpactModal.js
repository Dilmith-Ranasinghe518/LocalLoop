import { useEffect, useState } from "react";
import { Picker } from "@react-native-picker/picker";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { db } from "../firebaseConfig";

// 🧮 Simple point rules
const POINT_RULES = {
  event_listing: 5,
  product_listing: 10,
  sell_product: 15,
  sell_event_ticket: 20,
  buy_product: 5,
  buy_event_ticket: 8,
};

// 🏅 Badge thresholds
const BADGES = [
  { name: "Newbie", threshold: 0 },
  { name: "Contributor", threshold: 50 },
  { name: "Top Seller", threshold: 200 },
  { name: "Eco Warrior", threshold: 500 },
  { name: "Legend", threshold: 1000 },
];

export default function AddImpactModal({
  visible,
  onClose,
  refreshList,
  existingEntry = null, // 🆕 optional prop for editing
}) {
  const [type, setType] = useState(existingEntry?.type || "");
  const [summary, setSummary] = useState(existingEntry?.summary || "");
  const [loading, setLoading] = useState(false);
  const user = getAuth().currentUser;

  // 🧩 Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setType(existingEntry?.type || "");
      setSummary(existingEntry?.summary || "");
    }
  }, [visible, existingEntry]);

  // 🧠 Local badge check logic (same as backend)
  const checkForNewBadge = async (userRef, newTotalPoints) => {
    try {
      console.log("🏅 checkForNewBadge running, totalPoints:", newTotalPoints);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return console.log("❌ User not found for badge check.");

      const data = snap.data();
      const earned = Array.isArray(data.badgesEarned) ? data.badgesEarned : [];
      const achievements = Array.isArray(data.achievements)
        ? data.achievements
        : [];

      // Find new badges that the user hasn’t earned yet
      const newlyUnlocked = BADGES.filter(
        (b) => newTotalPoints >= b.threshold && !earned.includes(b.name)
      );

      console.log("🧩 Newly unlocked badges:", newlyUnlocked);

      if (newlyUnlocked.length === 0) return;

      const latest = newlyUnlocked[newlyUnlocked.length - 1];

      const newAchievement = {
        name: latest.name,
        unlockedAt: new Date().toISOString(), // safer for Expo Go
        pointsAtUnlock: newTotalPoints,
      };

      // Build clean update object
      const updateData = {
        currentBadge: latest.name,
        badgesEarned: [...earned, latest.name],
        lastBadgeUnlockedAt: new Date().toISOString(),
        achievements: [...achievements, newAchievement],
      };

      console.log("📝 Updating user doc with:", updateData);

      await updateDoc(userRef, updateData);

      console.log(`🎖 Badge unlocked successfully → ${latest.name}`);
    } catch (e) {
      console.error("❌ checkForNewBadge crashed:", e);
    }
  };

  // 🟢 Add / Edit handler
  const handleSubmit = async () => {
    try {
      console.log("🟢 handleSubmit called. type:", type, "summary:", summary);
      if (!type || !summary.trim()) {
        Alert.alert("Missing info", "Please select a type and enter a short description.");
        return;
      }

      const points = POINT_RULES[type] || 0;
      console.log("🟢 Points calculated:", points);

      const userRef = doc(db, "users", user.uid);
      console.log("🟢 Adding doc to impactEntries...");

      await addDoc(collection(db, "impactEntries"), {
        userId: user.uid,
        type,
        summary,
        points,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: "manual",
      });

      console.log("✅ Impact entry added successfully. Updating user totalPoints...");
      await updateDoc(userRef, { totalPoints: increment(points) });
      console.log("✅ User totalPoints incremented.");

      const snap = await getDoc(userRef);
      const totalPoints = snap.data()?.totalPoints || 0;
      console.log("🟢 Fetched totalPoints:", totalPoints);
      await checkForNewBadge(userRef, totalPoints);

      Alert.alert("Success", `Impact added! +${points} pts`);
      onClose();
      setType("");
      setSummary("");
      refreshList && refreshList();
    } catch (err) {
      console.error("❌ Global error in handleSubmit:", err);
      Alert.alert("Error", "Could not add impact. Check console logs.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>
            {existingEntry ? "Edit Community Impact" : "Add Community Impact"}
          </Text>

          <Text style={styles.label}>Activity Type</Text>
          <Picker
            selectedValue={type}
            onValueChange={(value) => setType(value)}
            style={styles.picker}
          >
            <Picker.Item label="Select type..." value="" />
            <Picker.Item label="Event Listing" value="event_listing" />
            <Picker.Item label="Product Listing" value="product_listing" />
            <Picker.Item label="Sell Product" value="sell_product" />
            <Picker.Item label="Sell Event Ticket" value="sell_event_ticket" />
            <Picker.Item label="Buy Product" value="buy_product" />
            <Picker.Item label="Buy Event Ticket" value="buy_event_ticket" />
          </Picker>

          <Text style={styles.label}>Points Earned</Text>
          <TextInput
            value={String(POINT_RULES[type] || 0)}
            editable={false}
            style={[styles.input, { backgroundColor: "#f5f5f5", color: "#333" }]}
          />

          <Text style={styles.label}>Short Description</Text>
          <TextInput
            placeholder="E.g. Listed a handmade bag"
            value={summary}
            onChangeText={setSummary}
            style={styles.input}
          />

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, { backgroundColor: "#ccc" }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={[styles.button, { backgroundColor: "#cdb74d" }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading
                  ? "Saving..."
                  : existingEntry
                  ? "Update"
                  : "Save"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },
  label: {
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
