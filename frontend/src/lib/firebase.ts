import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, TwitterAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBKnexF-ApkmELZlkc5hM9sgyaLAUs4HcQ",
  authDomain: "healthcareapp-2c27b.firebaseapp.com",
  projectId: "healthcareapp-2c27b",
  storageBucket: "healthcareapp-2c27b.firebasestorage.app",
  messagingSenderId: "888249744897",
  appId: "1:888249744897:web:473b01cae5d442f7944a00",
  measurementId: "G-H669GYGVNJ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
export const twitterProvider = new TwitterAuthProvider();

let analytics;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { analytics };