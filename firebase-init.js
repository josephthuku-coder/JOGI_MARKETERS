/**
 * Centralized Firebase Initialization Script
 * This script should be included once in your main HTML file (e.g., index.html)
 * or a common layout, before any other scripts that use Firebase.
 */

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY_HERE",
  authDomain: "shopping-online-6ba36.firebaseapp.com", 
  projectId: "shopping-online-6ba36",
  storageBucket: "shopping-online-6ba36.appspot.com",
  messagingSenderId: "404079444441",
  appId: "1:404079444441:web:bca6b897877295f92519c8"
};

// Initialize Firebase only if it hasn't been initialized yet
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Make Firebase services globally available (or export them if using modules)
window.db = firebase.firestore();
window.storage = firebase.storage();
window.auth = firebase.auth();

console.log("Firebase initialized successfully!");