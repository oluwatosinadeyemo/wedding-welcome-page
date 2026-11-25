import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, PanelRightClose, PanelRightOpen, Ticket, ExternalLink, Users, ArrowRight, Pencil, ArrowLeftRight } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { buildSlots, DEFAULT_HALL_CONFIG, HallConfig, normaliseConfig, planRightWingRenumber, Slot, WING_LABEL } from "@/lib/hall-layout";
import FloorPlanSvg, { readFloorPlanTheme } from "./FloorPlanSvg";

interface GuestEntry {
  id: string;
  full_name: string;
  party_size: number;
  side: string | null;
  table_assignment: string | null;
  checked_in: boolean;
  rsvps: { attending: string }[] | null;
}

type View = "all" | "left" | "right" | "vip";

const seatsFor = (g: GuestEntry) => Math.max(1, g.party_size);
const passLink = (name: string) => `/pass?name=${encodeURIComponent(name)}`;

// Read-only master view of the hall: the same floor plan as the Seating tab, with guests overlaid.
const TableLayout = () => {
  const [config, setConfig] = useState<HallConfig>(DEFAULT_HALL_CONFIG);
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState(true);
  const [renumbering, setRenumbering] = useState(false);
  const [editMode, setEditMode] = useState<"rename" | "swap" | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [swapWithId, setSwapWithId] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const theme = useMemo(() => readFloorPlanTheme(), []);

  const fetchGuests = useCallback(async () => {
    const { data } = await (supabase.from("guests" as any) as any)
      .select("id, full_name, party_size, side, table_assignment, checked_in, rsvps(attending)")
      .order("full_name");
    if (data) setGuests((data as GuestEntry[]).filter(g => g.rsvps?.[0]?.attending !== "no"));
  }, []);

  useEffect(() => {
    (async () => {
      const [{ data }] = await Promise.all([
        supabase.from("hall_layout").select("config").eq("id", "main").maybeSingle(),
        fetchGuests(),
      ]);
      if (data?.config) setConfig(normaliseConfig(data.config));
      setLoading(false);
    })();
  }, [fetchGuests]);

  useEffect(() => {
    const channel = supabase
      .channel("guests-table-layout")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "guests" }, () => fetchGuests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchGuests]);

  const slots = useMemo(() => buildSlots(config), [config]);

  const tableMap = useMemo(() => {
    const map = new Map<string, GuestEntry[]>();
    for (const g of guests) {
      const key = g.table_assignment?.trim().toLowerCase();
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    return map;
  }, [guests]);

  const guestsAt = useCallback((s: Slot) => tableMap.get(s.label.trim().toLowerCase()) ?? [], [tableMap]);

  const occupancy = useMemo(() => {
    const o: Record<string, number> = {};
    tableMap.forEach((gs, key) => { o[key] = gs.reduce((n, g) => n + seatsFor(g), 0); });
    return o;
  }, [tableMap]);

  const rounds = slots.filter(s => s.kind === "round");
  const vips = slots.filter(s => s.kind === "vip");
  const roundSeats = rounds.length * config.seatsPerTable;
  const vipSeats = vips.length * config.vipSeats;
  const totalSeats = roundSeats + vipSeats + 2;
  const seatedOnPlan = slots.reduce((n, s) => n + (occupancy[s.label.trim().toLowerCase()] ?? 0), 0);

  const placed = new Set(slots.map(s => s.label.trim().toLowerCase()));
  const unplaced = Array.from(new Set(guests.map(g => g.table_assignment?.trim()).filter((n): n is string => !!n && !placed.has(n.toLowerCase()))));

  const wingRange = (side: "left" | "right") => {
    const nums = rounds.filter(s => s.side === side).map(s => s.number);
    return nums.length ? `${Math.min(...nums)}–${Math.max(...nums)}` : "";
  };

  // Tables that match the current view and search; everything else is dimmed on the plan.
  const visibleIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    return new Set(slots.filter(s => {
      if (view === "left" && s.side !== "left") return false;
      if (view === "right" && s.side !== "right") return false;
      if (view === "vip" && s.kind !== "vip") return false;
      if (!q) return true;
      if (/^\d+$/.test(q)) return s.kind === "round" && s.number === Number(q);
      return s.label.toLowerCase().includes(q) || guestsAt(s).some(g => g.full_name.toLowerCase().includes(q));
    }).map(s => s.id));
  }, [slots, view, query, guestsAt]);

  const dimmedIds = useMemo(() => new Set(slots.filter(s => !visibleIds.has(s.id)).map(s => s.id)), [slots, visibleIds]);

  // Jump to the first match when searching so the inspector follows the search.
  useEffect(() => {
    if (!query.trim()) return;
    const first = slots.find(s => visibleIds.has(s.id));
    if (first) { setSelectedId(first.id); setSelectedGuestId(null); }
  }, [query, slots, visibleIds]);

  const selected = slots.find(s => s.id === selectedId) ?? null;
  const seated = useMemo(() => (selected ? guestsAt(selected) : []), [selected, guestsAt]);
  const seatedCount = seated.reduce((n, g) => n + seatsFor(g), 0);

  // Seat numbers run around the table in name order; a party takes consecutive chairs.
  const seatRows = useMemo(() => {
    let next = 1;
    return seated.map(g => {
      const from = next;
      next += seatsFor(g);
      return { guest: g, seat: seatsFor(g) > 1 ? `${from}–${next - 1}` : `${from}` };
    });
  }, [seated]);

  const passGuest = seatRows.find(r => r.guest.id === selectedGuestId) ?? seatRows[0] ?? null;
  const wingName = (s: Slot) => WING_LABEL[s.side];

  // Tables seated before the floor plan existed move onto the right wing once, keeping each group together.
  const renumber = useMemo(
    () => planRightWingRenumber(guests.map(g => g.table_assignment ?? ""), slots),
    [guests, slots]
  );
  const showRenumber = !config.renumberedAt && renumber.moves.length > 0;

  const applyRenumber = async () => {
    setRenumbering(true);
    // Work from guest ids captured now, so a table renamed earlier in the loop is never merged into another.
    const groups = renumber.moves.map(m => ({
      ...m,
      ids: guests.filter(g => g.table_assignment?.trim() === m.from).map(g => g.id),
    }));
    for (const g of groups) {
      if (g.from === g.to || g.ids.length === 0) continue;
      const { error } = await supabase.from("guests").update({ table_assignment: g.to }).in("id", g.ids);
      if (error) {
        setRenumbering(false);
        toast({ title: `Could not move ${g.from}`, description: error.message, variant: "destructive" });
        await fetchGuests();
        return;
      }
    }
    const labels = Object.fromEntries(Object.entries(config.labels).filter(([id]) => id.startsWith("vip-")));
    const next = normaliseConfig({ ...config, labels, renumberedAt: new Date().toISOString() });
    const { error } = await supabase.from("hall_layout").upsert({ id: "main", config: next as any });
    setRenumbering(false);
    if (error) { toast({ title: "Tables moved, but the floor plan didn't save", description: error.message, variant: "destructive" }); }
    else { setConfig(next); toast({ title: `${groups.length} tables moved to the ${WING_LABEL.right}` }); }
    await fetchGuests();
  };

  const saveLayout = async (next: HallConfig) => {
    const { error } = await supabase.from("hall_layout").upsert({ id: "main", config: next as any });
    if (error) throw error;
    setConfig(next);
  };

  // Moves a captured set of guests (by id) to a table name, so two moves never mix groups.
  const moveGuests = async (ids: string[], to: string) => {
    if (ids.length === 0) return;
    const { error } = await supabase.from("guests").update({ table_assignment: to }).in("id", ids);
    if (error) throw error;
  };

  // New name tag for the selected table; its guests follow it.
  const renameTable = async () => {
    if (!selected) return;
    const name = nameInput.trim();
    if (!name || name === selected.label) { setEditMode(null); return; }
    if (slots.some(s => s.id !== selected.id && s.label.trim().toLowerCase() === name.toLowerCase())) {
      toast({ title: "Another table already has that name", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await moveGuests(seated.map(g => g.id), name);
      await saveLayout(normaliseConfig({ ...config, labels: { ...config.labels, [selected.id]: name } }));
      toast({ title: `${selected.label} is now ${name}` });
      setEditMode(null);
    } catch (err: any) {
      toast({ title: "Could not rename the table", description: err.message, variant: "destructive" });
    }
    setSaving(false);
    await fetchGuests();
  };

  // Swaps everyone at the selected table with everyone at another table (either can be empty).
  const swapTables = async () => {
    const other = slots.find(s => s.id === swapWithId);
    if (!selected || !other) return;
    setSaving(true);
    try {
      const here = seated.map(g => g.id);
      const there = guestsAt(other).map(g => g.id);
      await moveGuests(here, other.label);
      await moveGuests(there, selected.label);
      toast({ title: `Swapped ${selected.label} and ${other.label}` });
      setEditMode(null);
    } catch (err: any) {
      toast({ title: "Could not swap the tables", description: err.message, variant: "destructive" });
    }
    setSaving(false);
    await fetchGuests();
  };

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const views: { id: View; label: string }[] = [
    { id: "all", label: `All ${rounds.length} Tables + VIPs` },
    { id: "right", label: `${WING_LABEL.right} (${wingRange("right")})` },
    { id: "left", label: `${WING_LABEL.left} (${wingRange("left")})` },
    { id: "vip", label: "VIP Walkway Only" },
  ];

  return (
    <div className="space-y-4">
      {showRenumber && (
        <div className="glass-card p-5 border-primary/30">
          <p className="text-sm text-foreground font-medium">Move your existing tables onto the {WING_LABEL.right}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Each table becomes a numbered table on the {WING_LABEL.right}. Everyone stays with the people they're already seated with.
          </p>
          <ul className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1 text-xs">
            {renumber.moves.map(m => (
              <li key={m.from} className="flex items-center gap-2 text-muted-foreground">
                <span className="truncate text-foreground">{m.from}</span>
                <ArrowRight className="w-3 h-3 flex-shrink-0" />
                <span className="text-primary">{m.to}</span>
                <span>({guests.filter(g => g.table_assignment?.trim() === m.from).reduce((n, g) => n + seatsFor(g), 0)})</span>
              </li>
            ))}
          </ul>
          {renumber.overflow.length > 0 && (
            <p className="text-xs text-red-400 mt-3">
              The {WING_LABEL.right} only has {renumber.moves.length} tables, so these won't fit: {renumber.overflow.join(", ")}.
            </p>
          )}
          <Button size="sm" className="mt-4" onClick={applyRenumber} disabled={renumbering || renumber.overflow.length > 0}>
            {renumbering && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Apply
          </Button>
        </div>
      )}
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search table # (1–${rounds.length}), VIP, or guest…`}
            className="pl-9 bg-background/50"
          />
        </div>
        <div className="flex gap-2">
          <Link to="/pass" target="_blank">
            <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10">
              <Ticket className="w-4 h-4 mr-1" />Digital Pass
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="border-border/50" onClick={() => setShowInspector(v => !v)}>
            {showInspector ? <PanelRightClose className="w-4 h-4 mr-1" /> : <PanelRightOpen className="w-4 h-4 mr-1" />}
            {showInspector ? "Hide Inspector" : "Show Inspector"}
          </Button>
        </div>
      </div>

      {/* Views and capacity */}
      <div className="flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                view === v.id ? "bg-primary/10 border-primary/40 text-primary" : "border-border/50 text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span><span className="text-foreground font-medium">{rounds.length}</span> banquet tables · {roundSeats} seats</span>
          <span><span className="text-foreground font-medium">{vips.length}</span> VIP tables · {vipSeats} seats</span>
          <span>Couple · 2</span>
          <span>Total <span className="text-foreground font-medium">{totalSeats}</span></span>
          <span>Seated <span className="text-foreground font-medium">{seatedOnPlan}</span></span>
        </div>
      </div>

      <div className={`grid gap-6 ${showInspector ? "lg:grid-cols-[1fr_320px]" : ""}`}>
        <div className="space-y-3">
          <div className={`rounded-xl overflow-hidden border border-border/50 w-full ${showInspector ? "" : "max-w-4xl mx-auto"}`}>
            <div className="[&>svg]:w-full [&>svg]:h-auto">
              <FloorPlanSvg
                config={config}
                slots={slots}
                colors={theme.colors}
                serif={theme.serif}
                sans={theme.sans}
                occupancy={occupancy}
                highlightId={selectedId}
                dimmedIds={dimmedIds}
                onSelect={s => { setSelectedId(s.id); setSelectedGuestId(null); setShowInspector(true); }}
              />
            </div>
          </div>
          {unplaced.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Seated at tables not on the floor plan: {unplaced.join(", ")}. Give a table one of these names in Seating › Floor Plan.
            </p>
          )}
        </div>

        {showInspector && (
          <div className="space-y-4">
            {/* Table inspector */}
            <div className="glass-card p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Table Inspector</p>
              {!selected ? (
                <p className="text-sm text-muted-foreground">Tap a table on the plan, or search for a guest, to see who's sitting there.</p>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-serif text-foreground">{selected.label}</h3>
                      <p className="text-xs text-muted-foreground">
                        {selected.kind === "vip" ? "VIP long table" : "Round table"} · {wingName(selected)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                      seatedCount > selected.seats ? "bg-red-500/20 text-red-400" : seatedCount === selected.seats ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
                    }`}>
                      {seatedCount}/{selected.seats} seated
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="border-border/50 h-8" onClick={() => { setNameInput(selected.label); setEditMode("rename"); }}>
                      <Pencil className="w-3.5 h-3.5 mr-1" />Rename
                    </Button>
                    <Button variant="outline" size="sm" className="border-border/50 h-8" onClick={() => { setSwapWithId(""); setEditMode("swap"); }}>
                      <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />Swap Table
                    </Button>
                  </div>
                  <div className="mt-4">
                    {seatRows.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">Nobody seated here yet. Assign guests to “{selected.label}” in the Seating tab.</p>
                    ) : (
                      <ul className="divide-y divide-border/30 max-h-72 overflow-y-auto">
                        {seatRows.map(({ guest, seat }) => (
                          <li key={guest.id}>
                            <button
                              onClick={() => setSelectedGuestId(guest.id)}
                              className={`w-full flex items-center gap-3 py-2 text-left text-sm transition-colors ${
                                passGuest?.guest.id === guest.id ? "text-primary" : "text-foreground hover:text-primary"
                              }`}
                            >
                              <span className="w-10 text-xs text-muted-foreground tabular-nums">#{seat}</span>
                              <span className="flex-1 truncate">
                                {guest.full_name}
                                {guest.party_size > 1 && <span className="text-muted-foreground"> (+{guest.party_size - 1})</span>}
                              </span>
                              {guest.checked_in && <span className="text-[10px] text-green-400">In</span>}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Guest access pass preview */}
            {selected && passGuest && (
              <div className="rounded-2xl p-5 border border-border/50" style={{ background: theme.colors.bg, color: theme.colors.ink }}>
                <div className="flex justify-between text-[10px] uppercase tracking-wider" style={{ color: theme.colors.muted }}>
                  <span>Guest Access Pass</span>
                  <span>#T&amp;P2026</span>
                </div>
                <p className="font-serif text-lg mt-2 leading-tight">{passGuest.guest.full_name}</p>
                <p className="text-xs" style={{ color: theme.colors.muted }}>
                  {passGuest.guest.party_size > 1 ? `Party of ${passGuest.guest.party_size}` : "Admits one"}
                </p>
                <div className="grid grid-cols-3 text-center mt-4 rounded-lg py-2" style={{ border: `1px solid ${theme.colors.rule}` }}>
                  {[
                    { k: "Wing", v: wingName(selected), c: selected.side === "left" ? theme.colors.red : theme.colors.green },
                    { k: "Table", v: selected.kind === "vip" ? selected.label : String(selected.number).padStart(2, "0") },
                    { k: "Seat", v: `#${passGuest.seat}` },
                  ].map(x => (
                    <div key={x.k}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: theme.colors.muted }}>{x.k}</p>
                      <p className="font-semibold text-sm" style={x.c ? { color: x.c } : undefined}>{x.v}</p>
                    </div>
                  ))}
                </div>
                <a
                  href={passLink(passGuest.guest.full_name)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium rounded-lg py-2"
                  style={{ border: `1px solid ${theme.colors.rule}` }}
                >
                  View Full Pass <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Legend */}
            <div className="glass-card p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Legend</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {[
                  { c: theme.colors.feature, t: "Green areas: DJ, Couple's Seat, Dance Floor and Band" },
                  { c: theme.colors.table, t: `Tables 1–${rounds.length}: ${config.seatsPerTable} chairs each (${roundSeats} seats)` },
                  { c: theme.colors.vip, t: `VIP long tables beside the walkway: ${config.vipSeats} chairs each (${vipSeats} seats)` },
                  { c: theme.colors.ink, t: "Filled chair: seat taken" },
                  { c: theme.colors.red, t: `Red arrow: ${WING_LABEL.left}, tables ${wingRange("left")}` },
                  { c: theme.colors.green, t: `Green arrow: ${WING_LABEL.right}, tables ${wingRange("right")}` },
                ].map(x => (
                  <li key={x.t} className="flex items-start gap-2">
                    <span className="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0" style={{ background: x.c }} />
                    <span>{x.t}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
                <Users className="w-3 h-3" />Table names and chair counts are set in Seating › Floor Plan.
              </p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!editMode && !!selected} onOpenChange={o => !o && setEditMode(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">{editMode === "rename" ? `Rename ${selected?.label}` : `Swap ${selected?.label}`}</DialogTitle>
          </DialogHeader>
          {editMode === "rename" ? (
            <div className="space-y-2">
              <Input value={nameInput} maxLength={40} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === "Enter" && renameTable()} autoFocus />
              <p className="text-xs text-muted-foreground">
                Everyone at this table moves with it, and their table card shows the new name.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Select value={swapWithId} onValueChange={setSwapWithId}>
                <SelectTrigger><SelectValue placeholder="Choose a table" /></SelectTrigger>
                <SelectContent>
                  {slots.filter(s => s.id !== selected?.id).map(s => {
                    const n = guestsAt(s).reduce((t, g) => t + seatsFor(g), 0);
                    return <SelectItem key={s.id} value={s.id}>{s.label} · {WING_LABEL[s.side]} · {n ? `${n} seated` : "empty"}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The two groups trade places. Pick an empty table to move this group there.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMode(null)}>Cancel</Button>
            <Button onClick={editMode === "rename" ? renameTable : swapTables} disabled={saving || (editMode === "rename" ? !nameInput.trim() : !swapWithId)}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editMode === "rename" ? "Save Name" : "Swap"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TableLayout;
