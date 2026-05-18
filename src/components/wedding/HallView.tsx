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
const TABLE_RADIUS = 44;       // px — inner circle radius
const CHAIR_RADIUS = 10;       // px — each chair dot radius
const CHAIR_ORBIT = TABLE_RADIUS + 8 + CHAIR_RADIUS; // 62px from table centre
const BOX = 160;               // bounding box that contains table + all chairs

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

const chairFill = (side: string | null) => {
  if (!side) return "bg-white/[0.07] border border-white/10";
  const l = side.toLowerCase();
  if (l.includes("bride")) return "bg-purple-400/70 border border-purple-300/40 shadow-[0_0_5px_rgba(192,132,252,0.45)]";
  if (l.includes("groom")) return "bg-blue-400/70 border border-blue-300/40 shadow-[0_0_5px_rgba(147,197,253,0.45)]";
  return "bg-amber-400/60 border border-amber-300/35";
};

const sideAccentClass = (side: string | null) => {
  if (!side) return "border-l-white/20";
  const l = side.toLowerCase();
  if (l.includes("bride")) return "border-l-purple-400";
  if (l.includes("groom")) return "border-l-blue-400";
  return "border-l-amber-400/70";
};

// ─── SideBadge ────────────────────────────────────────────────────────────────

const SideBadge = ({ side }: { side: string | null }) => {
  if (!side) return null;
  const l = side.toLowerCase();
  const cls = l.includes("bride")
    ? "bg-purple-500/20 text-purple-400"
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

const ChairDot = ({
  index, filled, side, guestName,
}: {
  index: number; filled: boolean; side?: string | null; guestName?: string;
}) => {
  const angle = (index / TABLE_CAPACITY) * 2 * Math.PI - Math.PI / 2;
  const cx = Math.cos(angle) * CHAIR_ORBIT + BOX / 2;
  const cy = Math.sin(angle) * CHAIR_ORBIT + BOX / 2;

  return (
    <div
      title={filled && guestName ? guestName : "Empty seat"}
      className={`absolute rounded-full transition-colors duration-200 pointer-events-none ${
        filled ? chairFill(side ?? null) : "bg-white/[0.04] border border-white/[0.08] border-dashed"
      }`}
      style={{
        width: CHAIR_RADIUS * 2,
        height: CHAIR_RADIUS * 2,
        left: cx - CHAIR_RADIUS,
        top: cy - CHAIR_RADIUS,
      }}
    />
  );
};

// ─── HallTable ────────────────────────────────────────────────────────────────

const HallTable = ({
  name, guests, position, onReposition, onSavePosition, onSelect,
}: {
  name: string;
  guests: GuestEntry[];
  position: Pos;
  onReposition: (name: string, pos: Pos) => void;
  onSavePosition: (name: string, pos: Pos) => void;
  onSelect: () => void;
}) => {
  const totalSeats = guests.reduce((s, g) => s + g.party_size, 0);
  const isOverCap = totalSeats > TABLE_CAPACITY;
  const isFull = totalSeats === TABLE_CAPACITY;

  // Determine which side dominates this table by seat count
  const brideSeats = guests
    .filter(g => g.side?.toLowerCase().includes("bride"))
    .reduce((s, g) => s + g.party_size, 0);
  const groomSeats = guests
    .filter(g => g.side?.toLowerCase().includes("groom"))
    .reduce((s, g) => s + g.party_size, 0);
  const dominantSide =
    guests.length === 0 ? null
    : brideSeats > groomSeats ? "bride"
    : groomSeats > brideSeats ? "groom"
    : "mixed";

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
      x: Math.round(Math.max(BOX / 2, Math.min(HALL_W - BOX / 2, startPos.current.x + dx))),
      y: Math.round(Math.max(BOX / 2, Math.min(HALL_H - BOX / 2, startPos.current.y + dy))),
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

  // Expand guests by party_size to fill chair slots
  const chairs: (GuestEntry | null)[] = Array(TABLE_CAPACITY).fill(null);
  let seat = 0;
  for (const g of guests) {
    for (let p = 0; p < g.party_size && seat < TABLE_CAPACITY; p++, seat++) {
      chairs[seat] = g;
    }
  }

  const circleBorder = isDragOver
    ? "border-emerald-400/70"
    : isOverCap
    ? "border-red-500/60"
    : isFull
    ? "border-yellow-500/50"
    : dominantSide === "bride"
    ? "border-purple-400/60"
    : dominantSide === "groom"
    ? "border-blue-400/60"
    : dominantSide === "mixed"
    ? "border-white/25"
    : "border-white/10";

  const circleBg = isDragOver
    ? "bg-emerald-950/50"
    : dominantSide === "bride"
    ? "bg-purple-950/40"
    : dominantSide === "groom"
    ? "bg-blue-950/40"
    : "bg-white/[0.035]";

  const glow = isDragOver
    ? "shadow-[0_0_24px_rgba(52,211,153,0.22)]"
    : isOverCap
    ? "shadow-[0_0_16px_rgba(239,68,68,0.18)]"
    : dominantSide === "bride"
    ? "shadow-[0_0_18px_rgba(168,85,247,0.25)]"
    : dominantSide === "groom"
    ? "shadow-[0_0_18px_rgba(96,165,250,0.25)]"
    : "";

  return (
    <div
      ref={setNodeRef}
      className="absolute"
      style={{
        width: BOX,
        height: BOX,
        left: position.x - BOX / 2,
        top:  position.y - BOX / 2,
        zIndex: isDragOver ? 20 : 2,
        transition: draggingRef.current ? "none" : undefined,
      }}
    >
      {/* Chair dots (purely visual, pointer-events-none) */}
      {chairs.map((g, i) => (
        <ChairDot
          key={i}
          index={i}
          filled={g !== null}
          side={g?.side}
          guestName={g?.full_name}
        />
      ))}

      {/* Table circle — drag handle + click opener */}
      <div
        className={`absolute rounded-full border-2 flex flex-col items-center justify-center
          transition-all duration-200 cursor-grab active:cursor-grabbing select-none
          ${circleBorder} ${circleBg} ${glow}`}
        style={{
          width:  TABLE_RADIUS * 2,
          height: TABLE_RADIUS * 2,
          left:   BOX / 2 - TABLE_RADIUS,
          top:    BOX / 2 - TABLE_RADIUS,
          backdropFilter: "blur(6px)",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span
          className="text-[10px] font-serif text-white/80 text-center leading-tight pointer-events-none px-2"
          style={{ maxWidth: TABLE_RADIUS * 1.3, wordBreak: "break-word" }}
        >
          {name}
        </span>
        <span
          className={`text-[8px] mt-0.5 pointer-events-none font-medium ${
            isOverCap ? "text-red-400" : isFull ? "text-yellow-400" : "text-white/30"
          }`}
        >
          {totalSeats}/{TABLE_CAPACITY}
        </span>
        {dominantSide && dominantSide !== "mixed" && (
          <span
            className={`text-[7px] mt-0.5 pointer-events-none uppercase tracking-widest font-semibold ${
              dominantSide === "bride" ? "text-purple-400/70" : "text-blue-400/70"
            }`}
          >
            {dominantSide === "bride" ? "♡ bride" : "◇ groom"}
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
}

const HallView = ({ tableMap, unassigned, allTableNames, onAssignGuest }: HallViewProps) => {
  const [positions, setPositions] = useState<Record<string, Pos>>(() =>
    loadPositions(allTableNames)
  );
  const [activeId,      setActiveId]      = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [movingGuest,   setMovingGuest]   = useState<GuestEntry | null>(null);
  const [moveInput,     setMoveInput]     = useState("");
  const [isSaving,      setIsSaving]      = useState(false);

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
          <div className="mt-3 space-y-2 text-[9px] text-white/20 leading-snug">
            <p className="text-white/25 font-semibold uppercase tracking-wider text-[8px]">Chairs</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400/70 flex-shrink-0" />
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
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-white/15 border-dashed flex-shrink-0" />
              Empty seat
            </div>
            <p className="text-white/25 font-semibold uppercase tracking-wider text-[8px] pt-1">Tables</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-purple-400/60 bg-purple-950/40 flex-shrink-0" />
              Bride's table
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-400/60 bg-blue-950/40 flex-shrink-0" />
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
                  onReposition={handleReposition}
                  onSavePosition={handleSavePosition}
                  onSelect={() => setSelectedTable(name)}
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
          <p className="text-[10px] text-muted-foreground/50 text-center pt-1 italic">
            Drag the table circle on the hall map to reposition it
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
