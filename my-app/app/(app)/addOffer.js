import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AddOfferPage() {
  const router = useRouter();
  const storage = getStorage();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const [form, setForm] = useState({
    productId: "",
    productName: "",
    productImage: "",
    category: "",
    prevPrice: "",
    title: "",
    discount: "",
  });

  // 🔹 Load current user's products
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          Alert.alert("Login required", "Please sign in to add an offer.");
          router.back();
          return;
        }
        const q = query(collection(db, "products"), where("ownerId", "==", user.uid));
        const snap = await getDocs(q);
        if (!active) return;
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(items);
      } catch (e) {
        console.error("Load products failed:", e);
        Alert.alert("Error", "Could not load your products.");
      } finally {
        if (active) setLoadingProducts(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === form.productId),
    [products, form.productId]
  );

  const onSelectProduct = (id) => {
    const p = products.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      productId: id,
      productName: p?.name || "",
      productImage: p?.imageUrl || "",
      category: p?.category || "",
      prevPrice: p?.price ? String(p.price) : f.prevPrice,
    }));
  };

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
      const fileName = `offers/${auth.currentUser.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      setForm((f) => ({ ...f, productImage: downloadURL }));
      setUploadProgress(null);
      Alert.alert("✅ Uploaded", "Image uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload Failed", "Could not upload image.");
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    if (!form.productName.trim()) return "Product name is required.";
    if (!form.title.trim()) return "Offer title is required.";
    const disc = Number(form.discount);
    if (!Number.isFinite(disc) || disc <= 0 || disc >= 100)
      return "Discount must be between 1 and 99.";
    if (form.prevPrice && !Number.isFinite(Number(form.prevPrice)))
      return "Previous price must be a valid number.";
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) return Alert.alert("Check form", error);

    const user = auth.currentUser;
    if (!user) return Alert.alert("Login required", "Please sign in again.");

    try {
      setSaving(true);

      const prev = Number(form.prevPrice || 0);
      const disc = Number(form.discount);
      const currentPrice =
        prev > 0 && disc > 0 ? Number((prev * (1 - disc / 100)).toFixed(2)) : null;

      await addDoc(collection(db, "offers"), {
        title: form.title.trim(),
        productName: form.productName.trim(),
        productId: form.productId || null,
        productImage: (form.productImage || "").trim() || null,
        category: (form.category || "").trim() || null,
        prevPrice: prev || null,
        discount: disc,
        currentPrice,
        ownerId: user.uid,
        ownerEmail: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert("✅ Offer added", "Your offer has been published.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error("Save offer failed:", e);
      Alert.alert("Error", "Could not save offer. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 60 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.header}>✨ Add Offer</Text>

      {/* 🔸 Product Selector */}
      <View style={styles.card}>
        <Text style={styles.label}>Choose one of your products (optional)</Text>
        <View style={styles.pickerContainer}>
          {loadingProducts ? (
            <View style={{ padding: 12 }}>
              <ActivityIndicator />
            </View>
          ) : (
            <Picker
              selectedValue={form.productId}
              onValueChange={onSelectProduct}
              dropdownIconColor="#ea5b70"
            >
              <Picker.Item label="-- Select a product --" value="" />
              {products.map((p) => (
                <Picker.Item key={p.id} label={p.name} value={p.id} />
              ))}
            </Picker>
          )}
        </View>
      </View>

      {/* 🔸 Product Details */}
      <View style={styles.card}>
        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Handmade Mug"
          value={form.productName}
          onChangeText={(t) => setForm((f) => ({ ...f, productName: t }))}
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Home & Living"
          value={form.category}
          onChangeText={(t) => setForm((f) => ({ ...f, category: t }))}
        />

        {/* 🖼 Image Picker */}
        <Text style={styles.label}>Product Image</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste image URL or upload below"
          autoCapitalize="none"
          value={form.productImage}
          onChangeText={(t) => setForm((f) => ({ ...f, productImage: t }))}
        />
        <Pressable onPress={pickImage} style={styles.uploadBtn}>
          <Text style={styles.uploadBtnText}>📁 Choose from Gallery</Text>
        </Pressable>
        {uploadProgress && (
          <Text style={styles.uploadProgress}>{uploadProgress}</Text>
        )}
        {form.productImage ? (
          <Image
            source={{ uri: form.productImage }}
            style={styles.preview}
            onError={() => Alert.alert("Invalid URL", "Couldn't load the image.")}
          />
        ) : null}
      </View>

      {/* 🔸 Offer Info */}
      <View style={styles.card}>
        <Text style={styles.label}>Offer Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Weekend Flash Sale"
          value={form.title}
          onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
        />

        <Text style={styles.label}>Discount % *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 25"
          keyboardType="numeric"
          value={form.discount}
          onChangeText={(t) => setForm((f) => ({ ...f, discount: t }))}
        />

        <Text style={styles.label}>Previous Price (LKR)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2500"
          keyboardType="numeric"
          value={form.prevPrice}
          onChangeText={(t) => setForm((f) => ({ ...f, prevPrice: t }))}
        />
      </View>

      {/* 🔘 Buttons */}
      <Pressable
        style={[styles.saveBtn, (saving || uploading) && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={saving || uploading}
      >
        {(saving || uploading) ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>Save Offer</Text>
        )}
      </Pressable>

      <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

// ✅ Styles
const COLORS = {
  accent: "#ea5b70",
  text: "#222",
  sub: "#555",
  bg: "#f7f7f7",
  card: "#fff",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingHorizontal: 16 },
  header: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.accent,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    shadowColor: "rgba(0,0,0,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10,
  },
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    marginTop: 4,
  },
  uploadBtn: {
    backgroundColor: "#f2f2f2",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  uploadBtnText: { color: COLORS.text, fontWeight: "600" },
  uploadProgress: { textAlign: "center", color: COLORS.sub, marginBottom: 6 },
  preview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    marginTop: 6,
    marginBottom: 10,
    backgroundColor: "#eee",
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  saveText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  cancelBtn: {
    borderColor: "#ccc",
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 40,
  },
  cancelText: { color: COLORS.text, fontWeight: "700" },
});
