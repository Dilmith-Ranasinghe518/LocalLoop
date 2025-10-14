// app/_layout.js
import React from "react";
import { Stack } from "expo-router";
import { AuthContextProvider } from "../../context/authContext";


export default function RootLayout() {
  return (
    <AuthContextProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthContextProvider>
  );
}
