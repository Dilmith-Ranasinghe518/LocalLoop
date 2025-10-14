// app/(app)/(tabs)/events.js
import "react-native-gesture-handler";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import {
  collection,
  query,
  orderBy,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
} from "firebase/firestore";
import { db, auth } from "../../../firebaseConfig";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { BlurView } from "expo-blur"; // ✅ added for ad background blur
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Image,
  TextInput,
  Pressable,
  Alert,
  Modal,
  Animated,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Stack } from "expo-router";

import { setDoc, onSnapshot } from "firebase/firestore";
import { useNavigation } from "expo-router"; //here

const { width, height } = Dimensions.get("window");
const Tab = createMaterialTopTabNavigator();

const shadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 10,
  elevation: 5,
};

// Flash Sale Timer helper
const calculateTimeLeft = () => {
  const now = new Date();
  const eventTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const diff = Math.max(0, eventTime - now);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { hours, minutes, seconds };
};

export default function EventsPage() {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [headerTitle, setHeaderTitle] = useState("Events");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const navigation = useNavigation(); //here to
  
  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: "#d8436b" },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "bold" },
    });
  }, [navigation]); //here

  const [isVerified, setIsVerified] = useState(false);

  // 🔹 Fetch user's verification status from Firestore
useEffect(() => {
  const fetchVerification = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        // Assuming your users collection has a boolean field: verified: true/false
       setIsVerified(!!data.isVerified);

      }
    } catch (e) {
      console.error("Error checking user verification:", e);
    }
  };
  fetchVerification();
}, []);



  useEffect(() => {
    const t = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleAddPress = () => {
    if (headerTitle === "Events" || headerTitle === "My Events") {
      router.push("/addEvent");
    } else if (headerTitle === "Offers" || headerTitle === "My Offers") {
      router.push("/addOffer");
    }
  };

 return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: headerTitle, headerShown: true }} />

      <View style={styles.container}>
        {/* 🔹 Search + Add Button Row */}
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, { flex: 1 }]}
            placeholder={`Search ${headerTitle}`}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {/* 🔹 Conditionally show Add button */}
          {/* 🔹 Show Add button only if verified */}
{isVerified &&
  (headerTitle === "Events" ||
    headerTitle === "Offers" ||
    headerTitle === "My Events" ||
    headerTitle === "My Offers") && (
    <Pressable style={styles.addButton} onPress={handleAddPress}>
      <Ionicons name="add-circle" size={30} color="#ea5b70" />
    </Pressable>
  )}

{/* 🔹 Optional hint for unverified users */}
{!isVerified && (
  <Pressable
    style={[styles.addButton, { opacity: 0.5 }]}
    onPress={() =>
      Alert.alert(
        "Verification Required",
        "Only verified users can create events and offers. Please verify your account first."
      )
    }
  >
    <Ionicons name="lock-closed" size={26} color="#999" />
  </Pressable>
)}

        </View>

        {/* 🔹 Tabs */}
        <View style={{ flex: 1 }}>
          <DynamicTabs
            searchQuery={searchQuery}
            setHeaderTitle={setHeaderTitle}
            timeLeft={timeLeft}
            isVerified={isVerified} 
          />
        </View>
      </View>
    </View>
  );
}

function DynamicTabs({ searchQuery, setHeaderTitle, timeLeft, isVerified}) {
  const user = auth.currentUser;
  const [hasMyEvents, setHasMyEvents] = useState(false);
  const [hasMyOffers, setHasMyOffers] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const checkUserData = async () => {
        try {
          // Fetch all events and offers
          const evSnap = await getDocs(collection(db, "events"));
          const ofSnap = await getDocs(collection(db, "offers"));

          // ✅ Match Firestore field names exactly
          const myEvents = evSnap.docs.some(
            (d) =>
              d.data().createdBy === user?.uid ||
              d.data().createdByEmail === user?.email
          );

          const myOffers = ofSnap.docs.some(
            (d) =>
              d.data().ownerId === user?.uid ||
              d.data().ownerEmail === user?.email
          );

          setHasMyEvents(myEvents);
          setHasMyOffers(myOffers);
        } catch (err) {
          console.error("Error checking user data:", err);
        }
      };
      checkUserData();
    }, [user?.uid, user?.email])
  );

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarIndicatorStyle: { backgroundColor: "#ea5b70" },
        tabBarScrollEnabled: true,
      }}
      screenListeners={{
        state: (e) => {
          const routeName = e.data.state.routes[e.data.state.index].name;
          setHeaderTitle(routeName);
        },
      }}
    >
      {/* 🔹 Always visible tabs */}
      <Tab.Screen name="Events">
        {() => <EventList searchQuery={searchQuery} />}
      </Tab.Screen>

      {/* <Tab.Screen name="Offers">
        {() => <OffersSection searchQuery={searchQuery} timeLeft={timeLeft} />}
      </Tab.Screen> */}

      <Tab.Screen name="Offers">
  {() => (
    <OffersSection
      searchQuery={searchQuery}
      timeLeft={timeLeft}
      isVerified={isVerified}   // ✅ pass it here
    />
  )}
</Tab.Screen>


      {/* 🔹 Always show Nearby tab to all users */}
      <Tab.Screen name="Nearby">
        {() => <NearbySection searchQuery={searchQuery} />}
      </Tab.Screen>

      {/* 🔹 Conditionally visible tabs */}
      {hasMyEvents && (
        <Tab.Screen name="My Events">
          {() => <MyEvents searchQuery={searchQuery} />}
        </Tab.Screen>
      )}

      {hasMyOffers && (
        <Tab.Screen name="My Offers">
          {() => <MyOffers searchQuery={searchQuery} />}
        </Tab.Screen>
      )}
    </Tab.Navigator>
  );
}



/* ---------- EventList ---------- */
// function EventList({ searchQuery }) {
//   const router = useRouter();
//   const [events, setEvents] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const user = auth.currentUser;

//   useFocusEffect(
//     useCallback(() => {
//       let isActive = true;
//       const fetchEvents = async () => {
//         setLoading(true);
//         try {
//           const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
//           const snapshot = await getDocs(q);
//           if (isActive) {
//             const eventList = snapshot.docs.map((doc) => ({
//               id: doc.id,
//               ...doc.data(),
//             }));
//             setEvents(eventList);
//           }
//         } catch (error) {
//           console.error("Error fetching events:", error);
//         } finally {
//           if (isActive) setLoading(false);
//         }
//       };
//       fetchEvents();
//       return () => {
//         isActive = false;
//       };
//     }, [])
//   );

//   const filtered = events.filter(
//     (ev) =>
//       ev.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
//       ev.location?.toLowerCase().includes(searchQuery.toLowerCase())
//   );

//   if (loading) {
//     return (
//       <View style={{ padding: 20 }}>
//         <ActivityIndicator size="large" color="#ea5b70" />
//         <Text style={{ textAlign: "center", marginTop: 10 }}>Loading events...</Text>
//       </View>
//     );
//   }

//   return (
//     <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 10 }}>
//       {filtered.length === 0 ? (
//         <Text style={{ textAlign: "center", marginTop: 20 }}>No events found.</Text>
//       ) : (
//         filtered.map((event) => (
//           <View key={event.id} style={styles.eventCard}>
//             {/* 🔹 Event Image */}
//             <Image
//               source={{
//                 uri:
//                   event.imageUrl ||
//                   "https://via.placeholder.com/300x200.png?text=Event+Image",
//               }}
//               style={styles.eventImage}
//             />

//             {/* 🔹 Content */}
//             <View style={styles.eventContent}>
//               <Text style={styles.eventTitle}>{event.title}</Text>

//               {/* 📍 Location + Province */}
//               <Text style={styles.eventLocation}>
//                 📍 {event.location}
//                 {event.province ? `, ${event.province}` : ""}
//               </Text>

//               {/* 📅 Date & Time */}
//               <View style={styles.row}>
//                 <Text style={styles.eventMeta}>📅 {event.date}</Text>
//                 <Text style={styles.eventMeta}>
//                   ⏰ {event.timeFrom} → {event.timeTo}
//                 </Text>
//               </View>

//               {/* 💰 Price or Free */}
//               <Text
//                 style={[
//                   styles.eventPrice,
//                   event.isFree ? styles.freeTag : styles.paidTag,
//                 ]}
//               >
//                 {event.isFree
//                   ? "🎟️ Free Entry"
//                   : `💰 ${event.price} ${event.currency || "LKR"}`}
//               </Text>

//               {/* 🔘 View Button */}
//               <Pressable
//                 style={styles.eventButton}
//                 onPress={() => router.push(`/eventDetails/${event.id}`)}
//               >
//                 <Text style={styles.eventButtonText}>View Details</Text>
//               </Pressable>
//             </View>
//           </View>
//         ))
//       )}
//     </ScrollView>
//   );
// }

/* ---------- EventList with Interstitial Ad ---------- */
function EventList({ searchQuery }) {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  // 🔹 Ad States
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialEvent, setInterstitialEvent] = useState(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  // 🔹 Fetch events (and trigger ad)
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchEvents = async () => {
        setLoading(true);
        try {
          const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
          const snapshot = await getDocs(q);

          if (isActive) {
            const eventList = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setEvents(eventList);

            // ✅ Show random interstitial ad
            if (eventList.length > 0) {
              const randomEvent = eventList[Math.floor(Math.random() * eventList.length)];
              setInterstitialEvent(randomEvent);
              setShowInterstitial(true);

              Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
              ]).start();
            }
          }
        } catch (error) {
          console.error("Error fetching events:", error);
        } finally {
          if (isActive) setLoading(false);
        }
      };
      fetchEvents();
      return () => {
        isActive = false;
      };
    }, [])
  );

  const closeAd = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowInterstitial(false));
  };

  // 🔹 Search Filter
  const filtered = events.filter(
    (ev) =>
      ev.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={{ padding: 20 }}>
        <ActivityIndicator size="large" color="#ea5b70" />
        <Text style={{ textAlign: "center", marginTop: 10 }}>Loading events...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 10 }}>
      {filtered.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 20 }}>No events found.</Text>
      ) : (
        filtered.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            {/* 🔹 Event Image */}
            <Image
              source={{
                uri:
                  event.imageUrl ||
                  "https://via.placeholder.com/300x200.png?text=Event+Image",
              }}
              style={styles.eventImage}
            />

            {/* 🔹 Content */}
            <View style={styles.eventContent}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventLocation}>
                📍 {event.location}
                {event.province ? `, ${event.province}` : ""}
              </Text>

              {/* 📅 Date & Time */}
              <View style={styles.row}>
                <Text style={styles.eventMeta}>📅 {event.date}</Text>
                <Text style={styles.eventMeta}>
                  ⏰ {event.timeFrom} → {event.timeTo}
                </Text>
              </View>

              {/* 💰 Price or Free */}
              <Text
                style={[
                  styles.eventPrice,
                  event.isFree ? styles.freeTag : styles.paidTag,
                ]}
              >
                {event.isFree
                  ? "🎟️ Free Entry"
                  : `💰 ${event.price} ${event.currency || "LKR"}`}
              </Text>

              {/* 🔘 View Button */}
              <Pressable
                style={styles.eventButton}
                onPress={() => router.push(`/eventDetails/${event.id}`)}
              >
                <Text style={styles.eventButtonText}>View Details</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      {/* ✅ Interstitial Ad Modal */}
      {showInterstitial && interstitialEvent && (
        <Modal transparent visible={showInterstitial}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
            <Animated.View
              style={[
                styles.fullscreenAdContainer,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
              ]}
            >
              <TouchableOpacity onPress={closeAd} style={styles.closeButton}>
                <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>✕</Text>
              </TouchableOpacity>

              {interstitialEvent.imageUrl && (
                <Image
                  source={{ uri: interstitialEvent.imageUrl }}
                  style={styles.fullImage}
                />
              )}

              <View style={styles.fullAdContent}>
                <Text style={styles.fullAdTitle}>{interstitialEvent.title}</Text>
                <Text style={styles.fullAdText}>{interstitialEvent.location}</Text>
                <Text style={styles.fullAdDiscount}>
                  {interstitialEvent.isFree ? "🎟️ Free Entry" : "🔥 Limited Spots!"}
                </Text>
                <Pressable
                  style={[
                    styles.eventButton,
                    { backgroundColor: "#4CAF50", width: "100%" },
                  ]}
                  onPress={() => {
                    closeAd();
                    router.push(`/eventDetails/${interstitialEvent.id}`);
                  }}
                >
                  <Text style={styles.eventButtonText}>View Event</Text>
                </Pressable>
              </View>
            </Animated.View>
          </BlurView>
        </Modal>
      )}
    </ScrollView>
  );
}




/* ---------- OffersSection (with ad) ---------- */
/* ---------- OffersSection (with timer + add offer + ad) ---------- */

// function OffersSection() {
//   const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
//   const [expired, setExpired] = useState(false);
//   const [offers, setOffers] = useState([]);
//   const [showInterstitial, setShowInterstitial] = useState(false);
//   const [interstitialOffer, setInterstitialOffer] = useState(null);
//   const [showForm, setShowForm] = useState(false);
//   const [newOffer, setNewOffer] = useState({ title: "", discount: "", productName: "" });
//   const fadeAnim = useState(new Animated.Value(0))[0];
//   const scaleAnim = useState(new Animated.Value(0.9))[0];
//   const router = useRouter();

  

//   const user = auth.currentUser;

//   // 🔹 Flash Sale Timer logic
//   useEffect(() => {
//     let endTime;
//     const initTimer = async () => {
//       const storedEndTime = await AsyncStorage.getItem("flashSaleEndTime");
//       if (storedEndTime) {
//         endTime = parseInt(storedEndTime, 10);
//       } else {
//         endTime = new Date().getTime() + 24 * 60 * 60 * 1000;
//         await AsyncStorage.setItem("flashSaleEndTime", endTime.toString());
//       }

//       const interval = setInterval(() => {
//         const now = new Date().getTime();
//         const diff = Math.max(0, endTime - now);
//         if (diff <= 0) {
//           clearInterval(interval);
//           setExpired(true);
//           AsyncStorage.removeItem("flashSaleEndTime");
//           return;
//         }
//         const hours = Math.floor(diff / (1000 * 60 * 60));
//         const minutes = Math.floor((diff / (1000 * 60)) % 60);
//         const seconds = Math.floor((diff / 1000) % 60);
//         setTimeLeft({ hours, minutes, seconds });
//       }, 1000);

//       return () => clearInterval(interval);
//     };
//     initTimer();
//   }, []);

//   // 🔹 Load offers & trigger ad
//   useFocusEffect(
//     useCallback(() => {
//       let isActive = true;
//       const fetchOffers = async () => {
//         try {
//           const offerSnap = await getDocs(collection(db, "offers"));
//           const allOffers = offerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
//           if (isActive) {
//             setOffers(allOffers);
//            // ✅ Always show the ad when entering Offers tab
// if (allOffers.length > 0) {
//   const randomOffer = allOffers[Math.floor(Math.random() * allOffers.length)];
//   setInterstitialOffer(randomOffer);
//   setShowInterstitial(true);

//   Animated.parallel([
//     Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
//     Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
//   ]).start();
// }

//           }
//         } catch (e) {
//           console.error("Error loading offers:", e);
//         }
//       };
//       fetchOffers();
//       return () => (isActive = false);
//     }, [user?.uid])
//   );

//   // Reset ad session every 5 min
//   // useEffect(() => {
//   //   const t = setTimeout(() => AsyncStorage.removeItem("shownAdOnce"), 5 * 60 * 1000);
//   //   return () => clearTimeout(t);
//   // }, []);

//   const closeAd = () => {
//     Animated.parallel([
//       Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
//       Animated.timing(scaleAnim, { toValue: 0.9, duration: 300, useNativeDriver: true }),
//     ]).start(() => setShowInterstitial(false));
//   };

//   // 🔹 Add Offer Handler (local mock — replace with Firestore if needed)
//   const handleAddOffer = () => {
//     if (!newOffer.title || !newOffer.discount || !newOffer.productName) {
//       Alert.alert("Missing fields", "Please fill all the fields.");
//       return;
//     }
//     const newItem = { id: Date.now().toString(), ...newOffer, productImage: "", owner: user?.email };
//     setOffers((prev) => [...prev, newItem]);
//     setNewOffer({ title: "", discount: "", productName: "" });
//     setShowForm(false);
//     Alert.alert("✅ Offer Added!");
//   };

//   // ---------- UI ----------
//   if (expired) {
//     return (
//       <View style={styles.card}>
//         <Text style={styles.eventTitle}>Exclusive Offer</Text>
//         <View style={styles.flashSaleBanner}>
//           <Text style={[styles.flashSaleTitle, { color: "#fff" }]}>⚠️ Offer Expired</Text>
//         </View>
//       </View>
//     );
//   }

//   return (
//     <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
//       <View style={styles.card}>
//         <Text style={styles.eventTitle}>Exclusive Offer</Text>

//         {/* Flash Sale Timer */}
//         <View style={styles.flashSaleBanner}>
//           <Text style={styles.flashSaleTitle}>24 HOUR FLASH SALE</Text>
//           <Text style={styles.flashSaleSubTitle}>50% OFF EVERYTHING*</Text>
//           <View style={styles.timer}>
//             <Text style={styles.timerText}>{String(timeLeft.hours).padStart(2, "0")} hrs</Text>
//             <Text style={styles.timerText}>{String(timeLeft.minutes).padStart(2, "0")} min</Text>
//             <Text style={styles.timerText}>{String(timeLeft.seconds).padStart(2, "0")} sec</Text>
//           </View>
//         </View>

        

//         {/* Offer Form */}
//         {showForm && (
//           <View style={{ marginTop: 20 }}>
//             <TextInput
//               style={styles.searchInput}
//               placeholder="Offer Title"
//               value={newOffer.title}
//               onChangeText={(text) => setNewOffer({ ...newOffer, title: text })}
//             />
//             <TextInput
//               style={[styles.searchInput, { marginTop: 10 }]}
//               placeholder="Discount %"
//               keyboardType="numeric"
//               value={newOffer.discount}
//               onChangeText={(text) => setNewOffer({ ...newOffer, discount: text })}
//             />
//             <TextInput
//               style={[styles.searchInput, { marginTop: 10 }]}
//               placeholder="Product Name"
//               value={newOffer.productName}
//               onChangeText={(text) => setNewOffer({ ...newOffer, productName: text })}
//             />
//             <Pressable style={[styles.eventButton, { marginTop: 15 }]} onPress={handleAddOffer}>
//               <Text style={styles.eventButtonText}>Save Offer</Text>
//             </Pressable>
//           </View>
//         )}

//         {/* Offer List */}
//         {offers.map((o, i) => {
//   // Calculate current price if previous price and discount are available
//   const prevPrice = Number(o.prevPrice || 0);
//   const discount = Number(o.discount || 0);
//   const currentPrice = prevPrice && discount ? (prevPrice * (1 - discount / 100)).toFixed(2) : null;

//   return (
//     <View key={o.id || i} style={styles.offerCard}>
//       {/* Product Image */}
//       {o.productImage ? (
//         <Image source={{ uri: o.productImage }} style={styles.offerImage} />
//       ) : (
//         <View style={[styles.offerImage, { backgroundColor: "#eee", justifyContent: "center" }]}>
//           <Text style={{ color: "#999" }}>No Image</Text>
//         </View>
//       )}

//       {/* Offer Content */}
//       <View style={styles.offerDetails}>
//         <Text style={styles.offerProduct}>{o.productName || "Unnamed Product"}</Text>
//         {o.category ? <Text style={styles.offerCategory}>{o.category}</Text> : null}

//         {/* Price & Discount Row */}
//         <View style={styles.priceRow}>
//           {prevPrice ? <Text style={styles.oldPrice}>LKR {prevPrice}</Text> : null}
//           {currentPrice ? (
//             <Text style={styles.newPrice}>LKR {currentPrice}</Text>
//           ) : null}
//         </View>

//         <Text style={styles.discountBadge}>-{o.discount || 0}% OFF</Text>

// {/* 🛒 Buy Now Button */}
//                 <Pressable
//                   style={[
//                     styles.eventButton,
//                     { backgroundColor: "#4CAF50", marginTop: 10 },
//                   ]}
//                   // onPress={() =>
//                   //   router.push({
//                   //     pathname: "/offerDetails",
//                   //     params: { offerId: o.id },
//                   //   })
//                   // }
//                    onPress={() => router.push(`/offerDetails/${o.id}`)}
//                 >
//                   <Text style={styles.eventButtonText}>Buy Now</Text>
//                 </Pressable>
//       </View>
//     </View>
//   );
// })}


//         {/* ✅ Fullscreen Interstitial Ad */}
//         {showInterstitial && interstitialOffer && (
//           <Modal transparent visible={showInterstitial}>
//             <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
//               <Animated.View
//                 style={[
//                   styles.fullscreenAdContainer,
//                   { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
//                 ]}
//               >
//                 <TouchableOpacity onPress={closeAd} style={styles.closeButton}>
//                   <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>✕</Text>
//                 </TouchableOpacity>

//                 {interstitialOffer.productImage && (
//                   <Image source={{ uri: interstitialOffer.productImage }} style={styles.fullImage} />
//                 )}
//                 <View style={styles.fullAdContent}>
//                   <Text style={styles.fullAdTitle}>{interstitialOffer.title}</Text>
//                   <Text style={styles.fullAdText}>{interstitialOffer.productName}</Text>
//                   <Text style={styles.fullAdDiscount}>{interstitialOffer.discount}% OFF</Text>
//                   {/* <Pressable
//                     style={[styles.eventButton, { backgroundColor: "#4CAF50", width: "100%" }]}
//                     onPress={closeAd}
//                   >
//                     <Text style={styles.eventButtonText}>Buy Now</Text>
//                   </Pressable> */}

//                    <Pressable
//                   style={[
//                     styles.eventButton,
//                     { backgroundColor: "#4CAF50", width: "100%" },
//                   ]}
//                   onPress={() => {
//                     closeAd();
//                     router.push(`/offerDetails/${interstitialOffer.id}`);
//                   }}
//                 >
//                   <Text style={styles.eventButtonText}>Buy Now</Text>
//                 </Pressable>
//                 </View>
//               </Animated.View>
//             </BlurView>
//           </Modal>



//         )}
//       </View>
//     </ScrollView>
//   );
// }


/* ---------- OffersSection (Manual Timer + Password + Interstitial Ad) ---------- */



// function OffersSection({ isVerified }) {
//   const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
//   const [expired, setExpired] = useState(false);
//   const [offers, setOffers] = useState([]);
//   const [showInterstitial, setShowInterstitial] = useState(false);
//   const [interstitialOffer, setInterstitialOffer] = useState(null);
//   const [showForm, setShowForm] = useState(false);
//   const [newOffer, setNewOffer] = useState({ title: "", discount: "", productName: "" });

//   const fadeAnim = useState(new Animated.Value(0))[0];
//   const scaleAnim = useState(new Animated.Value(0.9))[0];
//   const router = useRouter();
//   const user = auth.currentUser;

//   // 🔹 Password-protected timer controls
//   const [passwordPrompt, setPasswordPrompt] = useState(false);
//   const [passwordInput, setPasswordInput] = useState("");
//   const [showTimerSettings, setShowTimerSettings] = useState(false);
//   const [manualHours, setManualHours] = useState("");
//   const [manualMinutes, setManualMinutes] = useState("");

//   // 🔹 Firestore global timer
//   const [flashEndTime, setFlashEndTime] = useState(null);

//   // 🔹 Listen for timer updates from Firestore
//   useEffect(() => {
//     const ref = doc(db, "global", "flashSale");
//     const unsub = onSnapshot(ref, (snap) => {
//       if (snap.exists()) {
//         const data = snap.data();
//         setFlashEndTime(data.endTime);
//       }
//     });
//     return () => unsub();
//   }, []);

//   // 🔹 Calculate countdown
//   useEffect(() => {
//     if (!flashEndTime) return;

//     const interval = setInterval(() => {
//       const now = Date.now();
//       const diff = flashEndTime - now;

//       if (diff <= 0) {
//         clearInterval(interval);
//         setExpired(true);
//         return;
//       }

//       const hours = Math.floor(diff / (1000 * 60 * 60));
//       const minutes = Math.floor((diff / (1000 * 60)) % 60);
//       const seconds = Math.floor((diff / 1000) % 60);
//       setTimeLeft({ hours, minutes, seconds });
//       setExpired(false);
//     }, 1000);

//     return () => clearInterval(interval);
//   }, [flashEndTime]);

//   // 🔹 Load offers & trigger interstitial ad
//   useFocusEffect(
//     useCallback(() => {
//       let isActive = true;
//       const fetchOffers = async () => {
//         try {
//           const offerSnap = await getDocs(collection(db, "offers"));
//           const allOffers = offerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
//           if (isActive) {
//             setOffers(allOffers);
//             if (allOffers.length > 0) {
//               const randomOffer = allOffers[Math.floor(Math.random() * allOffers.length)];
//               setInterstitialOffer(randomOffer);
//               setShowInterstitial(true);

//               Animated.parallel([
//                 Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
//                 Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
//               ]).start();
//             }
//           }
//         } catch (e) {
//           console.error("Error loading offers:", e);
//         }
//       };
//       fetchOffers();
//       return () => (isActive = false);
//     }, [user?.uid])
//   );

//   const closeAd = () => {
//     Animated.parallel([
//       Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
//       Animated.timing(scaleAnim, { toValue: 0.9, duration: 300, useNativeDriver: true }),
//     ]).start(() => setShowInterstitial(false));
//   };

//   // 🔹 Save timer (verified + correct password only)
//   const saveNewTimer = async () => {
//     const hours = parseInt(manualHours) || 0;
//     const minutes = parseInt(manualMinutes) || 0;
//     const newEnd = Date.now() + (hours * 60 + minutes) * 60 * 1000;

//     try {
//       await setDoc(doc(db, "global", "flashSale"), { endTime: newEnd }, { merge: true });
//       Alert.alert("✅ Updated", `Flash sale set for ${hours}h ${minutes}m from now.`);
//       setShowTimerSettings(false);
//       setManualHours("");
//       setManualMinutes("");
//     } catch (err) {
//       console.error("Error saving flash sale timer:", err);
//       Alert.alert("Error", "Failed to update timer.");
//     }
//   };

//   // 🔹 Add Offer Handler
//   const handleAddOffer = () => {
//     if (!newOffer.title || !newOffer.discount || !newOffer.productName) {
//       Alert.alert("Missing fields", "Please fill all the fields.");
//       return;
//     }
//     const newItem = { id: Date.now().toString(), ...newOffer, productImage: "", owner: user?.email };
//     setOffers((prev) => [...prev, newItem]);
//     setNewOffer({ title: "", discount: "", productName: "" });
//     setShowForm(false);
//     Alert.alert("✅ Offer Added!");
//   };

//   // ---------- UI ----------
//   return (
//     <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
//       <View style={styles.card}>
//         <Text style={styles.eventTitle}>Exclusive Offer</Text>

//         {/* 🔹 Flash Sale Timer Section */}
//         <View style={styles.flashSaleBanner}>
//           {isVerified && (
//             <TouchableOpacity
//               onPress={() => setPasswordPrompt(true)}
//               style={{ position: "absolute", top: 10, right: 10 }}
//             >
//               <Ionicons name="settings-sharp" size={22} color="#fff" />
//             </TouchableOpacity>
//           )}

//           <Text style={styles.flashSaleTitle}>FLASH SALE</Text>
//           {expired ? (
//             <Text style={[styles.flashSaleSubTitle, { color: "#ffe0e0" }]}>⚠️ Sale Expired</Text>
//           ) : (
//             <>
//               <Text style={styles.flashSaleSubTitle}>Ends Soon!</Text>
//               <View style={styles.timer}>
//                 <Text style={styles.timerText}>{String(timeLeft.hours).padStart(2, "0")} hrs</Text>
//                 <Text style={styles.timerText}>{String(timeLeft.minutes).padStart(2, "0")} min</Text>
//                 <Text style={styles.timerText}>{String(timeLeft.seconds).padStart(2, "0")} sec</Text>
//               </View>
//             </>
//           )}
//         </View>

//         {/* Offer List */}
//         {offers.map((o, i) => {
//           const prevPrice = Number(o.prevPrice || 0);
//           const discount = Number(o.discount || 0);
//           const currentPrice =
//             prevPrice && discount ? (prevPrice * (1 - discount / 100)).toFixed(2) : null;

//           return (
//             <View key={o.id || i} style={styles.offerCard}>
//               {o.productImage ? (
//                 <Image source={{ uri: o.productImage }} style={styles.offerImage} />
//               ) : (
//                 <View style={[styles.offerImage, { backgroundColor: "#eee", justifyContent: "center" }]}>
//                   <Text style={{ color: "#999" }}>No Image</Text>
//                 </View>
//               )}

//               <View style={styles.offerDetails}>
//                 <Text style={styles.offerProduct}>{o.productName || "Unnamed Product"}</Text>
//                 <View style={styles.priceRow}>
//                   {prevPrice ? <Text style={styles.oldPrice}>LKR {prevPrice}</Text> : null}
//                   {currentPrice ? <Text style={styles.newPrice}>LKR {currentPrice}</Text> : null}
//                 </View>
//                 <Text style={styles.discountBadge}>-{o.discount || 0}% OFF</Text>

//                 <Pressable
//                   style={[styles.eventButton, { backgroundColor: "#4CAF50", marginTop: 10 }]}
//                   onPress={() => router.push(`/offerDetails/${o.id}`)}
//                 >
//                   <Text style={styles.eventButtonText}>Buy Now</Text>
//                 </Pressable>
//               </View>
//             </View>
//           );
//         })}

//         {/* 🔒 Password Modal */}
//         <Modal transparent visible={passwordPrompt} animationType="fade">
//           <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
//             <View style={styles.modalCenter}>
//               <View style={styles.modalBox}>
//                 <Text style={styles.modalTitle}>Enter Password</Text>
//                 <TextInput
//                   style={styles.modalInput}
//                   placeholder="Enter password"
//                   secureTextEntry
//                   value={passwordInput}
//                   onChangeText={setPasswordInput}
//                 />
//                 <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
//                   <Pressable
//                     style={[styles.eventButton, { flex: 1 }]}
//                     onPress={() => {
//                       if (passwordInput === "123") {
//                         setPasswordPrompt(false);
//                         setShowTimerSettings(true);
//                         setPasswordInput("");
//                       } else {
//                         Alert.alert("Incorrect", "Wrong password. Try again.");
//                       }
//                     }}
//                   >
//                     <Text style={styles.eventButtonText}>Submit</Text>
//                   </Pressable>
//                   <Pressable
//                     style={[styles.eventButton, { flex: 1, backgroundColor: "#999" }]}
//                     onPress={() => {
//                       setPasswordPrompt(false);
//                       setPasswordInput("");
//                     }}
//                   >
//                     <Text style={styles.eventButtonText}>Cancel</Text>
//                   </Pressable>
//                 </View>
//               </View>
//             </View>
//           </BlurView>
//         </Modal>

//         {/* ⏱️ Timer Settings Modal */}
//         <Modal transparent visible={showTimerSettings} animationType="fade">
//           <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
//             <View style={styles.modalCenter}>
//               <View style={styles.modalBox}>
//                 <Text style={styles.modalTitle}>Set Flash Sale Timer</Text>
//                 <Text style={{ color: "#666", marginBottom: 10 }}>
//                   Enter hours and minutes from now.
//                 </Text>
//                 <TextInput
//                   style={styles.modalInput}
//                   placeholder="Hours"
//                   keyboardType="numeric"
//                   value={manualHours}
//                   onChangeText={setManualHours}
//                 />
//                 <TextInput
//                   style={styles.modalInput}
//                   placeholder="Minutes"
//                   keyboardType="numeric"
//                   value={manualMinutes}
//                   onChangeText={setManualMinutes}
//                 />

//                 <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
//                   <Pressable
//                     style={[styles.eventButton, { flex: 1 }]}
//                     onPress={saveNewTimer}
//                   >
//                     <Text style={styles.eventButtonText}>Save</Text>
//                   </Pressable>
//                   <Pressable
//                     style={[styles.eventButton, { flex: 1, backgroundColor: "#999" }]}
//                     onPress={() => setShowTimerSettings(false)}
//                   >
//                     <Text style={styles.eventButtonText}>Cancel</Text>
//                   </Pressable>
//                 </View>
//               </View>
//             </View>
//           </BlurView>
//         </Modal>
//       </View>
//     </ScrollView>
//   );
// }

 function OffersSection({ isVerified }) {
  const router = useRouter();
  const user = auth.currentUser;

  // 🕒 Timer state
  const [flashEndTime, setFlashEndTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  // 💥 Offers & Ad
  const [offers, setOffers] = useState([]);
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [interstitialOffer, setInterstitialOffer] = useState(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  // 🔐 Timer controls
  const [passwordPrompt, setPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [showTimerSettings, setShowTimerSettings] = useState(false);
  const [manualHours, setManualHours] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");

  // ----------------------------------------------------
  // 🔹 Firestore listener for shared flash sale timer
  // ----------------------------------------------------
  useEffect(() => {
    const ref = doc(db, "global", "flashSale");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setFlashEndTime(data.endTime);
      }
    });
    return () => unsub();
  }, []);

  // ----------------------------------------------------
  // 🔹 Countdown logic
  // ----------------------------------------------------
  useEffect(() => {
    if (!flashEndTime) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = flashEndTime - now;
      if (diff <= 0) {
        clearInterval(interval);
        setExpired(true);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ hours, minutes, seconds });
      setExpired(false);
    }, 1000);
    return () => clearInterval(interval);
  }, [flashEndTime]);

  // ----------------------------------------------------
  // 🔹 Fetch offers & show interstitial ad once per tab open
  // ----------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchOffers = async () => {
        try {
          const offerSnap = await getDocs(collection(db, "offers"));
          const allOffers = offerSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
          if (!isActive) return;
          setOffers(allOffers);

          // ✅ Show random ad when opening tab
          if (allOffers.length > 0) {
            const randomOffer =
              allOffers[Math.floor(Math.random() * allOffers.length)];
            setInterstitialOffer(randomOffer);
            setShowInterstitial(true);
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
              }),
              Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                useNativeDriver: true,
              }),
            ]).start();
          }
        } catch (e) {
          console.error("Error loading offers:", e);
        }
      };
      fetchOffers();
      return () => {
        isActive = false;
      };
    }, [user?.uid])
  );

  const closeAd = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowInterstitial(false));
  };

  // ----------------------------------------------------
  // 🔹 Admin timer setter (verified only)
  // ----------------------------------------------------
  const saveNewTimer = async () => {
    const hours = parseInt(manualHours) || 0;
    const minutes = parseInt(manualMinutes) || 0;
    const newEnd = Date.now() + (hours * 60 + minutes) * 60 * 1000;
    try {
      await setDoc(doc(db, "global", "flashSale"), { endTime: newEnd }, { merge: true });
      Alert.alert("✅ Updated", `Flash sale set for ${hours}h ${minutes}m from now.`);
      setShowTimerSettings(false);
      setManualHours("");
      setManualMinutes("");
    } catch (err) {
      console.error("Error saving flash sale timer:", err);
      Alert.alert("Error", "Failed to update timer.");
    }
  };

  // ----------------------------------------------------
  // 🔹 UI
  // ----------------------------------------------------
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={styles.card}>
        <Text style={styles.eventTitle}>Exclusive Offer</Text>

        {/* 🕒 Flash Sale Banner */}
        <View style={styles.flashSaleBanner}>
          {isVerified && (
            <TouchableOpacity
              onPress={() => setPasswordPrompt(true)}
              style={{ position: "absolute", top: 10, right: 10 }}
            >
              <Ionicons name="settings-sharp" size={22} color="#fff" />
            </TouchableOpacity>
          )}

          <Text style={styles.flashSaleTitle}>FLASH SALE</Text>
          {expired ? (
            <Text style={[styles.flashSaleSubTitle, { color: "#ffe0e0" }]}>⚠️ Sale Expired</Text>
          ) : (
            <>
              <Text style={styles.flashSaleSubTitle}>Ends Soon!</Text>
              <View style={styles.timer}>
                <Text style={styles.timerText}>{String(timeLeft.hours).padStart(2, "0")} hrs</Text>
                <Text style={styles.timerText}>{String(timeLeft.minutes).padStart(2, "0")} min</Text>
                <Text style={styles.timerText}>{String(timeLeft.seconds).padStart(2, "0")} sec</Text>
              </View>
            </>
          )}
        </View>

        {/* 🛍️ Offer Cards */}
        {offers.map((o, i) => {
          const prevPrice = Number(o.prevPrice || 0);
          const discount = Number(o.discount || 0);
          const currentPrice =
            prevPrice && discount ? (prevPrice * (1 - discount / 100)).toFixed(2) : null;

          return (
            <View key={o.id || i} style={styles.offerCard}>
              {o.productImage ? (
                <Image source={{ uri: o.productImage }} style={styles.offerImage} />
              ) : (
                <View style={[styles.offerImage, { backgroundColor: "#eee", justifyContent: "center" }]}>
                  <Text style={{ color: "#999" }}>No Image</Text>
                </View>
              )}
              <View style={styles.offerDetails}>
                <Text style={styles.offerProduct}>{o.productName || "Unnamed Product"}</Text>
                <View style={styles.priceRow}>
                  {prevPrice ? <Text style={styles.oldPrice}>LKR {prevPrice}</Text> : null}
                  {currentPrice ? <Text style={styles.newPrice}>LKR {currentPrice}</Text> : null}
                </View>
                <Text style={styles.discountBadge}>-{o.discount || 0}% OFF</Text>
                <Pressable
                  style={[styles.eventButton, { backgroundColor: "#4CAF50", marginTop: 10 }]}
                  onPress={() => router.push(`/offerDetails/${o.id}`)}
                >
                  <Text style={styles.eventButtonText}>Buy Now</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* 🎬 Interstitial Ad */}
        {showInterstitial && interstitialOffer && (
          <Modal transparent visible={showInterstitial}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
              <Animated.View
                style={[
                  styles.fullscreenAdContainer,
                  { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
                ]}
              >
                <TouchableOpacity onPress={closeAd} style={styles.closeButton}>
                  <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>✕</Text>
                </TouchableOpacity>

                {interstitialOffer.productImage && (
                  <Image source={{ uri: interstitialOffer.productImage }} style={styles.fullImage} />
                )}
                <View style={styles.fullAdContent}>
                  <Text style={styles.fullAdTitle}>{interstitialOffer.title}</Text>
                  <Text style={styles.fullAdText}>{interstitialOffer.productName}</Text>
                  <Text style={styles.fullAdDiscount}>{interstitialOffer.discount}% OFF</Text>

                  <Pressable
                    style={[styles.eventButton, { backgroundColor: "#4CAF50", width: "100%" }]}
                    onPress={() => {
                      closeAd();
                      router.push(`/offerDetails/${interstitialOffer.id}`);
                    }}
                  >
                    <Text style={styles.eventButtonText}>Buy Now</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </BlurView>
          </Modal>
        )}

        {/* 🔐 Password Prompt */}
        <Modal transparent visible={passwordPrompt} animationType="fade">
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={styles.modalCenter}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Enter Password</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter password"
                  secureTextEntry
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                />
                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  <Pressable
                    style={[styles.eventButton, { flex: 1 }]}
                    onPress={() => {
                      if (passwordInput === "123") {
                        setPasswordPrompt(false);
                        setTimeout(() => setShowTimerSettings(true), 200);
                        setPasswordInput("");
                      } else {
                        Alert.alert("Incorrect", "Wrong password. Try again.");
                      }
                    }}
                  >
                    <Text style={styles.eventButtonText}>Submit</Text>
                  </Pressable>

                  <Pressable
                    style={[styles.eventButton, { flex: 1, backgroundColor: "#999" }]}
                    onPress={() => {
                      setPasswordPrompt(false);
                      setPasswordInput("");
                    }}
                  >
                    <Text style={styles.eventButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </BlurView>
        </Modal>

        {/* ⏱️ Timer Settings Modal */}
        <Modal transparent visible={showTimerSettings} animationType="fade">
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
            <View style={styles.modalCenter}>
              <View style={styles.modalBox}>
                <Text style={styles.modalTitle}>Set Flash Sale Timer</Text>
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Hours"
                  keyboardType="numeric"
                  value={manualHours}
                  onChangeText={setManualHours}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Minutes"
                  keyboardType="numeric"
                  value={manualMinutes}
                  onChangeText={setManualMinutes}
                />

                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  <Pressable style={[styles.eventButton, { flex: 1 }]} onPress={saveNewTimer}>
                    <Text style={styles.eventButtonText}>Save</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.eventButton, { flex: 1, backgroundColor: "#999" }]}
                    onPress={() => setShowTimerSettings(false)}
                  >
                    <Text style={styles.eventButtonText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </BlurView>
        </Modal>
      </View>
    </ScrollView>
  );
}



/* ---------- NearbySection ---------- */
function NearbySection({ searchQuery }) {
  const [userLocation, setUserLocation] = useState(null);
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  // useEffect(() => {
  //   (async () => {
  //     try {
  //       let { status } = await Location.requestForegroundPermissionsAsync();
  //       if (status !== "granted") {
  //         setErrorMsg("Permission denied.");
  //         setLoading(false);
  //         return;
  //       }

  //       // 🔹 Get location and city
  //       let location = await Location.getCurrentPositionAsync({});
  //       const [place] = await Location.reverseGeocodeAsync(location.coords);
  //       const city = place.city || place.region || place.district || "Unknown";
  //       setUserLocation(city);

  //       // 🔹 Fetch all events
  //       const snapshot = await getDocs(collection(db, "events"));
  //       const allEvents = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  //       setEvents(allEvents);

  //       // 🔹 Filter nearby
  //       const nearby = allEvents.filter((e) =>
  //         e.location?.toLowerCase().includes(city.toLowerCase())
  //       );
  //       setFilteredEvents(nearby);
  //     } catch (err) {
  //       console.error("Error loading nearby events:", err);
  //       setErrorMsg("Failed to load nearby events.");
  //     } finally {
  //       setLoading(false);
  //     }
  //   })();
  // }, []);

useEffect(() => {
  (async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission denied.");
        setLoading(false);
        return;
      }

      // 🔹 Get user's coordinates and reverse geocode
      let location = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync(location.coords);

      // 🔹 Normalize province (remove "Province", "District", etc.)
      const rawProvince =
        place.region || place.subregion || place.district || place.city || "Unknown";

      const normalizedProvince = rawProvince
        ?.toLowerCase()
        .replace(/\b(province|district|region)\b/gi, "")
        .trim(); // → "western"

      setUserLocation(
        rawProvince.charAt(0).toUpperCase() + rawProvince.slice(1)
      );

      // 🔹 Fetch all events
      const snapshot = await getDocs(collection(db, "events"));
      const allEvents = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEvents(allEvents);

      // 🔹 Filter by normalized province
      const nearby = allEvents.filter((e) => {
        const evProvince = e.province
          ?.toLowerCase()
          .replace(/\b(province|district|region)\b/gi, "")
          .trim();
        return evProvince && evProvince.includes(normalizedProvince);
      });

      setFilteredEvents(nearby);
    } catch (err) {
      console.error("Error loading nearby events:", err);
      setErrorMsg("Failed to load nearby events.");
    } finally {
      setLoading(false);
    }
  })();
}, []);


  const filtered = filteredEvents.filter(
    (ev) =>
      ev.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading)
    return (
      <View style={{ padding: 20 }}>
        <ActivityIndicator size="large" color="#ea5b70" />
        <Text style={{ textAlign: "center", marginTop: 10 }}>Finding nearby events...</Text>
      </View>
    );

  if (errorMsg)
    return <Text style={{ textAlign: "center", color: "red" }}>{errorMsg}</Text>;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 10 }}>
      <Text
        style={{
          textAlign: "center",
          fontWeight: "700",
          marginVertical: 10,
          color: "#333",
          fontSize: 16,
        }}
      >
        📍 Your Location: {userLocation || "Unknown"}
      </Text>

      {filtered.length === 0 ? (
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          No nearby events found in {userLocation}.
        </Text>
      ) : (
        filtered.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            {/* 🔹 Event Image */}
            <Image
              source={{
                uri:
                  event.imageUrl ||
                  "https://via.placeholder.com/300x200.png?text=Event+Image",
              }}
              style={styles.eventImage}
            />

            {/* 🔹 Content */}
            <View style={styles.eventContent}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventLocation}>
                📍 {event.location}
                {event.province ? `, ${event.province}` : ""}
              </Text>

              {/* 📅 Date & Time */}
              <View style={styles.row}>
                <Text style={styles.eventMeta}>📅 {event.date}</Text>
                <Text style={styles.eventMeta}>
                  ⏰ {event.timeFrom} → {event.timeTo}
                </Text>
              </View>

              {/* 💰 Price / Free */}
              <Text
                style={[
                  styles.eventPrice,
                  event.isFree ? styles.freeTag : styles.paidTag,
                ]}
              >
                {event.isFree
                  ? "🎟️ Free Entry"
                  : `💰 ${event.price} ${event.currency || "LKR"}`}
              </Text>

              {/* 🔘 View Button */}
              <Pressable
                style={styles.eventButton}
                onPress={() => router.push(`/eventDetails/${event.id}`)}
              >
                <Text style={styles.eventButtonText}>View Details</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}


function MyEvents({ searchQuery }) {
  const [events, setEvents] = useState([]);
  const user = auth.currentUser;
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const loadMyEvents = async () => {
        try {
          const snapshot = await getDocs(collection(db, "events"));
          const mine = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter(
              (e) =>
                e.createdBy === user?.uid ||
                e.createdByEmail === user?.email
            );
          setEvents(mine);
        } catch (err) {
          console.error("Error loading user events:", err);
        }
      };
      loadMyEvents();
    }, [user?.uid, user?.email])
  );

  const filtered = events.filter(
    (e) =>
      e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filtered.length === 0) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ textAlign: "center", marginTop: 20, color: "#555" }}>
          You haven’t added any events yet.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 10 }}>
      {filtered.map((event) => (
        <View key={event.id} style={styles.eventCard}>
          {/* 🔹 Image */}
          <Image
            source={{
              uri:
                event.imageUrl ||
                "https://via.placeholder.com/300x200.png?text=Event+Image",
            }}
            style={styles.eventImage}
          />

          {/* 🔹 Content */}
          <View style={styles.eventContent}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventLocation}>
              📍 {event.location}
              {event.province ? `, ${event.province}` : ""}
            </Text>

            {/* 📅 Date & Time */}
            <View style={styles.row}>
              <Text style={styles.eventMeta}>📅 {event.date}</Text>
              <Text style={styles.eventMeta}>
                ⏰ {event.timeFrom} → {event.timeTo}
              </Text>
            </View>

            {/* 💰 Price / Free */}
            <Text
              style={[
                styles.eventPrice,
                event.isFree ? styles.freeTag : styles.paidTag,
              ]}
            >
              {event.isFree
                ? "🎟️ Free Entry"
                : `💰 ${event.price} ${event.currency || "LKR"}`}
            </Text>

            {/* 🛠 Edit / Delete Buttons */}
            <View style={styles.editDeleteRow}>
              <Pressable
                style={[styles.eventButton, { backgroundColor: "#4a90e2", flex: 1 }]}
                onPress={() => router.push(`/editEvent/${event.id}`)}
              >
                <Text style={styles.eventButtonText}>Edit</Text>
              </Pressable>

              <Pressable
                style={[styles.eventButton, { backgroundColor: "#d9534f", flex: 1 }]}
                onPress={() =>
                  Alert.alert("Confirm Delete", "Are you sure you want to delete this event?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      onPress: async () => {
                        await deleteDoc(doc(db, "events", event.id));
                        setEvents((prev) => prev.filter((ev) => ev.id !== event.id));
                      },
                    },
                  ])
                }
              >
                <Text style={styles.eventButtonText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}


function MyOffers({ searchQuery }) {
  const [offers, setOffers] = useState([]);
  const user = auth.currentUser;
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      const loadMyOffers = async () => {
        try {
          const snapshot = await getDocs(collection(db, "offers"));
          const mine = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter(
              (o) =>
                o.ownerEmail === user?.email ||
                o.ownerId === user?.uid
            );
          setOffers(mine);
        } catch (err) {
          console.error("Error loading user offers:", err);
        }
      };
      loadMyOffers();
    }, [user?.email, user?.uid])
  );

  const filtered = offers.filter(
    (o) =>
      o.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.productName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filtered.length === 0) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ textAlign: "center", marginTop: 20 }}>
          You haven’t added any offers yet.
        </Text>
      </View>
    );
  }

  // 🔹 UI
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
      {filtered.map((o) => {
        const prevPrice = Number(o.prevPrice || 0);
        const discount = Number(o.discount || 0);
        const currentPrice =
          prevPrice && discount
            ? (prevPrice * (1 - discount / 100)).toFixed(2)
            : null;

        return (
          <View key={o.id} style={styles.offerCard}>
            {/* 🟢 Image */}
            {o.productImage ? (
              <Image
                source={{ uri: o.productImage }}
                style={styles.offerImage}
              />
            ) : (
              <View
                style={[
                  styles.offerImage,
                  { backgroundColor: "#eee", justifyContent: "center" },
                ]}
              >
                <Text style={{ color: "#999" }}>No Image</Text>
              </View>
            )}

            {/* 🟢 Offer Details */}
            <View style={styles.offerDetails}>
              <Text style={styles.offerProduct}>
                {o.productName || "Unnamed Product"}
              </Text>
              {o.category ? (
                <Text style={styles.offerCategory}>{o.category}</Text>
              ) : null}

              {/* Price & Discount Row */}
              <View style={styles.priceRow}>
                {prevPrice ? (
                  <Text style={styles.oldPrice}>LKR {prevPrice}</Text>
                ) : null}
                {currentPrice ? (
                  <Text style={styles.newPrice}>LKR {currentPrice}</Text>
                ) : null}
              </View>

              {/* Discount */}
              <Text style={styles.discountBadge}>
                -{o.discount || 0}% OFF
              </Text>

              {/* Edit / Delete Buttons */}
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <Pressable
                  style={[styles.eventButton, { flex: 1, backgroundColor: "#4a90e2" }]}
                  onPress={() => router.push(`/editOffer/${o.id}`)}
                >
                  <Text style={styles.eventButtonText}>Edit</Text>
                </Pressable>

                <Pressable
                  style={[styles.eventButton, { flex: 1, backgroundColor: "#d9534f" }]}
                  onPress={() =>
                    Alert.alert("Delete Offer", "Confirm delete?", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        onPress: async () => {
                          await deleteDoc(doc(db, "offers", o.id));
                          setOffers((prev) => prev.filter((x) => x.id !== o.id));
                        },
                      },
                    ])
                  }
                >
                  <Text style={styles.eventButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}




/* ---------- Styles ---------- */
/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f7f7f7" },
  container: { flex: 1, padding: 16 },
  searchSection: { marginBottom: 20 },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#ccc",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    margin: 14,
    ...shadow,
  },

  eventTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#113a16",
    marginBottom: 10,
  },

  eventImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },

  eventLocation: { fontSize: 14, color: "#777", marginBottom: 10 },

  eventButton: {
    backgroundColor: "#ea5b70",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
  },

  eventButtonText: { color: "#fff", fontWeight: "600" },

  addEventButton: {
    backgroundColor: "#4a90e2",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 15,
  },

  addEventButtonText: { color: "#fff", fontWeight: "600" },

  // 🔹 Flash Sale Banner
  flashSaleBanner: {
    backgroundColor: "#ea5b70",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: "center",
  },

  flashSaleTitle: { fontSize: 24, fontWeight: "700", color: "#fff" },
  flashSaleSubTitle: { fontSize: 16, fontWeight: "600", color: "#fff", marginBottom: 20 },

  timer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: 20,
    width: "100%",
  },

  timerText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    backgroundColor: "#4a3f2d",
    padding: 10,
    borderRadius: 6,
  },

  categoryButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  categoryButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: "center",
  },

  categoryText: { fontSize: 16, fontWeight: "600", color: "#444" },

  // 🔹 Popup & Ad
  fullscreenAdContainer: {
    width,
    height,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  fullImage: {
    width: "90%",
    height: height * 0.45,
    borderRadius: 12,
    marginBottom: 20,
  },

  fullAdContent: {
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    width: "90%",
  },

  fullAdTitle: { fontSize: 24, fontWeight: "800", color: "#222" },
  fullAdText: { fontSize: 16, color: "#555", marginVertical: 6 },
  fullAdDiscount: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ea5b70",
    marginBottom: 16,
  },

  closeButton: { position: "absolute", top: 50, right: 30, zIndex: 99 },

  searchRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 16,
},
addButton: {
  marginLeft: 10,
  justifyContent: "center",
  alignItems: "center",
},



 eventCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    marginVertical: 10,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },

  eventImage: {
    width: "100%",
    height: 180,
  },

  eventContent: {
    padding: 14,
  },

  eventTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 4,
  },

  eventLocation: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  eventMeta: {
    fontSize: 13,
    color: "#666",
  },

  eventPrice: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 10,
  },

  freeTag: {
    color: "#4CAF50",
  },

  paidTag: {
    color: "#E53935",
  },

  eventButton: {
    backgroundColor: "#ea5b70",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },

  eventButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },

  editDeleteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

// 🔹 Offer Card Layout
  offerCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 3,
  },

  offerImage: {
    width: 110,
    height: 110,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },

  offerDetails: {
    flex: 1,
    padding: 10,
    justifyContent: "center",
  },

  offerProduct: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },

  offerCategory: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },

  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },

  oldPrice: {
    fontSize: 13,
    color: "#999",
    textDecorationLine: "line-through",
  },

  newPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ea5b70",
  },

  discountBadge: {
    marginTop: 6,
    backgroundColor: "#ea5b70",
    alignSelf: "flex-start",
    color: "#fff",
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },

  modalCenter: {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
},
modalBox: {
  backgroundColor: "#fff",
  borderRadius: 12,
  padding: 20,
  width: "85%",
  ...shadow,
},
modalTitle: {
  fontSize: 18,
  fontWeight: "700",
  color: "#222",
  marginBottom: 10,
  textAlign: "center",
},
modalInput: {
  backgroundColor: "#f9f9f9",
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 8,
  padding: 10,
  fontSize: 15,
  marginVertical: 5,
},



});

