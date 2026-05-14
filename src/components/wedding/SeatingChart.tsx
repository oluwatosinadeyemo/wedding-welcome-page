import { useState, useEffect, useCallback } from "react";
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
import { Users, MapPin, Loader2, X } from "lucide-react";

interface GuestEntry {
  id: string;
  full_name: string;
  party_size: number;
  side: string | null;
  table_assignment: string | null;
  checked_in: boolean;
}

const SeatingChart = () => {
  const [guests, setGuests] = useState<GuestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState<GuestEntry | null>(null);
  const [assignInput, setAssignInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("guests" as any) as any)
      .select("id, full_name, party_size, side, table_assignment, checked_in")
      .order("full_name");
    if (data) setGuests(data as GuestEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const tableMap = new Map<string, GuestEntry[]>();
  const unassigned: GuestEntry[] = [];
  for (const g of guests) {
    if (!g.table_assignment) {
      unassigned.push(g);
    } else {
      if (!tableMap.has(g.table_assignment)) tableMap.set(g.table_assignment, []);
      tableMap.get(g.table_assignment)!.push(g);
    }
  }

  const allTableNames = Array.from(tableMap.keys()).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10);
    const nb = parseInt(b.replace(/\D/g, ""), 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  const totalSeats = (gs: GuestEntry[]) => gs.reduce((s, g) => s + g.party_size, 0);

  const openAssign = (guest: GuestEntry) => {
    setSelectedGuest(guest);
    setAssignInput(guest.table_assignment || "");
  };

  const handleAssign = async (tableValue?: string | null) => {
    if (!selectedGuest) return;
    setIsSaving(true);
    const newTable =
      tableValue !== undefined ? tableValue : assignInput.trim() || null;
    try {
      const { error } = await (supabase.from("guests" as any) as any)
        .update({ table_assignment: newTable })
        .eq("id", selectedGuest.id);
      if (error) throw error;
      setGuests((prev) =>
        prev.map((g) =>
          g.id === selectedGuest.id ? { ...g, table_assignment: newTable } : g
        )
      );
      toast({
        title: newTable ? `Assigned to ${newTable}` : "Removed from table",
      });
      setSelectedGuest(null);
    } catch (err: any) {
      toast({
        title: "Failed to save",
        description: err.message,
        variant: "destructive",
      });
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
        prev.map((g) =>
          g.id === guest.id ? { ...g, table_assignment: null } : g
        )
      );
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const filteredUnassigned = search
    ? unassigned.filter((g) =>
        g.full_name.toLowerCase().includes(search.toLowerCase())
      )
    : unassigned;

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

  return (
    <div>
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-primary" />
          {allTableNames.length} table{allTableNames.length !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-primary" />
          {guests.length - unassigned.length} / {guests.length} guests assigned
        </span>
        {unassigned.length > 0 && (
          <span className="text-yellow-500 font-medium">
            {unassigned.length} unassigned
          </span>
        )}
      </div>

      {unassigned.length > 0 && (
        <Input
          placeholder="Search unassigned guests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs mb-6 bg-background/50 border-border/50 rounded-xl"
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Assigned tables */}
        {allTableNames.map((tableName) => {
          const tableGuests = tableMap.get(tableName)!;
          const seats = totalSeats(tableGuests);
          return (
            <div key={tableName} className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-base text-foreground">
                  {tableName}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {tableGuests.length} guest{tableGuests.length !== 1 ? "s" : ""}{" "}
                  · {seats} seat{seats !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="space-y-1.5">
                {tableGuests.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-background/40 group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">
                        {g.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {g.party_size > 1 ? `Party of ${g.party_size}` : "1 seat"}
                        {g.side ? ` · ${g.side}` : ""}
                        {g.checked_in ? " · checked in" : ""}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 sm:transition-opacity">
                      <button
                        onClick={() => openAssign(g)}
                        className="text-xs text-primary hover:underline"
                      >
                        Move
                      </button>
                      <button
                        onClick={() => handleRemoveInline(g)}
                        className="text-destructive hover:text-destructive/70"
                        title="Remove from table"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Unassigned pool */}
        {unassigned.length > 0 && (
          <div className="glass-card p-4 border-yellow-500/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif text-base text-yellow-500">Unassigned</h3>
              <span className="text-xs text-muted-foreground">
                {unassigned.length} guest{unassigned.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-1.5">
              {filteredUnassigned.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-background/40"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {g.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {g.party_size > 1 ? `Party of ${g.party_size}` : "1 seat"}
                      {g.side ? ` · ${g.side}` : ""}
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
              {filteredUnassigned.length === 0 && search && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No match for "{search}"
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Assignment dialog */}
      <Dialog open={!!selectedGuest} onOpenChange={() => setSelectedGuest(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Assigning{" "}
              <span className="text-foreground font-medium">
                {selectedGuest?.full_name}
              </span>
              {selectedGuest && selectedGuest.party_size > 1
                ? ` (party of ${selectedGuest.party_size})`
                : ""}
            </p>
            <div>
              <Input
                placeholder="Table name or number (e.g. Table 1)"
                value={assignInput}
                onChange={(e) => setAssignInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && assignInput.trim()) handleAssign();
                }}
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAssign(null)}
                disabled={isSaving}
                className="text-muted-foreground mr-auto"
              >
                Remove from table
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGuest(null)}
              className="border-border/50"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleAssign()}
              disabled={isSaving || !assignInput.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Assign"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SeatingChart;
