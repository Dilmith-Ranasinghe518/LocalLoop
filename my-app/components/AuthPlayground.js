// components/AuthPlayground.js
import React, { useState } from "react";
import { ScrollView, Text, TextInput, Button } from "react-native";
import { useAuth } from "../context/authContext";

export const AuthPlayground = () => {
  const { register, login, user, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("Test User");
  const [phone, setPhone] = useState("0771234567");
  const [location, setLocation] = useState("Colombo");
  const [out, setOut] = useState(null);

  const doRegister = async () => {
    setOut({ note: "register start" });
    const res = await register(name, email, phone, password, password, location);
    setOut(res);
  };

  const doLogin = async () => {
    setOut({ note: "login start" });
    const res = await login(email, password);
    setOut(res);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Auth Playground</Text>
      <Text>isAuthenticated: {String(isAuthenticated)}</Text>
      <Text>user uid: {user ? user.uid : "—"}</Text>

      <TextInput placeholder="email" autoCapitalize="none" value={email} onChangeText={setEmail} style={{ borderWidth: 1, padding: 8 }} />
      <TextInput placeholder="password" secureTextEntry value={password} onChangeText={setPassword} style={{ borderWidth: 1, padding: 8 }} />
      <TextInput placeholder="name" value={name} onChangeText={setName} style={{ borderWidth: 1, padding: 8 }} />
      <TextInput placeholder="phone" value={phone} onChangeText={setPhone} style={{ borderWidth: 1, padding: 8 }} />
      <TextInput placeholder="location" value={location} onChangeText={setLocation} style={{ borderWidth: 1, padding: 8 }} />

      <Button title="Register" onPress={doRegister} />
      <Button title="Login" onPress={doLogin} />

      <Text style={{ marginTop: 10, fontWeight: "600" }}>Last result:</Text>
      <Text selectable style={{ fontFamily: "Courier" }}>{JSON.stringify(out, null, 2)}</Text>
    </ScrollView>
  );
};
