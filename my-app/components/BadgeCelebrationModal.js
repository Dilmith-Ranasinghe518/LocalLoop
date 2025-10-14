import React from "react";
import { Modal, View, Text, Pressable, StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import { Ionicons } from "@expo/vector-icons";

export default function BadgeCelebrationModal({ visible, badge, onClose }) {
  if (!badge) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* ✨ Close button */}
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close-circle" size={30} color="#FF5A7B" />
          </Pressable>

          {/* 🏆 Animation */}
          <LottieView
            source={require("../assets/lottie/Trophy.json")}
            autoPlay
            loop={false}
            style={styles.lottie}
          />

          {/* 🏅 Text */}
          <Text style={styles.title}>🎉 Congratulations!</Text>
          <Text style={styles.subtitle}>You unlocked the</Text>
          <Text style={styles.badgeName}>{badge}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    width: "85%",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    position: "relative",
  },
  lottie: {
    width: 200,
    height: 200,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FF5A7B",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#333",
    marginTop: 4,
  },
  badgeName: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FF9800",
    marginTop: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 4,
    zIndex: 10,
  },
});
