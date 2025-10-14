import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import { useState } from "react";
import { Alert, Pressable, StyleSheet } from "react-native";
import AddImpactModal from "./AddImpactModal";

export default function AddImpactButton({ refreshList }) {
  const [modalVisible, setModalVisible] = useState(false);
  const user = getAuth().currentUser;

  const handlePress = () => {
    if (!user?.emailVerified) {
      Alert.alert(
        "Email not verified",
        "Please verify your email before adding impact."
      );
      return;
    }
    setModalVisible(true);
  };

  return (
    <>
      {/* 🟢 Floating Action Button */}
      <Pressable style={styles.fab} onPress={handlePress}>
        <Ionicons name="add" size={30} color="#fbfbfbff" />
      </Pressable>

      {/* Modal for adding impact */}
      <AddImpactModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        refreshList={refreshList}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 25,
    right: 25,
    backgroundColor: "#878a89ff",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    borderColor: "#ffffff2f",
    borderWidth: 2,
  },
});
