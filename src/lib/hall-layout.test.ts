import { describe, it, expect } from "vitest";
import { buildSlots, DEFAULT_HALL_CONFIG, findSlot } from "./hall-layout";

describe("hall layout", () => {
  const slots = buildSlots(DEFAULT_HALL_CONFIG);
  it("places 3 round tables per row", () => {
    const firstRow = slots.filter(s => s.id.startsWith("left-top-0-"));
    expect(firstRow).toHaveLength(3);
  });
  it("gives every round table 10 chairs", () => {
    expect(slots.filter(s => s.kind === "round").every(s => s.chairs.length === 10)).toBe(true);
  });
  it("has two VIP long tables with 10 chairs each", () => {
    const vip = slots.filter(s => s.kind === "vip");
    expect(vip).toHaveLength(2);
    expect(vip.every(s => s.chairs.length === 10)).toBe(true);
  });
  it("finds a table by its name tag regardless of case", () => {
    expect(findSlot(slots, "vip 1")?.id).toBe("vip-left");
  });
});
