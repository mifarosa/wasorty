import { describe, expect, it, vi } from 'vitest';
import { Account } from '../src/cloud/account.js';
import { createAppleProvider } from '../app/src/cloud/appleProvider.js';
import { createGoogleProvider } from '../app/src/cloud/googleProvider.js';
import { createNativeBackend } from '../app/src/cloud/nativeBackend.js';

const never = () => {
  throw new Error('should not be called');
};

/** Stand-ins for expo-apple-authentication and expo-crypto. */
function fakeApple({ result = {}, error = null } = {}) {
  const AppleAuthentication = {
    isAvailableAsync: vi.fn(async () => true),
    AppleAuthenticationScope: { FULL_NAME: 'name', EMAIL: 'email' },
    signInAsync: vi.fn(async (options) => {
      if (error) throw error;
      return {
        identityToken: 'apple-id-token',
        authorizationCode: 'apple-code',
        ...result,
        options
      };
    })
  };
  const Crypto = {
    getRandomBytes: () => Uint8Array.from([1, 2, 255, 16]),
    CryptoDigestAlgorithm: { SHA256: 'SHA256' },
    digestStringAsync: vi.fn(async (algorithm, text) => `${algorithm}(${text})`)
  };
  return { AppleAuthentication, Crypto };
}

const authApi = () => ({
  OAuthProvider: class {
    constructor(id) {
      this.id = id;
    }
    credential(parts) {
      return { provider: this.id, ...parts };
    }
  },
  GoogleAuthProvider: { credential: (idToken) => ({ provider: 'google.com', idToken }) }
});

describe('sign in with Apple', () => {
  it('gives Apple a hash of the nonce and Firebase the nonce itself', async () => {
    const deps = fakeApple();
    const { credential, authorizationCode } =
      await createAppleProvider(deps).getCredential(authApi());
    const asked = deps.AppleAuthentication.signInAsync.mock.calls[0][0];
    expect(credential).toMatchObject({
      provider: 'apple.com',
      idToken: 'apple-id-token',
      rawNonce: '0102ff10'
    });
    expect(asked.nonce).toBe('SHA256(0102ff10)');
    expect(asked.requestedScopes).toEqual(['name', 'email']);
    expect(authorizationCode).toBe('apple-code');
  });

  it('reports a player who backed out as a cancelled sign-in', async () => {
    const provider = createAppleProvider(
      fakeApple({ error: Object.assign(new Error('x'), { code: 'ERR_REQUEST_CANCELED' }) })
    );
    await expect(provider.getCredential(authApi())).rejects.toMatchObject({
      code: 'sign-in-cancelled'
    });
  });

  it('refuses an answer without a token, and says when the phone cannot do it', async () => {
    const provider = createAppleProvider(fakeApple({ result: { identityToken: null } }));
    await expect(provider.getCredential(authApi())).rejects.toMatchObject({
      code: 'apple-no-token'
    });
    const deps = fakeApple();
    deps.AppleAuthentication.isAvailableAsync = async () => {
      throw new Error('no');
    };
    expect(await createAppleProvider(deps).available()).toBe(false);
  });
});

describe('sign in with Google', () => {
  const make = (response, options = {}) => {
    const GoogleSignin = {
      configure: vi.fn(),
      signIn: vi.fn(async () => {
        if (response instanceof Error) throw response;
        return response;
      })
    };
    const provider = createGoogleProvider({
      GoogleSignin,
      cancelCode: 'SIGN_IN_CANCELLED',
      webClientId: 'web-id',
      iosClientId: 'ios-id',
      ...options
    });
    return { provider, GoogleSignin };
  };

  it('turns the id token into a Firebase credential', async () => {
    const { provider, GoogleSignin } = make({ type: 'success', data: { idToken: 'g-token' } });
    const { credential } = await provider.getCredential(authApi());
    expect(credential).toEqual({ provider: 'google.com', idToken: 'g-token' });
    expect(GoogleSignin.configure).toHaveBeenCalledWith({
      webClientId: 'web-id',
      iosClientId: 'ios-id'
    });
  });

  it('treats a cancelled sign-in as a cancelled sign-in, whichever way Google says it', async () => {
    const asResponse = make({ type: 'cancelled', data: null }).provider;
    await expect(asResponse.getCredential(authApi())).rejects.toMatchObject({
      code: 'sign-in-cancelled'
    });
    const asError = make(Object.assign(new Error('x'), { code: 'SIGN_IN_CANCELLED' })).provider;
    await expect(asError.getCredential(authApi())).rejects.toMatchObject({
      code: 'sign-in-cancelled'
    });
  });

  it('is not available until the client ids are in place', async () => {
    expect(await make(null, { webClientId: '' }).provider.available()).toBe(false);
    expect(await make(null).provider.available()).toBe(true);
  });
});

/** Firebase stand-ins that record what the backend does, in order. */
function fakeFirebase({ providerId = 'apple.com', docs = {} } = {}) {
  const calls = [];
  const data = new Map(Object.entries(docs));
  const snapshot = (path) => ({ exists: () => data.has(path), data: () => data.get(path) });
  const api = {
    ...authApi(),
    onAuthStateChanged: vi.fn((auth, listener) => {
      listener({ uid: 'u1', displayName: 'Ada' });
      return () => {};
    }),
    signInWithCredential: vi.fn(async (auth, credential) => calls.push(['signIn', credential])),
    reauthenticateWithCredential: vi.fn(async (user, credential) =>
      calls.push(['reauth', credential])
    ),
    revokeAccessToken: vi.fn(async (auth, code) => calls.push(['revoke', code])),
    deleteUser: vi.fn(async () => calls.push(['deleteUser']))
  };
  const store = {
    doc: (db, ...parts) => ({ path: parts.join('/') }),
    getDoc: async (target) => snapshot(target.path),
    writeBatch: () => {
      const log = [];
      return {
        delete: (target) => log.push(['delete', target.path]),
        commit: async () => calls.push(...log, ['commit'])
      };
    }
  };
  const auth = { currentUser: { uid: 'u1', providerData: [{ providerId }] } };
  return { calls, api, load: async () => ({ auth, authApi: api, db: {}, store }) };
}

const provider = (code = 'apple-code') => ({
  available: async () => true,
  getCredential: vi.fn(async () => ({ credential: { id: 'cred' }, authorizationCode: code }))
});

describe('the backend of the app', () => {
  it('signs in with the credential the chosen provider gives', async () => {
    const firebase = fakeFirebase();
    const apple = provider();
    const backend = createNativeBackend({ load: firebase.load, providers: { apple } });
    await backend.signIn('apple');
    expect(firebase.calls).toEqual([['signIn', { id: 'cred' }]]);
    await expect(backend.signIn('google')).rejects.toMatchObject({ code: 'provider-unavailable' });
  });

  it('says in the console what failed, and passes the error on', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const apple = provider();
    apple.getCredential.mockRejectedValueOnce(
      Object.assign(new Error('Authorization failed'), { code: 'ERR_REQUEST_UNKNOWN' })
    );
    const backend = createNativeBackend({ load: fakeFirebase().load, providers: { apple } });
    await expect(backend.signIn('apple')).rejects.toMatchObject({ code: 'ERR_REQUEST_UNKNOWN' });
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0])).toContain('ERR_REQUEST_UNKNOWN');

    // A player who backs out is not a failure to report.
    warn.mockClear();
    apple.getCredential.mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'sign-in-cancelled' })
    );
    await expect(backend.signIn('apple')).rejects.toBeDefined();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('reports who is signed in, and never waits for a redirect', async () => {
    const backend = createNativeBackend({ load: fakeFirebase().load, providers: {} });
    const listener = vi.fn();
    await backend.watchAuth(listener);
    expect(listener).toHaveBeenCalledWith({ uid: 'u1', name: 'Ada' });
    expect(backend.hasPendingSignIn()).toBe(false);
  });

  it('signs in again, deletes the data, revokes Apple and then deletes the account', async () => {
    const firebase = fakeFirebase({
      docs: { 'profiles/u1': { username: 'Ada_99' } }
    });
    const backend = createNativeBackend({
      load: firebase.load,
      providers: { apple: provider('the-code') }
    });
    await backend.deleteAccount('u1');
    expect(firebase.calls).toEqual([
      ['reauth', { id: 'cred' }],
      ['delete', 'progress/u1'],
      ['delete', 'profiles/u1'],
      ['delete', 'usernames/ada_99'],
      ['commit'],
      ['revoke', 'the-code'],
      ['deleteUser']
    ]);
  });

  it('has nothing to revoke for a Google account', async () => {
    const firebase = fakeFirebase({ providerId: 'google.com' });
    const backend = createNativeBackend({
      load: firebase.load,
      providers: { google: provider(null) }
    });
    await backend.deleteAccount('u1');
    expect(firebase.api.revokeAccessToken).not.toHaveBeenCalled();
    expect(firebase.api.deleteUser).toHaveBeenCalledOnce();
  });

  it('does not delete anything when the player backs out of the new sign-in', async () => {
    const firebase = fakeFirebase();
    const apple = provider();
    apple.getCredential.mockRejectedValueOnce(
      Object.assign(new Error('x'), { code: 'sign-in-cancelled' })
    );
    const backend = createNativeBackend({ load: firebase.load, providers: { apple } });
    await expect(backend.deleteAccount('u1')).rejects.toMatchObject({ code: 'sign-in-cancelled' });
    expect(firebase.calls).toEqual([]);
  });
});

describe('the account of the app', () => {
  it('passes the provider the player picked and takes a cancelled sign-in quietly', async () => {
    const signIn = vi.fn(async () => {
      throw Object.assign(new Error('x'), { code: 'sign-in-cancelled' });
    });
    const backend = {
      watchAuth: async () => () => {},
      signIn,
      signOut: never,
      readProfile: never,
      claimUsername: never,
      deleteAccount: never
    };
    const account = new Account(backend, null);
    await account.signIn('apple');
    expect(signIn).toHaveBeenCalledWith('apple');
    expect(account.state).toMatchObject({ status: 'signedOut', error: null });
  });
});
