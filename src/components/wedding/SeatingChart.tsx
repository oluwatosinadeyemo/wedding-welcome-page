import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, MapPin, Loader2, X, Pencil, Check, Download, Search } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import HallView from "./HallView";

const TABLE_CAPACITY = 10;

interface GuestEntry {
  id: string;
  full_name: string;
  party_size: number;
  side: string | null;
  table_assignment: string | null;
  checked_in: boolean;
  rsvps: { attending: string }[] | null;
}

// ─── SideBadge ───────────────────────────────────────────────────────────────
const SideBadge = ({ side }: { side: string | null }) => {
  if (!side) return null;
  const lower = side.toLowerCase();
  const style = lower.includes("bride")
    ? { background: "rgba(250,204,21,0.15)", color: "#fcd34d", border: "1px solid rgba(250,204,21,0.3)" }
    : lower.includes("groom")
    ? { background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "1px solid rgba(59,130,246,0.3)" }
    : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" };
  return (
    <span style={{ ...style, fontSize: 9, padding: "2px 7px", borderRadius: 9999, fontWeight: 600, flexShrink: 0 }}>
      {side}
    </span>
  );
};

// ─── CapacityBar ─────────────────────────────────────────────────────────────
const CapacityBar = ({ seats, side }: { seats: number; side?: string | null }) => {
  const pct = Math.min(100, (seats / TABLE_CAPACITY) * 100);
  const isOver = seats > TABLE_CAPACITY;
  const isFull = seats === TABLE_CAPACITY;
  const barColor = isOver ? "#ef4444" : side === "bride" ? "#facc15" : side === "groom" ? "#3b82f6" : seats >= TABLE_CAPACITY * 0.8 ? "#eab308" : "#8b5cf6";
  const textColor = isOver ? "#f87171" : isFull ? (side === "bride" ? "#fcd34d" : side === "groom" ? "#93c5fd" : "#a78bfa") : "rgba(255,255,255,0.35)";
  return (
    <div style={{ marginBottom: 12, marginTop: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
        <span style={{ color: textColor, fontWeight: isOver || isFull ? 600 : 400 }}>
          {seats} / {TABLE_CAPACITY} seats{isOver ? " · over capacity" : isFull ? " · full" : ""}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 9999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 9999, width: `${pct}%`, background: barColor, transition: "width 0.3s ease", boxShadow: `0 0 6px ${barColor}80` }} />
      </div>
    </div>
  );
};

// ─── DraggableGuestPill ───────────────────────────────────────────────────────
const DraggableGuestPill = ({
  guest,
  isSelected,
  onToggleSelect,
  onAssignClick,
}: {
  guest: GuestEntry;
  isSelected: boolean;
  onToggleSelect: () => void;
  onAssignClick: () => void;
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: guest.id });
  const lower = guest.side?.toLowerCase() ?? "";
  const isBride = lower.includes("bride");
  const isGroom = lower.includes("groom");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isDragging ? 0.3 : 1, transition: "opacity 0.15s" }}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        style={{ width: 13, height: 13, flexShrink: 0, cursor: "pointer", accentColor: isBride ? "#facc15" : isGroom ? "#3b82f6" : "#a78bfa" }}
        aria-label={`Select ${guest.full_name}`}
      />
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className="group/pill"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          background: isBride ? "rgba(250,204,21,0.10)" : isGroom ? "rgba(59,130,246,0.10)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${isBride ? "rgba(250,204,21,0.28)" : isGroom ? "rgba(59,130,246,0.28)" : "rgba(255,255,255,0.10)"}`,
          borderRadius: 9999, padding: "5px 11px",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
          color: isBride ? "#fde68a" : isGroom ? "#93c5fd" : "#e2e8f0",
          fontSize: 12, fontWeight: 500,
          boxShadow: isBride ? "0 1px 8px rgba(250,204,21,0.08)" : isGroom ? "0 1px 8px rgba(59,130,246,0.08)" : "none",
          position: "relative",
        }}
      >
        <span style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{guest.full_name}</span>
        {guest.party_size > 1 && <span style={{ opacity: 0.5, fontSize: 10 }}>×{guest.party_size}</span>}
        <button
          className="opacity-0 group-hover/pill:opacity-100 transition-opacity"
          style={{ fontSize: 9, padding: "1px 6px", borderRadius: 9999, border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.07)", cursor: "pointer", flexShrink: 0 }}
          onClick={(e) => { e.stopPropagation(); onAssignClick(); }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          Assign
        </button>
      </div>
    </div>
  );
};

// ─── GuestPillOverlay ─────────────────────────────────────────────────────────
const GuestPillOverlay = ({ guest }: { guest: GuestEntry }) => {
  const lower = guest.side?.toLowerCase() ?? "";
  const isBride = lower.includes("bride");
  const isGroom = lower.includes("groom");
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: isBride ? "linear-gradient(90deg,rgba(250,204,21,0.22),rgba(180,130,0,0.14))" : isGroom ? "linear-gradient(90deg,rgba(59,130,246,0.22),rgba(29,78,216,0.14))" : "rgba(255,255,255,0.14)",
      border: `1.5px solid ${isBride ? "rgba(250,204,21,0.55)" : isGroom ? "rgba(59,130,246,0.55)" : "rgba(255,255,255,0.25)"}`,
      borderRadius: 9999, padding: "7px 16px",
      fontSize: 13, fontWeight: 700,
      color: isBride ? "#fde68a" : isGroom ? "#93c5fd" : "#f1f5f9",
      boxShadow: isBride ? "0 6px 24px rgba(250,204,21,0.25),0 2px 10px rgba(0,0,0,0.5)" : isGroom ? "0 6px 24px rgba(59,130,246,0.25),0 2px 10px rgba(0,0,0,0.5)" : "0 6px 24px rgba(0,0,0,0.4)",
      backdropFilter: "blur(12px)", cursor: "grabbing", whiteSpace: "nowrap",
    }}>
      {guest.full_name}
      {guest.party_size > 1 && <span style={{ opacity: 0.6, fontSize: 11, marginLeft: 4 }}>×{guest.party_size}</span>}
    </div>
  );
};

// ─── DroppableTableCard ───────────────────────────────────────────────────────
interface TableCardProps {
  tableName: string;
  tableGuests: GuestEntry[];
  tableSide: "bride" | "groom" | "mixed" | null;
  tableSideOverride: "bride" | "groom" | undefined;
  visibleGuests: GuestEntry[];
  seats: number;
  isRenaming: boolean;
  renameInput: string;
  onRenameChange: (v: string) => void;
  onRenameConfirm: () => void;
  onRenameCancel: () => void;
  onStartRename: () => void;
  onOpenAssign: (g: GuestEntry) => void;
  onRemove: (g: GuestEntry) => void;
  onSetSide: (side: "bride" | "groom" | null) => void;
  globalSearch: string;
}

const DroppableTableCard = ({
  tableName, tableGuests, tableSide, tableSideOverride, visibleGuests, seats,
  isRenaming, renameInput, onRenameChange, onRenameConfirm, onRenameCancel,
  onStartRename, onOpenAssign, onRemove, onSetSide, globalSearch,
}: TableCardProps) => {
  const { isOver, setNodeRef } = useDroppable({ id: tableName });

  const bg = isOver
    ? "linear-gradient(145deg,#051a0c 0%,#030f08 100%)"
    : tableSide === "bride"
    ? "linear-gradient(145deg,#1c1300 0%,#130d00 55%,#0e0900 100%)"
    : tableSide === "groom"
    ? "linear-gradient(145deg,#060e1e 0%,#030a14 55%,#020710 100%)"
    : "linear-gradient(145deg,#0e0e1c 0%,#08080f 100%)";

  const borderColor = isOver ? "rgba(52,211,153,0.75)" : tableSide === "bride" ? "rgba(250,204,21,0.38)" : tableSide === "groom" ? "rgba(59,130,246,0.38)" : "rgba(255,255,255,0.07)";
  const shadow = isOver
    ? "0 0 0 2px rgba(52,211,153,0.65),0 0 40px rgba(52,211,153,0.22),inset 0 0 24px rgba(52,211,153,0.04)"
    : tableSide === "bride"
    ? "0 0 0 1.5px rgba(250,204,21,0.32),0 6px 36px rgba(250,204,21,0.10),0 2px 16px rgba(0,0,0,0.7)"
    : tableSide === "groom"
    ? "0 0 0 1.5px rgba(59,130,246,0.32),0 6px 36px rgba(59,130,246,0.10),0 2px 16px rgba(0,0,0,0.7)"
    : "0 0 0 1px rgba(255,255,255,0.06),0 4px 20px rgba(0,0,0,0.5)";

  const accentGrad = isOver
    ? "linear-gradient(90deg,rgba(52,211,153,0.9) 0%,rgba(52,211,153,0.4) 55%,transparent 100%)"
    : tableSide === "bride"
    ? "linear-gradient(90deg,rgba(250,204,21,0.9) 0%,rgba(250,204,21,0.35) 55%,transparent 100%)"
    : "linear-gradient(90deg,rgba(59,130,246,0.9) 0%,rgba(59,130,246,0.35) 55%,transparent 100%)";

  const nameColor = tableSide === "bride" ? "#fde68a" : tableSide === "groom" ? "#93c5fd" : "#f1f5f9";
  const nameShadow = tableSide === "bride" ? "0 0 18px rgba(250,204,21,0.28)" : tableSide === "groom" ? "0 0 18px rgba(59,130,246,0.28)" : undefined;
  const subColor = tableSide === "bride" ? "rgba(253,230,138,0.42)" : tableSide === "groom" ? "rgba(147,197,253,0.42)" : "rgba(255,255,255,0.28)";

  const rowBg = tableSide === "bride" ? "rgba(250,204,21,0.05)" : tableSide === "groom" ? "rgba(59,130,246,0.05)" : "rgba(255,255,255,0.03)";
  const rowBgHover = tableSide === "bride" ? "rgba(250,204,21,0.09)" : tableSide === "groom" ? "rgba(59,130,246,0.09)" : "rgba(255,255,255,0.06)";
  const moveColor = tableSide === "bride" ? "#fcd34d" : tableSide === "groom" ? "#93c5fd" : "rgba(255,255,255,0.5)";

  const btnActive = (s: "bride" | "groom") => tableSideOverride === s;

  return (
    <div
      ref={setNodeRef}
      className="group"
      style={{ background: bg, border: `1.5px solid ${borderColor}`, boxShadow: shadow, borderRadius: 16, padding: 16, position: "relative", overflow: "hidden", transition: "border-color 0.15s ease,box-shadow 0.15s ease" }}
    >
      {/* Top accent bar */}
      {(isOver || tableSide === "bride" || tableSide === "groom") && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accentGrad }} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
        {isRenaming ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 0 }}>
            <Input
              value={renameInput}
              onChange={(e) => onRenameChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onRenameConfirm(); if (e.key === "Escape") onRenameCancel(); }}
              className="h-7 text-sm rounded-lg px-2"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", color: "#f1f5f9" }}
              autoFocus
            />
            <button onClick={onRenameConfirm} style={{ color: "#34d399", flexShrink: 0 }}><Check className="w-4 h-4" /></button>
            <button onClick={onRenameCancel} style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }}><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h3 className="font-serif" style={{ fontSize: 18, color: nameColor, textShadow: nameShadow, margin: 0, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                {tableName}
              </h3>
              {tableSide === "bride" && (
                <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 9999, fontWeight: 700, background: "rgba(250,204,21,0.12)", border: "1px solid rgba(250,204,21,0.35)", color: "#fcd34d", letterSpacing: "0.05em", flexShrink: 0 }}>♡ BRIDE</span>
              )}
              {tableSide === "groom" && (
                <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 9999, fontWeight: 700, background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)", color: "#93c5fd", letterSpacing: "0.05em", flexShrink: 0 }}>◇ GROOM</span>
              )}
            </div>
            <p style={{ fontSize: 11, color: subColor, marginTop: 2 }}>
              {tableGuests.length} guest{tableGuests.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
        {!isRenaming && (
          <button
            onClick={onStartRename}
            className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
            style={{ color: moveColor, marginTop: 2, flexShrink: 0 }}
            aria-label={`Rename ${tableName}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <CapacityBar seats={seats} side={tableSide} />

      {/* Drop indicator */}
      {isOver && (
        <div style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "7px 12px", borderRadius: 10, background: "rgba(52,211,153,0.07)", border: "1px dashed rgba(52,211,153,0.45)" }}>
          <span style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 700, letterSpacing: "0.06em" }}>↓ DROP TO ASSIGN</span>
        </div>
      )}

      {/* Guest rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {visibleGuests.map((g) => (
          <div
            key={g.id}
            className="group/row"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "7px 10px", borderRadius: 10, background: rowBg, transition: "background 0.15s" }}
            onMouseEnter={e => (e.currentTarget.style.background = rowBgHover)}
            onMouseLeave={e => (e.currentTarget.style.background = rowBg)}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <p style={{ fontSize: 13, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{g.full_name}</p>
                <SideBadge side={g.side} />
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.32)", marginTop: 2 }}>
                {g.party_size > 1 ? `Party of ${g.party_size}` : "1 seat"}
                {g.checked_in ? " · ✓ checked in" : ""}
              </p>
            </div>
            <div className="opacity-0 group-hover/row:opacity-100 transition-opacity" style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={() => onOpenAssign(g)} style={{ fontSize: 12, color: moveColor, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Move</button>
              <button onClick={() => onRemove(g)} style={{ color: "#f87171", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }} aria-label="Remove">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {globalSearch && visibleGuests.length === 0 && (
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "4px 0", fontStyle: "italic" }}>No match in this table</p>
        )}
      </div>

      {/* Designation controls */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", flexShrink: 0, marginRight: 2 }}>Designate:</span>
        {(["bride", "groom"] as const).map(s => (
          <button
            key={s}
            onClick={() => onSetSide(btnActive(s) ? null : s)}
            style={{
              fontSize: 9, padding: "3px 9px", borderRadius: 9999, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${btnActive(s) ? (s === "bride" ? "rgba(250,204,21,0.6)" : "rgba(59,130,246,0.6)") : "rgba(255,255,255,0.14)"}`,
              background: btnActive(s) ? (s === "bride" ? "rgba(250,204,21,0.14)" : "rgba(59,130,246,0.14)") : "transparent",
              color: btnActive(s) ? (s === "bride" ? "#fcd34d" : "#93c5fd") : "rgba(255,255,255,0.38)",
              transition: "all 0.15s ease",
            }}
          >
            {s === "bride" ? "♡ Bride" : "◇ Groom"}
          </button>
        ))}
        {tableSideOverride && (
          <button
            onClick={() => onSetSide(null)}
            style={{ marginLeft: "auto", fontSize: 9, padding: "3px 9px", borderRadius: 9999, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "rgba(255,255,255,0.32)", cursor: "pointer" }}
          >
            Auto
          </button>
        )}
      </div>
    </div>
  );
};

// ─── SeatingChart ─────────────────────────────────────────────────────────────
const SeatingChart = () => {
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState<GuestEntry | null>(null);
  const [assignInput, setAssignInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [renamingTable, setRenamingTable] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [selectedUnassigned, setSelectedUnassigned] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignInput, setBulkAssignInput] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "hall">("list");
  const [draggingGuestId, setDraggingGuestId] = useState<string | null>(null);
  const [tableSides, setTableSides] = useState<Record<string, "bride" | "groom">>(() => {
    try {
      const raw = localStorage.getItem("wedding-table-sides-v1");
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const { toast } = useToast();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const draggingGuest = draggingGuestId ? guests.find(g => g.id === draggingGuestId) ?? null : null;

  const setTableSideOverride = useCallback(
    (tableName: string, side: "bride" | "groom" | null) => {
      setTableSides(prev => {
        const next = { ...prev };
        if (side === null) delete next[tableName];
        else next[tableName] = side;
        localStorage.setItem("wedding-table-sides-v1", JSON.stringify(next));
        return next;
      });
    }, []
  );

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("guests" as any) as any)
      .select("id, full_name, party_size, side, table_assignment, checked_in, rsvps(attending)")
      .order("full_name");
    if (data) setGuests(
      (data as GuestEntry[]).filter((g) => g.rsvps?.[0]?.attending !== "no")
    );
    setLoading(false);
  }, []);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);

  useEffect(() => {
    const channel = supabase
      .channel("guests-seating")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "guests" }, () => fetchGuests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchGuests]);

  const tableMap = useMemo(() => {
    const map = new Map<string, GuestEntry[]>();
    for (const g of guests) {
      if (g.table_assignment) {
        if (!map.has(g.table_assignment)) map.set(g.table_assignment, []);
        map.get(g.table_assignment)!.push(g);
      }
    }
    return map;
  }, [guests]);

  const unassigned = useMemo(() => guests.filter((g) => !g.table_assignment), [guests]);

  const allTableNames = useMemo(
    () => Array.from(tableMap.keys()).sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ""), 10);
      const nb = parseInt(b.replace(/\D/g, ""), 10);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    }),
    [tableMap]
  );

  const totalSeats = (gs: GuestEntry[]) => gs.reduce((s, g) => s + g.party_size, 0);
  const searchLower = globalSearch.toLowerCase();
  const filteredTableNames = globalSearch
    ? allTableNames.filter(name => name.toLowerCase().includes(searchLower) || tableMap.get(name)!.some(g => g.full_name.toLowerCase().includes(searchLower)))
    : allTableNames;
  const getVisibleGuests = (gs: GuestEntry[]) => globalSearch ? gs.filter(g => g.full_name.toLowerCase().includes(searchLower)) : gs;
  const filteredUnassigned = globalSearch ? unassigned.filter(g => g.full_name.toLowerCase().includes(searchLower)) : unassigned;

  const brideCount = useMemo(() => guests.filter(g => g.side?.toLowerCase().includes("bride")).length, [guests]);
  const groomCount = useMemo(() => guests.filter(g => g.side?.toLowerCase().includes("groom")).length, [guests]);

  const openAssign = (guest: GuestEntry) => {
    setSelectedGuest(guest);
    setAssignInput(guest.table_assignment || "");
  };

  const handleAssign = async (tableValue?: string | null) => {
    if (!selectedGuest) return;
    setIsSaving(true);
    const newTable = tableValue !== undefined ? tableValue : assignInput.trim() || null;
    try {
      const { error } = await (supabase.from("guests" as any) as any)
        .update({ table_assignment: newTable }).eq("id", selectedGuest.id);
      if (error) throw error;
      setGuests(prev => prev.map(g => g.id === selectedGuest.id ? { ...g, table_assignment: newTable } : g));
      toast({ title: newTable ? `Assigned to ${newTable}` : "Removed from table" });
      setSelectedGuest(null);
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const handleRemoveInline = async (guest: GuestEntry) => {
    try {
      await (supabase.from("guests" as any) as any).update({ table_assignment: null }).eq("id", guest.id);
      setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, table_assignment: null } : g));
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRenameTable = async () => {
    const newName = renameInput.trim();
    if (!renamingTable || !newName || newName === renamingTable) { setRenamingTable(null); return; }
    try {
      const { error } = await (supabase.from("guests" as any) as any)
        .update({ table_assignment: newName }).eq("table_assignment", renamingTable);
      if (error) throw error;
      setGuests(prev => prev.map(g => g.table_assignment === renamingTable ? { ...g, table_assignment: newName } : g));
      toast({ title: `Renamed to "${newName}"` });
    } catch (err: any) {
      toast({ title: "Failed to rename", description: err.message, variant: "destructive" });
    }
    setRenamingTable(null);
  };

  const toggleSelectGuest = (id: string) => {
    setSelectedUnassigned(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkAssign = async () => {
    const tableName = bulkAssignInput.trim();
    if (!tableName) return;
    setIsSaving(true);
    try {
      const ids = Array.from(selectedUnassigned);
      const { error } = await (supabase.from("guests" as any) as any)
        .update({ table_assignment: tableName }).in("id", ids);
      if (error) throw error;
      setGuests(prev => prev.map(g => selectedUnassigned.has(g.id) ? { ...g, table_assignment: tableName } : g));
      toast({ title: `${ids.length} guest${ids.length !== 1 ? "s" : ""} assigned to ${tableName}` });
      setSelectedUnassigned(new Set());
      setBulkAssignOpen(false);
      setBulkAssignInput("");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const handleExportCSV = () => {
    const rows = [["Name", "Table", "Party Size", "Side", "Checked In"]];
    const sorted = [...guests].sort((a, b) => (a.table_assignment ?? "").localeCompare(b.table_assignment ?? ""));
    for (const g of sorted) rows.push([g.full_name, g.table_assignment || "Unassigned", String(g.party_size), g.side || "", g.checked_in ? "Yes" : "No"]);
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "seating-chart.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const assignGuestDirect = useCallback(async (guestId: string, tableName: string | null) => {
    try {
      const { error } = await (supabase.from("guests" as any) as any)
        .update({ table_assignment: tableName }).eq("id", guestId);
      if (error) throw error;
      setGuests(prev => prev.map(g => g.id === guestId ? { ...g, table_assignment: tableName } : g));
      toast({ title: tableName ? `Assigned to ${tableName}` : "Removed from table" });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  }, [toast]);

  const handleListDragStart = useCallback((event: DragStartEvent) => {
    setDraggingGuestId(event.active.id as string);
  }, []);

  const handleListDragEnd = useCallback(async (event: DragEndEvent) => {
    setDraggingGuestId(null);
    const { active, over } = event;
    if (!over) return;
    await assignGuestDirect(active.id as string, over.id as string);
  }, [assignGuestDirect]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }
  if (guests.length === 0) {
    return <div className="text-center py-16 text-muted-foreground">No guests found. Add guests via invite codes first.</div>;
  }

  const showUnassignedPool = unassigned.length > 0 && (!globalSearch || filteredUnassigned.length > 0);
  const noResults = globalSearch && filteredTableNames.length === 0 && filteredUnassigned.length === 0;

  return (
    <div>
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" />{allTableNames.length} table{allTableNames.length !== 1 ? "s" : ""}</span>
        <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary" />{guests.length - unassigned.length} / {guests.length} guests assigned</span>
        {brideCount > 0 && <span style={{ color: "#fcd34d", fontWeight: 600 }}>{brideCount} bride's side</span>}
        {groomCount > 0 && <span style={{ color: "#93c5fd", fontWeight: 600 }}>{groomCount} groom's side</span>}
        {unassigned.length > 0 && <span className="text-yellow-500 font-medium">{unassigned.length} unassigned</span>}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border/50 bg-background/40 p-0.5 text-xs">
            <button onClick={() => setViewMode("list")} className={`px-2.5 py-1 rounded-md transition-colors ${viewMode === "list" ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>List</button>
            <button onClick={() => setViewMode("hall")} className={`px-2.5 py-1 rounded-md transition-colors ${viewMode === "hall" ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}>Hall View</button>
          </div>
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50 rounded-lg px-3 py-1.5">
            <Download className="w-3.5 h-3.5" />Export CSV
          </button>
        </div>
      </div>

      {/* Hall view */}
      {viewMode === "hall" && (
        <HallView tableMap={tableMap} unassigned={unassigned} allTableNames={allTableNames} onAssignGuest={assignGuestDirect} tableSides={tableSides} onSetTableSide={setTableSideOverride} />
      )}

      {/* List view */}
      {viewMode === "list" && (
        <DndContext sensors={sensors} onDragStart={handleListDragStart} onDragEnd={handleListDragEnd}>
          {/* Search */}
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input placeholder="Search all guests..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="pl-9 pr-9 bg-background/50 border-border/50 rounded-xl" />
            {globalSearch && (
              <button onClick={() => setGlobalSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search"><X className="w-4 h-4" /></button>
            )}
          </div>

          {/* Bulk assign bar */}
          {selectedUnassigned.size > 0 && (
            <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
              <span className="text-sm text-foreground font-medium">{selectedUnassigned.size} guest{selectedUnassigned.size !== 1 ? "s" : ""} selected</span>
              <Button size="sm" onClick={() => setBulkAssignOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground ml-auto">Assign to table</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedUnassigned(new Set())} className="text-muted-foreground">Clear</Button>
            </div>
          )}

          {/* Unassigned pool */}
          {showUnassignedPool && (
            <div
              className="mb-5 rounded-2xl p-4"
              style={{
                background: "linear-gradient(145deg,#1a1200 0%,#100c00 100%)",
                border: "1.5px solid rgba(250,204,21,0.18)",
                boxShadow: "0 4px 28px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <h3 className="font-serif" style={{ fontSize: 15, color: "#fde68a", margin: 0, textShadow: "0 0 14px rgba(250,204,21,0.2)" }}>
                    Unassigned Guests
                  </h3>
                  <p style={{ fontSize: 11, color: "rgba(253,230,138,0.4)", marginTop: 3 }}>
                    Drag a guest onto a table card to assign · or select &amp; bulk assign
                  </p>
                </div>
                <span style={{ fontSize: 11, color: "rgba(253,230,138,0.7)", background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.2)", borderRadius: 9999, padding: "3px 11px", fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                  {unassigned.length} guests
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {filteredUnassigned.map(g => (
                  <DraggableGuestPill
                    key={g.id}
                    guest={g}
                    isSelected={selectedUnassigned.has(g.id)}
                    onToggleSelect={() => toggleSelectGuest(g.id)}
                    onAssignClick={() => openAssign(g)}
                  />
                ))}
                {filteredUnassigned.length === 0 && globalSearch && (
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", padding: "4px 0" }}>No match</p>
                )}
              </div>
            </div>
          )}

          {/* Table cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTableNames.map((tableName) => {
              const tableGuests = tableMap.get(tableName)!;
              const visibleGuests = getVisibleGuests(tableGuests);
              const seats = totalSeats(tableGuests);
              const brideSeatsCount = tableGuests.filter(g => g.side?.toLowerCase().includes("bride")).reduce((s, g) => s + g.party_size, 0);
              const groomSeatsCount = tableGuests.filter(g => g.side?.toLowerCase().includes("groom")).reduce((s, g) => s + g.party_size, 0);
              const autoTableSide = tableGuests.length === 0 ? null : brideSeatsCount > groomSeatsCount ? "bride" : groomSeatsCount > brideSeatsCount ? "groom" : "mixed";
              const tableSide = (tableSides[tableName] ?? autoTableSide) as "bride" | "groom" | "mixed" | null;

              return (
                <DroppableTableCard
                  key={tableName}
                  tableName={tableName}
                  tableGuests={tableGuests}
                  tableSide={tableSide}
                  tableSideOverride={tableSides[tableName]}
                  visibleGuests={visibleGuests}
                  seats={seats}
                  isRenaming={renamingTable === tableName}
                  renameInput={renameInput}
                  onRenameChange={setRenameInput}
                  onRenameConfirm={handleRenameTable}
                  onRenameCancel={() => setRenamingTable(null)}
                  onStartRename={() => { setRenamingTable(tableName); setRenameInput(tableName); }}
                  onOpenAssign={openAssign}
                  onRemove={handleRemoveInline}
                  onSetSide={(side) => setTableSideOverride(tableName, side)}
                  globalSearch={globalSearch}
                />
              );
            })}

            {noResults && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No guests found for &ldquo;{globalSearch}&rdquo;
              </div>
            )}
          </div>

          <DragOverlay dropAnimation={null}>
            {draggingGuest && <GuestPillOverlay guest={draggingGuest} />}
          </DragOverlay>
        </DndContext>
      )}

      {/* Single assign dialog */}
      <Dialog open={!!selectedGuest} onOpenChange={() => setSelectedGuest(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Assign Table</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Assigning <span className="text-foreground font-medium">{selectedGuest?.full_name}</span>
              {selectedGuest && selectedGuest.party_size > 1 ? ` (party of ${selectedGuest.party_size})` : ""}
            </p>
            <div>
              <Input
                placeholder="Table name or number (e.g. Table 1)"
                value={assignInput}
                onChange={(e) => setAssignInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && assignInput.trim()) handleAssign(); }}
                className="bg-background/50 border-border/50 rounded-xl"
                autoFocus
              />
              {allTableNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {allTableNames.map(t => (
                    <button key={t} onClick={() => setAssignInput(t)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${assignInput === t ? "bg-primary/10 border-primary/40 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/30"}`}
                    >{t}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            {selectedGuest?.table_assignment && (
              <Button variant="ghost" size="sm" onClick={() => handleAssign(null)} disabled={isSaving} className="text-muted-foreground mr-auto">Remove from table</Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setSelectedGuest(null)} className="border-border/50">Cancel</Button>
            <Button onClick={() => handleAssign()} disabled={isSaving || !assignInput.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk assign dialog */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Assign {selectedUnassigned.size} Guest{selectedUnassigned.size !== 1 ? "s" : ""}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Table name or number (e.g. Table 1)"
              value={bulkAssignInput}
              onChange={(e) => setBulkAssignInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && bulkAssignInput.trim()) handleBulkAssign(); }}
              className="bg-background/50 border-border/50 rounded-xl"
              autoFocus
            />
            {allTableNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allTableNames.map(t => (
                  <button key={t} onClick={() => setBulkAssignInput(t)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${bulkAssignInput === t ? "bg-primary/10 border-primary/40 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/30"}`}
                  >{t}</button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setBulkAssignOpen(false)} className="border-border/50">Cancel</Button>
            <Button onClick={handleBulkAssign} disabled={isSaving || !bulkAssignInput.trim()} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeatingChart;
