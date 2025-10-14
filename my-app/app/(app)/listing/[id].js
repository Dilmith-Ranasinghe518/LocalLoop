// app/(app)/listing/[id].js
import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteDoc, doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useAuth } from "../../../context/authContext";
import { db } from "../../../firebaseConfig";

export default function ListingDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "products", String(id)));
        if (active) setItem(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      } catch (e) {
        console.error("Load listing failed:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  const isOwner = useMemo(() => !!user?.uid && item?.ownerId === user.uid, [user?.uid, item?.ownerId]);

  const goEdit = () =>
    router.push({ pathname: "/(app)/listing/edit/[id]", params: { id: item.id } });

  const handleDelete = () => {
    Alert.alert(
      "Delete listing",
      "This cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "products", item.id));
              Alert.alert("Deleted", "Your listing was deleted.", [
                { text: "OK", onPress: () => router.back() },
              ]);
            } catch (e) {
              Alert.alert("Error", e?.message || "Failed to delete.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 20 }} />
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#c00" }}>Listing not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Image
          source={{ uri: item.imageUrl || "https://via.placeholder.com/800x600.png?text=No+Image" }}
          style={styles.image}
        />
        <View style={{ padding: 16, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {!!item.category && (
              <View style={styles.chip}><Text style={styles.chipText}>{item.category}</Text></View>
            )}
            {typeof item.quantity === "number" && (
              <Text style={styles.qtyText}>Qty: {item.quantity}</Text>
            )}
          </View>

          <Text style={styles.name}>{item.name || "Unnamed"}</Text>
          {!!item.details && <Text style={styles.details}>{item.details}</Text>}
          {typeof item.price === "number" && <Text style={styles.price}>${item.price}</Text>}
          {!!item.ownerEmail && <Text style={styles.meta}>Seller: {item.ownerEmail}</Text>}
        </View>

        {isOwner && (
          <View style={styles.btnRow}>
            <Pressable style={[styles.btn, styles.editBtn]} onPress={goEdit}>
              <Text style={styles.btnText}>Edit</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.deleteBtn]} onPress={handleDelete}>
              <Text style={styles.btnText}>Delete</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f7", padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "rgba(0,0,0,0.08)",
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  image: { width: "100%", height: 220, backgroundColor: "#eee" },
  chip: { backgroundColor: "#f0f0f0", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontSize: 12, color: "#333", textTransform: "capitalize" },
  qtyText: { fontSize: 12, color: "#6b6b6b" },
  name: { fontSize: 20, fontWeight: "800", color: "#1b1b1b" },
  details: { color: "#6b6b6b" },
  price: { marginTop: 4, fontSize: 18, fontWeight: "800", color: "#1b1b1b" },
  meta: { marginTop: 2, color: "#888" },
  btnRow: { flexDirection: "row", gap: 10, padding: 16, paddingTop: 6 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  editBtn: { backgroundColor: "#80ef78ff" },
  deleteBtn: { backgroundColor: "#ea5b70" },
  btnText: { color: "#fff", fontWeight: "700" },
});
