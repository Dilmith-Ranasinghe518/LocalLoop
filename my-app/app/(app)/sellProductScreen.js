// app/(app)/sellProductScreen.js
import * as ImagePicker from "expo-image-picker";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db, storage } from "../../firebaseConfig";
import { Picker } from "@react-native-picker/picker";

let routerReplace = null;
try {
  const { router } = require("expo-router");
  routerReplace = (path) => router.replace(path);
} catch (_) {}

export default function SellProductScreen({ navigation }) {
  const [itemName, setItemName] = useState("");
  const [pickedImageUri, setPickedImageUri] = useState(null); // gallery image only
  const [productDetails, setProductDetails] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("product"); // "product" | "service"
  const [subCategory, setSubCategory] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // “AI Ideas” Modal
  const [showIdeas, setShowIdeas] = useState(true);
  const [ideasInput, setIdeasInput] = useState("");
  const [ideas, setIdeas] = useState([]);

  const resetAndGoHome = () => {
    if (routerReplace) {
      routerReplace("/(app)/(tabs)/home");
    } else if (navigation?.reset) {
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
    }
  };

  // If user switches to "service", make quantity non-applicable (default to 1)
  useEffect(() => {
    if (category === "service") setQuantity("1");
  }, [category]);

  // ---------- Image Picker (backward-compatible) ----------
  const pickFromGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please allow photo library access to pick an image."
        );
        return;
      }

      const mediaTypes =
        (ImagePicker?.MediaType && ImagePicker.MediaType.Images) ||
        ImagePicker.MediaTypeOptions.Images;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.length) {
        setPickedImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.error("Image pick failed:", e);
      Alert.alert("Image Picker", e?.message ?? "Failed to pick image");
    }
  };

  // Upload local file (URI) to Firebase Storage and return its download URL
  const uploadImageAndGetUrl = async (localUri) => {
    const resp = await fetch(localUri);
    const blob = await resp.blob();

    const user = auth.currentUser || {};
    const uid = user.uid || "anonymous";
    const filename = `products/${uid}/${Date.now()}.jpg`;

    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  };

  const validate = () => {
    if (
      !itemName.trim() ||
      !productDetails.trim() ||
      !price.toString().trim()
    ) {
      Alert.alert(
        "Missing info",
        "Please fill all the fields (including price)."
      );
      return false;
    }

    if (!pickedImageUri) {
      Alert.alert("Image required", "Please pick an image from your gallery.");
      return false;
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      Alert.alert("Price", "Please enter a valid price greater than 0.");
      return false;
    }

    // Quantity validation only when category is "product"
    if (category === "product") {
      const q = Number(quantity);
      if (!Number.isInteger(q) || q < 1 || q > 100) {
        Alert.alert(
          "Quantity",
          "Selling quantity must be a whole number between 1 and 100."
        );
        return false;
      }
    }

    if (!["product", "service"].includes(category)) {
      Alert.alert("Category", "Please select a valid item category.");
      return false;
    }
    if (!subCategory.trim()) {
      Alert.alert("Subcategory", "Please select a subcategory.");
      return false;
    }

    if (!acceptedTerms) {
      Alert.alert("Terms", "You must accept the terms to publish.");
      return false;
    }
    return true;
  };

  const handlePublish = async () => {
    if (submitting) return;
    if (!validate()) return;

    try {
      setSubmitting(true);
      Keyboard.dismiss();

      const user = auth.currentUser || null;

      const imageUrlToSave = await uploadImageAndGetUrl(pickedImageUri);

      await addDoc(collection(db, "products"), {
        name: itemName.trim(),
        imageUrl: imageUrlToSave,
        details: productDetails.trim(),
        price: Number(price),
        quantity: category === "service" ? 1 : Number(quantity),
        category,
        subCategory,
        ownerId: user?.uid ?? null,
        ownerEmail: user?.email ?? null,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Reset form
      setItemName("");
      setPickedImageUri(null);
      setProductDetails("");
      setPrice("");
      setQuantity("");
      setCategory("product");
      setSubCategory("");
      setAcceptedTerms(false);

      Alert.alert("Success", "Product published successfully!", [
        { text: "OK", onPress: resetAndGoHome },
      ]);
    } catch (err) {
      console.error("Failed to publish:", err);
      Alert.alert("Error", err?.message || "Failed to publish the product.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------
  // “AI” Suggestions (on-device heuristic)
  // ---------------------
  const seedTrends = {
    electronics: [
      "Wireless Earbuds",
      "Bluetooth Speaker",
      "Phone Stand",
      "Power Bank",
      "LED Strip Lights",
    ],
    fashion: [
      "Oversized Hoodie",
      "Athleisure Set",
      "Minimalist Sneakers",
      "Tote Bag",
      "Baseball Cap",
    ],
    home: [
      "Scented Candles",
      "Air Fryer Accessories",
      "Storage Baskets",
      "Throw Pillows",
      "Desk Lamp",
    ],
    beauty: [
      "Vitamin C Serum",
      "Sunscreen SPF 50",
      "Hair Mask",
      "Lip Oil",
      "Nail Gel Kit",
    ],
    fitness: [
      "Resistance Bands",
      "Yoga Mat",
      "Adjustable Dumbbells",
      "Foam Roller",
      "Shaker Bottle",
    ],
    service: [
      "Home Cleaning",
      "Personal Tutoring",
      "Pet Sitting",
      "Graphic Design",
      "Photography Session",
    ],
    baby: ["Baby Carrier", "Silicone Bibs", "Bottle Warmer", "Play Mat", "Night Light"],
    kitchen: ["Non-stick Pan", "Knife Set", "Spice Organizer", "Reusable Straws", "Water Filter Jug"],
  };

  const genericTrending = [
    "Wireless Earbuds",
    "Scented Candles",
    "Yoga Mat",
    "Phone Stand",
    "Minimalist Sneakers",
    "LED Strip Lights",
    "Vitamin C Serum",
    "Tote Bag",
    "Power Bank",
  ];

  const classify = (text) => {
    const q = (text || "").toLowerCase();
    if (!q) return null;
    if (/\b(service|clean|tutor|design|photography|lesson|repair|consult)\b/.test(q))
      return "service";
    if (/\b(phone|earbud|speaker|laptop|led|power|usb|tech|electronic)\b/.test(q))
      return "electronics";
    if (/\bshoe|sneaker|hoodie|tshirt|bag|cap|dress|fashion/.test(q)) return "fashion";
    if (/\bhome|sofa|lamp|pillow|basket|organizer|decor|candle/.test(q)) return "home";
    if (/\bbeauty|serum|sunscreen|makeup|hair|lip/.test(q)) return "beauty";
    if (/\bfitness|gym|yoga|band|dumbbell|workout/.test(q)) return "fitness";
    if (/\bkitchen|pan|knife|spice|straw|filter|cook/.test(q)) return "kitchen";
    if (/\bbaby|infant|kid|bottle|carrier|bib/.test(q)) return "baby";
    return null;
  };

  const generateIdeas = () => {
    const bucket = classify(ideasInput);
    let list = [];
    if (bucket && seedTrends[bucket]) {
      list = seedTrends[bucket];
      if (bucket === "service") setCategory("service");
      else setCategory("product");
    } else {
      list = genericTrending;
    }
    if (ideasInput.trim()) {
      const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
      list = [`${cap(ideasInput.trim())} Bundle`, `Premium ${cap(ideasInput.trim())}`, ...list];
    }
    const uniq = Array.from(new Set(list)).slice(0, 10);
    setIdeas(uniq);
  };

  const applySuggestion = (name) => {
    setItemName(name);
    if (!productDetails.trim()) {
      setProductDetails(`Brand new ${name} — great quality, best price.`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Ideas Modal */}
      <Modal visible={showIdeas} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Close icon (top-right) */}
            <Pressable
              accessibilityLabel="Close suggestions"
              style={styles.modalCloseIcon}
              onPress={() => setShowIdeas(false)}
            >
              <Text style={styles.modalCloseIconText}>×</Text>
            </Pressable>

            <Text style={styles.modalTitle}>What do you want to sell?</Text>
            <Text style={styles.modalSub}>
              Get trending ideas to speed up your listing.
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g., phone accessories, cleaning, candles…"
              value={ideasInput}
              onChangeText={setIdeasInput}
              autoCapitalize="none"
              autoCorrect
            />

            <Pressable style={styles.modalGenBtn} onPress={generateIdeas}>
              <Text style={styles.modalGenBtnText}>Get ideas</Text>
            </Pressable>

            <ScrollView
              contentContainerStyle={{ gap: 8 }}
              style={{ maxHeight: 180, marginTop: 10 }}
            >
              {ideas.length === 0 ? (
                <Text style={{ color: "#777", textAlign: "center" }}>
                  Ideas will appear here…
                </Text>
              ) : (
                ideas.map((s) => (
                  <Pressable key={s} onPress={() => applySuggestion(s)} style={styles.suggestionChip}>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>

            <View style={{ height: 10 }} />
            <Pressable style={styles.modalCloseBtn} onPress={() => setShowIdeas(false)}>
              <Text style={styles.modalCloseText}>Use these ideas → Fill the form</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 50 : 0}
      >    
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
          <Text style={styles.title}>Sell a product</Text>
          <Text style={styles.subtitle}>Add products or services you wish to sell</Text>

          {/* Quick re-open ideas */}
          <Pressable onPress={() => setShowIdeas(true)} style={styles.ideasReopen}>
            <Text style={styles.ideasReopenText}>Need inspiration? Get ideas</Text>
          </Pressable>

          <Text style={styles.label}>Selling item name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter item name"
            value={itemName}
            onChangeText={setItemName}
            editable={!submitting}
          />

          {/* Gallery picker only */}
          <Text style={styles.label}>Image of product/Service</Text>
          <View style={{ marginBottom: 12 }}>
            <Pressable
              onPress={pickFromGallery}
              disabled={submitting}
              style={[styles.pickBtn, submitting && styles.disabledBtn]}
            >
              <Text style={styles.pickBtnText}>
                {pickedImageUri ? "Pick a different image" : "Pick from gallery"}
              </Text>
            </Pressable>

            {pickedImageUri ? (
              <View style={styles.previewRow}>
                <Image
                  source={{ uri: pickedImageUri }}
                  style={{ width: 90, height: 90, borderRadius: 8 }}
                />
                <Text style={{ marginLeft: 10, color: COLORS.sub, flex: 1 }}>
                  This image will be uploaded to Firebase Storage.
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.label}>Details of product/Service</Text>
          <TextInput
            style={[styles.input, { height: 120, textAlignVertical: "top" }]}
            placeholder="Enter product/service details"
            value={productDetails}
            onChangeText={setProductDetails}
            multiline
            editable={!submitting}
          />

          {/* Category */}
          <Text style={styles.label}>Item Category</Text>
          <View style={styles.segmentRow}>
            <Pressable
              disabled={submitting}
              onPress={() => setCategory("product")}
              style={[styles.segmentBtn, category === "product" && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, category === "product" && styles.segmentTextActive]}>
                Product
              </Text>
            </Pressable>
            <Pressable
              disabled={submitting}
              onPress={() => setCategory("service")}
              style={[styles.segmentBtn, category === "service" && styles.segmentBtnActive]}
            >
              <Text style={[styles.segmentText, category === "service" && styles.segmentTextActive]}>
                Service
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Subcategory</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={subCategory}
              onValueChange={(value) => setSubCategory(value)}
              style={styles.picker}
            >
              <Picker.Item label="Select a subcategory..." value="" />
              {(category === "service"
                ? ["Tutoring", "Cleaning", "Photography", "Design", "Delivery", "Repair", "Other"]
                : ["Electronics", "Stationary", "Fashion", "Home", "Beauty", "Fitness", "Kitchen", "Baby", "Other"]
              ).map((item) => (
                <Picker.Item key={item} label={item} value={item} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>
            Selling quantity {category === "product" ? "(max 100)" : "(not needed for services)"}
          </Text>
          <TextInput
            style={[
              styles.input,
              (category === "service" || submitting) && styles.disabledInput,
            ]}
            placeholder={category === "service" ? "Disabled for services" : "e.g., 5"}
            value={quantity}
            onChangeText={(t) => setQuantity(t.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            keyboardType="number-pad"
            editable={!submitting && category !== "service"}   // disabled for services
            maxLength={3}
          />

          <Text style={styles.label}>Price (LKR)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 100"
            value={price}
            onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            keyboardType="decimal-pad"
            editable={!submitting}
          />

          <View style={styles.termsRow}>
            <Switch value={acceptedTerms} onValueChange={setAcceptedTerms} disabled={submitting} />
            <Text style={styles.termsText}>
              I accept the terms{" "}
              <Text
                style={styles.termsLink}
                onPress={() =>
                  Alert.alert(
                    "Terms & Conditions",
                    "By publishing, you confirm the listing is accurate, lawful, and you have rights to the images and content."
                  )
                }
              >
                Read our T&Cs
              </Text>
            </Text>
          </View>

          <Pressable
            style={[styles.publishBtn, (!acceptedTerms || submitting) && styles.disabledBtn]}
            onPress={handlePublish}
            disabled={!acceptedTerms || submitting}
          >
            {submitting ? <ActivityIndicator /> : <Text style={styles.publishBtnText}>Publish</Text>}
          </Pressable>

          {/* Bottom spacer so button stays above the home indicator */}
          <View style={{ height: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const COLORS = {
  accent: "#ea5b70",
  text: "#1b1b1b",
  sub: "#6b6b6b",
  line: "#ddd",
  white: "#fff",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },

  // Scroll content padding replaces the old container padding/marginTop
  scrollContent: { padding: 16, paddingBottom: 24 },

  title: { fontSize: 24, fontWeight: "700", marginBottom: 12, color: COLORS.text },
  subtitle: { fontSize: 16, marginBottom: 10, color: COLORS.sub },
  label: { fontSize: 14, marginBottom: 8, color: COLORS.text },

  input: {
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  disabledInput: {
    backgroundColor: "#f1f1f1",
    color: "#9b9b9b",
  },

  segmentRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  segmentBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentBtnActive: { borderColor: COLORS.accent, backgroundColor: "#ffe8ec" },
  segmentText: { color: COLORS.text, fontWeight: "600" },
  segmentTextActive: { color: COLORS.accent, fontWeight: "800" },

  pickBtn: {
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  pickBtnText: { color: COLORS.text, fontWeight: "700" },
  previewRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },

  termsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  termsText: { fontSize: 14, color: COLORS.sub, flexShrink: 1 },
  termsLink: { color: COLORS.accent, textDecorationLine: "underline" },

  publishBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: "center",
  },
  disabledBtn: { backgroundColor: "#ddd" },
  publishBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Ideas modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, position: "relative" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  modalSub: { color: COLORS.sub, marginTop: 4, marginBottom: 10 },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  modalGenBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 10,
  },
  modalGenBtnText: { color: "#fff", fontWeight: "800" },
  suggestionChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#f6f6f6",
    borderRadius: 10,
  },
  suggestionText: { color: COLORS.text, fontWeight: "600" },
  modalCloseBtn: {
    backgroundColor: "#111",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 12,
  },
  modalCloseText: { color: "#fff", fontWeight: "800" },

  // top-right close “×” icon
  modalCloseIcon: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseIconText: {
    fontSize: 26,
    color: "#999",
    lineHeight: 26,
  },

  ideasReopen: { alignSelf: "flex-start", marginBottom: 8 },
  ideasReopenText: { color: COLORS.accent, fontWeight: "700" },

  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  picker: { height: 50, color: COLORS.text },
});
