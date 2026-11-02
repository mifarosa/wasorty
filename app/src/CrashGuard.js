import { Component, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

/** The latest error that was not caught anywhere else, and who wants to hear about it. */
let lastError = null;
const listeners = new Set();

export function report(error) {
  lastError = error instanceof Error ? error : new Error(String(error));
  for (const listener of listeners) listener(lastError);
}

/**
 * Release builds close the app on an uncaught JavaScript error, with nothing to read. This
 * shows the error on the screen instead, so a build that fails on a phone can be diagnosed.
 */
function installGlobalHandler() {
  const errorUtils = globalThis.ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;
  const previous = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error, isFatal) => {
    report(error);
    // Kept alive on purpose: the original handler would close the app in a release build.
    if (!isFatal) previous?.(error, isFatal);
  });
}
installGlobalHandler();

function ErrorScreen({ error }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Wasorty hit an error</Text>
      <Text style={styles.hint}>Please send a screenshot of this screen.</Text>
      <ScrollView style={styles.scroll}>
        <Text selectable style={styles.message}>
          {String(error?.message ?? error)}
        </Text>
        <Text selectable style={styles.stack}>
          {String(error?.stack ?? '').slice(0, 3000)}
        </Text>
      </ScrollView>
    </View>
  );
}

class Boundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    return this.state.error ? <ErrorScreen error={this.state.error} /> : this.props.children;
  }
}

/** Wraps the app: an error while drawing or any uncaught one is shown instead of closing it. */
export function CrashGuard({ children }) {
  const [error, setError] = useState(lastError);
  useEffect(() => {
    listeners.add(setError);
    return () => listeners.delete(setError);
  }, []);
  if (error) return <ErrorScreen error={error} />;
  return <Boundary>{children}</Boundary>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0f0b2a', padding: 20, paddingTop: 70 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  hint: { color: '#a9a5d6', marginTop: 6, marginBottom: 12 },
  scroll: { flex: 1 },
  message: { color: '#fca5a5', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  stack: { color: '#cbd5e1', fontSize: 11 }
});
