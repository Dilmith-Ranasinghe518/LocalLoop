// import { View, Text } from 'react-native';
// import React, {useEffect} from 'react';
// import  {Slot, useRouter, useSegments} from 'expo-router';
// import { AuthContextProvider, useAuth } from '../context/authContext';

// const MainLayout = () =>{
//     const {isAuthenticated} =useAuth();
//     const segments = useSegments();
//     const router =useRouter();

//     useEffect(()=>{
//         //check if usr is authenticated or not
//         if(typeof isAuthenticated ==='undefined') return;
//         const inApp = segments[0] === '(app)';
//         if(isAuthenticated && !inApp){
//             //redirect to home
//             router.replace('home');
//         }else if(isAuthenticated === false){
//             //redirect to sign in
//             router.replace('signIn');
//         }
//     }, [isAuthenticated])

//     return <Slot/>
// } 

// export default function RootLayout() {
//   return (
//     <AuthContextProvider>
//       <MainLayout/>
//      </AuthContextProvider>
//   );
// }

import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { AuthContextProvider, useAuth } from '../context/authContext';

const MainLayout = () => {
  const { isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated or not
    if (typeof isAuthenticated === 'undefined') return;

    const inApp = segments[0] === '(app)';
    if (isAuthenticated && !inApp) {
      // Redirect to the home screen
      router.replace('home');
    } else if (isAuthenticated === false) {
      // Redirect to the sign-in screen if not authenticated
      router.replace('signIn');
    }
  }, [isAuthenticated]);

  return <Slot />; // This slot will render the active screen
};

export default function RootLayout() {
  return (
    <AuthContextProvider>
      <MainLayout />
    </AuthContextProvider>
  );
}
