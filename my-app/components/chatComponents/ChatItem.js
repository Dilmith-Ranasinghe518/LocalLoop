import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { useAuth } from "../../context/authContext";

export default function ChatItem({ item, router, noBorder }) {
  const { user } = useAuth();

  // 🟢 Detect if group chat
  const isGroup = item?.isGroup === true || item?.type === "eventGroup";

  // 🟢 Display name & image
  const displayName = isGroup
    ? item?.name || item?.eventTitle || "Event Group"
    : item?.name;
  const displayImage =
    item?.photoURL || item?.eventImage || "https://i.pravatar.cc/150?img=3";

  // 🟢 Navigate to the right chat screen
  const handlePress = () => {
    if (isGroup) {
      router.push({
        pathname: "/(app)/chatRoom",
        params: {
          type: "eventGroup",
          roomId: item.roomId,
          eventTitle: displayName,
          eventImage: displayImage,
        },
      });
    } else {
      router.push({
        pathname: "/(app)/chatRoom",
        params: {
          userId: item.userId,
          name: displayName,
          photoURL: displayImage,
        },
      });
    }
  };

  // 🕒 Combined formatter (Firestore safe + relative time)
  const formatRelativeTime = (t) => {
    if (!t) return "";

    // ✅ Normalize Firestore timestamp / JS date / string
    const d =
      t?.toDate?.() ||
      (t?.seconds ? new Date(t.seconds * 1000) : new Date(t));

    if (!d || isNaN(d)) return "";

    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";

    // For older messages — short date (e.g. Oct 11)
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // 🧩 preview builder
  const getPreview = () => {
    const msg = item?.lastMessage || "";
    const type = item?.lastMessageType || "text";
    const lastSenderId = item?.lastSenderId;
    const lastTime = item?.lastTime;
    const lastSender = item?.lastSender ;

    // ✅ who sent last message
    // const senderLabel =
    //   item?.lastSender === "You"
    //     ? "You"
    //     : user?.uid || item?.name || "Salesperson";




  //  const senderLabel =
  // item?.lastSenderId === user?.uid
  //   ? "You"
  //   : item?.lastSender || item?.name || "Salesperson";

      
  let sender_Label = "Salesperson"; // default

if (item?.lastSender === "You") {
  sender_Label = "You";
} 
else{
  sender_Label = user?.uid ? (item?.lastSender || item?.name || "Salesperson") : "Salesperson";
}
const senderLabel = sender_Label;


    // ✅ message type
    let preview = msg;
    if (type === "image") preview = "📷 Photo";
    else if (type === "audio") preview = "🎤 Voice Note";
    else if (type === "location") preview = "📍 Location";
    else if (!msg) preview = "No messages yet";

    return ` ${preview}`;
  };

  return (
    <TouchableOpacity
      style={[styles.itemContainer, noBorder && { borderBottomWidth: 0 }]}
      onPress={handlePress}
    >
      {/* Avatar */}
      <Image source={{ uri: displayImage }} style={styles.avatar} />

      {/* Text section */}
      <View style={styles.textBlock}>
        <View style={styles.nameRow}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.name}>{displayName}</Text>
            {!isGroup && item?.isVerified && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color="#3b82f6"
                style={{ marginLeft: 5 }}
              />
            )}
          </View>

          {/* ✅ Time fixed */}
        <Text style={styles.time}>
  {item?.lastTime
    ? new Date(item.lastTime.seconds
        ? item.lastTime.seconds * 1000
        : item.lastTime
      ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : ""}
</Text>



        </View>

        <Text style={styles.message} numberOfLines={1} ellipsizeMode="tail">
          {getPreview()}
        </Text>
      </View>

      {/* 🔔 Unread badge */}
      {item?.unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {item.unreadCount > 99 ? "99+" : item.unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: wp(3),
    paddingHorizontal: wp(4),
    borderBottomWidth: 0.8,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  avatar: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    marginRight: wp(4),
  },
  textBlock: { flex: 1 },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  name: {
    fontSize: wp(4),
    fontWeight: "600",
    color: "#0f080bff",
  },
  time: {
    fontSize: hp(1.6),
    fontWeight: "500",
    color: "#737373",
  },
  message: {
    fontSize: wp(3.6),
    color: "#555",
    marginTop: 2,
  },
  badge: {
    backgroundColor: "#d8436b",
    minWidth: wp(5.5),
    height: wp(5.5),
    borderRadius: wp(3),
    alignItems: "center",
    justifyContent: "center",
    marginLeft: wp(2),
    paddingHorizontal: wp(1.2),
  },
  badgeText: {
    color: "#fff",
    fontSize: wp(3),
    fontWeight: "600",
  },
});
