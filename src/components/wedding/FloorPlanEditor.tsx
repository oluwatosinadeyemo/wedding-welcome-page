import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { buildSlots, DEFAULT_HALL_CONFIG, HallConfig, normaliseConfig, Slot } from "@/lib/hall-layout";
import FloorPlanSvg, { readFloorPlanTheme } from "./FloorPlanSvg";

interface Guest { id: string; full_name: string; party_size: number }
interface Props {
  tableMap: Map<string, Guest[]>;
  allTableNames: string[];
  onGuestsChanged: () => void;
}

export default function FloorPlanEditor({ tableMap, allTableNames, onGuestsChanged }: Props) {
  const [config, setConfig] = useState<HallConfig>(DEFAULT_HALL_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState<Slot | null>(null);
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();
  const theme = useMemo(() => readFloorPlanTheme(), []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("hall_layout").select("config").eq("id", "main").maybeSingle();
      if (data?.config) setConfig(normaliseConfig(data.config));
      setLoading(false);
    })();
  }, []);

  const slots = useMemo(() => buildSlots(config), [config]);
  const occupancy = useMemo(() => {
    const o: Record<string, number> = {};
    tableMap.forEach((gs, name) => { o[name.trim().toLowerCase()] = gs.reduce((s, g) => s + Math.max(1, g.party_size), 0); });
    return o;
  }, [tableMap]);
  const placed = new Set(slots.map(s => s.label.trim().toLowerCase()));
  const unplaced = allTableNames.filter(n => !placed.has(n.trim().toLowerCase()));

  const update = (patch: Partial<HallConfig>) => { setConfig(c => normaliseConfig({ ...c, ...patch })); setDirty(true); };

  const save = async (next = config) => {
    setSaving(true);
    const { error } = await supabase.from("hall_layout").upsert({ id: "main", config: next as any });
    setSaving(false);
    if (error) { toast({ title: "Could not save floor plan", description: error.message, variant: "destructive" }); return false; }
    setDirty(false);
    toast({ title: "Floor plan saved" });
    return true;
  };

  const applyTag = async () => {
    if (!editing) return;
    const name = tagInput.trim();
    if (!name) return;
    if (slots.some(s => s.id !== editing.id && s.label.trim().toLowerCase() === name.toLowerCase())) {
      toast({ title: "That name is already on another table", variant: "destructive" });
      return;
    }
    const old = editing.label;
    const next = normaliseConfig({ ...config, labels: { ...config.labels, [editing.id]: name } });
    setConfig(next);
    // Guests seated under the old tag follow the table to its new name.
    if (old !== name && (tableMap.get(old)?.length ?? 0) > 0 && !tableMap.has(name)) {
      await supabase.from("guests").update({ table_assignment: name }).eq("table_assignment", old);
      onGuestsChanged();
    }
    setEditing(null);
    await save(next);
  };

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const guestsAt = editing ? tableMap.get(editing.label) ?? [] : [];
  const num = (label: string, key: keyof HallConfig, min: number, max: number) => (
    <label className="text-xs text-muted-foreground space-y-1">
      <span>{label}</span>
      <Input type="number" min={min} max={max} value={config[key] as number} onChange={e => update({ [key]: Number(e.target.value) } as Partial<HallConfig>)} className="w-24 bg-background/50" />
    </label>
  );

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {num("Tables per row", "tablesPerRow", 1, 5)}
          {num("Rows per section", "rowsPerBlock", 1, 6)}
          {num("Chairs per table", "seatsPerTable", 2, 14)}
          {num("Chairs per VIP table", "vipSeats", 2, 16)}
        </div>
        <label className="block text-xs text-muted-foreground space-y-1">
          <span>Red arrow (left) is for</span>
          <Input value={config.leftArrowLabel} maxLength={24} onChange={e => update({ leftArrowLabel: e.target.value })} className="bg-background/50" />
        </label>
        <label className="block text-xs text-muted-foreground space-y-1">
          <span>Green arrow (right) is for</span>
          <Input value={config.rightArrowLabel} maxLength={24} onChange={e => update({ rightArrowLabel: e.target.value })} className="bg-background/50" />
        </label>
        <Button onClick={() => save()} disabled={!dirty || saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}Save Floor Plan
        </Button>
        <p className="text-xs text-muted-foreground">Tap any table to change its name tag. A guest's table on their access card is found by matching this name tag.</p>
        {unplaced.length > 0 && (
          <div className="text-xs rounded-lg border border-border/50 p-3 space-y-1">
            <p className="font-semibold text-foreground">Seated tables not on the floor plan yet</p>
            <p className="text-muted-foreground">{unplaced.join(", ")}</p>
            <p className="text-muted-foreground">Tap a table on the plan and give it one of these names.</p>
          </div>
        )}
      </div>
      <div className="rounded-xl overflow-hidden border border-border/50 max-w-3xl w-full">
        <div className="[&>svg]:w-full [&>svg]:h-auto">
          <FloorPlanSvg config={config} slots={slots} colors={theme.colors} serif={theme.serif} sans={theme.sans} occupancy={occupancy}
            onSelect={s => { setEditing(s); setTagInput(s.label); }} />
        </div>
      </div>

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-serif">{editing?.kind === "vip" ? "VIP long table" : "Round table"} · {editing?.seats} chairs</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <label className="block text-xs text-muted-foreground space-y-1">
              <span>Name tag</span>
              <Input value={tagInput} maxLength={40} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && applyTag()} autoFocus />
            </label>
            {unplaced.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {unplaced.map(n => (
                  <button key={n} onClick={() => setTagInput(n)} className={`text-xs px-2.5 py-1 rounded-full border ${tagInput === n ? "border-primary text-primary" : "border-border/50 text-muted-foreground"}`}>{n}</button>
                ))}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Seated here ({guestsAt.reduce((s, g) => s + Math.max(1, g.party_size), 0)}/{editing?.seats})</p>
              {guestsAt.length === 0 ? <p className="text-xs text-muted-foreground italic">Nobody yet — assign guests to “{editing?.label}” in the List view.</p> : (
                <ul className="text-sm text-muted-foreground max-h-40 overflow-y-auto">
                  {guestsAt.map(g => <li key={g.id}>{g.full_name}{g.party_size > 1 ? ` (+${g.party_size - 1})` : ""}</li>)}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={applyTag} disabled={!tagInput.trim()}>Save Name Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
