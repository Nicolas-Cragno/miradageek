import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
//import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCUGc6AS70rt5-VYUEYB6XES1JZm1hhmrw",
  authDomain: "geek-look.firebaseapp.com",
  projectId: "geek-look",
  storageBucket: "geek-look.firebasestorage.app",
  messagingSenderId: "875419538595",
  appId: "1:875419538595:web:4fc12e8102c2553e95db16",
  measurementId: "G-X83FX008MN",
};

const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);

export const db = getFirestore(app);
export const auth = getAuth(app);
