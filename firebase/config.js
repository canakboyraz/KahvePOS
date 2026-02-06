/**
 * Firebase Configuration - KahvePOS
 * KahvePOS-ba3d7 Projesi
 */

const firebaseConfig = {
  apiKey: "AIzaSyBIr-TGWtFFDuSFVuPSS6iHX6XKyeJkNZw",
  authDomain: "kahvepos-ba3d7.firebaseapp.com",
  projectId: "kahvepos-ba3d7",
  storageBucket: "kahvepos-ba3d7.firebasestorage.app",
  messagingSenderId: "274923657248",
  appId: "1:274923657248:web:ba6a724fef80468f00c445",
  measurementId: "G-5ZWJ317GYK"
};

// Firebase SDK başlatma
firebase.initializeApp(firebaseConfig);

// Authentication ve Firestore referansları
const auth = firebase.auth();
const db = firebase.firestore();

// Real-time database (opsiyonel)
const rtdb = firebase.database();

// Timestamp için kolaylık fonksiyonu
const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();

// Console'a bilgi
console.log('🔥 Firebase initialized for KahvePOS');
