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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Shirt,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Download,
  CheckCircle,
  XCircle,
  Truck,
  Wallet,
  Scissors,
} from "lucide-react";

interface AgbadaOrder {
  id: string;
  full_name: string;
  phone: string | null;
  delivery_address: string | null;
  tailor: "ours" | "theirs";
  measurements: string | null;
  amount: number | null;
  paid: boolean;
  delivered: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type OrderForm = {
  full_name: string;
  phone: string;
  delivery_address: string;
  tailor: "ours" | "theirs";
  measurements: string;
  amount: string;
  paid: boolean;
  delivered: boolean;
  notes: string;
};

const emptyForm: OrderForm = {
  full_name: "",
  phone: "",
  delivery_address: "",
  tailor: "ours",
  measurements: "",
  amount: "",
  paid: false,
  delivered: false,
  notes: "",
};

const fmtAmount = (amount: number | null) =>
  amount == null
    ? "-"
    : new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }).format(amount);

const AgbadaTracker = () => {
  const [orders, setOrders] = useState<AgbadaOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "unpaid" | "paid" | "undelivered" | "delivered"
  >("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<OrderForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AgbadaOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.from("agbada_orders" as any) as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({
        title: "Failed to load agbada orders",
        description: error.message,
        variant: "destructive",
      });
    }
    if (data) setOrders(data as AgbadaOrder[]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateForm = <K extends keyof OrderForm>(key: K, value: OrderForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (order: AgbadaOrder) => {
    setEditingId(order.id);
    setForm({
      full_name: order.full_name,
      phone: order.phone ?? "",
      delivery_address: order.delivery_address ?? "",
      tailor: order.tailor,
      measurements: order.measurements ?? "",
      amount: order.amount != null ? String(order.amount) : "",
      paid: order.paid,
      delivered: order.delivered,
      notes: order.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    setIsSaving(true);

    const payload = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      delivery_address: form.delivery_address.trim() || null,
      tailor: form.tailor,
      measurements: form.measurements.trim() || null,
      amount: form.amount.trim() === "" ? null : Number(form.amount),
      paid: form.paid,
      delivered: form.delivered,
      notes: form.notes.trim() || null,
    };

    try {
      if (editingId) {
        const { data, error } = await (supabase.from("agbada_orders" as any) as any)
          .update(payload)
          .eq("id", editingId)
          .select()
          .single();
        if (error) throw error;
        setOrders((prev) =>
          prev.map((o) => (o.id === editingId ? (data as AgbadaOrder) : o))
        );
        toast({ title: "Order updated" });
      } else {
        const { data, error } = await (supabase.from("agbada_orders" as any) as any)
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setOrders((prev) => [data as AgbadaOrder, ...prev]);
        toast({ title: "Order added" });
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

  // Optimistic toggle for the quick paid / delivered checkmarks
  const toggleField = async (
    order: AgbadaOrder,
    field: "paid" | "delivered"
  ) => {
    const next = !order[field];
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, [field]: next } : o))
    );
    const { error } = await (supabase.from("agbada_orders" as any) as any)
      .update({ [field]: next })
      .eq("id", order.id);
    if (error) {
      // revert on failure
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, [field]: !next } : o))
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
      const { error } = await (supabase.from("agbada_orders" as any) as any)
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      toast({ title: "Order removed" });
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
    const total = orders.length;
    const paid = orders.filter((o) => o.paid).length;
    const delivered = orders.filter((o) => o.delivered).length;
    const ourTailor = orders.filter((o) => o.tailor === "ours").length;
    const outstanding = orders
      .filter((o) => !o.paid)
      .reduce((sum, o) => sum + (o.amount ?? 0), 0);
    const collected = orders
      .filter((o) => o.paid)
      .reduce((sum, o) => sum + (o.amount ?? 0), 0);
    return { total, paid, delivered, ourTailor, outstanding, collected };
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter === "unpaid" && o.paid) return false;
      if (statusFilter === "paid" && !o.paid) return false;
      if (statusFilter === "undelivered" && o.delivered) return false;
      if (statusFilter === "delivered" && !o.delivered) return false;
      if (!q) return true;
      return (
        o.full_name.toLowerCase().includes(q) ||
        (o.phone ?? "").toLowerCase().includes(q) ||
        (o.delivery_address ?? "").toLowerCase().includes(q) ||
        (o.notes ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const handleExportCSV = () => {
    const field = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "Name",
      "Phone",
      "Delivery Address",
      "Tailor",
      "Measurements",
      "Amount",
      "Paid",
      "Delivered",
      "Notes",
    ].map(field).join(",");
    const rows = orders.map((o) =>
      [
        field(o.full_name),
        field(o.phone),
        field(o.delivery_address),
        field(o.tailor === "ours" ? "Our tailor" : "Their tailor"),
        field(o.measurements),
        field(o.amount ?? ""),
        field(o.paid ? "Yes" : "No"),
        field(o.delivered ? "Yes" : "No"),
        field(o.notes),
      ].join(",")
    );
    const csv = "﻿" + [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agbada-orders-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterButtons: { key: typeof statusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unpaid", label: "Unpaid" },
    { key: "paid", label: "Paid" },
    { key: "undelivered", label: "Not delivered" },
    { key: "delivered", label: "Delivered" },
  ];

  const statCards = [
    { label: "Total Orders", value: stats.total, icon: Shirt, color: "text-primary" },
    { label: "Paid", value: `${stats.paid} / ${stats.total}`, icon: Wallet, color: "text-green-500" },
    { label: "Delivered", value: `${stats.delivered} / ${stats.total}`, icon: Truck, color: "text-blue-500" },
    { label: "Our Tailor", value: stats.ourTailor, icon: Scissors, color: "text-purple-400" },
    { label: "Collected", value: fmtAmount(stats.collected), icon: CheckCircle, color: "text-green-500" },
    { label: "Outstanding", value: fmtAmount(stats.outstanding), icon: XCircle, color: "text-yellow-500" },
  ];

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

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search name, phone, address..."
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
            disabled={orders.length === 0}
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
            Add Order
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
              <TableHead className="hidden lg:table-cell">Delivery Address</TableHead>
              <TableHead className="hidden md:table-cell">Tailor</TableHead>
              <TableHead className="hidden sm:table-cell">Amount</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Delivered</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((order) => (
              <TableRow key={order.id} className="border-border/20">
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{order.full_name}</p>
                    {order.phone && (
                      <p className="text-xs text-muted-foreground mt-0.5">{order.phone}</p>
                    )}
                    {order.measurements && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Measurements: {order.measurements}
                      </p>
                    )}
                    {order.notes && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 italic max-w-[220px] whitespace-normal break-words">
                        {order.notes}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell max-w-[220px] whitespace-normal break-words text-sm text-muted-foreground">
                  {order.delivery_address || "-"}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      order.tailor === "ours"
                        ? "bg-purple-500/10 text-purple-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {order.tailor === "ours" ? "Our tailor" : "Their tailor"}
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-foreground">
                  {fmtAmount(order.amount)}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleField(order, "paid")}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      order.paid
                        ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                        : "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                    }`}
                    title="Click to toggle payment status"
                  >
                    {order.paid ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <XCircle className="w-3 h-3" />
                    )}
                    {order.paid ? "Paid" : "Unpaid"}
                  </button>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleField(order, "delivered")}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      order.delivered
                        ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                    title="Click to toggle delivery status"
                  >
                    <Truck className="w-3 h-3" />
                    {order.delivered ? "Delivered" : "Pending"}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(order)}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                      title="Edit order"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(order)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {orders.length === 0
                    ? "No agbada orders yet. Click \"Add Order\" to start tracking."
                    : "No orders match your search or filter."}
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
            <DialogTitle>{editingId ? "Edit Agbada Order" : "Add Agbada Order"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="agbada-name">Full Name</Label>
              <Input
                id="agbada-name"
                value={form.full_name}
                onChange={(e) => updateForm("full_name", e.target.value)}
                required
                className="bg-background/50 border-border/50 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="agbada-phone">Phone</Label>
                <Input
                  id="agbada-phone"
                  value={form.phone}
                  onChange={(e) => updateForm("phone", e.target.value)}
                  placeholder="Optional"
                  className="bg-background/50 border-border/50 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agbada-tailor">Tailor</Label>
                <Select
                  value={form.tailor}
                  onValueChange={(v) => updateForm("tailor", v as "ours" | "theirs")}
                >
                  <SelectTrigger
                    id="agbada-tailor"
                    className="bg-background/50 border-border/50 rounded-xl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ours">Our tailor</SelectItem>
                    <SelectItem value="theirs">Their own tailor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agbada-address">Delivery Address</Label>
              <Input
                id="agbada-address"
                value={form.delivery_address}
                onChange={(e) => updateForm("delivery_address", e.target.value)}
                placeholder="Where the agbada should be delivered"
                className="bg-background/50 border-border/50 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="agbada-measurements">Measurements / Size</Label>
                <Input
                  id="agbada-measurements"
                  value={form.measurements}
                  onChange={(e) => updateForm("measurements", e.target.value)}
                  placeholder="e.g. XL, or chest 42..."
                  className="bg-background/50 border-border/50 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="agbada-amount">Amount (₦)</Label>
                <Input
                  id="agbada-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => updateForm("amount", e.target.value)}
                  placeholder="Optional"
                  className="bg-background/50 border-border/50 rounded-xl"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.paid}
                  onChange={(e) => updateForm("paid", e.target.checked)}
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <span className="text-sm text-foreground">Paid</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.delivered}
                  onChange={(e) => updateForm("delivered", e.target.checked)}
                  className="w-4 h-4 rounded accent-primary cursor-pointer"
                />
                <span className="text-sm text-foreground">Delivered</span>
              </label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agbada-notes">Notes</Label>
              <Input
                id="agbada-notes"
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
                  "Add Order"
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
            <DialogTitle>Remove Order</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground pt-1">
            Are you sure you want to remove{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.full_name}
            </span>
            's agbada order? This cannot be undone.
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

export default AgbadaTracker;
