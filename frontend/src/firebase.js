// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDLAYh7SqKTZ--tnZTk8rQ4m2J4IIqEwpE",
  authDomain: "killstreak-2358b.firebaseapp.com",
  projectId: "killstreak-2358b",
  storageBucket: "killstreak-2358b.firebasestorage.app",
  messagingSenderId: "683947416783",
  appId: "1:683947416783:web:6164e9e6adf4d590872bba",
  measurementId: "G-JRL83EVRFS"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
