/**
 * Runs a call that a phone may not be able to do (a vibration, a sound) and swallows its failure,
 * also when it comes later as a rejected promise: no feedback is better than an error in the
 * middle of a move.
 */
export function safely(call) {
  try {
    const result = call();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch {
    // Nothing to do about it.
  }
}
