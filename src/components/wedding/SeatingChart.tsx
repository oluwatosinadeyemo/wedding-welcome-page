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
import {
  Users, MapPin, Loader2, X, Pencil, Check, Download, Search, LayoutGrid, Table2,
} from "lucide-react";

const TABLE_CAPACITY = 10;
// Circumference of the SVG ring circle (r = 68): 2π × 68 ≈ 427.26
const RING_CIRCUMFERENCE = 427.26;

interface GuestEntry {
  id: string;
  full_name: string;
  party_size: number;
  side: string | null;
  table_assignment: string | null;
  checked_in: boolean;
  rsvps: { attending: string }[] | null;
}

const sideColor = (side: string | null) => {
  if (!side) return "bg-muted-foreground/30";
  const l = side.toLowerCase();
  if (l.includes("bride")) return "bg-purple-400";
  if (l.includes("groom")) return "bg-blue-400";
  return "bg-muted-foreground/30";
};

const SideBadge = ({ side }: { side: string | null }) => {
  if (!side) return null;
  const lower = side.toLowerCase();
  const cls = lower.includes("bride")
    ? "bg-purple-500/20 text-purple-400"
    : lower.includes("groom")
    ? "bg-blue-500/20 text-blue-400"
    : "bg-muted/50 text-muted-foreground";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${cls}`}>
      {side}
    </span>
  );
};

const CapacityBar = ({ seats }: { seats: number }) => {
  const pct = Math.min(100, (seats / TABLE_CAPACITY) * 100);
  const isOver = seats > TABLE_CAPACITY;
  const isFull = seats === TABLE_CAPACITY;
  const barColor = isOver ? "bg-destructive" : seats >= TABLE_CAPACITY * 0.8 ? "bg-yellow-500" : "bg-primary";
  return (
    <div className="mt-2 mb-3">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className={isOver ? "text-destructive font-medium" : isFull ? "text-yellow-500 font-medium" : "text-muted-foreground"}>
          {seats} / {TABLE_CAPACITY} seats{isOver ? " · over capacity" : isFull ? " · full" : ""}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

interface TableRingProps {
  tableName: string;
  seats: number;
  onRename: () => void;
}

const TableRing = ({ tableName, seats, onRename }: TableRingProps) => {
  const pct = Math.min(1, seats / TABLE_CAPACITY);
  const isOver = seats > TABLE_CAPACITY;
  const isFull = seats === TABLE_CAPACITY;
  const ringColor = isOver ? "#ef4444" : seats >= TABLE_CAPACITY * 0.8 ? "#eab308" : "hsl(var(--primary))";
  const dashOffset = RING_CIRCUMFERENCE * (1 - pct);

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg width="144" height="144" viewBox="0 0 144 144" className="absolute inset-0">
        {/* Track */}
        <circle cx="72" cy="72" r="68" fill="hsl(var(--card)/0.6)" stroke="hsl(var(--border)/0.4)" strokeWidth="1.5" />
        {/* Background ring */}
        <circle cx="72" cy="72" r="68" fill="none" stroke="hsl(var(--muted)/0.3)" strokeWidth="5" />
        {/* Progress ring */}
        <circle
          cx="72" cy="72" r="68"
          fill="none"
          stroke={ringColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 72 72)"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      {/* Centre content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        <span className="font-serif text-sm text-foreground leading-tight line-clamp-2">{tableName}</span>
        <span className={`text-[11px] mt-1 font-medium ${isOver ? "text-destructive" : isFull ? "text-yellow-500" : "text-muted-foreground"}`}>
          {seats}/{TABLE_CAPACITY}
        </span>
      </div>
      {/* Rename button */}
      <button
        onClick={onRename}
        aria-label={`Rename ${tableName}`}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/60 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-0 group-hover/hall:opacity-100"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
};

const SeatingChart = () => {
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "hall">("list");
  const [selectedGuest, setSelectedGuest] = useState<GuestEntry | null>(null);
  const [assignInput, setAssignInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [renamingTable, setRenamingTable] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [selectedUnassigned, setSelectedUnassigned] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignInput, setBulkAssignInput] = useState("");
  const { toast } = useToast();

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("guests" as any) as any)
      .select("id, full_name, party_size, side, table_assignment, checked_in, rsvps(attending)")
      .order("full_name");
    if (data)
      setGuests((data as GuestEntry[]).filter((g) => g.rsvps?.[0]?.attending !== "no"));
    setLoading(false);
  }, []);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);

  // Real-time sync
  useEffect(() => {
    const channel = supabase
      .channel("guests-seating")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "guests" }, () => {
        fetchGuests();
      })
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
    () =>
      Array.from(tableMap.keys()).sort((a, b) => {
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
    ? allTableNames.filter(
        (name) =>
          name.toLowerCase().includes(searchLower) ||
          tableMap.get(name)!.some((g) => g.full_name.toLowerCase().includes(searchLower))
      )
    : allTableNames;

  const getVisibleGuests = (gs: GuestEntry[]) =>
    globalSearch ? gs.filter((g) => g.full_name.toLowerCase().includes(searchLower)) : gs;

  const filteredUnassigned = globalSearch
    ? unassigned.filter((g) => g.full_name.toLowerCase().includes(searchLower))
    : unassigned;

  const brideCount = useMemo(
    () => guests.filter((g) => g.side?.toLowerCase().includes("bride")).length,
    [guests]
  );
  const groomCount = useMemo(
    () => guests.filter((g) => g.side?.toLowerCase().includes("groom")).length,
    [guests]
  );

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
        .update({ table_assignment: newTable })
        .eq("id", selectedGuest.id);
      if (error) throw error;
      setGuests((prev) =>
        prev.map((g) => (g.id === selectedGuest.id ? { ...g, table_assignment: newTable } : g))
      );
      toast({ title: newTable ? `Assigned to ${newTable}` : "Removed from table" });
      setSelectedGuest(null);
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveInline = async (guest: GuestEntry) => {
    try {
      await (supabase.from("guests" as any) as any)
        .update({ table_assignment: null })
        .eq("id", guest.id);
      setGuests((prev) =>
        prev.map((g) => (g.id === guest.id ? { ...g, table_assignment: null } : g))
      );
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRenameTable = async () => {
    const newName = renameInput.trim();
    if (!renamingTable || !newName || newName === renamingTable) {
      setRenamingTable(null);
      return;
    }
    try {
      const { error } = await (supabase.from("guests" as any) as any)
        .update({ table_assignment: newName })
        .eq("table_assignment", renamingTable);
      if (error) throw error;
      setGuests((prev) =>
        prev.map((g) =>
          g.table_assignment === renamingTable ? { ...g, table_assignment: newName } : g
        )
      );
      toast({ title: `Renamed to "${newName}"` });
    } catch (err: any) {
      toast({ title: "Failed to rename", description: err.message, variant: "destructive" });
    }
    setRenamingTable(null);
  };

  const toggleSelectGuest = (id: string) => {
    setSelectedUnassigned((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
        .update({ table_assignment: tableName })
        .in("id", ids);
      if (error) throw error;
      setGuests((prev) =>
        prev.map((g) => (selectedUnassigned.has(g.id) ? { ...g, table_assignment: tableName } : g))
      );
      toast({ title: `${ids.length} guest${ids.length !== 1 ? "s" : ""} assigned to ${tableName}` });
      setSelectedUnassigned(new Set());
      setBulkAssignOpen(false);
      setBulkAssignInput("");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    const rows = [["Name", "Table", "Party Size", "Side", "Checked In"]];
    const sorted = [...guests].sort((a, b) =>
      (a.table_assignment ?? "").localeCompare(b.table_assignment ?? "")
    );
    for (const g of sorted) {
      rows.push([
        g.full_name,
        g.table_assignment || "Unassigned",
        String(g.party_size),
        g.side || "",
        g.checked_in ? "Yes" : "No",
      ]);
    }
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seating-chart.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (guests.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No guests found. Add guests via invite codes first.
      </div>
    );
  }

  const showUnassignedPool = unassigned.length > 0 && (!globalSearch || filteredUnassigned.length > 0);
  const noResults = globalSearch && filteredTableNames.length === 0 && filteredUnassigned.length === 0;

  const renameInlineUI = (tableName: string) =>
    renamingTable === tableName ? (
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Input
          value={renameInput}
          onChange={(e) => setRenameInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRenameTable();
            if (e.key === "Escape") setRenamingTable(null);
          }}
          className="h-7 text-sm bg-background/50 border-border/50 rounded-lg px-2"
          autoFocus
        />
        <button onClick={handleRenameTable} className="text-primary hover:text-primary/80 flex-shrink-0" aria-label="Confirm rename">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={() => setRenamingTable(null)} className="text-muted-foreground hover:text-foreground flex-shrink-0" aria-label="Cancel rename">
          <X className="w-4 h-4" />
        </button>
      </div>
    ) : null;

  return (
    <div>
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-primary" />
          {allTableNames.length} table{allTableNames.length !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" />
          {guests.length - unassigned.length} / {guests.length} guests assigned
        </span>
        {brideCount > 0 && <span className="text-purple-400 font-medium">{brideCount} bride's side</span>}
        {groomCount > 0 && <span className="text-blue-400 font-medium">{groomCount} groom's side</span>}
        {unassigned.length > 0 && <span className="text-yellow-500 font-medium">{unassigned.length} unassigned</span>}
        <button
          onClick={handleExportCSV}
          className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50 rounded-lg px-3 py-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Controls row: search + view toggle */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search all guests..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="pl-9 pr-9 bg-background/50 border-border/50 rounded-xl"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center rounded-lg border border-border/50 overflow-hidden">
          <button
            onClick={() => setViewMode("list")}
            aria-label="List view"
            className={`px-3 py-2 flex items-center gap-1.5 text-xs transition-colors ${
              viewMode === "list"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            List
          </button>
          <button
            onClick={() => setViewMode("hall")}
            aria-label="Hall view"
            className={`px-3 py-2 flex items-center gap-1.5 text-xs transition-colors border-l border-border/50 ${
              viewMode === "hall"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            Hall
          </button>
        </div>
      </div>

      {/* Bulk assign bar */}
      {selectedUnassigned.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
          <span className="text-sm text-foreground font-medium">
            {selectedUnassigned.size} guest{selectedUnassigned.size !== 1 ? "s" : ""} selected
          </span>
          <Button size="sm" onClick={() => setBulkAssignOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground ml-auto">
            Assign to table
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedUnassigned(new Set())} className="text-muted-foreground">
            Clear
          </Button>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === "list" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTableNames.map((tableName) => {
            const tableGuests = tableMap.get(tableName)!;
            const visibleGuests = getVisibleGuests(tableGuests);
            const seats = totalSeats(tableGuests);
            const isRenaming = renamingTable === tableName;

            return (
              <div key={tableName} className="glass-card p-4 group">
                <div className="flex items-center justify-between mb-1 gap-2">
                  {isRenaming ? (
                    renameInlineUI(tableName)
                  ) : (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="font-serif text-base text-foreground truncate">{tableName}</h3>
                      <button
                        onClick={() => { setRenamingTable(tableName); setRenameInput(tableName); }}
                        className="text-muted-foreground/0 group-hover:text-muted-foreground/50 hover:!text-muted-foreground flex-shrink-0 transition-colors"
                        aria-label={`Rename ${tableName}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {tableGuests.length} guest{tableGuests.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <CapacityBar seats={seats} />

                <div className="space-y-1.5">
                  {visibleGuests.map((g) => (
                    <div key={g.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-background/40 group/row">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm text-foreground truncate">{g.full_name}</p>
                          <SideBadge side={g.side} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {g.party_size > 1 ? `Party of ${g.party_size}` : "1 seat"}
                          {g.checked_in ? " · ✓ checked in" : ""}
                        </p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity">
                        <button onClick={() => openAssign(g)} className="text-xs text-primary hover:underline">Move</button>
                        <button onClick={() => handleRemoveInline(g)} className="text-destructive hover:text-destructive/70" aria-label="Remove from table">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {globalSearch && visibleGuests.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-1 italic">No match in this table</p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Unassigned pool — list view */}
          {showUnassignedPool && <UnassignedPool
            unassigned={unassigned}
            filteredUnassigned={filteredUnassigned}
            globalSearch={globalSearch}
            selectedUnassigned={selectedUnassigned}
            toggleSelectGuest={toggleSelectGuest}
            openAssign={openAssign}
          />}

          {noResults && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No guests found for &ldquo;{globalSearch}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* ── HALL VIEW ── */}
      {viewMode === "hall" && (
        <div>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" /> Bride's side</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" /> Groom's side</span>
            <span className="flex items-center gap-1.5"><span className="text-primary font-bold">✓</span> Checked in</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTableNames.map((tableName) => {
              const tableGuests = tableMap.get(tableName)!;
              const visibleGuests = getVisibleGuests(tableGuests);
              const seats = totalSeats(tableGuests);
              const isRenaming = renamingTable === tableName;

              return (
                <div key={tableName} className="group/hall">
                  {/* Round table ring */}
                  {isRenaming ? (
                    <div className="flex items-center justify-center gap-2 mb-3 px-4">
                      {renameInlineUI(tableName)}
                    </div>
                  ) : (
                    <TableRing
                      tableName={tableName}
                      seats={seats}
                      onRename={() => { setRenamingTable(tableName); setRenameInput(tableName); }}
                    />
                  )}

                  {/* Guest name list */}
                  <div className="mt-4 glass-card p-4 space-y-0 divide-y divide-border/30">
                    {visibleGuests.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2 italic">
                        {globalSearch ? "No match" : "No guests assigned"}
                      </p>
                    ) : (
                      visibleGuests.map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center gap-2.5 py-2 group/row"
                        >
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 ${sideColor(g.side)}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground font-medium leading-snug">
                              {g.full_name}
                              {g.party_size > 1 && (
                                <span className="text-muted-foreground font-normal"> +{g.party_size - 1}</span>
                              )}
                              {g.checked_in && (
                                <span className="text-primary font-medium ml-1.5 text-xs">✓</span>
                              )}
                            </p>
                            {g.side && <p className="text-[11px] text-muted-foreground leading-none mt-0.5">{g.side}</p>}
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity">
                            <button onClick={() => openAssign(g)} className="text-[11px] text-primary hover:underline">Move</button>
                            <button onClick={() => handleRemoveInline(g)} className="text-destructive hover:text-destructive/70" aria-label="Remove from table">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}

            {noResults && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No guests found for &ldquo;{globalSearch}&rdquo;
              </div>
            )}
          </div>

          {/* Unassigned pool — hall view (flat list below) */}
          {showUnassignedPool && (
            <div className="mt-10">
              <h3 className="font-serif text-base text-yellow-500 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500/40 border border-yellow-500/60 inline-block" />
                Unassigned guests ({unassigned.length})
              </h3>
              <div className="glass-card p-4 border-yellow-500/20 divide-y divide-border/30">
                {filteredUnassigned.map((g) => (
                  <div key={g.id} className="flex items-center gap-2.5 py-2">
                    <input
                      type="checkbox"
                      checked={selectedUnassigned.has(g.id)}
                      onChange={() => toggleSelectGuest(g.id)}
                      className="w-4 h-4 rounded accent-primary flex-shrink-0 cursor-pointer"
                      aria-label={`Select ${g.full_name}`}
                    />
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sideColor(g.side)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium">
                        {g.full_name}
                        {g.party_size > 1 && <span className="text-muted-foreground font-normal"> +{g.party_size - 1}</span>}
                      </p>
                      {g.side && <p className="text-[11px] text-muted-foreground">{g.side}</p>}
                    </div>
                    <button
                      onClick={() => openAssign(g)}
                      className="flex-shrink-0 text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      Assign
                    </button>
                  </div>
                ))}
                {filteredUnassigned.length === 0 && globalSearch && (
                  <p className="text-xs text-muted-foreground text-center py-2">No match</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Single assign dialog */}
      <Dialog open={!!selectedGuest} onOpenChange={() => setSelectedGuest(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Assigning{" "}
              <span className="text-foreground font-medium">{selectedGuest?.full_name}</span>
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
                  {allTableNames.map((t) => (
                    <button
                      key={t}
                      onClick={() => setAssignInput(t)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        assignInput === t
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "border-border/50 text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            {selectedGuest?.table_assignment && (
              <Button variant="ghost" size="sm" onClick={() => handleAssign(null)} disabled={isSaving} className="text-muted-foreground mr-auto">
                Remove from table
              </Button>
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
          <DialogHeader>
            <DialogTitle>Assign {selectedUnassigned.size} Guest{selectedUnassigned.size !== 1 ? "s" : ""}</DialogTitle>
          </DialogHeader>
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
                {allTableNames.map((t) => (
                  <button
                    key={t}
                    onClick={() => setBulkAssignInput(t)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      bulkAssignInput === t
                        ? "bg-primary/10 border-primary/40 text-primary"
                        : "border-border/50 text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {t}
                  </button>
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

// Extracted to avoid repetition between list and hall views
const UnassignedPool = ({
  unassigned,
  filteredUnassigned,
  globalSearch,
  selectedUnassigned,
  toggleSelectGuest,
  openAssign,
}: {
  unassigned: GuestEntry[];
  filteredUnassigned: GuestEntry[];
  globalSearch: string;
  selectedUnassigned: Set<string>;
  toggleSelectGuest: (id: string) => void;
  openAssign: (g: GuestEntry) => void;
}) => (
  <div className="glass-card p-4 border-yellow-500/20">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-serif text-base text-yellow-500">Unassigned</h3>
      <span className="text-xs text-muted-foreground">
        {unassigned.length} guest{unassigned.length !== 1 ? "s" : ""}
      </span>
    </div>
    <div className="space-y-1.5">
      {filteredUnassigned.map((g) => (
        <div key={g.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-background/40">
          <input
            type="checkbox"
            checked={selectedUnassigned.has(g.id)}
            onChange={() => toggleSelectGuest(g.id)}
            className="w-4 h-4 rounded accent-primary flex-shrink-0 cursor-pointer"
            aria-label={`Select ${g.full_name}`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm text-foreground">{g.full_name}</p>
              <SideBadge side={g.side} />
            </div>
            <p className="text-xs text-muted-foreground">
              {g.party_size > 1 ? `Party of ${g.party_size}` : "1 seat"}
            </p>
          </div>
          <button
            onClick={() => openAssign(g)}
            className="flex-shrink-0 text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Assign
          </button>
        </div>
      ))}
      {filteredUnassigned.length === 0 && globalSearch && (
        <p className="text-xs text-muted-foreground text-center py-2">No match</p>
      )}
    </div>
  </div>
);

export default SeatingChart;
