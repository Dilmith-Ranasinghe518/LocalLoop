// // app/onboarding/index.js
// import React, { useRef, useState } from "react";
// import {
//   View,
//   Text,
//   StyleSheet,
//   Image,
//   FlatList,
//   Dimensions,
//   Pressable,
//   ActivityIndicator,
// } from "react-native";
// import { useRouter } from "expo-router";
// import AsyncStorage from "@react-native-async-storage/async-storage";

// const { width, height } = Dimensions.get("window");

// // ---------- styles ----------
// const styles = StyleSheet.create({
//   container: { flex: 1 },
//   slide: {
//     flex: 1,
//     width,
//     paddingTop: 60,
//     paddingHorizontal: 24,
//   },
//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     marginBottom: 40,
//   },
//   skipBtn: {
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//   },
//   skipText: { 
//     fontSize: 16, 
//     color: "#666",
//     fontWeight: "600",
//   },
//   dotsContainer: {
//     flexDirection: "row",
//     gap: 6,
//   },
//   dot: {
//     backgroundColor: "#e0e0e0",
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//   },
//   activeDot: {
//     backgroundColor: "#ea5b70",
//     width: 24,
//     height: 8,
//     borderRadius: 4,
//   },
//   contentContainer: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   image: { 
//     width: width * 0.75, 
//     height: height * 0.35, 
//     marginBottom: 40,
//   },
//   textContent: {
//     width: "100%",
//     alignItems: "center",
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: "800",
//     textAlign: "center",
//     marginBottom: 16,
//     color: "#1a1a1a",
//     letterSpacing: -0.5,
//   },
//   text: {
//     fontSize: 16,
//     textAlign: "center",
//     color: "#666",
//     lineHeight: 24,
//     paddingHorizontal: 8,
//   },
//   footer: {
//     paddingHorizontal: 24,
//     paddingBottom: 50,
//     paddingTop: 20,
//   },
//   ctaBtn: {
//     backgroundColor: "#ea5b70",
//     paddingVertical: 16,
//     borderRadius: 30,
//     alignItems: "center",
//     justifyContent: "center",
//     shadowColor: "#ea5b70",
//     shadowOffset: { width: 0, height: 4 },
//     shadowOpacity: 0.3,
//     shadowRadius: 8,
//     elevation: 8,
//   },
//   ctaText: { 
//     color: "#fff", 
//     fontSize: 17, 
//     fontWeight: "700",
//     letterSpacing: 0.5,
//   },
//   loader: { 
//     flex: 1, 
//     alignItems: "center", 
//     justifyContent: "center",
//   },
// });

// // ---------- data ----------
// const SLIDES = [
//   {
//     key: "s1",
//     bg: "#ffe0e8",
//     title: "Smarter Work, Stronger Communities",
//     text:
//       "Discover opportunities, share skills, and collaborate locally to create lasting growth.",
//     img: require("./onboard1.png"),
//   },
//   {
//     key: "s2",
//     bg: "#fff7d6",
//     title: "Find Work, Skills, And Services Nearby",
//     text:
//       "Access local jobs, discover talent, and connect with services right around you.",
//     img: require("./onboard2.png"),
//   },
//   {
//     key: "s3",
//     bg: "#d9ffd9",
//     title: "Your Loop Starts Here",
//     text:
//       "Take the first step toward opportunities, growth, and stronger communities—join LocalLoop today.",
//     img: require("./onboard3.png"),
//   },
// ];

// export default function Onboarding() {
//   const router = useRouter();
//   const listRef = useRef(null);
//   const [index, setIndex] = useState(0);
//   const [ready, setReady] = useState(true);

//   const onViewableItemsChanged = useRef(({ viewableItems }) => {
//     if (viewableItems?.length) {
//       setIndex(viewableItems[0].index ?? 0);
//     }
//   }).current;

//   const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 60 });

//   const finish = async () => {
//     await AsyncStorage.setItem("hasOnboarded", "true");
//     router.replace("/signIn");
//   };

//   const next = () => {
//     const nextIdx = index + 1;
//     if (nextIdx < SLIDES.length) {
//       listRef.current?.scrollToIndex({ index: nextIdx, animated: true });
//     } else {
//       finish();
//     }
//   };

//   if (!ready) {
//     return (
//       <View style={styles.loader}>
//         <ActivityIndicator />
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <FlatList
//         ref={listRef}
//         data={SLIDES}
//         keyExtractor={(item) => item.key}
//         horizontal
//         pagingEnabled
//         showsHorizontalScrollIndicator={false}
//         onViewableItemsChanged={onViewableItemsChanged}
//         viewabilityConfig={viewConfigRef.current}
//         renderItem={({ item }) => (
//           <View style={[styles.slide, { backgroundColor: item.bg }]}>
//             {/* Header with Skip and Dots */}
//             <View style={styles.header}>
//               <Pressable style={styles.skipBtn} onPress={finish}>
//                 <Text style={styles.skipText}>Skip</Text>
//               </Pressable>
              
//               <View style={styles.dotsContainer}>
//                 {SLIDES.map((_, i) => (
//                   <View 
//                     key={i} 
//                     style={[styles.dot, i === index && styles.activeDot]} 
//                   />
//                 ))}
//               </View>
//             </View>

//             {/* Main Content */}
//             <View style={styles.contentContainer}>
//               <Image 
//                 source={item.img} 
//                 style={styles.image} 
//                 resizeMode="contain" 
//               />
              
//               <View style={styles.textContent}>
//                 <Text style={styles.title}>{item.title}</Text>
//                 <Text style={styles.text}>{item.text}</Text>
//               </View>
//             </View>

//             {/* Footer with CTA Button */}
//             <View style={styles.footer}>
//               <Pressable style={styles.ctaBtn} onPress={next}>
//                 <Text style={styles.ctaText}>
//                   {index === SLIDES.length - 1 ? "Get Started" : "Next"}
//                 </Text>
//               </Pressable>
//             </View>
//           </View>
//         )}
//       />
//     </View>
//   );
// }

import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  Dimensions,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Path } from "react-native-svg";

const { width, height } = Dimensions.get("window");

// ---------- styles ----------
const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: {
    flex: 1,
    width,
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  image: {
    width: width * 0.65,
    height: height * 0.4,
    marginBottom: 30,
  },
  textContent: {
    width: "100%",
    alignItems: "flex-start",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "left",
    marginBottom: 12,
    color: "#1a1a1a",
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  text: {
    fontSize: 15,
    textAlign: "left",
    color: "#666",
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 60,
    paddingTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  skipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  dot: {
    backgroundColor: "#d0d0d0",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    backgroundColor: "#ea5b70",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  curveOverlay: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 200,
  },
  arrowInsideCurve: {
    position: "absolute",
    right: 28,
    top: height * 0.5 - 15,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowText: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "400",
    shadowColor: "rgba(0,0,0,0.25)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ---------- data ----------
const SLIDES = [
  {
    key: "s1",
    bg: "#ffe0e8",
    title: "Smarter Work, Stronger Communities",
    text:
      "Discover Opportunities, Share Skills, And Collaborate Locally To Create Lasting Growth.",
    img: require("./onboard1.png"),
  },
  {
    key: "s2",
    bg: "#fff7d6",
    title: "Find Work, Skills, And Services Nearby",
    text:
      "Access Local Jobs, Discover Talent, And Connect With Services Right Around You.",
    img: require("./onboard2.png"),
  },
  {
    key: "s3",
    bg: "#d9ffd9",
    title: "Your Loop Starts Here",
    text:
      "Take The First Step Toward Opportunities, Growth, And Stronger Communities—Join LocalLoop Today.",
    img: require("./onboard3.png"),
  },
];

export default function Onboarding() {
  const router = useRouter();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(true);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems?.length) {
      setIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 60 });

  const finish = async () => {
    await AsyncStorage.setItem("hasOnboarded", "true");
    router.replace("/signIn");
  };

  const next = () => {
    const nextIdx = index + 1;
    if (nextIdx < SLIDES.length) {
      listRef.current?.scrollToIndex({ index: nextIdx, animated: true });
    } else {
      finish();
    }
  };

  if (!ready) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfigRef.current}
        renderItem={({ item }) => (
          <View style={[styles.slide, { backgroundColor: item.bg }]}>
            {/* Main Content */}
            <View style={styles.contentContainer}>
              <Image
                source={item.img}
                style={styles.image}
                resizeMode="contain"
              />

              <View style={styles.textContent}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.text}>{item.text}</Text>
              </View>
            </View>

            {/* Footer with Skip and Dots */}
            <View style={styles.footer}>
              <Pressable style={styles.skipBtn} onPress={finish}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>

              <View style={styles.dotsContainer}>
                {SLIDES.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === index && styles.activeDot]}
                  />
                ))}
              </View>

              <View style={{ width: 40 }} />
            </View>

            {/* ✅ Realistic curved overlay around arrow, keeping straight strip */}
            <View style={styles.curveOverlay}>
              <Svg
                height={height}
                width="200"
                style={{ position: "absolute", right: 0 }}
              >
                <Path
                  // smoother, realistic bulge around center (arrow position)
                  d={`M 180 0 
                     L 180 ${height * 0.35} 
                     Q 90 ${height * 0.5} 180 ${height * 0.65} 
                     L 180 ${height} 
                     L 200 ${height} 
                     L 200 0 
                     Z`}
                  fill="#ea5b70"
                />
              </Svg>

              {/* Arrow inside curve */}
              <Pressable style={styles.arrowInsideCurve} onPress={next}>
                <Text style={styles.arrowText}>
                  {index === SLIDES.length - 1 ? "→" : "›"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}
