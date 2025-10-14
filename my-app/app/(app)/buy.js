// app/(app)/buy.js
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { db } from "../../firebaseConfig";

export default function BuyScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // product id
  const [item, setItem] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        if (!id) return;

        // Get product
        const snap = await getDoc(doc(db, "products", String(id)));
        if (!snap.exists()) return setItem(null);

        const product = { id: snap.id, ...snap.data() };
        if (active) setItem(product);

        // Get seller from users collection
        if (product.ownerId) {
          const userSnap = await getDoc(doc(db, "users", product.ownerId));
          if (userSnap.exists()) {
            setSeller({ id: userSnap.id, ...userSnap.data() });
          }
        }
      } catch (e) {
        console.error("Error loading product or seller:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id]);

  const available = useMemo(() => {
    const q = Number(item?.quantity ?? 1);
    return Number.isFinite(q) && q > 0 ? q : 1;
  }, [item?.quantity]);

  const price = Number(item?.price ?? 0) || 0;
  const total = useMemo(() => (price * qty).toFixed(2), [price, qty]);

  const inc = () => setQty((n) => Math.min(available, n + 1));
  const dec = () => setQty((n) => Math.max(1, n - 1));

  const proceed = () => {
    if (!item) return;
    router.push({
      pathname: "/(app)/paymentGateway",
      params: { id: item.id, qty },
    });
  };

  if (loading)
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 20 }} />
      </SafeAreaView>
    );

  if (!item)
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          Item not found.
        </Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Image
          source={{
            uri:
              item.imageUrl ||
              "https://via.placeholder.com/800x600.png?text=No+Image",
          }}
          style={styles.image}
        />

        <View style={{ padding: 16 }}>
          <Text style={styles.name}>{item.name}</Text>
          {item.details ? <Text style={styles.details}>{item.details}</Text> : null}
          <Text style={styles.price}>LKR {price}</Text>

          {/* 💬 Seller Card */}
          {seller && (
            <View style={styles.sellerCard}>
              <View style={styles.sellerRow}>
                <Image
                  source={{
                    uri:
                      seller.photoURL ||
                      seller.avatarUrl ||
                      "https://i.pravatar.cc/150?img=5",
                  }}
                  style={styles.sellerAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.sellerName}>{seller.name || "Unknown"}</Text>
                  <Text style={styles.sellerLoc}>
                    {seller.location || "Location not specified"}
                  </Text>
                </View>
              </View>

              <Pressable
                style={styles.profileBtn}
                onPress={() =>
                  router.push({
                    pathname: "/(app)/PublicProfileScreen/[id]",
                    params: { id: seller.id },
                  })
                }
              >
                <Text style={styles.profileBtnText}>View Seller Profile</Text>
              </Pressable>
            </View>
          )}

          {/* 🧮 Quantity + Total */}
          <View style={styles.qtyRow}>
            <Pressable
              style={[styles.stepBtn, qty <= 1 && styles.stepBtnDisabled]}
              onPress={dec}
              disabled={qty <= 1}
            >
              <Text style={styles.stepBtnText}>-</Text>
            </Pressable>
            <Text style={styles.qtyValue}>{qty}</Text>
            <Pressable
              style={[styles.stepBtn, qty >= available && styles.stepBtnDisabled]}
              onPress={inc}
              disabled={qty >= available}
            >
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>LKR {total}</Text>
          </View>

          <Pressable style={styles.payBtn} onPress={proceed}>
            <Text style={styles.payBtnText}>Proceed to Payment</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f7" },
  container: { flex: 1 },
  image: { width: "100%", height: 240, backgroundColor: "#eee" },
  name: { fontSize: 22, fontWeight: "800", color: "#1b1b1b" },
  details: { color: "#6b6b6b", marginBottom: 6 },
  price: { fontSize: 20, fontWeight: "800", color: "#1b1b1b", marginBottom: 10 },

  sellerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sellerRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sellerAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 10 },
  sellerName: { fontSize: 16, fontWeight: "700", color: "#222" },
  sellerLoc: { fontSize: 13, color: "#777" },
  profileBtn: {
    backgroundColor: "#f7e2f0ff",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    borderColor: "#e0b3c6",
    borderWidth: 1,
  },
  profileBtnText: { color: "#ea5b70", fontWeight: "600" },
  qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  stepBtnDisabled: { opacity: 0.4 },
  stepBtnText: { fontSize: 24, fontWeight: "800", color: "#333" },
  qtyValue: { minWidth: 28, textAlign: "center", fontSize: 18, fontWeight: "700" },

  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  totalLabel: { color: "#555", fontSize: 16 },
  totalValue: { fontSize: 20, fontWeight: "800" },

  payBtn: {
    backgroundColor: "#ea5b70",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 18,
  },
  payBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});