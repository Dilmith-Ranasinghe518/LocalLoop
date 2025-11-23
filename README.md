# 📱 Mobile App – SDG 08: Decent Work & Economic Growth

This mobile application is developed as part of the **UN Sustainable Development Goal 08 (SDG 08)** initiative:  
**“Promote sustained, inclusive, and sustainable economic growth, productive employment and decent work for all.”**

The app focuses on **education, empowerment, and opportunity creation** by providing a digital platform for users to access tools, resources, achievements, and interactive features that help improve personal and professional growth.

---

## ✨ Purpose of the Application (SDG 08 Alignment)

### 🚀 How the App Supports SDG Goal 08:
- Encourages **skill growth** and continuous learning.
- Provides **achievement tracking**, motivating productivity.
- Supports **economic empowerment** through guided tasks and learning modules.
- Uses technology to promote **inclusive access**, especially for youth and students.
- Helps users build consistency and work habits through gamified features.

---

## 📲 Key Features

### 🔐 Authentication (Firebase)
- Secure email/password login  
- Persistent login session using Firebase Auth (with `AsyncStorage`)  
- User profile and onboarding flow

### 🏆 Achievements & Progress
- Custom achievement badges  
- Leveling system for user engagement  
- Motivational progress tracking  

### 🧑‍🏫 Skill Development Modules
- Interactive UI components  
- Learning-based tasks  
- Daily/weekly activity support  

### 💬 Chat & Interaction Modules (If applicable)
- Real-time features (Firebase Firestore)  
- Motivational chatbot interactions  

### 🎮 Gamification Elements
- Animated components using Lottie  
- Reward-based system  
- User activity tracking  

---

## 🛠️ Tech Stack

### **Frontend (Mobile App)**
- React Native / Expo  
- TypeScript  
- Lottie Animations  
- AsyncStorage (for persistent login)  

### **Backend / Cloud**
- Firebase Authentication  
- Firebase Firestore  
- Firebase Storage  

---

## 🔥 Firebase Configuration

The app integrates Firebase for auth, database, and storage.



```javascript
import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { collection, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "yourapp.firebaseapp.com",
  projectId: "your_project_id",
  storageBucket: "yourapp.appspot.com",
  messagingSenderId: "your_sender_id",
  appId: "your_app_id",
  measurementId: "your_measurement_id",
};

export const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);


