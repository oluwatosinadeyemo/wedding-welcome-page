import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Users, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Geometry constants ────────────────────────────────────────────────────────

const TABLE_CAPACITY = 10;
const TABLE_RADIUS = 50;       // larger circle for more presence
const CHAIR_RADIUS = 11;       // bigger chair dots
const CHAIR_ORBIT = TABLE_RADIUS + 9 + CHAIR_RADIUS; // 70px from table centre
const BOX = 160;               // bounding box (chairs overflow visibly)

const HALL_W = 1040;
const HALL_H = 720;

// Fixed hall features (left/top/width/height in px)
const SWEETHEART = { x: 400, y: 34, w: 240, h: 52 };
const DANCE_FLOOR = { x: 395, y: 280, w: 250, h: 150 };

// 16 default slots arranged around the dance floor so nothing overlaps it
const DEFAULT_SLOTS: { x: number; y: number }[] = [
  // Left wall
  { x: 90, y: 160 }, { x: 90, y: 310 }, { x: 90, y: 460 }, { x: 90, y: 610 },
  // Right wall
  { x: 950, y: 160 }, { x: 950, y: 310 }, { x: 950, y: 460 }, { x: 950, y: 610 },
  // Bottom row
  { x: 260, y: 625 }, { x: 520, y: 625 }, { x: 780, y: 625 },
  // Front sides (flanking sweetheart)
  { x: 230, y: 160 }, { x: 810, y: 160 },
  // Mid sides (flanking dance floor)
  { x: 260, y: 460 }, { x: 780, y: 460 },
  // Extra back-centre
  { x: 520, y: 130 },
];

const POSITIONS_KEY = "wedding-hall-positions-v1";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GuestEntry {
  id: string;
  full_name: string;
  party_size: number;
  side: string | null;
  table_assignment: string | null;
  checked_in: boolean;
  rsvps: { attending: string }[] | null;
}

interface Pos { x: number; y: number; }

// ─── Position storage ─────────────────────────────────────────────────────────

const loadPositions = (names: string[]): Record<string, Pos> => {
  let stored: Record<string, Pos> = {};
  try {
    const raw = localStorage.getItem(POSITIONS_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch { /* ignore */ }

  const result = { ...stored };
  let idx = Object.keys(stored).length;
  for (const name of names) {
    if (!result[name]) {
      result[name] = DEFAULT_SLOTS[idx % DEFAULT_SLOTS.length];
      idx++;
    }
  }
  return result;
};

const persistPositions = (pos: Record<string, Pos>) => {
  try { localStorage.setItem(POSITIONS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
};

// ─── Colour helpers ───────────────────────────────────────────────────────────

// Vivid chair colours with strong glow so side is instantly obvious
const chairFill = (side: string | null) => {
  if (!side) return "bg-slate-600/80 border border-slate-400/30";
  const l = side.toLowerCase();
  if (l.includes("bride")) return "bg-yellow-400 border-2 border-yellow-200/60 shadow-[0_0_9px_rgba(250,204,21,0.85)]";
  if (l.includes("groom")) return "bg-blue-500 border-2 border-blue-300/60 shadow-[0_0_9px_rgba(59,130,246,0.85)]";
  return "bg-purple-500 border-2 border-purple-300/50 shadow-[0_0_8px_rgba(168,85,247,0.75)]";
};

// Title prefixes to skip when extracting a display name
const TITLE_PREFIXES = new Set(["mr", "mrs", "ms", "miss", "dr", "prof", "rev", "sir", "chief", "pastor", "alhaji", "alhaja"]);
const extractFirst = (fullName: string, maxLen = 6): string => {
  const parts = fullName.trim().split(/\s+/);
  const clean = parts[0].replace(/[.,]/g, "").toLowerCase();
  const idx = TITLE_PREFIXES.has(clean) && parts.length > 1 ? 1 : 0;
  return parts[idx].slice(0, maxLen);
};

const sideAccentClass = (side: string | null) => {
  if (!side) return "border-l-white/20";
  const l = side.toLowerCase();
  if (l.includes("bride")) return "border-l-yellow-400";
  if (l.includes("groom")) return "border-l-blue-400";
  return "border-l-amber-400/70";
};

// ─── SideBadge ────────────────────────────────────────────────────────────────

const SideBadge = ({ side }: { side: string | null }) => {
  if (!side) return null;
  const l = side.toLowerCase();
  const cls = l.includes("bride")
    ? "bg-yellow-400/20 text-yellow-300"
    : l.includes("groom")
    ? "bg-blue-500/20 text-blue-400"
    : "bg-amber-500/20 text-amber-400";
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${cls}`}>
      {side}
    </span>
  );
};

// ─── ChairDot ─────────────────────────────────────────────────────────────────

const getInitials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(p => !TITLE_PREFIXES.has(p.replace(/[.,]/g, "").toLowerCase()));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ChairDot = ({
  index, total, side, guestName, cR, cOrbit, box,
}: {
  index: number; total: number; side?: string | null; guestName?: string;
  cR: number; cOrbit: number; box: number;
}) => {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const cx = Math.cos(angle) * cOrbit + box / 2;
  const cy = Math.sin(angle) * cOrbit + box / 2;
  const initials = guestName ? getInitials(guestName) : "";
  const fontSize = Math.max(5, cR * 0.72);

  return (
    <div
      title={guestName ?? ""}
      className={`absolute rounded-full pointer-events-none flex items-center justify-center ${chairFill(side ?? null)}`}
      style={{
        width: cR * 2,
        height: cR * 2,
        left: cx - cR,
        top: cy - cR,
      }}
    >
      {initials && (
        <span
          style={{
            fontSize,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            textShadow: "0 1px 2px rgba(0,0,0,0.6)",
            userSelect: "none",
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
};

// ─── HallTable ────────────────────────────────────────────────────────────────

const HallTable = ({
  name, guests, position, manualSide, onReposition, onSavePosition, onSelect, scale,
}: {
  name: string;
  guests: GuestEntry[];
  position: Pos;
  manualSide: "bride" | "groom" | undefined;
  onReposition: (name: string, pos: Pos) => void;
  onSavePosition: (name: string, pos: Pos) => void;
  onSelect: () => void;
  scale: number;
}) => {
  // Scaled geometry — everything derived from the scale factor
  const tR     = TABLE_RADIUS * scale;
  const cR     = CHAIR_RADIUS * scale;
  const cOrbit = tR + 9 * scale + cR;
  const box    = BOX * scale;

  const totalSeats = guests.reduce((s, g) => s + g.party_size, 0);
  const isOverCap = totalSeats > TABLE_CAPACITY;
  const isFull = totalSeats === TABLE_CAPACITY;

  // Auto-detect dominant side from guest composition
  const brideSeats = guests
    .filter(g => g.side?.toLowerCase().includes("bride"))
    .reduce((s, g) => s + g.party_size, 0);
  const groomSeats = guests
    .filter(g => g.side?.toLowerCase().includes("groom"))
    .reduce((s, g) => s + g.party_size, 0);
  const autoSide =
    guests.length === 0 ? null
    : brideSeats > groomSeats ? "bride"
    : groomSeats > brideSeats ? "groom"
    : "mixed";
  // Manual override wins when set
  const dominantSide = manualSide ?? autoSide;

  const { isOver: isDragOver, setNodeRef } = useDroppable({
    id: `table::${name}`,
    data: { type: "table", tableName: name },
  });

  // Pointer-event drag state (for repositioning — independent of @dnd-kit)
  const draggingRef = useRef(false);
  const movedRef    = useRef(false);
  const startClient = useRef<Pos>({ x: 0, y: 0 });
  const startPos    = useRef<Pos>({ x: 0, y: 0 });
  const lastPos     = useRef<Pos>(position);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    movedRef.current    = false;
    startClient.current = { x: e.clientX, y: e.clientY };
    startPos.current    = { ...position };
    lastPos.current     = { ...position };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - startClient.current.x;
    const dy = e.clientY - startClient.current.y;
    if (!movedRef.current && Math.hypot(dx, dy) > 5) movedRef.current = true;
    if (!movedRef.current) return;
    const next: Pos = {
      x: Math.round(Math.max(box / 2, Math.min(HALL_W - box / 2, startPos.current.x + dx))),
      y: Math.round(Math.max(box / 2, Math.min(HALL_H - box / 2, startPos.current.y + dy))),
    };
    lastPos.current = next;
    onReposition(name, next);
  };

  const handlePointerUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (movedRef.current) {
      onSavePosition(name, lastPos.current);
    } else {
      onSelect();
    }
  };

  // One chair per actual seat — dynamic count, no fixed maximum
  const chairs: GuestEntry[] = [];
  for (const g of guests) {
    for (let p = 0; p < g.party_size; p++) chairs.push(g);
  }
  const totalChairs = chairs.length;


  // Inline styles for full control — Tailwind classes can't express rich gradients + rings
  const tableBackground = isDragOver
    ? "radial-gradient(circle at 38% 35%, rgba(52,211,153,0.18) 0%, rgba(4,18,12,0.97) 100%)"
    : dominantSide === "bride"
    ? "radial-gradient(circle at 38% 35%, rgba(250,204,21,0.16) 0%, rgba(18,14,2,0.97) 100%)"
    : dominantSide === "groom"
    ? "radial-gradient(circle at 38% 35%, rgba(59,130,246,0.16) 0%, rgba(2,8,22,0.97) 100%)"
    : "radial-gradient(circle at 38% 35%, rgba(255,255,255,0.05) 0%, rgba(12,10,22,0.97) 100%)";

  const tableBoxShadow = isDragOver
    ? "0 0 0 2.5px rgba(52,211,153,0.7), 0 0 32px rgba(52,211,153,0.32)"
    : isOverCap
    ? "0 0 0 2.5px rgba(239,68,68,0.7), 0 0 24px rgba(239,68,68,0.32)"
    : isFull
    ? "0 0 0 2px rgba(250,204,21,0.55), 0 0 20px rgba(250,204,21,0.22)"
    : dominantSide === "bride"
    ? "0 0 0 2.5px rgba(250,204,21,0.65), 0 0 30px rgba(250,204,21,0.28)"
    : dominantSide === "groom"
    ? "0 0 0 2.5px rgba(59,130,246,0.65), 0 0 30px rgba(59,130,246,0.28)"
    : "0 0 0 1px rgba(255,255,255,0.12)";

  return (
    <div
      ref={setNodeRef}
      className="absolute overflow-visible"
      style={{
        width: box,
        height: box,
        left: position.x - box / 2,
        top:  position.y - box / 2,
        zIndex: isDragOver ? 20 : 2,
      }}
    >
      {/* Chair dots */}
      {chairs.map((g, i) => (
        <ChairDot
          key={i}
          index={i}
          total={totalChairs}
          side={g.side}
          guestName={g.full_name}
          cR={cR}
          cOrbit={cOrbit}
          box={box}
        />
      ))}

      {/* Table circle — drag to reposition, click to open detail */}
      <div
        className="absolute rounded-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none"
        style={{
          width:  tR * 2,
          height: tR * 2,
          left:   box / 2 - tR,
          top:    box / 2 - tR,
          background: tableBackground,
          boxShadow: tableBoxShadow,
          backdropFilter: "blur(8px)",
          transition: "box-shadow 0.25s ease, background 0.25s ease",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span
          className="font-serif text-white/85 text-center leading-tight pointer-events-none px-1"
          style={{ fontSize: Math.max(7, 10 * scale), maxWidth: tR * 1.4, wordBreak: "break-word" }}
        >
          {name}
        </span>
        <span
          className={`mt-0.5 pointer-events-none font-semibold ${
            isOverCap ? "text-red-400" : isFull ? "text-yellow-300" : "text-white/35"
          }`}
          style={{ fontSize: Math.max(6, 8 * scale) }}
        >
          {totalSeats}/{TABLE_CAPACITY}
        </span>
        {dominantSide && dominantSide !== "mixed" && (
          <span
            className={`mt-0.5 pointer-events-none font-bold tracking-widest ${
              dominantSide === "bride" ? "text-yellow-400" : "text-blue-400"
            }`}
            style={{ fontSize: Math.max(5, 7 * scale) }}
          >
            {dominantSide === "bride" ? "♡" : "◇"}
            {scale >= 0.75 ? (dominantSide === "bride" ? " BRIDE" : " GROOM") : ""}
          </span>
        )}
      </div>

    </div>
  );
};

// ─── GuestItem (draggable panel row) ──────────────────────────────────────────

const GuestItem = ({ guest }: { guest: GuestEntry }) => {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `guest::${guest.id}`,
    data: { type: "guest", guestId: guest.id },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`px-2.5 py-2 rounded-lg bg-white/[0.05] border border-white/10 border-l-2
        ${sideAccentClass(guest.side)} cursor-grab active:cursor-grabbing select-none touch-none
        transition-opacity duration-150 ${isDragging ? "opacity-20" : "hover:bg-white/[0.09]"}`}
    >
      <p className="text-xs text-white/90 font-medium truncate leading-tight">{guest.full_name}</p>
      {guest.party_size > 1 && (
        <p className="text-[10px] text-white/40 leading-tight mt-0.5">Party of {guest.party_size}</p>
      )}
    </div>
  );
};

// ─── HallView ─────────────────────────────────────────────────────────────────

interface HallViewProps {
  tableMap: Map<string, GuestEntry[]>;
  unassigned: GuestEntry[];
  allTableNames: string[];
  onAssignGuest: (guestId: string, tableName: string | null) => Promise<void>;
  tableSides: Record<string, "bride" | "groom">;
  onSetTableSide: (tableName: string, side: "bride" | "groom" | null) => void;
}

const HallView = ({ tableMap, unassigned, allTableNames, onAssignGuest, tableSides, onSetTableSide }: HallViewProps) => {
  const [positions, setPositions] = useState<Record<string, Pos>>(() =>
    loadPositions(allTableNames)
  );
  const [activeId,      setActiveId]      = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [movingGuest,   setMovingGuest]   = useState<GuestEntry | null>(null);
  const [moveInput,     setMoveInput]     = useState("");
  const [isSaving,      setIsSaving]      = useState(false);
  const [tableScale,    setTableScale]    = useState<number>(() => {
    try {
      const raw = localStorage.getItem("wedding-hall-scale-v1");
      return raw ? parseFloat(raw) : 1.0;
    } catch { return 1.0; }
  });

  // Add positions for any new tables that appear after mount
  useEffect(() => {
    setPositions(prev => {
      const missing = allTableNames.filter(n => !prev[n]);
      if (missing.length === 0) return prev;
      const next = { ...prev };
      let idx = Object.keys(prev).length;
      for (const name of missing) {
        next[name] = DEFAULT_SLOTS[idx % DEFAULT_SLOTS.length];
        idx++;
      }
      return next;
    });
  }, [allTableNames]);

  const handleReposition = useCallback((name: string, pos: Pos) => {
    setPositions(prev => ({ ...prev, [name]: pos }));
  }, []);

  // Called on pointer-up: save the explicitly computed final position
  const handleSavePosition = useCallback((name: string, finalPos: Pos) => {
    setPositions(prev => {
      const updated = { ...prev, [name]: finalPos };
      persistPositions(updated);
      return updated;
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeGuest = useMemo(
    () => (!activeId ? null : unassigned.find(g => `guest::${g.id}` === activeId) ?? null),
    [activeId, unassigned]
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    if (active.data.current?.type !== "guest") return;
    if (over.data.current?.type  !== "table")  return;

    const guestId   = active.data.current.guestId as string;
    const tableName = over.data.current.tableName  as string;
    setIsSaving(true);
    try {
      await onAssignGuest(guestId, tableName);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveGuest = async () => {
    if (!movingGuest || !moveInput.trim()) return;
    setIsSaving(true);
    try {
      await onAssignGuest(movingGuest.id, moveInput.trim());
      setMovingGuest(null);
      setMoveInput("");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveFromTable = async (guestId: string) => {
    await onAssignGuest(guestId, null);
  };

  const selectedGuests = selectedTable ? (tableMap.get(selectedTable) ?? []) : [];

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3">

        {/* ── Unassigned guest panel ────────────────────────────────────── */}
        <div className="w-48 flex-shrink-0 flex flex-col">
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2 mt-1">
            <Users className="w-3 h-3" />
            Unassigned · {unassigned.length}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 max-h-[650px]">
            {unassigned.map(g => <GuestItem key={g.id} guest={g} />)}
            {unassigned.length === 0 && (
              <p className="text-[11px] text-white/25 italic text-center mt-8">
                All guests assigned ✓
              </p>
            )}
          </div>
          <p className="text-[9px] text-white/20 text-center mt-3 italic leading-snug">
            Drag a name onto<br />a table to assign
          </p>

          {/* Table size slider */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[8px] text-white/30 uppercase tracking-wider font-semibold">Table size</span>
              <span className="text-[8px] text-white/25">{Math.round(tableScale * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.3}
              step={0.05}
              value={tableScale}
              onChange={e => {
                const v = parseFloat(e.target.value);
                setTableScale(v);
                try { localStorage.setItem("wedding-hall-scale-v1", String(v)); } catch {}
              }}
              className="w-full h-1 rounded-full appearance-none cursor-pointer"
              style={{ accentColor: "rgba(139,92,246,0.8)", background: `linear-gradient(to right, rgba(139,92,246,0.6) 0%, rgba(139,92,246,0.6) ${((tableScale - 0.5) / 0.8) * 100}%, rgba(255,255,255,0.08) ${((tableScale - 0.5) / 0.8) * 100}%, rgba(255,255,255,0.08) 100%)` }}
            />
            <div className="flex justify-between text-[7px] text-white/15">
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>

          <div className="mt-3 space-y-2 text-[9px] text-white/20 leading-snug">
            <p className="text-white/25 font-semibold uppercase tracking-wider text-[8px]">Chairs</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70 flex-shrink-0" />
              Bride's side
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400/70 flex-shrink-0" />
              Groom's side
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60 flex-shrink-0" />
              Mutual
            </div>
            <p className="text-white/25 font-semibold uppercase tracking-wider text-[8px] pt-1">Tables</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-yellow-400/70 bg-yellow-950/50 flex-shrink-0" />
              Bride's table
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-400/70 bg-blue-950/50 flex-shrink-0" />
              Groom's table
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-white/25 bg-white/5 flex-shrink-0" />
              Mixed
            </div>
          </div>
        </div>

        {/* ── Hall canvas ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 overflow-auto rounded-xl">
          <div
            className="relative rounded-xl select-none"
            style={{
              width: HALL_W,
              height: HALL_H,
              background: "linear-gradient(160deg, #110f26 0%, #0c0a1e 55%, #0f0c22 100%)",
              boxShadow: "inset 0 0 140px rgba(80,50,180,0.12)",
            }}
          >
            {/* Floor grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.025] pointer-events-none rounded-xl"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px)," +
                  "linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />

            {/* Room border */}
            <div className="absolute inset-3 border border-white/[0.035] rounded-lg pointer-events-none" />

            {/* ── Sweetheart / Head Table ── */}
            <div
              className="absolute flex items-center justify-center rounded-xl border border-amber-400/20 pointer-events-none"
              style={{
                left: SWEETHEART.x,
                top: SWEETHEART.y,
                width: SWEETHEART.w,
                height: SWEETHEART.h,
                background:
                  "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(217,119,6,0.04) 100%)",
              }}
            >
              <span className="text-[9px] font-serif tracking-[0.18em] uppercase text-amber-300/55">
                ♡ Sweetheart Table
              </span>
            </div>
            {/* Two decorative chair dots flanking the sweetheart table */}
            {([-1, 1] as const).map(dir => (
              <div
                key={dir}
                className="absolute rounded-full bg-amber-400/35 border border-amber-300/25 pointer-events-none"
                style={{
                  width: 14,
                  height: 14,
                  left: SWEETHEART.x + SWEETHEART.w / 2 + dir * (SWEETHEART.w / 2 + 12) - 7,
                  top: SWEETHEART.y + SWEETHEART.h / 2 - 7,
                }}
              />
            ))}

            {/* ── Dance Floor ── */}
            <div
              className="absolute flex items-center justify-center rounded-2xl border border-white/[0.05] pointer-events-none"
              style={{
                left: DANCE_FLOOR.x,
                top: DANCE_FLOOR.y,
                width: DANCE_FLOOR.w,
                height: DANCE_FLOOR.h,
                background:
                  "radial-gradient(ellipse at center, rgba(255,210,100,0.03) 0%, rgba(100,70,200,0.05) 80%, transparent 100%)",
              }}
            >
              <span className="text-[9px] tracking-[0.22em] uppercase text-white/10 font-medium pointer-events-none">
                Dance Floor
              </span>
            </div>

            {/* ── Entrance marker ── */}
            <div
              className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none"
              style={{ bottom: 14 }}
            >
              <div className="w-20 h-px bg-white/[0.07]" />
              <span className="text-[8px] tracking-[0.22em] uppercase text-white/12">
                Entrance
              </span>
            </div>

            {/* Saving indicator */}
            {isSaving && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 text-[10px] text-white/40 pointer-events-none">
                <Loader2 className="w-3 h-3 animate-spin" />
                Saving…
              </div>
            )}

            {/* ── Tables ── */}
            {allTableNames.map(name => {
              const pos = positions[name] ?? DEFAULT_SLOTS[0];
              return (
                <HallTable
                  key={name}
                  name={name}
                  guests={tableMap.get(name) ?? []}
                  position={pos}
                  manualSide={tableSides[name]}
                  onReposition={handleReposition}
                  onSavePosition={handleSavePosition}
                  onSelect={() => setSelectedTable(name)}
                  scale={tableScale}
                />
              );
            })}

            {/* Empty hall nudge */}
            {allTableNames.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm text-white/20 italic">
                  No tables yet — assign a guest to a table to see it appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Drag overlay (ghost label following cursor) ──────────────────── */}
      <DragOverlay dropAnimation={null}>
        {activeGuest && (
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-medium pointer-events-none whitespace-nowrap
              border border-white/10 border-l-2 bg-background/90 backdrop-blur-sm shadow-xl
              ${sideAccentClass(activeGuest.side)}`}
          >
            {activeGuest.full_name}
            {activeGuest.party_size > 1 && (
              <span className="text-white/50 ml-1">(party of {activeGuest.party_size})</span>
            )}
          </div>
        )}
      </DragOverlay>

      {/* ── Table detail dialog ──────────────────────────────────────────── */}
      <Dialog
        open={!!selectedTable && !movingGuest}
        onOpenChange={open => !open && setSelectedTable(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">{selectedTable}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {selectedGuests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6 italic">
                No guests assigned to this table
              </p>
            )}
            {selectedGuests.map(g => (
              <div
                key={g.id}
                className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-background/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm text-foreground truncate">{g.full_name}</p>
                    <SideBadge side={g.side} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {g.party_size > 1 ? `Party of ${g.party_size}` : "1 seat"}
                    {g.checked_in ? " · ✓ checked in" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setMovingGuest(g); setMoveInput(""); }}
                    className="text-xs text-primary hover:underline"
                  >
                    Move
                  </button>
                  <button
                    onClick={() => handleRemoveFromTable(g.id)}
                    className="text-destructive/70 hover:text-destructive"
                    aria-label={`Remove ${g.full_name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* ── Designation ── */}
          <div className="border-t border-border/30 pt-3 mt-1">
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-semibold mb-2">
              Designate table for
            </p>
            <div className="flex gap-2">
              {(["bride", "groom"] as const).map(s => {
                const active = selectedTable ? tableSides[selectedTable] === s : false;
                return (
                  <button
                    key={s}
                    onClick={() => selectedTable && onSetTableSide(selectedTable, active ? null : s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all duration-200 ${
                      active
                        ? s === "bride"
                          ? "bg-yellow-400/15 border-yellow-400 text-yellow-400 shadow-[0_0_14px_rgba(250,204,21,0.3)]"
                          : "bg-blue-500/15 border-blue-500 text-blue-400 shadow-[0_0_14px_rgba(59,130,246,0.3)]"
                        : "border-border/40 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {s === "bride" ? "♡ Bride's side" : "◇ Groom's side"}
                  </button>
                );
              })}
              {selectedTable && tableSides[selectedTable] && (
                <button
                  onClick={() => selectedTable && onSetTableSide(selectedTable, null)}
                  className="px-3 py-2 rounded-xl text-xs border border-border/40 text-muted-foreground hover:text-foreground transition-colors"
                  title="Reset to auto-detect from guests"
                >
                  Auto
                </button>
              )}
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground/40 text-center mt-2 italic">
            Drag the table circle to reposition it
          </p>
        </DialogContent>
      </Dialog>

      {/* ── Move guest dialog ────────────────────────────────────────────── */}
      <Dialog open={!!movingGuest} onOpenChange={open => !open && setMovingGuest(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Move {movingGuest?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Input
              placeholder="Table name (e.g. Table 3)"
              value={moveInput}
              onChange={e => setMoveInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && moveInput.trim()) handleMoveGuest(); }}
              className="bg-background/50 border-border/50 rounded-xl"
              autoFocus
            />
            <div className="flex flex-wrap gap-1.5">
              {allTableNames
                .filter(n => n !== movingGuest?.table_assignment)
                .map(t => (
                  <button
                    key={t}
                    onClick={() => setMoveInput(t)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      moveInput === t
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {t}
                  </button>
                ))}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { handleRemoveFromTable(movingGuest!.id); setMovingGuest(null); }}
              className="text-muted-foreground mr-auto text-xs"
            >
              Remove from table
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMovingGuest(null)}
              className="border-border/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMoveGuest}
              disabled={isSaving || !moveInput.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
};

export default HallView;
