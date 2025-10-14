import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function AchievementProgressCard({
  currentPoints = 0,
  badges = [],
  onViewAll = () => {},
}) {
  const currentBadge = badges
    .slice()
    .reverse()
    .find((b) => currentPoints >= b.points);
  const nextBadge = badges.find((b) => currentPoints < b.next);

  return (
    <View style={styles.badgeCard}>
      {/* 🔸 Current Badge */}
      <View style={styles.badgeRow}>
        <Ionicons name="ribbon-outline" size={22} color="#FF9800" />
        <Text style={styles.badgeTitle}>
          {currentBadge?.name || "No Badge Yet"}
        </Text>
      </View>

      {/* 🔸 Progress */}
      <Text style={styles.badgeProgressText}>
        {nextBadge
          ? `Progress to next badge (${nextBadge.name}):`
          : "You’ve reached the top!"}
      </Text>

      {nextBadge && (
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${
                  ((currentPoints - currentBadge.points) /
                    (nextBadge.next - currentBadge.points)) *
                  100
                }%`,
              },
            ]}
          />
        </View>
      )}

      {/* 🔸 View All Button */}
      <Pressable style={styles.badgeBtn} onPress={onViewAll}>
        <Ionicons name="medal-outline" size={18} color="#fff" />
        <Text style={styles.badgeBtnText}>View All Badges</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeCard: {
    backgroundColor: "#fdfdfdff",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  badgeTitle: { fontSize: 17, fontWeight: "700", color: "#333", marginLeft: 8 },
  badgeProgressText: { fontSize: 13, color: "#777", marginBottom: 6 },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#eee",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: { height: "100%", backgroundColor: "#FF5A7B" },
  badgeBtn: {
    flexDirection: "row",
    backgroundColor: "#FF5A7B",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  badgeBtnText: { color: "#fff", fontWeight: "700", marginLeft: 6 },
});
