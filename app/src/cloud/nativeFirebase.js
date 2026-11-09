import { initializeApp } from 'firebase/app';
import * as authApi from 'firebase/auth';
import * as store from 'firebase/firestore';
import Storage from 'expo-sqlite/kv-store';
import { FIREBASE_CONFIG } from './firebaseConfig.js';

let loading = null;

/**
 * Firebase for the app: the same pieces as the website's loader (src/cloud/firebase.js), with
 * the sign-in kept on the phone and a connection that works behind any network.
 */
export function loadNativeFirebase() {
  loading ??= Promise.resolve()
    .then(() => {
      const app = initializeApp(FIREBASE_CONFIG);
      let auth;
      try {
        // The phone's own database keeps who is signed in, so the next start picks it up.
        auth = authApi.initializeAuth(app, {
          persistence: authApi.getReactNativePersistence(Storage)
        });
      } catch {
        // Already set up (a reload while developing).
        auth = authApi.getAuth(app);
      }
      return {
        app,
        auth,
        authApi,
        // Long polling: the streaming connection of the browser does not run on a phone.
        db: store.initializeFirestore(app, { experimentalForceLongPolling: true }),
        store
      };
    })
    .catch((error) => {
      loading = null;
      throw error;
    });
  return loading;
}
