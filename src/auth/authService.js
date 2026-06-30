import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";

export const login = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logout = () => {
  return signOut(auth);
};

export const subscribeAuth = (callback) => {
  return onAuthStateChanged(auth, callback);
};
