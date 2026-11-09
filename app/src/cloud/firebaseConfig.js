/**
 * The Firebase project the accounts and the daily scores live in: the website's (see
 * src/cloud/config.js, which reads its values with Vite). They only name the project; what
 * protects the data is firestore.rules.
 */
export const FIREBASE_CONFIG = Object.freeze({
  apiKey: 'AIzaSyCmXZ-8K6NSyTJO7Q3BxIWCtrj6YXn0sFg',
  authDomain: 'suloop-8ee05.firebaseapp.com',
  projectId: 'suloop-8ee05',
  storageBucket: 'suloop-8ee05.firebasestorage.app',
  messagingSenderId: '268054495832',
  appId: '1:268054495832:web:76d21b0a1f37082fb4002d'
});
