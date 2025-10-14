// app/(app)/listing/edit/[id].js
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { auth, db } from "../../../../firebaseConfig";

export default function EditListing() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // form
  const [itemName, setItemName] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productDetails, setProductDetails] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("product"); // "product" | "service"
  const [accepted, setAccepted] = useState(true);      // editing: default true
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "products", String(id)));
        if (!snap.exists()) {
          Alert.alert("Not found", "Listing no longer exists.", [
            { text: "OK", onPress: () => router.back() },
          ]);
          return;
        }
        const d = snap.data();
        if (active) {
          setItemName(d.name || "");
          setProductImage(d.imageUrl || "");
          setProductDetails(d.details || "");
          setPrice(String(d.price ?? ""));
          setQuantity(String(d.quantity ?? ""));
          setCategory(d.category || "product");
        }
      } catch (e) {
        Alert.alert("Error", e?.message || "Failed to load listing.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const validate = () => {
    setErrMsg("");
    if (!itemName.trim())
      return "Please add a name for your listing.";
    if (!productImage.trim())
      return "Please add an image URL.";
    const looksLikeUrl = /^(https?:\/\/|data:image\/)/i.test(productImage.trim());
    if (!looksLikeUrl)
      return "Image URL must start with http(s):// or be a data:image URL.";
    if (!productDetails.trim())
      return "Please add a short description.";
    const p = Number(price);
    if (!Number.isFinite(p) || p <= 0)
      return "Price must be a number greater than 0.";
    const q = Number(quantity);
    if (!Number.isInteger(q) || q < 1 || q > 100)
      return "Quantity must be a whole number between 1 and 100.";
    if (!["product", "service"].includes(category))
      return "Choose Product or Service.";
    if (!accepted)
      return "Please confirm the details are accurate.";
    return "";
  };

  const save = async () => {
    if (submitting) return;
    const msg = validate();
    if (msg) {
      setErrMsg(msg);
      return;
    }

    try {
      setSubmitting(true);
      Keyboard.dismiss();

      // basic owner check
      const current = auth.currentUser;
      const snap = await getDoc(doc(db, "products", String(id)));
      const d = snap.data();
      if (current?.uid && d?.ownerId && current.uid !== d.ownerId) {
        throw new Error("You’re not allowed to edit this listing.");
      }

      await updateDoc(doc(db, "products", String(id)), {
        name: itemName.trim(),
        imageUrl: productImage.trim(),
        details: productDetails.trim(),
        price: Number(price),
        quantity: Number(quantity),
        category,
        updatedAt: serverTimestamp(),
      });

      Alert.alert("Saved", "Listing updated successfully.", [
        {
          text: "OK",
          onPress: () =>
            router.replace({ pathname: "/(app)/listing/[id]", params: { id } }),
        },
      ]);
    } catch (e) {
      Alert.alert("Error", e?.message || "Failed to save changes.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ color: "#999", marginTop: 8 }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Edit listing</Text>
        <Text style={styles.subtitle}>Update your product/service details</Text>
      </View>

      {/* Form */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.label}>Selling item name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter item name"
            value={itemName}
            onChangeText={setItemName}
            editable={!submitting}
          />

          <Text style={styles.label}>Image of product/Service</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter image URL (https://...)"
            value={productImage}
            onChangeText={setProductImage}
            autoCapitalize="none"
            keyboardType="url"
            editable={!submitting}
          />

          <Text style={styles.label}>Details of product/Service</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter product/service details"
            value={productDetails}
            onChangeText={setProductDetails}
            multiline
            editable={!submitting}
          />

          <Text style={styles.label}>Item Category</Text>
          <View style={styles.segmentRow}>
            <Pressable
              onPress={() => setCategory("product")}
              disabled={submitting}
              style={[
                styles.segmentBtn,
                category === "product" && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  category === "product" && styles.segmentTextActive,
                ]}
              >
                Product
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCategory("service")}
              disabled={submitting}
              style={[
                styles.segmentBtn,
                category === "service" && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  category === "service" && styles.segmentTextActive,
                ]}
              >
                Service
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Selling quantity (max 100)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 5"
            value={quantity}
            onChangeText={(t) => setQuantity(t.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            keyboardType="number-pad"
            editable={!submitting}
            maxLength={3}
          />

          <Text style={styles.label}>Price (USD)</Text>
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
            <Switch
              value={accepted}
              onValueChange={setAccepted}
              disabled={submitting}
              thumbColor={accepted ? "#fff" : undefined}
              trackColor={{ false: "#d8d8d8", true: "#ea5b70" }}
            />
            <Text style={styles.termsText}>
              I confirm these details are accurate.
            </Text>
          </View>

          {!!errMsg && <Text style={styles.errorText}>{errMsg}</Text>}
        </View>

        {/* Bottom spacing so button clears home indicator */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Sticky Save button */}
      <View style={styles.stickyBar}>
        <Pressable
          style={[styles.saveBtn, submitting && styles.saveBtnDisabled]}
          onPress={save}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const COLORS = {
  bg: "#f7f7f7",
  card: "#fff",
  text: "#1b1b1b",
  sub: "#6b6b6b",
  line: "#e9e9e9",
  accent: "#ea5b70",
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.text },
  subtitle: { color: COLORS.sub, marginTop: 2 },

  scroll: { paddingHorizontal: 16, paddingTop: 10 },

  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    shadowColor: "rgba(0,0,0,0.06)",
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },

  label: { fontSize: 13, color: COLORS.text, marginBottom: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },

  segmentRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  segmentBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentBtnActive: { borderColor: COLORS.accent, backgroundColor: "#ffe8ec" },
  segmentText: { color: COLORS.text, fontWeight: "600" },
  segmentTextActive: { color: COLORS.accent, fontWeight: "800" },

  termsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  termsText: { color: COLORS.sub, flexShrink: 1 },

  errorText: {
    marginTop: 10,
    color: "#c0392b",
    backgroundColor: "#fdecea",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },

  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: "rgba(250,250,250,0.9)",
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
