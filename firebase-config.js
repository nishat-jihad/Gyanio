import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCJCVoi7BTO_vYRDaatw8Lvd1BmxlbsSFg",
  authDomain: "gyanio.firebaseapp.com",
  projectId: "gyanio",
  storageBucket: "gyanio.firebasestorage.app",
  messagingSenderId: "718244493815",
  appId: "1:718244493815:web:f7fe8e363a989821d496f2",
  measurementId: "G-VR37TK7YZP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

export { app, analytics, auth, db, rtdb };
