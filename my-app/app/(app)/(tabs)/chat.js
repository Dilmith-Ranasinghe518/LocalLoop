import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  Text,
} from "react-native";
import ChatList from "../../../components/chatComponents/ChatList";
import { useAuth } from "../../../context/authContext";
import { db } from "../../../firebaseConfig";
import { getRoomId } from "../../../utils/common";
import { DeviceEventEmitter } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Chat() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUserById = async (uid) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) return snap.data();
    } catch (e) {
      console.warn("fetchUserById error:", e?.message);
    }
    return null;
  };

  const listenForGroupLastMessages = () => {
    const qGroups = query(
      collection(db, "rooms"),
      where("members", "array-contains", user.uid)
    );

    const unsub = onSnapshot(qGroups, async (snapshot) => {
      const updatedGroups = await Promise.all(
        snapshot.docs.map(async (d) => {
          const data = d.data();
          const messagesRef = collection(db, "rooms", d.id, "messages");
          const lastRead =
            data?.lastRead?.[user.uid]?.seconds ||
            data?.lastRead?.[user.uid]?.toMillis?.() / 1000 ||
            0;

          const msgSnap = await getDocs(query(messagesRef, orderBy("createdAt", "desc")));
          const unreadCount = msgSnap.docs.filter(
            (m) =>
              m.data()?.userId !== user.uid &&
              m.data()?.createdAt?.seconds > lastRead
          ).length;

          return {
            roomId: d.id,
            ...data,
            isGroup: true,
            name: data.eventTitle || "Event Group",
            photoURL:
              data.eventImage ||
              "https://cdn-icons-png.flaticon.com/512/2622/2622343.png",
            lastMessage: data.lastMessage || "📣 Event Announcement",
            lastTime: data.lastTime?.seconds
              ? new Date(data.lastTime.seconds * 1000)
              : new Date(),
            unreadCount,
          };
        })
      );

      setUsers((prev) => {
        const privates = prev.filter((p) => !p.isGroup);
        const all = [...updatedGroups, ...privates].sort(
          (a, b) => new Date(b.lastTime) - new Date(a.lastTime)
        );
        return all;
      });
    });

    return unsub;
  };

  const listenForLastMessages = (userList) => {
    const unsubscribers = [];

    userList.forEach((chatUser) => {
      const roomId = getRoomId(user.uid, chatUser.userId);
      const messagesRef = collection(db, "rooms", roomId, "messages");
      const q = query(messagesRef, orderBy("createdAt", "desc"), limit(1));

      const unsubMsg = onSnapshot(q, async (snapshot) => {
        if (!snapshot.empty) {
          const msg = snapshot.docs[0].data();

          let unreadCount = 0;
          try {
            const roomDoc = await getDoc(doc(db, "rooms", roomId));
            let lastRead = 0;
            if (roomDoc.exists()) {
              const data = roomDoc.data();
              lastRead =
                data?.lastRead?.[user.uid]?.seconds ||
                data?.lastRead?.[user.uid]?.toMillis?.() / 1000 ||
                0;
            }

            const allSnap = await getDocs(
              query(messagesRef, orderBy("createdAt", "desc"))
            );
            unreadCount = allSnap.docs.filter(
              (d) =>
                d.data()?.userId !== user.uid &&
                d.data()?.createdAt?.seconds > lastRead
            ).length;
          } catch (err) {
            console.warn("Unread count error:", err.message);
          }

          setUsers((prev) => {
            let updated = prev.map((item) =>
              item.userId === chatUser.userId
                ? {
                    ...item,
                    lastMessage:
                      msg.text ||
                      (msg.type === "image"
                        ? "📷 Photo"
                        : msg.type === "audio"
                        ? "🎤 Voice Note"
                        : msg.type === "location"
                        ? "📍 Location"
                        : "Message"),
                    lastTime:
                      msg.createdAt?.toDate?.() ||
                      (msg.createdAt?.seconds
                        ? new Date(msg.createdAt.seconds * 1000)
                        : new Date()),
                    unreadCount,
                    isVerified: chatUser.isVerified || false,
                  }
                : item
            );
            return updated.sort(
              (a, b) => new Date(b.lastTime) - new Date(a.lastTime)
            );
          });
        }
      });
      unsubscribers.push(unsubMsg);
    });

    return () => unsubscribers.forEach((u) => u());
  };

  useEffect(() => {
    if (!user?.uid) return;

    const fetchChatsAndGroups = async () => {
      try {
        setLoading(true);
        const counterpartIds = new Set();

        const buyerSnap = await getDocs(
          query(collection(db, "orders"), where("buyerId", "==", user.uid))
        );
        buyerSnap.forEach((d) => {
          const sid = d.data()?.sellerId;
          if (sid && sid !== user.uid) counterpartIds.add(sid);
        });

        const sellerSnap = await getDocs(
          query(collection(db, "orders"), where("sellerId", "==", user.uid))
        );
        sellerSnap.forEach((d) => {
          const bid = d.data()?.buyerId;
          if (bid && bid !== user.uid) counterpartIds.add(bid);
        });

        const relatedUsers = [];
        for (const uid of counterpartIds) {
          const u = await fetchUserById(uid);
          if (u?.userId) {
            relatedUsers.push({
              ...u,
              isGroup: false,
              lastMessage: "Start chatting...",
              lastTime: null,
              unreadCount: 0,
            });
          }
        }

        setUsers(relatedUsers);
        const unsubGroups = listenForGroupLastMessages();
        const unsubDirects = listenForLastMessages(relatedUsers);

        // 🔄 refresh when chat marked as read (native event)
        const refresh = () => fetchChatsAndGroups();
        const subscription = DeviceEventEmitter.addListener("chat-read-update", refresh);

        setLoading(false);

        return () => {
          unsubGroups && unsubGroups();
          unsubDirects && unsubDirects();
          subscription.remove();
        };
      } catch (err) {
        console.error("🔥 Error fetching chats:", err);
        setUsers([]);
        setLoading(false);
      }
    };

    fetchChatsAndGroups();
  }, [user?.uid]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Messages",
      headerStyle: {
        backgroundColor: "#d8436b",
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: "#fff",
      headerTitleStyle: {
        fontWeight: "700",
        fontSize: 20,
      },
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          <TouchableOpacity
            style={styles.headerProfileButton}
            onPress={() => navigation.navigate("profile")}
          >
            <Image
              source={{
                uri: user?.photoURL || "https://i.pravatar.cc/150?img=3",
              }}
              style={styles.headerProfileImage}
            />
            <View style={styles.headerOnlineIndicator} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, user]);

  return (
    <>
      <StatusBar style="light" />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCircle}>
              <ActivityIndicator size="large" color="#d8436b" />
            </View>
            <Text style={styles.loadingText}>Loading chats...</Text>
          </View>
        ) : (
          <ChatList users={users} />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 8,
  },
  headerRightContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 15,
  },
  headerProfileButton: {
    position: "relative",
  },
  headerProfileImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "#fff",
  },
  headerOnlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#d8436b",
  },
});
