import React, { useEffect,useRef,useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Image,
  ActivityIndicator,
  Pressable,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/authContext";
import QRCode from "react-native-qrcode-svg";

import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

import ViewShot, { captureRef } from "react-native-view-shot";


export default function TransactionsScreen() {
  const { user } = useAuth();
  const [buyerOrders, setBuyerOrders] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [eventPayments, setEventPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState(null);
  const handleCloseQR = () => setSelectedQR(null);

  const qrRef = useRef();



  //const qrRef = React.useRef(null);


const handleShareQR = async () => {
  try {
    if (!selectedQR || selectedQR === "NO_QR") {
      Alert.alert("No QR Code", "There is no QR code to share.");
      return;
    }

    // ✅ Safely capture the ViewShot (works even if .capture() undefined)
    const uri = await captureRef(qrRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
    });

    console.log("📸 QR captured at:", uri);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert("Sharing Not Supported", "Try again on a physical device.");
      return;
    }

    await Sharing.shareAsync(uri, {
      dialogTitle: "Share Event Ticket",
    });

    console.log("✅ Shared successfully");
  } catch (err) {
    console.error("Error sharing QR:", err);
    Alert.alert(
      "Share Error",
      err?.message || "Something went wrong while sharing your ticket."
    );
  }
};







  useEffect(() => {
    if (!user) return;

    const ordersRef = collection(db, "orders");
    const qBuyer = query(ordersRef, where("buyerId", "==", user.uid));
    const qSeller = query(ordersRef, where("sellerId", "==", user.uid));

    // 🔹 Buyer orders
const unsubBuyer = onSnapshot(qBuyer, async (snap) => {
  const arr = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();

    let prod = {};
    if (data.productId) {
      try {
        const prodSnap = await getDoc(doc(db, "products", data.productId));
        if (prodSnap.exists()) prod = prodSnap.data();
      } catch (err) {
        console.warn("Failed to fetch product:", err);
      }
    }

    arr.push({
      id: docSnap.id + "-buyer",
      role: "buyer",
      ...data,
      productImage:
        prod.imageUrl ||
        data.productImage ||
        "https://via.placeholder.com/80x80.png?text=No+Image",
      category: prod.category || data.category || "—",
      type: data.type || "order",
    });
  }
  setBuyerOrders(arr);
  setLoading(false);
});

// 🔹 Seller orders
const unsubSeller = onSnapshot(qSeller, async (snap) => {
  const arr = [];
  for (const docSnap of snap.docs) {
    const data = docSnap.data();

    let prod = {};
    if (data.productId) {
      try {
        const prodSnap = await getDoc(doc(db, "products", data.productId));
        if (prodSnap.exists()) prod = prodSnap.data();
      } catch (err) {
        console.warn("Failed to fetch product:", err);
      }
    }

    arr.push({
      id: docSnap.id + "-seller",
      role: "seller",
      ...data,
      productImage:
        prod.imageUrl ||
        data.productImage ||
        "https://via.placeholder.com/80x80.png?text=No+Image",
      category: prod.category || data.category || "—",
      type: data.type || "order",
    });
  }
  setSellerOrders(arr);
  setLoading(false);
});


    // 🔹 Event payments (ticket buyers only)
    const paymentsRef = collection(db, "payments");
    const qPayments = query(paymentsRef, where("userId", "==", user.uid));
    const unsubPayments = onSnapshot(qPayments, (snap) => {
      const arr = snap.docs.map((d) => ({
        id: d.id + "-event",
        ...d.data(),
        role: "buyer", // always buyer for events
        type: "event",
      }));
      setEventPayments(arr);
      setLoading(false);
    });

    return () => {
      unsubBuyer();
      unsubSeller();
      unsubPayments();
    };
  }, [user]);

  // 🔹 Merge all and sort newest first
  const transactions = [...buyerOrders, ...sellerOrders, ...eventPayments].sort(
    (a, b) => {
      const ta = a.createdAt?.seconds || a.paidAt?.seconds || 0;
      const tb = b.createdAt?.seconds || b.paidAt?.seconds || 0;
      return tb - ta;
    }
  );

  const renderItem = ({ item }) => {
    const dateStr = item.createdAt?.seconds
      ? new Date(item.createdAt.seconds * 1000)
          .toLocaleDateString("en-GB")
          .replaceAll("/", "-")
      : item.paidAt?.seconds
      ? new Date(item.paidAt.seconds * 1000)
          .toLocaleDateString("en-GB")
          .replaceAll("/", "-")
      : "—";

    let amountColor = "#333";
    let amountPrefix = "";

    // ✅ Products: seller (green +), buyer (red –)
    if (item.type === "order") {
      if (item.role === "seller") {
        amountColor = "#16a34a";
        amountPrefix = "+";
      } else if (item.role === "buyer") {
        amountColor = "#dc2626";
        amountPrefix = "–";
      }
    }

    // ✅ Events: only buyer side (blue, no prefix)
    if (item.type === "event") {
      amountColor = "#1e88e5";
      amountPrefix = "";
    }

    return (
      <View style={styles.card}>
        {item.type === "order" ? (
          <Image
            source={{
              uri:
                item.productImage ||
                "https://via.placeholder.com/80x80.png?text=No+Image",
            }}
            style={styles.image}
          />
        ) : (
          <View
            style={[
              styles.image,
              {
                backgroundColor: "#ea5b70",
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <Ionicons name="ticket-outline" size={28} color="#fff" />
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {item.type === "event"
              ? item.eventTitle || "Event Ticket"
              : item.productName || "Unnamed product"}
          </Text>
          <Text style={styles.subText} numberOfLines={1}>
            {item.type === "event"
              ? "Event Ticket Purchase"
              : `${item.category} | ${dateStr}`}
          </Text>
          <Text style={styles.subText}>{dateStr}</Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.amount, { color: amountColor }]}>
            {amountPrefix} LKR {item.amount || item.total}
          </Text>

          {item.type === "event" && (
            <Pressable
              style={styles.qrBtn}
              onPress={() => setSelectedQR(item.referenceNo || "NO_QR")}
            >
              <Text style={styles.qrText}>View Ticket</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ea5b70" size="large" />
        <Text style={{ color: "#999", marginTop: 8 }}>
          Loading transactions…
        </Text>
      </View>
    );

  if (!transactions.length)
    return (
      <View style={styles.tabBody}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="receipt-outline" size={64} color="#ddd" />
          </View>
          <Text style={styles.emptyTitle}>No Transactions Yet</Text>
          <Text style={styles.emptySubtext}>
            Your purchases, sales, and event tickets will appear here.
          </Text>
        </View>
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
      />

     
 {/* 🔹 QR Modal */}
<Modal
  visible={!!selectedQR}
  transparent
  animationType="fade"
  onRequestClose={handleCloseQR}
>
  <View style={styles.modalBg}>
    <View style={styles.modalBox}>
      {!selectedQR || selectedQR === "NO_QR" ? (
        <Text style={{ fontSize: 16, color: "#666" }}>
          No QR code available
        </Text>
      ) : (
        <>
          <Text style={styles.modalTitle}>Your Event Ticket</Text>

          {/* ✅ Capture QR reference */}
          <View
  collapsable={false}
  ref={qrRef}
  style={{ backgroundColor: "#fff", padding: 10 }}
>
  <ViewShot
  ref={qrRef}
  style={{
    backgroundColor: "#fff",
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  }}
  options={{
    format: "png",
    quality: 1,
    result: "tmpfile", // ensures a real file path
  }}
>
  <QRCode value={String(selectedQR)} size={180} backgroundColor="#fff" />
</ViewShot>


</View>


          <Text style={{ marginTop: 12, color: "#999", textAlign: "center" }}>
            {selectedQR}
          </Text>

          {/* ✅ Share & Close Buttons */}
          <View style={{ flexDirection: "row", marginTop: 20 }}>
            <Pressable
              style={[styles.closeBtn, { backgroundColor: "#1e88e5", marginRight: 10 }]}
              onPress={handleShareQR}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Share</Text>
            </Pressable>

            <Pressable style={styles.closeBtn} onPress={handleCloseQR}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Close</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  </View>
</Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabBody: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#f8f8f8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#f0f0f0",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#f2f2f2",
  },
  info: { flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  subText: { fontSize: 13, color: "#777" },
  amount: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
    minWidth: 100,
  },
  qrBtn: {
    backgroundColor: "#ea5b70",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  qrText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    width: 280,
  },
  modalTitle: { fontWeight: "700", fontSize: 18, marginBottom: 12 },
  closeBtn: {
  backgroundColor: "#ea5b70",
  paddingVertical: 8,
  paddingHorizontal: 20,
  borderRadius: 8,
  alignItems: "center",
},

});
