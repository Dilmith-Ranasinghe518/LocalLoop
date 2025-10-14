import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { LinearGradient } from 'expo-linear-gradient';
import AchievementProgressCard from "../../../components/AchievementProgressCard";
import AddImpactButton from "../../../components/AddImpactButton";
import { db } from "../../../firebaseConfig";
import AddImpactModal from "../../../components/AddImpactModal"; 


const screenWidth = Dimensions.get("window").width - 50;

export default function CommunityImpactDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [entries, setEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("week");
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [chartModalVisible, setChartModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (id) {
      fetchUserData(id);
      fetchImpactEntries(id);
    }
  }, [id]);

  async function fetchUserData(uid) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) setUserData(userSnap.data());
  }

  async function fetchImpactEntries(uid) {
    try {
      setLoading(true);
      const q = query(
        collection(db, "impactEntries"),
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setEntries(data);
      applyFilter("week", data);
    } catch (e) {
      console.error("Error fetching details:", e);
    } finally {
      setLoading(false);
    }
  }

  const applyFilter = (val, dataToFilter = entries) => {
    if (val === "all") {
      setFilteredEntries(dataToFilter);
    } else {
      const now = new Date();
      const cutoff = new Date();
      if (val === "week") cutoff.setDate(now.getDate() - 7);
      else if (val === "month") cutoff.setMonth(now.getMonth() - 1);
      else if (val === "year") cutoff.setFullYear(now.getFullYear() - 1);
      const f = dataToFilter.filter(
        (e) => e.createdAt?.toDate && e.createdAt.toDate() > cutoff
      );
      setFilteredEntries(f);
    }
  };

  const handleFilter = (val) => {
    setFilter(val);
    applyFilter(val);
  };

  const confirmDelete = (entry) => {
    Alert.alert(
      "Delete Entry",
      `Are you sure you want to delete "${entry.summary}"? This will remove ${entry.points} points from your total.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteImpactEntry(entry),
        },
      ],
      { cancelable: true }
    );
  };

  const deleteImpactEntry = async (entry) => {
    try {
      await deleteDoc(doc(db, "impactEntries", entry.id));
      const userRef = doc(db, "users", id);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentPoints = userSnap.data().totalPoints || 0;
        const updatedPoints = Math.max(currentPoints - entry.points, 0);

        // 🏅 Determine new current badge based on updated points
        const badges = [
          { name: "Newbie", points: 0 },
          { name: "Contributor", points: 50 },
          { name: "Top Seller", points: 200 },
          { name: "Eco Warrior", points: 500 },
        ];

        const newBadge = badges
          .filter(b => updatedPoints >= b.points)
          .sort((a, b) => b.points - a.points)[0]?.name || "Newbie";

        // 🔄 Update both totalPoints and badge in Firestore
        await updateDoc(userRef, {
          totalPoints: updatedPoints,
          currentBadge: newBadge,
        });
      }
      fetchImpactEntries(id);
      fetchUserData(id);
    } catch (e) {
      console.error("Error deleting impact entry:", e);
      Alert.alert("Error", "Failed to delete this entry.");
    }
  };

  const badges = [
    { name: "Newbie", points: 0 },
    { name: "Contributor", points: 50 },
    { name: "Top Seller", points: 200 },
    { name: "Eco Warrior", points: 500 },
  ];

  const currentPoints = userData?.totalPoints || 0;

  const chartData = {
    labels: filteredEntries
      .slice(0, 5)
      .reverse()
      .map((e) =>
        e.createdAt?.toDate
          ? e.createdAt.toDate().toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })
          : ""
      ),
    datasets: [
      {
        data: filteredEntries
          .slice(0, 5)
          .reverse()
          .map((e) => e.points || 0),
        color: () => "#FF5A7B",
        strokeWidth: 3,
      },
    ],
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF5A7B" />
          <Text style={{ color: "#999", marginTop: 8 }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Gradient Header Background */}
      <LinearGradient
        colors={['#f8c7d3ff', '#FFF5F7', '#FAFAFA']}
        style={styles.headerGradient}
      />

      {/* 🔹 Header */}
      <View style={styles.topHeader}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.topHeaderTitle}>Community Impact</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* 🔹 Enhanced Points Card with Gradient */}
        <View style={styles.heroSection}>
          <View style={styles.pointsCardShadow}>
            <LinearGradient
              colors={['#fc4d70ff', '#FF8FA3', '#F5EEBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pointsContainer}
            >
              {/* Decorative circles */}
              <View style={styles.decorativeCircle1} />
              <View style={styles.decorativeCircle2} />
              <View style={styles.decorativeCircle3} />
              
              <View style={styles.pointsHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="star" size={28} color="#FF5A7B" />
                  </View>
                  <Text style={styles.pointsLabel}>Total Impact Points</Text>
                </View>

                <Pressable style={styles.chartBtn} onPress={() => setChartModalVisible(true)}>
                  <Ionicons name="stats-chart" size={24} color="#FF5A7B" />
                </Pressable>
              </View>

              <View style={styles.pointsMainSection}>
                <Text style={styles.pointsBig}>{currentPoints}</Text>
                <View style={styles.pointsBadge}>
                  <Ionicons name="trending-up" size={16} color="#fff" />
                  <Text style={styles.pointsSubtext}>Helping the community grow!</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Achievements</Text>

          <AchievementProgressCard
            currentPoints={currentPoints}
            badges={[
              { name: "Newbie", points: 0, next: 50 },
              { name: "Contributor", points: 50, next: 200 },
              { name: "Top Seller", points: 200, next: 500 },
              { name: "Eco Warrior", points: 500, next: 1000 },
            ]}
            onViewAll={() => setBadgeModalVisible(true)}
          />

          {/* 🔸 Filter */}
          <View style={styles.filterRow}>
            <Text style={styles.sectionTitle}>Impact Timeline</Text>
            <View style={styles.filterBox}>
              <Ionicons name="filter-outline" size={16} color="#555" style={{ marginRight: 6 }} />
              <Picker
                selectedValue={filter}
                onValueChange={handleFilter}
                style={styles.filterPicker}
                dropdownIconColor="#555"
              >
                <Picker.Item label="All Time" value="all" />
                <Picker.Item label="Last 7 Days" value="week" />
                <Picker.Item label="Last Month" value="month" />
                <Picker.Item label="Last Year" value="year" />
              </Picker>
            </View>
          </View>

          {/* Timeline */}
          {filteredEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="leaf-outline" size={48} color="#D4A574" />
              <Text style={styles.emptyText}>No impact records found for this period.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredEntries}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setSelectedEntry(item);
                    setEditModalVisible(true);
                  }}
                  style={styles.entryCard}
                >
                  <View style={styles.entryIcon}>
                    <Ionicons name="trophy" size={22} color="#FF5A7B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entrySummary}>{item.summary}</Text>
                    <Text style={styles.entryMeta}>
                      {item.type} • <Text style={styles.pointsHighlight}>+{item.points} pts</Text>
                    </Text>
                    <Text style={styles.entryDate}>
                      {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => confirmDelete(item)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={22} color="#c00" />
                  </Pressable>
                </Pressable>
              )}
            />
          )}
        </View>
      </ScrollView>

      {currentUser?.emailVerified && (
        <AddImpactButton refreshList={() => fetchImpactEntries(id)} />
      )}

      {/* 📊 Chart Modal */}
      <Modal
        visible={chartModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setChartModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { alignItems: "center" }]}>
            <Text style={styles.modalTitle}>Impact Points Progress</Text>
            {filteredEntries.length > 0 ? (
              <LineChart
                data={chartData}
                width={screenWidth}
                height={220}
                yAxisSuffix=" pts"
                chartConfig={{
                  backgroundColor: "#fff",
                  backgroundGradientFrom: "#fff",
                  backgroundGradientTo: "#fff",
                  decimalPlaces: 0,
                  color: () => "#FF5A7B",
                  labelColor: () => "#666",
                }}
                bezier
                style={{ borderRadius: 12, marginTop: 10 }}
              />
            ) : (
              <Text style={{ color: "#999", marginTop: 20 }}>Not enough data to display chart.</Text>
            )}
            <Pressable style={styles.modalCloseBtn} onPress={() => setChartModalVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 🏅 Badge Modal */}
      <Modal
        visible={badgeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBadgeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { alignItems: "center" }]}>
            <Text style={styles.modalTitle}>All Achievements</Text>
            <ScrollView style={{ width: "100%", marginTop: 10 }}>
              {badges.map((badge, idx) => {
                const unlocked = currentPoints >= badge.points;
                return (
                  <View
                    key={idx}
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#eee" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons name={unlocked ? "trophy" : "lock-closed"} size={22} color={unlocked ? "#FF5A7B" : "#bbb"} style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 16, fontWeight: unlocked ? "700" : "500", color: unlocked ? "#333" : "#999" }}>
                        {badge.name}
                      </Text>
                    </View>
                    <Text style={{ color: "#666", fontSize: 13 }}>{badge.points} pts</Text>
                  </View>
                );
              })}
            </ScrollView>
            <Pressable style={styles.modalCloseBtn} onPress={() => setBadgeModalVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 🆕 Edit Impact Modal */}
      <AddImpactModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        refreshList={() => fetchImpactEntries(id)}
        existingEntry={selectedEntry}
      />
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFA" },
  headerGradient: { position: 'absolute', left: 0, right: 0, top: 0, height: 300 },
  topHeader: { flexDirection: "row", alignItems: "center", backgroundColor: "#FF5A7B", paddingTop: 55, paddingBottom: 12, paddingHorizontal: 16 },
  backBtn: { padding: 4, marginRight: 10 },
  topHeaderTitle: { color: "#fff", fontSize: 24, fontWeight: "700" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  heroSection: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  pointsCardShadow: { shadowColor: "#49282eff", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8, borderRadius: 24 },
  pointsContainer: { borderRadius: 18, padding: 18, position: 'relative', overflow: 'hidden' },
  decorativeCircle1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#f5eebe94', top: -40, right: -20 },
  decorativeCircle2: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: '#f5eebe4b', bottom: -20, left: -10 },
  decorativeCircle3: { position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: '#f5eebe7b', top: '50%', right: 40 },
  pointsHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, zIndex: 1 },
  chartBtn: { backgroundColor: "rgba(255, 255, 255, 0.95)", padding: 10, borderRadius: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255, 255, 255, 0.95)", justifyContent: "center", alignItems: "center", marginRight: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  pointsLabel: { fontSize: 16, fontWeight: "700", color: "#fff", textShadowColor: 'rgba(0, 0, 0, 0.16)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  pointsMainSection: { alignItems: 'center', marginVertical: 16, zIndex: 1 },
  pointsBig: { fontSize: 72, fontWeight: "900", color: "#fff", textShadowColor: 'rgba(0, 0, 0, 0.15)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4, letterSpacing: -2 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 8 },
  pointsSubtext: { fontSize: 14, color: "#fff", fontWeight: "700", marginLeft: 6 },
  contentContainer: { paddingHorizontal: 16, paddingTop: 4 },
  sectionTitle: { fontSize: 19, fontWeight: "800", color: "#333", marginTop: 16, marginBottom: 12 },
  filterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 12 },
  filterBox: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#ccc", borderRadius: 10, backgroundColor: "#fff", height: 54, minWidth: 180, paddingHorizontal: 5 },
  filterPicker: { flex: 1, height: 54, color: "#333" },
  entryCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#f0f0f0" },
  entryIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#fff6e5", justifyContent: "center", alignItems: "center", marginRight: 12, borderWidth: 1, borderColor: "#FFE8ED" },
  entrySummary: { fontSize: 15, fontWeight: "700", color: "#333" },
  entryMeta: { fontSize: 13, color: "#666" },
  pointsHighlight: { color: "#D4A574", fontWeight: "700" },
  entryDate: { fontSize: 12, color: "#999" },
  deleteBtn: { padding: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#999', fontSize: 15, marginTop: 12, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#fff", borderRadius: 20, width: "90%", padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#333", textAlign: "center" },
  modalCloseBtn: { backgroundColor: "#FF5A7B", borderRadius: 8, marginTop: 20, paddingVertical: 10, alignItems: "center", width: 150 },
  modalCloseText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});