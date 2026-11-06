import { Account } from '../../../src/cloud/account.js';
import { CloudSync } from '../../../src/cloud/cloudSync.js';
import { createDailyStore } from '../../../src/cloud/dailyStore.js';
import { loadNativeFirebase } from './nativeFirebase.js';
import { createNativeBackend } from './nativeBackend.js';
import { providers } from './providers.js';

/**
 * The account and the sync of progress of the app. Nothing here loads
 * Firebase until it is needed, and when there is no network the game plays on: the account
 * says what failed and the sync tries again.
 *
 * @param {object} options
 * @param {{ getItem: (key: string) => string | null, setItem: (key: string, value: string) => void, removeItem: (key: string) => void }} options.storage
 * @param {() => import('../../../src/app/cloudProgress.js').State} options.getLocal
 * @param {(merged: import('../../../src/app/cloudProgress.js').State) => void} options.apply
 */
export function createCloud({ storage, getLocal, apply, backend = null }) {
  const real =
    backend ?? createNativeBackend({ load: loadNativeFirebase, providers: { ...providers } });
  const account = new Account(real, storage);
  const cloudSync = new CloudSync({ account, backend: real, getLocal, apply });
  return { account, cloudSync, providers };
}

/** The daily scores in Firebase (see src/cloud/dailyStore.js). */
export function createNativeDailyStore() {
  return createDailyStore({ load: loadNativeFirebase });
}
