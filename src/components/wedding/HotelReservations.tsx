import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  BedDouble,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Download,
  CheckCircle,
  CircleDashed,
  Wallet,
} from "lucide-react";

interface HotelReservation {
  id: string;
  full_name: string;
  room_category: string | null;
  percent_paid: number;
  nights: number | null;
  check_in: string | null;
  check_out: string | null;
  nights_booked: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type ResForm = {
  full_name: string;
  room_category: string;
  percent_paid: string;
  nights: string;
  check_in: string;
  check_out: string;
  nights_booked: string;
  notes: string;
};

const emptyForm: ResForm = {
  full_name: "",
  room_category: "",
  percent_paid: "0",
  nights: "",
  check_in: "",
  check_out: "",
  nights_booked: "",
  notes: "",
};

const clampPercent = (n: number) =>
  isNaN(n) ? 0 : Math.max(0, Math.min(100, Math.round(n)));

/** Abiis Hotel & Suites published rates (with breakfast), per night */
const ROOM_RATES: Record<string, number> = {
  Standard: 85000,
  Deluxe: 95000,
  "Double Deluxe": 110000,
  "Executive Suite": 150000,
  "Super Deluxe": 120000,
  "Abiis Executive Suites": 220000,
};

/** Wedding discount kindly given by the hotel */
const DISCOUNT = 0.1;

const discountedRate = (category: string | null) => {
  if (!category) return 0;
  const rate = ROOM_RATES[category.trim()] ?? 0;
  return Math.round(rate * (1 - DISCOUNT));
};

const naira = (n: number) =>
  "₦" + Math.round(n).toLocaleString("en-NG");

/** Cost of a reservation after discount, and how much of it is settled */
const resCost = (r: { room_category: string | null; nights: number | null; percent_paid: number }) => {
  const rate = discountedRate(r.room_category);
  const nights = r.nights ?? 0;
  const total = rate * nights;
  const paid = Math.round((total * r.percent_paid) / 100);
  return { rate, total, paid, balance: total - paid };
};


const HotelReservations = () => {
  const [reservations, setReservations] = useState<HotelReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "unpaid" | "partial" | "full"
  >("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ResForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<HotelReservation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inline percentage editing
  const [editingPctId, setEditingPctId] = useState<string | null>(null);
  const [pctDraft, setPctDraft] = useState("");

  const { toast } = useToast();

  const fetchReservations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("hotel_reservations" as any) as any)
      .select("*")
      .order("full_name", { ascending: true });
    if (error) {
      toast({
        title: "Failed to load reservations",
        description: error.message,
        variant: "destructive",
      });
    }
    if (data) setReservations(data as HotelReservation[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const updateForm = <K extends keyof ResForm>(key: K, value: ResForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (r: HotelReservation) => {
    setEditingId(r.id);
    setForm({
      full_name: r.full_name,
      room_category: r.room_category ?? "",
      percent_paid: String(r.percent_paid ?? 0),
      nights: r.nights != null ? String(r.nights) : "",
      check_in: r.check_in ?? "",
      check_out: r.check_out ?? "",
      nights_booked: r.nights_booked ?? "",
      notes: r.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    setIsSaving(true);

    const payload = {
      full_name: form.full_name.trim(),
      room_category: form.room_category.trim() || null,
      percent_paid: clampPercent(Number(form.percent_paid)),
      nights: form.nights.trim() === "" ? null : Number(form.nights),
      check_in: form.check_in.trim() || null,
      check_out: form.check_out.trim() || null,
      nights_booked: form.nights_booked.trim() || null,
      notes: form.notes.trim() || null,
    };

    try {
      if (editingId) {
        const { data, error } = await (supabase.from("hotel_reservations" as any) as any)
          .update(payload)
          .eq("id", editingId)
          .select()
          .single();
        if (error) throw error;
        setReservations((prev) =>
          prev.map((r) => (r.id === editingId ? (data as HotelReservation) : r))
        );
        toast({ title: "Reservation updated" });
      } else {
        const { data, error } = await (supabase.from("hotel_reservations" as any) as any)
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setReservations((prev) =>
          [...prev, data as HotelReservation].sort((a, b) =>
            a.full_name.localeCompare(b.full_name)
          )
        );
        toast({ title: "Reservation added" });
      }
      setDialogOpen(false);
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

  const savePercent = async (r: HotelReservation, raw: string) => {
    const next = clampPercent(Number(raw));
    setEditingPctId(null);
    if (next === r.percent_paid) return;
    // optimistic
    setReservations((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, percent_paid: next } : x))
    );
    const { error } = await (supabase.from("hotel_reservations" as any) as any)
      .update({ percent_paid: next })
      .eq("id", r.id);
    if (error) {
      setReservations((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, percent_paid: r.percent_paid } : x))
      );
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await (supabase.from("hotel_reservations" as any) as any)
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      setReservations((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast({ title: "Reservation removed" });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const total = reservations.length;
    const fullyPaid = reservations.filter((r) => r.percent_paid >= 100).length;
    const notPaid = reservations.filter((r) => r.percent_paid <= 0).length;
    const partial = total - fullyPaid - notPaid;
    const totalNights = reservations.reduce((s, r) => s + (r.nights ?? 0), 0);
    const money = reservations.reduce(
      (acc, r) => {
        const c = resCost(r);
        return {
          total: acc.total + c.total,
          paid: acc.paid + c.paid,
          balance: acc.balance + c.balance,
        };
      },
      { total: 0, paid: 0, balance: 0 }
    );
    const avgPaid =
      total === 0
        ? 0
        : Math.round(
            reservations.reduce((s, r) => s + r.percent_paid, 0) / total
          );
    return { total, fullyPaid, notPaid, partial, totalNights, avgPaid, money };
  }, [reservations]);


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reservations.filter((r) => {
      if (statusFilter === "unpaid" && r.percent_paid > 0) return false;
      if (statusFilter === "partial" && (r.percent_paid <= 0 || r.percent_paid >= 100))
        return false;
      if (statusFilter === "full" && r.percent_paid < 100) return false;
      if (!q) return true;
      return (
        r.full_name.toLowerCase().includes(q) ||
        (r.room_category ?? "").toLowerCase().includes(q) ||
        (r.nights_booked ?? "").toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [reservations, search, statusFilter]);

  const handleExportCSV = () => {
    const field = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "Name",
      "Room Category",
      "Rate/night (after 10% off)",
      "Nights",
      "Total",
      "% Paid",
      "Amount Paid",
      "Balance",
      "Check-in",
      "Check-out",
      "Nights Booked",
      "Notes",
    ].map(field).join(",");
    const rows = reservations.map((r) => {
      const c = resCost(r);
      return [
        field(r.full_name),
        field(r.room_category),
        field(c.rate || ""),
        field(r.nights ?? ""),
        field(c.total || ""),
        field(r.percent_paid),
        field(c.paid || ""),
        field(c.balance || ""),
        field(r.check_in),
        field(r.check_out),
        field(r.nights_booked),
        field(r.notes),
      ].join(",");
    });

    const csv = "﻿" + [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hotel-reservations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterButtons: { key: typeof statusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unpaid", label: "Not paid" },
    { key: "partial", label: "Part paid" },
    { key: "full", label: "Fully paid" },
  ];

  const statCards = [
    { label: "Reservations", value: stats.total, icon: BedDouble, color: "text-primary" },
    { label: "Fully Paid", value: `${stats.fullyPaid} / ${stats.total}`, icon: CheckCircle, color: "text-green-500" },
    { label: "Part Paid", value: stats.partial, icon: CircleDashed, color: "text-yellow-500" },
    { label: "Not Paid", value: stats.notPaid, icon: Wallet, color: "text-red-500" },
    { label: "Room-nights", value: stats.totalNights, icon: BedDouble, color: "text-purple-400" },
    { label: "Total (after 10% off)", value: naira(stats.money.total), icon: Wallet, color: "text-blue-500" },
    { label: "Collected", value: naira(stats.money.paid), icon: CheckCircle, color: "text-green-500" },
    { label: "Outstanding", value: naira(stats.money.balance), icon: Wallet, color: "text-red-500" },
  ];


  const pctColor = (p: number) =>
    p >= 100 ? "bg-green-500" : p > 0 ? "bg-yellow-500" : "bg-muted-foreground/40";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 mb-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
            <p className="text-xl font-serif text-foreground break-words">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
      {/* Room rate card (Abiis Hotel & Suites, 10% wedding discount applied) */}
      <div className="glass-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BedDouble className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium text-foreground">
            Abiis Hotel &amp; Suites — rates per night (10% wedding discount applied)
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.entries(ROOM_RATES).map(([cat, rate]) => (
            <div key={cat} className="rounded-xl border border-border/40 p-3">
              <p className="text-xs text-muted-foreground">{cat}</p>
              <p className="text-base text-foreground tabular-nums">
                {naira(rate * (1 - DISCOUNT))}
              </p>
              <p className="text-xs text-muted-foreground/70 line-through tabular-nums">
                {naira(rate)}
              </p>
            </div>
          ))}
        </div>
      </div>


      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search name, room, nights..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9 bg-background/50 border-border/50 rounded-xl"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={reservations.length === 0}
            className="border-border/50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={openAdd}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Reservation
          </Button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {filterButtons.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              statusFilter === f.key
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-border/50 text-muted-foreground hover:border-primary/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border/30">
              <TableHead>Name</TableHead>
              <TableHead>Room Category</TableHead>
              <TableHead className="hidden md:table-cell">Nights</TableHead>
              <TableHead className="hidden sm:table-cell">Cost</TableHead>
              <TableHead className="min-w-[150px]">% Paid</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (

              <TableRow key={r.id} className="border-border/20">
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{r.full_name}</p>
                    {r.notes && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 italic max-w-[220px] whitespace-normal break-words">
                        {r.notes}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {r.room_category ? (
                    <div className="space-y-1">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap inline-block">
                        {r.room_category}
                      </span>
                      {discountedRate(r.room_category) > 0 && (
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {naira(discountedRate(r.room_category))}/night
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {r.nights ? (
                    <div>
                      <p className="text-foreground">
                        {r.nights} night{r.nights !== 1 ? "s" : ""}
                      </p>
                      {(r.check_in || r.check_out) && (
                        <p className="text-xs text-muted-foreground/80">
                          {r.check_in || "?"} → {r.check_out || "?"}
                        </p>
                      )}
                      {r.nights_booked && (
                        <p className="text-xs text-muted-foreground/60">{r.nights_booked}</p>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {editingPctId === r.id ? (
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      autoFocus
                      value={pctDraft}
                      onChange={(e) => setPctDraft(e.target.value)}
                      onBlur={() => savePercent(r, pctDraft)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") savePercent(r, pctDraft);
                        if (e.key === "Escape") setEditingPctId(null);
                      }}
                      className="h-8 w-20 bg-background/50 border-border/50 rounded-lg"
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setEditingPctId(r.id);
                        setPctDraft(String(r.percent_paid));
                      }}
                      className="group flex items-center gap-2 w-full max-w-[150px]"
                      title="Click to edit % paid"
                    >
                      <div className="h-2 flex-1 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pctColor(r.percent_paid)}`}
                          style={{ width: `${r.percent_paid}%` }}
                        />
                      </div>
                      <span className="text-sm text-foreground tabular-nums w-10 text-right group-hover:text-primary">
                        {r.percent_paid}%
                      </span>
                    </button>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(r)}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                      title="Edit reservation"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(r)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete reservation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {reservations.length === 0
                    ? "No reservations yet. Click \"Add Reservation\" to start."
                    : "No reservations match your search or filter."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Reservation" : "Add Reservation"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="hotel-name">Name</Label>
              <Input
                id="hotel-name"
                value={form.full_name}
                onChange={(e) => updateForm("full_name", e.target.value)}
                required
                className="bg-background/50 border-border/50 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="hotel-room">Room Category</Label>
                <Input
                  id="hotel-room"
                  value={form.room_category}
                  onChange={(e) => updateForm("room_category", e.target.value)}
                  placeholder="e.g. Deluxe, Standard"
                  list="room-category-options"
                  className="bg-background/50 border-border/50 rounded-xl"
                />
                <datalist id="room-category-options">
                  <option value="Standard" />
                  <option value="Deluxe" />
                  <option value="Double Deluxe" />
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hotel-percent">% Paid</Label>
                <Input
                  id="hotel-percent"
                  type="number"
                  min={0}
                  max={100}
                  value={form.percent_paid}
                  onChange={(e) => updateForm("percent_paid", e.target.value)}
                  className="bg-background/50 border-border/50 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="hotel-nights">Nights</Label>
                <Input
                  id="hotel-nights"
                  type="number"
                  min={0}
                  value={form.nights}
                  onChange={(e) => updateForm("nights", e.target.value)}
                  placeholder="e.g. 2"
                  className="bg-background/50 border-border/50 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hotel-checkin">Check-in</Label>
                <Input
                  id="hotel-checkin"
                  value={form.check_in}
                  onChange={(e) => updateForm("check_in", e.target.value)}
                  placeholder="e.g. Thu 10 Dec"
                  className="bg-background/50 border-border/50 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hotel-checkout">Check-out</Label>
                <Input
                  id="hotel-checkout"
                  value={form.check_out}
                  onChange={(e) => updateForm("check_out", e.target.value)}
                  placeholder="e.g. Sun 13 Dec"
                  className="bg-background/50 border-border/50 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hotel-nights-booked">Nights Booked</Label>
              <Input
                id="hotel-nights-booked"
                value={form.nights_booked}
                onChange={(e) => updateForm("nights_booked", e.target.value)}
                placeholder="e.g. Thu, Fri, Sat"
                className="bg-background/50 border-border/50 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hotel-notes">Notes</Label>
              <Input
                id="hotel-notes"
                value={form.notes}
                onChange={(e) => updateForm("notes", e.target.value)}
                placeholder="Anything else worth tracking"
                className="bg-background/50 border-border/50 rounded-xl"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-border/50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !form.full_name.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingId ? (
                  "Save Changes"
                ) : (
                  "Add Reservation"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Reservation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground pt-1">
            Are you sure you want to remove{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.full_name}
            </span>
            's hotel reservation? This cannot be undone.
          </p>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              className="border-border/50"
            >
              Cancel
            </Button>
            <Button onClick={handleDelete} disabled={isDeleting} variant="destructive">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HotelReservations;
