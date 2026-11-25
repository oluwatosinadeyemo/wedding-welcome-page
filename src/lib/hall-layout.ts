// Shared floor-plan geometry for the dashboard editor and guests' access cards.
export interface HallConfig {
  tablesPerRow: number;
  rowsPerBlock: number;
  seatsPerTable: number;
  vipSeats: number;
  labels: Record<string, string>;
  // Set once existing table names have been moved onto numbered right-wing tables.
  renumberedAt?: string;
}

// The entrance arrows and every wing reference across the dashboard use these names.
export const WING_LABEL = { left: "Left Wing", right: "Right Wing" } as const;

export const DEFAULT_HALL_CONFIG: HallConfig = {
  tablesPerRow: 3,
  rowsPerBlock: 4,
  seatsPerTable: 10,
  vipSeats: 10,
  labels: {},
};

// Someone sharing a guest's table, as listed on their table card.
export interface Tablemate {
  full_name: string;
  party_size: number;
}

export const VIEW_W = 1000;
export const VIEW_H = 1250;
export const WALKWAY = { x1: 465, x2: 535, y1: 260, y2: 1075 };

export type Block = "left-top" | "left-bottom" | "right-top" | "right-bottom";
export interface Slot {
  id: string;
  kind: "round" | "vip";
  side: "left" | "right";
  number: number;
  label: string;
  x: number; y: number; // centre
  r: number;            // round radius
  w: number; h: number; // vip box
  seats: number;
  chairs: Chair[];
}

// a = direction (radians) from the table out to the chair, so chairs can be drawn facing the table.
export interface Chair { x: number; y: number; a: number }

export function normaliseConfig(raw: unknown): HallConfig {
  const c = { ...DEFAULT_HALL_CONFIG, ...(raw && typeof raw === "object" ? raw : {}) } as HallConfig;
  const clamp = (n: unknown, lo: number, hi: number, d: number) => {
    const v = Math.round(Number(n));
    return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;
  };
  return {
    ...c,
    tablesPerRow: clamp(c.tablesPerRow, 1, 5, 3),
    rowsPerBlock: clamp(c.rowsPerBlock, 1, 6, 4),
    seatsPerTable: clamp(c.seatsPerTable, 2, 14, 10),
    vipSeats: clamp(c.vipSeats, 2, 16, 10),
    labels: c.labels && typeof c.labels === "object" ? c.labels : {},
  };
}

// Numbering starts on the right wing (tables 1–24), then carries on across the left wing (25–48).
const BLOCKS: { block: Block; x0: number; x1: number; y0: number; y1: number; side: "left" | "right" }[] = [
  { block: "right-top", x0: 615, x1: 970, y0: 280, y1: 650, side: "right" },
  { block: "right-bottom", x0: 615, x1: 970, y0: 700, y1: 1070, side: "right" },
  { block: "left-top", x0: 30, x1: 385, y0: 280, y1: 650, side: "left" },
  { block: "left-bottom", x0: 30, x1: 385, y0: 700, y1: 1070, side: "left" },
];

export function buildSlots(config: HallConfig): Slot[] {
  const slots: Slot[] = [];
  let n = 0;
  for (const b of BLOCKS) {
    const cw = (b.x1 - b.x0) / config.tablesPerRow;
    const ch = (b.y1 - b.y0) / config.rowsPerBlock;
    const r = Math.min(cw, ch) * 0.27;
    for (let row = 0; row < config.rowsPerBlock; row++) {
      for (let col = 0; col < config.tablesPerRow; col++) {
        n++;
        const id = `${b.block}-${row}-${col}`;
        const x = b.x0 + cw * (col + 0.5);
        const y = b.y0 + ch * (row + 0.5);
        const orbit = r * 1.42;
        const chairs = Array.from({ length: config.seatsPerTable }, (_, i) => {
          const a = (i / config.seatsPerTable) * Math.PI * 2 - Math.PI / 2;
          return { x: x + Math.cos(a) * orbit, y: y + Math.sin(a) * orbit, a };
        });
        slots.push({ id, kind: "round", side: b.side, number: n, label: config.labels[id] ?? `Table ${n}`, x, y, r, w: 0, h: 0, seats: config.seatsPerTable, chairs });
      }
    }
  }
  // Long VIP tables beside the walkway, every chair on the outer side facing the walkway.
  (["left", "right"] as const).forEach((side, i) => {
    const id = `vip-${side}`;
    const w = 34, h = 420;
    const x = side === "left" ? 428 : 572;
    const y = 290 + h / 2;
    const out = side === "left" ? -1 : 1;
    const chairs: Chair[] = Array.from({ length: config.vipSeats }, (_, k) => ({
      x: x + out * (w / 2 + 13),
      y: y - h / 2 + (h / config.vipSeats) * (k + 0.5),
      a: side === "left" ? Math.PI : 0,
    }));
    slots.push({ id, kind: "vip", side, number: i + 1, label: config.labels[id] ?? `VIP ${i + 1}`, x, y, r: 0, w, h, seats: config.vipSeats, chairs });
  });
  return slots;
}

export const findSlot = (slots: Slot[], tableName: string | null | undefined) =>
  tableName ? slots.find(s => s.label.trim().toLowerCase() === tableName.trim().toLowerCase()) ?? null : null;

// Orders table names the way people number them: "Table 2" before "Table 10", then A–Z.
export const compareTableNames = (a: string, b: string) => {
  const na = parseInt(a.replace(/\D/g, ""), 10);
  const nb = parseInt(b.replace(/\D/g, ""), 10);
  if (!isNaN(na) && !isNaN(nb)) return na - nb || a.localeCompare(b);
  if (!isNaN(na) !== !isNaN(nb)) return isNaN(na) ? 1 : -1;
  return a.localeCompare(b);
};

// One-off move of the tables already in use onto the right wing, in order, as numbered tables.
// Guests stay together; only the table they share is renamed.
export function planRightWingRenumber(existingNames: string[], slots: Slot[]) {
  const right = slots.filter(s => s.kind === "round" && s.side === "right").sort((a, b) => a.number - b.number);
  const names = Array.from(new Set(existingNames.map(n => n.trim()).filter(Boolean))).sort(compareTableNames);
  const moves = names.slice(0, right.length).map((from, i) => ({ from, to: `Table ${right[i].number}` }));
  return { moves, overflow: names.slice(right.length) };
}
