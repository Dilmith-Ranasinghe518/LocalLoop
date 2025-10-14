import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from "../../../context/authContext";
import { db } from "../../../firebaseConfig";
import { useNavigation } from "expo-router"; //here

export default function HomeScreen() {
  const router = useRouter();
  
  const navigation = useNavigation(); //here to
  
  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: "#d8436b" },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "bold" },
    });
  }, [navigation]); //here

useEffect(() => {
  navigation.setOptions({
    headerStyle: { backgroundColor: "#d8436b" },
    headerTintColor: "#fff",
    headerTitleStyle: { fontWeight: "bold" },
  });
}, [navigation]);

  const { user } = useAuth();

  const [latestProducts, setLatestProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  // 🔹 Fetch Firestore user profile
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!user?.uid) {
          setProfile(null);
          return;
        }
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (active) setProfile(snap.exists() ? snap.data() : null);
      } catch (e) {
        if (active) setProfile(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.uid]);

  // 🔹 Friendly greeting name
  const displayName = useMemo(() => {
    if (profile?.name?.trim()) return profile.name.trim();
    if (user?.displayName?.trim()) return user.displayName.trim();
    if (user?.email) return user.email.split("@")[0];
    return "there";
  }, [profile?.name, user?.displayName, user?.email]);

  // 🔹 User avatar
  const userAvatar =
    profile?.photoURL ||
    user?.photoURL ||
    require("../../../assets/images/profile-placeholder.png");

  // 🔹 Fetch latest products
  useEffect(() => {
    const q = query(
      collection(db, "products"),
      orderBy("createdAt", "desc"),
      limit(6)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
        setLatestProducts(items);
        setLoading(false);
      },
      (err) => {
        console.error("Products listen failed:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const openAllProducts = useCallback(
    () => router.push("/(app)/allProducts"),
    [router]
  );

  const renderCard = ({ item }) => (
    <Pressable 
      style={styles.marketCard}
      onPress={() =>
        router.push({ pathname: "/(app)/buy", params: { id: item.id } })
      }
    >
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri:
              item.imageUrl ||
              "https://via.placeholder.com/300x200.png?text=No+Image",
          }}
          style={styles.marketImage}
        />
        {typeof item.quantity === "number" && (
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>{item.quantity}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.marketContent}>
        <View style={styles.marketTop}>
          <View style={styles.sellerRow}>
            <Ionicons name="person-circle-outline" size={14} color="#999" />
            <Text style={styles.marketSeller} numberOfLines={1}>
              {item.ownerEmail ? item.ownerEmail.split('@')[0] : "Local seller"}
            </Text>
          </View>

          {!!item.category && (
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>

        <Text style={styles.marketName} numberOfLines={2}>
          {item.name || "Unnamed product"}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.marketPrice}>
            {typeof item.price === "number" ? `LKR ${item.price.toLocaleString()}` : "LKR —"}
          </Text>
          
          <View style={styles.buyButton}>
            <MaterialCommunityIcons name="cart-plus" size={16} color="#fff" />
            <Text style={styles.buyButtonText}>Buy</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      
      {/* Gradient Header Background */}
      <LinearGradient
        colors={['#FFE5EC', '#FFF5F7', '#FAFAFA']}
        style={styles.headerGradient}
      />

      <ScrollView 
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------- Top bar ---------- */}
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../../assets/images/splash-icon.png")}
                style={styles.logo}
              />
            </View>
            <View>
              <Text style={styles.brand}>LocalLoop</Text>
              <Text style={styles.brandSub}>Buy. Sell. Connect. Impact.</Text>
            </View>
          </View>

          {/* 👤 Profile button */}
          <Pressable
            style={styles.profileBtn}
            onPress={() => router.push("/(app)/profile")}
          >
            <Image
              source={
                typeof userAvatar === "string"
                  ? { uri: userAvatar }
                  : userAvatar
              }
              style={styles.profileImage}
            />
            <View style={styles.profileBadge} />
          </Pressable>
        </View>

        {/* Greeting card with gradient */}
        <View style={styles.greetingWrapper}>
          <LinearGradient
            colors={['#D94F70', '#E77A8F']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.greetingCard}
          >
            <View style={styles.greetingContent}>
              <Text style={styles.greetingTitle}>Hello, {displayName}! 👋</Text>
              <Text style={styles.greetingSub}>
                Discover local treasures in your neighborhood
              </Text>
            </View>
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
          </LinearGradient>
        </View>

        {/* Quick actions with improved design */}
        <View style={styles.actionsRow}>
          <Pressable
            style={styles.sellAction}
            onPress={() => router.push("/sellProductScreen")}
          >
            <LinearGradient
            colors={['#a5badeff', '#91bddbff']}   // new smooth gradient
            style={styles.actionGradient}
          >

              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name="handshake" size={26} color="#fff" />
              </View>
              <Text style={styles.actionTitle}>Sell Items</Text>
              <Text style={styles.actionDesc}>List your products</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={styles.buyAction}
            onPress={openAllProducts}
          >
            <View style={styles.buyActionBg}>
              <View style={[styles.iconCircle, styles.iconCircleDark]}>
                <MaterialCommunityIcons
                  name="shopping-outline"
                  size={26}
                  color="#D94F70"
                />
              </View>
              <Text style={styles.actionTitleDark}>Browse All</Text>
              <Text style={styles.actionDescDark}>Find great deals</Text>
            </View>
          </Pressable>
        </View>

        {/* Marketplace section */}
        <View style={styles.marketSection}>
          <View style={styles.marketHeaderRow}>
            <View>
              <Text style={styles.marketTitle}>Fresh Finds</Text>
              <Text style={styles.marketSubtitle}>Latest items near you</Text>
            </View>
            <Pressable onPress={openAllProducts} style={styles.seeAllBtn}>
              <Text style={styles.seeAll}>See All</Text>
              <Ionicons name="arrow-forward" size={16} color="#D94F70" />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D94F70" />
            </View>
          ) : latestProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="package-variant" size={48} color="#ddd" />
              <Text style={styles.emptyText}>No products available yet</Text>
              <Text style={styles.emptySubtext}>Be the first to list an item!</Text>
            </View>
          ) : (
            <FlatList
              data={latestProducts}
              keyExtractor={(it) => it.id}
              renderItem={renderCard}
              contentContainerStyle={styles.productGrid}
              scrollEnabled={false}
              numColumns={2}
              columnWrapperStyle={styles.productRow}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const COLORS = {
  primary: '#D94F70',
  primaryLight: '#E77A8F',
  primaryLighter: '#F5A4B8',
  accent: '#F5EEBE',
  accentDark: '#E8DBA0',
  bg: '#FAFAFA',
  cardBg: '#FFFFFF',
  text: '#1F1F1F',
  textLight: '#666666',
  textLighter: '#999999',
  border: '#F0F0F0',
  shadow: 'rgba(217, 79, 112, 0.15)',
};

const shadow = {
  shadowColor: COLORS.shadow,
  shadowOpacity: 1,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 12,
  elevation: 5,
};

const lightShadow = {
  shadowColor: COLORS.shadow,
  shadowOpacity: 0.8,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 8,
  elevation: 3,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  headerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  scroll: { padding: 20, paddingBottom: 140 },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 8,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoContainer: {
    backgroundColor: COLORS.cardBg,
    padding: 8,
    borderRadius: 12,
    ...lightShadow,
  },
  logo: { width: 32, height: 32, borderRadius: 8 },
  brand: { fontWeight: "800", fontSize: 18, color: COLORS.text, letterSpacing: -0.5 },
  brandSub: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },

  profileBtn: {
    borderRadius: 50,
    overflow: "visible",
    width: 48,
    height: 48,
    backgroundColor: COLORS.cardBg,
    alignItems: "center",
    justifyContent: "center",
    ...lightShadow,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    resizeMode: "cover",
  },
  profileBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: COLORS.cardBg,
  },

  greetingWrapper: { marginBottom: 20 },
  greetingCard: {
    borderRadius: 20,
    padding: 16,
    overflow: 'hidden',
    minHeight: 120,
    ...shadow,
  },
  greetingContent: { zIndex: 2 },
  greetingTitle: { 
    fontSize: 24, 
    fontWeight: "800", 
    color: "#fff",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  greetingSub: { 
    fontSize: 14, 
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },
  decorCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -30,
    right: -20,
  },
  decorCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -20,
    right: 60,
  },

  actionsRow: { flexDirection: "row", gap: 14, marginBottom: 32 },
  sellAction: { flex: 1, borderRadius: 16, overflow: 'hidden', ...shadow },
  buyAction: { flex: 1, borderRadius: 16, overflow: 'hidden', ...shadow },
  actionGradient: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  buyActionBg: {
    backgroundColor: COLORS.accent,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconCircleDark: {
    backgroundColor: 'rgba(217, 79, 112, 0.15)',
  },
  actionTitle: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 16,
    letterSpacing: -0.3,
  },
  actionDesc: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
  },
  actionTitleDark: { 
    color: COLORS.text, 
    fontWeight: "700", 
    fontSize: 16,
    letterSpacing: -0.3,
  },
  actionDescDark: {
    color: COLORS.textLight,
    fontSize: 12,
  },

  marketSection: { flex: 1 },
  marketHeaderRow: {
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  marketTitle: { 
    fontSize: 22, 
    fontWeight: "800", 
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  marketSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(217, 79, 112, 0.1)',
    borderRadius: 20,
  },
  seeAll: { 
    color: COLORS.primary, 
    fontWeight: "700",
    fontSize: 14,
  },

  productGrid: { paddingBottom: 16 },
  productRow: { gap: 14, marginBottom: 14 },

  marketCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
    ...lightShadow,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
    backgroundColor: '#F5F5F5',
  },
  marketImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  quantityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quantityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  marketContent: {
    padding: 12,
  },
  marketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  marketSeller: { 
    fontSize: 11, 
    color: COLORS.textLighter,
    flex: 1,
  },
  categoryChip: {
    backgroundColor: 'rgba(217, 79, 112, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: { 
    fontSize: 10, 
    color: COLORS.primary,
    fontWeight: '600',
    textTransform: "capitalize",
  },

  marketName: { 
    fontSize: 14, 
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 18,
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marketPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primary,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buyButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textLight,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textLighter,
    marginTop: 4,
  },
});