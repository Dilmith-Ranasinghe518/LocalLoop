import { Ionicons, Octicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { sendPasswordResetEmail, verifyBeforeUpdateEmail } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../../../firebaseConfig";

const storage = getStorage();

export default function EditProfile() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [docId, setDocId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    bio: "",
    phone: "",
    email: "",
    photoURL: "",
  });
  const [location, setLocation] = useState("");
  const [locationsData, setLocationsData] = useState([]);

  /* ───── Fetch user data ───── */
  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, "users"), where("userId", "==", id));
        const snap = await getDocs(q);
        if (snap.empty) {
          Alert.alert("Error", "User not found");
          router.back();
          return;
        }
        const userDoc = snap.docs[0];
        setDocId(userDoc.id);
        const data = userDoc.data();
        setForm({
          name: data.name || "",
          bio: data.bio || "",
          phone: data.phone || "",
          email: data.email || "",
          photoURL: data.photoURL || "",
        });
        setLocation(data.location || "");
      } catch (e) {
        Alert.alert("Error", e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ───── Fetch locations ───── */
  useEffect(() => {
    (async () => {
      try {
        const colRef = collection(db, "locations");
        const snap = await getDocs(colRef);
        const arr = snap.docs.map((d) => ({
          district: d.id,
          cities: d.data().cities || [],
        }));
        setLocationsData(arr);
      } catch {
        Alert.alert("Error", "Could not load locations");
      }
    })();
  }, []);

  /* ───── Pick image ───── */
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Please allow photo access");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!res.canceled) setForm({ ...form, photoURL: res.assets[0].uri });
  };

  /* ───── Save changes ───── */
  const handleSave = async () => {
    if (!form.name.trim() || !location.trim()) {
      Alert.alert("Required", "Name and location are required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.email.trim())) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (form.bio.trim().length > 50) {
      Alert.alert("Too long", "Bio cannot exceed 50 characters.");
      return;
    }
    if (!docId) return;

    setSaving(true);
    try {
      const refDoc = doc(db, "users", docId);
      let uploadedUrl = form.photoURL;

      // Upload new image if local URI (starts with file://)
      if (uploadedUrl && uploadedUrl.startsWith("file")) {
        const imgRef = ref(storage, `profileImages/${id}_${Date.now()}.jpg`);
        const blob = await (await fetch(uploadedUrl)).blob();
        await uploadBytes(imgRef, blob);
        uploadedUrl = await getDownloadURL(imgRef);
      }

      await updateDoc(refDoc, {
        name: form.name.trim(),
        bio: form.bio.trim(),
        location: location.trim(),
        phone: form.phone.trim(),
        photoURL: uploadedUrl,
      });

      // handle email change with verification
      const currentUser = auth.currentUser;
      const newEmail = form.email.trim();
      if (currentUser && newEmail && newEmail !== currentUser.email) {
        await verifyBeforeUpdateEmail(currentUser, newEmail);
        await updateDoc(refDoc, { pendingEmail: newEmail });
        Alert.alert(
          "Verify new email",
          "We sent a verification link to your new address."
        );
        setSaving(false);
        return;
      }

      Alert.alert("Success", "Profile updated!");
      router.back();
    } catch (e) {
      if (e.code === "auth/requires-recent-login") {
        Alert.alert(
          "Re-authenticate",
          "Log out and sign in again before updating your email."
        );
      } else {
        Alert.alert("Error", e.message);
      }
    } finally {
      setSaving(false);
    }
  };

  /* ───── Password reset ───── */
  const handlePasswordReset = async () => {
    if (!form.email) {
      Alert.alert("No email found", "Cannot reset password without an email.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, form.email.trim());
      Alert.alert("Sent", "Check your inbox to reset your password.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ea5b70" />
        <Text style={{ marginTop: 10 }}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 60, paddingTop: 80 }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={26} color="#ea5b70" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 26 }} />
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Image */}
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {form.photoURL ? (
                <Image source={{ uri: form.photoURL }} style={styles.profileImg} />
              ) : (
                <Ionicons name="camera" size={36} color="#aaa" />
              )}
              <Text style={styles.changePhoto}>Change Photo</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
            />

            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              keyboardType="email-address"
              value={form.email}
              onChangeText={(t) => setForm({ ...form, email: t })}
            />

            <Text style={styles.label}>Short Bio (max 50 characters)</Text>
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: "top" }]}
              placeholder="Write a short bio..."
              multiline
              value={form.bio}
              onChangeText={(t) => setForm({ ...form, bio: t })}
            />

            <Text style={styles.label}>Location *</Text>
            <View style={styles.inputContainer}>
              <Octicons name="location" size={20} color="gray" />
              <Picker
                selectedValue={location}
                onValueChange={(val) => {
                  if (!val.startsWith("header_")) setLocation(val);
                }}
                style={styles.picker}
              >
                <Picker.Item label="Select Location" value="" />
                {locationsData.flatMap((loc) => [
                  <Picker.Item
                    key={`header_${loc.district}`}
                    label={loc.district.toUpperCase()}
                    value={`header_${loc.district}`}
                    color="#808080" // grey header
                    style={{ fontWeight: "bold" }}
                    enabled={false}
                  />,
                  ...loc.cities.map((city) => (
                    <Picker.Item key={city} label={`   ${city}`} value={city} />
                  )),
                ])}
              </Picker>
            </View>

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(t) => setForm({ ...form, phone: t })}
            />

            <TouchableOpacity
              style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePasswordReset}>
              <Text style={styles.linkText}>Reset Password</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ───── Styles ───── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f7f7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#ea5b70" },
  formContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 10,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  imagePicker: { alignItems: "center", marginBottom: 20 },
  profileImg: { width: 100, height: 100, borderRadius: 50, marginBottom: 6 },
  changePhoto: { color: "#ea5b70", fontWeight: "600", fontSize: 13 },
  label: { fontSize: 14, color: "#555", marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  picker: { flex: 1, height: 52 },
  primaryBtn: {
    backgroundColor: "#ea5b70",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 28,
    shadowColor: "#ea5b70",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  linkText: {
    color: "#ea5b70",
    textAlign: "center",
    fontSize: 14,
    marginTop: 18,
    fontWeight: "500",
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
});
