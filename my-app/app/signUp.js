import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { StatusBar } from "expo-status-bar";
import { Feather, Octicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";
import CustomKeyboardView from "../components/CustomKeyboardView";
import { useAuth } from "../context/authContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function SignUp() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [location, setLocation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [locationsData, setLocationsData] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  /* ───── Fetch locations from Firestore ───── */
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const colRef = collection(db, "locations");
        const snap = await getDocs(colRef);
        const arr = snap.docs.map((d) => ({
          district: d.id,
          cities: d.data().cities || [],
        }));
        setLocationsData(arr);
      } catch (error) {
        Alert.alert("Error", "Could not load location data.");
        console.error("Error fetching locations:", error);
      } finally {
        setLoadingLocations(false);
      }
    };
    fetchLocations();
  }, []);

  /* ───── Handle register ───── */
  const handleRegister = async () => {
    if (!name || !email || !phone || !password || !confirm || !location) {
      Alert.alert("Sign Up", "Please fill all the fields!");
      return;
    }
    if (password !== confirm) {
      Alert.alert("Sign Up", "Passwords do not match.");
      return;
    }

    const res = await register(
      name.trim(),
      email.trim().toLowerCase(),
      phone.trim(),
      password,
      confirm,
      location
    );

    console.log("got result:", res);
    if (!res.success) {
      Alert.alert("Sign Up", String(res.msg));
      return;
    }

    router.replace("/home");
  };

  return (
    <CustomKeyboardView>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header Image */}
          <View style={styles.imageWrapper}>
            <Image
              style={styles.image}
              resizeMode="cover"
              source={require("../assets/images/login.png")}
            />
          </View>

          {/* Form */}
          <View style={styles.textContainer}>
            <Text style={styles.signInText}>Sign Up</Text>

            {/* Full Name */}
            <View style={styles.inputContainer}>
              <Octicons name="person" size={hp(2.7)} color="gray" />
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="gray"
                autoCapitalize="words"
              />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Octicons name="mail" size={hp(2.7)} color="gray" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="gray"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Phone */}
            <View style={styles.inputContainer}>
              <Feather name="phone" size={hp(2.7)} color="gray" />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="gray"
                keyboardType="phone-pad"
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Octicons name="lock" size={hp(2.7)} color="gray" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="gray"
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Feather
                  name={showPassword ? "eye" : "eye-off"}
                  size={hp(2.5)}
                  color="gray"
                />
              </Pressable>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Octicons name="lock" size={hp(2.7)} color="gray" />
              <TextInput
                value={confirm}
                onChangeText={setConfirm}
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="gray"
                secureTextEntry={!showConfirm}
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)}>
                <Feather
                  name={showConfirm ? "eye" : "eye-off"}
                  size={hp(2.5)}
                  color="gray"
                />
              </Pressable>
            </View>

            {/* Location Picker */}
            <View style={styles.inputContainer}>
              <Octicons name="location" size={hp(2.7)} color="gray" />
              {loadingLocations ? (
                <ActivityIndicator
                  size="small"
                  color="#c95278"
                  style={{ flex: 1 }}
                />
              ) : (
                <Picker
                  selectedValue={location}
                  onValueChange={(val) => {
                    if (!val.startsWith("header_")) setLocation(val);
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Location" value="" />
                  {locationsData.flatMap((loc) => [
                    <Picker.Item
                      key={`header_${loc.district}`}
                      label={loc.district.toUpperCase()}
                      value={`header_${loc.district}`}
                      color="#808080"
                      style={{ fontWeight: "bold" }}
                      enabled={false}
                    />,
                    ...loc.cities.map((city) => (
                      <Picker.Item
                        key={city}
                        label={`   ${city}`}
                        value={city}
                      />
                    )),
                  ])}
                </Picker>
              )}
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              onPress={handleRegister}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>Sign Up</Text>
            </TouchableOpacity>

            {/* Link to Sign In */}
            <View style={styles.signUpContainer}>
              <Text style={styles.signUpText}>Already have an account? </Text>
              <Pressable onPress={() => router.push("signIn")}>
                <Text style={styles.signUpLink}>Sign In</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </CustomKeyboardView>
  );
}

/* ───── Styles ───── */
const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: hp(5), // fixes bottom visibility issue
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  imageWrapper: {
    width: "100%",
    height: hp(25),
    overflow: "hidden",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  textContainer: {
    paddingTop: hp(3),
    paddingHorizontal: wp(5),
    gap: 12,
  },
  signInText: {
    fontSize: hp(4),
    fontWeight: "bold",
    letterSpacing: 1.5,
    textAlign: "center",
    color: "#333",
  },
  inputContainer: {
    height: hp(6),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 24,
    marginBottom: hp(2),
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: hp(2),
    fontWeight: "600",
    color: "#4B4B4B",
  },
  picker: { flex: 1, height: hp(6) },
  submitButton: {
    height: hp(6.5),
    backgroundColor: "#c95278ff",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: hp(3),
  },
  submitButtonText: {
    fontSize: hp(2.7),
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signUpText: {
    fontSize: hp(1.8),
    fontWeight: "600",
    color: "#9E9E9E",
  },
  signUpLink: {
    fontSize: hp(1.8),
    fontWeight: "700",
    color: "#ab3f61ff",
  },
});
