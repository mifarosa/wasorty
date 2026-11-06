import { createFirebaseBackend } from '../../../src/cloud/firebaseBackend.js';

const PROVIDER_OF = { 'google.com': 'google', 'apple.com': 'apple' };

const coded = (code) => Object.assign(new Error(code), { code });

/** Runs `work`; when it fails, says so in the console (the error is passed on). */
async function noting(what, work) {
  try {
    return await work();
  } catch (error) {
    if (error?.code !== 'sign-in-cancelled') {
      console.warn(`[account] ${what} failed:`, error?.code ?? '', error?.message ?? error);
    }
    throw error;
  }
}

/**
 * What the app keeps in Firebase: the website's backend (profile, username, progress; see
 * src/cloud/firebaseBackend.js) with the sign-in of a phone. The player signs in with Apple or
 * Google on the phone, which hands over a credential that Firebase turns into the same account
 * the website has for that Google account.
 *
 * @typedef {object} Provider
 * @property {() => Promise<boolean>} available
 * @property {(authApi: object) => Promise<{ credential: object, authorizationCode?: string | null }>} getCredential
 *   rejects with `{ code: 'sign-in-cancelled' }` when the player backs out
 *
 * @param {object} options
 * @param {() => Promise<object>} options.load gives { auth, authApi, db, store }
 * @param {{ apple?: Provider | null, google?: Provider | null }} options.providers
 */
export function createNativeBackend({ load, providers }) {
  const base = createFirebaseBackend({ load, storage: null });

  /**
   * Deleting an account needs a recent sign-in, so the player signs in once more; for an
   * Apple account that also gives the code with which Apple is told to revoke its token, as
   * Apple requires of an app that offers its sign-in.
   */
  async function removeAccount(uid) {
    const { auth, authApi } = await load();
    const user = auth.currentUser;
    const provider = providers[PROVIDER_OF[user?.providerData?.[0]?.providerId]];

    let authorizationCode = null;
    if (provider) {
      const again = await provider.getCredential(authApi);
      await authApi.reauthenticateWithCredential(user, again.credential);
      authorizationCode = again.authorizationCode ?? null;
    }
    await base.deleteData(uid);
    if (authorizationCode) await authApi.revokeAccessToken(auth, authorizationCode);
    await authApi.deleteUser(auth.currentUser);
  }

  return {
    ...base,

    hasPendingSignIn: () => false,

    async watchAuth(listener) {
      const { auth, authApi } = await load();
      return authApi.onAuthStateChanged(auth, (user) => {
        listener(user ? { uid: user.uid, name: user.displayName } : null);
      });
    },

    /** @param {'apple' | 'google'} providerName */
    signIn(providerName) {
      return noting(`sign-in (${providerName})`, async () => {
        const provider = providers[providerName];
        if (!provider) throw coded('provider-unavailable');
        const { auth, authApi } = await load();
        const { credential } = await provider.getCredential(authApi);
        await authApi.signInWithCredential(auth, credential);
      });
    },

    deleteAccount(uid) {
      return noting('account deletion', () => removeAccount(uid));
    }
  };
}
