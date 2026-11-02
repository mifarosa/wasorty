/** Holds what a screen shows and tells the React side when it changes. */
class Holder {
  #listeners = new Set();
  model = null;

  /** @param {(model: object | null) => void} listener @returns {() => void} */
  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  show(model) {
    this.#set(model);
  }

  hide() {
    // The game hides dialogs whenever a puzzle starts; nothing to tell when none was open.
    if (this.model !== null) this.#set(null);
  }

  #set(model) {
    this.model = model;
    for (const listener of this.#listeners) listener(model);
  }
}

/** The level list (see LevelMenu in src/app/levelMenu.js for what the game hands it). */
export class NativeMenu extends Holder {}

/** The rules a level brings in, or everything about the level from the info button. */
export class NativeRules extends Holder {
  /** Whether the dialog is open with everything about the level. */
  get isShowingInfo() {
    return this.model?.info === true;
  }
}
