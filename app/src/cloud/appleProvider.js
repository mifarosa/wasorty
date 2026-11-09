const coded = (code) => Object.assign(new Error(code), { code });

const toHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/**
 * Sign in with Apple. Apple gets a hash of a random string and Firebase gets the string itself,
 * so a token that was stolen on the way cannot be used again.
 *
 * @param {object} deps
 * @param {typeof import('expo-apple-authentication')} deps.AppleAuthentication
 * @param {typeof import('expo-crypto')} deps.Crypto
 * @returns {import('./nativeBackend.js').Provider}
 */
export function createAppleProvider({ AppleAuthentication, Crypto }) {
  return {
    async available() {
      try {
        return await AppleAuthentication.isAvailableAsync();
      } catch {
        return false;
      }
    },

    async getCredential(authApi) {
      const rawNonce = toHex(Crypto.getRandomBytes(16));
      const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

      let result;
      try {
        result = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL
          ],
          nonce
        });
      } catch (error) {
        throw error?.code === 'ERR_REQUEST_CANCELED' ? coded('sign-in-cancelled') : error;
      }
      if (!result?.identityToken) throw coded('apple-no-token');

      const credential = new authApi.OAuthProvider('apple.com').credential({
        idToken: result.identityToken,
        rawNonce
      });
      return { credential, authorizationCode: result.authorizationCode };
    }
  };
}
