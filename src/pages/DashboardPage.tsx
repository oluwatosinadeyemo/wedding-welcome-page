import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
  Download,
  Loader2,
  LogIn,
  Trash2,
  Image as ImageIcon,
  QrCode,
  UserCheck,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import JSZip from "jszip";

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAIL || "oluwatosinadeyemo50@gmail.com")
  .split(",")
  .map((e: string) => e.trim().toLowerCase());

interface RSVPEntry {
  id: string;
  attending: string;
  number_of_guests: number;
  message: string | null;
  submitted_at: string;
  guest: {
    full_name: string;
    invite_code: string;
    party_size: number;
    side: string | null;
    checked_in: boolean;
    checked_in_at: string | null;
  };
}

interface PhotoEntry {
  id: string;
  file_path: string;
  file_name: string;
  uploaded_by: string | null;
  caption: string | null;
  created_at: string;
  expires_at: string | null;
  status?: string | null;
  category?: string | null;
  isStatic?: boolean;
}

const STATIC_PREWEDDING: PhotoEntry[] = [
  { id: "static-1", file_path: "/prewedding/DAP_8980.jpg", file_name: "DAP_8980.jpg", uploaded_by: "Pre-wedding shoot", caption: null, created_at: "", expires_at: null, status: "approved", category: "prewedding", isStatic: true },
  { id: "static-2", file_path: "/prewedding/DAP_9007.jpg", file_name: "DAP_9007.jpg", uploaded_by: "Pre-wedding shoot", caption: null, created_at: "", expires_at: null, status: "approved", category: "prewedding", isStatic: true },
  { id: "static-3", file_path: "/prewedding/DAP_9213.jpg", file_name: "DAP_9213.jpg", uploaded_by: "Pre-wedding shoot", caption: null, created_at: "", expires_at: null, status: "approved", category: "prewedding", isStatic: true },
  { id: "static-4", file_path: "/prewedding/DAP_9459.jpg", file_name: "DAP_9459.jpg", uploaded_by: "Pre-wedding shoot", caption: null, created_at: "", expires_at: null, status: "approved", category: "prewedding", isStatic: true },
  { id: "static-5", file_path: "/prewedding/DAP_9153.jpg", file_name: "DAP_9153.jpg", uploaded_by: "Pre-wedding shoot", caption: null, created_at: "", expires_at: null, status: "approved", category: "prewedding", isStatic: true },
  { id: "static-6", file_path: "/prewedding/DAP_9195.jpg", file_name: "DAP_9195.jpg", uploaded_by: "Pre-wedding shoot", caption: null, created_at: "", expires_at: null, status: "approved", category: "prewedding", isStatic: true },
  { id: "static-7", file_path: "/prewedding/DAP_9392.jpg", file_name: "DAP_9392.jpg", uploaded_by: "Pre-wedding shoot", caption: null, created_at: "", expires_at: null, status: "approved", category: "prewedding", isStatic: true },
  { id: "static-8", file_path: "/prewedding/DAP_9451.jpg", file_name: "DAP_9451.jpg", uploaded_by: "Pre-wedding shoot", caption: null, created_at: "", expires_at: null, status: "approved", category: "prewedding", isStatic: true },
];

const isWalkIn = (inviteCode: string) =>
  inviteCode?.toUpperCase().startsWith("WALK-IN-");

const DashboardPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const [rsvps, setRsvps] = useState<RSVPEntry[]>([]);
  const [totalGuests, setTotalGuests] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState<string | null>(null);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const { toast } = useToast();

  const isAdmin = ADMIN_EMAILS.includes(user?.email?.toLowerCase() ?? "");

  const allPhotos = useMemo<PhotoEntry[]>(() => {
    const dbIds = new Set(photos.map((p) => p.file_path));
    const staticFiltered = STATIC_PREWEDDING.filter((s) => !dbIds.has(s.file_path));
    return [...staticFiltered, ...photos];
  }, [photos]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setIsCheckingAuth(false);
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        setShowChangePassword(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = useCallback(async () => {
    const { data: rsvpData } = await (supabase.from("rsvps" as any) as any)
      .select(
        `id, attending, number_of_guests, message, submitted_at,
         guest:guests!inner(full_name, invite_code, party_size, side, checked_in, checked_in_at)`
      )
      .order("submitted_at", { ascending: false });

    if (rsvpData) {
      setRsvps(rsvpData.map((r: any) => ({ ...r, guest: r.guest })));
    }

    const { count: guestCount } = await (supabase.from("guests" as any) as any).select(
      "*",
      { count: "exact", head: true }
    );
    setTotalGuests(guestCount || 0);

    const { count: inCount } = await (supabase.from("guests" as any) as any)
      .select("*", { count: "exact", head: true })
      .eq("checked_in", true);
    setCheckedInCount(inCount || 0);

    const { data: photoData } = await supabase
      .from("wedding_photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (photoData) setPhotos(photoData as unknown as PhotoEntry[]);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, fetchData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        toast({ title: "Account created!", description: "You are now signed in." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      toast({
        title: isSignUp ? "Sign up failed" : "Login failed",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      const siteUrl = import.meta.env.VITE_SITE_URL || "https://www.tandp2026.com";
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: `${siteUrl}/dashboard`,
      });
      if (error) throw error;
      setResetEmailSent(true);
    } catch (err: any) {
      toast({ title: "Failed to send reset email", description: err.message, variant: "destructive" });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated successfully" });
      setShowChangePassword(false);
      setIsPasswordRecovery(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Failed to update password", description: err.message, variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleDownloadAllPhotos = async () => {
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      let downloaded = 0;
      for (const photo of allPhotos) {
        if (photo.isStatic || failedImageIds.has(photo.id)) continue;
        const { data: signedData } = await supabase.storage
          .from("wedding-photos")
          .createSignedUrl(photo.file_path, 3600);
        if (signedData?.signedUrl) {
          const blob = await fetch(signedData.signedUrl).then((r) => r.blob());
          const ext = photo.file_name.split(".").pop() || "jpg";
          zip.file(`${photo.uploaded_by || "guest"}-${downloaded + 1}.${ext}`, blob);
          downloaded++;
        }
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wedding-photos-${new Date().toISOString().split("T")[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Download complete!", description: `${downloaded} photos downloaded.` });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeletePhoto = async (photo: PhotoEntry) => {
    setIsDeletingPhoto(photo.id);
    try {
      await supabase.storage.from("wedding-photos").remove([photo.file_path]);
      await supabase.from("wedding_photos").delete().eq("id", photo.id);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      toast({ title: "Photo deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setIsDeletingPhoto(null);
    }
  };

  const handleSetPhotoStatus = async (photo: PhotoEntry, status: "approved" | "rejected") => {
    if (photo.isStatic) return;
    try {
      const { error } = await (supabase.from("wedding_photos") as any)
        .update({ status })
        .eq("id", photo.id);
      if (error) throw error;
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, status } : p)));
      toast({ title: status === "approved" ? "Photo approved" : "Photo rejected" });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  const handleSetPhotoCategory = async (photo: PhotoEntry, category: string | null) => {
    if (photo.isStatic) return;
    try {
      const { error } = await (supabase.from("wedding_photos") as any)
        .update({ category })
        .eq("id", photo.id);
      if (error) throw error;
      setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, category } : p)));
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      const { data: guests, error } = await (supabase.from("guests" as any) as any)
        .select(
          `full_name, invite_code, party_size, side, table_assignment, pass_id, checked_in, checked_in_at,
           rsvps(attending, number_of_guests, message, submitted_at)`
        )
        .order("full_name");

      if (error) throw error;

      // Quote and escape a single CSV field
      const field = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

      // DD/MM/YYYY HH:MM — consistent across all browsers/locales
      const fmtDate = (iso: string | null | undefined) => {
        if (!iso) return "";
        const d = new Date(iso);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        return `${dd}/${mm}/${d.getFullYear()} ${hh}:${min}`;
      };

      const totalGuests = guests?.length ?? 0;
      const attending = (guests || []).filter((g: any) => g.rsvps?.[0]?.attending === "yes").length;
      const checkedIn = (guests || []).filter((g: any) => g.checked_in).length;
      const now = new Date();

      const meta = [
        `${field("Tosin & Pelumi Wedding")},,,,,,,,,,,,`,
        `${field("Guest List Report")},,,,,,,,,,,,`,
        `${field("Exported")},${field(fmtDate(now.toISOString()))},,,,,,,,,,,`,
        `${field("Total Guests")},${field(totalGuests)},,,,,,,,,,,`,
        `${field("Attending")},${field(attending)},,,,,,,,,,,`,
        `${field("Checked In")},${field(checkedIn)},,,,,,,,,,,`,
        "",
      ];

      const headers = [
        "Name", "Side", "Invite Code", "Walk-in",
        "Party Size", "Table Assignment",
        "RSVP Status", "Guests Attending", "RSVP Date", "Message",
        "Has Pass", "Checked In", "Check-in Time",
      ].map(field).join(",");

      const rows = (guests || []).map((g: any) => {
        const rsvp = g.rsvps?.[0];
        const rsvpStatus =
          rsvp?.attending === "yes" ? "Attending" :
          rsvp?.attending === "no" ? "Declined" :
          rsvp?.attending === "maybe" ? "Maybe" : "No Response";
        return [
          field(g.full_name),
          field(g.side || ""),
          field(g.invite_code),
          field(isWalkIn(g.invite_code) ? "Yes" : "No"),
          field(g.party_size),
          field(g.table_assignment || ""),
          field(rsvpStatus),
          field(rsvp?.number_of_guests ?? ""),
          field(fmtDate(rsvp?.submitted_at)),
          field(rsvp?.message || ""),
          field(g.pass_id ? "Yes" : "No"),
          field(g.checked_in ? "Yes" : "No"),
          field(fmtDate(g.checked_in_at)),
        ].join(",");
      });

      // UTF-8 BOM ensures Excel opens without encoding issues
      const csv = "﻿" + [...meta, headers, ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tosin-pelumi-guest-list-${now.toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Guest list exported", description: `${totalGuests} guests · ${attending} attending · ${checkedIn} checked in` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setIsExportingCSV(false);
    }
  };

  const attending = rsvps.filter((r) => r.attending === "yes");
  const declined = rsvps.filter((r) => r.attending === "no");
  const maybe = rsvps.filter((r) => r.attending === "maybe");
  const totalAttending = attending.reduce((sum, r) => sum + r.number_of_guests, 0);
  const pending = totalGuests - rsvps.length;

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-hydrangea-light/5 to-lavender-light/5" />
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="glass-card p-8 max-w-md w-full">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-serif text-2xl text-foreground mb-2 text-center">
              Couple Dashboard
            </h2>
            <p className="text-muted-foreground text-sm text-center mb-6">
              {isForgotPassword
                ? "Enter your email to receive a reset link"
                : isSignUp
                ? "Create your admin account"
                : "Sign in with your admin account to manage your wedding"}
            </p>
            {user && !isAdmin && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
                This account does not have admin access.
                <button onClick={handleSignOut} className="underline ml-1">
                  Sign out
                </button>
              </div>
            )}

            {isForgotPassword ? (
              resetEmailSent ? (
                <div className="text-center space-y-4">
                  <div className="p-4 rounded-xl bg-green-500/10 text-green-600 text-sm">
                    Reset link sent! Check your email and click the link to set a new password.
                  </div>
                  <button
                    onClick={() => { setIsForgotPassword(false); setResetEmailSent(false); }}
                    className="text-primary hover:text-primary/80 text-sm"
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    className="bg-background/50 border-border/50 rounded-xl"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-6"
                  >
                    {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
                  </Button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setIsForgotPassword(false)}
                      className="text-muted-foreground hover:text-foreground text-sm"
                    >
                      Back to sign in
                    </button>
                  </div>
                </form>
              )
            ) : (
              <>
                <form onSubmit={handleLogin} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    className="bg-background/50 border-border/50 rounded-xl"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-background/50 border-border/50 rounded-xl"
                  />
                  <Button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-6"
                  >
                    {isAuthLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isSignUp ? (
                      "Create Account"
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
                <div className="mt-4 text-center space-y-2">
                  <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-primary hover:text-primary/80 text-sm"
                  >
                    {isSignUp
                      ? "Already have an account? Sign in"
                      : "First time? Create an account"}
                  </button>
                  {!isSignUp && (
                    <div>
                      <button
                        onClick={() => setIsForgotPassword(true)}
                        className="text-muted-foreground hover:text-foreground text-sm"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                  <div>
                    <Link
                      to="/"
                      className="text-muted-foreground hover:text-foreground text-sm"
                    >
                      Back to Wedding Site
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl text-foreground">T &amp; P Dashboard</h1>
            <p className="text-muted-foreground text-xs">{user.email}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <Link to="/checkin">
              <Button
                variant="outline"
                size="sm"
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <QrCode className="w-4 h-4 mr-1" />
                Check-In Tool
              </Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="sm" className="border-border/50">
                View Site
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChangePassword(true)}
              className="border-border/50"
            >
              <KeyRound className="w-4 h-4 mr-1" />
              Change Password
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="border-border/50"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 mb-8">
          {[
            { label: "Total Invited", value: totalGuests, icon: Users, color: "text-primary" },
            {
              label: "Attending",
              value: `${attending.length} (${totalAttending})`,
              icon: CheckCircle,
              color: "text-green-500",
            },
            { label: "Declined", value: declined.length, icon: XCircle, color: "text-red-500" },
            { label: "Maybe", value: maybe.length, icon: HelpCircle, color: "text-yellow-500" },
            { label: "Pending", value: pending, icon: Clock, color: "text-muted-foreground" },
            {
              label: "Checked In",
              value: checkedInCount,
              icon: UserCheck,
              color: "text-blue-500",
            },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-4 text-center">
              <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
              <p className="text-2xl font-serif text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="rsvps">
          <TabsList className="bg-card/50 border border-border/50 mb-6">
            <TabsTrigger value="rsvps">RSVPs ({rsvps.length})</TabsTrigger>
            <TabsTrigger value="photos">Photos ({allPhotos.length})</TabsTrigger>
          </TabsList>

          {/* RSVPs Tab */}
          <TabsContent value="rsvps">
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={isExportingCSV}
                className="border-border/50"
              >
                {isExportingCSV ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export Guest List (CSV)
              </Button>
            </div>
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead>Guest</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Guests</TableHead>
                    <TableHead className="hidden md:table-cell">Side</TableHead>
                    <TableHead className="hidden md:table-cell">Checked In</TableHead>
                    <TableHead className="hidden lg:table-cell">Message</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rsvps.map((rsvp) => (
                    <TableRow key={rsvp.id} className="border-border/20">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">
                            {rsvp.guest.full_name}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <p className="text-xs text-muted-foreground">
                              {rsvp.guest.invite_code}
                            </p>
                            {isWalkIn(rsvp.guest.invite_code) && (
                              <span className="text-xs bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-full">
                                Walk-in
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            rsvp.attending === "yes"
                              ? "bg-green-500/10 text-green-500"
                              : rsvp.attending === "no"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-yellow-500/10 text-yellow-500"
                          }`}
                        >
                          {rsvp.attending === "yes" ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : rsvp.attending === "no" ? (
                            <XCircle className="w-3 h-3" />
                          ) : (
                            <HelpCircle className="w-3 h-3" />
                          )}
                          {rsvp.attending}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {rsvp.number_of_guests}
                      </TableCell>
                      <TableCell className="hidden md:table-cell capitalize">
                        {rsvp.guest.side || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {rsvp.guest.checked_in ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full">
                            <UserCheck className="w-3 h-3" />
                            {rsvp.guest.checked_in_at
                              ? new Date(rsvp.guest.checked_in_at).toLocaleTimeString(
                                  [],
                                  { hour: "2-digit", minute: "2-digit" }
                                )
                              : "Yes"}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell max-w-[200px] truncate">
                        {rsvp.message || "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {new Date(rsvp.submitted_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rsvps.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No RSVPs yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos">
            <div className="mb-6">
              <Button
                onClick={handleDownloadAllPhotos}
                disabled={isDownloading || photos.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download Guest Photos ({photos.filter((p) => !failedImageIds.has(p.id)).length})
                  </>
                )}
              </Button>
            </div>

            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead>Photo</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead className="hidden md:table-cell">Caption</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPhotos.map((photo) => {
                    const isBroken = failedImageIds.has(photo.id);
                    const status = photo.status || "pending";
                    const statusClasses =
                      status === "approved"
                        ? "bg-green-500/10 text-green-500"
                        : status === "rejected"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-yellow-500/10 text-yellow-500";
                    const imgSrc = photo.isStatic
                      ? photo.file_path
                      : supabase.storage.from("wedding-photos").getPublicUrl(photo.file_path).data.publicUrl;
                    return (
                      <TableRow
                        key={photo.id}
                        className={`border-border/20 ${isBroken ? "opacity-50" : ""}`}
                      >
                        <TableCell>
                          {isBroken ? (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center" title="Image missing from storage">
                              <AlertCircle className="w-5 h-5 text-destructive" />
                            </div>
                          ) : (
                            <img
                              src={imgSrc}
                              alt={photo.caption || "Photo"}
                              loading="lazy"
                              className="w-12 h-12 rounded-lg object-cover"
                              onError={() =>
                                setFailedImageIds((prev) => new Set([...prev, photo.id]))
                              }
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-foreground">
                          <div>
                            <p>
                              {photo.category === "weddingday"
                                ? photo.uploaded_by || "Guest"
                                : "—"}
                            </p>
                            {photo.isStatic && (
                              <span className="text-xs text-muted-foreground">Static file</span>
                            )}
                            {isBroken && (
                              <span className="text-xs text-destructive">Missing from storage</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground max-w-[150px] truncate">
                          {photo.caption || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <select
                            value={photo.category || ""}
                            onChange={(e) =>
                              handleSetPhotoCategory(photo, e.target.value || null)
                            }
                            disabled={photo.isStatic}
                            className="bg-background/50 border border-border/50 rounded-md px-2 py-1 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <option value="">None</option>
                            <option value="engagement">Engagement</option>
                            <option value="prewedding">Pre-wedding</option>
                            <option value="weddingday">Wedding day</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          {photo.isStatic ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                              approved
                            </span>
                          ) : (
                            <span className={`text-xs px-2 py-1 rounded-full ${statusClasses}`}>
                              {status}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {photo.isStatic ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex gap-1">
                              {status !== "approved" && !isBroken && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSetPhotoStatus(photo, "approved")}
                                  className="text-green-500 hover:text-green-500 hover:bg-green-500/10"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              {status !== "rejected" && !isBroken && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSetPhotoStatus(photo, "rejected")}
                                  className="text-yellow-500 hover:text-yellow-500 hover:bg-yellow-500/10"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePhoto(photo)}
                                disabled={isDeletingPhoto === photo.id}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                title={isBroken ? "Delete DB record" : "Delete photo"}
                              >
                                {isDeletingPhoto === photo.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {allPhotos.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No photos yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog
        open={showChangePassword}
        onOpenChange={isPasswordRecovery ? undefined : setShowChangePassword}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {isPasswordRecovery ? "Set New Password" : "Change Password"}
            </DialogTitle>
            {isPasswordRecovery && (
              <p className="text-sm text-muted-foreground pt-1">
                Enter and confirm your new password below.
              </p>
            )}
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
            <Input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="bg-background/50 border-border/50 rounded-xl"
              autoFocus
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="bg-background/50 border-border/50 rounded-xl"
            />
            <DialogFooter className="pt-2">
              {!isPasswordRecovery && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowChangePassword(false)}
                  className="border-border/50"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isChangingPassword}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isChangingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Update Password"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
