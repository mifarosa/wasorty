import { createElement } from 'react';
import { registerRootComponent } from 'expo';

import { CrashGuard, report } from './src/CrashGuard';

// The game is loaded inside a try: an error while its modules start (a native module that is
// missing, say) is then shown on the screen instead of closing the app without a word.
let App = () => null;
try {
  App = require('./App').default;
} catch (error) {
  report(error);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(() => createElement(CrashGuard, null, createElement(App)));
