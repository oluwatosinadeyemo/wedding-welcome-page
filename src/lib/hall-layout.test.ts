import { describe, it, expect } from "vitest";
import { buildSlots, DEFAULT_HALL_CONFIG, findSlot, planRightWingRenumber } from "./hall-layout";

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
  it("puts every VIP chair on the outer side", () => {
    const [left, right] = slots.filter(s => s.kind === "vip");
    expect(left.chairs.every(c => c.x < left.x)).toBe(true);
    expect(right.chairs.every(c => c.x > right.x)).toBe(true);
  });
  it("numbers the right wing first", () => {
    const right = slots.filter(s => s.kind === "round" && s.side === "right").map(s => s.number);
    expect(Math.min(...right)).toBe(1);
    expect(Math.max(...right)).toBe(24);
  });
  it("moves existing tables onto right-wing numbers in order", () => {
    const { moves, overflow } = planRightWingRenumber(["Family", "Table 10", "Table 2", "Family"], slots);
    expect(moves).toEqual([
      { from: "Table 2", to: "Table 1" },
      { from: "Table 10", to: "Table 2" },
      { from: "Family", to: "Table 3" },
    ]);
    expect(overflow).toEqual([]);
  });
});
