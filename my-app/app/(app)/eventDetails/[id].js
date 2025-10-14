import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db, auth } from "../../../firebaseConfig";
import QRCode from "react-native-qrcode-svg";

export default function EventDetailsPage() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paid, setPaid] = useState(false);
  const [ticketData, setTicketData] = useState(null);

  // Payment form fields
  const [holder, setHolder] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [email, setEmail] = useState("");
  const [paying, setPaying] = useState(false);

  // 🟢 Add user to event chat group
  const addUserToEventGroup = async (eventId, userId, eventTitle, eventImage) => {
    try {
      const roomRef = doc(db, "rooms", eventId);
      const roomSnap = await getDoc(roomRef);

      if (roomSnap.exists()) {
        await updateDoc(roomRef, {
          members: arrayUnion(userId),
          lastUpdated: serverTimestamp(),
        });
      } else {
        await setDoc(roomRef, {
          type: "eventGroup",
          eventTitle: eventTitle || "Event Chat",
          eventImage: eventImage || null,
          members: [userId],
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("🔥 Error adding user to event group:", err.message);
    }
  };

  // 🟢 Fetch event details
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const ref = doc(db, "events", id);
        const snap = await getDoc(ref);
        if (snap.exists()) setEvent(snap.data());
        else Alert.alert("Error", "Event not found!");
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to load event details.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  // 🧮 Validation helpers
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
      return "Valid email required.";
    return null;
  };

  // 🆓 Free event attend logic
  const handleAttendFree = async () => {
    const user = auth.currentUser;
    if (!user)
      return Alert.alert("Login Required", "Please sign in to attend.");

    const refNo =
      "REF-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    try {
      await addDoc(collection(db, "tickets"), {
        eventId: id,
        eventTitle: event?.title,
        userEmail: user.email,
        referenceNo: refNo,
        price: 0,
        isFree: true,
        createdAt: serverTimestamp(),
      });

      await addUserToEventGroup(id, user.uid, event?.title, event?.imageUrl);

      setPaid(true);
      setTicketData({
        eventTitle: event?.title,
        eventId: id,
        reference: refNo,
        userEmail: user.email,
        price: 0,
        isFree: true,
        ticketNo: Date.now().toString().slice(-6),
      });
    } catch (err) {
      console.error("Error attending event:", err);
      Alert.alert("Error", "Could not join event. Try again.");
    }
  };

  // 💳 Paid event flow
  const handlePay = async () => {
    const msg = validate();
    if (msg) return Alert.alert("Check your details", msg);

    const user = auth.currentUser;
    if (!user)
      return Alert.alert("Login Required", "Please sign in to continue.");

    const total = Number(event?.price ?? 0).toFixed(2);

    try {
      setPaying(true);
      await new Promise((res) => setTimeout(res, 1200));

      const refNo =
        "REF-" + Math.random().toString(36).substring(2, 10).toUpperCase();

      await runTransaction(db, async () => {
        await addDoc(collection(db, "payments"), {
          userId: user.uid,
          userEmail: email.trim(),
          eventId: id,
          eventTitle: event?.title,
          amount: Number(total),
          referenceNo: refNo,
          status: "success",
          paidAt: serverTimestamp(),
        });
      });

      await addDoc(collection(db, "tickets"), {
        eventId: id,
        eventTitle: event?.title,
        userEmail: email.trim(),
        referenceNo: refNo,
        price: total,
        isFree: false,
        createdAt: serverTimestamp(),
      });

      await addUserToEventGroup(id, user.uid, event?.title, event?.imageUrl);

      setShowPaymentModal(false);
      setPaid(true);
      setTicketData({
        eventTitle: event?.title,
        eventId: id,
        reference: refNo,
        userEmail: email.trim(),
        price: total,
        isFree: false,
        ticketNo: Date.now().toString().slice(-6),
      });
    } catch (e) {
      console.error("Payment error:", e);
      Alert.alert("Payment failed", String(e.message || e));
    } finally {
      setPaying(false);
    }
  };

  // 🟡 Loading
  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ea5b70" />
        <Text>Loading event details...</Text>
      </View>
    );

  if (!event) return <Text>Event not found.</Text>;

  // ✅ Ticket confirmation
  if (paid && ticketData)
    return (
      <View style={styles.ticketContainer}>
        <Text style={styles.successTitle}>🎟️ Ticket Confirmed!</Text>
        <Text style={styles.eventName}>{ticketData.eventTitle}</Text>
        <Text style={styles.ticketInfo}>Ref: {ticketData.reference}</Text>
        <Text style={styles.ticketInfo}>Email: {ticketData.userEmail}</Text>
        <Text style={styles.ticketInfo}>
          Price: {ticketData.isFree ? "Free" : `LKR ${ticketData.price}`}
        </Text>

        <View style={{ marginVertical: 25 }}>
          <QRCode
            value={ticketData.reference}
            size={180}
            color="#000"
            backgroundColor="#fff"
          />
        </View>

        <Pressable
          style={styles.homeBtn}
          onPress={() => router.replace("/(app)/(tabs)/events")}
        >
          <Text style={styles.homeBtnText}>Back to Events</Text>
        </Pressable>
      </View>
    );

  // ✅ Event detail page
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f7f7f7" }}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 🖼 Event Image - shifted down slightly */}
        <Image
          source={{
            uri: event.imageUrl || "https://via.placeholder.com/400x250.png?text=Event",
          }}
          style={styles.image}
        />

        <View style={styles.card}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.subtitle}>
            📅 {event.date} | ⏰ {event.timeFrom} → {event.timeTo}
          </Text>
          <Text style={styles.location}>
            📍 {event.location}, {event.province}
          </Text>

          <Text style={styles.description}>
            {event.description || "No description provided."}
          </Text>

          <Text style={styles.price}>
            {event.isFree ? "🎟️ Free Entry" : `💰 LKR ${event.price}`}
          </Text>

          <Pressable
            style={styles.attendButton}
            onPress={() =>
              event.isFree ? handleAttendFree() : setShowPaymentModal(true)
            }
          >
            <Text style={styles.attendText}>
              {event.isFree ? "Attend Event" : "Buy Tickets"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ✅ Payment Modal */}
      <Modal
        animationType="slide"
        visible={showPaymentModal}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.select({ ios: "padding", android: undefined })}
        >
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.sectionTitle}>💳 Payment Details</Text>

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
            />

            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="MM/YY"
                value={expiry}
                onChangeText={(text) => {
                  let cleaned = text.replace(/[^\d]/g, "").slice(0, 4);
                  if (cleaned.length >= 3)
                    cleaned = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
                  setExpiry(cleaned);
                }}
                keyboardType="number-pad"
                maxLength={5}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="CVC"
                value={cvc}
                onChangeText={(t) => setCvc(t.replace(/[^\d]/g, "").slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
              />
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
              style={[styles.payBtn, paying && { opacity: 0.6 }]}
              onPress={handlePay}
              disabled={paying}
            >
              {paying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payBtnText}>
                  Pay LKR {Number(event?.price ?? 0).toFixed(2)}
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelBtn}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ✅ Styles
const COLORS = {
  accent: "#ea5b70",
  bg: "#f7f7f7",
  text: "#111",
  sub: "#555",
};

const styles = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingBottom: 100,
    paddingTop: 35, // 🔹 Moves image & content down a bit
  },
  image: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    marginTop: 5,
    marginBottom: 18,
    shadowColor: "rgba(0,0,0,0.05)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    shadowColor: "rgba(0,0,0,0.05)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 15, color: COLORS.sub, marginBottom: 4 },
  location: { fontSize: 15, color: COLORS.sub, marginBottom: 10 },
  description: { fontSize: 15, color: COLORS.sub, marginBottom: 15, lineHeight: 20 },
  price: { fontSize: 16, fontWeight: "700", color: COLORS.accent, marginBottom: 16 },
  attendButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  attendText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: "#f7f7f7" },
  modalContent: { padding: 20, paddingTop: 40 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
    color: COLORS.text,
  },
  inputLabel: { color: COLORS.sub, marginTop: 8, marginBottom: 4 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  row: { flexDirection: "row", gap: 10 },
  payBtn: {
    marginTop: 20,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  payBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: {
    marginTop: 12,
    borderColor: "#ccc",
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: { color: COLORS.text, fontWeight: "600" },
  ticketContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    backgroundColor: "#fff",
  },
  successTitle: { fontSize: 22, fontWeight: "800", marginBottom: 10, color: COLORS.accent },
  eventName: { fontSize: 18, fontWeight: "700", color: COLORS.text, marginBottom: 10 },
  ticketInfo: { color: COLORS.sub, fontSize: 15, marginVertical: 2 },
  homeBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
  },
  homeBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
});
