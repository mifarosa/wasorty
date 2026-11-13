import { describe, expect, it } from 'vitest';
import { STAGES, STAGE_STARTS, levelCountOf } from '../src/game/levels.js';
import { previewLevelsOf } from '../app/src/previewLevels.js';

describe('the levels opened for a look', () => {
  it('are the first and the last level of every chapter', () => {
    const levels = [...previewLevelsOf(true)].sort((a, b) => a - b);
    // 8 stages, the master stage and the giant stage, two levels each
    expect(levels).toHaveLength(20);
    expect(levels[0]).toBe(1);
    expect(levels.at(-1)).toBe(400);
    for (const [index, stage] of STAGES.entries()) {
      expect(levels).toContain(STAGE_STARTS[index]);
      expect(levels).toContain(STAGE_STARTS[index] + levelCountOf(stage) - 1);
    }
    expect(levels).toContain(321); // the first of the master stage
    expect(levels).toContain(360);
    expect(levels).toContain(361); // the first of the giant stage
  });

  it('are none when it is turned off', () => {
    expect(previewLevelsOf(false).size).toBe(0);
  });
});
