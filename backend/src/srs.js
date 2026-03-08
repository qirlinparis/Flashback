/**
 * srs.js – SM-2 Spaced Repetition Algorithm
 *
 * The SM-2 algorithm assigns each memory item an "easiness factor" (EF),
 * a repetition count, and an interval (days until next review).
 *
 * Rating scale expected from caller (0-5):
 *   0 – complete blackout
 *   1 – incorrect but the correct answer felt familiar
 *   2 – incorrect but the answer was easy to recall after seeing it
 *   3 – correct but required significant effort
 *   4 – correct after a hesitation
 *   5 – perfect response
 */

const MIN_EF = 1.3;
const INITIAL_EF = 2.5;

/**
 * Create a fresh SRS item ready for its first review.
 * @returns {SRSItem}
 */
function createItem() {
  return {
    repetitions: 0,
    interval: 0,       // days until next review
    easinessFactor: INITIAL_EF,
    nextReview: new Date().toISOString(),
  };
}

/**
 * Apply SM-2 update after a review session.
 *
 * @param {SRSItem} item – current SRS metadata for the entry
 * @param {number}  rating – quality of the response (0-5)
 * @returns {SRSItem}     – updated SRS metadata (immutable copy)
 */
function reviewItem(item, rating) {
  if (rating < 0 || rating > 5) {
    throw new RangeError(`Rating must be between 0 and 5, got ${rating}`);
  }

  let { repetitions, interval, easinessFactor } = item;

  // Update easiness factor
  easinessFactor = Math.max(
    MIN_EF,
    easinessFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)),
  );

  if (rating < 3) {
    // Incorrect: reset repetition count but keep the improved EF
    repetitions = 0;
    interval = 1;
  } else {
    // Correct
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easinessFactor);
    }
    repetitions += 1;
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    repetitions,
    interval,
    easinessFactor,
    nextReview: nextReview.toISOString(),
  };
}

/**
 * Check whether an item is due for review today (or overdue).
 *
 * @param {SRSItem} item
 * @param {Date}    [now]
 * @returns {boolean}
 */
function isDue(item, now = new Date()) {
  return new Date(item.nextReview) <= now;
}

module.exports = { createItem, reviewItem, isDue, MIN_EF, INITIAL_EF };
