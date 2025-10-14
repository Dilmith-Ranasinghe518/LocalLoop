import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
} from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";

export default function AddEventPage() {
  const router = useRouter();
  const storage = getStorage();

  // Form state
  const [eventTitle, setEventTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timeFrom, setTimeFrom] = useState(new Date());
  const [showTimeFromPicker, setShowTimeFromPicker] = useState(false);
  const [timeTo, setTimeTo] = useState(new Date());
  const [showTimeToPicker, setShowTimeToPicker] = useState(false);
  const [location, setLocation] = useState("");
  const [province, setProvince] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("LKR");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [createAnnouncementGroup, setCreateAnnouncementGroup] = useState(false);

  const provinces = [
    "Central","Eastern","Northern","North Central","North Western",
    "Sabaragamuwa","Southern","Uva","Western",
  ];
  const currencies = ["LKR","USD","EUR","GBP"];

  // 🖼 Pick image and upload to Firebase Storage
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Please allow access to your gallery.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (result.canceled) return;
    const selected = result.assets[0];
    setUploading(true);
    setUploadProgress("Uploading...");

    try {
      const response = await fetch(selected.uri);
      const blob = await response.blob();
      const fileName = `events/${auth.currentUser.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      setImageUrl(downloadURL);
      setUploadProgress(null);
      Alert.alert("✅ Uploaded", "Image uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload Failed", "Could not upload image.");
    } finally {
      setUploading(false);
    }
  };

  // 🟢 Handle Create Event
  const handleCreateEvent = async () => {
    if (!eventTitle || !location || !province) {
      Alert.alert("Missing Fields", "Please fill all required fields.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "You must be logged in to create an event.");
      return;
    }

    try {
      setUploading(true);

      // STEP 1: Create the event document
      const eventRef = await addDoc(collection(db, "events"), {
        title: eventTitle,
        description,
        date: date.toDateString(),
        timeFrom: timeFrom.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        timeTo: timeTo.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        location,
        province,
        maxAttendees: parseInt(maxAttendees) || 0,
        isFree,
        price: isFree ? 0 : parseFloat(price) || 0,
        currency: isFree ? null : currency,
        imageUrl: imageUrl.trim() || null,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        createdByEmail: user.email,
      });

      // STEP 2: Optionally create event chat group
      if (createAnnouncementGroup) {
        await setDoc(doc(db, "rooms", eventRef.id), {
          roomId: eventRef.id,
          type: "eventGroup",
          eventTitle,
          eventImage: imageUrl.trim() || null,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
          members: [user.uid],
          lastRead: {},
        });
      }

      setUploading(false);
      Alert.alert("✅ Success", "Event created successfully!");
      router.back();
    } catch (error) {
      setUploading(false);
      console.error("Error adding event:", error);
      Alert.alert("Error", "Failed to create event. Try again.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: 25, paddingBottom: 70 }}>
      {/* 🏷️ Event Details */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📅 Event Details</Text>
        <Text style={styles.label}>Event Title *</Text>
        <TextInput style={styles.input} value={eventTitle} onChangeText={setEventTitle} />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          multiline
          value={description}
          onChangeText={setDescription}
          placeholder="Enter event description"
        />
      </View>

      {/* 🖼 Image Upload */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🖼 Event Image</Text>
        <Text style={styles.label}>Paste Image URL or Upload Below</Text>
        <TextInput
          style={styles.input}
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://example.com/event-image.jpg"
          autoCapitalize="none"
        />
        <Pressable onPress={pickImage} style={styles.uploadBtn}>
          <Text style={styles.uploadBtnText}>📁 Choose from Gallery</Text>
        </Pressable>
        {uploadProgress && <Text style={{ textAlign: "center", marginBottom: 8 }}>{uploadProgress}</Text>}
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.previewImage}
            onError={() => Alert.alert("Invalid URL", "Could not load image.")}
          />
        ) : null}
      </View>

      {/* ⏰ Schedule */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🕒 Schedule</Text>
        <Text style={styles.label}>Date *</Text>
        <Pressable onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
          <Text>{date.toDateString()}</Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(e, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}
        <Text style={styles.label}>Time From *</Text>
        <Pressable onPress={() => setShowTimeFromPicker(true)} style={styles.dateButton}>
          <Text>{timeFrom.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
        </Pressable>
        {showTimeFromPicker && (
          <DateTimePicker value={timeFrom} mode="time" onChange={(e, selected) => {
            setShowTimeFromPicker(false);
            if (selected) setTimeFrom(selected);
          }} />
        )}
        <Text style={styles.label}>Time To *</Text>
        <Pressable onPress={() => setShowTimeToPicker(true)} style={styles.dateButton}>
          <Text>{timeTo.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
        </Pressable>
        {showTimeToPicker && (
          <DateTimePicker value={timeTo} mode="time" onChange={(e, selected) => {
            setShowTimeToPicker(false);
            if (selected) setTimeTo(selected);
          }} />
        )}
      </View>

      {/* 📍 Location */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>📍 Location</Text>
        <Text style={styles.label}>Location *</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation} />
        <Text style={styles.label}>Province *</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={province} onValueChange={setProvince}>
            <Picker.Item label="Select Province" value="" />
            {provinces.map((p) => <Picker.Item key={p} label={p} value={p} />)}
          </Picker>
        </View>
        <Text style={styles.label}>Max Attendees</Text>
        <TextInput
          style={styles.input}
          value={maxAttendees}
          onChangeText={setMaxAttendees}
          placeholder="Enter maximum attendees"
          keyboardType="numeric"
        />
      </View>

      {/* 💰 Pricing */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💰 Pricing</Text>
        <View style={styles.toggleRow}>
          <Pressable style={[styles.toggleButton, isFree && styles.activeToggle]} onPress={() => setIsFree(true)}>
            <Text style={isFree ? styles.activeText : styles.inactiveText}>Free</Text>
          </Pressable>
          <Pressable style={[styles.toggleButton, !isFree && styles.activeToggle]} onPress={() => setIsFree(false)}>
            <Text style={!isFree ? styles.activeText : styles.inactiveText}>Paid</Text>
          </Pressable>
        </View>
        {!isFree && (
          <>
            <Text style={styles.label}>Price</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />
            <Text style={styles.label}>Currency</Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={currency} onValueChange={setCurrency}>
                {currencies.map((c) => <Picker.Item key={c} label={c} value={c} />)}
              </Picker>
            </View>
          </>
        )}
      </View>

      {/* 💬 Chat Group */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>💬 Event Announcement Group</Text>
        <Text style={styles.label}>Create a group chat for attendees?</Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleButton, createAnnouncementGroup && styles.activeToggle]}
            onPress={() => setCreateAnnouncementGroup(true)}>
            <Text style={createAnnouncementGroup ? styles.activeText : styles.inactiveText}>Yes</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleButton, !createAnnouncementGroup && styles.activeToggle]}
            onPress={() => setCreateAnnouncementGroup(false)}>
            <Text style={!createAnnouncementGroup ? styles.activeText : styles.inactiveText}>No</Text>
          </Pressable>
        </View>
      </View>

      {/* Create Button */}
      <Pressable style={[styles.createEventBtn, uploading && { opacity: 0.6 }]} onPress={handleCreateEvent} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createEventBtnText}>Create Event</Text>}
      </Pressable>
    </ScrollView>
  );
}

const COLORS = { accent: "#ea5b70", bg: "#f7f7f7", white: "#fff", text: "#222", sub: "#777" };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 14 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "rgba(0,0,0,0.05)",
    shadowOpacity: 0.7,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10, color: COLORS.accent },
  label: { fontSize: 14, fontWeight: "600", color: COLORS.text, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dateButton: { backgroundColor: "#fafafa", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#ddd", marginBottom: 12 },
  pickerContainer: { borderRadius: 8, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fafafa", marginBottom: 12 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 8 },
  toggleButton: {
    flex: 1, alignItems: "center", paddingVertical: 10, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, marginHorizontal: 4, backgroundColor: "#fafafa",
  },
  activeToggle: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  activeText: { color: "#fff", fontWeight: "600" },
  inactiveText: { color: COLORS.text },
  uploadBtn: { backgroundColor: "#f3f3f3", paddingVertical: 10, borderRadius: 8, alignItems: "center", marginBottom: 10, borderWidth: 1, borderColor: "#ddd" },
  uploadBtnText: { color: COLORS.text, fontWeight: "500" },
  previewImage: { width: "100%", height: 200, borderRadius: 10, marginTop: 6, borderWidth: 1, borderColor: "#ddd", backgroundColor: "#f9f9f9" },
  createEventBtn: { backgroundColor: COLORS.accent, paddingVertical: 16, borderRadius: 10, alignItems: "center", marginBottom: 60 },
  createEventBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
