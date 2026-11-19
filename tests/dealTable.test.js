import { describe, expect, it } from 'vitest';
import { DEAL_TICKETS } from '../src/game/dealTable.js';
import {
  LEVEL_COUNT,
  createLevelPuzzle,
  dealPuzzle,
  findLevelDealTicket,
  levelSettings
} from '../src/game/levels.js';

// Opening a level looks up which deal is the solvable one instead of searching for it, which is
// what a slow phone cannot afford. The table has to stay true to the levels: if this fails, run
// `npm run bake`.
describe('the deals of the levels', () => {
  it('have a ticket for every level', () => {
    expect(DEAL_TICKETS).toHaveLength(LEVEL_COUNT);
    for (const [seed, deal] of DEAL_TICKETS) {
      expect(Number.isInteger(seed) && seed >= 0).toBe(true);
      expect(Number.isInteger(deal) && deal >= 0).toBe(true);
    }
  });

  it('are the ones the search finds, and come out the same as when it is searched for', () => {
    for (let level = 1; level <= LEVEL_COUNT; level++) {
      expect(DEAL_TICKETS[level - 1], `ticket of level ${level}`).toEqual(
        findLevelDealTicket(level)
      );
      const searched = dealPuzzle(`level-${level}`, levelSettings(level));
      expect(createLevelPuzzle(level), `level ${level}`).toEqual(searched);
    }
  }, 120_000);

  it('still deal a puzzle for a level that has no ticket', () => {
    const settings = levelSettings(5);
    expect(dealPuzzle('level-5', settings, null)).toEqual(createLevelPuzzle(5));
  });
});
