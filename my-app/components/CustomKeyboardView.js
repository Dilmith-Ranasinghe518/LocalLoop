import React, { useEffect, useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  ScrollView,
} from 'react-native';

const ios = Platform.OS === 'ios';

export default function CustomKeyboardView({ children, inChat = false }) {
  const [keyboardHeight] = useState(new Animated.Value(0));

  // ✅ Chat behavior (smooth animation, no float)
  useEffect(() => {
    if (!inChat) return;

    const showSub = Keyboard.addListener(
      ios ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        Animated.timing(keyboardHeight, {
          toValue: event.endCoordinates.height,
          duration: ios ? event.duration : 120,
          useNativeDriver: false,
        }).start();
      }
    );

    const hideSub = Keyboard.addListener(
      ios ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        Animated.timing(keyboardHeight, {
          toValue: 0,
          duration: ios ? 180 : 100,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [inChat]);

  // ✅ FORM (SignIn / SignUp) configs
  let kavConfig = {};
  let scrollConfig = {};

  if (!inChat) {
    kavConfig = { behavior: ios ? 'padding' : 'height', keyboardVerticalOffset: 0 };
    scrollConfig = { contentContainerStyle: { flexGrow: 1 }, bounces: false };
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={inChat ? (ios ? 'padding' : undefined) : kavConfig.behavior}
      keyboardVerticalOffset={inChat ? 0 : kavConfig.keyboardVerticalOffset}
    >
      {inChat ? (
        // ✅ Chat layout (with animation)
        <Animated.View style={{ flex: 1, marginBottom: keyboardHeight }}>
          {children}
        </Animated.View>
      ) : (
        // ✅ Form layout (scrollable)
        <ScrollView
          showsVerticalScrollIndicator={false}
          {...scrollConfig}
        >
          <View style={{ flex: 1 }}>{children}</View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

