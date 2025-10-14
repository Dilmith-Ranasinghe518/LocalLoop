import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { db } from "../../firebaseConfig";

const SUBCATEGORIES = {
  service: ["Tutoring", "Cleaning", "Photography", "Design", "Delivery", "Repair", "Other"],
  product: ["Electronics", "Stationary", "Fashion", "Home", "Beauty", "Fitness", "Kitchen", "Baby", "Other"],
};

export default function AllProducts() {
  const router = useRouter();
  const { focus } = useLocalSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setItems(arr);
        setLoading(false);

        if (focus) {
          const idx = arr.findIndex((x) => x.id === focus);
          if (idx >= 0 && listRef.current) {
            setTimeout(() => listRef.current.scrollToIndex({ index: idx, animated: true }), 200);
          }
        }
      },
      (err) => {
        console.error("AllProducts listen failed:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [focus]);

  // Filter items based on selections and search
  const filteredItems = items.filter((item) => {
    // Category filter
    if (selectedCategory !== "all" && item.category !== selectedCategory) {
      return false;
    }
    
    // SubCategory filter
    if (selectedSubCategory !== "all" && item.subCategory !== selectedSubCategory) {
      return false;
    }
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const name = (item.name || "").toLowerCase();
      const details = (item.details || "").toLowerCase();
      return name.includes(query) || details.includes(query);
    }
    
    return true;
  });

  const goBuy = (item) => {
    router.push({ pathname: "/(app)/buy", params: { id: item.id } });
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSelectedSubCategory("all");
  };

  const renderItem = ({ item }) => (
    <Pressable style={styles.card} onPress={() => goBuy(item)}>
      {/* Left: Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: item.imageUrl || "https://via.placeholder.com/600x400.png?text=No+Image" }}
          style={styles.image}
        />
        {typeof item.quantity === "number" && (
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>{item.quantity}</Text>
          </View>
        )}
      </View>
      
      {/* Right: Content */}
      <View style={styles.cardContent}>
        <View style={styles.topRow}>
          <View style={styles.sellerRow}>
            <Ionicons name="person-circle-outline" size={12} color="#999" />
            <Text style={styles.sellerText} numberOfLines={1}>
              {item.ownerEmail ? item.ownerEmail.split('@')[0] : "Local"}
            </Text>
          </View>
          
          {!!item.category && (
            <View style={[styles.categoryBadge, item.category === "service" && styles.serviceBadge]}>
              <Text style={[styles.categoryBadgeText, item.category === "service" && styles.serviceBadgeText]}>
                {item.category}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.name} numberOfLines={2}>{item.name || "Unnamed product"}</Text>
        
        {!!item.subCategory && (
          <Text style={styles.subCategoryText}>{item.subCategory}</Text>
        )}

        {item.details ? (
          <Text style={styles.details} numberOfLines={2}>{item.details}</Text>
        ) : null}
        
        <View style={styles.bottomRow}>
          <Text style={styles.price}>
            {typeof item.price === "number" ? `LKR ${item.price.toLocaleString()}` : "LKR —"}
          </Text>
          
          <View style={styles.buyBtn}>
            <MaterialCommunityIcons name="cart-plus" size={14} color="#fff" />
            <Text style={styles.buyBtnText}>Buy</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#D94F70" />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentSubCategories = selectedCategory === "all" ? [] : SUBCATEGORIES[selectedCategory] || [];

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { paddingTop: Platform.OS === "android" ? 45 : 0 }, // ✅ Adds safe top padding on Android
      ]}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1F1F1F" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Browse All</Text>
            <Text style={styles.headerSubtitle}>
              {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </Pressable>
          )}
        </View>

        {/* Main Category Tabs */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, selectedCategory === "all" && styles.tabActive]}
            onPress={() => handleCategoryChange("all")}
          >
            <Text style={[styles.tabText, selectedCategory === "all" && styles.tabTextActive]}>
              All
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, selectedCategory === "product" && styles.tabActive]}
            onPress={() => handleCategoryChange("product")}
          >
            <MaterialCommunityIcons
              name="shopping"
              size={16}
              color={selectedCategory === "product" ? "#fff" : "#666"}
            />
            <Text
              style={[styles.tabText, selectedCategory === "product" && styles.tabTextActive]}
            >
              Products
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, selectedCategory === "service" && styles.tabActive]}
            onPress={() => handleCategoryChange("service")}
          >
            <MaterialCommunityIcons
              name="hand-heart"
              size={16}
              color={selectedCategory === "service" ? "#fff" : "#666"}
            />
            <Text
              style={[styles.tabText, selectedCategory === "service" && styles.tabTextActive]}
            >
              Services
            </Text>
          </Pressable>
        </View>

        {/* SubCategory Filter Chips */}
        {currentSubCategories.length > 0 && (
          <View style={styles.subCategoryContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingVertical: 6, paddingBottom: 8 }}
            >
              <Pressable
                style={[
                  styles.filterChip,
                  selectedSubCategory === "all" && styles.filterChipActive,
                ]}
                onPress={() => setSelectedSubCategory("all")}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedSubCategory === "all" && styles.filterChipTextActive,
                  ]}
                >
                  All
                </Text>
              </Pressable>

              {currentSubCategories.map((sub) => (
                <Pressable
                  key={sub}
                  style={[
                    styles.filterChip,
                    selectedSubCategory === sub && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedSubCategory(sub)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedSubCategory === sub && styles.filterChipTextActive,
                    ]}
                  >
                    {sub}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Products List */}
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={64}
              color="#E0E0E0"
            />
            <Text style={styles.emptyTitle}>No items found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? "Try a different search term"
                : "Try adjusting your filters"}
            </Text>
            <Pressable
              style={styles.resetBtn}
              onPress={() => {
                setSelectedCategory("all");
                setSelectedSubCategory("all");
                setSearchQuery("");
              }}
            >
              <Text style={styles.resetBtnText}>Reset All</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={filteredItems}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            initialNumToRender={10}
            onScrollToIndexFailed={() => {}}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );

}

const COLORS = {
  primary: '#D94F70',
  primaryLight: '#E77A8F',
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
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 8,
  elevation: 3,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1 },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.bg,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 1,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    padding: 0,
  },
  clearBtn: {
    marginLeft: 8,
    padding: 4,
  },

  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: COLORS.bg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...shadow,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  tabTextActive: {
    color: '#fff',
  },

  subCategoryContainer: {
    backgroundColor: COLORS.bg,
    paddingBottom: 12,
  },
  subCategoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accentDark,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  filterChipTextActive: {
    color: COLORS.text,
  },

  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    ...shadow,
  },
  imageContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    backgroundColor: '#F5F5F5',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  quantityBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  quantityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },

  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  sellerText: {
    fontSize: 10,
    color: COLORS.textLighter,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: 'rgba(217, 79, 112, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serviceBadge: {
    backgroundColor: 'rgba(245, 238, 190, 0.8)',
  },
  categoryBadgeText: {
    fontSize: 9,
    color: COLORS.primary,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  serviceBadgeText: {
    color: '#8B7E3E',
  },

  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 19,
    marginBottom: 2,
  },
  subCategoryText: {
    fontSize: 10,
    color: COLORS.textLight,
    fontWeight: '600',
    marginBottom: 3,
  },
  details: {
    fontSize: 11,
    color: COLORS.textLight,
    lineHeight: 15,
    marginBottom: 6,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buyBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textLight,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  resetBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});