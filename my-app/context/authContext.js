// context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut, // 👈 add this
} from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

export const AuthContext = createContext(null);

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      console.log("[Auth] onAuthStateChanged:", !!u, u && u.uid);
      if (u) {
        setIsAuthenticated(true);
        setUser(u);
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    });
    return unsub;
  }, []);

  const register = async (name, email, phone, password, confirm, location) => {
    try {
      console.log("[Auth] register() starting", { email });
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      console.log("[Auth] register() success, uid:", cred.user.uid);

      await setDoc(doc(db, "users", cred.user.uid), {
        name,
        phone,
        confirm,
        location,
        userId: cred.user.uid,
        email: cred.user.email,
        createdAt: new Date().toISOString(),
      });

      return { success: true, data: cred.user };
    } catch (e) {
      console.log("[Auth] register() error RAW:", e);
      console.log("[Auth] register() error details:", {
        code: e && e.code,
        name: e && e.name,
        message: e && e.message,
        stack: e && e.stack,
        native: JSON.stringify(e),
      });
      return { success: false, msg: (e && e.code) || (e && e.message) };
    }
  };

  const login = async (email, password) => {
    try {
      console.log("[Auth] login() starting", { email });
      const cred = await signInWithEmailAndPassword(auth, email, password);
      console.log("[Auth] login() success, uid:", cred.user.uid);
      return { success: true, data: cred.user };
    } catch (e) {
      console.log("[Auth] login() error RAW:", e);
      console.log("[Auth] login() error details:", {
        code: e && e.code,
        name: e && e.name,
        message: e && e.message,
        stack: e && e.stack,
        native: JSON.stringify(e),
      });
      return { success: false, msg: (e && e.code) || (e && e.message) };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth); //  real Firebase sign-out; onAuthStateChanged will flip to false/null
    } catch (e) {
      console.log("[Auth] signOut error:", e?.code || e?.message);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be wrapped inside AuthContextProvider");
  return value;
};
