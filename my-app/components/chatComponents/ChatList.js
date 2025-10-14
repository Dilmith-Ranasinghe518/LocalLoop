import React, { useMemo } from "react";
import { View, FlatList, StyleSheet, Text } from "react-native";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import ChatItem from "./ChatItem";
import { useRouter } from "expo-router";
import { useAuth  } from "../../context/authContext"; // ✅ import user context

export default function ChatList({ users = [] }) {
  const router = useRouter();
  const { user } = useAuth(); // ✅ get current user

  if (!ChatItem) {
    console.error("❌ ChatItem component not found. Check import path!");
    return (
      <Text style={{ textAlign: "center", marginTop: 40 }}>
        Chat component missing.
      </Text>
    );
  }

  // ✅ Sort chats by latest message timestamp
const sortedUsers = useMemo(() => {
  const validUsers = users.filter((u) => u && (u.userId || u.roomId));

  return validUsers.sort((a, b) => {
    const aTime =
      a?.lastTime?.toDate?.() ||
      (a?.lastTime?.seconds
        ? new Date(a.lastTime.seconds * 1000)
        : new Date(a?.lastTime || 0));
    const bTime =
      b?.lastTime?.toDate?.() ||
      (b?.lastTime?.seconds
        ? new Date(b.lastTime.seconds * 1000)
        : new Date(b?.lastTime || 0));
    return bTime - aTime; // ✅ newest first
  });
}, [users]);


  // ✅ Key extractor
  const getKey = (item, index) => item.userId || item.roomId || `chat-${index}`;

  // 🧱 Render list
  return (
    <View style={styles.container}>
      {sortedUsers.length > 0 ? (
        <FlatList
          data={sortedUsers}
          keyExtractor={getKey}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <ChatItem
              router={router}
              item={{ ...item, currentUserId: user?.uid }} // ✅ pass userId
              noBorder={index + 1 === sortedUsers.length}
            />
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No chats yet — start a conversation!
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: hp(1),
    backgroundColor: "#ffffff",
  },
  listContent: {
    paddingBottom: hp(2),
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: hp(20),
  },
  emptyText: {
    fontSize: wp(4),
    color: "#888",
  },
});
