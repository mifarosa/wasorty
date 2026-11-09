const coded = (code) => Object.assign(new Error(code), { code });

/**
 * Sign in with Google. It needs the client ids of the Firebase project (authConfig.js); while
 * there are none it says it is not available, and the app does not show the button.
 *
 * @param {object} deps
 * @param {typeof import('@react-native-google-signin/google-signin').GoogleSignin} deps.GoogleSignin
 * @param {string} deps.cancelCode the code of the error Google's sign-in gives when cancelled
 * @param {string} deps.webClientId
 * @param {string} [deps.iosClientId]
 * @returns {import('./nativeBackend.js').Provider}
 */
export function createGoogleProvider({ GoogleSignin, cancelCode, webClientId, iosClientId }) {
  return {
    async available() {
      return Boolean(webClientId);
    },

    async getCredential(authApi) {
      GoogleSignin.configure({ webClientId, iosClientId: iosClientId || undefined });

      let response;
      try {
        response = await GoogleSignin.signIn();
      } catch (error) {
        throw error?.code === cancelCode ? coded('sign-in-cancelled') : error;
      }
      if (response?.type !== 'success') throw coded('sign-in-cancelled');
      const idToken = response.data?.idToken;
      if (!idToken) throw coded('google-no-token');

      return { credential: authApi.GoogleAuthProvider.credential(idToken) };
    }
  };
}
