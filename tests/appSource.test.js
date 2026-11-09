import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The screens are not rendered in the tests, so a prop that was forgotten would only show on a
// phone (as "Cannot read property 'panel' of undefined"). This looks at the source for the
// buttons that need the colors of the theme.
describe('the buttons of the app screen', () => {
  const source = readFileSync(new URL('../app/App.js', import.meta.url), 'utf8');

  it('give the colors of the theme to every toolbar and header button', () => {
    for (const name of ['ToolButton', 'HeaderButton']) {
      const uses = [...source.matchAll(new RegExp(`<${name}\\b[\\s\\S]*?>`, 'g'))].map(
        (match) => match[0]
      );
      expect(uses.length, `${name} is used`).toBeGreaterThan(0);
      for (const use of uses) expect(use, use).toContain('colors={colors}');
    }
  });
});
