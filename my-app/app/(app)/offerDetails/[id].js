import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../../firebaseConfig";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function OfferDetails() {
  const { id } = useLocalSearchParams();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const router = useRouter();

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const docRef = doc(db, "offers", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setOffer({ id: snap.id, ...snap.data() });
        } else {
          Alert.alert("Error", "Offer not found.");
        }
      } catch (err) {
        console.error("Error loading offer:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOffer();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ea5b70" />
        <Text style={styles.loading}>Loading offer details...</Text>
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Offer not found.</Text>
      </View>
    );
  }

  const discountedText = offer.discount ? `${offer.discount}% OFF` : "Special Offer";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: "Offer Details",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />

      {/* 🖼 Offer Image */}
      {offer.productImage ? (
        <Image source={{ uri: offer.productImage }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <MaterialCommunityIcons name="image-off-outline" size={60} color="#aaa" />
          <Text style={{ color: "#aaa" }}>No Image Available</Text>
        </View>
      )}

      {/* 🏷 Offer Info */}
      <View style={styles.card}>
        <Text style={styles.title}>{offer.title}</Text>
        <Text style={styles.product}>{offer.productName}</Text>
        <View style={styles.discountBadge}>
          <Ionicons name="pricetag-outline" size={18} color="#fff" />
          <Text style={styles.discountText}>{discountedText}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-circle-outline" size={18} color="#555" />
          <Text style={styles.owner}>Offered by: {offer.ownerEmail}</Text>
        </View>

        {offer.description ? (
          <>
            <Text style={styles.sectionHeader}>Description</Text>
            <Text style={styles.description}>{offer.description}</Text>
          </>
        ) : null}

        {offer.validTill && (
          <>
            <Text style={styles.sectionHeader}>Valid Till</Text>
            <Text style={styles.validTill}>{offer.validTill}</Text>
          </>
        )}
      </View>

      {/* 💳 Buy Button (hide if offer owner) */}
      {user && user.uid !== offer.ownerId && (
        <Pressable
          style={({ pressed }) => [
            styles.buyButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => router.push(`/buyOffer?id=${offer.id}`)}
        >
          <Ionicons name="cart-outline" size={22} color="#fff" />
          <Text style={styles.buyText}>Buy Now</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const COLORS = {
  accent: "#ea5b70",
  bg: "#f9f9f9",
  text: "#222",
  sub: "#666",
  white: "#fff",
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: COLORS.bg,
    paddingBottom: 60,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  loading: {
    color: COLORS.sub,
    marginTop: 10,
    fontSize: 15,
  },
  image: {
    width: "100%",
    height: 240,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: "#eee",
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: "rgba(0,0,0,0.05)",
    shadowOpacity: 0.7,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  product: {
    fontSize: 16,
    color: COLORS.sub,
    marginBottom: 10,
  },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: COLORS.accent,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 14,
  },
  discountText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 14,
    marginLeft: 5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  owner: {
    fontSize: 14,
    color: COLORS.sub,
    marginLeft: 6,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 14,
    color: COLORS.text,
  },
  description: {
    fontSize: 14,
    color: COLORS.sub,
    marginTop: 4,
    lineHeight: 20,
  },
  validTill: {
    fontSize: 14,
    color: COLORS.sub,
    marginTop: 4,
  },
  buyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    shadowColor: "rgba(0,0,0,0.2)",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 4,
  },
  buyText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },
});
