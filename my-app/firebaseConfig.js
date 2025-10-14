// firebaseConfig.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { collection, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC2QK2Ik-6981QQEuNJDe86Bjn5naujHxI",
  authDomain: "localloop-7c90b.firebaseapp.com",
  projectId: "localloop-7c90b",
  storageBucket: "localloop-7c90b.firebasestorage.app",
  messagingSenderId: "946876713229",
  appId: "1:946876713229:web:c3a7ada10aaf6ac7f7c844",
  measurementId: "G-2HFR3BW6X0",
};

export const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export const userRef = collection(db, "users");
export const roomRef = collection(db, "rooms");

// for the probe
export const __debug = { firebaseConfig };