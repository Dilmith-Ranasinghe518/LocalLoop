import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, Pressable, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth } from "firebase/auth";
import QRCode from "react-native-qrcode-svg";

export default function TicketSuccess() {
  const router = useRouter();
  const { eventId, eventTitle, userEmail, price, isFree } = useLocalSearchParams();

  const [reference, setReference] = useState("");
  const [ticketNo, setTicketNo] = useState("");
  const [saving, setSaving] = useState(true);
  const auth = getAuth();
  const user = auth.currentUser;

  // 🟢 helper to add user to event announcement group
const addUserToEventGroup = async (eventId, userId) => {
  if (!eventId || !userId) return;
  try {
    const roomRef = doc(db, "rooms", eventId);
    const roomSnap = await getDoc(roomRef);

    if (roomSnap.exists()) {
      const data = roomSnap.data();
      const members = data.members || [];

      if (!members.includes(userId)) {
        await updateDoc(roomRef, {
          members: arrayUnion(userId),
        });
        console.log("✅ User added to existing event group:", eventId);
      } else {
        console.log("ℹ️ User already in group:", eventId);
      }
    } else {
      // ✅ Create the group if not exists
      await setDoc(roomRef, {
        type: "eventGroup",
        eventTitle: "Auto Event Chat",
        eventImage: null,
        members: [userId],
        createdAt: serverTimestamp(),
      });
      console.log("🆕 Created event group:", eventId);
    }
  } catch (err) {
    console.error("🔥 Error adding user to event group:", err);
  }
};


  useEffect(() => {
    const saveTicket = async () => {
      if (!eventId || !userEmail || !user) {
        console.warn("⚠️ Missing parameters for ticket creation.");
        return;
      }

      const refNo = "REF-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const newTicketNo = Date.now().toString().slice(-6);
      setReference(refNo);
      setTicketNo(newTicketNo);

      try {
        // 1️⃣ Save ticket record
        await addDoc(collection(db, "tickets"), {
          eventId,
          eventTitle,
          userEmail,
          userId: user.uid, // 🟢 always store logged-in user's ID
          referenceNo: refNo,
          ticketNo: newTicketNo,
          price: Number(price) || 0,
          isFree: isFree === "true",
          createdAt: serverTimestamp(),
        });

        // 2️⃣ Add user to event announcement group
        await addUserToEventGroup(eventId, user.uid);

        console.log("🎫 Ticket created & user added to event group");
      } catch (err) {
        console.error("🔥 Error saving ticket:", err);
        Alert.alert("Error", "Failed to save your ticket. Please try again.");
      } finally {
        setSaving(false);
      }
    };

    saveTicket();
  }, []);

  const qrData = {
    eventId,
    eventTitle,
    userEmail,
    reference,
    ticketNo,
    price,
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: "https://cdn-icons-png.flaticon.com/512/190/190411.png" }}
        style={styles.successIcon}
      />
      <Text style={styles.title}>🎉 Payment Successful</Text>
      <Text style={styles.subText}>Your ticket is confirmed for:</Text>
      <Text style={styles.eventTitle}>{eventTitle}</Text>

      <Text style={styles.ref}>Reference No: {reference}</Text>
      <Text style={styles.ref}>Email: {userEmail}</Text>

      <View style={{ marginVertical: 20 }}>
        {reference && <QRCode value={JSON.stringify(qrData)} size={160} />}
      </View>

      <Pressable
        style={styles.homeBtn}
        onPress={() => router.replace("/(app)/(tabs)/events")}
        disabled={saving}
      >
        <Text style={styles.homeBtnText}>
          {saving ? "Saving..." : "Back to Events"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  successIcon: { width: 80, height: 80, marginBottom: 15 },
  title: { fontSize: 22, fontWeight: "800", color: "#222" },
  subText: { fontSize: 15, color: "#555", marginVertical: 5 },
  eventTitle: { fontSize: 18, fontWeight: "700", color: "#ea5b70", marginVertical: 8 },
  ref: { fontSize: 14, color: "#555", marginBottom: 4 },
  homeBtn: {
    marginTop: 20,
    backgroundColor: "#ea5b70",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  homeBtnText: { color: "#fff", fontWeight: "700" },
});
