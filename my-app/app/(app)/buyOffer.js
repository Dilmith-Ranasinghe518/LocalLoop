import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
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

export default function BuyOffer() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);

  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [email, setEmail] = useState("");
  const [paying, setPaying] = useState(false);

  // 🔹 Fetch offer details
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "offers", String(id)));
        if (active)
          setOffer(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      } catch (e) {
        console.error("Offer load failed:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // 🔹 Derived pricing
  const prev = Number(offer?.prevPrice ?? 0);
  const disc = Number(offer?.discount ?? 0);
  const finalPrice =
    prev > 0 && disc > 0 ? Number((prev * (1 - disc / 100)).toFixed(2)) : prev || 0;

  const subtotal = finalPrice;
  const fees = Math.min(5, Math.max(0.02 * subtotal, 1.25));
  const total = (subtotal + fees).toFixed(2);

  // 🔹 Validation helpers
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
    if (!offer) return "Offer not found.";
    if (!holder.trim()) return "Card holder name is required.";
    const digits = number.replace(/\s+/g, "");
    if (digits.length < 12 || !luhn(digits)) return "Invalid card number.";
    const ex = parseExpiry(expiry.trim());
    if (!ex || ex.mm < 1 || ex.mm > 12) return "Invalid expiry (use MM/YY).";
    const now = new Date();
    const curYY = +String(now.getFullYear()).slice(-2);
    const curMM = now.getMonth() + 1;
    if (ex.yy < curYY || (ex.yy === curYY && ex.mm < curMM))
      return "Card expired.";
    if (!/^\d{3,4}$/.test(cvc.trim())) return "Invalid CVC.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      return "Valid email is required.";
    return null;
  };

  // 🔹 Handle payment
  const handlePay = async () => {
    const msg = validate();
    if (msg) return Alert.alert("Check your details", msg);

    try {
      setPaying(true);
      await new Promise((res) => setTimeout(res, 1000)); // fake delay

      await runTransaction(db, async (tx) => {
        const offerRef = doc(db, "offers", offer.id);
        const offerSnap = await tx.get(offerRef);
        if (!offerSnap.exists()) throw new Error("Offer no longer exists.");

        const data = offerSnap.data();
        const ordersRef = collection(db, "offerOrders");
        tx.set(doc(ordersRef), {
          offerId: offer.id,
          offerTitle: data.title || "",
          productName: data.productName || "",
          discount: data.discount || 0,
          prevPrice: data.prevPrice || null,
          finalPrice: finalPrice,
          subtotal,
          fees: Number(fees.toFixed(2)),
          total: Number(total),

          // buyer info
          buyerId: auth.currentUser?.uid ?? null,
          buyerEmail: email.trim(),
          buyerName: holder.trim(),

          // seller info
          sellerId: data.ownerId || null,
          sellerEmail: data.ownerEmail || null,

          status: "paid",
          createdAt: serverTimestamp(),
        });
      });

      Alert.alert(
        "✅ Payment successful",
        `You purchased '${offer?.productName}' for LKR ${total}.`,
        [{ text: "OK", onPress: () => router.replace("/(app)/(tabs)/home") }]
      );
    } catch (e) {
      console.error("Offer payment error:", e);
      Alert.alert("Couldn’t complete purchase", String(e.message || e));
    } finally {
      setPaying(false);
    }
  };

  // UI Rendering
  if (loading)
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ marginTop: 24 }} />
      </SafeAreaView>
    );

  if (!offer)
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#c00" }}>Offer not found.</Text>
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Offer card */}
          <View style={styles.card}>
            <Image
              source={{
                uri:
                  offer.productImage ||
                  "https://via.placeholder.com/800x600.png?text=No+Image",
              }}
              style={styles.image}
            />
            <View style={{ padding: 14 }}>
              <Text style={styles.title}>{offer.title}</Text>
              <Text style={styles.muted}>{offer.productName}</Text>
              <Text style={styles.discount}>{offer.discount}% OFF</Text>
              <Text style={styles.final}>Now: LKR {finalPrice.toFixed(2)}</Text>
            </View>
          </View>

          {/* Payment summary */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Discount</Text>
              <Text style={styles.value}>{offer.discount}%</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Subtotal</Text>
              <Text style={styles.value}>LKR {subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>Processing Fee</Text>
              <Text style={styles.value}>LKR {fees.toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>LKR {total}</Text>
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
                <Text style={styles.payBtnText}>Pay LKR {total}</Text>
              )}
            </Pressable>

            <Text style={styles.footNote}>
              Your payment info is encrypted. By confirming, you agree to our
              Terms & Privacy Policy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  discount: { color: COLORS.accent, fontWeight: "700", fontSize: 16 },
  final: { fontWeight: "700", marginTop: 4, color: COLORS.text },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { color: COLORS.sub },
  value: { color: COLORS.text, fontWeight: "700" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  footNote: {
    marginTop: 10,
    color: COLORS.sub,
    fontSize: 12,
    textAlign: "center",
  },
});
