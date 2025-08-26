// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC1ntFGnFAIA_v6MzILHDAqr1_IogczME4",
  authDomain: "tm38-calc.firebaseapp.com",
  projectId: "tm38-calc",
  storageBucket: "tm38-calc.firebasestorage.app",
  messagingSenderId: "216948323726",
  appId: "1:216948323726:web:3276772e63e709ea8e20df",
  measurementId: "G-8KCQYYP3J8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);