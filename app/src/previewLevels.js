import {
  GIANT_STAGE,
  MASTER_STAGE,
  STAGES,
  STAGE_LEVEL_COUNT,
  STAGE_STARTS,
  levelCountOf
} from '../../src/game/levels.js';

/**
 * Opens the first (easy) and the last (hard) level of every chapter for a look, without solving
 * the levels before them, so a build can be tried on all kinds of boards. Playing one counts
 * for nothing: no stars and no progress (see `previewLevels` of GameController).
 *
 * It is on for builds that are only tried out. Set it to false for the build that goes to the
 * App Store.
 */
export const PREVIEW_LEVELS = true;

/** @returns {Set<number>} the levels that can be opened for a look */
export function previewLevelsOf(enabled = PREVIEW_LEVELS) {
  if (!enabled) return new Set();
  const chapters = [
    ...STAGES.map((stage, index) => ({ first: STAGE_STARTS[index], count: levelCountOf(stage) })),
    { first: STAGE_LEVEL_COUNT + 1, count: MASTER_STAGE.count },
    { first: STAGE_LEVEL_COUNT + MASTER_STAGE.count + 1, count: GIANT_STAGE.count }
  ];
  return new Set(chapters.flatMap(({ first, count }) => [first, first + count - 1]));
}
