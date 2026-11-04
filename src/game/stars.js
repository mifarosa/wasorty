/**
 * Stars for a solved puzzle, by how many moves over the fewest the player needed: three for
 * the fewest or one more, two up to three more, one up to six more, and none beyond.
 */

export const MAX_STARS = 3;

/** How many moves over the fewest still earn three, two and one star. */
const THREE_STAR_EXTRA = 1;
const TWO_STAR_EXTRA = 3;
const ONE_STAR_EXTRA = 6;

/**
 * The most moves that still earn each number of stars.
 * @param {number} fewest the fewest moves that solve the puzzle
 * @returns {{ three: number, two: number, one: number }}
 */
export function starLimits(fewest) {
  return {
    three: fewest + THREE_STAR_EXTRA,
    two: fewest + TWO_STAR_EXTRA,
    one: fewest + ONE_STAR_EXTRA
  };
}

/**
 * @param {number} moves the player's moves
 * @param {number} fewest the fewest moves that solve the puzzle
 * @returns {0 | 1 | 2 | 3}
 */
export function starsFor(moves, fewest) {
  const limits = starLimits(fewest);
  if (moves <= limits.three) return 3;
  if (moves <= limits.two) return 2;
  if (moves <= limits.one) return 1;
  return 0;
}
