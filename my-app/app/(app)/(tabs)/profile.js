import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { useRouter } from "expo-router";
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import CommunityImpactScreen from "../CommunityImpactScreen";
import TransactionsScreen from "../TransactionsScreen";
import MyListingsScreen from "../MyListingsScreen";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useRef, useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Share,
  Platform,
  ToastAndroid,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../context/authContext";
import { db, auth } from "../../../firebaseConfig";
import BadgeCelebrationModal from "../../../components/BadgeCelebrationModal";
import { useNavigation } from "expo-router"; //here

const Tab = createMaterialTopTabNavigator();

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const navigation = useNavigation(); //here to
    
    useEffect(() => {
      navigation.setOptions({
        headerStyle: { backgroundColor: "#d8436b" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      });
    }, [navigation]); //here
  

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [newBadge, setNewBadge] = useState(null);
  const lastBadgeRef = useRef(null);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setProfile(snap.data());
        setErr(null);
      } else setErr("Profile not found");
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    const checkVerification = async () => {
      try {
        await user?.reload?.();
        const verified = user?.emailVerified || false;
        setIsVerified(verified);
        if (user?.uid && profile && profile.isVerified !== verified) {
          await updateDoc(doc(db, "users", user.uid), { isVerified: verified });
        }
      } catch (e) {
        console.warn("Verification check failed:", e);
      }
    };
    checkVerification();
  }, [user, profile]);

  useEffect(() => {
    if (!profile) return; // nothing yet
    if (!profile.currentBadge) {
      console.log("🔸 No badge data yet, skipping celebration check");
      return;
    }

    // Skip the very first load (when the listener first attaches)
    if (!lastBadgeRef.current) {
      lastBadgeRef.current = profile.currentBadge;
      console.log("🟡 Initial badge load:", profile.currentBadge);
      return;
    }

    // Trigger only when badge actually changes
    if (lastBadgeRef.current !== profile.currentBadge) {
      console.log("🎯 New badge detected:", profile.currentBadge);
      setNewBadge(profile.currentBadge);
      setShowBadgeModal(true);
      lastBadgeRef.current = profile.currentBadge;
    } else {
      console.log("🔸 No new badge — currentBadge:", profile.currentBadge);
    }
  }, [profile?.currentBadge]);


  const handlePasswordReset = async () => {
    const email = user?.email;
    if (!email) {
      Alert.alert("No email found", "Cannot reset password without an email.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert("Sent", "Check your inbox to reset your password.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const confirmLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/signIn");
        },
      },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await user.delete();
              router.replace("/signIn");
            } catch (e) {
              if (e.code === "auth/requires-recent-login") {
                setShowReauthModal(true);
              } else {
                Alert.alert("Error", e.message);
              }
            }
          },
        },
      ]
    );
  };

  const handleReauthAndDelete = async () => {
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
      await user.delete();
      setShowReauthModal(false);
      router.replace("/signIn");
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  };

  const handleShareProfile = async () => {
    const displayName =
      profile?.name || user?.displayName || user?.email?.split("@")[0];
    const displayBio = profile?.bio || "No bio added yet.";
    const totalPoints = profile?.totalPoints || 0;
    const message = `🌟 Check out my LocalLoop profile!\n${displayName} - ${displayBio}\nCommunity Impact: ${totalPoints} points\n\nJoin LocalLoop 👉 https://localloop.app/profile/${user.uid}`;

    try {
      await Share.share({ message });
    } catch (error) {
      Alert.alert("Error sharing profile", error.message);
    }
  };

  const showTooltip = () => {
    if (Platform.OS === "android")
      ToastAndroid.show("Share your profile", ToastAndroid.SHORT);
    else Alert.alert("Tip", "Share your profile link with others!");
  };

  const displayName =
    profile?.name || user?.displayName || user?.email?.split("@")[0] || "—";
  const displayBio = profile?.bio || "No bio added yet.";
  const displayLocation = profile?.location || "—";

  if (loading)
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color="#ea5b70" size="large" />
          <Text style={{ color: "#999", marginTop: 8 }}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerWrapper}>
        <View style={styles.topRow}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{
                uri:
                  profile?.photoURL ||
                  "https://cdn-icons-png.flaticon.com/512/847/847969.png",
              }}
              style={styles.profileImage}
            />
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedBadgeText}>✓ Verified</Text>
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <View style={styles.locationRow}>
              <Ionicons
                name="location"
                size={14}
                color="#ea5b70"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.profileLocation}>{displayLocation}</Text>
            </View>
            <Text style={styles.profileBio} numberOfLines={2}>
              {displayBio}
            </Text>
          </View>
        </View>

        {/* Buttons Row */}
        <View style={styles.headerButtons}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.push(`/editProfile/${user?.uid}`)}
          >
            <Text style={styles.primaryBtnText}>Edit Profile</Text>
          </Pressable>

          {!isVerified && (
            <Pressable
              style={styles.verifyButton}
              onPress={async () => {
                try {
                  await sendEmailVerification(user);
                  Alert.alert(
                    "Verification Email Sent",
                    "Check your inbox to verify your email."
                  );
                } catch (error) {
                  Alert.alert("Error", error.message);
                }
              }}
            >
              <Text style={styles.verifyButtonText}>Verify Email</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.secondaryBtn}
            onPress={() => setSettingsVisible(true)}
          >
            <Text style={styles.secondaryBtnText}>Settings</Text>
          </Pressable>

          {/* Share Profile icon button */}
          <Pressable
            style={styles.iconBtn}
            onPress={handleShareProfile}
            onLongPress={showTooltip}
          >
            <Ionicons name="share-social-outline" size={18} color="#ea5b70" />
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ProfileTabs />
      </View>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚙ Settings</Text>
              <Pressable onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </Pressable>
            </View>

            <ScrollView>
              <Text style={styles.sectionTitle}>Account</Text>

              <Pressable
                style={styles.optionRow}
                onPress={() => {
                  setSettingsVisible(false);
                  router.push(`/editProfile/${user?.uid}`);
                }}
              >
                <Ionicons name="person-circle-outline" size={20} color="#555" />
                <Text style={styles.optionLabel}>Edit Profile</Text>
              </Pressable>

              <Pressable style={styles.optionRow} onPress={handlePasswordReset}>
                <Ionicons name="key-outline" size={20} color="#555" />
                <Text style={styles.optionLabel}>Change Password</Text>
              </Pressable>

              <Pressable style={styles.optionRow} onPress={confirmDelete}>
                <Ionicons name="trash-outline" size={20} color="#d9534f" />
                <Text style={[styles.optionLabel, { color: "#d9534f" }]}>
                  Delete Account
                </Text>
              </Pressable>

              <Text style={styles.sectionTitle}>Share</Text>
              <Pressable
                style={styles.optionRow}
                onPress={handleShareProfile}
                onLongPress={showTooltip}
              >
                <Ionicons name="share-social-outline" size={20} color="#555" />
                <Text style={styles.optionLabel}>Share My Profile</Text>
              </Pressable>

              <Text style={styles.sectionTitle}>Session</Text>
              <Pressable style={[styles.optionRow, styles.logoutRow]} onPress={confirmLogout}>
                <Ionicons name="log-out-outline" size={20} color="#d9534f" />
                <Text style={[styles.optionLabel, { color: "#d9534f" }]}>
                  Logout
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BadgeCelebrationModal
        visible={showBadgeModal}
        badge={newBadge}
        onClose={() => setShowBadgeModal(false)}
      />

      {/* Reauth Modal */}
      <Modal
        visible={showReauthModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReauthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.settingsModal, { padding: 24 }]}>
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 10 }}>
              Re-authenticate to Continue
            </Text>
            <Text style={{ color: "#555", marginBottom: 12 }}>
              Please enter your password to confirm deletion.
            </Text>
            <TextInput
              placeholder="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 8,
                padding: 10,
                marginBottom: 20,
              }}
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 12,
              }}
            >
              <Pressable onPress={() => setShowReauthModal(false)}>
                <Text style={{ color: "#555", fontWeight: "600" }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleReauthAndDelete}>
                <Text style={{ color: "#ea5b70", fontWeight: "700" }}>
                  Confirm
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* Tabs */
function ProfileTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#eee",
          paddingBottom: 0,
        },
        tabBarIndicatorStyle: { backgroundColor: "#ea5b70", height: 3 },
        tabBarActiveTintColor: "#ea5b70",
        tabBarInactiveTintColor: "#999",
        tabBarLabelStyle: {
          fontWeight: "600",
          fontSize: 13,
          textTransform: "none",
        },
      }}
    >
      <Tab.Screen name="My Listings" component={MyListingsScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Community Impact" component={CommunityImpactScreen} />
    </Tab.Navigator>
  );
}

/* Styles */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafafa" },
  headerWrapper: { backgroundColor: "#fff", padding: 20 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  profileImageContainer: { position: "relative" },
  profileImage: { width: 80, height: 80, borderRadius: 40 },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: -6,
    backgroundColor: "#4caf50",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: "800", color: "#222" },
  profileLocation: { color: "#ea5b70", fontSize: 13, fontWeight: "600" },
  locationRow: { flexDirection: "row", alignItems: "center", marginVertical: 4 },
  profileBio: { fontSize: 14, color: "#666" },

  headerButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    flexWrap: "wrap",
    alignItems: "center",
  },
  primaryBtn: {
    backgroundColor: "#ea5b70",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  verifyButton: {
    backgroundColor: "#ff9800",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  verifyButtonText: { color: "#fff", fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  secondaryBtnText: { color: "#444", fontWeight: "600", fontSize: 14 },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fbeaec",
    alignItems: "center",
    justifyContent: "center",
  },

  tabsContainer: { flex: 1 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  settingsModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#444",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
  },
  logoutRow: { marginBottom: 30 },
  optionLabel: { fontSize: 15, color: "#333" },
});