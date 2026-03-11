import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import JSZip from "jszip";

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "";

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
}

const DashboardPage = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [rsvps, setRsvps] = useState<RSVPEntry[]>([]);
  const [totalGuests, setTotalGuests] = useState(0);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState<string | null>(null);

  const { toast } = useToast();

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsCheckingAuth(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = useCallback(async () => {
    // Fetch RSVPs with guest info
    const { data: rsvpData } = await (supabase
      .from("rsvps" as any) as any)
      .select(`
        id, attending, number_of_guests, message, submitted_at,
        guest:guests!inner(full_name, invite_code, party_size, side)
      `)
      .order("submitted_at", { ascending: false });

    if (rsvpData) {
      const entries = rsvpData.map((r: any) => ({
        ...r,
        guest: r.guest,
      }));
      setRsvps(entries);
    }

    // Fetch total guest count
    const { count } = await (supabase
      .from("guests" as any) as any)
      .select("*", { count: "exact", head: true });
    setTotalGuests(count || 0);

    // Fetch ALL photos (including expired)
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
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) throw error;
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAuthLoading(false);
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

      for (const photo of photos) {
        const { data: signedData } = await supabase.storage
          .from("wedding-photos")
          .createSignedUrl(photo.file_path, 3600);

        if (signedData?.signedUrl) {
          const response = await fetch(signedData.signedUrl);
          const blob = await response.blob();
          const ext = photo.file_name.split(".").pop() || "jpg";
          const name = `${photo.uploaded_by || "guest"}-${downloaded + 1}.${ext}`;
          zip.file(name, blob);
          downloaded++;
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `wedding-photos-${new Date().toISOString().split("T")[0]}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Download complete!",
        description: `${downloaded} photos downloaded.`,
      });
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err.message || "Please try again",
        variant: "destructive",
      });
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
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsDeletingPhoto(null);
    }
  };

  // Stats
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

  // Not logged in or not admin
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
              Sign in with your admin account to manage your wedding
            </p>
            {user && !isAdmin && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
                This account does not have admin access.
                <button onClick={handleSignOut} className="underline ml-1">
                  Sign out
                </button>
              </div>
            )}
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
                {isAuthLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Link to="/" className="text-muted-foreground hover:text-foreground text-sm">
                Back to Wedding Site
              </Link>
            </div>
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
            <h1 className="font-serif text-xl text-foreground">T & P Dashboard</h1>
            <p className="text-muted-foreground text-xs">{user.email}</p>
          </div>
          <div className="flex gap-3">
            <Link to="/">
              <Button variant="outline" size="sm" className="border-border/50">
                View Site
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="border-border/50">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Invited", value: totalGuests, icon: Users, color: "text-primary" },
            { label: "Attending", value: `${attending.length} (${totalAttending} guests)`, icon: CheckCircle, color: "text-green-500" },
            { label: "Declined", value: declined.length, icon: XCircle, color: "text-red-500" },
            { label: "Maybe", value: maybe.length, icon: HelpCircle, color: "text-yellow-500" },
            { label: "Pending", value: pending, icon: Clock, color: "text-muted-foreground" },
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
            <TabsTrigger value="photos">Photos ({photos.length})</TabsTrigger>
          </TabsList>

          {/* RSVPs Tab */}
          <TabsContent value="rsvps">
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead>Guest</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Guests</TableHead>
                    <TableHead className="hidden md:table-cell">Side</TableHead>
                    <TableHead className="hidden lg:table-cell">Message</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rsvps.map((rsvp) => (
                    <TableRow key={rsvp.id} className="border-border/20">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{rsvp.guest.full_name}</p>
                          <p className="text-xs text-muted-foreground">{rsvp.guest.invite_code}</p>
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
                      <TableCell className="hidden md:table-cell">{rsvp.number_of_guests}</TableCell>
                      <TableCell className="hidden md:table-cell capitalize">{rsvp.guest.side || "-"}</TableCell>
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
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                    Download All Photos ({photos.length})
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
                    <TableHead className="hidden md:table-cell">Uploaded</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {photos.map((photo) => {
                    const isExpired = photo.expires_at
                      ? new Date(photo.expires_at) < new Date()
                      : false;

                    return (
                      <TableRow key={photo.id} className={`border-border/20 ${isExpired ? "opacity-50" : ""}`}>
                        <TableCell>
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-primary" />
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">{photo.uploaded_by || "Guest"}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground max-w-[150px] truncate">
                          {photo.caption || "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {new Date(photo.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              isExpired
                                ? "bg-red-500/10 text-red-500"
                                : "bg-green-500/10 text-green-500"
                            }`}
                          >
                            {isExpired ? "Expired" : "Visible"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePhoto(photo)}
                            disabled={isDeletingPhoto === photo.id}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {isDeletingPhoto === photo.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {photos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No photos uploaded yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DashboardPage;
