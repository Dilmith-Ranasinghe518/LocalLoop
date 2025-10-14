// app/index.js
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/authContext";

// Flip this to true once to reset onboarding on the device,
// then put it back to false.
const FORCE_RESET_ONBOARDING = false;

export default function Index() {
  const { isAuthenticated } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState(undefined);

  useEffect(() => {
    (async () => {
      try {
        if (FORCE_RESET_ONBOARDING) {
          console.log("[Index] Forcing reset of hasOnboarded");
          await AsyncStorage.removeItem("hasOnboarded");
        }
        const raw = await AsyncStorage.getItem("hasOnboarded");
        const flag = raw === "true";
        console.log("[Index] AsyncStorage.hasOnboarded =", raw, "->", flag);
        setHasOnboarded(flag);
      } catch (e) {
        console.log("[Index] Error reading hasOnboarded:", e);
        setHasOnboarded(false);
      }
    })();
  }, []);

  // Wait until both values are known
  if (isAuthenticated === undefined || hasOnboarded === undefined) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8, color: "#555" }}>Loading…</Text>
      </View>
    );
  }

  // Decide the first screen using Redirect (no imperative navigation needed)
  if (isAuthenticated) {
    return <Redirect href="/home" />;
  }
  return <Redirect href={hasOnboarded ? "/signIn" : "/onboarding"} />;
}
