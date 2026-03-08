/**
 * srs.test.js – Unit tests for the SM-2 SRS engine
 * Uses Node.js built-in test runner (node --test)
 */

const { describe, it, before } = require("node:test");
const assert = require("node:assert/strict");

const { createItem, reviewItem, isDue, MIN_EF, INITIAL_EF } = require("../src/srs");

describe("createItem", () => {
  it("returns an item with default values", () => {
    const item = createItem();
    assert.equal(item.repetitions, 0);
    assert.equal(item.interval, 0);
    assert.equal(item.easinessFactor, INITIAL_EF);
    assert.ok(item.nextReview);
  });

  it("nextReview is today or in the past (immediately due)", () => {
    const item = createItem();
    assert.ok(new Date(item.nextReview) <= new Date());
  });
});

describe("reviewItem", () => {
  it("throws on rating < 0", () => {
    assert.throws(() => reviewItem(createItem(), -1), RangeError);
  });

  it("throws on rating > 5", () => {
    assert.throws(() => reviewItem(createItem(), 6), RangeError);
  });

  it("rating 0 resets repetitions to 0 and sets interval to 1", () => {
    // First simulate a successful review to advance state
    let item = reviewItem(createItem(), 5);
    item = reviewItem(item, 5);
    // Now fail
    const failed = reviewItem(item, 0);
    assert.equal(failed.repetitions, 0);
    assert.equal(failed.interval, 1);
  });

  it("rating 5 on fresh item: interval=1, repetitions=1", () => {
    const item = reviewItem(createItem(), 5);
    assert.equal(item.repetitions, 1);
    assert.equal(item.interval, 1);
  });

  it("second correct review sets interval to 6", () => {
    let item = reviewItem(createItem(), 5);
    item = reviewItem(item, 5);
    assert.equal(item.repetitions, 2);
    assert.equal(item.interval, 6);
  });

  it("third correct review multiplies interval by easinessFactor", () => {
    let item = reviewItem(createItem(), 5);
    item = reviewItem(item, 5);
    const efBefore = item.easinessFactor;
    const intervalBefore = item.interval;
    item = reviewItem(item, 5);
    assert.equal(item.interval, Math.round(intervalBefore * item.easinessFactor));
  });

  it("easiness factor increases with perfect rating", () => {
    const before = INITIAL_EF;
    const item = reviewItem(createItem(), 5);
    assert.ok(item.easinessFactor > before);
  });

  it("easiness factor decreases with low (but passing) rating", () => {
    const item = reviewItem(createItem(), 3);
    assert.ok(item.easinessFactor < INITIAL_EF);
  });

  it("easiness factor never falls below MIN_EF", () => {
    let item = createItem();
    for (let i = 0; i < 20; i++) {
      item = reviewItem(item, 3);
    }
    assert.ok(item.easinessFactor >= MIN_EF);
  });

  it("nextReview is in the future after a successful review", () => {
    const item = reviewItem(createItem(), 5);
    assert.ok(new Date(item.nextReview) > new Date());
  });
});

describe("isDue", () => {
  it("fresh item is due immediately", () => {
    assert.ok(isDue(createItem()));
  });

  it("item with future nextReview is not due", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const item = { nextReview: future.toISOString() };
    assert.ok(!isDue(item));
  });

  it("item with past nextReview is due", () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    const item = { nextReview: past.toISOString() };
    assert.ok(isDue(item));
  });

  it("accepts a custom 'now' parameter", () => {
    const nextReview = new Date("2025-01-10").toISOString();
    const item = { nextReview };
    // Before the review date → not due
    assert.ok(!isDue(item, new Date("2025-01-09")));
    // On the review date → due
    assert.ok(isDue(item, new Date("2025-01-10")));
    // After the review date → due
    assert.ok(isDue(item, new Date("2025-01-11")));
  });
});
