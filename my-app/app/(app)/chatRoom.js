import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  FlatList,
  Modal,
  Linking,
  Pressable,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomKeyboardView from "../../components/CustomKeyboardView";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import { getRoomId } from "../../utils/common";
import { useAuth } from "../../context/authContext";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { DeviceEventEmitter } from "react-native";

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  collection,
  addDoc,
  limit,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db, storage } from "../../firebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ActionSheet from "react-native-actionsheet";

export default function ChatRoom() {
  const item = useLocalSearchParams();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editText, setEditText] = useState("");
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [fullImage, setFullImage] = useState(null);
  const recordingRef = useRef(null);
  const [soundObj, setSoundObj] = useState(null);
  const [playingId, setPlayingId] = useState(null);
  const flatListRef = useRef(null);
  const actionSheetRef = useRef();
  const messageActionSheetRef = useRef();
  const insets = useSafeAreaInsets();
  const textRef = useRef("");
  const isGroupChat = item?.type === "eventGroup";
  const roomId = isGroupChat ? item?.roomId : getRoomId(user?.uid, item?.userId);

  const selectedMessageRef = useRef(null);

  // ✅ Mark chat as read instantly
 const markRoomAsRead = async () => {
  try {
    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, { [`lastRead.${user?.uid}`]: Timestamp.now() });

    //  Trigger unread refresh event
    DeviceEventEmitter.emit("chat-read-update");
  } catch (err) {
    console.warn("⚠️ Could not mark as read:", err.message);
  }
};


  //  Subscribe to messages
  useEffect(() => {
    if (!roomId) return;
    if (!isGroupChat) createRoomIfNotExists();

    const messagesRef = collection(db, "rooms", roomId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(all);
      markRoomAsRead();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);
    });
    return unsub;
  }, [roomId]);

  const createRoomIfNotExists = async () => {
    const roomRef = doc(db, "rooms", roomId);
    const snap = await getDoc(roomRef);
    if (!snap.exists())
      await setDoc(roomRef, { roomId, createdAt: serverTimestamp() });
  };

  //  Send text
  const handleSendMessage = async () => {
    const text = textRef.current.trim();
    if (!text) return;
    await addDoc(collection(db, "rooms", roomId, "messages"), {
      type: "text",
      text,
      userId: user.uid,
      senderName: user.displayName || user.name || "Unknown",
      profileUrl: user.photoURL || "https://i.pravatar.cc/150?img=3",
      createdAt: serverTimestamp(),
    });
    await updateRoomMeta(text, "text");
    await markRoomAsRead();
    setMessage("");
    textRef.current = "";
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
  };

  //  Camera capture
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission denied", "Camera access is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.length > 0) {
      await sendImageToChat(result.assets[0].uri);
    }
  };

  //  Pick image
  const sendImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      await sendImageToChat(result.assets[0].uri);
    }
  };

  // ⬆ Upload helper
  const sendImageToChat = async (uri) => {
    const blob = await (await fetch(uri)).blob();
    const filename = `${Date.now()}_${user.uid}.jpg`;
    const storageRef = ref(storage, `chat_images/${roomId}/${filename}`);
    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);
    await addDoc(collection(db, "rooms", roomId, "messages"), {
      type: "image",
      imageUrl: url,
      userId: user.uid,
      senderName: user.displayName || "Unknown",
      createdAt: serverTimestamp(),
    });
    await updateRoomMeta("📷 Photo", "image");
    await markRoomAsRead();
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 200);
  };

  // 📍 Send location
  const sendLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission denied");
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    await addDoc(collection(db, "rooms", roomId, "messages"), {
      type: "location",
      latitude,
      longitude,
      userId: user.uid,
      senderName: user.displayName || "Unknown",
      createdAt: serverTimestamp(),
    });
    await updateRoomMeta("📍 Location", "location");
    await markRoomAsRead();
  };

  //  Record/send voice (iOS fixed)
//  Record & send voice note (works on latest iOS + Android)
const sendVoiceNote = async () => {
  try {
    if (!isRecording) {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Microphone access is required.");
        return;
      }

      //  Correct audio mode setup (Expo SDK 51+)
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1, // DO_NOT_MIX (integer value)
        interruptionModeAndroid: 1, // DO_NOT_MIX
        shouldDuckAndroid: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      return;
    }

    // 🔴 Stop and upload
    const rec = recordingRef.current;
    if (!rec) return;

    await rec.stopAndUnloadAsync();

    // ✅ Restore playback mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: 1,
      interruptionModeAndroid: 1,
    });

    const uri = rec.getURI();
    recordingRef.current = null;
    setIsRecording(false);

    // 📤 Upload to Firebase Storage
    const blob = await (await fetch(uri)).blob();
    const filename = `${Date.now()}_${user.uid}.m4a`;
    const storageRef = ref(storage, `chat_audio/${roomId}/${filename}`);
    await uploadBytes(storageRef, blob);
    const url = await getDownloadURL(storageRef);

    await addDoc(collection(db, "rooms", roomId, "messages"), {
      type: "audio",
      audioUrl: url,
      userId: user.uid,
      senderName: user.displayName || "Unknown",
      createdAt: serverTimestamp(),
    });
    await updateRoomMeta("🎤 Voice Note", "audio");
    await markRoomAsRead();
  } catch (err) {
    console.error("🎤 Voice note error:", err);
    Alert.alert("Voice note error", err.message);
    setIsRecording(false);
  }
};


  const playAudio = async (msg) => {
    try {
      if (playingId === msg.id) {
        await soundObj?.stopAsync();
        setPlayingId(null);
        return;
      }
      if (soundObj) await soundObj.unloadAsync();

      const { sound } = await Audio.Sound.createAsync({ uri: msg.audioUrl });
      setSoundObj(sound);
      setPlayingId(msg.id);
      sound.setOnPlaybackStatusUpdate((s) => s.didJustFinish && setPlayingId(null));
      await sound.playAsync();
    } catch (err) {
      Alert.alert("Playback failed", err.message);
    }
  };

  const updateRoomMeta = async (text, type = "text") => {
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        lastMessage: text,
        lastMessageType: type,
        lastSender: user.displayName || "You",
        lastSenderId: user.uid,
        lastTime: new Date(),
      });
    } catch (err) {
      console.warn("Meta update failed:", err.message);
    }
  };

const handleLongPress = (msg) => {
  if (msg.userId !== user.uid) return;
  selectedMessageRef.current = msg; // store instantly
  setSelectedMessage(msg);
  actionSheetRef.current?.show();
};


  const onActionSheetPress = async (index) => {
  const msg = selectedMessageRef.current;
  if (!msg) return;

  if (index === 0) {
    setEditText(msg.text || "");
    setEditModalVisible(true);
  } else if (index === 1) {
    try {
      await deleteDoc(doc(db, "rooms", roomId, "messages", msg.id));
    } catch (err) {
      console.warn("Delete failed:", err.message);
    }
  }
};


  const saveEdit = async () => {
    if (!editText.trim()) return;
    await updateDoc(doc(db, "rooms", roomId, "messages", selectedMessage.id), {
      text: editText.trim(),
      edited: true,
    });
    setEditModalVisible(false);
  };

  const renderMessage = ({ item }) => {
    const isOwn = item.userId === user.uid;
    const bubbleStyle = [
      styles.messageBubble,
      isOwn ? styles.ownBubble : styles.otherBubble,
    ];
    const textStyle = [styles.messageText, isOwn ? styles.ownText : styles.otherText];
    const time =
      item?.createdAt?.seconds &&
      new Date(item.createdAt.seconds * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

    return (
      <View
        style={[styles.messageRow, isOwn ? styles.ownMessageRow : styles.otherMessageRow]}
      >
        <TouchableOpacity onLongPress={() => handleLongPress(item)} activeOpacity={0.9}>
          <View style={bubbleStyle}>
            {item.type === "text" && (
              <>
                <Text style={textStyle}>{item.text}</Text>
                {!!item.edited && (
                  <Text style={styles.editedLabel}>
                    (edited)
                  </Text>
                )}
              </>
            )}
            {item.type === "image" && (
              <Pressable onPress={() => setFullImage(item.imageUrl)}>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.messageImage}
                />
              </Pressable>
            )}
            {item.type === "audio" && (
              <TouchableOpacity style={styles.audioRow} onPress={() => playAudio(item)}>
                <View style={[styles.audioIconBg, isOwn && styles.audioIconBgOwn]}>
                  <Ionicons
                    name={playingId === item.id ? "pause" : "play"}
                    size={24}
                    color="#fff"
                  />
                </View>
                <View style={styles.audioWaveform}>
                  {[...Array(18)].map((_, i) => (
                    <View 
                      key={i} 
                      style={[
                        styles.wavBar,
                        { height: Math.random() * 16 + 8 },
                        isOwn ? styles.wavBarOwn : styles.wavBarOther
                      ]} 
                    />
                  ))}
                </View>
                <Text style={[textStyle, styles.audioLabel]}>
                  {playingId === item.id ? "Playing" : "0:23"}
                </Text>
              </TouchableOpacity>
            )}
            {item.type === "location" && (
              <TouchableOpacity
                style={styles.locationContainer}
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`
                  )
                }
              >
                <View style={styles.locationIconBg}>
                  <Ionicons name="location" size={20} color="#d8436b" />
                </View>
                <View style={styles.locationTextWrap}>
                  <Text style={[textStyle, styles.locationTitle]}>Location Shared</Text>
                  <Text style={styles.locationSubtext}>Tap to view in maps</Text>
                </View>
              </TouchableOpacity>
            )}
            {!!time && (
              <Text style={[styles.timeText, isOwn ? styles.ownTime : styles.otherTime]}>
                {time}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{ 
          headerBackTitle: "Back",
          headerShown: true,
          headerStyle: {
            backgroundColor: "#d8436b",
          },
          headerTintColor: "#fff",
          headerShadowVisible: false,
          headerTitle: () => (
            <View style={styles.headerContainer}>
              <View style={styles.headerImageContainer}>
                <Image
                  source={{
                    uri:
                      item?.photoURL || item?.eventImage || "https://i.pravatar.cc/150?img=3",
                  }}
                  style={styles.headerImage}
                />
                <View style={styles.onlineIndicator} />
              </View>
              <View>
                <Text style={styles.headerName}>
                  {isGroupChat ? item?.eventTitle || "Event Group" : item?.name || "User"}
                </Text>
                <Text style={styles.headerStatus}>
                  {isGroupChat ? "Group chat" : "Active now"}
                </Text>
              </View>
            </View>
          ),
        }}
      />

      <CustomKeyboardView inChat>
        <View style={styles.chatBody}>
          {messages.length ? (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderMessage}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
            />
          ) : (
            <View style={styles.emptyStateContainer}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="chatbubbles-outline" size={48} color="#d8436b" />
              </View>
              <Text style={styles.emptyStateText}>Start the conversation</Text>
              <Text style={styles.emptyStateSubtext}>Send a message to get started</Text>
            </View>
          )}
        </View>

        <View style={[styles.bottomWrapper, { paddingBottom: insets.bottom + hp(1.2) }]}>
          {/* Media buttons row */}
          <View style={styles.mediaButtonsRow}>
            <TouchableOpacity style={[styles.mediaButton, styles.cameraButton]} onPress={takePhoto}>
              <Ionicons name="camera" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mediaButton, styles.galleryButton]} onPress={sendImage}>
              <Ionicons name="image" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mediaButton, styles.locationButton]} onPress={sendLocation}>
              <Ionicons name="location" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.mediaButton, styles.voiceButtonTop, isRecording && styles.recordingButton]} 
              onPress={sendVoiceNote}
            >
              <Ionicons
                name={isRecording ? "stop-circle" : "mic"}
                size={22}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* Input and send button */}
          <View style={styles.inputActionRow}>
            <View style={styles.inputContainer}>
              <TextInput
                onChangeText={(v) => {
                  textRef.current = v;
                  setMessage(v);
                }}
                placeholder="Type a message..."
                placeholderTextColor="#9CA3AF"
                value={message}
                style={styles.input}
                multiline
              />
            </View>

            <TouchableOpacity 
              onPress={handleSendMessage} 
              style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
              disabled={!message.trim()}
            >
              <Ionicons name="send" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </CustomKeyboardView>

      {/* Full image viewer */}
      <Modal visible={!!fullImage} transparent animationType="fade">
        <Pressable style={styles.fullImgBg} onPress={() => setFullImage(null)}>
          <TouchableOpacity style={styles.closeFullImageBtn} onPress={() => setFullImage(null)}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: fullImage }} style={styles.fullImg} resizeMode="contain" />
        </Pressable>
      </Modal>

      {/* Edit modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Message</Text>
            <TextInput 
              value={editText} 
              onChangeText={setEditText} 
              style={styles.editInput}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={saveEdit}
              >
                <Text style={styles.modalButtonPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ActionSheet
        ref={actionSheetRef}
        options={["Edit", "Delete", "Cancel"]}
        cancelButtonIndex={2}
        destructiveButtonIndex={1}
        onPress={onActionSheetPress}
      />
    </>
  );
}

const styles = StyleSheet.create({
  chatBody: { 
    flex: 1, 
    backgroundColor: "#F9FAFB",
  },
  messageList: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: wp(8),
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyStateText: { 
    fontSize: wp(4.5), 
    fontWeight: "700", 
    color: "#111827",
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: wp(3.5),
    color: "#6B7280",
  },
  headerContainer: { 
    flexDirection: "row", 
    alignItems: "center",
  },
  headerImageContainer: {
    position: "relative",
    marginRight: wp(3),
  },
  headerImage: { 
    width: wp(10), 
    height: wp(10), 
    borderRadius: wp(5),
    borderWidth: 2,
    borderColor: "#fff",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: wp(3),
    height: wp(3),
    borderRadius: wp(1.5),
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#fff",
  },
  headerName: { 
    fontSize: wp(4.2), 
    fontWeight: "700", 
    color: "#fff",
  },
  headerStatus: {
    fontSize: wp(3.2),
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  bottomWrapper: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: wp(3.5),
    paddingTop: hp(1.5),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  mediaButtonsRow: {
    flexDirection: "row",
    gap: wp(2.5),
    marginBottom: hp(1.3),
    paddingHorizontal: wp(1),
  },
  mediaButton: {
    width: wp(12.5),
    height: wp(12.5),
    borderRadius: wp(6.25),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  cameraButton: {
    backgroundColor: "#F4D5A6",
  },
  galleryButton: {
    backgroundColor: "#A5D6A7",
  },
  locationButton: {
    backgroundColor: "#90CAF9",
  },
  voiceButtonTop: {
    backgroundColor: "#CE93D8",
  },
  recordingButton: {
    backgroundColor: "#EF9A9A",
  },
  inputActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2.5),
  },
  inputContainer: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 28,
    paddingHorizontal: wp(4.5),
    paddingVertical: Platform.OS === "ios" ? hp(1.5) : hp(1.3),
    minHeight: 54,
    justifyContent: "center",
  },
  input: { 
    fontSize: wp(4.2), 
    color: "#111827",
    maxHeight: 120,
    lineHeight: wp(5.5),
  },
  sendButton: {
    backgroundColor: "#d8436b",
    width: wp(13),
    height: wp(13),
    borderRadius: wp(6.5),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#d8436b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0.1,
  },
  messageRow: { 
    marginVertical: hp(0.5), 
    maxWidth: "80%",
  },
  ownMessageRow: { 
    alignSelf: "flex-end",
  },
  otherMessageRow: { 
    alignSelf: "flex-start",
  },
  messageBubble: {
    borderRadius: 20,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    maxWidth: wp(75),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  ownBubble: { 
    backgroundColor: "#d8436b",
    borderBottomRightRadius: 4,
  },
  otherBubble: { 
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
  },
  messageText: { 
    fontSize: wp(4), 
    lineHeight: wp(5.5),
  },
  ownText: { 
    color: "#fff",
  },
  otherText: { 
    color: "#111827",
  },
  editedLabel: {
    fontSize: wp(3),
    color: "rgba(255,255,255,0.6)",
    marginTop: hp(0.5),
    fontStyle: "italic",
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  audioRow: { 
    flexDirection: "row", 
    alignItems: "center",
    minWidth: 180,
  },
  audioIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#d8436b",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#d8436b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  audioIconBgOwn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    shadowColor: "#000",
    shadowOpacity: 0.1,
  },
  audioWaveform: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 10,
    height: 24,
  },
  wavBar: {
    width: 2,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 1,
  },
  wavBarOwn: {
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  wavBarOther: {
    backgroundColor: "#d8436b",
  },
  audioLabel: {
    fontSize: wp(3.5),
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 200,
  },
  locationIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  locationTextWrap: {
    flex: 1,
  },
  locationTitle: {
    fontWeight: "600",
    marginBottom: 2,
  },
  locationSubtext: {
    fontSize: wp(3.2),
    color: "#6B7280",
  },
  timeText: { 
    fontSize: wp(3), 
    marginTop: hp(0.6), 
    alignSelf: "flex-end",
  },
  ownTime: { 
    color: "rgba(255,255,255,0.7)",
  },
  otherTime: { 
    color: "#9CA3AF",
  },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: wp(85),
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: wp(4.5),
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: wp(4),
    color: "#111827",
    minHeight: 80,
    textAlignVertical: "top",
    backgroundColor: "#F9FAFB",
  },
  modalActions: {
    flexDirection: "row",
    marginTop: 20,
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  modalButtonSecondaryText: {
    fontSize: wp(4),
    fontWeight: "600",
    color: "#6B7280",
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#d8436b",
    alignItems: "center",
    shadowColor: "#d8436b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonPrimaryText: {
    fontSize: wp(4),
    fontWeight: "700",
    color: "#fff",
  },
  fullImgBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeFullImageBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  fullImg: {
    width: "100%",
    height: "100%",
  },
});