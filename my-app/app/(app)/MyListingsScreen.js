// screens/MyListingsScreen.js
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { collection, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/authContext";
import { db } from "../../firebaseConfig";

export default function MyListingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // live query for current user's listings
  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    const qRef = query(collection(db, "products"), where("ownerId", "==", user.uid));
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        // newest first
        arr.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds ?? 0) * 1000;
          const tb = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds ?? 0) * 1000;
          return tb - ta;
        });
        setItems(arr);
        setLoading(false);
      },
      (e) => {
        console.error("MyListings listen failed:", e);
        setItems([]);
        setLoading(false);
      }
    );
    return unsub;
  }, [user?.uid]);

  const openDetails = (id) => {
    router.push({ pathname: "/(app)/listing/[id]", params: { id } });
  };

  const confirmDelete = (id, name = "this listing") => {
    Alert.alert(
      "Delete listing",
      `Are you sure you want to delete “${name}”? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "products", id));
            } catch (e) {
              Alert.alert("Error", e?.message || "Failed to delete.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderItem = ({ item }) => (
    <Pressable style={styles.listingCard} onPress={() => openDetails(item.id)}>
      <Image
        source={{
          uri: item.imageUrl || "https://via.placeholder.com/100x100.png?text=No+Image",
        }}
        style={styles.listingImage}
      />

      <View style={{ flex: 1 }}>
        <Text style={styles.listingName} numberOfLines={1}>
          {item.name || "Unnamed product"}
        </Text>

        <Text style={styles.listingDetails} numberOfLines={1}>
          {item.details || ""}
        </Text>

        <View style={styles.bottomRow}>
          <Text style={styles.listingPrice}>
            {typeof item.price === "number" ? `LKR ${item.price}` : "LKR —"}
          </Text>

          <View style={styles.badgesRow}>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>
                {item.status === "active" ? "Active" : "Inactive"}
              </Text>
            </View>

            {/* inline delete button */}
            <Pressable
              onPress={() => confirmDelete(item.id, item.name || "this listing")}
              hitSlop={8}
              style={styles.trashBtn}
            >
              <Ionicons name="trash-outline" size={18} color="#ea5b70" />
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.tabBody}>
        <ActivityIndicator color="#ea5b70" size="large" />
        <Text style={styles.loadingText}>Loading your listings…</Text>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={styles.tabBody}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="basket-outline" size={64} color="#ddd" />
          </View>
          <Text style={styles.emptyTitle}>No Listings Yet</Text>
          <Text style={styles.emptySubtext}>
            You haven’t published anything yet. Start sharing!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(it) => it.id}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      nestedScrollEnabled
    />
  );
}

const styles = StyleSheet.create({
  tabBody: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#999", marginTop: 8 },

  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyIconContainer: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: "#f8f8f8",
    justifyContent: "center", alignItems: "center", marginBottom: 20,
    borderWidth: 2, borderColor: "#f0f0f0",
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: "#333", marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: "#999", textAlign: "center", paddingHorizontal: 40 },

  // Card
  listingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  listingImage: {
    width: 70, height: 70, borderRadius: 10, backgroundColor: "#f8f8f8", marginRight: 10,
  },
  listingName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  listingDetails: { color: "#777", fontSize: 13, marginTop: 2 },

  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  listingPrice: { fontSize: 15, fontWeight: "800", color: "#ea5b70" },
  badgesRow: { flexDirection: "row", alignItems: "center", gap: 8 },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#22c55e", marginRight: 5 },
  statusText: { fontSize: 11, fontWeight: "600", color: "#16a34a" },

  trashBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fff5f6",
    borderWidth: 1,
    borderColor: "#ffe3e6",
  },
});