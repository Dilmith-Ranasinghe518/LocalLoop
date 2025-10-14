// screens/SplashScreen.js
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace("Onboarding");
    }, 3000); // 3 sec delay
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <LinearGradient
      colors={["#FFD54F", "#F06292"]} // yellow → pink gradient
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View style={styles.logoBox}>
        {/* Replace this with your logo image */}
        <Text style={styles.logo}>⬆️ LocalLoop</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  logoBox: { alignItems: "center" },
  logo: { fontSize: 28, fontWeight: "700", color: "#fff" },
});
