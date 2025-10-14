// app/(app)/paymentGateway.js
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { auth, db } from "../../firebaseConfig";

export default function PaymentGateway() {
  const router = useRouter();
  const { id, qty: qtyParam } = useLocalSearchParams();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [email, setEmail] = useState("");
  const [paying, setPaying] = useState(false);

  const qty = useMemo(() => {
    const q = Number(qtyParam ?? 1);
    return Number.isFinite(q) && q > 0 ? q : 1;
  }, [qtyParam]);

  // 🔹 Load product
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "products", String(id)));
        if (active)
          setItem(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      } catch (e) {
        console.error("Payment load failed:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const available = useMemo(() => {
    const q = Number(item?.quantity ?? 0);
    return Number.isFinite(q) && q > 0 ? q : 0;
  }, [item?.quantity]);

  const price = Number(item?.price ?? 0) || 0;
  const subtotal = price * qty;
  const fees = Math.min(5, Math.max(0.02 * subtotal, 1.25));
  const total = (subtotal + fees).toFixed(2);

  // ------------ validation helpers ------------
  const luhn = (num) => {
    const s = (num || "").replace(/\s+/g, "");
    if (!/^\d+$/.test(s)) return false;
    let sum = 0,
      dbl = false;
    for (let i = s.length - 1; i >= 0; i--) {
      let d = parseInt(s[i], 10);
      if (dbl) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      dbl = !dbl;
    }
    return sum % 10 === 0;
  };

  const parseExpiry = (v) => {
    const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(v);
    if (!m) return null;
    return { mm: +m[1], yy: +m[2] };
  };

  const validate = () => {
    if (!item) return "Item not found.";
    if (available <= 0) return "This item is out of stock.";
    if (qty > available) return `Only ${available} left in stock.`;
    if (!holder.trim()) return "Card holder name is required.";
    const digits = number.replace(/\s+/g, "");
    if (digits.length < 12 || !luhn(digits)) return "Invalid card number.";
    const ex = parseExpiry(expiry.trim());
    if (!ex || ex.mm < 1 || ex.mm > 12) return "Invalid expiry (use MM/YY).";
    const now = new Date();
    const curYY = +String(now.getFullYear()).slice(-2);
    const curMM = now.getMonth() + 1;
    if (ex.yy < curYY || (ex.yy === curYY && ex.mm < curMM))
      return "Card is expired.";
    if (!/^\d{3,4}$/.test(cvc.trim())) return "Invalid CVC.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      return "Valid email is required.";
    return null;
  };

  // ------------ pay + decrement inventory (transaction) ------------
  const handlePay = async () => {
    const msg = validate();
    if (msg) return Alert.alert("Check your details", msg);

    try {
      setPaying(true);
      await new Promise((res) => setTimeout(res, 1200));

      await runTransaction(db, async (tx) => {
        const prodRef = doc(db, "products", item.id);
        const prodSnap = await tx.get(prodRef);
        if (!prodSnap.exists()) throw new Error("Product no longer exists.");

        const cur = prodSnap.data();
        const currentQty = Number(cur.quantity ?? 0);
        if (!Number.isFinite(currentQty) || currentQty < qty) {
          throw new Error(`Only ${currentQty} left in stock.`);
        }

        tx.update(prodRef, {
          quantity: currentQty - qty,
          updatedAt: serverTimestamp(),
        });

        const ordersRef = collection(db, "orders");
        tx.set(doc(ordersRef), {
          productId: item.id,
          productName: item.name || "",
          unitPrice: price,
          qty,
          subtotal: Number(subtotal.toFixed(2)),
          fees: Number(fees.toFixed(2)),
          total: Number((subtotal + fees).toFixed(2)),

          buyerId: auth.currentUser?.uid ?? null,
          buyerEmail: email.trim(),
          buyerName: holder.trim(),

          sellerId: cur.ownerId || null,
          sellerEmail: cur.ownerEmail || null,

          status: "paid",
          createdAt: serverTimestamp(),
        });
      });

      Alert.alert(
        "Payment successful ✅",
        `You paid $${total} for ${qty} × ${item?.name}.`,
        [{ text: "OK", onPress: () => router.replace("/(app)/(tabs)/home") }]
      );
    } catch (e) {
      console.error("Payment/stock error:", e);
      Alert.alert("Couldn’t complete purchase", String(e.message || e));
    } finally {
      setPaying(false);
    }
  };

  if (loading)
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 24 }} />
      </SafeAreaView>
    );

  if (!item)
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#c00" }}>Item not found.</Text>
        </View>
      </SafeAreaView>
    );

  const priceFixed = price.toFixed(2);
  const subtotalFixed = subtotal.toFixed(2);
  const feesFixed = fees.toFixed(2);

  return (
   <KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === "ios" ? "padding" : "position"}
  keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
>
  <ScrollView
    showsVerticalScrollIndicator={false}
    keyboardShouldPersistTaps="handled"
    contentContainerStyle={{
      flexGrow: 1,
      padding: 16,
      paddingBottom: 300, // 👈 space for keyboard
    }}
  >

          {/* Product */}
          <View style={styles.card}>
            <Image
              source={{
                uri:
                  item.imageUrl ||
                  "https://via.placeholder.com/800x600.png?text=No+Image",
              }}
              style={styles.image}
            />
            <View style={{ padding: 14, gap: 6 }}>
              <Text style={styles.title}>{item.name}</Text>
              {!!item.details && <Text style={styles.muted}>{item.details}</Text>}
              <View style={styles.rowBetween}>
                <Text style={styles.pill}>{item.category || "—"}</Text>
                <Text style={styles.muted}>In stock: {available}</Text>
              </View>
            </View>
          </View>

          {/* Order summary */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Price</Text>
              <Text style={styles.value}>${priceFixed}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Quantity</Text>
              <Text style={styles.value}>× {qty}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Subtotal</Text>
              <Text style={styles.value}>${subtotalFixed}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Processing fee</Text>
              <Text style={styles.value}>${feesFixed}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${total}</Text>
            </View>
          </View>

          {/* Payment form */}
          <View style={styles.card}>
            <Text style={[styles.sectionTitle, { textAlign: "center" }]}>
              Payment Details
            </Text>

            <Text style={styles.inputLabel}>Card holder name</Text>
            <TextInput
              style={styles.input}
              placeholder="John Smith"
              value={holder}
              onChangeText={setHolder}
            />

            <Text style={styles.inputLabel}>Card number</Text>
            <TextInput
              style={styles.input}
              placeholder="4242 4242 4242 4242"
              value={number}
              onChangeText={(t) => setNumber(t.replace(/[^\d\s]/g, ""))}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={23}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Expiry (MM/YY)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12/27"
                  value={expiry}
                  onChangeText={(text) => {
                    let cleaned = text.replace(/[^\d]/g, "").slice(0, 4);
                    if (cleaned.length >= 3) {
                      cleaned = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
                    }
                    setExpiry(cleaned);
                  }}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={5}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>CVC</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  value={cvc}
                  onChangeText={(t) =>
                    setCvc(t.replace(/[^\d]/g, "").slice(0, 4))
                  }
                  keyboardType="number-pad"
                  inputMode="numeric"
                  maxLength={4}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Email for receipt</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Pressable
              style={[styles.payBtn, paying && styles.payBtnDisabled]}
              onPress={handlePay}
              disabled={paying}
            >
              {paying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payBtnText}>Pay ${total}</Text>
              )}
            </Pressable>

            <Text style={styles.footNote}>
              Your payment info is encrypted. By confirming, you agree to our
              Terms & Privacy Policy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
   
  );
}

const COLORS = {
  bg: "#f7f7f7",
  text: "#1b1b1b",
  sub: "#6b6b6b",
  accent: "#ea5b70",
  white: "#fff",
  line: "#eee",
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { padding: 16, paddingTop: 40, paddingBottom: 60, gap: 14 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: "hidden",
    padding: 14,
    shadowColor: "rgba(0,0,0,0.06)",
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  image: { width: "100%", height: 180, borderRadius: 10, backgroundColor: "#eee" },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10, color: COLORS.text },
  muted: { color: COLORS.sub },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pill: {
    backgroundColor: "#f2f2f2",
    color: COLORS.text,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    textTransform: "capitalize",
  },
  label: { color: COLORS.sub },
  value: { color: COLORS.text, fontWeight: "700" },
  divider: { height: 1, backgroundColor: COLORS.line, marginVertical: 10 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  totalLabel: { fontSize: 16, color: COLORS.text, fontWeight: "600" },
  totalValue: { fontSize: 20, color: COLORS.text, fontWeight: "800" },
  inputLabel: { color: COLORS.sub, marginTop: 8, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  payBtn: {
    marginTop: 20,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "800" },
  footNote: { marginTop: 10, color: COLORS.sub, fontSize: 12, textAlign: "center" },
});
