import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../../firebaseConfig";

const Tab = createMaterialTopTabNavigator();

export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // viewing another user's profile
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const ref = doc(db, "users", id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) setProfile(snap.data());
        else setProfile(null);
        setLoading(false);
      },
      (err) => {
        console.error("Error loading profile:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color="#ea5b70" size="large" />
          <Text style={{ color: "#999", marginTop: 8 }}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Text style={{ color: "#999" }}>User not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = profile?.fullName || profile?.name || "Unnamed User";
  const displayBio = profile?.bio || "No bio added yet.";
  const displayLocation = profile?.location || "—";
  const isVerified = profile?.isVerified || false;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      {/* 🔹 Header Bar */}
      <View style={styles.topHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.topHeaderTitle}>Seller Profile</Text>
      </View>

      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.headerWrapper}>
          <View style={styles.header}>
            {/* Profile Row */}
            <View style={styles.profileRow}>
              {/* Image */}
              <View style={styles.profileImageContainer}>
                <Image
                  source={{
                    uri:
                      profile?.photoURL ||
                      profile?.avatarUrl ||
                      "https://i.pravatar.cc/150?img=4",
                  }}
                  style={styles.profileImage}
                />
                <View style={styles.profileImageBorder} />
                {isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <View style={styles.locationRow}>
                  <View style={styles.locationBadge}>
                    <Ionicons
                      name="location"
                      size={12}
                      color="#ea5b70"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.profileLocation}>{displayLocation}</Text>
                  </View>
                </View>
                <Text style={styles.profileBio} numberOfLines={2}>
                  {displayBio}
                </Text>
              </View>
            </View>

            {/* Current Badge */}
            {profile?.currentBadge && (
              <View style={styles.currentBadgeRow}>
                <Ionicons name="trophy-outline" size={18} color="#ea5b70" />
                <Text style={styles.currentBadgeText}>
                  {profile.currentBadge}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabsContainer}>
          <PublicProfileTabs userId={id} />
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ----------------------
   Tabs
----------------------- */
function PublicProfileTabs({ userId }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#fff",
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: "#f0f0f0",
        },
        tabBarIndicatorStyle: {
          backgroundColor: "#ea5b70",
          height: 3,
          borderRadius: 3,
        },
        tabBarActiveTintColor: "#ea5b70",
        tabBarInactiveTintColor: "#999",
        tabBarLabelStyle: {
          fontWeight: "600",
          fontSize: 13,
          textTransform: "none",
        },
        lazy: true,
        sceneStyle: { backgroundColor: "#fafafa" },
      }}
    >
      <Tab.Screen
        name="My Listings"
        children={() => <SellerListingsScreen userId={userId} />}
      />
      <Tab.Screen
        name="Community Impact"
        children={() => <PublicCommunityImpact userId={userId} />}
      />
    </Tab.Navigator>
  );
}

// Seller's Listings Tab
function SellerListingsScreen({ userId }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) fetchSellerListings(userId);
  }, [userId]);

  async function fetchSellerListings(uid) {
    try {
      setLoading(true);
      const q = query(
        collection(db, "products"),
        where("ownerId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setListings(data);
    } catch (e) {
      console.error("Error loading seller listings:", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={listingStyles.center}>
        <ActivityIndicator color="#ea5b70" size="large" />
        <Text style={{ color: "#777", marginTop: 6 }}>Loading listings…</Text>
      </View>
    );
  }

  if (listings.length === 0) {
    return (
      <View style={listingStyles.center}>
        <Ionicons name="cube-outline" size={48} color="#bbb" />
        <Text style={{ color: "#999", marginTop: 8 }}>
          No products or services listed yet.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={listings}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      renderItem={({ item }) => (
        <View style={listingStyles.horizontalCard}>
          <Image
            source={{
              uri:
                item.imageUrl ||
                "https://via.placeholder.com/400x300.png?text=No+Image",
            }}
            style={listingStyles.thumb}
          />

          <View style={listingStyles.cardDetails}>
            <Text style={listingStyles.name} numberOfLines={1}>
              {item.name}
            </Text>

            <View style={listingStyles.categoryRow}>
              <View style={listingStyles.categoryBadge}>
                <Text style={listingStyles.categoryText}>
                  {item.category || "General"}
                </Text>
              </View>
              <Text style={listingStyles.price}>LKR {item.price}</Text>
            </View>

            <Text style={listingStyles.details} numberOfLines={2}>
              {item.details}
            </Text>

            <Text style={listingStyles.quantity}>
              Qty: {item.quantity ?? 1}
            </Text>
          </View>
        </View>
      )}
    />
  );
}

// Public Community Impact Tab
function PublicCommunityImpact({ userId }) {
  const [totalPoints, setTotalPoints] = useState(0);
  const [currentBadge, setCurrentBadge] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const ref = doc(db, "users", userId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setTotalPoints(d.totalPoints || 0);
          setCurrentBadge(d.currentBadge || null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error loading impact section:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [userId]);

  if (loading)
    return (
      <View style={impactStyles.center}>
        <ActivityIndicator size="large" color="#ea5b70" />
        <Text style={{ color: "#777", marginTop: 6 }}>
          Loading community impact…
        </Text>
      </View>
    );

  return (
    <View style={impactStyles.container}>
      <View style={impactStyles.pointsCard}>
        <Text style={impactStyles.pointsTitle}>Total Impact Points</Text>
        <Text style={impactStyles.pointsValue}>{totalPoints}</Text>
        <Text style={impactStyles.pointsNote}>
          Points reflect user’s verified contributions in LocalLoop.
        </Text>
      </View>

      <View style={impactStyles.currentBadgeCard}>
        <Text style={impactStyles.sectionTitle}>Current Badge</Text>
        {currentBadge ? (
          <View style={impactStyles.badgeBig}>
            <Ionicons name="trophy-outline" size={20} color="#ea5b70" />
            <Text style={impactStyles.badgeBigText}>{currentBadge}</Text>
          </View>
        ) : (
          <Text style={impactStyles.noBadges}>No badge assigned yet.</Text>
        )}
      </View>
    </View>
  );
}

/* ----------------------
   Listing Card Styles
----------------------- */
const listingStyles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  horizontalCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f1f1f1",
  },
  thumb: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: "#f8f8f8",
  },
  cardDetails: {
    flex: 1,
    justifyContent: "space-between",
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: "#ffe4ea",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryText: { color: "#ea5b70", fontWeight: "700", fontSize: 12 },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ea5b70",
  },
  details: {
    color: "#666",
    fontSize: 13,
    marginBottom: 4,
  },
  quantity: {
    color: "#999",
    fontSize: 12,
    marginTop: 2,
  },
});


/* ----------------------
   Impact Styles
----------------------- */
const impactStyles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  pointsCard: {
    backgroundColor: "#fff4f7",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  pointsTitle: { fontSize: 16, fontWeight: "700", color: "#333" },
  pointsValue: { fontSize: 48, fontWeight: "900", color: "#ea5b70" },
  pointsNote: {
    fontSize: 12,
    color: "#777",
    textAlign: "center",
    marginTop: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#333" },
  currentBadgeCard: {
    backgroundColor: "#fff9fa",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  badgeBig: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#ffe4ea",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  badgeBigText: {
    color: "#ea5b70",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 8,
  },
  noBadges: { color: "#888", fontStyle: "italic", marginTop: 6 },
});

/* ----------------------
   Main Profile Styles
----------------------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafafa" },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ea5b70",
    paddingTop: 55,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: { padding: 4, marginRight: 10 },
  topHeaderTitle: { color: "#fff", fontSize: 24, fontWeight: "700" },
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerWrapper: { backgroundColor: "#fafafa", overflow: "hidden" },
  header: { paddingTop: 25, paddingHorizontal: 20, paddingBottom: 20 },
  profileRow: { flexDirection: "row", gap: 16, marginBottom: 12 },
  profileImageContainer: { position: "relative" },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#fff",
  },
  profileImageBorder: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    borderColor: "#ea5b70",
    top: -3,
    left: -3,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: -4,
    backgroundColor: "#55b058",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: "#fff",
  },
  verifiedBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  profileInfo: { flex: 1, justifyContent: "center" },
  profileName: { fontSize: 22, fontWeight: "800", color: "#1a1a1a" },
  locationRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff0f3",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ffd4dc",
  },
  profileLocation: { fontSize: 12, color: "#ea5b70", fontWeight: "600" },
  profileBio: { fontSize: 14, color: "#666", lineHeight: 20 },
  currentBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#ffe4ea",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  currentBadgeText: { color: "#ea5b70", fontWeight: "700", marginLeft: 6 },
  tabsContainer: { flex: 1, minHeight: 0 },
});