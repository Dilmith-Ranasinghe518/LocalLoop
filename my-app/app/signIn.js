// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   Image,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   Pressable,
//   Alert,
// } from 'react-native';
// import {
//   widthPercentageToDP as wp,
//   heightPercentageToDP as hp,
// } from 'react-native-responsive-screen';
// import { StatusBar } from 'expo-status-bar';
// import { Octicons } from '@expo/vector-icons';
// import { useRouter } from 'expo-router';
// import CustomKeyboardView from '../components/CustomKeyboardView';
// import { useAuth } from '../context/authContext';
// import { sendPasswordResetEmail } from 'firebase/auth';
// import { auth } from '../firebaseConfig';

// export default function SignIn() {
//   const router = useRouter();
//   const { login } = useAuth();

//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');

//   // 🔐 Handle login
//   const handleLogin = async () => {
//     if (!email || !password) {
//       Alert.alert('Sign In', 'Please fill all the fields!');
//       return;
//     }
//     const res = await login(email.trim().toLowerCase(), password);
//     if (!res.success) {
//       Alert.alert('Sign In', String(res.msg));
//       return;
//     }
//     router.replace('/home'); // go to your Home tab
//   };

//   // 🔁 Forgot password (send reset link)
//   const handleForgotPassword = async () => {
//     if (!email.trim()) {
//       Alert.alert('Forgot Password', 'Please enter your email address first.');
//       return;
//     }
//     try {
//       await sendPasswordResetEmail(auth, email.trim().toLowerCase());
//       Alert.alert(
//         'Password Reset',
//         'We sent a password reset link to your email. Check your inbox.'
//       );
//     } catch (error) {
//       Alert.alert('Error', error.message);
//     }
//   };

//   return (
//     <CustomKeyboardView>
//       <StatusBar style="dark" />
//       <View style={styles.innerContainer}>
//         {/* 🖼️ Illustration */}
//         <View style={styles.imageContainer}>
//           <Image
//             style={styles.image}
//             resizeMode="contain"
//             source={require('../assets/images/login.png')}
//           />
//         </View>

//         {/* 🔑 Form */}
//         <View style={styles.textContainer}>
//           <Text style={styles.signInText}>Sign In</Text>

//           {/* Email */}
//           <View style={styles.inputContainer}>
//             <Octicons name="mail" size={hp(2.7)} color="gray" />
//             <TextInput
//               value={email}
//               onChangeText={setEmail}
//               style={styles.input}
//               placeholder="Email address"
//               placeholderTextColor="gray"
//               autoCapitalize="none"
//               keyboardType="email-address"
//             />
//           </View>

//           {/* Password */}
//           <View style={styles.inputContainer}>
//             <Octicons name="lock" size={hp(2.7)} color="gray" />
//             <TextInput
//               value={password}
//               onChangeText={setPassword}
//               style={styles.input}
//               placeholder="Password"
//               secureTextEntry
//               placeholderTextColor="gray"
//             />
//           </View>

//           {/* Forgot Password */}
//           <Pressable onPress={handleForgotPassword}>
//             <Text
//               style={[
//                 styles.forgotPasswordText,
//                 { color: email.trim() ? '#9E9E9E' : '#C0C0C0' },
//               ]}
//             >
//               Forgot password?
//             </Text>
//           </Pressable>

//           {/* Sign In Button */}
//           <TouchableOpacity onPress={handleLogin} style={styles.submitButton}>
//             <Text style={styles.submitButtonText}>Sign In</Text>
//           </TouchableOpacity>

//           {/* Sign Up Link */}
//           <View style={styles.signUpContainer}>
//             <Text style={styles.signUpText}>Don't have an account? </Text>
//             <Pressable onPress={() => router.push('signUp')}>
//               <Text style={styles.signUpLink}>Sign Up</Text>
//             </Pressable>
//           </View>
//         </View>
//       </View>
//     </CustomKeyboardView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },
//   innerContainer: {
//     flex: 1,
//     paddingTop: hp(8),
//     paddingHorizontal: wp(5),
//     gap: 12,
//   },
//   imageContainer: { alignItems: 'center', width: wp() },
//   image: { height: hp(25), width: wp(100) },
//   textContainer: { gap: 10 },
//   signInText: {
//     fontSize: hp(4),
//     fontWeight: 'bold',
//     letterSpacing: 1.5,
//     textAlign: 'center',
//     color: '#333',
//   },
//   inputContainer: {
//     height: hp(7),
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#f1f1f1',
//     borderRadius: 24,
//     marginBottom: hp(2),
//     paddingHorizontal: 12,
//   },
//   input: {
//     flex: 1,
//     fontSize: hp(2),
//     fontWeight: '600',
//     color: '#4B4B4B',
//   },
//   forgotPasswordText: {
//     fontSize: hp(1.8),
//     fontWeight: '600',
//     textAlign: 'right',
//     marginBottom: hp(2),
//   },
//   submitButton: {
//     height: hp(6.5),
//     backgroundColor: '#c95278ff',
//     borderRadius: 24,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: hp(3),
//   },
//   submitButtonText: {
//     fontSize: hp(2.7),
//     color: '#fff',
//     fontWeight: '700',
//     letterSpacing: 1.5,
//   },
//   signUpContainer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   signUpText: {
//     fontSize: hp(1.8),
//     fontWeight: '600',
//     color: '#9E9E9E',
//   },
//   signUpLink: {
//     fontSize: hp(1.8),
//     fontWeight: '700',
//     color: '#ab3f61ff',
//   },
// });


// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   Image,
//   StyleSheet,
//   TextInput,
//   TouchableOpacity,
//   Pressable,
//   Alert,
// } from 'react-native';
// import {
//   widthPercentageToDP as wp,
//   heightPercentageToDP as hp,
// } from 'react-native-responsive-screen';
// import { StatusBar } from 'expo-status-bar';
// import { Octicons } from '@expo/vector-icons';
// import { useRouter } from 'expo-router';
// import CustomKeyboardView from '../components/CustomKeyboardView';
// import { useAuth } from '../context/authContext';
// import { sendPasswordResetEmail } from 'firebase/auth';
// import { auth } from '../firebaseConfig';

// export default function SignIn() {
//   const router = useRouter();
//   const { login } = useAuth();

//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');

//   // 🔐 Handle login
//   const handleLogin = async () => {
//     if (!email || !password) {
//       Alert.alert('Sign In', 'Please fill all the fields!');
//       return;
//     }
//     const res = await login(email.trim().toLowerCase(), password);
//     if (!res.success) {
//       Alert.alert('Sign In', String(res.msg));
//       return;
//     }
//     router.replace('/home'); // go to your Home tab
//   };

//   // 🔁 Forgot password (send reset link)
//   const handleForgotPassword = async () => {
//     if (!email.trim()) {
//       Alert.alert('Forgot Password', 'Please enter your email address first.');
//       return;
//     }
//     try {
//       await sendPasswordResetEmail(auth, email.trim().toLowerCase());
//       Alert.alert(
//         'Password Reset',
//         'We sent a password reset link to your email. Check your inbox.'
//       );
//     } catch (error) {
//       Alert.alert('Error', error.message);
//     }
//   };

//   return (
//     <CustomKeyboardView>
//       <StatusBar style="dark" />
//       <View style={styles.container}>
//         {/* 🖼️ Top Background Image */}
//         <View style={styles.imageWrapper}>
//           <Image
//             source={require('../assets/images/login.png')}
//             style={styles.image}
//             resizeMode="cover"
//           />
//         </View>

//         {/* 🔑 Form Section */}
//         <View style={styles.formContainer}>
//           <Text style={styles.signInText}>Sign In</Text>

//           {/* Email */}
//           <View style={styles.inputContainer}>
//             <Octicons name="mail" size={hp(2.7)} color="gray" />
//             <TextInput
//               value={email}
//               onChangeText={setEmail}
//               style={styles.input}
//               placeholder="Email address"
//               placeholderTextColor="gray"
//               autoCapitalize="none"
//               keyboardType="email-address"
//             />
//           </View>

//           {/* Password */}
//           <View style={styles.inputContainer}>
//             <Octicons name="lock" size={hp(2.7)} color="gray" />
//             <TextInput
//               value={password}
//               onChangeText={setPassword}
//               style={styles.input}
//               placeholder="Password"
//               secureTextEntry
//               placeholderTextColor="gray"
//             />
//           </View>

//           {/* Forgot Password */}
//           <Pressable onPress={handleForgotPassword}>
//             <Text
//               style={[
//                 styles.forgotPasswordText,
//                 { color: email.trim() ? '#9E9E9E' : '#C0C0C0' },
//               ]}
//             >
//               Forgot password?
//             </Text>
//           </Pressable>

//           {/* Sign In Button */}
//           <TouchableOpacity onPress={handleLogin} style={styles.submitButton}>
//             <Text style={styles.submitButtonText}>Sign In</Text>
//           </TouchableOpacity>

//           {/* Sign Up Link */}
//           <View style={styles.signUpContainer}>
//             <Text style={styles.signUpText}>Don't have an account? </Text>
//             <Pressable onPress={() => router.push('signUp')}>
//               <Text style={styles.signUpLink}>Sign Up</Text>
//             </Pressable>
//           </View>
//         </View>
//       </View>
//     </CustomKeyboardView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#fff' },

//   // 🖼️ Fills top portion nicely
//   imageWrapper: {
//     width: '100%',
//     height: hp(30),
//     overflow: 'hidden',
//     borderBottomLeftRadius: 50,
//     borderBottomRightRadius: 50,
//     backgroundColor: '#d94f70',
//   },
//   image: {
//     width: '100%',
//     height: '100%',
//   },

//   formContainer: {
//     flex: 1,
//     paddingHorizontal: wp(5),
//     paddingTop: hp(5),
//     gap: 12,
//   },
//   signInText: {
//     fontSize: hp(4),
//     fontWeight: 'bold',
//     letterSpacing: 1.5,
//     textAlign: 'center',
//     color: '#333',
//     marginBottom: hp(2),
//   },
//   inputContainer: {
//     height: hp(7),
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#f1f1f1',
//     borderRadius: 24,
//     marginBottom: hp(2),
//     paddingHorizontal: 12,
//   },
//   input: {
//     flex: 1,
//     fontSize: hp(2),
//     fontWeight: '600',
//     color: '#4B4B4B',
//   },
//   forgotPasswordText: {
//     fontSize: hp(1.8),
//     fontWeight: '600',
//     textAlign: 'right',
//     marginBottom: hp(2),
//   },
//   submitButton: {
//     height: hp(6.5),
//     backgroundColor: '#c95278ff',
//     borderRadius: 24,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: hp(3),
//   },
//   submitButtonText: {
//     fontSize: hp(2.7),
//     color: '#fff',
//     fontWeight: '700',
//     letterSpacing: 1.5,
//   },
//   signUpContainer: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   signUpText: {
//     fontSize: hp(1.8),
//     fontWeight: '600',
//     color: '#9E9E9E',
//   },
//   signUpLink: {
//     fontSize: hp(1.8),
//     fontWeight: '700',
//     color: '#ab3f61ff',
//   },
// });


import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { StatusBar } from 'expo-status-bar';
import { Octicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import CustomKeyboardView from '../components/CustomKeyboardView';
import { useAuth } from '../context/authContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export default function SignIn() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);


  // 🔐 Handle login
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Sign In', 'Please fill all the fields!');
      return;
    }
    const res = await login(email.trim().toLowerCase(), password);
    if (!res.success) {
      Alert.alert('Sign In', String(res.msg));
      return;
    }
    router.replace('/home'); // go to your Home tab
  };

  // 🔁 Forgot password (send reset link)
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Forgot Password', 'Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      Alert.alert(
        'Password Reset',
        'We sent a password reset link to your email. Check your inbox.'
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <CustomKeyboardView>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* 🖼️ Top Background Image */}
        <View style={styles.imageWrapper}>
          <Image
            source={require('../assets/images/login.png')}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        {/* 🔑 Form Section */}
        <View style={styles.formContainer}>
          <Text style={styles.signInText}>Sign In</Text>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Octicons name="mail" size={hp(2.7)} color="gray" />
            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="gray"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
  <Octicons name="lock" size={hp(2.7)} color="gray" />
  <TextInput
    value={password}
    onChangeText={setPassword}
    style={[styles.input, { paddingRight: 35 }]} // space for icon
    placeholder="Password"
    secureTextEntry={!showPassword}
    placeholderTextColor="gray"
  />
  <Pressable
    onPress={() => setShowPassword((prev) => !prev)}
    style={{ position: 'absolute', right: 15 }}
  >
    <Octicons
      name={showPassword ? 'eye' : 'eye-closed'}
      size={hp(2.5)}
      color="gray"
    />
  </Pressable>
</View>


          {/* Forgot Password */}
          <Pressable onPress={handleForgotPassword}>
            <Text
              style={[
                styles.forgotPasswordText,
                { color: email.trim() ? '#9E9E9E' : '#C0C0C0' },
              ]}
            >
              Forgot password?
            </Text>
          </Pressable>

          {/* Sign In Button */}
          <TouchableOpacity onPress={handleLogin} style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Sign In</Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push('signUp')}>
              <Text style={styles.signUpLink}>Sign Up</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </CustomKeyboardView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // 🖼️ Fills top portion nicely
  imageWrapper: {
    width: '100%',
    height: hp(30),
    overflow: 'hidden',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    backgroundColor: '#d94f70',
  },
  image: {
    width: '100%',
    height: '100%',
  },

  formContainer: {
    flex: 1,
    paddingHorizontal: wp(5),
    paddingTop: hp(5),
    gap: 12,
  },
  signInText: {
    fontSize: hp(4),
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textAlign: 'center',
    color: '#333',
    marginBottom: hp(2),
  },
  inputContainer: {
    height: hp(7),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 24,
    marginBottom: hp(2),
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: hp(2),
    fontWeight: '600',
    color: '#4B4B4B',
  },
  forgotPasswordText: {
    fontSize: hp(1.8),
    fontWeight: '600',
    textAlign: 'right',
    marginBottom: hp(2),
  },
  submitButton: {
    height: hp(6.5),
    backgroundColor: '#c95278ff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(3),
  },
  submitButtonText: {
    fontSize: hp(2.7),
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: '#9E9E9E',
  },
  signUpLink: {
    fontSize: hp(1.8),
    fontWeight: '700',
    color: '#ab3f61ff',
  },
});
