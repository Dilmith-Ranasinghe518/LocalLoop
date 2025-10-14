import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AddImpactButton from "../../components/AddImpactButton";
import { db } from "../../firebaseConfig";
import AchievementProgressCard from "../../components/AchievementProgressCard";

export default function CommunityImpactScreen() {
  const [impactEntries, setImpactEntries] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const user = getAuth().currentUser;
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (user) fetchCommunityImpact(user.uid);
    }, [user])
  );

  async function fetchCommunityImpact(uid) {
    try {
      setLoading(true);
      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setTotalPoints(userData.totalPoints || 0);
      }

      const q = query(
        collection(db, "impactEntries"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc"),
        limit(4)
      );
      const querySnapshot = await getDocs(q);
      const entries = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setImpactEntries(entries);
    } catch (err) {
      console.error("Error fetching community impact:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.tabBody, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#FF5A7B" />
        <Text style={{ marginTop: 8, color: "#777" }}>Loading community impact...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 10 }}
      >
        <View style={styles.tabBody}>
          {/* 🔹 Total Impact Points Card */}
          <View style={styles.pointsCard}>
            <View style={styles.pointsTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pointsLabel}>Total Impact Points</Text>
                <Text style={styles.pointsSubtext}>
                  Earn points from your sales, services, and event participation.
                </Text>
              </View>
              <Text style={styles.pointsBig}>{totalPoints}</Text>
            </View>

            <Pressable
              style={styles.viewMoreBtn}
              onPress={() => router.push(`/CommunityImpactDetails/${user.uid}`)}
            >
              <Ionicons name="heart" size={18} color="#fff" />
              <Text style={styles.viewMoreText}>View More Details</Text>
            </Pressable>
          </View>

          {/* 🔸 Achievements */}
          <Text style={styles.sectionHeading}>Your Achievements</Text>

          <AchievementProgressCard
            currentPoints={totalPoints}
            badges={[
              { name: "Newbie", points: 0, next: 50 },
              { name: "Contributor", points: 50, next: 200 },
              { name: "Top Seller", points: 200, next: 500 },
              { name: "Eco Warrior", points: 500, next: 1000 },
            ]}
            onViewAll={() => router.push(`/CommunityImpactDetails/${user.uid}`)}
          />

          {/* 🔹 Impact Timeline */}
          <View style={{ marginTop: 16 }}>
            <View style={styles.timelineHeaderRow}>
              <Text style={styles.header}>Impact Timeline</Text>
              <Pressable
                onPress={() => router.push(`/CommunityImpactDetails/${user.uid}`)}
              >
                <Text style={styles.viewMoreLink}>View More Details</Text>
              </Pressable>
            </View>

            {impactEntries.length === 0 ? (
              <Text style={{ color: "#777", textAlign: "center", marginTop: 16 }}>
                No impact entries yet.
              </Text>
            ) : (
              <FlatList
                data={impactEntries}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.entryCard}>
                    <View style={styles.entryIcon}>
                      <Ionicons name="trophy-outline" size={22} color="#FF5A7B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.entrySummary}>{item.summary}</Text>
                      <Text style={styles.entryMeta}>
                        Type: {item.type} • +{item.points} pts
                      </Text>
                      <Text style={styles.entryDate}>
                        {item.createdAt?.toDate
                          ? item.createdAt.toDate().toLocaleDateString()
                          : ""}
                      </Text>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* 🟢 Floating Add Button */}
      <View style={styles.fabContainer}>
        <AddImpactButton refreshList={() => fetchCommunityImpact(user.uid)} />
      </View>
    </View>
  );
}

/* ----------------------
   Styles
----------------------- */
const styles = StyleSheet.create({
  tabBody: {
    backgroundColor: "#fff",
  },
  fabContainer: {
    position: "absolute",
    bottom: 8,
    right: 5,
    zIndex: 999,
    elevation: 6,
  },

  // 🔸 Impact Points Card
  pointsCard: {
    backgroundColor: "#FFF3CD",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  pointsTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pointsLabel: { fontSize: 15, fontWeight: "700", color: "#333" },
  pointsSubtext: {
    fontSize: 12,
    color: "#555",
    marginTop: 4,
    maxWidth: "80%",
  },
  pointsBig: {
    fontSize: 52,
    fontWeight: "900",
    color: "#FF5A7B",
    marginLeft: 8,
  },

  // 🔸 View More Button
  viewMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5A7B",
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 14,
  },
  viewMoreText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 6,
  },

  // 🔹 Achievements
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },

  // 🔹 Timeline
  header: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  timelineHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  viewMoreLink: {
    fontSize: 14,
    color: "#FF5A7B",
    fontWeight: "700",
  },
  entryCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fafafa",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff6e5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  entrySummary: { fontSize: 16, fontWeight: "600", color: "#222" },
  entryMeta: { fontSize: 13, color: "#666", marginTop: 2 },
  entryDate: { fontSize: 12, color: "#999", marginTop: 4 },
});
